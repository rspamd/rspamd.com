---
layout: doc
title: DKIM signing module
---

# DKIM signing module

The DKIM signing module has been added in Rspamd 1.5 to provide a relatively simple way to configure DKIM signing, the more flexible alternative being [sign_condition]({{ site.baseurl }}/doc/modules/dkim.html#dkim-signatures) in the DKIM module.

DKIM signing currently works with Milter based MTAs (Sendmail, Postfix), Haraka & Communigate. For DKIM signing to work, you must [scan outbound mail with rspamd]({{ site.baseurl }}/doc/tutorials/scanning_outbound.html).

# Principles of operation

The DKIM signing module chooses signing domains and selectors according to a predefined policy which can be modified with various settings. Description of this policy follows:

 * To be eligible for signing, a mail must be received from an authenticated user OR a reserved IP address OR an address in the `sign_networks` map (if defined)
 * If envelope from address is not empty, the effective second level domain must match the MIME header From
 * If authenticated user is present, this should be suffixed with @domain where domain is what's seen is envelope/header From address
 * Selector and path to key are selected from domain-specific config if present, falling back to global config

# Configuration

~~~ucl
# local.d/dkim_signing.conf

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
path = "/var/lib/rspamd/dkim/$domain.$selector.key";

# Default selector to use
selector = "dkim";

# If false, messages from local networks are not selected for signing
sign_local = true;

# Map file of IP addresses/subnets to consider for signing
# sign_networks = "/some/file"; # or url

# Symbol to add when message is signed
symbol = "DKIM_SIGNED";

# Whether to fallback to global config
try_fallback = true;

# Domain to use for DKIM signing: can be "header" (MIME From), "envelope" (SMTP From) or "auth" (SMTP username)
use_domain = "header";

# Domain to use for DKIM signing when sender is in sign_networks ("header"/"envelope"/"auth")
#use_domain_sign_networks = "header";

# Domain to use for DKIM signing when sender is a local IP ("header"/"envelope"/"auth")
#use_domain_sign_local = "header";

# Whether to normalise domains to eSLD
use_esld = true;

# Whether to get keys from Redis
use_redis = false;

# Hash for DKIM keys in Redis
key_prefix = "DKIM_KEYS";

# map of domains -> names of selectors (since rspamd 1.5.3)
#selector_map = "/etc/rspamd/dkim_selectors.map";

# map of domains -> paths to keys (since rspamd 1.5.3)
#path_map = "/etc/rspamd/dkim_paths.map";

# If `true` get pubkey from DNS record and check if it matches private key
check_pubkey = false;
# Set to `false` if you want to skip signing if publick and private keys mismatches
allow_pubkey_mismatch = true;


# Domain specific settings
domain {

  # Domain name is used as key
  example.com {

    # Private key path
    path = "/var/lib/rspamd/dkim/example.key";

    # Selector
    selector = "ds";

  }

}
~~~

## DKIM keys in Redis

To use DKIM keys stored in Redis you should add the following to configuration:

~~~ucl
# local.d/dkim_signing.conf
use_redis = true;
key_prefix = "DKIM_KEYS";
selector = "myselector";
~~~

... and populate the named hash with DKIM keys; for example the following Lua script could be run with `redis-cli --eval`:

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
redis.call('HMSET', 'DKIM_KEYS', 'myselector.example.com', key)
~~~

The selector will be chosen as per usual (a domain-specific selector will be used if configured, otherwise the global setting is used).

## Using maps

Since Rspamd 1.5.3 one or both of `selector_map` or `path_map` can be used to look up selectors and paths to private keys respectively (using the DKIM signing domain as the key). If entries are found, these will override default settings.

In the following configuration we define a templatised path for the DKIM signing key, a default selector, and a map which could be used for overriding the default selector (and hence effective path to the signing key as well). Any eligible mail will be signed given there is a suitably-named key on disk.

~~~ucl
# local.d/dkim_signing.conf
try_fallback = true;
path = "/var/lib/rspamd/dkim/$domain.$selector.key";
selector_map = "/etc/rspamd/dkim_selectors.map";
selector = "dkim";
~~~

In the following configuration, we attempt to sign only domains which are present in both `selector_map` and `path_map`:

~~~ucl
# local.d/dkim_signing.conf
try_fallback = false;
selector_map = "/etc/rspamd/dkim_selectors.map";
path_map = "/etc/rspamd/dkim_paths.map";
~~~

Format of the maps should be as shown:

~~~
$ head -1 /etc/rspamd/dkim_selectors.map
example.net dkim
$ head -1 /etc/rspamd/dkim_paths.map
example.net /var/lib/rspamd/dkim/example.net.$selector.key
~~~

## Sign headers

Rspamd allows to change headers that are required to be signed. From Rspamd 1.7.3, you can specify them as `sign_headers` option. By default, Rspamd distinguish two options:

* Normal headers: they are signed as many times as you specify them. **Important security notice**: an attacker can add arbitrary headers with the same name before the headers signed and will still get a valid signature. This option is thus recommended for headers that are non **visible** to users. We want **transport** headers to be treated as normal headers here.
* Oversigned headers: these headers are signed `N + 1` times even if `N==0`. Oversigned headers cannot be appended to a message. We usually want displayed or meaningful headers to be oversigned here.

### Default sign_headers (after 1.7.3)

The default setting for this option is the following:

```
sign_headers = '(o)from:(o)sender:(o)reply-to:(o)subject:(o)date:(o)message-id:\
(o)to:(o)cc:(o)mime-version:(o)content-type:(o)content-transfer-encoding:\
resent-to:resent-cc:resent-from:resent-sender:resent-message-id:\
(o)in-reply-to:(o)references:list-id:list-owner:list-unsubscribe:\
list-subscribe:list-post';
```

As you can see, oversigned headers are prefixed with `(o)` string.

### Rules of headers sign

`sign_headers` lists headers that are:

- signed `n` times if they are present `n` times
- for the `n = 0` case this would mean that headers are not signed if they are not present. Oversigned headers are still signed one time to prevent adding a header with this name.
- headers listed as oversigned are signed `n + 1` times