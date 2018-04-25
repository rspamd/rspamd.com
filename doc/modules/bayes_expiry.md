---
layout: doc_modules
title: Bayes expiry module
---

# Bayes expiry module

`Bayes expiry` module provides intelligent expiration of statistical tokens for the `new schema` of Redis statistics storage.

## Module configuration

Configuration settings for `bayes expiry` module should be added to the corresponding `classifier` section (for instance in the `local.d/classifier-bayes.conf`).

`Bayes expiry` module requires new statistics schema. It should be enabled in the classifier configuration:

```ucl
new_schema = true;
```

The following settings are valid:
- **expire**: TTL that `bayes expiry` should set for tokens. Does not affect `common` tokens. See [expiration modes](#expiration-modes) for detail. Supported values are:
  * time in seconds (time unit suffixes are supported);
  * `-1`: make tokens persistent;
  * `false`: disable `bayes expiry` for the classifier. Does not affect TTLs of existing tokens. This means tokens that already have TTLs will be expired by Redis. New learned tokens  will be persistent.
- **lazy**: `true` - enable lazy expiration mode (disabled by default). See [expiration modes](#expiration-modes) for detail.

Configuration example:
```ucl
new_schema = true;
expire = 8640000;
#lazy = true;
```

## Principles of operation

Every minute `bayes expiry` module executes an expiry step. On each step it checks frequencies of about 1000 statistical tokens and updates their TTLs if necessary. The time to complete a full iteration depends on the number of tokens. For instance, full expiry cycle for 10 million tokens takes about a week. When `bayes expiry` module finishes full iteration it starts over again.

## Tokens classification

`Bayes expiry` module distinguishes four groups of tokens based on frequency of their occurrence in ham and spam classes:
- **infrequent**: occur too infrequently (the total number of occurrences is very low).
- **significant**: occur significantly more frequently in one class (ham or spam) than in the other one;
- **common** (meaningless): occur in both ham and spam classes with approximately the same frequency;
- **insignificant**: the difference of their occurrences in classes lies somewhere between `significant` and `common` tokens.

## Expiration modes

### Default expiration mode
Operation:
- Extend a `significant` token's lifetime: update token's TTL every time to `expire` value.
- Do nothing with an `insignificant` or `infrequent` token.
- Discriminate a `common` token: reset TTL to a low value (10d) if the token has greater TTL.

Advantages:
- Starting with Redis 4.0 `volatile-lfu` eviction policy can be used to expire `significant` tokens.

Disadvantages:
- Statistics cannot kept off-line longer than `expire` time. TTLs need to be periodically updating by `bayes expiry` module. This means it requires special procedures to backup statistics. If you just make a copy of the `*.rdb` file, you should know that it has a "shelf-life". If you restore it after `expire` time, all tokens will be expired.
- Constant TTL updating of `significant` tokens is unnecessary if no eviction policy is configured in Redis that assumes `significant` tokens eviction.

### Lazy expiration mode (1.7.4+)
Operation:
- Make a `significant` token persistent if it has TTL.
- Set TTL of an `insignificant` or `infrequent` token to `expire` value if its current TTL is greater than `expire`.
- Discriminate a `common` token: resets TTL to a low value (10d) if the token has greater TTL.

Advantages:
- Statistics can be kept off-line as long as necessary without the risk of `significant` tokens lose.
- Avoids unnecessary TTL updates as much as possible.

Disadvantages:
- `Significant` tokens are persistent and cannot be evicted.

To enable lazy expiration mode add `lazy = true;` to the classifier configuration.

### Changing expiration mode

The expiration mode for existing statistics database can be changed in the configuration at any time. Tokens' TTLs will be changed as necessary during the next expiry cycle.

### Changing expire value

If new `expire` value is lower than current one then TTLs greater than new `expire` value will be changed during the next expiry cycle.

In order to set expire value greater than current one, first you need to make tokens persistent (set `expire = -1;`) and wait until at least one expiry cycle completed.
Then you can set new `expire` value.
