---
layout: doc_modules
title: Milter headers module
---

# Milter headers module

The `milter headers` module (formerly known as `rmilter headers`) has been added in Rspamd 1.5 to provide a relatively simple way to configure adding/removing of headers via Rmilter (the alternative being to use the [API]({{ site.baseurl }}/doc/lua/task.html#me7351)). Despite its namesake it also works with [Haraka](https://haraka.github.io) and Communigate.

# Principles of operation

The `milter headers` module provides a number of routines to add common headers which can be selectively enabled and configured. User-defined routines can also be added to configuration.

# Configuration

~~~ucl
# local.d/milter_headers.conf:

# Options

# Rmilter compatibility option (default false) (enables x-spamd-result, x-rspamd-server & x-rspamd-queue-id)
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

# Options

## extended_spam_headers

Rmilter compatibility option (default `false`). Enables `x-spam`, `x-spamd-result`, `x-rspamd-server` and `x-rspamd-queue-id`.

~~~ucl
extended_spam_headers = true;
~~~

## authenticated_headers

List of headers to be enabled for authenticated users (default `empty`).

~~~ucl
authenticated_headers = ["authentication-results"];
~~~

## local_headers

List of headers to be enabled for local IPs (default `empty`).

~~~ucl
local_headers = ["x-spamd-bar"];
~~~

## skip_local

Set false to always add headers for local IPs (default `true`).

~~~ucl
skip_local = true;
~~~

## skip_authenticated
    
Set false to always add headers for authenticated users (default `true`)

~~~ucl
skip_authenticated = true;
~~~

## extended_headers_rcpt (1.6.2+)

List of recipients (default `empty`).

Add extended Rspamd headers to messages if **EVERY** envelope recipient match this list (e.g. a list of domains mail server responsible for).

~~~ucl
extended_headers_rcpt = ["user1", "@example1.com", "user2@example2.com"];
~~~

`extended_headers_rcpt` has higher precedence than `skip_local` and `skip_authenticated`. 

## use

Routines to use- this is the only required setting (may be omitted if using `extended_spam_headers`)

~~~ucl
use = ["x-spamd-bar", "authentication-results"];
~~~

# Functions

Available routines and their settings are as below, default values are as indicated:

## authentication-results

Add an [authentication-results](https://tools.ietf.org/html/rfc7001) header.

~~~ucl
  # Name of header
  header = "Authentication-Results";
  # Remove existing headers
  remove = 1;
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

## remove-header

Removes a header with the specified name (`header` MUST be specified):

~~~ucl
  header = "Remove-This";
  remove = 1;
~~~

## remove-headers

Removes multiple headers (`headers` MUST be specified):

~~~ucl
  headers {
    "Remove-This" = 1;
    "This-Too" = 1;
  }
~~~

## spam-header

Adds a predefined header to mail identified as spam.

~~~ucl
  header = "Deliver-To";
  value = "Junk";
  remove = 1;
~~~

Default name/value of the added header is `Deliver-To`/`Junk` which can be manipulated using the `header` and `value` settings.

## x-spamd-bar

Adds a visual indicator of spam/ham level.

~~~ucl
  header = "X-Spamd-Bar";
  positive = "+";
  negative = "-";
  neutral = "/";
  remove = 1;
~~~

## x-spam-level

Another visual indicator of spam level- SpamAssassin style.

~~~ucl
  header = "X-Spam-Level";
  char = "*";
  remove = 1;
~~~

## x-spam-status

SpamAssassin-style X-Spam-Status header indicating spam status.

~~~ucl
  header = "X-Spam-Status";
  remove = 1;
~~~

## x-virus

~~~ucl
  header = "X-Virus";
  remove = 1;
  # The following setting is an empty list by default and required to be set
  # These are user-defined symbols added by the antivirus module
  symbols = ["CLAM_VIRUS", "FPROT_VIRUS"];
~~~

Adds a header containing names of virii detected by scanners configured in [Antivirus module]({{ site.baseurl }}/doc/modules/antivirus.html) in case that virii are detected in a message.

# Custom routines

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
