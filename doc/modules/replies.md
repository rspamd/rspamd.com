---
layout: doc
title: Replies module
---

# Replies module

This module collects the `message-id` header of messages sent by authenticated users and stores corresponding hashes to Redis, which are set to expire after a configuable amount of time (by default 1 day). Furthermore, it hashes `in-reply-to` headers of all received messages & checks for matches (ie. messages sent in response to messages our system originated)- and yields a symbol which could be used to adjust scoring or forces an action (most likely "no action" to accept) according to configuration.


## Configuration

Settings for the module are described below (default values are indicated in brackets).

- `action`: apply the given action to messages identified as replies (should typically be set to "no action" to accept)
- `expire`: time, in seconds, after which to expire records (default is one day).
- `key_prefix`: string prefixed to keys in Redis (default `rr`)
- `symbol`: symbol yielded on messages identified as replies.

You also need to set Redis servers to store data (e.g. `servers` or `read_servers` and `write_servers`). You can specify all standard Redis arguments, such as password, timeout, database and so on.

## Example

Configuration should be added to `/etc/rspamd/local.d/replies.conf`:

~~~ucl
# This setting is non-default & may be desirable
#action = "no action";
# These are default settings you may want to change
expire = 1d;
key_prefix = "rr";
message = "Message is reply to one we originated";
symbol = "REPLY";
# Module specific redis configuration
#servers = "localhost";
~~~
