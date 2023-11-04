---
layout: doc
title: DKIM signing module
---

# DKIM signing module
{:.no_toc}

The Rspamd 1.5 version has introduced a convenient method of configuring DKIM signing through the addition of the DKIM signing module. A more customizable option is available in the DKIM module through the [sign_condition]({{ site.baseurl }}/doc/modules/dkim.html#dkim-signatures).

DKIM signing currently works with Milter based MTAs (Sendmail, Postfix), Haraka & Communigate. For DKIM signing to work, you must [scan outbound mail with rspamd]({{ site.baseurl }}/doc/tutorials/scanning_outbound.html).

<div id="toc" markdown="1">
  <h2 class="toc-header">Contents</h2>
  * TOC
  {:toc}
</div>

## Principles of operation

The DKIM signing module uses a predefined policy to determine which domains and selectors to use for signing. This policy can be modified with various settings. Here is a description of the default policy:

1. In order to be eligible for signing, an email must either be received from an authenticated user, a reserved (local) IP address, or an address in the sign_networks map (if defined).
2. If the envelope from address is not empty, the effective second-level domain must match the MIME header From.
3. If there is an authenticated user, it should be suffixed with @domain, where domain is what is seen in the envelope/header From address.
4. The selector and path to the key are selected from the domain-specific configuration, if present. If not, the global configuration is used as a fallback.

The default global configuration (fallback mode) searches for keys at the defined path. This path is constructed using the eSLD normalized domain name of the header from and the default selector defined with selector (dkim). For example, the search path for user@test.example.com would be /var/lib/rspamd/dkim/example.com.dkim.key. If a key is found, the message will be signed.

**Important notice**: when using file-based DKIM private keys, ensure that the Rspamd scanner processes (e.g. normal worker, controller, or a proxy in self-scan mode) have at least read access to the signing keys. This requires the keys to be accessible by the user or group `_rspamd`.

## Configuration

~~~hcl
# local.d/dkim_signing.conf

# If false, messages with empty envelope from are not signed
allow_envfrom_empty = true;

# If true, envelope/header domain mismatch is ignored
allow_hdrfrom_mismatch = false;

# If true, multiple from headers are allowed (but only first is used)
allow_hdrfrom_multiple = false;

# If true, username does not need to contain matching domain
allow_username_mismatch = false;

# Default path to key, can include '$domain' and '$selector' variables
path = "/var/lib/rspamd/dkim/$domain.$selector.key";

# Default selector to use
selector = "dkim";

# If false, messages from authenticated users are not selected for signing
sign_authenticated = true;

# If false, messages from local networks are not selected for signing
sign_local = true;

# Map file of IP addresses/subnets to consider for signing
# sign_networks = "/some/file"; # or url

# Symbol to add when message is signed
symbol = "DKIM_SIGNED";

# Whether to fallback to global config
try_fallback = true;

# Domain to use for DKIM signing: can be "header" (MIME From), "envelope" (SMTP From), "recipient" (SMTP To), "auth" (SMTP username) or directly specified domain name
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
# Set to `false` if you want to skip signing if public and private keys mismatch
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

To disable DKIM signing (i.e. you use OpenDKIM, or signing is done elsewhere)
~~~hcl
# local.d/dkim_signing.conf
enabled = false;
~~~
or
~~~hcl
# override.d/dkim_signing.conf
enabled = false;
~~~


## DKIM key management

Rspamd always uses `relaxed/relaxed` encoding with the `rsa-sha256` signature algorithm, which is deemed to be the most suitable option for all cases. Upon successful signing, Rspamd adds a unique element, the `DKIM-Signature`, to the output.

To generate DKIM keys for your domain, utilize the in-built `rspamadm dkim_keygen` utility:

~~~
rspamadm dkim_keygen -s 'test' -d example.com

-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----
test._domainkey IN TXT ( "v=DKIM1; k=rsa; "
  "p=MIGJAoGBALBrq9K6yxAXHwircsTnDTsd2Kg426z02AnoKTvyYNqwYT5Dxa02lyOiAXloXVIJsyfuGOOoSx543D7DGWw0plgElHXKStXy1TZ7fJfbEtuc5RASIKqOAT1iHGfGB1SZzjt3a3vJBhoStjvLulw4h8NC2jep96/QGuK8G/3b/SJNAgMBAAE=" ) ;
~~~

Between ```-----BEGIN PRIVATE KEY-----``` and ```-----END PRIVATE KEY-----``` is your DKIM private key (use the ```-k``` switch to save to file). The second part is the public DNS TXT record that you should place in your DNS zone file. This command can also save both private and public parts to files.

For an RSA key of 2048 bits:
~~~
rspamadm dkim_keygen -s 'woosh' -b 2048 -d example.com -k example.private > example.txt
~~~
* ```> example.txt``` re-directs the DNS TXT record output to ```example.txt```
* ```-k example.private``` saves your private key to the file ```example.private```
* ```-d example.com ``` specifies the domain as ```example.com``` (currently meaningless)
* ```-b 2048``` specifies a ```2048``` bit key size (the standard default 1024 bit size is weak)
* ```-s 'woosh'``` names the selector ```woosh``` i.e. ```woosh._domainkey```

Or for an Ed25519 key:

~~~
rspamadm dkim_keygen -s 'woosh' -d example.com -t ed25519 -k woosh-ed25519.private > woosh-ed25519.txt
~~~
* ```-t ed25519``` specifies key type Ed25519
* Note: using ```-b``` together with Ed25519 has no effect. There is no variable key length with Ed25519.

Please note that as of September 2019, Ed25519 keys are not widely supported in software, making it inadvisable to exclusively use this key type in a production environment, as this may result in rejected emails. If you choose to use Ed25519 keys, it is recommended to pair them with an RSA key, providing a fallback option in case a recipient domain is unable to parse Ed25519 keys or signatures.

Example:

~~~local.d/dkim_signing.conf
domain {
  alpha.example.org {
    selectors [
     {
       path: ".../configs/dkim.key";
       selector: "dkim";
     },
     {
       path: ".../configs/dkim-eddsa.key";
       selector: "eddsa";
     }
   ]
 }
}
~~~


## Verifying your private keys

To verify any generated private RSA key with OpenSSL (and also Ed25519 keys if your OpenSSL >= 1.1.1) you can use the following command:

~~~
$ openssl pkey -text -noout -in example.private

Private-Key: (2048 bit)
modulus:
    00:...
publicExponent: 65537 (0x10001)
privateExponent:
    00:...
prime1:
    00:...
prime2:
    00:...
exponent1:
    00:...
exponent2:
    00:...
coefficient:
    00:...
~~~

You have the option to configure the `dkim_signing` module to verify that the published pubkey record matches the selected private key by setting the `check_pubkey` option to `true` (the default setting is `false`). Please be advised that this may result in an additional DNS request during the signing process.


## DKIM keys in Redis

To use DKIM keys stored in Redis, add the following to your configuration::

~~~hcl
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

Starting from Rspamd 1.5.3, the `selector_map` or `path_map` can be used to determine the selectors and paths to private keys, respectively, using the DKIM signing domain as the key. If entries are found, they will override the default settings.

The following configuration provides a templated path for the DKIM signing key, a default selector, and a map that can be used to override the default selector, which in turn affects the effective path to the signing key. Any eligible email will be signed if a key with the appropriate name exists on disk.

~~~hcl
# local.d/dkim_signing.conf
try_fallback = true;
path = "/var/lib/rspamd/dkim/$domain.$selector.key";
selector_map = "/etc/rspamd/dkim_selectors.map";
selector = "dkim";
~~~

In the following configuration, we attempt to sign only domains which are present in both `selector_map` and `path_map`:

~~~hcl
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

Defines a table used to select one or more signatures to apply to a message based on the address found in the `From:` header field. The keys in this table can vary based on the type of table used.
The values in this data set should include one field that contains a name found in the KeyTable (see above) that identifies which key should be used in generating the signature, and an optional second field naming the signer of the message that will be included in the `i=` tag in the generated signature.
Note that the `i=` value will not be included in the signature if it conflicts with the signing domain (the `d=` value).

If the first field in the data set contains only a `%` symbol, it will be replaced by the domain found in the `From:` header field. Similarly, the optional second field can include a `%` symbol that will be replaced by the domain found in the `From:` header field.

In Rspamd, this table is treated as `refile`! So you should use **glob** style regular expressions to do matching.

- `key_table`

Gives the location of a file that maps key names to signing keys. This file, if present, overrides any KeyFile setting in the configuration file. The data set in this file associates each key name with three values: (a) the name of the domain to use in the signature’s "d=" value; (b) the name of the selector to use in the signature’s "s=" value; and (c) either a private key or a path to a file containing a private key.

If the first value consists solely of a percent sign ("%") character, it will be replaced by the apparent domain of the sender when generating a signature. If the third value starts with a slash ("/") character, or "./" or "../", then it is presumed to refer to a file from which the private key should be read, otherwise it is itself a PEM-encoded private key or a base64-encoded DER private key; a "%" in the third value in this case will be replaced by the apparent domain name of the sender.

The SigningTable (see below) is used to select records from this table to be used to add signatures based on the message sender.

Rspamd also supports embedded tables as for all other maps in the config, e.g. here is a sample used for functional testing:

~~~hcl
# local.d/dkim_signing.conf
signing_table = [
  "*@cacophony.za.org cacophony.za.org",
];

key_table = [
  "cacophony.za.org %:eddsa:m5kGxtckRfsNe5EuYTe7bvkDjSh7LXaX3aXyIMPGLR0=",
];
~~~

When using these options, they *passthrough* all mismatch checks. The only meaningful setting is `sign_networks` in this mode as it corresponds with OpenDKIM behaviour. Otherwise, Rspamd will perform signing based on matching of the Mime `From` header with the entries in `signing_table`

## HTTP headers based DKIM signing

To simplify REST services integration, Rspamd offers the option of DKIM signing based solely on HTTP request headers. To utilize this feature, simply enable the `use_http_headers` setting. When this mode is activated, Rspamd disregards all other methods of signing messages and only looks for the designated **request** headers (not email headers!):

 Header | Definition
---------|-----------
`PerformDkimSign` | Switch DKIM signing on (if `Yes`)
`SignOnAuthFailed` | Sign messages with failed DKIM (dkim check must be performed before)
`DkimDomain` | Dkim signing domain
`DkimSelector` | Selector for signing
`DkimPrivateKey` | Private key encoded in Base64

To ensure proper functionality, it's crucial to follow the mandatory header requirements and enable the `DKIM_CHECK` in user settings. This will enable the automatic DKIM check dependency and allow for the use of the `Setting` header, which facilitates bypassing of other checks. For further information, refer to the (see [Users settings]({{ site.url }}{{ site.baseurl }}/doc/configuration/settings.html)) documentation.

## DKIM signing using Vault

Starting from version 1.9.3, Rspamd has the capability to use [Hashicorp Vault](https://www.vaultproject.io) to securely store and manage DKIM keys. Vault usage provides secure and flexible storage of the private keys that can scale and use various backends to store sensible data (secrets).

To store DKIM keys using Vault, you must create a KV storage version 1. For more information, see the Vault Secrets Engine [guide](https://learn.hashicorp.com/vault/getting-started/secrets-engines).

To integrate Vault-stored keys with Rspamd, simply add the following lines to your `local.d/dkim_signing.conf` (or `arc.conf` for [ARC signing](arc.html)):

~~~hcl
use_vault = true;

vault_domains = ["example.com"]; # or file/http map path
vault_url = "http://127.0.0.1:8200"; # or https url if using production vault
vault_token = "s.AhTThjWhKZAf97VowxG6blyu"; # as generated by vault tokens
~~~

To store the vault token securely, you can use JINJA templates and environment/lua variables:

~~~hcl
use_vault = true;

vault_domains = ["example.com"]; # or file/http map path
vault_url = "http://127.0.0.1:8200"; # or https url if using production vault
vault_token = "{= VAULT_TOKEN =}"; # as generated by vault tokens
~~~

And start Rspamd with the environment variable:

~~~
RSPAMD_VAULT_TOKEN="s.AhTThjWhKZAf97VowxG6blyu" rspamd ...
~~~

Rspamd also provides keys management tools using `rspamadm` command. It can do the following things:

* Create new keys:

```
rspamadm vault create example.com
```

* Create or add new ed25519 keys:

```
rspamadm vault create --algorithm eddsa example.com
```

* Delete keys

```
rspamadm vault del example.com
```

* Perform safe keys rotation:

```
rspamadm vault rotate example.com
```

Rspamd generates a new set of keys for each algorithm stored in vault. The new selectors are determined based on the key type and current date, such as `rsa-20190501`. The previous keys are kept, but their expiration date is set to cease usage after the default ttl grace period of one day. During this grace period, Rspamd will sign messages using both the old and new selectors.

For example, if you have rsa-20190501 and ed25519-20190501 selectors and you want to roll them to 20190601, two new keys will be created: rsa-20190601 and ed25519-20190601. For the grace period, specifically until 20190602, Rspamd will produce four DKIM signatures to allow DNS rollover for the new key. This approach ensures a safe and secure key rotation process by providing ample time to address any DNS cache issues.

The rotate subcommand can also remove all expired keys from the vault.


## Sign headers
Rspamd allows you to change the headers that are required to be signed. From Rspamd 1.7.3, you can specify them using the sign_headers option. By default, Rspamd distinguishes between two types of headers:

* Normal headers: These headers are signed as many times as you specify them. **Important security notice**: An attacker can add arbitrary headers with the same name before the signed headers and will still get a valid signature. This option is recommended for headers that are not visible to users, such as transport headers.
* Oversigned headers: These headers are signed `N + 1` times **even if `N == 0`**. Oversigned headers cannot be appended to a message without signature breaking. Displayed or meaningful headers are usually oversigned.
* Optionally oversigned headers (from 1.9.3): These headers are signed `N + 1` times **if `N != 0` only.** Optionally oversigned headers cannot be appended to a message without signature breaking, if at least one header with such a name is presented in the original message. Displayed but optional headers are usually oversigned in this way.

Oversigned headers are prefixed with the (o) string. Optionally oversigned headers are prefixed with the (x) string.

### Default sign_headers (after 1.9.3)

For DKIM signing, Rspamd uses the following default list:

    (o)from:(x)sender:(o)reply-to:(o)subject:(x)date:(x)message-id:
    (o)to:(o)cc:(x)mime-version:(x)content-type:(x)content-transfer-encoding:
    resent-to:resent-cc:resent-from:resent-sender:resent-message-id:
    (x)in-reply-to:(x)references:list-id:list-help:list-owner:list-unsubscribe:
    list-unsubscribe-post:list-subscribe:list-post:(x)openpgp:(x)autocrypt
		
Here is the summary of the list above:

| Header          | Sign type                         |
| :-------------- | :-------------------------------- |
| `From`      | Strictly oversign                |
| `Sender`      | Conditionally oversign                |
| `Reply-To`      | Strictly oversign                |
| `Subject`      | Strictly oversign                |
| `Date`      | Conditionally oversign                |
| `Message-Id`      | Conditionally oversign                |
| `To`      | Strictly oversign                |
| `Cc`      | Strictly oversign                |
| `Mime-Version`      | Conditionally oversign                |
| `Content-Type`      | Conditionally oversign                |
| `Content-Transfer-Encoding`      | Conditionally oversign                |
| `Resent-To`      | Do not oversign                |
| `Resent-Cc`      | Do not oversign                |
| `Resent-From`      | Do not oversign                |
| `Resent-Sender`      | Do not oversign                |
| `Resent-Message-Id`      | Do not oversign                |
| `In-Reply-To`      | Conditionally oversign                |
| `References`      | Conditionally oversign                |
| `List-Id`      | Do not oversign                |
| `List-Help`      | Do not oversign                |
| `List-Owner`      | Do not oversign                |
| `List-Unsubscribe`      | Do not oversign                |
| `List-Unsubscribe-Post`      | Do not oversign                |
| `List-Subscribe`      | Do not oversign                |
| `List-Post`      | Do not oversign                |
| `Openpgp`      | Conditionally oversign                |
| `Autocrypt`      | Conditionally oversign                |

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

## Optimize signing only mode

If you intend to run Rspamd for DKIM signing only in certain conditions, then please use the [user settings]({{ site.url }}{{ site.baseurl }}/doc/configuration/settings.html) as following:

~~~hcl
# local.d/settings.conf
dkim_signing {
  ... # Add conditions to match this setting
  apply {
    symbols_enabled = ["DKIM_SIGNED"];
    flags = ["skip_process"]; # Disable expensive MIME processing
  }
}
~~~
