---
layout: doc
title: About Rspamd
---

## Introduction

**Rspamd** is an advanced spam filtering system that allows evaluation of messages by a number of
rules including regular expressions, statistical analysis and custom services
such as URL black lists. Each message is analysed by Rspamd and given a `spam score`.

According to this spam score and the user's settings, Rspamd recommends an action for
the MTA to apply to the message, for example, to pass, reject or add a header.
Rspamd is designed to process hundreds of messages per second simultaneously, and provides a number of
useful features.

## Getting Started

A good starting point to study how to install and configure Rspamd is [the quick start guide]({{ site.url }}{{ site.baseurl }}/doc/quickstart.html).

Rspamd is [packaged]({{ site.url }}{{ site.baseurl }}/downloads.html) for the major Linux distributions, and is also available via [FreeBSD ports](https://freshports.org/mail/rspamd){:target="&#95;blank"}, NetBSD [pkgsrc](https://pkgsrc.org){:target="&#95;blank"} and [OpenBSD ports](https://openports.pl/path/mail/rspamd){:target="&#95;blank"}.

You can also watch some [videos about Rspamd]({{ site.url }}{{ site.baseurl }}/media.html).

## Spam filtering features

Rspamd is shipped with various spam filtering modules and features enabled just out of the box.
The full list of built-in modules could be found in the [modules documentation]({{ site.url }}{{ site.baseurl }}/doc/modules/).

If that is not enough, Rspamd provides an extensive [Lua API]({{ site.url }}{{ site.baseurl }}/doc/lua/) to write your own rules and plugins: <{{ site.url }}{{ site.baseurl }}/doc/tutorials/writing_rules.html>


## License

This project is licensed under the [Apache 2.0 License](https://tldrlegal.com/license/apache-license-2.0-(apache-2.0)){:target="&#95;blank"}