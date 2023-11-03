---
layout: doc
title: RBL module
---
# RBL module
{:.no_toc}

The RBL module offers support for checking various message elements, such as the sender's IP addresses, URLs, emails, Received headers chains, SMTP data (e.g. HELO domain), and more, against a set of Runtime Black Lists (RBL) typically provided through dedicated DNS zones.

By default, Rspamd comes with a set of RBL rules pre-configured for popular resources that are often free for non-profit usage, subject to fair usage policies. If you require a different level of support or access, please contact the relevant vendors.

For example, you can use [Abusix Mail Intelligence](https://docs.abusix.com/abusix-mail-intelligence/getting-started/dmw9dcwSGSNQiLTssFAnBW#rspamd) or [Spamhaus DQS](https://github.com/spamhaus/rspamd-dqs) or any other RBL provider that suits your needs.

<div id="toc" markdown="1">
  <h2 class="toc-header">Contents</h2>
  * TOC
  {:toc}
</div>

## Configuration structure

Configuration for this module is structured as following:

~~~ucl
# local.d/rbl.conf

# 'rbls' subsection under which the RBL definitions are nested
rbls {
  # rbl-specific subsection
  an_rbl {
    ## required settings
    # checks to enable for this RBL
    checks = ["from"];
    # Address used for RBL-testing
    rbl = "rbl.example.net";

    ## some optional settings
    # Explicitly defined symbol
    symbol = "SOME_SYMBOL";

    # redefined defaults for IPv6 only RBL
    ipv4 = false;
    ipv6 = true; # Define IPv6 only RBL

    # Possible responses from RBL and symbols to yield
    returncodes = {
      # Name_of_symbol = "address";
      EXAMPLE_ONE = "127.0.0.1";
      EXAMPLE_TWO = "127.0.0.2";
    }
  }
}
~~~

## Configuration parameters

### Global parameters

- `local_exclude_ip_map`: map containing additional IPv4/IPv6 addresses/subnets that should be considered private and excluded from checks where `exclude_local` is `true` (the default).
- `url_whitelist`: map containing host names which should be skipped by URL checks.

### RBL-specific parameters

The required parameters `rbl` and `checks` set the address used for testing and the checks to be performed respectively. Valid values for `checks` can include any of the following:

- `content_urls` - URLs extracted by `lua_content` (eg. from PDFs)
- `dkim` - domain that provided DKIM signature for a message
- `emails` - email addresses found in a message-body
- `from` - the sending IP that sent the message
- `helo` - HELO provided by the sender
- `images` - URLs of images linked in message body
- `numeric_urls` - IP addresses featuring in the hostname part of URLs (since 3.7)
- `rdns` - sender's hostname as provided to Rspamd (expected to be forward-confirmed)
- `received` - IP addresses found in `Received` headers
- `replyto` - address from the `Reply-To` header of a message
- `urls` - URLs extracted from message body

You can use selectors to look up arbitrary data. Please refer to the section on selectors for more information.

~~~ucl
# /etc/rspamd/local.d/rbl.conf
rules {
  # minimal configuration example
  SIMPLE_RBL {
    rbl = "rbl.example.net";
    checks = ["from"];
  }
}
~~~

Optional parameters (and their defaults if applicable) are as follows:

- `dkim_domainonly` (true) - lookup eSLD associated with DKIM signature rather than full label
- `dkim_match_from` (false) - only check DKIM signatures matching the `From` header
- `emails_domainonly` (false) - lookup domain of address instead of full address
- `enabled` (true) - allow for disabling of RBLs
- `exclude_local` (true) - do not check messages from private IPs against this RBL (for `received` check: do not check private IPs at all)
- `exclude_users` (false) - do not check this RBL if sender is an authenticated user
- `hash` - valid for `helo` and `emails` RBL types - lookup hashes instead of literal strings. Possible values for this parameter are `sha1`, `sha256`, `sha384`, `sha512` and `md5` or any other value for the default hashing algorithm.
- `hash_format` - encoding to use for hash: `hex`, `base32` or `base64`
- `ignore_whitelist` (false) - allow whitelists to neutralise this RBL
- `images` (false) - whether image URLs should be checked by `urls` check
- `ipv4` (true) - if IPv4 addresses should be checked
- `ipv6` (true) - if IPv6 addresses should be checked
- `is_whitelist` (false) - denotes that this RBL is an whitelist
- `local_exclude_ip_map` - map containing IPv4/IPv6 addresses/subnets which should be considered private (and treated as local by `exclude_local`)
- `monitored_address` (`1.0.0.127`) - fixed address to check for absence; see section on monitoring for more information
- `no_ip` (false) - do not look up IP addresses in this RBL
- `requests_limit` (9999) - maximum number of entities extracted by URL checks
- `resolve_ip` - resolve the domain to IP address
- `returnbits` - dictionary of symbols mapped to bit positions; if the bit in the specified position is set the symbol will be returned
- `returncodes` - dictionary of symbols mapped to lua patterns; if result returned by the RBL matches the pattern the symbol will be returned
- `returncodes_matcher` - a specific mechanism for testing `returncodes`, see [details]({{ site.url }}{{ site.baseurl }}/doc/modules/rbl.html#returncodes-matchers)
- `selector_flatten` (false) - lookup result of chained selector as a single label
- `selector` - one or more selectors producing data to look up in this RBL; see section on selectors for more information
- `unknown` (false) - yield default symbol if `returncodes` or `returnbits` is specified and RBL returns unrecognised result
- `whitelist_exception` - for whitelists; list of symbols which will not act as whitelists

Some examples of using RBL:

~~~ucl
rbls {

    blocklist {
      symbol = "BLOCKLIST";
      rbl = "blocklist.bl";
      checks = ['from', 'received'];
    }
    
    WHITELIST_BASE {
      checks = ['from', 'received'];
      is_whitelist = true;
      rbl = "whitelist.wl";
      symbol = "WL_RBL_UNKNOWN";
      unknown = true;
      returncodes = {
        "WL_RBL_CODE_2" = "127.0.0.2";
        "WL_RBL_CODE_3" = "127.0.0.3";
      }
    }
      
    DNS_WL {
      symbol = "DNS_WL";
      rbl = "dnswl.test";
      checks = ['dkim'];
      dkim_domainonly = false;
      dkim_match_from = true;
      ignore_whitelist = true;
      unknown = false;
      returncodes_matcher = "luapattern";

      returncodes {
        DNS_WL_NONE = "127.0.%d+.0";
        DNS_WL_LOW = "127.0.%d+.1";
        DNS_WL_MED = "127.0.%d+.2";
        DNS_WL_HI = "127.0.%d+.3";
        DNS_WL_BLOCKED = "127.0.0.255";
      }
    }
  }
  
~~~

## Returncodes Matchers

From version 3.7.2 Rspamd supports different strategies for handling `returncodes` via the `returncodes_matcher` setting.

By default return codes are tested for equality with the result of the DNS query. For backwards compatibility values containing the percent character implicitly enable the `luapattern` matcher if one is not set.

Matcher types:

 - `equality`: the default, not useful for actual configuration
 - `luapattern`: match query results using [Lua patterns](http://lua-users.org/wiki/PatternsTutorial), the old default
 - `radix`: check for query results inside collection of subnets and IP addresses
 - `glob`: match query results against "globbed" strings
 - `regexp`: match query results using regular expressions

Examples:
~~~
  returncodes_matcher = "radix";
  returncodes {
    SYMBOL_ONE = "127.0.0.0/24";
    SYMBOL_TWO = ["192.168.0.0/16", "1.2.3.4"];
  }

  returncodes_matcher = "glob";
  returncodes {
    SYMBOL_ONE = "127.0.0.*";
    SYMBOL_TWO = ["192.168.*.*", "1.2.3.4"];
  }

  returncodes_matcher = "regexp";
  returncodes {
    # regexp is not automatically anchored
    SYMBOL_ONE = '^127\.0\.0\.\d+$';
    SYMBOL_TWO = ['^192\.168\.\d+\.\d+$", '^1\.2\.3\.4$'];
  }

  returncodes_matcher = "luapattern";
  returncodes {
    # lua patterns are automatically anchored by ^ and $
    SYMBOL_ONE = '127%.0%.0%.%d+';
    SYMBOL_TWO = ['192%.168%.%d+%.%d+", '1%.2%.3%.4'];
  }
~~~

## URL rules

Starting from version 2.0, both the `Emails` and `SURBL` modules are deprecated in favour of the rules for the RBL module. Rspamd automatically converts the old rules on start. If you have custom rules in either the `SURBL` or `Emails` module, they are converted to have priority over RBL modules for a smooth transition. However, new rules should only be written for the RBL module, as the transition phase for the `SURBL` and `Emails` modules will not last forever.

Previously, the `SURBL` module was responsible for scanning URLs found in messages against a list of known RBLs. However, these functions are now transferred to the RBL module.

URLs extracted from the message body & URLs extracted from content such as PDFs can be checked by adding `urls` and/or `content_urls` respectively to the `checks` setting.

**Image URLs are not extracted by default**, to include image URLs, add `images` to the `checks` setting. If `images` is used in `checks` without `urls` only image URLs are extracted.

**Numeric URLs (IP addresses) are extracted by default** and are looked up in reverse notation, to exclude them set `no_ip = true`; or to extract IP addresses only set `checks = ["numeric_urls"]` (since 3.7). Combining this check with the `urls` check doesn't make logical sense; if combined with `content_urls` or `images` then numeric URLs from content and images are respectively included (by default they are excluded as with `urls` check).

## URL rules configuration

Rspamd defines a set of URL lists in the configuration by default. However, their terms of usage typically prohibit commercial or extensive usage without purchasing a specific type of license. 

Nevertheless, these lists can be used free of charge by personal services or low-volume requests.

Here are the default lists specified:

~~~ucl
# local.d/rbl.conf

# List of domains that are not checked by surbl
url_whitelist = "file://$CONFDIR/local.d/maps.d/surbl-whitelist.inc.local";

# 'rbls' subsection under which the SURBL definitions are nested
rbls {

    "SURBL_MULTI" {
      ignore_defaults = true; # for compatibility with old defaults
      rbl = "multi.surbl.org";
      checks = ['emails', 'dkim', 'urls'];
      emails_domainonly = true;
      urls = true;

      returnbits = {
        CRACKED_SURBL = 128; # From February 2016
        ABUSE_SURBL = 64;
        MW_SURBL_MULTI = 16;
        PH_SURBL_MULTI = 8;
        SURBL_BLOCKED = 1;
      }
    }
    
    "URIBL_MULTI" {
      ignore_defaults = true; # for compatibility with old defaults
      rbl = "multi.uribl.com";
      checks = ['emails', 'dkim', 'urls'];
      emails_domainonly = true;

      returnbits = {
        URIBL_BLOCKED = 1;
        URIBL_BLACK = 2;
        URIBL_GREY = 4;
        URIBL_RED = 8;
      }
    }
    
    "RSPAMD_URIBL" {
      ignore_defaults = true; # for compatibility with old defaults
      rbl = "uribl.rspamd.com";
      checks = ['emails', 'dkim', 'urls'];
      # Also check images
      images = true;
      # Check emails for URLs
      emails_domainonly = true;
      # Hashed BL
      hash = 'blake2';
      hash_len = 32;
      hash_format = 'base32';

      returncodes = {
        RSPAMD_URIBL = [
          "127.0.0.2",
        ];
      }
    }
    
    "DBL" {
      ignore_defaults = true; # for compatibility with old defaults
      rbl = "dbl.spamhaus.org";
      no_ip = true;
      checks = ['emails', 'dkim', 'urls'];
      emails_domainonly = true;

      returncodes = {
        # spam domain
        DBL_SPAM = "127.0.1.2";
        # phish domain
        DBL_PHISH = "127.0.1.4";
        # malware domain
        DBL_MALWARE = "127.0.1.5";
        # botnet C&C domain
        DBL_BOTNET = "127.0.1.6";
        # abused legit spam
        DBL_ABUSE = "127.0.1.102";
        # abused spammed redirector domain
        DBL_ABUSE_REDIR = "127.0.1.103";
        # abused legit phish
        DBL_ABUSE_PHISH = "127.0.1.104";
        # abused legit malware
        DBL_ABUSE_MALWARE = "127.0.1.105";
        # abused legit botnet C&C
        DBL_ABUSE_BOTNET = "127.0.1.106";
        # error - IP queries prohibited!
        DBL_PROHIBIT = "127.0.1.255";
        # issue #3074
        DBL_BLOCKED_OPENRESOLVER = "127.255.255.254";
        DBL_BLOCKED = "127.255.255.255";
      }
    }
    
    "SEM_URIBL_UNKNOWN" {
      ignore_defaults = true; # for compatibility with old defaults
      rbl = "uribl.spameatingmonkey.net";
      no_ip = true;
      checks = ['emails', 'dkim', 'urls'];
      emails_domainonly = true;
      returnbits {
        SEM_URIBL = 2;
      }
    }
}
~~~

Each list should have a `suffix` parameter that defines the list itself, and optionally, some replies processing logic either by `returnbits` or `returncodes` sections.

As some URL lists do not accept `IP` addresses, it is possible to disable the sending of URLs with IP addresses in the host to such lists. This can be done by specifying the `no_ip = true` option.

~~~ucl
"DBL" {
    rbl = "dbl.spamhaus.org";
    # Do not check numeric URLs
    no_ip = true;
}
~~~

URL blacklists can also be used to check DKIM signature domains, HTML image URLs, and email addresses (domain part) in the mail's body part for URLs.

~~~ucl
    "RSPAMD_URIBL" {
      ignore_defaults = true; # for compatibility with old defaults
      rbl = "uribl.rspamd.com";
      checks = ['emails', 'dkim', 'urls'];
      # Also check images
      images = true;
      # Check emails for URLs
      emails_domainonly = true;
      # Hashed BL
      hash = 'blake2';
      hash_len = 32;
      hash_format = 'base32';

      returncodes = {
        RSPAMD_URIBL = [
          "127.0.0.2",
        ];
      }
    }
~~~

In this example, we also enable privacy for requests by hashing all elements before sending. This feature is supported by a limited number of RBLs, such as Rspamd URL blacklist or MSBL EBL.

## Monitoring

Rspamd checks each RBL rule to ensure it's a valid DNS list as defined in [RFC 5782](https://datatracker.ietf.org/doc/html/rfc5782) by default. This is done to avoid situations where a single RBL blacklists the entire world or becomes unresponsive. For the IP-based rules, meaning that an IP address is queried, Rspamd will query for the `127.0.0.1` address, as per the RFC, this must return an `NXDOMAIN` response. However, some DNS lists are non RFC compatible, so you can disable monitoring for them as follows:

~~~ucl
    "HOSTKARMA_URIBL" {
      rbl = "hostkarma.junkemailfilter.com";
      no_ip = true;
      enabled = false;
      
      returncodes = {
        URIBL_HOSTKARMA_WHITE = "127.0.0.1";
        URIBL_HOSTKARMA_BLACK = "127.0.0.2";
        URIBL_HOSTKARMA_YELLOW = "127.0.0.3";
        URIBL_HOSTKARMA_BROWN = "127.0.0.4";
        URIBL_HOSTKARMA_NOBLACK = "127.0.0.5";
        URIBL_HOSTKARMA_24_48H = "127.0.2.1";
        URIBL_HOSTKARMA_LAST_10D = "127.0.2.2";
        URIBL_HOSTKARMA_OLDER_10D = "127.0.2.3";
      }
      disable_monitoring = true;
    }
~~~

For non IP lists (DKIM, URL, Email and so on), Rspamd will just produce some long random string to query expecting that this random string will *very likely* return `NXDOMAIN` by its nature.


## Principles of operation

In this section, we define how `RBL` module performs its checks.

### TLD composition

By default, we want to check some top level domain, however, many domains contain
two components while others can have 3 or even more components to check against the
list. By default, rspamd takes top level domain as defined in the [public suffixes](https://publicsuffix.org).
Then one more component is prepended, for example:

    sub.example.com -> [.com] -> example.com
    sub.co.uk -> [.co.uk] -> sub.co.uk

However, sometimes even more levels of domain components are required. In this case,
the `exceptions` map can be used. For example, if we want to check all subdomains of
`example.com` and `example.co.uk`, then we can define the following list:

    example.com
    example.co.uk

Here are new composition rules:

    sub.example.com -> [.example.com] -> sub.example.com
    sub1.sub2.example.co.uk -> [.example.co.uk] -> sub2.example.co.uk
    
### Specific URL composition rules

Starting from Rspamd 2.5, it is now possible to define custom composition rules per RBL rule, using the `lua_urls_compose` library. Below is a basic explanation of how these composition rules work:


```lua
-- First one is the input hostname, the second is the expected results
cases = {
  {'example.com', 'example.com'},
  {'baz.example.com', 'baz.example.com'},
  {'3.baz.example.com', 'baz.example.com'},
  {'bar.example.com', 'example.com'},
  {'foo.example.com', 'foo.example.com'},
  {'3.foo.example.com', '3.foo.example.com'},
}
-- Just a domain means domain + 1 level
-- *.domain means the full hostname if the last part matches
-- !domain means exclusion
-- !*.domain means the same in fact :)
-- More rules can be added easily...
local excl_rules1 = {
  'example.com',
  '*.foo.example.com',
  '!bar.example.com'
}
```

To define a specific map for these rules, the following syntax can be used:

~~~ucl
# local.d/rbl.conf
rules {
  EXAMPLE_RBL = {
      suffix = "example.url.bl.com";
      url_compose_map = "${CONFDIR}/maps.d/url_compose_map.list";
      checks = ['emails', 'dkim', 'urls'];
      emails_domainonly = true;
      ignore_defaults = true;
  }
}
~~~

Where in maps you can use something like this:

```
*.dirty.sanchez.com
!not.dirty.sanchez.com
41.black.sanchez.com
```

So it will check 5 hostname components for all urls in `dirty.sanchez.com` (e.g. `sub.some.dirty.sanchez.com` will be transformed to just `some.dirty.sanchez.com`) but not for `not.dirty.sanchez.com` where the normal tld rules will apply (e.g. `some.not.dirty.sanchez.com` -> `sanchez.com`), and for `41.black.sanchez.com` all 5 components will be checked, e.g. `something.41.black.sanchez.com`.

### DNS composition

SURBL module composes the DNS request of two parts:

- TLD component as defined in the previous section;
- DNS list suffix

For example, to form a request to multi.surbl.org, the following applied:

    example.com -> example.com.multi.surbl.com

### Results parsing

Normally, DNS blacklists encode reply in A record from some private network
(namely, `127.0.0.0/8`). Encoding varies from one service to another. Some lists
use bits encoding, where a single DNS list or error message is encoded as a bit
in the least significant octet of the IP address. For example, if bit 1 encodes `LISTA`
and bit 2 encodes `LISTB`, then we need to perform bitwise `OR` for each specific bit
to decode reply:

     127.0.0.3 -> LISTA | LISTB -> both bit symbols are added
     127.0.0.2 -> LISTB only
     127.0.0.1 -> LISTA only

The use of this encoding can reduce DNS requests needed to query multiple lists individually.

However, some lists use a direct encoding method where specific addresses are assigned to each list. In such cases, the decoding principle for the results should be defined in the `ips` section instead of the `bits` section since bitwise rules do not apply to these lists. In the `ips` section, the IP address returned by a list is explicitly matched with its corresponding meaning.

## IP lists

Starting from rspamd 1.1, it is also possible to perform two-step checks:

1. Resolve IP addresses of each URL
2. Check each IP resolved against SURBL list

In general, this procedure can be represented as follows:

* Check `A` or `AAAA` records for `example.com`
* For each IP address resolve it using reverse octets composition: so if IP address of `example.com` is `1.2.3.4`, then checks would be for `4.3.2.1.uribl.tld`

## Disabling rules

To disable a rule in SURBL, you can set the `enabled` setting to `false`. This makes it easy to disable specific SURBLs without overriding the entire default configuration. For instance, if you want to disable the `RAMBLER_URIBL` URIBL, you can add the following example to `/etc/rspamd/local.d/surbl.conf`:


~~~ucl
rules {
  "RAMBLER_URIBL" {
    enabled = false;
  }
}
~~~

## Use of URL redirectors

The SURBL module is designed to work in conjunction with the [url_redirector module](./url_redirector.html) which is capable of resolving known redirectors and extracting the actual URL for the SURBL module to check. You can refer to the url_redirector module's documentation for more information on how to use it. Once the url_redirector module has resolved the actual URL, the SURBL module will automatically use the results to perform its checks.

## Selectors

Selectors can be used to look up arbitrary values in RBLs.

The `selector` field could be configured as a string in the rule settings if only one selector is needed:

~~~
checks = ["replyto"];
selector = "from('mime'):addr";
hash = "sha1";
symbols_prefixes {
  replyto = "REPLYTO";
  selector = "FROM";
}
~~~

Or they could be specified as a map of user-specified names to selectors if more than one is needed:

~~~
selector = {
  mime_domain = "from('mime'):domain";
  subject_digest = "header('subject').lower.digest('hex')";
}
symbols_prefixes {
  mime_domain = "MIME_DOMAIN";
  subject_digest = "SUBJECT_DIGEST"
}
~~~
