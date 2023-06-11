---
layout: doc
title: Rspamd Metrics
---
# Rspamd actions and scores

## Introduction

Unlike SpamAssassin, Rspamd provides **suggested** actions for specific scanned messages. These actions can be considered as recommendations for the MTA on how to handle the message. Here is a list of the possible choices sent by Rspamd:

- `discard`: drop an email but return success for sender (should be used merely in special cases)
- `reject`: ultimately reject message
- `rewrite subject`: rewrite subject to indicate spam
- `add header`: add specific header to indicate spam
- `no action`: allow message
- `soft reject`: temporarily delay message (this is used, for instance, to greylist or ratelimit messages)

From version 1.9, there are also some more actions:

- `quarantine`: push a message to quarantine (must be supported by MTA)
- `discard`: silently discard a message

Starting from version 1.9, you have the flexibility to define custom actions with their own threshold in Rspamd. You can also utilize these custom actions in the `force_actions` module. This allows you to tailor the actions according to your specific requirements:

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

Rspamd rules are typically organized into groups, with each symbol capable of belonging to multiple groups. For instance, the `DKIM_ALLOW` symbol is part of both the `dkim` group and the `policies` metagroup. You have the flexibility to group or not group your own rules. If you wish to adjust the scores of your symbols, you can do so by modifying the `local.d/groups.conf` file as shown below:

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

To modify symbols for existing groups, it is advisable to utilize dedicated files in either the `local.d` or `override.d` directory. For instance, you can create a file named `local.d/rbl_group.conf` to incorporate your custom RBLs. To obtain a comprehensive list of these files, you can refer to the `groups.conf` file located in the primary Rspamd configuration directory (e.g., `/etc/rspamd/groups.conf`).

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

The default value for this setting is `1.0`, indicating no weight increase is applied. By raising this value, the score of messages with multiple matching `spam` rules is amplified. It's important to note that negative score values do not affect this value.

* `subject` - string value that replaces the message's subject if the `rewrite subject` action is applied. Original subject can be included with `%s`. Message score can be filled using `%d` extension.
* `unknown_weight` - weight for unknown rules. If this parameter is specified, all rules can add symbols to this metric. If such a rule is not specified by this metric then its weight is equal to this option's value. Please note, that adding this option means that all rules will be checked by Rspamd, on the contrary, if no `unknown_weight` metric is specified then rules that are not registered anywhere are silently ignored by Rspamd.
