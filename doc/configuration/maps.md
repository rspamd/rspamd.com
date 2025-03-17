---
layout: doc
title: Rspamd maps
description: Documentation on maps concepts and options.
---

# Rspamd Maps: A Comprehensive Guide

Maps are one of the most important and flexible features in Rspamd, allowing for dynamic configuration of various elements without requiring service restarts. This article provides a comprehensive overview of Rspamd maps, their types, configuration options, and best practices.

## Table of Contents

1. [What Are Maps?](#what-are-maps)
2. [Maps Types](#map-types)
3. [Map Configuration Formats](#map-configuration-formats)
4. [Map Content Format](#map-content-format)
5. [HTTP Maps and Caching](#http-maps-and-caching)
6. [Map Loading Lifecycle](#map-loading-lifecycle)
7. [External Maps](#external-maps)
8. [Authentication for HTTP Maps](#authentication-for-http-maps)
9. [Compression Support](#compression-support)
10. [Fallback Options](#fallback-options)
11. [CDB Maps](#cdb-maps)
12. [Map API Reference](#map-api-reference)

## What Are Maps?

Maps in Rspamd are dynamic data sources that contain lists of keys or key-value pairs that can be reloaded at runtime without restarting the service. Maps can be defined using various backends including:

- Local files
- HTTP/HTTPS resources
- Static data embedded in the configuration
- CDB (Constant Database) files

The significant distinction between maps and static configuration elements is that maps can be updated "live" without the costly restart procedure. Rspamd automatically monitors maps for changes:

- For file maps: checking file modification time and the `inotify` where available (meaning you must save maps files atomically using `rename` as otherwise you might end up with an incomplete load)
- For HTTP maps: using HTTP caching headers (If-Modified-Since, ETag)

## Map Types

Rspamd supports several map types, each with specific functionality:

- **set**: Simple list of strings, optimized for fast lookups (membership tests)
- **hash**: Key-value pairs where values can be arbitrary strings
- **radix**: IP address maps with optional CIDR notation
- **regexp**: Regular expression patterns
- **regexp_multi**: Regular expressions that can match multiple captures
- **glob**: Glob-style pattern matching with wildcard characters
- **glob_multi**: Glob patterns that can match multiple captures
- **cdb**: Constant Database format for fast, read-only lookups

Maps can specify their type using prefixes in URI definitions, like:

```
regexp;/path/to/file
hash;http://example.com/map
radix;/path/to/ip_list
```

**Performance consideration**: regular expression maps are slower than other type of maps especially if your Rspamd is built without `Hyperscan` support.

## Map Configuration Formats

Maps can be defined in four main ways:

### 1. Simple String URL

```hcl
map = "http://example.com/file.txt"
# or
map = "/path/to/local/file"
```

### 2. Composite Path Array

```hcl
map = [
  "http://example.com/file.txt",
  "/path/to/local/file"
]
```

When using composite paths, data from all sources is concatenated.

### 3. Embedded Data

```hcl
map = [
  "foo bar",
  "baz qux"
]

# For IP maps:
ip_list = [
  "192.168.1.1/24",
  "10.0.0.0/8"
]
```

### 4. Detailed Configuration Object

```hcl
map = {
  name = "My important map";
  description = "Contains important data";
  url = "http://example.com/map.txt";
  timeout = 10.0; # in seconds
}
```

Or for multiple URLs:

```hcl
map = {
  name = "Multi-source map";
  urls = [
    "http://example.com/map.txt",
    "/local/backup/map.txt"
  ];
}
```

## Map Content Format

Maps can contain various elements depending on their type:

### Basic Formats
```
key1 # Single key with comment
# Full line comment is ignored

# Empty line ignored
key2 1 # Key and value (for hash maps)
"key3 with space"
"key with \" escaped" value with spaces
```

### Regular Expression Maps
```
/regexp/i
/regexp/is some other value
```
Options after the final slash:
* `i` - ignore case
* `u` - use UTF-8 regexp
* `m` - multi-line regular expression - this flag causes the string to be treated as multiple lines. This means that the `^` and `$` symbols match the start and end of each line within the string, rather than just the start and end of the first and last lines.
* `x` - extended regular expression - this flag instructs the regular expression parser to ignore most white-space that is not escaped (`\`) or within a bracketed character class. This makes it possible to break up the regular expression into more readable parts. Additionally, the `#` character is treated as a meta-character that introduces a comment which runs up to the pattern's closing delimiter or to the end of the current line if the pattern extends onto the next line.
* `s` - dot-all regular expression - this flag causes the string to be treated as a single line. This means that the `.` symbol matches any character whatsoever, including a newline, which it would not normally match. When used together as `/ms`, they allow the `.` to match any character while still allowing `^` and `$` to respectively match just after and just before newlines within the string
* `O` - do not optimize regexp (rspamd optimizes regexps by default)
* `r` - use non-UTF-8 regular expressions (raw bytes). Defaults to `true` if `raw_mode` is set to `true` in the options section.
* `A` - return and process all matches (useful for Lua prefilters)
* `L` - match left part of regexp (useful for Lua prefilters in conjunction with Hyperscan)

Please note that you **must** use `/u` modifier if you want to match UTF8 characters or classes.

### IP Maps
```
192.168.0.1 # Mask is /32 (single IP)
[::1] # IPv6, mask is /128
[::1]/64 # IPv6 with CIDR
192.168.0.1/19 # IPv4 with CIDR
```

You can mix both IPv4 and IPv6 addresses or networks in a single map.

## HTTP Maps and Caching

Rspamd implements sophisticated caching for HTTP maps:

1. When a map is first loaded from HTTP, Rspamd caches it locally.
2. For subsequent requests, Rspamd:
   - Uses HTTP conditional requests (If-Modified-Since, ETag)
   - Respects Cache-Control and Expires headers
   - Stores the cached data for quick loading on restart

There are two main startup scenarios:

- **Hot start**: Rspamd reuses cached maps immediately, then checks for updates.
- **Cold start**: Rspamd fetches maps when workers start, which can cause a temporary gap.

To provide resilience, you can configure fallback options:

```hcl
map = [
  "https://maps.rspamd.com/rspamd/whitelist.inc.zst",
  "${DBDIR}/local_whitelist.inc",
  "fallback+file://${CONFDIR}/maps.d/whitelist.inc"
];
```

In this example, the `fallback+file://` option is used only when the HTTP source is unavailable during cold starts.

## Map Loading Lifecycle

When Rspamd is running, maps follow a specific lifecycle:

1. **Initialization**: Maps are registered during configuration parsing
2. **Initial Load**: 
   - File maps are read directly
   - HTTP maps are loaded from cache if available, or fetched
3. **Periodic Checks**:
   - File maps: Rspamd watches for file modifications using a filesystem monitoring mechanism
   - HTTP maps: Rspamd schedules periodic checks based on cache headers or default poll interval

The default poll interval can be adjusted in the configuration:

```hcl
options {
  map_timeout = 60s; # Default HTTP map poll interval
  map_file_watch_multiplier = 0.1; # Local files are checked more frequently
}
```

## How to sign maps

From Rspamd version 1.2 onwards, each map can have a digital signature using the `EdDSA` algorithm. To sign a map, you can use `rspamadm signtool`, and to generate a signing keypair, use `rspamadm keypair -s -u`:

```hcl
keypair {
   pubkey = "zo4sejrs9e5idqjp8rn6r3ow3x38o8hi5pyngnz6ktdzgmamy48y";
   privkey = "pwq38sby3yi68xyeeuup788z6suqk3fugrbrxieri637bypqejnqbipt1ec9tsm8h14qerhj1bju91xyxamz5yrcrq7in8qpsozywxy";
   id = "bs4zx9tcf1cs5ed5mt4ox8za54984frudpzzny3jwdp8mkt3feh7nz795erfhij16b66piupje4wooa5dmpdzxeh5mi68u688ixu3yd";
   encoding = "base32";
   algorithm = "curve25519";
   type = "sign";
}
```

Then you can use `signtool` to edit the map file:

```
rspamadm signtool -e --editor=vim -k <keypair_file> <map_file>
```

To enforce signing policies, you should add a `sign+` string to your map definition:

```
map = "sign+http://example.com/map"
```

To specify the trusted key you could either put the **public** key from the keypair in the `local.d/options.inc` file as following:

```
trusted_keys = ["<public key string>"];
```

or add it as a `key` definition in the map string:

```
map = "sign+key=<key_string>+http://example.com/map"
```

## External Maps

Rspamd supports "external maps" for dynamic lookups to external services. These maps query an external service for each key lookup rather than loading the entire map into memory.

External maps are configured with the `external = true` parameter:

```hcl
external_map = {
  external = true;
  backend = "http://lookup-service.local/api";
  method = "query"; # Can be "query", "header", or "body"
  timeout = 1.0;    # Timeout in seconds
}
```

The external map API has three methods for passing lookup keys:

- **query**: Appends the key as a URL query parameter
- **header**: Sends the key in an HTTP header
- **body**: Sends the key in the request body

For complex data structures, you can specify an encoding:

```hcl
external_map = {
  external = true;
  backend = "http://lookup-service.local/api";
  method = "body";
  encode = "json";  # Can be "json" or "messagepack"
}
```

## Authentication for HTTP Maps

HTTP maps support two authentication methods:

### 1. Basic Auth in URL

```hcl
map = "http://user:password@example.com/map.txt"
```

### 2. Configuration-based Authentication

```hcl
options {
  http_auth {
    example.com {
      user = "username";
      password = "secret";
    }
  }
}
```

This approach is more secure as credentials aren't stored in map URLs.

## Compression Support

Rspamd supports compressed maps with Zstandard (.zst or .zstd extension):

```hcl
map = "https://maps.rspamd.com/rspamd/whitelist.inc.zst"
```

Compressed maps:
- Reduce network bandwidth usage
- Reduce storage requirements for larger maps
- Are automatically decompressed when loaded

## Fallback Options

For resilience, Rspamd supports fallback options for maps:

```hcl
map = [
  "https://maps.rspamd.com/rspamd/whitelist.inc.zst",
  "fallback+file://${CONFDIR}/maps.d/whitelist.inc"
];
```

The `fallback+` prefix indicates this source should only be used if other sources fail:
- During cold starts when HTTP maps aren't available
- When the primary source becomes unreachable

## CDB Maps

Rspamd supports Constant Database (CDB) maps, which provide extremely fast, read-only key-value lookups. CDB maps are especially useful for large datasets with frequent lookups.

### Configuring CDB Maps

```hcl
cdb_map = {
  external = true;
  cdb = "/var/lib/rspamd/domain_settings.cdb";
}
```

CDB maps can be used in regular maps or as external maps for per-key lookups.

### Creating CDB Files

CDB files can be created using the Rspamd Lua API:

```lua
local rspamd_cdb = require "rspamd_cdb"
local builder = rspamd_cdb.build('/path/to/map.cdb')
builder:add('key1', 'value1')
builder:add('key2', 'value2')
builder:finalize()
```

Benefits of CDB over other map types:
- Constant-time lookups (O(1) complexity)
- Zero locking requirements for reads
- Compact storage format
- Atomic updates (by creating a new file and renaming)

## Map API Reference

Rspamd provides several Lua functions for working with maps programmatically:

### Adding Maps

```lua
local lua_maps = require "lua_maps"

-- Add a map from configuration
local my_map = lua_maps.map_add('module_name', 'option_name', 'map_type', 'description')

-- Add a map from UCL object
local my_map = lua_maps.map_add_from_ucl(ucl_object, 'map_type', 'description')

-- Bulk map configuration
local map_defs = {
  my_map = {
    type = 'set',
    description = 'My important list',
    optional = true
  },
  ip_map = {
    type = 'radix',
    description = 'IP blocklist'
  }
}

lua_maps.fill_config_maps('module_name', options, map_defs)
```

### Using Maps

Once a map is loaded, you can use it for lookups:

```lua
-- Simple lookup
local result = my_map:get_key('test_key')

-- With callback
my_map:get_key('test_key', function(is_found, value, code, task)
  if is_found then
    -- Use the value
  end
end, task)

-- Iterate through all entries
my_map:foreach(function(key, value)
  -- Process each entry
  return true -- Continue iteration
end)
```

After analyzing the `lua_maps_expressions.lua` file, I'll add information about map expressions to your article. This is an important feature that allows combining multiple maps with selectors in powerful expressions.

## Map Expressions

Map expressions provide a powerful way to combine multiple maps using boolean logic. This feature allows you to create complex filtering rules by combining simpler components using logical operators.

### What Are Map Expressions?

Map expressions allow you to:

1. Define multiple maps with different data sources
2. Associate each map with a selector that extracts values from messages
3. Combine these maps using logical expressions
4. Act on the combined result

This creates a flexible framework for defining complex conditions without writing custom Lua code.

### Configuration Format

Map expressions are defined using a structured format:

```hcl
whitelist_ip_from = {
  rules {
    ip {
      selector = "ip";
      map = "/path/to/whitelist_ip.map";
      type = "radix"; # Optional, can be automatically inferred
    }
    from {
      selector = "from(smtp)";
      map = "/path/to/whitelist_from.map";
    }
  }
  expression = "ip & from";
}
```

The key components are:

- **rules**: A collection of named rules, each with:
  - **selector**: A selector expression to extract values from the message
  - **map**: A map definition (any format supported by the maps API)
  - **type**: Optional map type (if omitted, it's inferred from the rule name)
  - **description**: Optional description for the map

- **expression**: A logical expression combining the rules, using rule names as atoms

### Expression Syntax

The expression syntax supports the following operators:

- `&` - logical AND
- `|` - logical OR
- `!` - logical NOT
- `+` - arithmetic plus (can be used for weighted combinations)
- Parentheses `()` for grouping

Examples:

```
ip & from           # Both IP and From must match
ip | from           # Either IP or From must match
ip & !from          # IP matches but From does not match
(ip & from) | asn   # Either both IP and From match, or ASN matches
```

### Selectors

Selectors are functions that extract specific values from a message. Common selectors include:

- `ip` - IP address of the message sender
- `from(smtp)` - SMTP From address
- `from(mime)` - From header in the message
- `rcpt(smtp)` - SMTP recipient
- `header(name)` - Value of a specific header
- `url` - URLs in the message
- `asn` - Autonomous System Number of the sender

You can create custom selectors or use any of Rspamd's built-in selectors.

### Processing and Results

When a task is processed against a map expression:

1. Each rule's selector extracts values from the message
2. Each extracted value is checked against the corresponding map
3. The expression combines the results of individual map lookups
4. If the expression evaluates to a positive number, it's considered a match

When a match occurs, the function returns:

1. The value of the expression (typically 1.0)
2. A detailed match table containing:
   - Which rules matched
   - What values were extracted by selectors
   - What values were returned by maps

### Example Usage

Here's a complete example of creating and using a map expression:

```lua
local lua_maps_expressions = require "lua_maps_expressions"

local whitelist_config = {
  rules = {
    ip = {
      selector = "ip",
      map = "/path/to/whitelist_ip.map",
      type = "radix"
    },
    from = {
      selector = "from(smtp)",
      map = "/path/to/whitelist_from.map",
      type = "set"
    },
    domain = {
      selector = "from(smtp).domain",
      map = "/path/to/whitelist_domains.map",
      type = "set"
    }
  },
  expression = "(ip & from) | domain",
  symbol = "WHITELIST_EXPRESSION" -- Optional symbol to register
}

local whitelist = lua_maps_expressions.create(rspamd_config, whitelist_config, "whitelist_module")

-- Later in the code:
local function symbol_callback(task)
  local result, matched = whitelist:process(task)
  
  if result then
    -- Matched! We can access details via the 'matched' table
    if matched.ip then
      task:insert_result("IP_WHITELISTED", 1.0, matched.ip.matched)
    end
    if matched.from then
      task:insert_result("FROM_WHITELISTED", 1.0, matched.from.matched)
    end
    if matched.domain then
      task:insert_result("DOMAIN_WHITELISTED", 1.0, matched.domain.matched)
    end
  end
end

rspamd_config:register_symbol({
  name = "CHECK_WHITELIST_EXPRESSION",
  callback = symbol_callback
})
```

### Benefits of Map Expressions

Map expressions offer several advantages:

1. **Declarative configuration**: Define complex logic without custom code
2. **Reusability**: The same maps can be reused in different expressions
3. **Maintainability**: Easier to understand and modify than custom code
4. **Performance**: Optimized evaluation of expressions
5. **Detailed results**: Access to which specific rules matched and their values

### API Reference

The main API functions for map expressions include:

- **lua_maps_expressions.create(cfg, obj, module_name)**: Creates a map expression object
  - `cfg`: Rspamd configuration object
  - `obj`: Configuration table with `rules` and `expression`
  - `module_name`: Optional module name for logging
  - Returns: An expression object with a `process(task)` method

- **expression:process(task)**: Evaluates the expression against a task
  - Returns: `nil` if no match, or two values if matched:
    1. The expression result (typically 1.0)
    2. A table of match details by rule name

## Conclusion

Maps are one of the most powerful features in Rspamd, allowing for dynamic configuration and real-time updates without service restarts. By understanding the different map types, configuration options, and best practices, you can build flexible and efficient filtering rules that adapt to changing conditions.

When designing your Rspamd setup, consider:
- Using HTTP maps for centralized management
- Implementing fallback options for resilience
- Choosing appropriate map types for your data
- Leveraging compression for large maps
- Using CDB for high-performance lookups of large datasets
- Combining multiple maps with map expressions for complex logic
