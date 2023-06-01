---
layout: doc
title: Milter headers module
---

# Milter headers module
{:.no_toc}

The `milter headers` module (formerly known as `rmilter headers`) has been added in Rspamd 1.5 to provide a relatively simple way to configure adding/removing of headers via Rmilter (the alternative being to use the [API]({{ site.baseurl }}/doc/lua/rspamd_task.html#me7351)). Despite its name, the module also functions with other mail servers such as [Haraka](https://haraka.github.io) and Communigate.

<div id="toc" markdown="1">
  <h2 class="toc-header">Contents</h2>
  * TOC
  {:toc}
</div>

## Principles of operation

The `milter headers` module offers several routines for adding common headers, which can be selectively enabled and configured according to specific needs. Additionally, users have the flexibility to add their own custom routines to the configuration.

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

Set `false` to keep pre-existing spam flag added by an upstream spam filter (default `true`). This will enable the `remove-spam-flag` option.

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

### skip_all (2.8.0+)
    
Do not add extended headers for any messages (except those matching extended_headers_rcpt) (default `false`)

~~~ucl
skip_all = true;
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

`extended_headers_rcpt` has higher precedence than `skip_local`, `skip_authenticated` and `skip_all`.  
`extended_headers_rcpt` paired with `skip_all = true` can be used to only add extended headers to a map of specific recipients. 

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
  remove = 0; # 0 means remove all, 1 means remove the first one , -1 remove the last and so on
~~~

### remove-headers (1.6.3+)

Removes multiple headers (`headers` MUST be specified):

~~~ucl
  headers {
    "Remove-This" = 0;
    "This-Too" = 0;
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
  remove = 0;
~~~

Default name/value of the added header is `Deliver-To`/`Junk` which can be manipulated using the `header` and `value` settings.

### stat-signature (1.6.3+)

Attaches the stat signature to the message.

~~~ucl
  header = 'X-Stat-Signature';
  remove = 0;
~~~

### x-rspamd-queue-id (1.5.8+)

Adds a header containing the Rspamd queue id of the message [if it is NOT originated from authenticated users or `our_networks`](#scan-results-exposure-prevention).

~~~ucl
  header = 'X-Rspamd-Queue-Id';
  remove = 0;
~~~

### x-spamd-result (1.5.8+)

Adds a header containing the scan results [if the message is NOT originated from authenticated users or `our_networks`](#scan-results-exposure-prevention).

~~~ucl
  header = 'X-Spamd-Result';
  remove = 0;
~~~

### x-rspamd-server (1.5.8+)

Adds a header containing the local computer host name of the Rspamd server that checked out the message [if it is NOT originated from authenticated users or `our_networks`](#scan-results-exposure-prevention). Since Rspamd 2.4 the host name can be replaced with a user-defined string specified in the `hostname` setting.

~~~ucl
  header = 'X-Rspamd-Server';
  remove = 0;
  hostname = nil; -- Get the local computer host name (2.4+)
~~~

### x-spamd-bar

Adds a visual indicator of spam/ham level.

~~~ucl
  header = "X-Spamd-Bar";
  positive = "+";
  negative = "-";
  neutral = "/";
  remove = 0;
~~~

### x-spam-level

Another visual indicator of spam level- SpamAssassin style.

~~~ucl
  header = "X-Spam-Level";
  char = "*";
  remove = 0;
~~~

### x-spam-status

SpamAssassin-style X-Spam-Status header indicating spam status.

~~~ucl
  header = "X-Spam-Status";
  remove = 0;
~~~

### x-virus

~~~ucl
  header = "X-Virus";
  remove = 0;
  # The following setting is an empty list by default and required to be set
  # These are user-defined symbols added by the antivirus module
  symbols = ["CLAM_VIRUS", "FPROT_VIRUS"];
~~~

If the [Antivirus module]({{ site.baseurl }}/doc/modules/antivirus.html) detects any viruses in an email, the module adds a header that contains the names of the viruses detected by the configured scanners.

## Custom routines

User-defined routines can be defined in configuration in the `custom` section, for example:

~~~ucl
  custom {
    my_routine = <<EOD
return function(task, common_meta)
  -- parameters are task and metadata from previous functions
  return nil, -- no error
    {['X-Foo'] = 'Bar'}, -- add header: X-Foo: Bar
    {['X-Foo'] = 0 }, -- remove foreign X-Foo headers
    {} -- metadata to return to other functions
  end
EOD;
  }
~~~

You can reference the key `my_routine` in the `use` setting, just like you would with other routines.

Here's a more complex example: If a specific symbol is added, the module will add an additional header:

~~~ucl
custom {
  my_routine = <<EOD
return function(task, common_meta)
-- parameters are task and metadata from previous functions

  if task:has_symbol('SYMBOL') then
    return nil, -- no error
    {['X-Foo'] = 'Bar'}, -- set extra header
    {['X-Foo'] = 0}, -- remove foreign X-Foo headers
    {} -- metadata to return to other functions
  end

  return nil, -- no error
  {}, -- need to fill the parameter
  {['X-Foo'] = 0}, -- remove foreign X-Foo headers
  {} -- metadata to return to other functions

end
EOD;
}
~~~

## Scan results exposure prevention

To avoid exposing scan results in outbound email, the extended Rspamd headers routines (`x-spamd-result`, `x-rspamd-server` and `x-rspamd-queue-id`) only add headers if the message is **NOT** originated from authenticated users or `our_networks`.

If desired, the [`extended_headers_rcpt`](#extended_headers_rcpt-162) option can be used to include the extended Rspamd headers in messages sent to specific recipients or domains, such as a list of domains the mail server is responsible for.

### Disabling DSN

Delivery status notification (DSN) reports for *successful* demail deliveries can include the original message headers, including Rspamd headers. The only way to prevent this is to stop offering DSN to foreign servers. 

Additionally, disabling DSN can prevent the generation of backscatter.

### Postfix example

The following configuration example restricts DSN requests to local subnets and authenticated users only. Note that the `smtpd_discard_ehlo_keyword_address_maps` setting is applied to the `smtp` service only, and not to `smtps` or `submission`.

Make sure to modify the example below to match your subnet(s) accordingly.

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
or globaly
main.cf:

```conf
smtpd_discard_ehlo_keyword_address_maps = 
        cidr:$config_directory/esmtp_access
```

DSN can also be disabled for everyone with a shorter configuration change:
main.cf:
```conf
# $config_directory/main.cf:
    smtpd_discard_ehlo_keywords = silent-discard, dsn
```
