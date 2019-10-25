---
layout: doc
title: Spamassassin module
---
# Spamassassin rules module

This module is designed to read and adopt spamassassin rules for rspamd.

## Overview

Spamassassin provides an excellent set of rules that are useful in some relatively
low volume environments. The goal of this plugin is to re-use the existing set
of spamassassin rules natively within rspamd. The configuration of this plugin
is very simple: just glue all your SA rules into a single file and feed it to
spamassassin module:

~~~ucl
spamassassin {
	ruleset = "/path/to/file";
	# Limit search size to 100 kilobytes for all regular expressions
	match_limit = 100k;
	# Those regexp atoms will not be passed through hyperscan:
	pcre_only = ["RULE1", "__RULE2"];
}
~~~

Rspamd can read multiple files containing SA rules, and it supports
glob patterns. All rules are parsed to the same structure, so individual
rules might be overwritten if they occurs in multiple times.

## Limitations and principles of work

Rspamd tries to optimize SA rules quite aggressively. Some of that optimizations
are described in the following [presentation](http://highsecure.ru/ast-rspamd.pdf).
To achieve this goal, rspamd counts all rules as `expression atoms`. Meta rules are
**real** rspamd rules that can have their symbol and score. Other rules are normally
hidden. However, it is possible to specify some minimum score that is needed for a rule
to be treated as normal rule:

    alpha = 0.1

With this setting in `spamassassin` section, all rules whose scores are higher than
`0.1` are treated not as atoms but as the complete rules and evaluated accordingly.
(Note that `alpha` will not apply to rules that have no `score` line in the file,
though.)

Currently, rspamd supports the following functions:

* body, rawbody, meta, header, uri and other rules
* some header functions, such as `exists`
* some eval functions
* some plugins:
    + 'Mail::SpamAssassin::Plugin::FreeMail',
    + 'Mail::SpamAssassin::Plugin::HeaderEval',
    + 'Mail::SpamAssassin::Plugin::ReplaceTags',
    + 'Mail::SpamAssassin::Plugin::RelayEval',
    + 'Mail::SpamAssassin::Plugin::MIMEEval',
    + 'Mail::SpamAssassin::Plugin::BodyEval',
    + 'Mail::SpamAssassin::Plugin::MIMEHeader'

Rspamd does **not** support network plugins, HTML plugins and some other plugins.
This is planned for the next releases of rspamd.

Nevertheless, the vast majority of spamassassin rules can work in rspamd making
the migration process much smoother for those who decide to replace SA with rspamd.

The overall performance of rspamd, of course, goes down since SA rules contain a lot
of inefficient regular expressions that scan large text bodies. However, the optimizations
performed by rspamd can significantly reduce the amount of work required to process
SA rules. Moreover, if your PCRE library is built with JIT support, rspamd can benefit
from this by a significant grade. On start, rspamd tells if it can use JIT compilation and
warns if it cannot. Some regular expressions might also benefit from `hyperscan` support
that is available on x86_64 platforms starting from rspamd 1.1.

Spamassassin plugin is written in lua with many functional elements. Hence, to speed
it up you might want to build rspamd with [luajit](http://luajit.org) that performs
blazingly fast and is almost as fast as plain C. Luajit is enabled by default since
rspamd 0.9.
