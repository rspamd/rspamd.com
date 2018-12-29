---
layout: doc
title: Milter headers module
---

# Milter headers module
{:.no_toc}

The `milter headers` module (formerly known as `rmilter headers`) has been added in Rspamd 1.5 to provide a relatively simple way to configure adding/removing of headers via Rmilter (the alternative being to use the [API]({{ site.baseurl }}/doc/lua/rspamd_task.html#me7351)). Despite its namesake it also works with [Haraka](https://haraka.github.io) and Communigate.

{::options parse_block_html="true" /}
<div id="toc">
  <h2 class="toc-header">Contents</h2>
  * TOC
  {:toc}
</div>

## Principles of operation

The `milter headers` module provides a number of routines to add common headers which can be selectively enabled and configured. User-defined routines can also be added to configuration.

## Configuration

~~~ucl
# local.d/milter_headers.conf:

# Options

# Add "extended Rspamd headers" (default false) (enables x-spamd-result, x-rspamd-server & x-rspamd-queue-id routines)
# extended_spam_headers = true;

# List of headers to be enabled for authenticated users (default empty)
# authenticated_headers = ["authentication-results"];

# List of headers to be enabled for local IPs (default empty)
# local_headers = ["x-spamd-bar"];

# Set false to always add headers for local IPs (default true)
# skip_local = true;

# Set false to always add headers for authenticated users (default true)
# skip_authenticated = true;

# Routines to use- this is the only required setting (may be omitted if using extended_spam_headers)
use = ["x-spamd-bar", "authentication-results"];

# this is where we may configure our selected routines
routines {
  # settings for x-spamd-bar routine
  x-spamd-bar {
    # effectively disables negative spambar
    negative = "";
  }
  # other routines...
}
custom {
  # user-defined routines: more on these later
}
~~~

## Options

### extended_spam_headers

Add "extended Rspamd headers" to messages [NOT originated from authenticated users or `our_networks`](#scan-results-exposure-prevention) (default `false`). Enables the following routines: `x-spamd-result`, `x-rspamd-server` and `x-rspamd-queue-id`. 

~~~ucl
extended_spam_headers = true;
~~~

### authenticated_headers (1.6.1+)

List of headers to be enabled for authenticated users (default `empty`).

~~~ucl
authenticated_headers = ["authentication-results"];
~~~

### remove_upstream_spam_flag (1.7.1+)

Set `false` to keep pre-existing spam flag added by an upstream spam filter (default `true`). Enables `remove-spam-flag`.

~~~ucl
remove_upstream_spam_flag = true;
~~~

### local_headers (1.6.1+)

List of headers to be enabled for local IPs (default `empty`).

~~~ucl
local_headers = ["x-spamd-bar"];
~~~

### skip_local (1.6.0+)

Set false to always add headers for local IPs (default `true`).

~~~ucl
skip_local = true;
~~~

### skip_authenticated (1.6.0+)
    
Set false to always add headers for authenticated users (default `true`)

~~~ucl
skip_authenticated = true;
~~~

### extended_headers_rcpt (1.6.2+)

List of recipients (default `empty`).

When [`extended_spam_headers`](#extended_spam_headers) is enabled, also add extended Rspamd headers to messages if **EVERY** envelope recipient match this list (e.g. a list of domains mail server responsible for).

~~~ucl
extended_headers_rcpt = ["user1", "@example1.com", "user2@example2.com"];
~~~

`extended_headers_rcpt` has higher precedence than `skip_local` and `skip_authenticated`. 

### use

Routines to use- this is the only required setting (may be omitted if using `extended_spam_headers`)

~~~ucl
use = ["x-spamd-bar", "authentication-results"];
~~~

## Functions

Available routines and their settings are as below, default values are as indicated:

### authentication-results

Add an [authentication-results](https://tools.ietf.org/html/rfc7001) header.

~~~ucl
  # Name of header
  header = "Authentication-Results";
  # Remove existing headers
  remove = 1;
  # Set this false not to add SMTP usernames in authentication-results
  add_smtp_user = true;
  # SPF/DKIM/DMARC symbols in case these are redefined
  spf_symbols {
    pass = "R_SPF_ALLOW";
    fail = "R_SPF_FAIL";
    softfail = "R_SPF_SOFTFAIL";
    neutral = "R_SPF_NEUTRAL";
    temperror = "R_SPF_DNSFAIL";
    none = "R_SPF_NA";
    permerror = "R_SPF_PERMFAIL";
  }
  dkim_symbols {
    pass = "R_DKIM_ALLOW";
    fail = "R_DKIM_REJECT";
    temperror = "R_DKIM_TEMPFAIL";
    none = "R_DKIM_NA";
    permerror = "R_DKIM_PERMFAIL";
  }
  dmarc_symbols {
    pass = "DMARC_POLICY_ALLOW";
    permerror = "DMARC_BAD_POLICY";
    temperror = "DMARC_DNSFAIL";
    none = "DMARC_NA";
    reject = "DMARC_POLICY_REJECT";
    softfail = "DMARC_POLICY_SOFTFAIL";
    quarantine = "DMARC_POLICY_QUARANTINE";
  }
~~~

### fuzzy-hashes (1.7.5+)

For each matched fuzzy hash adds a header containing the hash.

~~~ucl
  header = "X-Rspamd-Fuzzy";
~~~

### remove-header (1.6.2+)

Removes a header with the specified name (`header` MUST be specified):

~~~ucl
  header = "Remove-This";
  remove = 1;
~~~

### remove-headers (1.6.3+)

Removes multiple headers (`headers` MUST be specified):

~~~ucl
  headers {
    "Remove-This" = 1;
    "This-Too" = 1;
  }
~~~

### remove-spam-flag (1.7.1+)

Removes pre-existing spam flag added by an upstream spam filter.

~~~ucl
  header = "X-Spam";
~~~

Default name of the header to be removed is `X-Spam` which can be manipulated using the `header` setting.

### spam-header

Adds a predefined header to mail identified as spam.

~~~ucl
  header = "Deliver-To";
  value = "Junk";
  remove = 1;
~~~

Default name/value of the added header is `Deliver-To`/`Junk` which can be manipulated using the `header` and `value` settings.

### stat-signature (1.6.3+)

Attaches the stat signature to the message.

~~~ucl
  header = 'X-Stat-Signature';
  remove = 1;
~~~

### x-rspamd-queue-id (1.5.8+)

Adds a header containing the Rspamd queue id of the message [if it is NOT originated from authenticated users or `our_networks`](#scan-results-exposure-prevention).

~~~ucl
  header = 'X-Rspamd-Queue-Id';
  remove = 1;
~~~

### x-spamd-result (1.5.8+)

Adds a header containing the scan results [if the message is NOT originated from authenticated users or `our_networks`](#scan-results-exposure-prevention).

~~~ucl
  header = 'X-Spamd-Result';
  remove = 1;
~~~

### x-rspamd-server (1.5.8+)

Adds a header containing the name of the Rspamd server that checked out the message [if it is NOT originated from authenticated users or `our_networks`](#scan-results-exposure-prevention).

~~~ucl
  header = 'X-Rspamd-Server';
  remove = 1;
~~~

### x-spamd-bar

Adds a visual indicator of spam/ham level.

~~~ucl
  header = "X-Spamd-Bar";
  positive = "+";
  negative = "-";
  neutral = "/";
  remove = 1;
~~~

### x-spam-level

Another visual indicator of spam level- SpamAssassin style.

~~~ucl
  header = "X-Spam-Level";
  char = "*";
  remove = 1;
~~~

### x-spam-status

SpamAssassin-style X-Spam-Status header indicating spam status.

~~~ucl
  header = "X-Spam-Status";
  remove = 1;
~~~

### x-virus

~~~ucl
  header = "X-Virus";
  remove = 1;
  # The following setting is an empty list by default and required to be set
  # These are user-defined symbols added by the antivirus module
  symbols = ["CLAM_VIRUS", "FPROT_VIRUS"];
~~~

Adds a header containing names of virii detected by scanners configured in [Antivirus module]({{ site.baseurl }}/doc/modules/antivirus.html) in case that virii are detected in a message.

## Custom routines

User-defined routines can be defined in configuration in the `custom` section, for example:

~~~ucl
  custom {
    my_routine = <<EOD
return function(task, common_meta)
  -- parameters are task and metadata from previous functions
  return nil, -- no error
    {['X-Foo'] = 'Bar'}, -- add header: X-Foo: Bar
    {['X-Foo'] = 1}, -- remove foreign X-Foo headers
    {} -- metadata to return to other functions
  end
EOD;
  }
~~~

The key `my_routine` could then be referenced in the `use` setting like other routines.

## Scan results exposure prevention

To prevent exposing scan results in outbound mail, extended Rspamd headers routines (`x-spamd-result`, `x-rspamd-server` and `x-rspamd-queue-id`) add headers only if messages is **NOT** originated from authenticated users or `our_networks`.

The [`extended_headers_rcpt`](#extended_headers_rcpt-162) option can be used to add extended Rspamd headers also to messages sent to specific recipients or domains (e.g. a list of domains the mail server responsible for).

### Disabling DSN

Delivery status notification (DSN) reports of *successful* delivery can contain the original message headers including Rspamd headers. The only way to prevent it is to stop offering DSN to foreign servers.

Besides, disabling DSN prevents backscatter generation.

### Postfix example

The following configuration example allows DSN requests from local subnets and authenticated users only. The `smtpd_discard_ehlo_keyword_address_maps` is applied to `smtp` service only, `smtps` and `submission` are not affected.

esmtp_access:
```conf
# Allow DSN requests from local subnets only
192.168.0.0/16  silent-discard
10.10.0.0/16    silent-discard
0.0.0.0/0       silent-discard, dsn
::/0            silent-discard, dsn
```

master.cf:
```conf
# ==========================================================================
# service type  private unpriv  chroot  wakeup  maxproc command + args
#               (yes)   (yes)   (no)    (never) (100)
# ==========================================================================
smtp      inet  n       -       n       -       1       postscreen
  -o smtpd_discard_ehlo_keyword_address_maps=cidr:$config_directory/esmtp_access
```
