---
layout: doc
title: Rspamd Tutorials
---
# Rspamd tutorials

In this section you can find the current step-by-step tutorials coverign various topics about rspamd.

* [Migrating from SA](migrate_sa.html) - the guide for those who wants to migrate an existing SpamAssassin system to Rspamd
* [Writing rspamd rules](writing_rules.html) - how to extend rspamd by writing your own rules
* [Creating your fuzzy storage]({{ site.url }}{{ site.baseurl }}/doc/fuzzy_storage.html) - learn how to make your own fuzzy storage
* [Contributing to rspamd.com web-site](site_contributing.html) describes general conventions and how to test web-site changes
* [Getting feedback from users with IMAPSieve](feedback_from_users_with_IMAPSieve.html) - how to get a copy of the message moved by user from or into the `Junk` folder
* [Training Rspamd with Dovecot antispam plugin, part 1](https://kaworu.ch/blog/2014/03/25/dovecot-antispam-with-rspamd/)<sup>[1](#fn1)</sup> - this tutorial describes how to train rspamd automatically using the `antispam` pluging of the `dovecot` IMAP server
* [Training Rspamd with Dovecot antispam plugin, part 2](https://kaworu.ch/blog/2015/10/12/dovecot-antispam-with-rspamd-part2/)<sup>[1](#fn1)</sup> - continuation of the previous tutorial

<a name="fn1">1.</a> antispam plugin is deprecated, use [IMAPSieve](https://wiki.dovecot.org/HowTo/AntispamWithSieve) instead
