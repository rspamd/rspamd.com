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
        rate = 0.01666666666666666666; # leak 1 message per minute
      }
    }
    # or define it with selector
    other_limit_alt = {
      selector = 'rcpts:addr.take_n(5)';
      bucket = {
        burst = 100;
        rate = "1 / 1m"; # leak 1 message per minute
      }
    }
  }
~~~

The following settings are valid inside `bucket` configuration:

- `burst`: numeric value specifying the capacity of the bucket
- `rate`: rate at which messages are leaked from the bucket, expressed as numeric value (messages per minute) or string (number per period)
Since 2.0:
- `skip_recipients`: if set to `true` number of recipients is not used as a multiplier
Since 3.1:
- `message`: Message to use for soft-reject
- `symbol`: like the top-level `symbol` option but per-bucket; indicated symbol is inserted instead of applying `soft reject`
- `skip_soft_reject`: if set to `true`, `soft reject` is not applied

## Principles of work

In Rspamd, the fundamental concept of ratelimiting is known as the leaked bucket principle. This approach can be illustrated as a bucket with a limited capacity and a small hole at the bottom. As messages are received, they accumulate in the bucket and are gradually released through the hole, without any delay but instead are counted. Once the bucket's capacity has been reached, a temporary rejection is triggered, unless the remaining space is adequate for additional messages to be accepted. Since the messages are continuously leaking, the bucket's capacity is eventually restored, enabling the processing of new messages after a certain amount of time.

The `leaked bucket` principle operates using the following actions:

1. During the check phase, a leak occurs from the specified rate bucket. If the number of messages exceeds the limit, then the message is temporarily delayed (resulting in a soft reject action).
2. After a message has been delivered or rejected, Rspamd updates the burst information for each ratelimit bucket, indicating that a message has passed the rate buckets. Additionally, dynamic multipliers are updated during this phase.

To better illustrate the concept of dynamic multipliers, refer to the sample graph below. It demonstrates how the burst multiplier varies depending on the number of received ham messages (x > 0) and spam messages (x < 0):

<img class="img-fluid" width="75%" src="{{ site.baseurl }}/img/ratelimit.png">

Regarding bounce messages, there are special buckets that lack a `from` component and have more restricted limits. Rspamd identifies the following senders as bounce senders:

- 'postmaster',
- 'mailer-daemon'
- '' (empty sender)
- 'null'
- 'fetchmail-daemon'
- 'mdaemon'

Each recipient has its own set of three buckets, making it advantageous to limit the number of recipients that are being checked.

Each bucket is defined by four parameters:
- `capacity` - determines the maximum number of messages that can be accepted before the limit is reached
- `leak` - specifies the rate at which messages are leaked from a bucket, measured in messages per second
- `dynamic_rate` - indicates the current dynamic rate multiplier
- `dynamic_burst` - specifies the current dynamic burst multiplier

For instance, a bucket with a capacity of `100` and a leak rate of `1` can accommodate up to 100 messages before accepting no more than one message per second.

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

The format used before Rspamd 1.8 for defining a ratelimit was:

```
type = [burst,leak];
```

Where `type` refers to the type of ratelimit and could be one of the following:

- `bounce_to`: limit bounces per recipient
- `bounce_to_ip`: limit bounces per recipient per ip
- `to`: limit per recipient
- `to_ip`: limit per pair of recipient and sender's IP address
- `to_ip_from`: limit per triplet: recipient, sender's envelope from and sender's IP
- `user`: limit per authenticated user (useful for outbound limits)

The `burst` attribute represents the capacity of a bucket, while `leak` indicates the rate at which messages are processed in messages per second. Both values are expressed as floating point numbers.

Beginning with version `1.5`, it's possible to define limits using a simplified form. For example, `bounce_to = "2 / 5m"` specifies a bucket with a capacity of 2 messages and a leak rate of 2 messages per 5-minute period.

The line above defines a bucket with a size of 2 and a leak rate of 2 message in 5 minutes (so 2 messages will be allowed per 5 minute period).

You can use suffixes to specify both time and message quantities.

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
