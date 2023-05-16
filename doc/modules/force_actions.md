---
layout: doc
title: Force Actions module
---

# Force Actions module

The purpose of this module is to force an action to be applied if particular symbols are found/not found and optionally return a specified SMTP message. It is available in version 1.5.0 and greater.

## Configuration

Configuration should be added to `/etc/rspamd/local.d/force_actions.conf`

The following elements are valid in the rules of this module:

 - `action`: action to force if the rule matches
 - `expression`: a symbol or combination of symbols to match on
 - `honor_action`: actions in this list should not be overridden
 - `message`: SMTP message to be used by MTA
 - `require_action`: override action only if metric action in this list
 - `subject`: subject to set in metric for `rewrite subject` action

Only one of `honor_action` or `require_action` should be set on a given rule.

[Composite expressions]({{ site.url }}{{ site.baseurl }}/doc/configuration/composites.html#composite-expressions) can be used for `expression`.

[Selectors](../configuration/selectors.html) can be used to generate dynamic `message`. The selector expression must be enclosed in `${}`.

### Execution Order

If neither `require_action` nor `honor` is specified, the respective force action symbol is registered as a normal filter with a dependency on all symbols referenced in `expression`.
If at least one of `require_action` or `honor` is specified, the respective force action symbol is registered as a post filter.
For example, this is important if you want to revert an action that is decided upon the total score, as the action is only updated once all normal filters are completed.

### Examples

~~~ucl
# Rules are defined in the rules {} block
rules {

  # For each condition we want to force an action on we define a rule

  # Rule is given a descriptive name
  MY_WHITELIST {
    # This is the action we want to force
    action = "no action";
    # If the following combination of symbols is present:
    expression = "IS_IN_WHITELIST & !CLAM_VIRUS & !FPROT_VIRUS";
  }

  WHITELIST_EXCEPTION {
    action = "reject";
    expression = "IS_IN_WHITELIST & (CLAM_VIRUS | FPROT_VIRUS)";
    # message setting sets SMTP message returned by mailer
    message = "Rejected due to suspicion of virus";
  }

  REJECT_MIME_BAD { 
    action = "reject";
    expression = "MIME_BAD";
    # message can contain selector expressions enclosed in ${}
    message = "(support-id: ${queueid}) Your mail was rejected because it contains BANNED ATTACHMENTS. Please check https://www.example.com/${languages.first}/allowed-attachments.html for further details!"
  } 

  DCC_BULK {
    action = "rewrite subject";
    # Here expression is just one symbol
    expression = "DCC_BULK";
    # subject setting sets metric subject for rewrite subject action
    subject = "[BULK] %s";
    # honor_action setting define actions we don't want to override
    honor_action = ["reject", "soft reject", "add header"];
  }

  BAYES_SPAM_UPGRADE {
    action = "add header";
    expression = "BAYES_SPAM";
    # require_action setting defines actions that will be overridden
    require_action = ["no action", "greylist"];
  }

}
~~~
