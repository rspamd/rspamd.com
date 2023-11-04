---
layout: doc
title: Spamassassin module
---
# Spamassassin rules module

This module is intended to enable the adoption and reading of SpamAssassin rules within Rspamd.

## Overview

SpamAssassin offers a comprehensive set of rules that prove useful in low-volume environments. 
The purpose of this plugin is to integrate these rules seamlessly into Rspamd. The configuration 
process for this plugin is straightforward. All you need to do is compile your SpamAssassin rules 
into a single file and feed it to the SpamAssassin module:

~~~hcl
spamassassin {
	ruleset = "/path/to/file";
	base_ruleset = "/var/db/spamassassin/3.004002/updates_spamassassin_org/*.cf";
	# Limit search size to 100 kilobytes for all regular expressions
	match_limit = 100k;
	# Those regexp atoms will not be passed through hyperscan:
	pcre_only = ["RULE1", "__RULE2"];
}
~~~

Rspamd has the capability to read several files containing SpamAssassin rules, and it 
also supports glob patterns. All rules are parsed into a uniform structure, which means 
that if an individual rule occurs multiple times, it may be overwritten.

## Limitations and principles of work

Rspamd tries to optimize SA rules quite aggressively. Some of that optimizations
are described in the following [presentation](https://highsecure.ru/ast-rspamd.pdf).
To achieve this objective, Rspamd treats all rules as `expression atoms`. While meta 
rules are considered as **real** Rspamd rules that possess their symbol and score, 
other rules are typically concealed. Nevertheless, it is possible to specify a minimum 
score required for a rule to be treated as a normal rule.

    alpha = 0.1

By configuring the `spamassassin` section in this manner, all rules with scores greater 
than `0.1` will be regarded as full-fledged rules, and evaluated accordingly. (Do note, 
however, that `alpha` will not be applicable to rules lacking a `score` line in the file.)

At present, Rspamd boasts the following functions:

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

As of now, Rspamd does **not** offer support for network plugins, HTML plugins, and some other plugins. 
However, this features are planned  to incorporate these features in upcoming releases of Rspamd.

Despite these limitations, the majority of SpamAssassin rules can be utilized in Rspamd, 
rendering the transition process far more seamless for users who opt to switch from SpamAssassin to Rspamd.

The overall performance of Rspamd is somewhat diminished when processing SpamAssassin rules, 
as these rules incorporate numerous inefficient regular expressions that scour through voluminous 
text bodies. Nevertheless, the optimizations implemented by Rspamd can markedly reduce the workload 
required to process SpamAssassin rules. Furthermore, if the PCRE library is constructed with 
JIT support, Rspamd can gain a substantial boost in performance. Upon launching, Rspamd indicates 
whether JIT compilation is available and issues a warning if it is not. It is worth noting that certain 
regular expressions might benefit from "hyperscan" support, which is accessible on x86_64 platforms 
as of Rspamd version 1.1.

The SpamAssassin plugin is implemented in Lua and encompasses numerous functional components. 
As a result, to enhance its speed, one may wish to compile Rspamd with [luajit](https://luajit.org),
a high-speed engine that approaches the speed of standard C. Since Rspamd version 0.9, LuaJIT has been 
enabled by default.
