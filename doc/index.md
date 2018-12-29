---
layout: doc
title: Rspamd Documentation
---

{::options parse_block_html="true" /}
# Rspamd Documentation Index

## Installation and Administration

Here are the main introduction documents that are recommended for reading if you are going to use Rspamd in your mail system.

There is also an external documentation about Rspamd from the system administration point of view: [an alternative introduction to rspamd configuration](http://www.0xf8.org/2018/05/an-alternative-introduction-to-rspamd-configuration-introduction/).

### [Quick start]({{ site.baseurl }}/doc/quickstart.html)

Learn how to install, setup and perform initial configuring of Rspamd.

### [MTA integration](integration.html)

Describes how to integrate Rspamd into your mail infrastructure.

### [Upgrading](migration.html)

The list of incompatible changes between versions of Rspamd.

### [Frequently asked questions](faq.html)

Common questions about Rspamd

## Quick links

### Blacklists and whitelists

Use [multimap module]({{ site.baseurl }}/doc/modules/multimap.html)

### User settings

Use [user settings]({{ site.baseurl }}/doc/configuration/settings.html)

### Rspamd configuration

Write your custom configuration in `local.d/module_name.conf` for plugins, in `local.d/worker-type.inc` for workers, `local.d/logging.inc` for logging, `local.d/options.inc` for custom options and in `etc/rspamd/rspamd.local.lua` for adding new rules and regular expressions.

Please also read the [frequently asked questions](faq.html) document for other commonly asked questions.

## Reference guide

This section contains documents about various configuration details.

### [Configuration structure](./configuration/index.html) 

Explains the basic principles of Rspamd configuration files:

  + **[Users settings description](./configuration/settings.html)** could be useful if you need to setup per-user configuration or want to process mail in different ways, for example, for inbound and outbound messages.
  + **[Top-level options]({{ site.baseurl }}/doc/configuration/options.html)** are used to set the global options for Rspamd, such as DNS resolver setup and so on
  + **[Logging setup]({{ site.baseurl }}/doc/configuration/logging.html)** is required if you need customized logging
  + **[Metrics, actions and symbols]({{ site.baseurl }}/doc/configuration/metrics.html)** are very important as they allow to set custom rules scores and thresholds for different actions
  + **[Composite symbols]({{ site.baseurl }}/doc/configuration/composites.html)** are useful to combine rules into meta-rules
  + **[Statistical module]({{ site.baseurl }}/doc/configuration/statistic.html)** describes the Bayes classifier and its backends
  + **[Selectors]({{ site.baseurl }}/doc/configuration/selectors.html)** are used in various modules to extract and process data (from the version 1.8)

### [Modules documentation](./modules/)

Gives the detailed description of each Rspamd module.

### [Workers documentation](./workers/) 

Contains information about different Rspamd worker processes: scanners, controller, fuzzy storage and so on.

### [Redis configuration]({{ site.baseurl }}/doc/configuration/redis.html)

Describes how to configure Redis cache for Rspamd.

## Developers documentation

This section contains details about Rspamd internals, documents about writing new rules for Rspamd and, in particular, Rspamd Lua API.

### [Writing Rspamd rules](./tutorials/writing_rules.html)

Step-by-step guide that describes how to write rules for Rspamd.

### [Lua API reference](./lua/)

Provides the extensive information about all Lua modules available in Rspamd.

### [Own fuzzy storage]({{ site.url }}{{ site.baseurl }}/doc/fuzzy_storage.html)

Provides information about how to make your own hashes storage and how to learn it efficiently.

### [Architecture information](./architecture/index.html)

Provides an overview of the Rspamd internal structure.

### [Protocol documentation](./architecture/protocol.html)

Describes Rspamd protocol which is used to communicate with external tools, such as Rmilter or `rspamc` client utility.

### [Contributing to web-site](./tutorials/site_contributing.html)

Describes general conventions and how to test web-site changes.

## Other topics

There are several tutorial like documents related to various topics of Rspamd usage.

* [Redis replication](./tutorials/redis_replication.html) is a step-by-step guide on establishing Bayesian statistics and fuzzy storage replication
* [Rspamadm]({{ site.baseurl }}/doc/rspamadm.html) - describes utilities contained in the `rspamadm` command
* [Stunnel setup](./tutorials/stunnel_setup.html) is a step-by-step guide to secure communications between Redis instances with [stunnel](https://www.stunnel.org)
* [Upstreams article]({{ site.baseurl }}/doc/configuration/upstream.html) depicts how Rspamd connects to external servers (e.g. Redis or DNS)
* [Getting feedback from users with IMAPSieve](./tutorials/feedback_from_users_with_IMAPSieve.html) - how to get a copy of the message moved by user from or into the `Junk` folder

## External resources

* [Own mail server based on Dovecot, Postfix, MySQL, Rspamd and Debian 9 Stretch](https://thomas-leister.de/en/mailserver-debian-stretch/) - a good example of all-in-one tutorial about how to setup your own mail server. However, please refrain from setting errors logging to `error` as adviced in this tutorial. The most appropriate levels are `info` (set by default) or `silent` if you want to reduce log verbosity without loosing the essential bits of information.
* [An alternative introduction to rspamd configuration](http://www.0xf8.org/2018/05/an-alternative-introduction-to-rspamd-configuration-introduction/) - a good guide with description of all symbols, plugins and scores. Contains lots of things that are not covered by the documentation on the site; pretty good structure as well.
* [A guide to self-hosting your email on FreeBSD using Postfix, Dovecot, Rspamd, and LDAP.](https://www.c0ffee.net/blog/mail-server-guide) - similar to the previous guide but uses a different technologies stack
* [Training Rspamd with Dovecot antispam plugin, part 1](https://kaworu.ch/blog/2014/03/25/dovecot-antispam-with-rspamd/)<sup>[1](#fn1)</sup> - this tutorial describes how to train Rspamd automatically using the `antispam` plugin of the `Dovecot` IMAP server
* [Training Rspamd with Dovecot antispam plugin, part 2](https://kaworu.ch/blog/2015/10/12/dovecot-antispam-with-rspamd-part2/)<sup>[1](#fn1)</sup> - continuation of the previous tutorial
* [OpenBSD Email Service, a free-email alternative relying on Rspamd](https://github.com/vedetta-com/caesonia) - configuration and guide for self-hosting

<a name="fn1">1.</a> antispam plugin is deprecated, use [IMAPSieve](https://wiki.dovecot.org/HowTo/AntispamWithSieve) instead
