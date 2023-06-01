---
layout: doc
title: Bayes expiry module
---

# Bayes expiry module

The `Bayes expiry` module provides intelligent expiration of statistical tokens for the `new schema` of Redis statistics storage.

## Module configuration

The configuration settings for the `bayes expiry` module should be incorporated into the appropriate `classifier` section, such as the `local.d/classifier-bayes.conf `file. Additionally, as the `Bayes expiry` module necessitates the use of the new statistics schema, it is imperative to enable it within the classifier configuration:

```ucl
new_schema = true;    # Enabled by default for classifier "bayes" in the stock statistic.conf since 2.0
```

The following settings are valid:
- **expire**: sets the TTL (time to live) for tokens. Tokens in the `common` category are not affected. For more information, see the [expiration modes](#expiration-modes) for detail. Supported values are:
  * time in seconds (time unit suffixes are supported). The maximum possible TTL value in Redis is 2147483647 (int32);
  * `-1`: make tokens persistent;
  * `false`: disable `bayes expiry` for the classifier. Note that this does not change the TTLs of existing tokens, but new learned tokens will be persistent.
- **lazy** (before 2.0): `true` - enable lazy expiration mode (disabled by default). See [expiration modes](#expiration-modes) for detail.

Configuration example:
```ucl
new_schema = true;    # Enabled by default for classifier "bayes" in the stock statistic.conf since 2.0
expire = 8640000;
#lazy = true;    # Before 2.0
```

## Principles of operation

The `bayes expiry` module performs an expiry step every minute. During each step, it examines the frequency of approximately 1000 statistical tokens and adjusts their TTLs if needed. The duration of a full iteration varies based on the number of tokens; for example, a full cycle for 10 million tokens takes approximately one week to complete. Once the `bayes expiry` module finishes a full iteration, it starts over again.

## Tokens classification

The `Bayes expiry` module categorizes tokens into four groups based on their frequency of occurrence in ham and spam classes:
- **infrequent**: occur too infrequently (the total number of occurrences is very low).
- **significant**: occur significantly more frequently in one class (ham or spam) than in the other one;
- **common** (meaningless): occur in both ham and spam classes with approximately the same frequency;
- **insignificant**: the difference of their occurrences in classes lies somewhere between `significant` and `common` tokens.

## Expiration modes

### Default expiration mode (before 2.0)
The `default` mode has been removed in Rspamd 2.0 as it offers no benefits compared to the`lazy` mode.

Operation:
- Extend a `significant` token's lifetime: update token's TTL every time to `expire` value.
- Do nothing with an `insignificant` or `infrequent` token.
- Discriminate a `common` token: reset TTL to a low value (10d) if the token has greater TTL.

Disadvantages:
- Statistics must not be stored offline for longer than the`expire` time. The Bayes Expiry module must periodically update their TTLs, which means special backup procedures are required. Simply copying the `*.rdb` file will result in its expiration after the `expire` time has passed.
- If no eviction policy is set in Redis that targets `significant` tokens, constant updating of their TTLs is not necessary.

### Lazy expiration mode (1.7.4+)
The `lazy` mode is the only expiration mode since Rspamd 2.0.

This mode ensures that `significant` tokens with a TTL are persistently kept (the module sets significant tokens TTLs to -1, i.e. makes them persistent if they are not), while TTL of `insignificant` or `infrequent` tokens is reduced to the `expire` value if its current TTL exceeds `expire`. `Common` tokens are discriminated by resetting their TTL to a lower value of 10 days, if their TTL exceed this threshold.

The advantages of the "lazy" mode include:
- The ability to keep statistics offline for an infinite period without the risk of losing `significant` tokens.
- Minimizing unnecessary TTL updates as much as possible.

To activate the lazy expiration mode in Rspamd versions prior to 2.0, simply add `lazy = true;` to the classifier configuration.

### Changing expiration mode (before 2.0)

The expiration mode for an existing statistics database can be altered in the configuration at any moment. Token's TTLs will be updated as required during the subsequent expiration cycle.

### Changing expire value

When a new `expire` value is set to a lower value than the current one, the TTLs exceeding the new `expire` value will be updated during the next expiration cycle.

To increase the `expire` value, it is necessary first to make the tokens persistent by setting `expire = -1;` and waiting until at least one expiration cycle is completed. Only then the new `expire` value can be set.

## Limiting memory usage to a fixed amount

The memory usage of the statistics dataset can be managed using the Redis `maxmemory` directive and `volatile-ttl` eviction policy. If the memory usage exceeds the set "maxmemory" limit, Redis will evict keys with shorter TTLs in accordance with the policy. Additionally, memory usage can be maintained at a nearly constant level by setting the TTL to an extremely high value, causing keys to be evicted instead of expiring.

To ensure that the memory limit and eviction policy only apply to the Bayesian statistics dataset, it should be stored in a separate Redis instance. A comprehensive explanation on configuring multi-instance Redis can be found in the [Redis replication](../tutorials/redis_replication.html) tutorial.

`local.d/classifier-bayes.conf`:

```ucl
backend = "redis";    # Enabled by default for classifier "bayes" in the stock statistic.conf since 2.0 
servers = "localhost:6378";

new_schema = true;    # Enabled by default for classifier "bayes" in the stock statistic.conf since 2.0
expire = 2144448000;
lazy = true;    # Before 2.0
```

Setting `expire = 2144448000;` sets a very high TTL of 68 years, as there is no need for the actual expiration of keys.

`/usr/local/etc/redis-bayes.conf`:

```sh
include /usr/local/etc/redis.conf

port 6378

pidfile /var/run/redis/bayes.pid
logfile /var/log/redis/bayes.log
dbfilename bayes.rdb
dir /var/db/redis/bayes/

maxmemory 500MB
maxmemory-policy volatile-ttl
```

Where `maxmemory 500MB` sets Redis to use the specified amount of memory for the instance's dataset and `maxmemory-policy volatile-ttl` sets Redis to use the eviction policy when the `maxmemory` limit is reached.
