---
layout: doc
title: DKIM signing module
---

# DKIM signing module
{:.no_toc}

The DKIM signing module has been added in Rspamd 1.5 to provide a relatively simple way to configure DKIM signing, the more flexible alternative being [sign_condition]({{ site.baseurl }}/doc/modules/dkim.html#dkim-signatures) in the DKIM module.

DKIM signing currently works with Milter based MTAs (Sendmail, Postfix), Haraka & Communigate. For DKIM signing to work, you must [scan outbound mail with rspamd]({{ site.baseurl }}/doc/tutorials/scanning_outbound.html).

<div id="toc" markdown="1">
  <h2 class="toc-header">Contents</h2>
  * TOC
  {:toc}
</div>

## Principles of operation

The DKIM signing module chooses signing domains and selectors according to a predefined policy which can be modified with various settings. Description of this default policy follows:

 * To be eligible for signing, a mail must be received from an authenticated user OR a reserved (local) IP address OR an address in the `sign_networks` map (if defined)
 * If envelope from address is not empty, the effective second level domain must match the MIME header From
 * If authenticated user is present, this should be suffixed with @domain where domain is what's seen is envelope/header From address
 * Selector and path to key are selected from domain-specific config if present, falling back to global config

The default global config (fallback mode) searches for keys at the defined `path`. The path is constructed using the eSLD normalized domain name of header from and the default selector defined with `selector` (dkim). So the search path for user@test.example.com would be `/var/lib/rspamd/dkim/example.com.dkim.key`. If a key is found the message will be signed.

If using DKIM private keys stored in files, you need to ensure that Rspamd scanner processes (e.g. normal worker, controller or a proxy in self-scan mode) can **open** signing keys, so they should be accessible for the user `_rspamd` in the most of the cases.

## Configuration

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

## DKIM keys management

Rspamd always use `relaxed/relaxed` encoding with `rsa-sha256` signature algorithm. This selection seems to be the most appropriate for all cases. Rspamd adds a special element called `DKIM-Signature` to the output when signing has been done.

You can generate DKIM keys for your domain using `rspamadm dkim_keygen` utility:

~~~
rspamadm dkim_keygen -s 'test' -d example.com

-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----
test._domainkey IN TXT ( "v=DKIM1; k=rsa; "
  "p=MIGJAoGBALBrq9K6yxAXHwircsTnDTsd2Kg426z02AnoKTvyYNqwYT5Dxa02lyOiAXloXVIJsyfuGOOoSx543D7DGWw0plgElHXKStXy1TZ7fJfbEtuc5RASIKqOAT1iHGfGB1SZzjt3a3vJBhoStjvLulw4h8NC2jep96/QGuK8G/3b/SJNAgMBAAE=" ) ;
~~~

The first part is DKIM private key (that should be saved to some file) and the second part is DNS record for the public part that you should place in your zone's file. This command can also save both private and public parts to files.

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

## Use of `signing_table`

From the version 1.9.2, Rspamd supports OpenDKIM compatible settings:

- `signing_table`:

Defines a table used to select one or more signatures to apply to a message based on the address found in the From: header field. Keys in this table vary depending on the type of table used; values in this data set should include one field that contains a name found in the KeyTable (see above) that identifies which key should be used in generating the signature, and an optional second field naming the signer of the message that will be included in the "i=" tag in the generated signature. Note that the "i=" value will not be included in the signature if it conflicts with the signing domain (the "d=" value).

If the first field contains only a "%" character, it will be replaced by the domain found in the From: header field. Similarly, within the optional second field, any "%" character will be replaced by the domain found in the From: header field.

In Rspamd, this table is treated as `refile`! So you should use **glob** style regular expressions to do matching.

- `key_table`

Gives the location of a file mapping key names to signing keys. If present, overrides any KeyFile setting in the configuration file. The data set named here maps each key name to three values: (a) the name of the domain to use in the signature’s "d=" value; (b) the name of the selector to use in the signature’s "s=" value; and (c) either a private key or a path to a file containing a private key. If the first value consists solely of a percent sign ("%") character, it will be replaced by the apparent domain of the sender when generating a signature. If the third value starts with a slash ("/") character, or "./" or "../", then it is presumed to refer to a file from which the private key should be read, otherwise it is itself a PEM-encoded private key or a base64-encoded DER private key; a "%" in the third value in this case will be replaced by the apparent domain name of the sender. The SigningTable (see below) is used to select records from this table to be used to add signatures based on the message sender.

Rspamd also supports embedded tables as for all other maps in the config, e.g. here is a sample used for functional testing:

~~~ucl
# local.d/dkim_signing.conf
signing_table = [
  "*@cacophony.za.org cacophony.za.org",
];

key_table = [
  "cacophony.za.org %:eddsa:m5kGxtckRfsNe5EuYTe7bvkDjSh7LXaX3aXyIMPGLR0=",
];
~~~

When using these options, they *passthrough* all mismatch checks. The only meaninglful setting is `sign_networks` in this mode as it corresponds with OpenDKIM behaviour. Otherwise, Rspamd will perform signing based on matching of the Mime `From` header with the entries in `signing_table`

## HTTP headers based DKIM signing

To simplify REST services integration, Rspamd supports dkim signing based solely on HTTP request headers. To use this feature one can use the boolean setting called `use_http_headers`. When this mode is enabled Rspamd ignores all other ways to sign message and wait merely for the specified **request** headers (not email headers!):

 Header | Definition
---------|-----------
`PerformDkimSign` | Switch DKIM signing on (if `Yes`)
`SignOnAuthFailed` | Sign messages with failed DKIM (dkim check must be performed before)
`DkimDomain` | Dkim signing domain
`DkimSelector` | Selector for signing
`DkimPrivateKey` | Private key encoded in Base64

All headers are mandatory. Dkim check dependency is automatically enabled but you need to ensure that `DKIM_CHECK` has been enabled in user settings. This mode is normally used in conjunction with `Setting` header that allows bypassing of the resting checks (see [Users settings]({{ site.url }}{{ site.baseurl }}/doc/configuration/settings.html)) documentation for more details).

## DKIM signing using Vault

From version 1.9.3, Rspamd can use [Hashicorp Vault](https://www.vaultproject.io) to store and manage DKIM keys. Vault usage provides secure and flexible storage of the private keys that can scale and use various backends to store sensible data (secrets).

You need to create a KV storage version 1 to store DKIM keys. You can read more about it [here](https://learn.hashicorp.com/vault/getting-started/secrets-engines).

To use keys in Rspamd you could add the following lines to `locald/dkim_signing.conf` (or `arc.conf` for [ARC signing](arc.html)):

~~~ucl
use_vault = true;

vault_domains = ["example.com"]; # or file/http map path
vault_url = "http://127.0.0.1:8200"; # or https url if using production vault
vault_token = "s.AhTThjWhKZAf97VowxG6blyu"; # as generated by vault tokens
~~~

To store the vault token securely, you can use JINJA templates and environment/lua variables:

~~~ucl
use_vault = true;

vault_domains = ["example.com"]; # or file/http map path
vault_url = "http://127.0.0.1:8200"; # or https url if using production vault
vault_token = "{{ VAULT_TOKEN }}"; # as generated by vault tokens
~~~

And start Rspamd with the environment variable:

~~~
RSPAMD_VAULT_TOKEN="s.AhTThjWhKZAf97VowxG6blyu" rspamd ...
~~~

Rspamd also provides keys management tools using `rspamadm` command. It can do the following things:

* Create new keys:

    rspamadm vault create example.com

* Create or add new ed25519 keys:

    rspamadm vault create --algorithm eddsa example.com
    
* Delete keys

    rspamadm vault del example.com
    
* Perform safe keys rotation:

    rspamadm vault rotate example.com
    
During rotation, Rspamd creates a new set of keys for each algorithm represented in the vault. New selectors are chosen according to the current date and key type, e.g. `rsa-20190501`. Old keys are preserved but their expire date is set to stop their usage over `ttl` grace time (1 day by default). During this grace period, Rspamd will sign using **both** selectors.

For example, if you have `rsa-20190501` and `ed25519-20190501` selectors and you want to roll them to `20190601` then two new keys will be created: `rsa-20190601` and `ed25519-20190601`. For the grace period, specifically to `20190602`, Rspamd will produce 4 DKIM signatures to allow DNS rollover for the new key.  This logic allows to have safe and secure keys rotation providing enough time to work around various DNS caches.

Rotate subcommand can also remove all expired keys from the vault.


## Sign headers

Rspamd allows to change headers that are required to be signed. From Rspamd 1.7.3, you can specify them as `sign_headers` option. By default, Rspamd distinguish two options:

* Normal headers: they are signed as many times as you specify them. **Important security notice**: an attacker can add arbitrary headers with the same name before the headers signed and will still get a valid signature. This option is thus recommended for headers that are non **visible** to users. We want **transport** headers to be treated as normal headers here.
* Oversigned headers: these headers are signed `N + 1` times **even if `N==0`**. Oversigned headers cannot be appended to a message. We usually want displayed or meaningful headers to be oversigned here.
* Optionally oversigned headers (from 1.9.3): these headers are signed `N + 1` times **if `N<>0` only**. Oversigned headers cannot be appended to a message. We usually want displayed but optional headers to be oversigned in this way.

Oversigned headers are prefixed with `(o)` string. Optionally oversigned headers are prefixed with `(x)` string.

### Default sign_headers (after 1.9.3)

For DKIM signing, Rspamd uses the following default list:

    (o)from:(x)sender:(x)reply-to:(x)subject:(x)date:(x)message-id:
		(o)to:(o)cc:(x)mime-version:(x)content-type:(x)content-transfer-encoding:
		resent-to:resent-cc:resent-from:resent-sender:resent-message-id:
		(x)in-reply-to:(x)references:list-id:list-help:list-owner:list-unsubscribe:
		list-subscribe:list-post:(x)openpgp:(x)autocrypt

### Rules of headers sign

`sign_headers` lists headers that are:

- signed `n` times if they are present `n` times
- for the `n = 0` case this would mean that headers are not signed if they are not present. Oversigned headers are still signed one time to prevent adding a header with this name. Optionally oversigned headers are excluded from that.
- headers listed as oversigned are signed `n + 1` times

## Issues using Sendmail on DKIM signing and verification

This part of the documentation has been contributed by Dilyan Palauzov.

When using the sendmail MTA in both signing and verifying mode, there are
a few issues of which to be aware that might cause operational problems
and deserve consideration.

*  When the MTA will be used for relaying emails, e.g. delivering to other
   hosts using the aliases mechanism, it is important not to break
   signatures inserted by the original sender.  This is particularly sensitive
   particular when the sending domain has published a "reject" DMARC policy.

   By default, sendmail quotes to address header fields when there are no
   quotes and the display part of the address contains a period or an
   apostrophe.  However, Rspamd only observes the raw, unmodified form of
   the header field, and so the content that gets verified and what gets
   signed will not be the same, guaranteeing the attached signature is not
   valid.

   To direct sendmail not to modify the headers, add this to your sendmail.mc:

    	conf(`confMUST_QUOTE_CHARS', `')

* As stated in sendmail's KNOWNBUGS file, sendmail truncates header field
  values longer than 256 characters, which could mean truncating the domain
  of a long From: header field value and invalidating the signature.
  You may wish to consider increasing MAXNAME in sendmail/conf.h to mitigate
  changing the messages and invalidating their signatures.  This change
  requires recompiling sendmail.

* Similar to the first bullet above, sendmail may wrap very long single-line recipient
  fields for presentation purposes; for example:

```
    To: very long name <a@example.org>,anotherloo...ong name b <b@example.org>
```

  ... might be rewritten as:

```
    To: very long name <a@example.org>,
    	anotherloo...ong name b <b@example.org>
```

  This rewrite is also done after Rspamd has seen the message, meaning
  the signature Rspamd attaches to the message does not match the
  content it signed.  There is not a known configuration change to
  mitigate this mutation.

  The only known mechanism for dealing with this is to have distinct
  settings of Rspamd do the verifying (inbound) and signing (outbound)
  so that the version that arrives at the signing instance is already
  in the rewritten form, guaranteeing the input and output are the same
  and thus the signature matches the payload. You can do such a split using [user settings]({{ site.url }}{{ site.baseurl }}/doc/configuration/settings.html).
