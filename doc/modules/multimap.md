---
layout: doc
title: Multimap module
---
# Multimap module
{:.no_toc}

Multimap module is designed to handle rules that are based on different types of lists that are dynamically updated by Rspamd and called `maps`. This module is useful for whitelists, blacklists and other lists to be organized via files. It can also load remote lists using `HTTP` and `HTTPS` protocols or `RESP` (REdis Serialization Protocol). This article explains in detail all configuration options and features of this module.

{::options parse_block_html="true" /}
<div id="toc">
  <h2 class="toc-header">Contents</h2>
  * TOC
  {:toc}
</div>

## Principles of work

Maps in Rspamd are files or HTTP links that are automatically monitored and reloaded
if changed. For example, maps can be defined as following:

	"http://example.com/file"
	"file:///etc/rspamd/file.map"
	"/etc/rspamd/file.map"

Rspamd respects `304 Not Modified` reply from HTTP server allowing to save traffic
when a map has not been actually changed since last load. For file maps, Rspamd uses normal
`mtime` file attribute (time modified). The global map watching settings are defined in the
`options` section of the configuration file:

* `map_watch_interval`: defines time when all maps are rescanned; the actual check interval is jittered to avoid simultaneous checking (hence, the real interval is from this value up to the this interval doubled).


## Configuration

The module itself contains a set of rules in form:

~~~ucl
symbol { 
  type = "type"; 
  map = "url"; 
  # [optional params...] 
}
symbol1 { 
  type = "type"; 
  map = "from"; 
  # [optional params...] 
}

...
~~~

You can define new rules in the file `/etc/rspamd/local.d/multimap.conf`. 

Mandatory attributes are:

* `type` - map [type](#map-types)
* `map` - path to the file with list, for example:
  + `http://example.com/list` - HTTP map, reloaded using `If-Modified-Since`, can be signed
  + `https://example.com/list` - HTTPS map - same as HTTP but with TLS enabled (with certificate check)
  + `file:///path/to/list` - file map, reloaded on change, can be signed
  + `/path/to/list` - shorter form of a file map
  + `cdb://path/to/list.cdb` - [CDB](http://www.corpit.ru/mjt/tinycdb.html) map in file, cannot be signed
  + `redis://<hashkey>` - Redis map, read field in the hash stored at key
  + combination of files and http:
  
~~~ucl
map = [
  "https://maps.rspamd.com/rspamd/mime_types.inc.zst",
  "${DBDIR}/mime_types.inc.local",
  "fallback+file://${CONFDIR}/mime_types.inc"
]
~~~

For header maps, you also need to specify the exact header using `header` option.

Lists can contain keys:

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

and comments:

~~~
key1
# Single line comment
key2 # Embedded comment
~~~

The last line of a map **must** have a newline symbol at the end.

Optional map configuration attributes:

* `prefilter` - defines if the map is used in [prefilter mode](#pre-filter-maps)
* `action` - for prefilter maps defines action set by map match
* `regexp` - set to `true` if your map contain [regular expressions](#regexp-maps)
* `symbols` - array of symbols that this map can insert (for key-value pairs), [learn more](#multiple-symbols-maps)
* `score` - score of the symbol (can be redefined in the `metric` section)
* `description` - map description
* `message` - message returned to MTA on prefilter reject action being triggered
* `group` - group for the symbol (can be redefined in `metric`)
* `require_symbols` - expression of symbols that have to match for a specific message: [learn more](#conditional-maps)
* `filter` - match specific part of the input (for example, email domain): [here](#map-filters) is the complete definition of maps filters

## Map types

Type attribute means what is matched with this map. The following types are supported:

* `asn` - matches ASN number passed by [ASN module](asn.html)
* `content` - matches specific content of a message (e.g. headers, body or even a full message) against some map, usually regular expressions map
* `country` - matches country code of AS passed by [ASN module](asn.html)
* `dnsbl` - matches IP of the host that performed message handoff against some DNS blacklist (consider using [RBL](rbl.html) module for this)
* `filename` - matches attachment filename against map
* `from` - matches envelope from (or header `From` if envelope from is absent)
* `header` - matches any header specified (must have `header = "Header-Name"` configuration attribute)
* `hostname` - matches reverse DNS name of the host that performed message handoff
* `ip` - matches IP of the host that performed message handoff (against radix map)
* `mempool` - matches contents of a mempool variable (specified with `variable` parameter)
* `received` - (new in 1.5) matches elements of `Received` headers
* `rcpt` - matches any of envelope rcpt or header `To` if envelope info is missing
* `selector` - applies generic [selector](../configuration/selectors.html) and check data returned in the specific map. This type must have `selector` option and an optional `delimiter` option that defines how to join multiple selectors (an empty string by default). If a selector returns multiple values, e.g. `urls`, then all values are checked. Normal filter logic can also be applied to the selector's results.
* `symbol_options` - (new in 1.6.3) match 'options' yielded by whichever symbol of interest (requires `target_symbol` parameter)
* `url` - matches URLs in messages against maps

DNS maps are legacy and are not encouraged to use in new projects (use [rbl](rbl.html) for that).

Maps can also be specified as [CDB](http://www.corpit.ru/mjt/tinycdb.html) databases which might be useful for large maps:

~~~ucl
SOME_SYMBOL {
    map = "cdb:///path/to/file.cdb";
    type = "from";
}
~~~

## Regexp maps

All maps with the exception of `ip` and `dnsbl` maps support `regexp` mode. In this mode, all keys in maps are treated as regular expressions, for example:

```
# Sole key
/example\d+\.com/i
# Key + value (test)
/other\d+\.com/i test
# Comments are still enabled
```

For performance considerations, use only expressions supported by [Hyperscan](http://01org.github.io/hyperscan/dev-reference/compilation.html#pattern-support) as this engine provides blazing performance at no additional cost. Currently, there is no way to distinguish what particular regexp was matched in case if multiple regexp were matched.

To enable regexp mode, you should set `regexp` option to `true`:

~~~ucl
# local.d/multimap.conf
SENDER_FROM_WHITELIST {
  type = "from";
  map = "file:///tmp/from.map";
  regexp = true;
}
~~~

## Map filters

It is also possible to apply a filtering expression before checking value against some map. This is mainly useful
for `header` rules. Filters are specified with `filter` option. Rspamd supports the following filters so far:

### Content filters

Content maps support the following filters:

* `body` - raw undecoded body content (with the exceptions of headers)
* `full` - raw undecoded content of a message (including headers)
* `headers` - undecoded headers
* `text` - decoded and converted text parts (without HTML tags but with newlines)
* `rawtext` - decoded but not converted text parts (with HTML tags and newlines)
* `oneline` - decoded and stripped text content (without HTML tags and newlines)

### Filename filters

Filename maps support this filters set:

* `extension` - matches file extension
* `regexp:/re/` - extract data from filename according to some regular expression

### From, rcpt and header filters

* `email` or `email:addr` - parse header value and extract email address from it (`Somebody <user@example.com>` -> `user@example.com`)
* `email:user` - parse header value as email address and extract user name from it (`Somebody <user@example.com>` -> `user`)
*  `email:domain` - parse header value as email address and extract domain part from it (`Somebody <user@example.com>` -> `example.com`)
*  `email:domain:tld` - parse header value as email address and extract effective second level domain from it (`Somebody <user@foo.example.com>` -> `example.com`)
*  `email:name` - parse header value as email address and extract displayed name from it (`Somebody <user@example.com>` -> `Somebody`)
* `regexp:/re/` - extracts generic information using the specified regular expression

### Hostname filters

* `tld` - matches eSLD (effective second level domain - a second-level domain or something that's effectively so like `example.com` or `example.za.org`)
* `tld:regexp:/re/` - extracts generic information using the specified regular expression from the eSLD part
* `top` - matches TLD (top level domain) part of the hostname

### Mempool filters

* `regexp:/re/` - extract data from mempool variable according to some regular expression

### Received filters

If no filter is specified `real_ip` is used by default.

* `from_hostname` - string that represents hostname provided by a peer
* `from_ip` - IP address as provided by a peer
* `real_hostname` - hostname as resolved by MTA
* `real_ip` - IP as resolved by PTR request of MTA
* `by_hostname` - MTA hostname
* `proto` - protocol, e.g. ESMTP or ESMTPS
* `timestamp` - received timestamp
* `for` - for value (unparsed mailbox)
* `tld:from_hostname` - extract eSLD part from peer-provided hostname
* `tld:real_hostname` - extract eSLD part from MTA-verified hostname

If `real_ip` or `from_ip` is specified radix maps are used rather than hash maps.

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

* `full` - matches the complete URL (not the hostname)
* `full:regexp:/re/` - extracts generic information using the specified regular expression from the full URL text
* `is_obscured` - matches obscured URLs
* `is_phished` - matches hostname but if and only if the URL is phished (e.g. pretended to be from another domain)
* `is_redirected` - matches redirected URLs
* `path` - match path
* `query` - match query string
* `regexp:/re/` - extracts generic information using the specified regular expression from the hostname
* `tag:name` - matches full hostnames that have URL tag with `name`
* `tld` - matches eSLD (effective second level domain - a second-level domain or something that's effectively so like `example.com` or `example.za.org`)
* `tld:regexp:/re/` - extracts generic information using the specified regular expression from the eSLD part
* `top` - matches TLD (top level domain) part of the hostname

## Pre-filter maps

To enable pre-filter support, you should specify `action` parameter which can take one of the
following values:

* `accept` - accept the message (no action)
* `add header` or `add_header` - add a header to the message
* `rewrite subject` or `rewrite_subject` - change the subject
* `greylist` - greylist the message
* `reject` - drop the message

No filters will be processed for a message if such a map matches. Multiple symbols or symbol conditions are not supported for prefilter maps by design.

~~~ucl
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

From the version 1.3.1, it is possible to define multiple symbols and scores using multimap module. To do that, you should define all possible symbols using `symbols` option in multimap:

~~~ucl
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

Symbols that are not defined in the `symbols` attribute but used in the map are ignored and replaced by the default map symbol. If the value of a key-value pair is missing, then Rspamd just inserts the default symbol with dynamic weight equal to `1.0` (which is multiplied by metric score afterwards).

### Get all matches

If you want to match all possible regexps/globs in that list, not a single one, then you need to define `multi` flag for that map:

~~~ucl
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

From version 1.3.1, it is possible to set up maps that depends on other rules and check map if some certain condition is satisfied. In particular, you can check that a message has a valid `SPF` policy to perform some whitelisting. However, you don't want to bother about mailing lists. Then you can write the following map condition:

~~~ucl
# local.d/multimap.conf
FROM_WHITELISTED {
  require_symbols = "R_SPF_ALLOW & !MAILLIST";
  type = "from";
  map = "/some/list";
}
~~~

You can use any logic expression of other symbols within `require_symbols` definition. Rspamd automatically inserts dependency for a multimap rule on all symbols that are required by this particular rule. You cannot use symbols added by post-filters here, however, pre-filter and normal filter symbols are allowed.

## Redis for maps

From version 1.3.3, it is possible to work with maps which are stored in Redis backend. You can use any external application to put data into Redis database using HSET command (e.g HSET hashkey test@example.org 1). After you can define map as protocol `redis://` and specify hash key to read. Redis settings can be defined inside `multimap` module also.

## Examples

Here are some examples of multimap configurations:

~~~ucl
# local.d/multimap.conf
SENDER_FROM_WHITELIST_USER {
  type = "from";
  filter = "email:user";
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
  filter = 'regexp:/.*@/';
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

~~~ucl
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
