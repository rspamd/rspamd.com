---
layout: doc
title: Reputation module
---

# Reputation plugin

This plugin is designed to monitor the reputation of various objects and adjust scores accordingly.

For instance, if you have a DKIM domain that is known to be used for spam, this module enables you to decrease the negative score of the DKIM_ALLOW symbol, or even add some score.

Conversely, if a domain has a high reputation, the DKIM_ALLOW score will have a more negative score (like auto-whitelisting) and increase the score for DKIM_REJECT accordingly (since the message looks like a phishing attempt).

Additionally, this module encompasses the functionality of the following modules:

* [ip_score](ip_score.html) - by means of `ip` component
* url_reputation - by means of `url` component (removed in Rspamd 2.0)

## Configuration and principles of work

Like many other modules, this module requires a set of rules to be defined. Each rule comprises the following components:

* Selector configuration - specifies the data to be extracted from a message and defines data processing logic
* Backend configuration - determines where reputational tokens should be stored and queried. For instance, Redis can be used for both storing and extracting, while DNS can only be used as a read-only storage
* Common configuration - defines generic rule parameters, such as a symbol, that are not related to either the backend or the selector

Below are a few examples of such configurations:

~~~hcl
# local.d/reputation.conf
rules {
  ip_reputation = {
    selector "ip" {
    }
    backend "redis" {
      servers = "localhost";
    }

    symbol = "IP_REPUTATION";
  }
  spf_reputation =  {
    selector "spf" {
    }
    backend "redis" {
      servers = "localhost";
    }

    symbol = "SPF_REPUTATION";
  }
  dkim_reputation =  {
    selector "dkim" {
    }
    backend "redis" {
      servers = "localhost";
    }

    symbol = "DKIM_REPUTATION"; # Also adjusts scores for DKIM_ALLOW, DKIM_REJECT
  }
  generic_reputation =  {
    selector "generic" {
      selector = "ip"; # see https://rspamd.com/doc/configuration/selectors.html
    }
    backend "redis" {
      servers = "localhost";
    }

    symbol = "GENERIC_REPUTATION";
  }
}
~~~

You also need to **define the scores** for symbols added by this module:

~~~hcl
# local.d/groups.conf
group "reputation" {
    symbols = {
        "IP_REPUTATION_HAM" {
            weight = 1.0;
        }
        "IP_REPUTATION_SPAM" {
            weight = 4.0;
        }

        "DKIM_REPUTATION" {
            weight = 1.0;
        }

        "SPF_REPUTATION_HAM" {
            weight = 1.0;
        }
        "SPF_REPUTATION_SPAM" {
            weight = 2.0;
        }

        "GENERIC_REPUTATION" {
            weight = 1.0;
        }
    }
}
~~~

The weight assigned to these symbols are merely examples and you should adjust them to fit your particular situation.

The image below illustrates the process of reputation token handling:

<center><img class="img-fluid" src="{{ site.baseurl }}/img/reputation1.png" width="50%"></center>

### Backends configuration and principles of work

Selectors provide what are known as tokens for backends. For instance, in the case of IP reputation, these tokens could be `asn`, `ipnet`, and `country`. Each token is mapped to a particular key in the backend. In the case of Redis backend, there is a concept of **buckets**, with each bucket containing a set of counters that indicate the number of messages with a specific action:

* number of spam messages
* number of ham messages
* number of probable spam (junk) messages

When filling these buckets, the score may also be taken into account. Additionally, each bucket has two other attributes:

* time window;
* score multiplier;

Each bucket uses discrete time windows that are specified. By default, two buckets are defined for Redis:

~~~hcl
buckets = [
  {
    time = 1h,
    name = '1h',
    mult = 1.5,
  },
  {
    time = 1d,
    name = '1d',
    mult = 1.0,
  }
];
~~~

Upon bucket lookup, you have the following attributes:

1. Number of messages of the each class (let's say `h`, `s`, `j`)
2. Bucket score (e.g. `1.5` for short term bucket)
3. Combination formula defined in the selector:

$$
f(buckets)=\sum_{i=1}^n {(spam_{i} * mult_{spam} + ham_{i} * mult_{ham} + junk_{i} * mult_{junk}) * bscore_{i}}
$$

<center><img class="img-fluid" src="{{ site.baseurl }}/img/reputation2.png" width="50%"></center>

## Selector types

There are couple of pre-defined selector types, specifically:

* SPF reputation - `spf` selector
* DKIM reputation - `dkim` selector
* IP, asn, country and network reputation - `ip` selector
* URLs reputation - `url` selector
* Generic reputation based on [selectors framework](../configuration/selectors.html) - `generic` selector

All selector types except for `generic` do not require explicit configuration. The `generic` selector, on the other hand, necessitates the setting of a selector attribute. For more advanced `selector` configurations, you may refer to the module's source code.
