---
layout: doc
title: Ratelimit module
---
# Ratelimit plugin

Ratelimit plugin is designed to limit messages coming from certain senders, to
certain recipients from certain IP addresses combining these parameters into
a separate limits.

All limits are stored in [Redis](http://redis.io) server (or servers cluster) to enable
shared cache between different scanners.

## Module configuration

In the default configuration, there are no cache servers specified, hence, **the module won't work** unless you add this option to the configuration.

`Ratelimit` module supports the following configuration options:

- `servers` - list of servers where ratelimit data is stored; [global settings]({{ site.baseurl }}/doc/configuration/redis.html) used if not set
- `symbol` - if this option is specified, then `ratelimit` plugin just adds the corresponding symbol instead of setting pre-result, the value is scaled as $$ 2 * tanh(\frac{bucket}{threshold * 2}) $$, where `tanh` is the hyperbolic tanhent function
- `info_symbol` (1.7.0+) - if this option is specified the corresponding symbol is inserted *in addition to* setting pre-result.
- `whitelisted_rcpts` - comma separated list of whitelisted recipients. By default
the value of this option is 'postmaster, mailer-daemon'. Supported entries are:
    * user part of the address
    * full address part of the address (1.7.0+).
- `whitelisted_ip` - a map of ip addresses or networks whitelisted
- `whitelisted_user` - a map of usernames which are excluded from user ratelimits
- `expiry` - maximum lifetime for any limit bucket (2 days by default)
- `max_rcpt` - do not apply ratelimit if it contains more than this value of recipients (5 by default). This
option allows to avoid too many work for setting buckets if there are a lot of recipients in a message).
- `ham_factor_rate` - multiplier for rate when a ham message arrives (default: 1.01) 
- `spam_factor_rate` - multiplier for rate when a spam message arrives (default: 0.99)
- `ham_factor_burst` - multiplier for burst when a ham message arrives (default: 1.02)
- `spam_factor_burst` - multiplier for burst when a spam message arrives (default: 0.98)
- `max_rate_mult` - maximum and minimum (1/X) dynamic multiplier for rate (default: 5)
- `max_bucket_mult` -  maximum and minimum (1/X) dynamic multiplier for rate (default: 10)
- `rates` - a table of allowed rates in several forms


### Ratelimit record

From the version 1.8.2, you can use [selectors framework](../configuration/selectors.html) to define ratelimit buckets. 
Hence, you can use either selector or one of the predefined ratelimits:

- `bounce_to`: limit bounces per recipient
- `bounce_to_ip`: limit bounces per recipient per ip
- `to`: limit per recipient
- `to_ip`: limit per pair of recipient and sender's IP address
- `to_ip_from`: limit per triplet: recipient, sender's envelope from and sender's IP
- `user`: limit per authenticated user (useful for outbound limits)

~~~ucl
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

## Principles of work

The basic principle of ratelimiting in Rspamd is called `leaked bucket`. It could
be visually represented as a bucket that has some capacity, and a small hole in a bottom.
Messages comes to this bucket and leak through the hole over time (it doesn't delay messages, just count them). If the capacity of
a bucket is exhausted, then a temporary reject is sent. This happens unless the capacity
of bucket is enough to accept more messages (and since messages are leaking then after some
time, it will be possible to process new messages).

The bucket operations are the following:

1. On check phase do a leak from bucket at the specified rate, if a burst is still higher than limit, then a message is temporary delayed (soft reject action)
2. If a message has been delivered (or rejected), Rspamd updates burst information for each ratelimit bucket indicating that a message has passed the rate buckets. Dynamic multipliers are also updated on this phase.

To demonstrate dynamic multipliers, here is a sample graph that shows how burst multiplier depends on number of ham (x > 0) and spam (x < 0) messages being received:

<img class="img-responsive" width="75%" src="{{ site.baseurl }}/img/ratelimit.png">

For bounce messages there are special buckets that lack `from` component and have more
restricted limits. Rspamd treats the following senders as bounce senders:

- 'postmaster',
- 'mailer-daemon'
- '' (empty sender)
- 'null'
- 'fetchmail-daemon'
- 'mdaemon'

Each recipient has its own triple of buckets, hence it is useful
to limit number of recipients to check.

Each bucket has four parameters:
- `capacity` - how many messages could go into a bucket before a limit is reached
- `leak` - how many messages per second are leaked from a bucket.
- `dynamic_rate` - the current dynamic rate multiplier
- `dynamic_burst` - the current dynamic burst multiplier

For example, a bucket with capacity `100` and leak `1` can accept up to 100 messages but then
will accept not more than a message per second.

By default, ratelimit module does not define any rates that efficiently disables the module.


### User-defined ratelimits

The user can define their own keywords to compose ratelimits with.

To create a custom keyword, we add `custom_keywords` setting to config pointing at a Lua script which we will create:

~~~ucl
ratelimit {
   custom_keywords = "/etc/rspamd/custom_ratelimit.lua";
   # other settings ...
}
~~~

The file should return a table containing our custom function(s). For example, here is a table ("custom_keywords") to contain a function ("customrl") which applies ratelimits to users only when the user is found in a map:

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

A "custom_keywords" table should define one or more functions which are passed the [task object]({{ site.url }}{{ site.baseurl }}/doc/lua/rspamd_task.html). Each function should return a Redis hash _and_ a limit (for example `return my_redis_hash, "10 / 1m"`) or `nil` to indicate that the ratelimit should not be applied. A returned ratelimit can be in simplified form or a bucket config table.

### Legacy ratelimit record

This format is used before Rspamd 1.8

```
type = [burst,leak];
```

Where `type` could be one of the following:

- `bounce_to`: limit bounces per recipient
- `bounce_to_ip`: limit bounces per recipient per ip
- `to`: limit per recipient
- `to_ip`: limit per pair of recipient and sender's IP address
- `to_ip_from`: limit per triplet: recipient, sender's envelope from and sender's IP
- `user`: limit per authenticated user (useful for outbound limits)

`burst` is a capacity of a bucket and `leak` is a rate in messages per second.
Both these attributes are floating point values.

From version `1.5` it is also possible to define limits in a simplified form:
`bounce_to = "2 / 5m";`

The line above defines a bucket with a size of 2 and a leak rate of 2 message in 5 minutes (so 2 messages will be allowed per 5 minute period).

You can use suffixes for both time and amount of messages.

Valid suffixes for periods are:
- `s`: seconds
- `m`: minutes
- `h`: hours
- `d`: days

Valid suffixes for amounts are:
- `k`: thousands
- `m`: millions
- `g`: billions

