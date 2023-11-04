---
layout: doc
title: MX Check module
---

# MX Check module

The MX Check module examines whether the domain in a message's SMTP FROM address (or the domain in HELO if SMTP FROM is empty) has at least one connectable MX. If a connectable MX is discovered, this data is stored in [Redis]({{ site.baseurl }}/doc/configuration/redis.html).

To activate this module, modify `enabled = true` in `/etc/rspamd/local.d/mx_check.conf` and configure [redis]({{ site.baseurl }}/doc/configuration/redis.html) either for the entire system or for this specific module.

Here is an example of the module configuration in `local.d/mx_check.conf`:

~~~hcl
# Set this to enable the module
enabled = true;
# Module-specific redis-server configuration
#servers = "localhost";

# Increase timeout to avoid "MX_MISSING" false positives caused by tarpitting
# (not recommended for heavily loaded server)
#timeout = 10.0;

# A map of specific domains that should be excluded from MX check
exclude_domains = [
    "https://maps.rspamd.com/freemail/disposable.txt.zst",
    "https://maps.rspamd.com/freemail/free.txt.zst",
    "${CONFDIR}/maps.d/maillist.inc",
    "${CONFDIR}/maps.d/redirectors.inc",
    "${CONFDIR}/maps.d/dmarc_whitelist.inc",
    "${CONFDIR}/maps.d/surbl-whitelist.inc",
    "${CONFDIR}/maps.d/spf_dkim_whitelist.inc",
];
~~~

Module default settings:

~~~hcl
# This module is *DISABLED* by default
enabled = false;
# connection timeout in seconds
timeout = 1.0;
# symbol yielded if no MX is connectable
symbol_bad_mx = "MX_INVALID";
# symbol yielded if no MX is found
symbol_no_mx = "MX_MISSING";
# symbol yielded if MX is connectable
symbol_good_mx = "MX_GOOD";
# lifetime of redis cache - 1 day by default
expire = 86400;
# lifetime of redis cache for no valid MXes - 2 hours by default
expire_novalid = 7200;
# greylist first message with invalid MX (require greylist plugin)
greylist_invalid = true;
# prefix used for redis key
key_prefix = "rmx";
~~~

Symbols that are registered by the module:

|Group|Symbol     |Description                        |Score|
|---  |---        |---                                |---  |
|MX   |MX_MISSING |Domain has no resolvable MX        | 3.5 |
|MX   |MX_INVALID |Domain has no working MX           | 0.5 |
|MX   |MX_GOOD    |Domain has working MX              |-0.01|
|MX   |MX_WHITE   |Domain is whitelisted from MX check| 0.0 |
