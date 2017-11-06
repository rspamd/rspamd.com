---
layout: doc_conf
title: Redis configuration
---

# Redis configuration for Rspamd

This document describes how to setup Redis cache in Rspamd.

## Introduction

[Redis](http://redis.io) cache server is used as an efficient key-value storage by many Rspamd modules, including such modules as:

* [Ratelimit plugin]({{ site.baseurl }}/doc/modules/ratelimit.html) uses Redis to store limits buckets
* [Greylisting module]({{ site.baseurl }}/doc/modules/greylisting.html) stores data and meta hashes inside Redis
* [DMARC module]({{ site.baseurl }}/doc/modules/dmarc.html) can save DMARC reports inside Redis keys
* [Replies plugin]({{ site.baseurl }}/doc/modules/replies.html) requires Redis to save message ids hashes for outgoing messages
* [IP score plugin]({{ site.baseurl }}/doc/modules/ip_score.html) uses Redis to store data about AS, countries and networks reputation
* [Multimap module]({{ site.baseurl }}/doc/modules/multimap.html) can use Redis as readonly database for maps
* [MX Check module]({{ site.baseurl }}/doc/modules/mx_check.html) uses Redis for caching

Furthermore, Redis is used to store Bayes tokens in the [statistics]({{ site.baseurl }}/doc/configuration/statistic.html) module. Rspamd provides several ways to configure Redis storage. There is also support for Redis [replication](http://redis.io/topics/replication), so Rspamd can **write** values to one set of Redis servers and **read** data from another set.

## Redis setup

There are couple of ways to configure Redis for a module. First of all, you can place all Redis options inside the relevant module's section:

~~~ucl
dmarc {
  servers = "127.0.0.1";
}
~~~

However it is better to use local and override dirs for these purposes, for example, `/etc/rspamd/local.d/dmarc.conf` for this case:

~~~ucl
# /etc/rspamd/local.d/dmarc.conf
servers = "127.0.0.1";
~~~

You can specify multiple servers, separated by commas with (optional) port value:

~~~ucl
  servers = "serv1,serv2:6371";
~~~

By default, Rspamd uses port `6379` for Redis. Alternatively, you can define the full features of upstream options when specifying servers:

~~~ucl
  servers = "master-slave:127.0.0.1,10.0.1.1";
~~~

You can read more about upstream line in the [upstreams documentation]({{ site.baseurl }}/doc/configuration/upstream.html).

Setting Redis options for each individual module might be simplified by using of common `redis` section (for example, by defining it in `/etc/rspamd/local.d/redis.conf`):

~~~ucl
# /etc/rspamd/local.d/redis.conf
servers = "127.0.0.1";
~~~

It is also possible to redefine Redis options inside `redis` section for the specific module or modules:

~~~ucl
# /etc/rspamd/local.d/redis.conf
servers = "127.0.0.1";

dmarc {
  servers = "10.0.1.1";
}
~~~

In this example, `dmarc` module will use different servers set than other modules. To exclude specific modules from using of the common redis options, you can add them to the list of `disabled_modules`, for example:

~~~ucl
# /etc/rspamd/local.d/redis.conf
servers = "127.0.0.1";

disabled_modules = ["ratelimit"];
~~~

This configuration snippet denies `ratelimit` to use the common Redis configuration and this module will be disabled if Redis is not explicitly configured for this module (either in `redis -> ratelimit` section or in `ratelimit` section).

## Available Redis options

Rspamd supports the following Redis options (common for all modules):

* `servers`: [upstreams list]({{ site.baseurl }}/doc/configuration/upstream.html) for both read and write requests
* `read_servers`: [upstreams list]({{ site.baseurl }}/doc/configuration/upstream.html) for read only servers (usually replication slaves)
* `write_servers`: [upstreams list]({{ site.baseurl }}/doc/configuration/upstream.html) for write only servers (usually replication master)
* `timeout`: timeout in seconds to get reply from Redis (e.g. `0.5s` or `1min`)
* `db`: number of database to use (by default, Rspamd will use the default Redis database with number `0`)
* `password`: password to connect to Redis (no password by default)
* `prefix`: use the specified prefix for keys in Redis (if supported by module)
* `expand_keys` (1.7.0+): if set to `true` 'expand' key names used in queries (discussed further below)

## Key expansion

In version 1.7.0+ setting the `redis.expand_keys` configuration parameter to `true` enables special values to be replaced in key names before they are sent to Redis when queries are performed via Lua (as in the majority of plugins: such as `multimap`, `ratelimit` and `settings`). If module-specific Redis configuration is used this setting could be specified in the module configuration instead of `redis`.

Given this setting is enabled, where-ever names of keys could be specified in configuration special values could be used, for example `map = "redis://${ip}!foo` in multimap configuration would dynamically set key name to something like `1.2.3.4!foo`. Variable names which could be used are as follows:

* `ip`: sending IP of a message
* `principal_recipient`: the address of the [principal recipient]({{ site.baseurl }}/doc/lua/task.html#mc5168) of a message (`Deliver-To` request header, first SMTP recipient or MIME recipient according to availability)
* `principal_recipient_domain`: the domain name of the principal recipient
* `from`: SMTP sender address
* `from_domain`: SMTP sender address domain
