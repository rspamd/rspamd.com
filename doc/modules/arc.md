---
layout: doc
title: ARC module
---

# ARC module

This module verifies [ARC](https://arc-spec.org/) signatures and seals for scanned emails, which demonstrate the message's authenticity through a series of trusted relays. The ARC standard is explained in detail at <https://dmarc.org/presentations/ARC-Overview-2016Q2-v03.pdf>.

Rspamd, starting from version 1.6, offers support for both checking and signing ARC signatures and seals. It utilizes the [dkim](./dkim.html) module to manage signatures.

The configuration of this module is similar to the [dkim](./dkim.html) and [dkim_signing](./dkim_signing.html) modules.

## Configuration

- `whitelist` - a map of domains that are exempt from ARC checking (e.g. due to broken ARC signers)
- `whitelisted_signers_map` - a map of the trusted ARC forwarders
- `adjust_dmarc` (**true** by default) - a boolean flag that enables fixing of DMARC issues when a trusted ARC forwarder is in the chain. This is useful in situations where a domain, `X`, uses a signer, `Y`, to forward emails, but `X` has a strict DMARC policy while `Y` alters the message in a legitimate way. By trusting `Y`, this option allows fixing DMARC rejection for `X`

## Principles of operation

The ARC signing module follows a configurable policy for choosing signing domains and selectors. The policy can be modified using various settings, as described below:

 * A mail is eligible for signing if it is received from an authenticated user, a reserved IP address, or an address in the `sign_networks` map (if defined)
 * If the envelope from address is not empty, the second-level domain must match the MIME header From
 * If an authenticated user is present, it must be suffixed with @domain, where domain is the envelope/header From address
 * Selector and path to key are selected from domain-specific config if present, falling back to global config

## Configuration

~~~hcl
# local.d/arc.conf

# Allowed settings id
allowed_ids = nil;
# If false, messages with empty envelope from are not signed
allow_envfrom_empty = true;
# If true, envelope/header domain mismatch is ignored
allow_hdrfrom_mismatch = false;
# Domain mismatch allowed for local IP
allow_hdrfrom_mismatch_local = false;
# Domain mismatch allowed for sign_networks
allow_hdrfrom_mismatch_sign_networks = false;
# If true, multiple from headers are allowed (but only first is used)
allow_hdrfrom_multiple = false;
# If true, username does not need to contain matching domain
allow_username_mismatch = false;
# Banned settings id
forbidden_ids = nil;
# Default path to key, can include '$domain' and '$selector' variables
path = "${DBDIR}/arc/$domain.$selector.key";
# Default selector to use
selector = "arc";
# If false, messages from authenticated users are not selected for signing
sign_authenticated = true;
# If false, inbound messages are not selected for signing
sign_inbound = true;
# If false, messages from local networks are not selected for signing
sign_local = true;
# Symbol to add when message is signed
sign_symbol = "ARC_SIGNED";
# Whether to fallback to global config
try_fallback = true;
# Domain to use for ARC signing: can be "header" (MIME From), "envelope" (SMTP From), "recipient" (SMTP To), "auth" (SMTP username) or directly specified domain name
use_domain = "header";
# Whether to normalise domains to eSLD
use_esld = true;
# Whether to get keys from Redis
use_redis = false;
# Hash for ARC keys in Redis
key_prefix = "ARC_KEYS";
# Reuse the existing authentication results
reuse_auth_results = false;
# map of domains -> names of selectors (since rspamd 1.5.3)
#selector_map = "/etc/rspamd/arc_selectors.map";
# map of domains -> paths to keys (since rspamd 1.5.3)
#path_map = "/etc/rspamd/arc_paths.map";
# map of trusted domains. Symbol ARC_ALLOW_TRUSTED is added to messages
# with valid ARC chains from these domains. A failed DMARC result is removed/ignored.
# whitelisted_signers_map = ["example.org", "example.com"]

# From version 1.8.4, Rspamd uses a different set of sign_headers for ARC:
sign_headers = "(o)from:(o)sender:(o)reply-to:(o)subject:(o)date:(o)message-id:(o)to:(o)cc:(o)mime-version:(o)content-type:(o)content-transfer-encoding:resent-to:resent-cc:resent-from:resent-sender:resent-message-id:(o)in-reply-to:(o)references:list-id:list-owner:list-unsubscribe:list-subscribe:list-post:dkim-signature"

# Domain specific settings
domain {
  example.com {
    # Private key path
    path = "${DBDIR}/arc/example.key";
    # Selector
    selector = "ds";
  }
}
~~~

## ARC keys in Redis

To use ARC keys stored in Redis you should add the following to configuration:

~~~hcl
# local.d/arc.conf
use_redis = true;
key_prefix = "ARC_KEYS";
selector = "myselector";
~~~

... and populate the hash with the ARC keys. For example, you can run the following Lua script using `redis-cli --eval`:

~~~lua
local key = [[-----BEGIN PRIVATE KEY-----
MIICdwIBADANBgkqhkiG9w0BAQEFAASCAmEwggJdAgEAAoGBANe3EETkiI1Exyrb
+VzbMSt90K8MXJA0GcyNs6MFCs9JPaTh90Zu2l7ki7m5LTUx6350AR/3hcvwjSHC
ZjD6fvQ8/zfjN8kaLZ6DAaqtqSlpawIM+8glkuTEkIkpBED/OtDrba4Rd29iLFVu
wQZXDtTjAAZKZPmtTZ5TXLrcCU6VAgMBAAECgYEA1BFvmBsIN8Gu/+6kNupya2xU
NVM0yLu/xT5lpNV3LBO325oejAq8+d87kkl/LTW3a2jGFlQ0ICuLw+2mo24QUWRy
v8if3oeBMlnLqHE+6wNjFVqo5sOjKzjO363xSXwXNUrBT7jDhnZcDN8w3/FecYKj
ifGTVtUs1SLsYwhlc8ECQQDuCRymLZQ/imPn5eFVIydwUzg8ptZlvoA7bfIxUL9B
QRX33s59kLCilA0tTed8Dd+GnxsT93XOj1ApIfBwmTSlAkEA5/63PDsN7fH+WInq
VD8nU07M9S8LcGDlPbVVBr2S2I78/iwrSDAYtbkU2vEbhFK/JuKNML2j8OkzV3v1
QulfMQJBALDzhx+l/HHr3+8RPhx7QKNIyiKUaAdEwbDsP8IXY8YPq1QThu9jM1v4
sX7/TdkzuvoppwiFykbe1NlvCH279p0CQCmTg4Ee0DtBcCSr6rvYaZLLf329RZ6J
LuwlMCy6ErQOxBZFEiiovfTrS2qFZToMnkc4uLbwdY36LQJTq7unGTECQCCok8Lz
BeZtAw+TJofpOM3F2Rlm2qXiBVBeubhRedsiljG0hpvvLJBMppnQ6r27p5Jk39Sm
aTRkxEKrxPWWLNM=
-----END PRIVATE KEY-----]]
redis.call('HMSET', 'ARC_KEYS', 'myselector.example.com', key)
~~~

The selector will be selected according to the usual process. If a domain-specific selector is configured, it will be used; otherwise, the global setting will be applied.

## Using maps

You can use either `selector_map` or `path_map` to access selectors and private key paths respectively, with the ARC signing domain serving as the key. If a match is found, it will override the default settings.

Our configuration defines a templated path for the ARC signing key, a default selector, and an optional selector map that can override the default. All eligible emails will be signed if a key with the appropriate name is present on the disk.

~~~hcl
# local.d/arc.conf
try_fallback = true;
path = "${DBDIR}/arc/$domain.$selector.key";
selector_map = "/etc/rspamd/arc_selectors.map";
selector = "arc";
~~~

In the following configuration, we attempt to sign only domains which are present in both `selector_map` and `path_map`:

~~~hcl
# local.d/arc.conf
try_fallback = false;
selector_map = "/etc/rspamd/arc_selectors.map";
path_map = "/etc/rspamd/arc_paths.map";
~~~

Format of the maps should be as shown:

~~~
$ head -1 /etc/rspamd/dkim_selectors.map
example.net dkim
$ head -1 /etc/rspamd/dkim_paths.map
example.net /var/lib/rspamd/dkim/example.net.$selector.key
~~~

