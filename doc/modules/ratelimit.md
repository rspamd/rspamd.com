---
layout: doc
title: Ratelimit module
directory-tree:
  emphasize: true
---

# Ratelimit plugin
{:.no_toc}

Ratelimit plugin is designed to limit messages coming from certain senders, to
certain recipients from certain IP addresses combining these parameters into
a separate limits.

To enable a shared cache across multiple scanners, all the established limits are securely stored within a [Redis server](https://redis.io) (or a cluster of servers).

{% include toc.html %}

## Module configuration

By default, no cache servers are specified in the configuration, meaning that the module **will not work** until this option is added.

`Ratelimit` module supports the following configuration options:

- `servers` - list of servers where ratelimit data is stored; [global settings]({{ site.baseurl }}/doc/configuration/redis.html) used if not set
- `symbol` - if this option is specified, then `ratelimit` plugin just adds the corresponding symbol instead of setting pre-result, the value is scaled as $$ 2 * tanh(\frac{bucket}{threshold * 2}) $$, where `tanh` is the hyperbolic tangent function
- `info_symbol` (1.7.0+) - if this option is specified the corresponding symbol is inserted *in addition to* setting pre-result.
- `whitelisted_rcpts` - comma separated list of whitelisted recipients. By default
the value of this option is 'postmaster, mailer-daemon'. Supported entries are:
    * user part of the address
    * full address part of the address (1.7.0+).
- `whitelisted_ip` - a map of ip addresses or networks whitelisted
- `whitelisted_user` - a map of usernames which are excluded from user ratelimits
- `expire` - maximum lifetime for any limit bucket (2 days by default)
- `dynamic_rate_limit` (3.9.0+) - enable dynamic ratelimit multipliers (default: false)
- `ham_factor_rate` - multiplier for rate when a ham message arrives (default: 1.01) 
- `spam_factor_rate` - multiplier for rate when a spam message arrives (default: 0.99)
- `ham_factor_burst` - multiplier for burst when a ham message arrives (default: 1.02)
- `spam_factor_burst` - multiplier for burst when a spam message arrives (default: 0.98)
- `max_rate_mult` - maximum and minimum (1/X) dynamic multiplier for rate (default: 5)
- `max_bucket_mult` -  maximum and minimum (1/X) dynamic multiplier for rate (default: 10)
- `allow_local` - a boolean that enables rate-limiting of local requests from rspamc or controller, including WebUI (default: false)
- `rates` - a table of allowed rates in several forms


### Ratelimit record

Starting from version 1.8.2, it is possible to define ratelimit buckets using the [selectors framework](../configuration/selectors.html). 
This means that you can opt to use either a selector or one of the predefine ratelimits:

- `bounce_to`: limit bounces per recipient
- `bounce_to_ip`: limit bounces per recipient per ip
- `selector`: limit per arbitrary string returned by selector
- `to`: limit per recipient
- `to_ip`: limit per pair of recipient and sender's IP address
- `to_ip_from`: limit per triplet: recipient, sender's envelope from and sender's IP
- `user`: limit per authenticated user (useful for outbound limits)

~~~hcl
# local.d/ratelimit.conf
  rates {
    # Selector based ratelimit
    some_limit = {
      selector = 'user.lower';
      # You can define more than one bucket, however, you need to use array syntax only
      bucket = [
      {
        burst = 100;
        rate = "10 / 1min";
      },
      {
        burst = 10;
        rate = "100 / 1min";
      }]
    }
    # Predefined ratelimit
    to = {
      bucket = {
        burst = 100;
        rate = 0.01666666666666666666; # 1 message per minute
      }
    }
    # or define it with selector
    other_limit_alt = {
      selector = 'rcpts:addr.take_n(5)';
      bucket = {
        burst = 100;
        rate = "1 / 1m"; # 1 message per minute
      }
    }
  }
~~~

The following settings are valid inside `bucket` configuration:

- `burst`: numeric value specifying the capacity of the bucket
- `rate`: rate at which tokens are added to the bucket, expressed as numeric value (equivalent to messages per minute) or string (number per period)
Since version 2.0:
- `skip_recipients`: if set to `true`, the number of recipients is not used as a multiplier
Since version 3.1:
- `message`: Message to use for soft-reject
- `symbol`: like the top-level `symbol` option but per-bucket; indicated symbol is inserted instead of applying `soft reject`
- `skip_soft_reject`: if set to `true`, `soft reject` is not applied

## Principles of operation

Rspamd utilizes the **token bucket** algorithm for rate-limiting, a mechanism that can be visualized as a finite-capacity bucket. This bucket is periodically replenished with tokens at set intervals. Each message processed by Rspamd expends one token. If the bucket is empty, the message is delayed (soft rejected). This design permits a burst of messages as long as tokens remain in the bucket. Once the bucket reaches its limit (full), no further tokens are added until some of existing ones are consumed. Once the tokens are depleted, subsequent messages are delayed until tokens are replenished over time. This strategy ensures that the flow of messages does not exceed a predefined rate.

The **token bucket** algorithm operates as follows:

1. **Checking phase**: During this phase, tokens are incrementally added to the specified bucket at a constant rate. If the bucket is full, incoming tokens are discarded. When a message arrives, Rspamd checks if the message can acquire a token from the designated rate bucket, and if there are sufficient tokens, the message is processed immediately; otherwise, the it is temporarily deferred (leading to a soft reject action).
2. **Bucket state update**: After a message has been processed, whether delivered or rejected, Rspamd updates the bucket's state, removing a token per processed message. This phase also includes the adjustment of dynamic multipliers to adapt to varying traffic patterns.

Before version 3.9.0, the dynamic rate-limit feature was enabled by default. Starting from version 3.9.0, this feature is disabled by default and requires explicit activation in the configuration. Alternatively, you can configure the `ham_factor_rate`/`spam_factor_rate` and/or `ham_factor_burst`/`spam_factor_burst` multipliers for individual buckets as needed.

To better illustrate the concept of dynamic multipliers, refer to the sample graph below. It demonstrates how the burst multiplier varies depending on the number of received ham messages (x > 0) and spam messages (x < 0):

<img class="img-fluid" width="75%" src="{{ site.baseurl }}/img/ratelimit.png">

Specialized buckets are used for managing bounce messages, which lack a `from` component and have stricter limits. Rspamd recognizes the following as bounce senders:

- 'postmaster'
- 'mailer-daemon'
- '' (empty sender)
- 'null'
- 'fetchmail-daemon'
- 'mdaemon'

Each recipient is associated with own set of three buckets, making it advantageous to limit the number of recipients that are being checked.

Each bucket is defined by four parameters:
- `capacity` - the total number of tokens a bucket can hold, corresponding to the maximum number of messages that can be processed before reaching the limit.
- `rate` - the frequency of token insertion into the bucket, measured in tokens (messages) per unit of time, reflecting the steady message rate.
- `dynamic_rate` - the current dynamic rate multiplier, which adjusts the token addition rate based on traffic patterns.
- `dynamic_burst` - the current dynamic burst multiplier, which affects the maximum burst size under certain conditions.

For example, a bucket with a **capacity** of `100` and a **rate** of `1` can handle up an initial burst up to 100 messages, and subsequently maintains a steady throughput of one message per second once the bucket is empty.

It is important to note that the ratelimit module does not define any rates that could effectively disable the module by default.


### User-defined ratelimits

Users can define their own keywords to create ratelimits by following steps as below. Consider using `selectors` instead.

First, add the `custom_keywords` setting to the configuration file, pointing to a Lua script that will be created:

~~~hcl
   custom_keywords = "/etc/rspamd/custom_ratelimit.lua";
   # other settings ...
~~~

Next, create a Lua script that returns a table containing the custom function(s). For instance, the following table ("custom_keywords") contains a function ("customrl") that applies ratelimits to users only when the user is found in a map:

~~~lua
local custom_keywords = {}
local d = {}

-- create map
d['badusers'] = rspamd_config:add_map({
  ['url']= '/etc/rspamd/badusers.map',
  ['type'] = 'set',
  ['description'] = 'Bad users'
})

custom_keywords.customrl = function(task)
  local rspamd_logger = require "rspamd_logger"
  -- get authenticated user
  local user = task:get_user()
  -- define a ratelimit
  -- a ratelimit can be defined in simplified form (10 / 1m) or as a bucket config (table)
  local crl = "10 / 1m"
  if not user then return end -- no user, return nil
  if d['badusers']:get_key(user) then
    rspamd_logger.infox(rspamd_config, "User %s is bad, returning custom ratelimit %s", user, crl)
    -- return redis hash to store rl data and a ratelimit
    -- our redis hash will be "rs_custom_rl_john.doe" assuming user == john.doe
    return "rs_customrl_" .. user, crl
  else
    return -- user is not in map, return nil
  end
end

return custom_keywords
~~~

The "custom_keywords" table should define one or more functions that receive the [task object]({{ site.url }}{{ site.baseurl }}/doc/lua/rspamd_task.html) as input. Each function should return a Redis hash _and_ a limit, for example `return my_redis_hash, "10 / 1m"`. Alternatively, a function can return `nil` to indicate that the ratelimit should not be applied. The ratelimit returned can be in simplified form or a bucket config table.

### Legacy ratelimit record

In versions of Rspamd prior to 1.8, ratelimits were defined as follows:

```hcl
type = [burst,rate];
```

Where `type` refers to the type of ratelimit, which could be:

- `bounce_to`: limit bounces per recipient
- `bounce_to_ip`: limit bounces per recipient per ip
- `to`: limit per recipient
- `to_ip`: limit per pair of recipient and sender's IP address
- `to_ip_from`: limit per triplet: recipient, sender's envelope from and sender's IP
- `user`: limit per authenticated user (useful for outbound limits)

The `burst` attribute represents the bucket's capacity, while `rate` indicates the frequency of token replenishment, measured in messages per second. Both values are expressed as floating-point numbers.

From version `1.5`, it became possible to define limits using a simplified form. For example:

```hcl
bounce_to = "2 / 5m";
```

This line defines a bucket capable of a 2-message burst and a steady rate of 2 messages within each 5-minute interval.

Suffixes may be used to specify both time and message quantities.

Valid suffixes for periods are:
- `s`: seconds
- `m`: minutes
- `h`: hours
- `d`: days

Valid suffixes for amounts are:
- `k`: thousands
- `m`: millions
- `g`: billions

## Changes in the module

**From version 3.1**, buckets can also define their custom symbols or messages, for example like this:

~~~hcl
# local.d/ratelimit.conf
rates = {
  my_bucket = { symbol = "SOME_NAME"; selector = ...; rate = ...;}  # inserts SOME_NAME symbol
  my_other_bucket = { symbol = "OTHER_NAME"; selector = ...; rate = ...;}  # inserts OTHER_NAME symbol
}
~~~

**From version 3.9.0**, the `dynamic_rate_limit` option was introduced, which enables dynamic ratelimit multipliers. This option is disabled by default.
