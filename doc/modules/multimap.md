---
layout: doc
title: Multimap module
directory-tree:
  emphasize: true
---
# Multimap module
{:.no_toc}

The Multimap module has been specifically designed to handle rules that are based on various types of lists which are dynamically updated by Rspamd, and are referred to as `maps`. This module is particularly useful for organizing whitelists, blacklists, and other lists via files. Additionally, it is capable of loading remote lists using the `HTTP` and `HTTPS` protocols or the `RESP` (REdis Serialization Protocol). This article provides a detailed explanation of all the configuration options and features available in this module.

{% include toc.html %}

## Principles of work

This module defines rules that allows to extract multiple types of data (defined by `type`). The data extracted is transformed in the desired way (defined by `filter`) and is checked against the list of strings that is usually referred as `map`:

<center><img class="img-fluid" src="{{ site.baseurl }}/img/multimap_dia.png" width="75%"></center>

It is a common mistake to use `type` instead of `filter` and vice-versa. To avoid confusing, please bear in mind that `type` is the main property of the map that defines which exact data is extracted.

Maps in Rspamd refer to files or HTTP links that are automatically monitored and reloaded if any changes occur. The following are examples of how maps can be defined:

	map = "http://example.com/file";
	map = "file:///etc/rspamd/file.map";
	map = "/etc/rspamd/file.map";

Rspamd offers the option to save traffic for HTTP maps using cached maps, while also respecting `304 Not modified responses`, Cache-Control headers, and ETags. Additionally, the maps data is shared between workers, and only the first controller worker is allowed to fetch remote maps.

By default, the configuration of this module actively utilises compound maps, which define a map as an array of sources with a local fallback location. While this redundancy may be unnecessary for user-defined maps, further details are available in the following [FAQ section](https://rspamd.com/doc/faq.html#what-are-maps).

## Configuration

The module includes a set of rules in the following format:

~~~hcl
MAP_SYMBOL1 { 
  type = "type"; 
  map = "url"; 
  # [optional params...] 
}
MAP_SYMBOL2 { 
  type = "type"; 
  map = "from"; 
  # [optional params...] 
}

...
~~~

To define your own rules, it is advisable to do so in the `/etc/rspamd/local.d/multimap.conf`. 

### Map attributes

Mandatory attributes are:

* `type` - map [type](#map-types)
* `map` - [map data](#map-field-syntax)

Optional map configuration attributes:

* `prefilter` - defines if the map is used in [prefilter mode](#pre-filter-maps)
* `action` - for prefilter maps defines action set by map match
* `regexp` - set to `true` if your map contain [regular expressions](#regexp-maps)
* `symbols` - array of symbols that this map can insert (for key-value pairs), [learn more](#multiple-symbol-maps). Please bear in mind, that if you define this attribute, your map must have entries in form `key<spaces>value` to match a specific symbol.
* `score` - score of the symbol (can be redefined in the `metric` section)
* `description` - map description
* `message` - message returned to MTA on prefilter reject action being triggered
* `group` - group for the symbol (can be redefined in `metric`)
* `require_symbols` - expression of symbols that have to match for a specific message: [learn more](#conditional-maps)
* `filter` - match specific part of the input (for example, email domain): [here](#map-filters) is the complete definition of maps filters
* `extract_from` - attribute extracts values of the sender/recipient from the SMTP dialog or the From/To header. To achieve this, set the value to `smtp`, `mime`, or `both` to match both sources. It's important to note that `extract_from` is solely utilized in conjunction with the `from` or `rcpt` map [type](#map-types).

When using header maps, it is essential to specify the exact `header` by utilizing the header option.

It is important to note that there is often confusion between the `type` and `filter` parameters for the multimap module. The general rule of thumb is that `type` refers to *what information* is checked in the map, such as URLs, IPs, and headers. On the other hand, the `filter` attribute refers to *how this information is transformed* before being checked, such as extracting domains.

**Selector** maps are using [selectors](../configuration/selectors.html), which defines both extraction and transformation. Consequently, this type of map can be considered as the most basic and flexible. All other types of maps can be expressed using a selector map. Furthermore, it is possible to store [dependent maps](#dependent-maps) in Redis using the selectors framework.

### Map field syntax

| Example          | Description                       |
| :-------------- | :-------------------------------- |
| `http://example.com/list` | HTTP map, reloaded using `If-Modified-Since`, can be signed
| `https://example.com/list` | HTTPS map - same as HTTP but with TLS enabled (with certificate check)
| `file:///path/to/list` | file map, reloaded on change, can be signed
|  `/path/to/list` | shorter form of a file map
| `cdb://path/to/list.cdb` | [CDB](https://www.corpit.ru/mjt/tinycdb.html) map in file, cannot be signed
| `redis://<hashkey>` | Redis map, read field in the hash stored at key
| `redis+selector://selector` | (from version 2.0) similar to the former one Redis map where a hash key is acquired by application of some [selector](../configuration/selectors.html) that allows to create dependent maps

A combination of files and HTTP can be used to create a resulting map that is a joint list of its elements, as shown in the following example:

~~~hcl
map = [
  "https://maps.rspamd.com/rspamd/mime_types.inc.zst",
  "${DBDIR}/mime_types.inc.local",
  "fallback+file://${CONFDIR}/mime_types.inc"
]
~~~

It is important to note that redis or cdb maps cannot be combined with generic maps.

### Maps flaws

Maps content can be augmented by using flaws, for instance, `map = regexp;/path/to/file.re`. This feature has been available since version 2.0.

~~~lua
  local known_types = {
    {'regexp;', 'regexp'},
    {'re;', 'regexp'},
    {'regexp_multi;', 'regexp_multi'},
    {'re_multi;', 'regexp_multi'},
    {'glob;', 'glob'},
    {'glob_multi;', 'glob_multi'},
    {'radix;', 'radix'},
    {'ipnet;', 'radix'},
    {'set;', 'set'},
    {'hash;', 'hash'},
    {'plain;', 'hash'}
  }
~~~

### Maps content

Maps can contain keys:

~~~
key1
key2
~~~

key-value pairs (for multi-symbols maps):

~~~
key1 value1
key2 value2
key3 value3:score
~~~

any comments:

~~~
key1
# Single line comment
key2 # Embedded comment
~~~

IP maps can also contain IPs or IP/network in CIDR notation

~~~
192.168.1.1
10.0.0.0/8
~~~


## Map types

Type attribute means what is matched with this map. The following types are supported:

| Type            | Description                       |
| :-------------- | :-------------------------------- |
| `asn` | matches ASN number passed by [ASN module](asn.html)
| `content` | matches specific content of a message (e.g. headers, body or even a full message) against some map, usually regular expressions map
| `country` | matches country code of AS passed by [ASN module](asn.html)
| `dnsbl` | matches IP of the host that performed message handoff against some DNS blacklist (consider using [RBL](rbl.html) module for this)
| `filename` | matches attachment filenames and filenames in archives against map. It also includes detected filename match from version 2.0. For example, if some attachment has `.png` extension but it has real type detected as `image/jpeg` then two checks would be performed: for the original attachment and for the detected one. This does not include files in archives as Rspamd does not extract them.
| `from` | matches **envelope** from (or header `From` if envelope from is absent)
| `header` | matches any header specified (must have `header = "Header-Name"` configuration attribute)
| `helo` | matches HELO of the message handoff session
| `hostname` | matches reverse DNS name of the host that performed message handoff
| `ip` | matches IP of the host that performed message handoff (against radix map)
| `mempool` | matches contents of a mempool variable (specified with `variable` parameter)
| `received` | (new in 1.5) matches elements of `Received` headers
| `rcpt` | matches any of  **envelope** rcpt or header `To` if envelope info is missing
| `selector` | applies generic [selector](../configuration/selectors.html) and check data returned in the specific map. This type must have `selector` option and an optional `delimiter` option that defines how to join multiple selectors (an empty string by default). If a selector returns multiple values, e.g. `urls`, then all values are checked. Normal filter logic can also be applied to the selector's results.
| `symbol_options` | (new in 1.6.3) match 'options' yielded by whichever symbol of interest (requires `target_symbol` parameter)
| `url` | matches URLs in messages against maps (this excludes by default images urls and urls extracted from content parts, e.g. PDF parts)
| `user` | matches authenticated username against maps

DNS maps are considered legacy and it is not encouraged to use them in new projects. Instead, [rbl](rbl.html) should be used for that purpose.

Maps can also be specified as [CDB](https://www.corpit.ru/mjt/tinycdb.html) databases, which might be useful for large maps:

~~~hcl
SOME_SYMBOL {
    map = "cdb:///path/to/file.cdb";
    type = "from";
}
~~~

## Regexp maps

All maps, except for `ip` and `dnsbl` maps, support the `regexp` mode. In this mode, all keys in maps are treated as regular expressions. For example:

```
# Sole key
/example\d+\.com/i
# Key + value (test)
/other\d+\.com/i test
# Comments are still enabled
```

For performance considerations, it is recommended to use only expressions supported by [Hyperscan](https://intel.github.io/hyperscan/dev-reference/compilation.html#pattern-support) as this engine provides fast performance without any additional cost. Currently, there is no way to distinguish which particular regexp was matched in case of multiple regexps being matched.

To enable the `regexp` mode, you should set the `regexp` option to `true`:

~~~hcl
# local.d/multimap.conf
SENDER_FROM_WHITELIST {
  type = "from";
  map = "file:///tmp/from.map";
  regexp = true;
}
~~~

## Map filters

In Rspamd, it is also possible to apply filtering expressions before checking the value against a particular map. This is particularly useful for `header` rules. Filters can be specified using the `filter` option, and the following filters are supported:

### Content filters

For content maps, the following filters are supported:

| Content filter            | Description                       |
| :-------------- | :-------------------------------- |
| `body` | raw undecoded body content (with the exceptions of headers)
| `full` | raw undecoded content of a message (including headers)
| `headers` | undecoded headers
| `text` | decoded and converted text parts (without HTML tags but with newlines)
| `rawtext` | decoded but not converted text parts (with HTML tags and newlines)
| `oneline` | decoded and stripped text content (without HTML tags and newlines)

### Filename filters

Since version 2.0, Filename maps also check for detected filename matches. For instance, if an attachment has a `.png` extension, but its real type is detected as `image/jpeg`, two checks will be performed - one for the original attachment and one for the detected one. It is worth noting that Rspamd does not extract files in archives, so these files are not included in the checks.

Filename maps support the following set of filters:

| Filter            | Description                       |
| :-------------- | :-------------------------------- |
| `extension` | matches file extension
| `regexp:/re/` | extract data from filename according to some regular expression

### From, rcpt and header filters

These are generic emails and headers filters:

| Filter            | Description                       |
| :-------------- | :-------------------------------- |
| `email` or `email:addr` | parse header value and extract email address from it (`Somebody <user@example.com>` -> `user@example.com`)
| `email:user` | parse header value as email address and extract user name from it (`Somebody <user@example.com>` -> `user`)
|  `email:domain` | parse header value as email address and extract domain part from it (`Somebody <user@example.com>` -> `example.com`)
|  `email:domain:tld` | parse header value as email address and extract effective second level domain from it (`Somebody <user@foo.example.com>` -> `example.com`)
|  `email:name` | parse header value as email address and extract displayed name from it (`Somebody <user@example.com>` -> `Somebody`)
| `regexp:/re/` | extracts generic information using the specified regular expression

### Helo, hostname filters

| Filter            | Description                       |
| :-------------- | :-------------------------------- |
| `tld` | matches eSLD (effective second level domain - a second-level domain or something that's effectively so like `example.com` or `example.za.org`)
| `tld:regexp:/re/` | extracts generic information using the specified regular expression from the eSLD part
| `top` | matches TLD (top level domain) part of the helo/hostname

### Mempool filters

* `regexp:/re/` - extract data from mempool variable according to some regular expression

### Received filters

If no filter is specified `real_ip` is used by default.

| Filter            | Description                       |
| :-------------- | :-------------------------------- |
| `from_hostname` | string that represents hostname provided by a peer
| `from_ip` | IP address as provided by a peer
| `real_hostname` | hostname as resolved by MTA
| `real_ip` | IP as resolved by PTR request of MTA
| `by_hostname` | MTA hostname
| `proto` | protocol, e.g. ESMTP or ESMTPS
| `timestamp` | received timestamp
| `for` | for value (unparsed mailbox)
| `tld:from_hostname` | extract eSLD part from peer-provided hostname
| `tld:real_hostname` | extract eSLD part from MTA-verified hostname

The `real_ip` and `from_ip` filters must be used in conjunction with IP maps.

Additionally to these filters, Received maps support the following configuration settings:

* `min_pos` - Minimum position of Received header to match
* `max_pos` - Maximum position of Received header to match

Negative values can be specified to match positions relative to the end of Received headers.

* `flags` - One of more flags which MUST be present to match
* `nflags` - One or more flags which must NOT be present to match

Currently available flags are `ssl` (hop used SSL) and `authenticated` (hop used SMTP authentication).

### Selector options filters

* `regexp:/re/` - extract data from selector's results according to some regular expression (usually not needed)

### Symbol options filters

* `regexp:/re/` - extract data from symbol options according to some regular expression

### URL filters

URL maps allows another set of filters (by default, `url` maps are matched using hostname part):

| Filter            | Description                       |
| :-------------- | :-------------------------------- |
| `full` | matches the complete URL (not the hostname)
| `full:regexp:/re/` | extracts generic information using the specified regular expression from the full URL text
| `is_obscured` | matches obscured URLs
| `is_phished` | matches hostname but if and only if the URL is phished (e.g. pretended to be from another domain)
| `is_redirected` | matches redirected URLs
| `path` | match path
| `query` | match query string
| `regexp:/re/` | extracts generic information using the specified regular expression from the hostname
| `tag:name` | matches full hostnames that have URL tag with `name`
| `tld` | matches eSLD (effective second level domain - a second-level domain or something that's effectively so like `example.com` or `example.za.org`)
| `tld:regexp:/re/` | extracts generic information using the specified regular expression from the eSLD part
| `top` | matches TLD (top level domain) part of the hostname

## Pre-filter maps

To enable pre-filter support, you should specify `action` parameter which can take one of the
following values:

* `accept` - accept the message (no action)
* `add header` or `add_header` - add a header to the message
* `rewrite subject` or `rewrite_subject` - change the subject
* `greylist` - greylist the message
* `reject` - drop the message

If a map matches, no filters will be processed for a message. It is important to note that prefilter maps do not support multiple symbols or symbol conditions by design.

~~~hcl
# local.d/multimap.conf
IP_WHITELIST { 
  type = "ip"; 
  map = "/tmp/ip.map"; 
  prefilter = true;
  action = "accept";
}
# Better use RBL module instead
SPAMHAUS_PBL_BLACKLIST { 
  type = "dnsbl"; 
  map = "pbl.spamhaus.org";
  description = "PBL dns block list";
  prefilter = true;
  action = "reject";
}
~~~


## Multiple symbol maps

Starting from version 1.3.1, it is now possible to define multiple symbols and scores using the multimap module. To achieve this, all possible symbols should be defined using the `symbols` option in the multimap:

~~~hcl
# local.d/multimap.conf
CONTENT_BLACKLISTED {
  type = "content";
  filter = "body"; # can be headers, full, oneline, text, rawtext
  map = "${LOCAL_CONFDIR}/content.map";
  symbols = ["CONTENT_BLACKLISTED1", "CONTENT_BLACKLISTED2"];
  regexp = true;
}
~~~

In this example, you can use 3 symbols:

* CONTENT_BLACKLISTED
* CONTENT_BLACKLISTED1
* CONTENT_BLACKLISTED2

the map:

~~~
# Symbol + score
/re1/ CONTENT_BLACKLISTED1:10
# Symbol with default score
/re2/ CONTENT_BLACKLISTED2
# Just a default symbol: CONTENT_BLACKLISTED
/re3/
~~~

If symbols used in a map are not defined in the `symbols` attribute, they will be ignored and replaced with the default map symbol. In case the value of a key-value pair is missing, Rspamd will insert the default symbol with a dynamic weight of `1.0`. This weight is then multiplied by the metric score.

If the symbol names are unknown/dynamic, you can use the option `dynamic_symbols = true` to add all possible symbols from that map:

~~~
DYN_MULTIMAP {
  type = "hostname";
  map = "/maps/dynamic_symbols.map";
  dynamic_symbols = true;
}
~~~

And the map content:

~~~
foo DYN_TEST1:10:opt1,opt2
bar DYN_TEST2:20:opt3,opt4
~~~

### Get all matches

If you want to match all possible regexps/globs in that list, not a single one, then you need to define `multi` flag for that map:

~~~hcl
# local.d/multimap.conf
CONTENT_BLACKLISTED {
  type = "content";
  filter = "body"; # can be headers, full, oneline, text, rawtext
  map = "${LOCAL_CONFDIR}/content.map";
  symbols = ["CONTENT_BLACKLISTED1", "CONTENT_BLACKLISTED2"];
  regexp = true;
  multi = true;
}
~~~

## Conditional maps

Starting from version 1.3.1, it is possible to create maps that depend on other rules and are only checked if certain conditions are met. For example, you may want to perform some whitelisting based on whether a message has a valid SPF policy, but not for messages that are sent to a mailing list. In this case, you can use the following map condition:

~~~hcl
# local.d/multimap.conf
FROM_WHITELISTED {
  require_symbols = "R_SPF_ALLOW & !MAILLIST";
  type = "from";
  map = "/some/list";
}
~~~

In the `require_symbols` definition, any logical expression of other symbols can be used. Rspamd automatically adds a dependency for a multimap rule on all symbols required by that rule. Symbols added by post-filters cannot be used here, but pre-filter and normal filter symbols are allowed.


## Redis for maps

Starting from version 1.3.3, Rspamd allows working with maps stored in a Redis backend. Any external application can put data into the Redis database using the HSET command, for example:  `HSET hashkey test@example.org 1`. Once the data is in Redis, you can define a map using the protocol `redis://` and specify the hash key to read. Redis settings can be defined inside the `multimap` module as well.

## Combined maps

From version 2.0, you can create maps with multiple values to be checked and joint via expression:

~~~hcl
COMBINED_MAP_AND {
  type = "combined";
  rules {
    ip = {
      type = "radix";
      map = "${TESTDIR}/configs/maps/ip.list";
      selector = "ip";
    }
    from {
      map = "${TESTDIR}/configs/maps/domains.list";
      selector = "from:domain";
    }
  }
  expression = "from & ip"
}
COMBINED_MAP_OR {
  type = "combined";
  rules {
    ip = {
      type = "radix";
      map = "${TESTDIR}/configs/maps/ip.list";
      selector = "ip";
    }
    from {
      map = "${TESTDIR}/configs/maps/domains.list";
      selector = "from:domain";
    }
  }
  expression = "from || ip"
}
~~~

Combined maps support merely **selectors** syntax, not general multimap rules.

## Dependent maps

Version 2.0 introduces the capability to create dependent maps in Redis, where the map key is dependent on some other data extracted from the same message. This allows for the creation of per-user based whitelists, among other use cases.

## Examples

Here are some examples of multimap configurations:

~~~hcl
# local.d/multimap.conf
BLACKLIST_FROM_DISPLAYNAME {
  # To work with MIME From use `header` type
  type = "header";
  header = "from";
  filter = "email:name";
  map = "file:///tmp/example.map";
  score = 10.0;
}

SENDER_FROM_WHITELIST_USER {
  type = "from";
  filter = "email:user";
  extract_from = "smtp"; 
  map = "file:///tmp/from.map";
  action = "accept"; # Prefilter mode
}

# With Redis backend, also you need specify servers for Redis.
SENDER_FROM_WHITELIST_USER {
  type = "from";
  map = "redis://hashkey";
}

SENDER_FROM_REGEXP {
  type = "header";
  header = "from";
  filter = 'regexp:/.*@/'; # `"Jon" <jon@example.net>` -> `"Jon" <jon@`
  map = "file:///tmp/from_re.map";
}

URL_MAP {
  type = "url";
  filter = "tld";
  map = "file:///tmp/url.map";
}

URL_MAP_RE {
  type = "url";
  filter = 'tld:regexp:/\.[^.]+$/'; # Extracts the last component of URL
  map = "file:///tmp/url.map";
}

FILENAME_BLACKLISTED {
  type = "filename";
  filter = "extension";
  map = "${LOCAL_CONFDIR}/filename.map";
  action = "reject";
  message = "A restricted file type was found";
}

CONTENT_BLACKLISTED {
  type = "content";
  filter = "body"; # can be headers, full, oneline, text, rawtext
  map = "${LOCAL_CONFDIR}/content.map";
  symbols = ["CONTENT_BLACKLISTED1", "CONTENT_BLACKLISTED2"];
  regexp = true;
}

ASN_BLACKLIST {
  type = "asn";
  map = "${LOCAL_CONFDIR}/asnlist.map";
}

LAST_RECEIVED_HEADER_IP_IF_AUTHED {
  type = "received";
  map = "${LOCAL_CONFDIR}/rcvd_ip.map";
  filter = "real_ip";
  min_pos = -1;
  flags = ["authenticated"];
}

SYMBOL_OPTIONS_DBL {
  type = "symbol_options";
  target_symbol = "DBL_ABUSE_REDIR";
  symbols = ["INTERESTING_DOMAIN"];
  map = "${LOCAL_CONFDIR}/dbl_redir_symbols.map";
}

WHITELIST_HELO_RCPT {
  type = "combined";
  prefilter = true;
  action = "accept";
  rules {
    helo {
      map = "${LOCAL_CONFDIR}/helo_smtp.map";
      selector = "helo";
    }
    rcpt = {
      map = "${LOCAL_CONFDIR}/rcpt_internal_subdomains.map";
      selector = "rcpts:domain";
    }
  }
  expression = "helo & rcpt"
}
~~~

Example adopted from [@kvaps](https://gist.github.com/kvaps/25507a87dc287e6a620e1eec2d60ebc1):

* `cd /etc/rspamd`
* create `local.d` folder if not exists
* `cd local.d`
* create `multimap.conf` in `/etc/rspamd/local.d/` folder if it does not exists
* create lists:

```bash
touch local_bl_from.map.inc local_bl_ip.map.inc local_bl_rcpt.map.inc \
local_wl_from.map.inc local_wl_ip.map.inc local_wl_rcpt.map.inc
```

* change permissions:

```bash
chmod o+w local_bl_from.map.inc local_bl_ip.map.inc local_bl_rcpt.map.inc \
local_wl_from.map.inc local_wl_ip.map.inc local_wl_rcpt.map.inc
```

* edit `multimap.conf` (you should be in `/etc/rspamd/local.d/` folder)

~~~hcl
# local.d/multimap.conf

# Blacklists
local_bl_ip { type = "ip"; map = "$LOCAL_CONFDIR/local.d/local_bl_ip.map.inc"; symbol = "LOCAL_BL_IP"; description = "Local ip blacklist";score = 3;}
local_bl_from { type = "from"; map = "$LOCAL_CONFDIR/local.d/local_bl_from.map.inc"; symbol = "LOCAL_BL_FROM"; description = "Local from blacklist";score = 3;}
local_bl_rcpt { type = "rcpt"; map = "$LOCAL_CONFDIR/local.d/local_bl_rcpt.map.inc"; symbol = "LOCAL_BL_RCPT"; description = "Local rcpt blacklist";score = 3;}

# Whitelists
local_wl_ip { type = "ip"; map = "$LOCAL_CONFDIR/local.d/local_wl_ip.map.inc"; symbol = "LOCAL_WL_IP"; description = "Local ip whitelist";score = -5;}
local_wl_from { type = "from"; map = "$LOCAL_CONFDIR/local.d/local_wl_from.map.inc"; symbol = "LOCAL_WL_FROM"; description = "Local from whitelist";score = -5;}
local_wl_rcpt { type = "rcpt"; map = "$LOCAL_CONFDIR/local.d/local_wl_rcpt.map.inc"; symbol = "LOCAL_WL_RCPT"; description = "Local rcpt whitelist";score = -5;}
~~~
