---
layout: doc
title: ASN module
---

# ASN module

ASN module looks up ASN numbers and some related information: namely country code of ASN owner & subnet in which IP is announced and makes these available to other plugins as mempool variables.

The module exports `asn`, `country` and `ipnet`<sup>[1](#fn)</sup> as mempool variables available from Lua after prefilters stage.

### Configuration

ASN module is enabled in the default configuration. Settings could be added to `/etc/rspamd/local.d/asn.conf`.

~~~ucl
# Provider: just "rspamd" for now
provider_type = "rspamd";
# Provider-specific configuration
provider_info {
  ip4 = "asn.rspamd.com";
  ip6 = "asn6.rspamd.com";
}
# If defined, insert symbol with lookup results
symbol = "ASN";
~~~

<a name="fn"><sup>1:</sup></a> till version 2.0 as it is a dup of ASN
