---
layout: doc
title: Users settings description
---
# Rspamd user settings

## Introduction

Rspamd offers the flexibility to apply various settings for scanned messages. Each setting can define a specific set of custom metric weights, symbol scores, actions scores, and the ability to enable or disable certain checks. These settings can be loaded as dynamic maps, allowing them to be updated automatically whenever the corresponding file or URL has changed since the last update.

To load settings as a dynamic map, you can set the 'settings' to a map string as follows:

~~~ucl
settings = "http://host/url"
~~~

If you prefer not to use dynamic updates, you can define settings as an object using the following format:

~~~ucl
settings {
	setting1 = {
	...
	}
	setting2 = {
	...
	}
}
~~~

To define static settings, you can edit the `local.d/settings.conf` file (from Rspamd 1.8 onwards). On the other hand, if you want to use a dynamic map for settings, it's recommended to define it in the override file `rspamd.conf.override`:

~~~ucl
settings = "http://host/url"
~~~

Alternatively, the settings apply part (see later) could be passed to Rspamd by a client through a query parameter:

~~~
POST /scanv2?settings="{symbol1 = 10.0}" HTTP/1.0
~~~

or HTTP header

~~~
POST /scanv2 HTTP/1.0
Settings: {symbol1 = 10.0}
~~~

Settings can also be indexed by ID, enabling the selection of a specific setting without the need to check its conditions. This feature can be used to split inbound and outbound mail flows by specifying different rulesets from the MTA side. Another use case for the settings ID option is to create dedicated lightweight checks for certain conditions, such as DKIM checks.

**Important note**: Using settings ID is optimal in terms of performance.

Let's assume we have the following settings in the configuration with an ID of `dkim`:

~~~ucl
# local.d/settings.conf
dkim {
	id = "dkim";
	apply {
		groups_enabled = ["dkim"];
	}
}
~~~

Afterwards, if we send a request with this settings ID using the HTTP protocol:

~~~
POST /scanv2 HTTP/1.0
Settings-ID: dkim
~~~

Then Rspamd will only check the DKIM rules and skip the other rules. Alternatively, you could test this setup using the `rspamc` command:

~~~
rspamc --header="settings-id=dkim" message.eml
~~~

## Settings structure

The settings file should contain a single section called "settings":

~~~ucl
# local.d/settings.conf
some_users {
	id = "some_users";
	priority = high;
	from = "@example.com";
	rcpt = "admin";
	rcpt = "/user.*/";
	ip = "172.16.0.0/16";
	user = "@example.net";
	request_header = {
		"MTA-Tag" = "\.example\.net$";
	}
	apply {
		symbol1 = 10.0;
		symbol2 = 0.0;
		actions {
			reject = 100.0;
			greylist = null; # Disable greylisting (from 1.8.1)
			"add header" = 5.0; # Please note the space, NOT an underscore
		}
	}
	# Always add these symbols when settings rule has matched
	symbols [
		"symbol2", "symbol4"
	]
}
whitelist {
	priority = low;
	rcpt = "postmaster@example.com";
	want_spam = yes;
}
# Disable some checks for authenticated users
authenticated {
	priority = high;
	authenticated = yes;
	apply {
		groups_disabled = ["rbl", "spf"];
	}
}
~~~

So each setting has the following attributes:

- `name` - section name that identifies this specific setting (e.g. `some_users`)
- `priority` - `high` (3), `medium` (2), `low` (1) or any positive integer value (default priority is `low`). Rules with greater priorities are matched first. Starting from version 1.4, Rspamd checks rules with equal priorities in **alphabetical** order. Once a rule matches, only that rule is applied, and the rest are ignored.
- `match list` - list of rules which this rule matches:
	+ `from` - match SMTP sender
	+ `from_mime` - match MIME sender
	+ `rcpt` - match SMTP recipient
	+ `rcpt_mime` - match MIME recipient
	+ `ip` - match source IP address
	+ `hostname` - match the source hostname (regexp supported)
	+ `user` - matches authenticated user ID of message sender if any
	+ `authenticated` - matches any authenticated user
	+ `local` - matches any local IP
	+ `request_header` - collection of request header names and regexes to match them against (condition is satisfied if any match)
	+ `header` - collection of MIME message header names and regexes to match them against (condition is satisfied if any match), available since Rspamd 1.7
	+ `selector` - apply the specific selector to check if we need to apply these settings. If selector returns non-nil, then the settings are applied (selector's value is ignored so far). Available since Rspamd 1.8.
- `apply` - list of applied rules
	+ `symbol` - modify weight of a symbol
	+ `actions` - defines actions
	+ `symbols_enabled` - array of symbols that should be checked (all other rules are disabled)
	+ `groups_enabled` - array of rules groups that should be checked (all other rules are disabled)
	+ `symbols_disabled` - array of disabled checks by symbol name (all other rules are enabled)
	+ `groups_disabled` - array of disabled checks by group name (all other rules are enabled)
	+ `subject` - set subject based on the new pattern: `%s` is replaced with the existing subject, `%d` is replaced with the message's spam score (e.g. `subject = "SPAM: %s (%d)"`)
- `symbols` - add symbols from the list if a rule has matched
- `inverse` - inverse match (e.g. it will NOT match when all elements are matched and vice-versa)

If `symbols_enabled` or `groups_enabled` are found in `apply` element, then Rspamd disables all checks with the exception of the enabled ones. When `enabled` and `disabled` options are both presented, then the precedence of operations is the following:

1. Disable all symbols
2. Enable symbols from `symbols_enabled` and `groups_enabled`
3. Disable symbols from `symbols_disabled` and `groups_disabled`

Certain rules, like `metadata exporter`, `history redis`, or `clickhouse`, are labeled as `explicit_disable`. This means that even if you enable specific symbols in `symbols_enabled`, these rules will still be executed. This behavior is intentional as enabling specific checks should not interfere with data exporting or history logging.

**Important notice**: This is **NOT** applicable to `want_spam` option. This option disable **ALL** Rspamd rules, even history or data exporting. Actually, it is a full bypass of all Rspamd processing.

### Settings match

The match section performs `AND` operation on different matches: for example, if you have `from` and `rcpt` in the same rule, then the rule matches only when `from` `AND` `rcpt` match. For similar matches, the `OR` rule applies: if you have multiple `rcpt` matches, then *any* of these will trigger the rule. If a rule is triggered then no more rules are matched.

By default, regular expressions are case-sensitive. This can be changed with the `i` flag. 
Regexp rules can be slow and should not be used extensively.

In order to make matching case-insensitive, string comparisons convert input strings to lowercase. Thus, strings in the match lists should always be in lowercase.

The picture below describes the architecture of settings matching.

<img class="img-responsive" width="50%" src="{{ site.baseurl }}/img/settings.png">

### Redis settings

Storing settings in Redis offers a highly flexible way to apply settings and eliminates the need to reload a map.

To utilize settings in Redis, we create one or more handlers in Lua, each of which may return a key. If a key is returned and exists in Redis, its value is used as the settings. The value of the key should be formatted similarly to the contents of the `apply` block or settings posted in headers.

Let's consider a scenario where we want to base our settings on the domain of the first SMTP recipient.

We can set our keys as follows:
~~~
127.0.0.1:6379> SET "setting:example.com" "{symbol1 = 5000;}"
OK
~~~

Where "setting:" is a prefix we have chosen for our settings and "example.com" is the recipient domain we want to apply settings to and the value of the key contains our desired settings.

We would then define configuration as follows in `/etc/rspamd/rspamd.conf.override`:

~~~ucl
# Redis settings are configured in a "settings_redis" block
settings_redis {
  # Here we will define our Lua functions
  handlers = {
    # Everything in here is a Lua function with an arbitrary name
my_check_rcpt_domain = <<EOD
return function(task)
  local rcpt = task:get_recipients('smtp')
  -- Return nothing if we can't find domain of first SMTP recipient
  if not (rcpt and rcpt[1] and rcpt[1]['domain']) then return end
  -- Return "setting:" concatenated with the domain
  local key = 'setting:' .. rcpt[1]['domain']
  return key
  -- From Rspamd 1.6.3 this function can return a list of keys to check.
  -- Use this if you need to check for settings according to priority:
  return {key, 'setting:global'}
end
EOD;
  }
}
~~~

Redis servers are configured as per usual - see [here]({{ site.baseurl }}/doc/configuration/redis.html) for details.
