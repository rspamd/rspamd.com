---
layout: doc
title: URL redirector module
---

# URL redirector module

This module provides a hook for [RBL]({{ site.baseurl }}/doc/modules/rbl.html) module to resolve redirects.
To enable this module one should add a `redirector_hosts_map` option to the RBL module's configuration, for example by adding the following to `local.d/rbl.conf`:
~~~ucl
redirector_hosts_map = "${LOCAL_CONFDIR}/local.d/maps.d/redirectors.inc";
~~~

This file/URL should contain a list of domains that should be checked by URL redirector.

Dereferenced links are cached in Redis (see [here]({{ site.baseurl }}/doc/configuration/redis.html) for information on configuring redis), checked by SURBL module and added as tags for other modules.

# Configuration

The following settings could be set in `local.d/url_redirector.conf` to control behaviour of the URL redirector module.

~~~ucl
# How long to cache dereferenced links in Redis (default 1 day)
expire = 1d;
# Timeout for HTTP requests (10 seconds by default)
timeout = 10; # 10 seconds by default
# How many nested redirects to follow (default 1)
nested_limit = 1;
# Prefix for keys in redis (default "rdr:")
key_prefix = "rdr:";
# Check SSL certificates (default false)
check_ssl = false;
max_size = 10k; # maximum body to process
~~~
