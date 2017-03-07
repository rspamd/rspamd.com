---
layout: doc_modules
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

The following Lua modules are enabled in the default configuration (but may require additional configuration to work):

- [antivirus](antivirus.html) - integrates virus scanners
- [asn](asn.html) - looks up ASN-related information
- [clickhouse](clickhouse.html) - pushes scan-related information to clickhouse DBMS
- [dcc](dcc.html) - performs [DCC](http://www.dcc-servers.net/dcc/) lookups to determine message bulkiness
- [dkim_signing](dkim_signing.html) - adds DKIM signatures to messages
- [dmarc](dmarc.html) - performs DMARC policy checks
- [emails](emails.html) - extract emails from a message and checks it against DNS
blacklists.
- [force_actions](force_actions.html) - forces actions if selected symbols are detected
- [greylisting](greylisting.html) - allows to delay suspicious messages
- [ip_score](ip_score.html) - dynamically scores sender reputation
- [maillist](maillist.html) - determines the common mailing list signatures in a message.
- [metadata_exporter](metadata_exporter.html) - pushes message metadata to external systems
- [metric_exporter](metric_exporter.html) - pushes statistics to external monitoring systems
- [mid](mid.html) - selectively suppresses invalid/missing message-id rules
- [mime_types](mime_types.html) - applies some rules about mime types met in messages
- [multimap](multimap.html) - a complex module that operates with different types
of maps.
- [neural networks](fann.html) - allows to post-process messages using neural network classification. requires redis configuration and log_helper worker setup for activation.
- [once_received](once_received.html) - detects messages with a single `Received` headers
and performs some additional checks for such messages.
- [phishing](phishing.html) - detects messages with phished URLs.
- [ratelimit](ratelimit.html) - implements leaked bucket algorithm for ratelimiting and
requires `redis` to store data - if this is unconfigured the module is inactive.
- [replies](replies.html) - checks if an incoming message is a reply for our own message
- [rbl](rbl.html) - a plugin that checks messages against DNS blacklist based on
either SMTP FROM addresses or on information from `Received` headers.
- [rmilter_headers](rmilter_headers.html) - adds/removes headers from messages
- [rspamd_update](rspamd_update.html) - load dynamic rules and other rspamd updates
- [spamassassin](spamassassin.html) - load spamassassin rules
- [trie](trie.html) - uses suffix trie for extra-fast patterns lookup in messages.
- [whitelist](whitelist.html) - provides a flexible way to whitelist (or blacklist) messages based on SPF/DKIM/DMARC combinations
- [url_redirector](url_redirector.html) - dereferences redirects

The following modules are explicitly disabled in the default configuration, set `enabled = true` in `/etc/rspamd/local.d/${MODULE_NAME}.conf` to enable them:

- [mx_check](mx_check.html) - checks if sending domain has a connectable MX
- [url_reputation](url_reputation.html) - assigns reputation to domains in URLs
- [url_tags](url_tags.html) - persists URL tags in Redis
