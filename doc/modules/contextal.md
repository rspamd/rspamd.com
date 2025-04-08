---
layout: doc
title: Contextal module
directory-tree:
  emphasize: true
---

# Contextal module

The Contextal module, available from Rspamd version 3.11.2, provides integration with [Contextal Platform](https://platform.contextal.com/) which provides deep content inspection capabilities and configurable scenarios.

{% include toc.html %}

## Configuration

~~~hcl
# local.d/contextal.conf

# this module is disabled by default and must be explicitly enabled
enabled = true;

# this is the default base URL used to talk to the contextal API
base_url = "http://localhost:8080"

# this is the request TTL sent to Contextal platform
# work is supposed to be completed within this time
# the default is set at 4 seconds
request_ttl = 4.0;

# if this setting is set to true, messages are deferred until Contextal has results
# it is by default set to false
defer_if_no_result = false;
# the message used for deferral can be customised, default indicated below
defer_message = "Awaiting deep scan - try again later";

# if custom actions are used in contextal platform, they should be defined here
# the default setting is the empty list
#custom_actions = ["FOO", "BAR"];

# the action symbol prefix defines the prefix used for Contextal's actions
# default is indicated below. symbol yielded will look like `CONTEXTAL_ACTION_FOO`
action_symbol_prefix = "CONTEXTAL_ACTION";

# the submission symbol indicates that a message was sent to Contextal for processing
submission_symbol = "CONTEXTAL_SUBMISSION";

# this is timeout for communicating with the Contextal API; default value indicated below
http_timeout = 2.0;

# it is recommended to use Redis for caching to support getting results asynchronously
# and to avoid scanning identical messages multiple times
# refer to https://rspamd.com/doc/configuration/redis.html for details
servers = "127.0.0.1:6379";

# these are settings relevant to cache entries:
# how long to cache results for - default one hour
cache_ttl = 3600;
# prefix to use for entries in Redis - default "CXAL"
cache_prefix = "CXAL";
# how long to wait for another task's cache entry - default 5 seconds
cache_timeout = 5.0;
~~~

## Dealing with asynchronous results

Contextal platform processes work asynchronously so Rspamd must submit messages and poll for results.

In the default configuration, Rspamd will wait for the configured `request_ttl` before polling for results. If results would not be available, processing of the message will not be affected - to rather force the `soft reject` action (and return `defer_message` to the sender) in case results aren't available, set `defer_if_no_result` to `true`.

If `request_ttl` is set to greater than 80% of [task timeout](https://rspamd.com/doc/workers/normal.html) Rspamd will not wait for results and will opportunistically check for them at postfilter stage instead.
