---
layout: doc
title: DKIM module
---
# DKIM module

This module checks [DKIM](http://www.dkim.org/) signatures for emails scanned.
DKIM signatures can establish that this specific message has been signed by a trusted
relay. For example, if a message comes from `gmail.com` then a valid DKIM signature
means that this message was definitely signed by `gmail.com` (unless gmail.com private
key has been compromised, which is not a likewise case).

## Supported features

Rspamd can deal with many types of DKIM signatures and messages canonicalisation.
The major difficulty with DKIM are line endings: many MTA treat them differently which
leads to broken signatures. Basically, rspamd treats all line endings as `CR+LF` that
is compatible with the most of DKIM implementations.

## Configuration

DKIM module has several useful configuration options:

 *  `symbol_allow` (_string_): symbol to insert in case of allow (default: 'R_DKIM_ALLOW')
 *  `symbol_reject` (_string_): symbol to insert (default: 'R_DKIM_REJECT')
 *  `symbol_tempfail` (_string_): symbol to insert in case of temporary fail (default: 'R_DKIM_TEMPFAIL')
 *  `symbol_permfail` (_string_): symbol to insert in case of permanent failure (default: 'R_DKIM_PERMFAIL')
 *  `symbol_na` (_string_): symbol to insert in case of no signing (default: 'R_DKIM_NA')
 *  `whitelist` (_map_): map of whitelisted networks
 *  `domains` (_map_): map of domains to check
 *  `strict_multiplier` (_number_): multiplier for strict domains
 *  `time_jitter` (_number_): jitter in seconds to allow time diff while checking
 *  `trusted_only` (_boolean_): check signatures only for domains in 'domains' map
 *  `dkim_cache_size` (_number_): cache up to 1000 of the most recent DKIM records
 *  `dkim_cache_expire` (_time_): default max expire for an element in this cache
 *  `skip_multi` (_boolean_): skip DKIM check for messages with multiple signatures

## DKIM signatures

Please use [dkim_signing module](./dkim_signing.html) for DKIM signatures.
