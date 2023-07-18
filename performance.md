---
layout: doc
title: Rspamd performance
---

## Mail filtering nowadays

Rspamd has been started to handle mail flows that has grown over the last decade by more than ten times. From the very beginning of the project, Rspamd was oriented on highly loaded mail systems with development focus on performance and scan speed. Rspamd is written in plain C language and it uses a number of techniques to run fast especially on the modern hardware. On the other hand, it is possible to run Rspamd even on an embedded device with a very constrained environment.

You can also check the recent [performance analyse article](https://rspamd.com/misc/2019/05/16/rspamd-performance.html) to have a better impression about how fast Rspamd could be.

Rspamd can be treated as a faster replacement for [SpamAssassin](https://spamassassin.apache.org) mail filter with the ability to scan **ten times** more messages using the **same** rules (by means of [SpamAssassin plugin]({{ site.baseurl }}/doc/modules/spamassassin.html)). In the next graph, you can see how switch to Rspamd from <abbr title="SpamAssassin">SA</abbr> helped to reduce CPU load on scanner machines:

<img class="img-responsive" src="{{ site.baseurl }}/img/graph2.png" width="50%">

For faster email processing, Rspamd uses a set of global and local optimization techniques.

## Global optimizations

Global optimizations are used to speed up the overall messages processing improving all filters performance and arranging checks in an optimal order.

* **Events driven architecture** allows Rspamd to execute network and other slow request simultaneously in the background, allowing to process other messages while waiting for replies:

<img class="img-responsive" src="{{ site.baseurl }}/img/rspamd-events.png" width="50%">

* **Rules reordering** is used to reduce messages processing time. Rspamd prefers to check for rules with higher weight, lower execution time and higher hit rate first. Moreover, Rspamd stops processing when a message reaches spam threshold as further checks are likely meaningless.

## Local optimizations

Rspamd uses various methods to speed up each individual message processing stage. This is achieved by applying local optimizations techniques:

* **<abbr title="Abstract Syntax Tree">AST</abbr> optimizations** are used to exclude unnecessary checks from rules. You can watch the following [slides](https://www.slideshare.net/VsevolodStakhov/astrspamd) to get more details about this method.

* Unlike SA, Rspamd uses **specific state machines** to parse email components: mime structure, HTML parts, URLs, images, received headers and so on and so forth. This approach allows to skip unnecessary details and extract information from emails quicker than by using a large set of regular expressions for these purposes.

* **[Hyperscan](https://github.com/intel/hyperscan) engine** is used in Rspamd to quickly process large regular expressions set. Unlike traditional regexps engines, Hyperscan allows to process multiple expressions at the same time. There are many details about hyperscan that are covered in the following [slides](https://www.slideshare.net/VsevolodStakhov/rspamdhyperscan).

* **Assembly snippets** allow to optimize specific algorithms for targeted architectures. Rspamd uses assembly for some frequently used cryptography and hashing algorithms selecting the proper version of code in runtime, relying on CPU instructions set support tests.
