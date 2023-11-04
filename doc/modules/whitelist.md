---
layout: doc
title: Whitelist module
---

# Whitelist module

Whitelist module is intended to decrease or increase scores for some messages that are known to
be from the trusted sources **based on DKIM/SPF/DMARC policies** (for generic lists please use [multimap module](multimap.html)). 

This module exists because the design flaws in the `SMTP` protocol make it relatively simple to forge a sender. Consequently, rspamd endeavors to verify the sender's authenticity by considering the following supplementary policies:

- `DKIM`: a message has a valid DKIM signature for this domain (similar to DMARC alignment but for DKIM only)
- `SPF`: a message matches SPF record for the domain
- `DMARC`: a message satisfies domain's DMARC policy (implies *aligned* SPF **or** DKIM according to the DMARC standard)

## Whitelist setup

Configuring the Whitelist is a simple and straightforward process. Within the `rules` section, you can define a collection of rules. Each rule **must** include the `domains` attribute, which can be defined as either a string representing a map of domains or an array directly listing the domains.

### Whitelist constraints

The following constraints are allowed:

- `valid_spf`: require a valid SPF policy
- `valid_dkim`: require DKIM validation
- `valid_dmarc`: require a valid DMARC policy

### Whitelist rules modes

Each whitelist rule can work in 3 modes:

- `whitelist` (default): add symbol when a domain has been found and one of constraints defined is satisfied (e.g. `valid_dmarc`)
- `blacklist`: add symbol when a domain has been found and one of constraints defined is *NOT* satisfied (e.g. `valid_dmarc`)
- `strict`: add symbol with negative (ham) score when a domain has been found and one of constraints defined is satisfied (e.g. `valid_dmarc`) and add symbol with **POSITIVE** (spam) score when some of constraints defined has failed

If no constraints are defined, both the `strict` and `whitelist` rules will apply to all emails from the specified domains. For `blacklist` rules, a positive score is typically assigned to the result.

These options are combined using the `AND` operator for `whitelist` rules and the `OR` operator for `blacklist` and `strict` rules. Therefore, if both `valid_dkim = true` and `valid_spf = true` are specified, both DKIM and SPF validation are required to whitelist domains from the list. Conversely, for blacklist and strict rules, any violation will result in a positive score symbol being assigned.

### Whitelist values

In a map, each whitelist entry can have a value override, allowing you to modify the default rule policy and even adjust the score multiplier. This enables you to create a whitelist for DMARC while specifying certain entries to adhere to a `strict` policy, which adds a spam symbol in the event of a DMARC policy failure. To achieve this, you can utilize the following values in your map:


```
example.com # normal whitelist entry: whitelisting on hit, nothing on no hit
bank.com both:1.0 # strict whitelist entry: spam symbol on policy failure and ham symbol on policy success
foo.com both:2.0 # same as previous but with 2.0 multiplier for score
bar.com bl:1.0 # add spam symbol on failure but do not enable ham symbol on success
baz.com wl:2.0 # vice-versa - return to the normal behaviour but with 2.0 multiplier for policy success
```

You can also check maps shipped with Rspamd in the following repo: https://github.com/rspamd/maps/
Reasonable pull requests are very welcome.

### Optional settings

You can also set the default metric settings using the ordinary attributes, such as:

- `score`: default score
- `group`: default group (`whitelist` group is used if not specified explicitly)
- `one_shot`: default one shot mode
- `description`: default description

In lists, you also have the option to include an optional `multiplier` argument, which specifies an additional multiplier for the score assigned by this module. For instance, if you want to assign a score twice as large for `github.com`, you can define it as follows:

    ["github.com", 2.0]

or if using map:

    github.com 2.0
    
### Note with regard to DKIM whitelist

The `valid_dkim = true` check goes beyond verifying the triggering of just `R_DKIM_ALLOW`. It also ensures that the DKIM domain being validated matches the domain in the FROM envelope. Therefore, if a message is sent by a sender with the domain `x.com` but has been DKIM signed by `mailchimp.app`, the `valid_dkim` flag will not be set to true, and the whitelist rule will not be triggered

## Configuration example

~~~hcl
whitelist {
    rules {
        WHITELIST_SPF = {
            valid_spf = true;
            domains = [
                "github.com",
            ];
            score = -1.0;
        }

        WHITELIST_DKIM = {
            valid_dkim = true;
            domains = [
                "github.com",
            ];
            score = -2.0;
        }

        WHITELIST_SPF_DKIM = {
            valid_spf = true;
            valid_dkim = true;
            domains = [
                ["github.com", 2.0],
            ];
            score = -3.0;
        }

        STRICT_SPF_DKIM = {
            valid_spf = true;
            valid_dkim = true;
            strict = true;
            domains = [
                ["paypal.com", 2.0],
            ];
            score = -3.0; # For strict rules negative score should be defined
        }

        BLACKLIST_DKIM = {
            valid_spf = true;
            valid_dkim = true;
            blacklist = true;
            domains = "/some/file/blacklist_dkim.map";
            score = 3.0; # Note positive score here
        }

        WHITELIST_DMARC_DKIM = {
            valid_dkim = true;
            valid_dmarc = true;
            domains = [
                "github.com",
            ];
            score = -7.0;
        }
    }
}
~~~

Rspamd also provides a collection of pre-defined whitelisted domains that can be beneficial for getting started.
