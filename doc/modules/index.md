---
layout: doc
title: Modules documentation
---
# Rspamd modules

Rspamd ships with a set of modules. Some modules are written in C to speed up
complex procedures, while others are written in Lua to reduce code size.
We encourage you to write new modules in Lua and add the essential
support to the Lua API itself. Lua modules are very close to
C modules in terms of performance. Lua modules, however, can be written and loaded
dynamically.

## C Modules

C modules provide the core functionality of Rspamd and are statically linked to the
main Rspamd code. C modules are defined in options.inc with the `filters` attribute.
The default configuration enables all C modules explicitly:

~~~ucl
filters = "chartable,dkim,regexp,fuzzy_check";
~~~

If no `filters` attribute is defined, all C modules are disabled. To understand how to
override defaults, see the FAQ [here](faq.html#what-are-local-and-override-config-files)
and [here](faq.html#what-are-the-locald-and-overrided-directories).

Available C modules:

- [chartable](chartable.html) - checks character sets of text parts in messages.
  - (Note: "char" as in character, and "table" as in a table of character sets.)
- [dkim](dkim.html) - performs [DKIM](http://www.dkim.org/) signatures checks.
   - The `dkim` C module was previously used for both checking for inbound signatures and for
  writing outbound signatures. Now these feature are separated, where [dkim](dkim.html) processes inbound
  messages and the [dkim_signing](dkim_signing.html) Lua module processes outbound messages.
- [fuzzy_check](fuzzy_check.html) - checks a message's fuzzy hashes against public blacklists.
- [regexp](regexp.html) - a core module that deals with regular expressions, internal
functions and Lua code to filter messages.

In prior releases other C modules were enabled by default:

- [spf](spf.html) - checks SPF records for messages processed. This C module was removed in
version 2.3 and replaced by an equivalent Lua module.
- [surbl](surbl.html) - extracts URLs from messages and check them against
public DNS black-lists to filter messages containing malicious URLs. This module was removed
in version 2.0 and replaced by the [rbl module](rbl.html). In an upgrade to v2, the existing
configuration is automatically converted.

## Lua modules

Lua modules are dynamically loaded on Rspamd startup and are reloaded on Rspamd
reconfiguration. Should you want to write a Lua module, consult the
[Lua API documentation](../lua/). To define a path to Lua modules there is a section
named `modules` in common.conf:

~~~ucl
modules {
  path = "${PLUGINSDIR}";
  fallback_path = "${SHAREDIR}/lua"; # Legacy path
  try_path = "${LOCAL_CONFDIR}/plugins.d/"; # User plugins
}
~~~

If a path is a directory then Rspamd scans it for `*.lua` pattern and load all
files matched.

The following Lua modules are enabled in the default configuration. Except where noted with a trailing asterisk,
each of these modules has its own module_name.conf file in $LOCAL_CONFDIR/modules.d. Some modules require
additional configuration to work, see notes below. :

- [antivirus](antivirus.html) - integrates virus scanners (requires configuration)
- [arc](arc.html) - checks and signs ARC signatures
- [asn](asn.html) - looks up ASN-related information
- [clickhouse](clickhouse.html) - pushes scan-related information to the clickhouse DBMS (requires configuration)
- [bayes_expiry](bayes_expiry.html) - provides expiration of statistical tokens (requires Redis and configuration) *
- [dcc](dcc.html) - performs [DCC](http://www.dcc-servers.net/dcc/) lookups to determine message bulkiness (requires configuration)
- [dkim_signing](dkim_signing.html) - adds [DKIM](http://www.dkim.org/) signatures to messages (requires configuration)
   - The `dkim` C module was previously used for both checking for inbound signatures and for
  writing outbound signatures. Now these feature are separated, where [dkim](dkim.html) processes inbound
  messages and the [dkim_signing](dkim_signing.html) Lua module processes outbound messages.
- [dmarc](dmarc.html) - performs DMARC policy checks (requires Redis and configuration for reporting)
- [elastic](elastic.html) - pushes scan-related information to Elasticsearch. (requires configuration)
- [external_services](external_services.html) - allows use of many external services (requires configuration)
- [force_actions](force_actions.html) - forces actions if selected symbols are detected (requires configuration)
- [forged_recipients](forged_recipients.html) - Check forged recipients **and senders** (e.g. mime and smtp recipients mismatch (requires configuration)
- [greylist](greylisting.html) - allows suspicious messages to be delayed (requires Redis)
  - Some documentation refers to this as the 'greylist**ing**' module, but internally it is seen as 'greylist'.
- [hfilter](hfilter.html) - filters some known bad patterns in hostnames, received headers, helo domains and reverse dns (requires configuration)
- [history redis](history_redis.html) - stores history in Redis (requires Redis)
- [maillist](maillist.html) - determines the common mailing list signatures in a message.
- [metadata_exporter](metadata_exporter.html) - pushes message metadata to external systems (requires configuration)
- [metric_exporter](metric_exporter.html) - pushes statistics to external monitoring systems (requires configuration)
- [mid](mid.html) - selectively suppresses invalid/missing message-id rules
- [milter_headers](milter_headers.html) - adds/removes headers from messages (requires configuration)
- [mime_types](mime_types.html) - applies some rules about mime types met in messages
- [multimap](multimap.html) - a complex module that operates with different types of maps.
- [neural networks](neural.html) - allows to post-process messages using neural network classification. (requires Redis).
  - Some documentation refers to this as the 'neural **network**' module, but internally it is referenced as just 'neural'.
- [once_received](once_received.html) - detects messages with a single `Received` headers and performs some additional checks for such messages.
- [phishing](phishing.html) - detects messages with phished URLs.
- [ratelimit](ratelimit.html) - implements leaked bucket algorithm for ratelimiting (requires Redis & configuration)
- [rbl](rbl.html) - a plugin that checks messages against DNS runtime blacklists.
- [replies](replies.html) - checks if an incoming message is a reply for our own message (requires Redis)
- [reputation](reputation.html) - a plugin that manages reputation evaluation based on various rules.
- [rspamd_update](rspamd_update.html) - load dynamic rules and other Rspamd updates (requires configuration)
- [spamassassin](spamassassin.html) - load spamassassin rules (requires configuration)
- [spf.html](spf.html) - perform SPF checks
- [trie](trie.html) - uses suffix trie for extra-fast patterns lookup in messages. (requires configuration)
- [url_redirector](url_redirector.html) - dereferences redirects (requires Redis configuration)
- [whitelist](whitelist.html) - provides a flexible way to whitelist (or blacklist) messages based on SPF/DKIM/DMARC combinations

The following modules have been removed or deprecated:

- [emails](emails.html) - extract email addresses from a message and checks them against DNS blacklists. (requires configuration)
  - Deprecated, use [rbl](rbl.html).
- [ip_score](ip_score.html) - dynamically scores sender reputation (requires Redis).
  - Removed as of v2.0 and replaced by the [reputation module](reputation.html). The existing configuration
in older installations is automatically converted by an Rspamd upgrade.

The following modules are explicitly disabled in the default configuration, set `enabled = true` in `local.d/${MODULE_NAME}.conf` to enable them:

- [mx_check](mx_check.html) - checks if sending domain has a connectable MX (requires Redis)
- **p0f** - see below
- [spamtrap](spamtrap.html) - catch spam trapped emails or even a catch-all domain. Intended for learning Bayes spam. (requires configuration)

The following modules are explicitly disabled and are experimental, see below to Enable a module **AND** set the global option `enable_experimental = true` in `local.d/options.inc`:

- [url_reputation](url_reputation.html) - assigns reputation to domains in URLs (requires Redis). Removed in Rspamd 2.0.
- [url_tags](url_tags.html) - persists URL tags in Redis (requires Redis). Removed in Rspamd 2.0.

Experimental modules are not recommended for production usage!

The following modules require documentation:

- **http_headers**
- **p0f** - passive OS fingerprinting : [Wikipedia](https://en.wikipedia.org/wiki/P0f) / Rspamd [PR #3037](https://github.com/rspamd/rspamd/pull/3037)


## Disabling module

To disable an entire module set `enabled = false;` in `$LOCAL_CONFDIR/local.d/${MODULE_NAME}.conf`.

## Enabling a disabled module

To enable an entire module set `enabled = true;` in `$LOCAL_CONFDIR/local.d/${MODULE_NAME}.conf`.

## Config file locations for modules

Here are some guidelines regarding where module configurations are stored:

- The Rspamd-provided configuration files are in `$LOCAL_CONFDIR/modules.d`.
- Your overrides are set in `$LOCAL_CONFDIR/local.d`
- The value of `$LOCAL_CONFDIR` is usually `$PREFIX/etc/rspamd`
- The value of `$CONFDIR` is usually the same as `$LOCAL_CONFDIR`
- The value of `$PREFIX` is usually null
- So defaults are usually in `/etc/rspamd/modules.d`, overrides in `/etc/rspamd/local.d`
- These $values may be changed at build time - the rules here apply for a default build
- To see the values of the environment variables that are actually being used by Rspamd at run-time,
Run `rspamadm lua` and enter `rspamd_paths` at the prompt. This returns a JSON object with values. Ctrl-C to exit.