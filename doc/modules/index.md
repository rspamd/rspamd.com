---
layout: doc
title: Modules documentation
---
# Rspamd modules

Rspamd ships with a set of modules. Some modules are written in C to speedup
complex procedures while others are written in lua to reduce code size.
Actually, new modules are encouraged to be written in lua and add the essential
support to the Lua API itself. Truly speaking, lua modules are very close to
C modules in terms of performance. However, lua modules can be written and loaded
dynamically.

## C Modules

C modules provides core functionality of rspamd and are actually statically linked
to the main rspamd code. C modules are defined in the `options` section of rspamd
configuration. If no `filters` attribute is defined then all modules are disabled.
The default configuration enables all modules explicitly:

~~~ucl
filters = "chartable,dkim,spf,surbl,regexp,fuzzy_check";
~~~

Here is the list of C modules available:

- [chartable](chartable.html): checks character sets of text parts in messages.
- [dkim](dkim.html): performs DKIM signatures checks.
- [fuzzy_check](fuzzy_check.html): checks messages fuzzy hashes against public blacklists.
- [spf](spf.html): checks SPF records for messages processed.
- [surbl](surbl.html): this module extracts URLs from messages and check them against
public DNS black lists to filter messages with malicious URLs.
- [regexp](regexp.html): the core module that allow to define regexp rules,
rspamd internal functions and lua rules.

## Lua modules

Lua modules are dynamically loaded on rspamd startup and are reloaded on rspamd
reconfiguration. Should you want to write a lua module consult with the
[Lua API documentation](../lua/). To define path to lua modules there is a special section
named `modules` in rspamd:

~~~ucl
modules {
  path = "/path/to/dir/";
  path = "/path/to/module.lua";
  path = "$PLUGINSDIR/lua";
}
~~~

If a path is a directory then rspamd scans it for `*.lua" pattern and load all
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
- [ip_score](ip_score.html) - dynamically scores sender reputation (requires Redis)
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
- [rbl](rbl.html) - a plugin that checks sending IP addresses or information from `Received` headers against DNS blacklists.
- [reputation](reputation.html) - a plugin that manages reputation evaluation based on various rules.
- [rspamd_update](rspamd_update.html) - load dynamic rules and other rspamd updates (requires configuration)
- [spamassassin](spamassassin.html) - load spamassassin rules (requires configuration)
- [trie](trie.html) - uses suffix trie for extra-fast patterns lookup in messages. (requires configuration)
- [whitelist](whitelist.html) - provides a flexible way to whitelist (or blacklist) messages based on SPF/DKIM/DMARC combinations
- [url_redirector](url_redirector.html) - dereferences redirects (requires Redis and SURBL module configuration)

The following modules are explicitly disabled in the default configuration, set `enabled = true` in `local.d/${MODULE_NAME}.conf` to enable them:

- [mx_check](mx_check.html) - checks if sending domain has a connectable MX (requires Redis)

The following modules are explicitly disabled and are experimental, so you need to set `enabled = true` in `local.d/${MODULE_NAME}.conf` **AND** to set the global option `enable_experimental = true` in `local.d/options.inc`:

- [reputation](reputation.html) - generic reputation plugin
- [url_reputation](url_reputation.html) - assigns reputation to domains in URLs (requires Redis)
- [url_tags](url_tags.html) - persists URL tags in Redis (requires Redis)

Experimental modules are not recommended for any production usage!

## Disabling module

To disable an entire module you can set `enabled = false;` in `/etc/rspamd/local.d/${MODULE_NAME}.conf`
