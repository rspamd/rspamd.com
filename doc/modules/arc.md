---
layout: doc
title: ARC module
---
# ARC module

This module checks [ARC](http://arc-spec.org/) signatures and seals for emails scanned.
ARC signatures can establish that this specific message has been signed and then forwarded by a number of  a trusted relays. There is a good overview of the `ARC` standard here: <https://dmarc.org/presentations/ARC-Overview-2016Q2-v03.pdf>.

Rspamd (from 1.6) supports both checking and signing for ARC signatures and seals. Internally, it uses [dkim](./dkim.html) module for dealing with signatures.

The configuration of this module is very similar to both  [dkim](./dkim.html) and  [dkim_signing](./dkim_signing.html) modules.

## Configuration

- `whitelist` - a map of domains that should not be checked with ARC (e.g. if that domains have totally broken ARC signer)

# Principles of operation

The ARC signing module chooses signing domains and selectors according to a predefined policy which can be modified with various settings. Description of this policy follows:

 * To be eligible for signing, a mail must be received from an authenticated user OR a reserved IP address OR an address in the `sign_networks` map (if defined)
 * If envelope from address is not empty, the effective second level domain must match the MIME header From
 * If authenticated user is present, this should be suffixed with @domain where domain is what's seen is envelope/header From address
 * Selector and path to key are selected from domain-specific config if present, falling back to global config

# Configuration

~~~ucl
# local.d/arc.conf

# If false, messages with empty envelope from are not signed
allow_envfrom_empty = true;
# If true, envelope/header domain mismatch is ignored
allow_hdrfrom_mismatch = false;
# If true, multiple from headers are allowed (but only first is used)
allow_hdrfrom_multiple = false;
# If true, username does not need to contain matching domain
allow_username_mismatch = false;
# If false, messages from authenticated users are not selected for signing
auth_only = true;
# Default path to key, can include '$domain' and '$selector' variables
path = "${DBDIR}/arc/$domain.$selector.key";
# Default selector to use
selector = "arc";
# If false, messages from local networks are not selected for signing
sign_local = true;
# Symbol to add when message is signed
symbol_signed = "ARC_SIGNED";
# Whether to fallback to global config
try_fallback = true;
# Domain to use for ARC signing: can be "header" or "envelope"
use_domain = "header";
# Whether to normalise domains to eSLD
use_esld = true;
# Whether to get keys from Redis
use_redis = false;
# Hash for ARC keys in Redis
key_prefix = "ARC_KEYS";
# map of domains -> names of selectors (since rspamd 1.5.3)
#selector_map = "/etc/rspamd/arc_selectors.map";
# map of domains -> paths to keys (since rspamd 1.5.3)
#path_map = "/etc/rspamd/arc_paths.map";

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

~~~ucl
# local.d/arc.conf
use_redis = true;
key_prefix = "ARC_KEYS";
selector = "myselector";
~~~

... and populate the named hash with ARC keys; for example the following Lua script could be run with `redis-cli --eval`:

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

The selector will be chosen as per usual (a domain-specific selector will be used if configured, otherwise the global setting is used).

## Using maps

One or both of `selector_map` or `path_map` can be used to look up selectors and paths to private keys respectively (using the ARC signing domain as the key). If entries are found, these will override default settings.

In the following configuration we define a templatised path for the ARC signing key, a default selector, and a map which could be used for overriding the default selector (and hence effective path to the signing key as well). Any eligible mail will be signed given there is a suitably-named key on disk.

~~~ucl
# local.d/arc.conf
try_fallback = true;
path = "${DBDIR}/arc/$domain.$selector.key";
selector_map = "/etc/rspamd/arc_selectors.map";
selector = "arc";
~~~

In the following configuration, we attempt to sign only domains which are present in both `selector_map` and `path_map`:

~~~ucl
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

