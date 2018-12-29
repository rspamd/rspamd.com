---
layout: doc
title: MX Check module
---

# MX Check module

The MX Check module checks if the domain in a message's SMTP FROM addresses (or the domain in HELO in case SMTP FROM is empty) has at least one connectable MX. If a connectable MX is found this information is cached in [Redis]({{ site.baseurl }}/doc/configuration/redis.html).

To enable this module, set `enabled = true` in `/etc/rspamd/local.d/mx_check.conf` and configure [redis]({{ site.baseurl }}/doc/configuration/redis.html) either globally or for this specific module.

~~~ucl
# Set this to enable the module
enabled = true;
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
# lifetime of redis cache for no valid mxes - 2 hours by default
expire_novalid = 7200;
# greylist first message with invalid MX (require greylist plugin)
greylist_invalid = false;
# prefix used for redis key
key_prefix = "rmx";
# module-specific redis-server configuration
#servers = "localhost";
# a map of specific domains that should be excluded from MX check
exclude_domains = [
	"https://rspamd.com/freemail/disposable.txt.zst",
	"https://rspamd.com/freemail/free.txt.zst",
	"${CONFDIR}/maillist.inc",
	"${CONFDIR}/redirectors.inc",
	"${CONFDIR}/dmarc_whitelist.inc",
	"${CONFDIR}/surbl-whitelist.inc"
];

~~~

Symbols indicated by configuration should be added to metric to provide non-zero scoring. For example you could add the following configuration to `/etc/rspamd/local.d/metrics.conf`:

~~~ucl
symbol "MX_INVALID" {
  score = 1.0;
  description = "No connectable MX";
  one_shot = true;
}
symbol "MX_MISSING" {
  score = 2.0;
  description = "No MX record";
  one_shot = true;
}
symbol "MX_GOOD" {
  score = -0.5;
  description = "MX was ok";
  one_shot = true;
}
~~~
