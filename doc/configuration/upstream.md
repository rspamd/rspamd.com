---
layout: doc
title: Upstreams configuration
---

# Upstreams configuration in Rspamd

This document describes **upstreams**: list of servers that are selected by Rspamd using the specific algorithm to establish a connection.

## Introduction

A list of upstreams is a commonly used structure in various Rspamd configuration options when setting up connections to remote servers. For instance, upstreams are used to connect to a Redis server, select a DNS server, or establish a connection via Rspamd proxy. Servers in the upstream list can be defined using IP addresses (IPv6 addresses should be enclosed in brackets) or Unix domain sockets. Here is an example:

    127.0.0.1,[::1]

by names:

    serv1.example.com,serv2.example.com

If the ports you need to use are different from the default ones, you have the option to specify custom ports:

    serv1.example.com:8080,serv2.example.com

It is also possible to resolve both names and ports for some service using DNS **SRV** records. You can read more about this method in [this article](https://www.haproxy.com/blog/dns-service-discovery-haproxy#dns-srv-records). To specify such an upstream you can set it's name to the following syntax:

    service=sentinel+redis-cluster.local

In this case, Rspamd will resolve SRV record in format `_sentinel._tcp.redis-cluster.local` to get a list of names with the ports. A corresponding SRV record might look like this one:

```
_sentinel._tcp.redis-cluster.local. TTL IN SRV 1 1 6300 sentinel1.redis-cluster.local.
```

You can also specify Unix sockets by starting with either `/` or `.`. However, please note that the priorities are not supported in this case:

    /tmp/rspamd.sock,fallback.example.com

It is also possible to define priorities for the upstreams (their logic can vary depending on the rotation algorithm). However, if you choose to do so, you must also indicate a port number:

    127.0.0.1:53:10,8.8.8.8:53:1

The upstreams line can be separated by commas or semicolons in any combination. Additionally, you can prepend a rotation algorithm to the upstreams line to override the default rotation method (specific for each upstream list definition):

    master-slave:127.0.0.1:53:10,8.8.8.8:53:1

There are several algorithms available in Rspamd so far:

* `master-slave`
* `round-robin`
* `random`
* `hash`

### Master-slave algorithm

The `master-slave` algorithm always selects the upstream with the highest weight unless it is not alive. For example, the line `master-slave:127.0.0.1:53:10,8.8.8.8:53:1` specifies that `127.0.0.1` will always be used if possible, as it has a higher weight (10) compared to `8.8.8.8` (weight 1). If `127.0.0.1` becomes unavailable, Rspamd will use `8.8.8.8` as the backup option.

If you skip specifying priorities, the first element is treated as the master and the subsequent ones are used as slaves. For example, `master-slave:127.0.0.1,8.8.8.8` is equivalent to the previous definition, with `127.0.0.1` considered the master and `8.8.8.8` as a slave.

### Round-robin algorithm

In the `round-robin` algorithm, upstreams are initially selected based on their weights, but after selection, the weight of the chosen upstream is decreased by one. For example, `round-robin:127.0.0.1:53:10,8.8.8.8:53:1` will select `127.0.0.1` ten times and `8.8.8.8` merely once. After all, upstreams are rotated through, Rspamd resets the current weights to their initial values. Therefore, this could be seen as a `10:1` distribution for these two upstreams.

Upstreams that have errors pending will have their priorities penalized according to the number of errors pending, so Rspamd prefers to select upstreams with no errors whenever possible.

### Random algorithm

Selects upstreams randomly ignoring priorities.

### Hash algorithm

The `hash` algorithm selects an upstream based on the hash value of the input key. Rspamd uses a [consistent hash algorithm](https://arxiv.org/abs/1406.2294) that allows data to be evenly distributed between shards based on some key value. This rotation method is available for specific upstreams, such as certain Redis upstreams. Otherwise, the `round-robin` algorithm is used.

## Upstreams lifetime

Rspamd monitors each upstream for errors. If an error occurs, Rspamd places the upstream in monitoring mode during which it analyzes the error rate. The error rate is calculated as `errors` / `time elapsed since monitoring start`, usually set by options `max_errors` and `error_time`. If the error rate exceeds the desired limit (`max_errors` / `error_time`), Rspamd marks the upstream as inactive, unless no active upstreams are available. Any successful connection during the monitoring state returns the upstream to the active state.

When an upstream reaches the error rate limit, Rspamd marks it as inactive and waits for a certain period of time, configured by the `revive_time` option, before restoring the upstream to the active list. The entire process is illustrated in the following scheme:

<img class="img-fluid" width="75%" src="{{ site.baseurl }}/img/upstreams.png">

To tune these settings, please see the [Upstream options]({{ site.baseurl }}/doc/configuration/options.html#upstreams-options) documentation.

## Name resolution

Rspamd treats upstreams defined with their names differently. During the `revive_time`, Rspamd attempts to re-resolve these names and inserts any new IP addresses into the upstream list. The minimum interval between resolve attempts is controlled by `resolve_min_interval`, which is by default set to 1 minute. If a name has multiple addresses, Rspamd includes all of them. The addresses are then selected using round-robin rotation with error checking. Unlike upstream configurations, errors are persistent and not cleared after successful attempts. Therefore, Rspamd always selects an address with a lower error count. This approach is taken to disable an IPv6 address, for example, if IPv6 is improperly configured in the system.

Starting from version 2.0, Rspamd also performs background resolution of all upstreams every `lazy_resolve_time` + `jitter(0.1 * lazy_resolve_time)`. By default, this value is set to 1 hour, but you can customize it in the configuration (options -> upstreams section). This allows Rspamd to update its knowledge of upstream IP addresses, ensuring efficient and reliable connections. SRV-based upstreams are resolved in two steps: one for SRV record resolution and one for target resolution.
