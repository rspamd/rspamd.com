---
layout: doc
title: Hfilter module
---

# Hfilter module

This module is actually a set of rules that are historically implemented as a separate plugin. These rules are intended to filter some known bad patterns in hostnames, received headers, helo domains and reverse dns.

## Module configuration

The module configuration is quite limited: you can disable or enable hfilter rules by switching the corresponding groups on and off as following:

~~~hcl
# local.d/hfilter.conf

helo_enabled = true; # helo patterns (e.g. unresolved domains, bare ip addresses etc)
hostname_enabled = true; # hostname patterns
url_enabled = true; # url rules (e.g. `HFILTER_URL_ONLY` or `HFILTER_URL_ONELINE`)
from_enabled = true; # mail from rules
rcpt_enabled = true; # recipient rules
mid_enabled = false; # message id rules (e.g. `HFILTER_MID_NORESOLVE_MX` or `HFILTER_MID_NOT_FQDN`)
~~~
