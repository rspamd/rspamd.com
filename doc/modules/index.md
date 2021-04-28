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
filters = "chartable,dkim,surbl,regexp,fuzzy_check";
~~~

Here is the list of available C modules:

- [chartable](chartable.html): checks character sets of text parts in messages.
- [dkim](dkim.html): performs DKIM signatures checks.
- [fuzzy_check](fuzzy_check.html): checks a message's fuzzy hashes against public blacklists.
- [spf](spf.html): checks SPF records for messages processed. Since Rspamd 2.3, this C module has been removed and replaced by an equivalent Lua module.
- [surbl](surbl.html): this module extracts URLs from messages and check them against
public DNS black-lists to filter messages containing malicious URLs. Since Rspamd 2.0, this module has been removed and replaced by [rbl module](rbl.html). The existing configuration is automatically converted by Rspamd.
- [regexp](regexp.html): the core module that allows to define regexp rules,
Rspamd internal functions and Lua rules.

## Lua modules

Lua modules are dynamically loaded on Rspamd startup and are reloaded on Rspamd
reconfiguration. Should you want to write a Lua module, consult the
[Lua API documentation](../lua/). To define a path to Lua modules there is a special section
named `modules` in Rspamd:

~~~ucl
modules {
  path = "/path/to/dir/";
  path = "/path/to/module.lua";
  path = "$PLUGINSDIR/lua";
}
~~~

If a path is a directory then Rspamd scans it for `*.lua` pattern and load all
files matched.

The following Lua modules are enabled in the default configuration (but may require additional configuration to work, see notes below):

- [antivirus](antivirus.html) - integrates virus scanners (requires configuration)
- [arc](arc.html) - checks and signs ARC signatures
- [asn](asn.html) - looks up ASN-related information
- [clickhouse](clickhouse.html) - pushes scan-related information to clickhouse DBMS (requires configuration)
- [bayes_expiry](bayes_expiry.html) - provides expiration of statistical tokens (requires Redis and configuration)
- [dcc](dcc.html) - performs [DCC](http://www.dcc-servers.net/dcc/) lookups to determine message bulkiness (requires configuration)
- [dkim_signing](dkim_signing.html) - adds DKIM signatures to messages (requires configuration)
- [dmarc](dmarc.html) - performs DMARC policy checks (requires Redis & configuration for reporting)
- [elastic](elastic.html) - pushes scan-related information to Elasticsearch. (requires configuration)
- [emails](emails.html) - extract emails from a message and checks it against DNS blacklists. (requires configuration)
- [force_actions](force_actions.html) - forces actions if selected symbols are detected (requires configuration)
- [greylisting](greylisting.html) - allows to delay suspicious messages (requires Redis)
- [history redis](history_redis.html) - stores history in Redis (requires Redis)
- [ip_score](ip_score.html) - dynamically scores sender reputation (requires Redis). This module is removed since Rspamd 2.0 and replaced by [reputation module](reputation.html). The existing configuration is automatically converted by Rspamd.
- [maillist](maillist.html) - determines the common mailing list signatures in a message.
- [metadata_exporter](metadata_exporter.html) - pushes message metadata to external systems (requires configuration)
- [metric_exporter](metric_exporter.html) - pushes statistics to external monitoring systems (requires configuration)
- [mid](mid.html) - selectively suppresses invalid/missing message-id rules
- [milter_headers](milter_headers.html) - adds/removes headers from messages (requires configuration)
- [mime_types](mime_types.html) - applies some rules about mime types met in messages
- [multimap](multimap.html) - a complex module that operates with different types of maps.
- [neural networks](neural.html) - allows to post-process messages using neural network classification. (requires Redis).
- [once_received](once_received.html) - detects messages with a single `Received` headers and performs some additional checks for such messages.
- [phishing](phishing.html) - detects messages with phished URLs.
- [ratelimit](ratelimit.html) - implements leaked bucket algorithm for ratelimiting (requires Redis & configuration)
- [replies](replies.html) - checks if an incoming message is a reply for our own message (requires Redis)
- [rbl](rbl.html) - a plugin that checks messages against DNS runtime blacklists.
- [reputation](reputation.html) - a plugin that manages reputation evaluation based on various rules.
- [rspamd_update](rspamd_update.html) - load dynamic rules and other Rspamd updates (requires configuration)
- [spamassassin](spamassassin.html) - load spamassassin rules (requires configuration)
- [spf.html](spf.html) - perform SPF checks
- [trie](trie.html) - uses suffix trie for extra-fast patterns lookup in messages. (requires configuration)
- [whitelist](whitelist.html) - provides a flexible way to whitelist (or blacklist) messages based on SPF/DKIM/DMARC combinations
- [url_redirector](url_redirector.html) - dereferences redirects (requires Redis configuration)

The following modules are explicitly disabled in the default configuration, set `enabled = true` in `local.d/${MODULE_NAME}.conf` to enable them:

- [mx_check](mx_check.html) - checks if sending domain has a connectable MX (requires Redis)

The following modules are explicitly disabled and are experimental, so you need to set `enabled = true` in `local.d/${MODULE_NAME}.conf` **AND** to set the global option `enable_experimental = true` in `local.d/options.inc`:

- [url_reputation](url_reputation.html) - assigns reputation to domains in URLs (requires Redis). Removed in Rspamd 2.0.
- [url_tags](url_tags.html) - persists URL tags in Redis (requires Redis). Removed in Rspamd 2.0.

Experimental modules are not recommended for production usage!

## Disabling module

To disable an entire module you can set `enabled = false;` in `/etc/rspamd/local.d/${MODULE_NAME}.conf`
