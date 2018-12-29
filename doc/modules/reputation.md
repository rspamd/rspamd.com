---
layout: doc
title: Reputation module
---

# Reputation plugin

This plugin is intended to track reputation of different objects and perform adjustments of scores depending on that. 

For example, you have a DKIM domain that is proven to be used for spam. Then, this module will let you to reduce negative score of the DKIM_ALLOW symbol (or even add some score).

Or, vice versa, if a domain have high reputation, then DKIM_ALLOW score would have more negative score (like auto whitelisting) and increase score for DKIM_REJECT score accordingly (as a message looks like a phishing).

This module also covers functionality of the following modules:

* [ip_score](ip_score.html) - by means of `ip` component
* [url_reputation](url_reputation.html) - by means of `url` component

## Configuration and principles of work

This module like many others requires to define a set of rules. In turn, each rule consists of the following parts:

* Selector configuration - defines what data needs to be extracted from a message and defines data processing logic
* Backend configuration - defines where to store and query reputational tokens, for example, Redis could be used for both storing and extracting whilst DNS can be used as a read-only storage
* Common configuration - defines, for example, a symbol or other generic rule parameters not related neither to backend nor to selector

Here are some examples of the configuration:

~~~ucl
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

The picture below demonstrates how reputation tokens are being processed:

<center><img class="img-responsive" src="{{ site.baseurl }}/img/reputation1.png" width="50%"></center>

### Backends configuration and principles of work

Selectors provide so called tokens for backends. For example, in case of IP reputation, that could be `asn`, `ipnet` and `country`. Each token is mapped to some key in the backend. If we talk about Redis backend, then there is a concept of **buckets**. Each bucket has a set of counters that represents count of messages with some specific action:

* number of spam messages
* number of ham messages
* number of probable spam (junk) messages

Score might also be considered when filling these buckets. Each bucket has also two more attributes:

* time window;
* score multiplier;

Each buckets uses discrete windows of the specified time. By default, there are two buckets defined (for Redis):

~~~ucl
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

<center><img class="img-responsive" src="{{ site.baseurl }}/img/reputation2.png" width="50%"></center>

## Selector types

There are couple of pre-defined selector types, specifically:

* SPF reputation - `spf` selector
* DKIM reputation - `dkim` selector
* IP, asn, country and network reputation - `ip` selector
* URLs reputation - `url` selector
* Generic reputation based on [selectors framework](../configuration/selectors.html) - `generic` selector

All selector types but `generic` requires no explicit configuration. `Generic` selector requires a `selector` attribute to be set. For the advanced configuration of the selectors, you can check the source code of the module.
