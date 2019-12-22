---
layout: doc
title: RBL module
---
# RBL module

<div id="toc" markdown="1">
  <h2 class="toc-header">Contents</h2>
  * TOC
  {:toc}
</div>

The RBL module provides support for checking the IPv4/IPv6 source address of a message's sender against a set of RBLs as well as various less conventional methods of using RBLs: against addresses in Received headers; against the reverse DNS name of the sender and against the parameter used for HELO/EHLO at SMTP time.

Configuration is structured as follows:

~~~ucl
# local.d/rbl.conf
# default settings defined here
rbls {
# 'rbls' subsection under which the RBL definitions are nested
	an_rbl {
			# rbl-specific subsection 
	}
	# ...
}
~~~

The default settings define the ways in which the RBLs are used unless overridden in an RBL-specific subsection.

Defaults may be set for the following parameters (default values used if these are not set are shown in brackets - note that these may be redefined in the default config):

- `default_ipv4`: use this RBL to test IPv4 addresses (`true` by default).
- `default_ipv6`: use this RBL to test IPv6 addresses (`false` by default).
- `default_received`: use this RBL to test IPv4/IPv6 addresses found in `Received` headers. The RBL should also be configured to check one/both of IPv4/IPv6 addresses (`true` by default).
- `default_from`: use this RBL to test IPv4/IPv6 addresses of message senders. The RBL should also be configured to check one/both of IPv4/IPv6 addresses (`false` by default).
- `default_rdns`: use this RBL to test reverse DNS names of message senders (hostnames passed to Rspamd should have been validated with a forward lookup, particularly if this is to be used to provide whitelisting) (`false` by default).
- `default_helo`: use this RBL to test parameters sent for HELO/EHLO at SMTP time (`false` by default).
- `default_dkim`: use this RBL to test domains found in validated DKIM signatures (`false` by default).
- `default_dkim_domainonly`: if `true` test top-level domain only, otherwise test entire domain found in DKIM signature (`true` by default).
- `default_emails`: use this RBL to test email addresses in form `[localpart].[domainpart].[rbl]` or if set to `"domain_only"` uses `[domainpart].[rbl]` (`false` by default).
- `default_unknown`: if set to `false`, do not yield a result unless the response received from the RBL is defined in its related returncodes `{}` subsection, else return the default symbol for the RBL (`false` by default).
- `default_exclude_users`: if set to `true`, do not use this RBL if the message sender is authenticated. (`false` by default).
- `default_exclude_private_ips`: if `true`, do not use the RBL if the sending host address is in `local_addrs` and do not check received headers baring these addresses (`true` by default).
- `default_exclude_local`: if `true`, hosts listed in `local_exclude_ip_map` should not be checked in this RBL (see also `local_exclude_ip_map` setting) (`true` by default).
- `default_is_whitelist`: if `true` matches on this list should neutralise any listings where this setting is false and ignore_whitelists is not true (`false` by default).
- `default_ignore_whitelists`: if `true` this list should not be neutralised by whitelists (`false` by default).
- `default_no_ip`: if `true`, IP addresses in URLs, like http://10.0.0.1/example.exe, should not be checked (`false` by default).
- `default_images`: if `true`, use this RBL to check URLs in images (`false` by default).
- `default_replyto`: if `true`, use this RBL to check header "Reply-to" (`false` by default).
- `default_dkim_match_from`: if `true`, use this RBL to check only aligned DKIM domains (`false` by default).

Other parameters which can be set here are:

- `local_exclude_ip_map`: map containing IPv4/IPv6 addresses/subnets that shouldn't be checked in RBLs (where `exclude_local` is `true` (default)).
- `hash`: (new in Rspamd 1.5) valid for `helo` and `emails` RBL types - lookup hashes instead of literal strings. Possible values for this parameter are `sha1`, `sha256`, `sha384`, `sha512` and `md5` or any other value for the default hashing algorithm.
- `disable_monitoring`: (new in Rspamd 1.6) boolean value that disables monitoring completely. It should be placed in the **global [options]({{ site.url }}{{ site.baseurl }}/doc/configuration/options.html)** file. 
- `monitored_address`: (new in Rspamd 1.6) fixed address to check for absence (`1.0.0.127` by default).

RBL-specific subsection is structured as follows:

~~~ucl
# Descriptive name of RBL or symbol if symbol is not defined.
an_rbl {
	# Explicitly defined symbol
	symbol = "SOME_SYMBOL";
	# RBL-specific defaults (where different from global defaults)
	#The global defaults may be overridden using 'helo' to override 'default_helo' and so on.
	ipv6 = true;
	ipv4 = false;
	# Address used for RBL-testing
	rbl = "v6bl.example.net";
	# Possible responses from RBL and symbols to yield
	returncodes {
		# Name_of_symbol = "address";
		EXAMPLE_ONE = "127.0.0.1";
		EXAMPLE_TWO = "127.0.0.2";
	}
}
~~~

You can also use [Spamhaus DQS](https://github.com/spamhaus/rspamd-dqs) in your RBL config. DQS (acronym for Data Query Service) is a set of DNSBLs with real time updates operated by [Spamhaus Technology](https://www.spamhaustech.com).

Some examples of using RBL:

~~~ucl
rbls {

    blocklist {
      symbol = "BLOCKLIST";
      rbl = "blocklist.bl";
      ipv6 = true;
      received = true;
      from = true;
    }
    
    WHITELIST_BASE {
      from = true;
      ipv4 = true;
      ipv6 = true;
      received = true;
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
      dkim = true;
      dkim_domainonly = false;
      dkim_match_from = true;
      ignore_whitelist = true;
      unknown = false;

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

The following extra settings are valid in the RBL subsection:

- `disabled`: if set, the RBL is not used. Use this to disable specific RBLs in `local.d/rbl.conf`. For example:

~~~ucl
rbls {
	spamhaus {
		disabled = true;
	}
}
~~~

- `whitelist_exception`: (for whitelists) - symbols named as parameters for this setting will not be used for neutralising blacklists (set this multiple times to add multiple exceptions).


# SURBL module

From version 2.0, both `EMAILS` and `SURBL` modules are deprecated in honor of the rules for RBL module. Old rules are
automatically converted by Rspamd on start. If you have your custom rules in either `SURBL` or `EMAILS` module then they are
converted in a way to have priority over RBL modules to allow smooth migration. However, the new rules should be written for
RBL module only as `SURBL` and `EMAILS` modules transition phase will not last forever.
`SURBL` performs scanning of URL's found in messages against a list of known DNS lists. It can add different symbols depending
on the DNS replies from a specific DNS URL list.

## Module configuration

The default configuration defines several public URL lists. However, their terms
of usage normally disallows commercial or very extensive usage without purchasing
a specific sort of license.

Nonetheless, they can be used by personal services or low volume requests free
of charge.

~~~ucl
# local.d/rbl.conf
# 'surbl' subsection under which the SURBL definitions are nested
surbl {
# List of domains that are not checked by surbl
whitelist = "file://$CONFDIR/local.d/maps.d/surbl-whitelist.inc.local";

rules {
    "SURBL_MULTI" {
      ignore_defaults = true;
      rbl = "multi.surbl.org";
      dkim = true;
      emails = true;
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
      ignore_defaults = true;
      rbl = "multi.uribl.com";
      dkim = true;
      emails = true;
      emails_domainonly = true;
      urls = true;

      returnbits {
        URIBL_BLOCKED = 1;
        URIBL_BLACK = 2;
        URIBL_GREY = 4;
        URIBL_RED = 8;
      }
    }
    
    "RSPAMD_URIBL" {
      ignore_defaults = true;
      rbl = "uribl.rspamd.com";
      dkim = true;
      # Also check images
      images = true;
      # Сheck emails for URLs
      emails = true;
      emails_domainonly = true;
      urls = true;
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
      ignore_defaults = true;
      rbl = "dbl.spamhaus.org";
      no_ip = true;
      dkim = true;
      emails = true;
      emails_domainonly = true;
      urls = true;

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
      ignore_defaults = true;
      rbl = "uribl.spameatingmonkey.net";
      no_ip = true;
      dkim = true;
      emails = true;
      emails_domainonly = true;
      urls = true;
      returnbits {
        SEM_URIBL = 2;
      }
    }
}
~~~

In general, the configuration of `SURBL` module is definition of DNS lists. Each
list must have suffix that defines the list itself and optionally for some lists
it is possible to specify either `bit` or `ips` sections.

Since some URL lists do not accept `IP` addresses, it is also possible to disable sending of URLs with IP address in the host to such lists. That could be done by specifying `noip = true` option:

~~~ucl
"DBL" {
    rbl = "dbl.spamhaus.org";
    # Do not check numeric URLs
    noip = true;
}
~~~

It is also possible to check HTML images URLs and email addresses (domain part) in mail's body part for URLs by using URL blacklists. Just specify `images = true` and `check_emails = true` for such list and you are done:

~~~ucl
    "RSPAMD_URIBL" {
      ignore_defaults = true;
      rbl = "uribl.rspamd.com";
      dkim = true;
      # Also check images
      images = true;
      # Сheck emails for URLs
      emails = true;
      emails_domainonly = true;
      urls = true;
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

By default, Rspamd checks each SURBL `sanity` by queriyng of `facebook.com` domain. URL black list must NOT reply by some positive result (other than NXDOMAIN) to such a query. However, sometimes you might need to change that to another domain (e.g. to `INVALID`), so you can use `monitored_domain` option from Rspamd 1.6:

~~~ucl
    "HOSTKARMA_URIBL" {
      rbl = "hostkarma.junkemailfilter.com";
      noip = true;
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
    monitored_domain = "INVALID";
}
~~~

It is also possible to check `Reply-to` header by using URL blacklists. Just specify `replyto = true`. You can also specify checking only domain part by option `emails_domainonly = true`:

~~~ucl
    RSPAMD_EMAILBL {
      ignore_defaults = true;
      emails_delimiter = ".";
      hash_format = "base32";
      hash_len = 32;
      rbl = "email.rspamd.com";
      emails_domainonly = true
      replyto = true;
      hash = "blake2";
      returncodes = {
        RSPAMD_EMAILBL = "127.0.0.2";
      }
    }
~~~

## Principles of operation

In this section, we define how `SURBL` module performs its checks.

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

This encoding can save DNS requests to query multiple lists one at a time.

Some other lists use direct encoding of lists by some specific addresses. In this
case you should define results decoding principle in `ips` section not `bits` since
bitwise rules are not applicable to these lists. In `ips` section you explicitly
match the ip returned by a list and its meaning.

## IP lists

From rspamd 1.1 it is also possible to do two step checks:

1. Resolve IP addresses of each URL
2. Check each IP resolved against SURBL list

In general this procedure could be represented as following:

* Check `A` or `AAAA` records for `example.com`
* For each ip address resolve it using reverse octets composition: so if IP address of `example.com` is `1.2.3.4`, then checks would be for `4.3.2.1.uribl.tld`

## Disabling SURBLs

Rules can be disabled by setting the `enabled` setting to `false`. This allows for easily disabling SURBLs without overriding the full default configuration. The example below could be added to `/etc/rspamd/local.d/surbl.conf` to disable the `RAMBLER_URIBL` URIBL.

~~~ucl
rules {
  "RAMBLER_URIBL" {
    enabled = false;
  }
}
~~~

## Use of URL redirectors

SURBL module is designed to work with [url_redirector module](./url_redirector.html) which can help to resolve some known redirectors and extract the real URL to check with this module. Please refer to the module's documentation about how to work with it. SURBL module will automatically use that results.
