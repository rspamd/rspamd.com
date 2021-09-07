---
layout: doc
title: External Relay module
---

# External Relay module

This plugin is intended for use by people who need to perform scanning after the MX has already handled a message (e.g. setups which receive mail over POP3 and forward them to a local MTA); most users can ignore it.

Users of such setups should ensure [reject action is disabled]({{ site.baseurl }}/doc/faq.html#how-can-i-disable-some-rspamd-action) to avoid generating backscatter.

If possible, it is better to run Rspamd on the MX.

## Strategies

This plugin attempts to find the real point of hand-off of a message in its `Received` headers & set the sending IP & hostname appropriately (as well as an assumed value for `HELO`) - before other processing, such that other modules (such as [rbl]({{ site.baseurl }}/modules/rbl.html), [spf]({{ site.baseurl }}/modules/spf.html)) etc would see the corrected values.

Different strategies for identifying mail to tamper with and the point of hand-off are available. They can be configured in parallel but the general expectation is that you'd pick whichever is most appropriate to your setup and configure that. If multiple strategies are configured they are not mutually exclusive & you may wish to adjust `priority` of the rules.

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

 * `user_map` (optional): A [map]({{ site.baseurl }}/doc/faq.html#what-are-maps) containing a list of usernames. If set, the local sender is required to use a listed username for the rule to be applied.

### count

 * `count` (required): the position of the `Received` header, from bottom-to-top

### hostname_map

 * `hostname_map` (required): A [map]({{ site.baseurl }}/doc/faq.html#what-are-maps) of hostnames which we expect to see from the sender and in `Received` headers.
