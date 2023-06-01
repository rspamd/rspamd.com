---
layout: doc
title: External Relay module
---

# External Relay module

This plugin is designed for users who need to conduct scans after the MX has processed a message, such as those who receive mail over POP3 and forward it to a local MTA. Most users can disregard it.

For users with such setups, it is important to disable the reject action to prevent generating backscatter. Refer to [the FAQ]({{ site.baseurl }}/doc/faq.html#how-can-i-disable-some-rspamd-action) for instructions.

If possible, it is better to run Rspamd on the MX.

## Strategies

This plugin seeks to identify the real point of hand-off for a message in its `Received` headers and set the sending IP and hostname correctly, as well as an assumed `HELO` value. This correction occurs before any other processing, ensuring that other modules (such as [rbl]({{ site.baseurl }}/modules/rbl.html), [spf]({{ site.baseurl }}/modules/spf.html) etc) receive the updated values.

Different strategies for identifying mail to tamper with and the point of hand-off are available. While they can be configured in parallel, it is recommended that you select the most suitable strategy for your setup and configure it accordingly. If multiple strategies are configured they are not mutually exclusive & you may wish to adjust `priority` of the rules.

If the strategies are too broad to be used in your setup you might limit them using `rspamd_config:add_condition()`, for example:
~~~lua
# /etc/rspamd/rspamd.local.lua
-- add some condition for the symbol called EXTERNAL_RELAY_COUNT
rspamd_config:add_condition('EXTERNAL_RELAY_COUNT', function(task)
  -- only apply this rule if authenticated user is postmaster@example.net
  return task:get_user() == 'postmaster@example.net'
end)
~~~

The available strategies are as follows:

 * `authenticated` : use the first unauthenticated hop in a message
 * `count` : identify Received header by set position
 * `hostname_map` : use the first sender with an unrecognised hostname
 * `local` : use the first non-local hop in a message

## Rule syntax

Because this module is disabled by default it should be explicitly enabled.

~~~ucl
## /etc/rspamd/local.d/external_relay.conf

# enable the module
enabled = true;

# rules are defined inside rules {} block
rules {
  # this is the name of the symbol we will register
  EXTERNAL_RELAY_AUTHENTICATED {
    # a recognised strategy MUST be defined
    strategy = "hostname_map";
    # there may be additional non/optional settings available particular to the strategy
    hostname_map = "/var/lib/rspamd/external_relay_hostname.map";
  }
}
~~~ 

The following settings are valid for all rules:

 * `priority` (optional) : prefilter priority, default 20 (higher value implies higher priority).
 * `symbol` (optional) : Name of symbol to insert, defaults to label of enclosing block
 * `strategy` (required) : The name of the strategy to apply

The following strategy-specific settings are defined:

### authenticated

 * `user_map` (optional): A [map]({{ site.baseurl }}/doc/faq.html#what-are-maps) containing a list of usernames. The rule applies only if the local sender uses a username listed in the configuration.

### count

 * `count` (required): the position of the `Received` header, from top to bottom.

### hostname_map

 * `hostname_map` (required): A [map]({{ site.baseurl }}/doc/faq.html#what-are-maps) of hostnames which we expect to see from the sender and in `Received` headers.
