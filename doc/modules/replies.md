---
layout: doc
title: Replies module
---

# Replies module

This module gathers the `message-id` header of emails that authenticated users have sent and saves the corresponding hashes to Redis. These hashes expire after a predetermined length of time, which can be set to a maximum of 24 hours by default. Additionally, the module creates hashes of the `in-reply-to` headers of all received messages and checks them for matches, i.e., messages that were sent in response to messages that our system initiated. The module then generates a symbol that can be used to adjust the scoring or force an action, such as accepting the message with no action taken, depending on the configuration.


## Configuration

Settings for the module are described below (default values are indicated in brackets).

- `action`: apply the given action to messages identified as replies (should typically be set to "no action" to accept)
- `expire`: time, in seconds, after which to expire records (default is one day).
- `key_prefix`: string prefixed to keys in Redis (default `rr`)
- `symbol`: symbol yielded on messages identified as replies.

Additionally, you will need to set up Redis servers to store data, such as `servers` or `read_servers` and `write_servers`. You can specify all standard Redis arguments, including password, timeout, database, and so on.

## Example

Configuration should be added to `/etc/rspamd/local.d/replies.conf`:

~~~hcl
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
