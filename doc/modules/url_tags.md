---
layout: doc
title: URL tags module
---

# URL tags module

This module caches URL `tags` in Redis for a configurable period of time. This could be used to reduce redundant or expensive processing.

See [here]({{ site.baseurl }}/doc/configuration/redis.html) for information on configuring redis.

For it to be enabled, the following should be set in `/etc/rspamd/local.d/url_tags.conf`:
~~~ucl
enabled = true;
~~~

Currently, SURBL module adds a `surbl` tag containing symbols it added to the result and a `redirect` tag containing dereferenced redirects.

# Configuration

The following settings can be configured:

~~~ucl
# Expiry time for a tag (default 1 hour)
expire = 1h;
# Prefix for redis keys (default "Ut.")
key_prefix = "Ut.";
# A list of tags not to persist (default empty)
ignore_tags = [];
~~~
