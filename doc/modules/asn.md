---
layout: doc
title: ASN module
---

# ASN module

The ASN module retrieves ASN numbers and related information such as the country code of the ASN owner and the IP's announced subnet. These details are then made available to other plugins as mempool variables.

The module exports `asn`, `country` and `ipnet`<sup>[1](#fn)</sup> as mempool variables available from Lua after prefilters stage.

### Configuration

The ASN module is enabled by default and its settings can be found in `/etc/rspamd/local.d/asn.conf`.

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
