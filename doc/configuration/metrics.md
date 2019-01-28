---
layout: doc
title: Rspamd Metrics
---
# Rspamd actions and scores

## Introduction

Unlike SpamAssassin, Rspamd **suggests** the desired action for a specific message scanned. This could be treated as a recommendation to MTA what it should do with this message. Here is a list of possible choices that are sent by Rspamd:

- `discard`: drop an email but return success for sender (should be used merely in special cases)
- `reject`: ultimately reject message
- `rewrite subject`: rewrite subject to indicate spam
- `add header`: add specific header to indicate spam
- `no action`: allow message
- `soft reject`: temporarily delay message (this is used, for instance, to greylist or ratelimit messages)

From version 1.9, there are also some more actions:

- `quarantine`: push a message to quarantine (must be supported by MTA)
- `discard`: silently discard a message

From version 1.9, you can also define any action you'd like with it's own threshold or use that in `force_actions` module:

```ucl
actions {
  # Generic threshold
  my_action = {
    score = 9.0;
  },
  # Force action only
  phishing = {
    flags = ["no_threshold"],
  }
}
```

Only one action could be applied to a message. Hence, it is generally useless to define two actions with the same threshold.


## Configuring scores and actions

### Symbols

Symbols are defined by an object with the following properties:

* `weight` - the symbol weight as floating point number (negative or positive); by default the weight is `1.0`
* `group` - a group of symbols, for example `DNSBL symbols` (as shown in WebUI)
* `description` - optional symbolic description for WebUI
* `one_shot` - normally, Rspamd inserts a symbol as many times as the corresponding rule matches for the specific message; however, if `one_shot` is `true` then only the **maximum** weight is added to the metric. `grow_factor` is correspondingly not modified by a repeated triggering of `one_shot` rules.

A symbol definition can look like this:

~~~ucl
symbol "RWL_SPAMHAUS_WL_IND" {
    weight = -0.7;
    description = "Sender listed at Spamhaus whitelist";
}
~~~

Rspamd rules are usually groupped into groups. Each symbol can belong to multiple groups. For example, `DKIM_ALLOW` symbol belongs to `dkim` group and to `policies` metagroup. You can group or not group your own rules. To redefine scores of your symbols, you can use `local.d/groups.conf` as following:

~~~ucl
# local.d/groups.conf

symbols {
  "SOME_SYMBOL" {
    weight = 1.0; # Define your weight
  }
}
~~~

Or, for grouped symbols: 

~~~ucl
group "mygroup" {
  max_score = 10.0;
  
  symbols {
    "MY_SYMBOL" {
      weight = 1.0; # Define your weight
    }
  }
}
~~~

To redefine symbols for the existing groups, it is recommended to use a specific `local.d` or `override.d` file, for example, `local.d/rbl_group.conf` to add your custom RBLs. To get the full list of such files, you can take a look over the `groups.conf` file in the main Rspamd configuration directory (e.g. `/etc/rspamd/groups.conf`).

### Actions

Actions thresholds and configuration are defined in `local.d/actions.conf`:

```ucl
# local.d/actions.conf
# Generic threshold
my_action = {
	score = 9.0;
},
# Force action only
phishing = {
	flags = ["no_threshold"],
},
greylist = {
 score = 2.0,
 flags = ["no_action"],
}
```

It is also possible to define some generic attributes for actions applications:

* `grow_factor` - the multiplier applied for the subsequent symbols inserting by the following rule:

$$
score = score + grow\_factor * symbol\_weight
$$

$$
	grow\_factor = grow\_factor * grow\_factor
$$

By default this value is `1.0` meaning that no weight growing is defined. By increasing this value you increase the effective score of messages with multiple `spam` rules matched. This value is not affected by negative score values.

* `subject` - string value that replaces the message's subject if the `rewrite subject` action is applied. Original subject can be included with `%s`.
* `unknown_weight` - weight for unknown rules. If this parameter is specified, all rules can add symbols to this metric. If such a rule is not specified by this metric then its weight is equal to this option's value. Please note, that adding this option means that all rules will be checked by Rspamd, on the contrary, if no `unknown_weight` metric is specified then rules that are not registered anywhere are silently ignored by Rspamd.
