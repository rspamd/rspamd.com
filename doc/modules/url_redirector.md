---
layout: doc
title: URL redirector module
---

# URL redirector module

This module provides a hook for [RBL]({{ site.baseurl }}/doc/modules/rbl.html) module to resolve redirects.
To enable this module one should add a `redirector_hosts_map` option to the module's configuration, i.e. by adding the following to `local.d/url_redirector.conf`:
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
# How many urls to check
max_urls = 5;
# Maximum body to process
max_size = 10k;
# Insert symbol if redirected url has been found
redirector_symbol = "MY_REDIRECTOR_SYMBOL";
# Follow merely redirectors
redirectors_only = true;
# Redis key for top urls
top_urls_key = 'rdr:top_urls';
# How many top urls to save
top_urls_count = 200;
# Check only those redirectors
redirector_hosts_map = "${LOCAL_CONFDIR}/local.d/maps.d/redirectors.inc";
~~~
