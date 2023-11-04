---
layout: doc
title: Controller worker
---
# Controller worker

The controller worker is primarily utilized for managing Rspamd statistics, facilitating the learning process, and serving the WebUI. 

In essence, it operates as a web server that accepts requests and delivers responses in JSON format. Various commands are mapped to specific URLs, and they fall into two categories: read-only commands, which are considered `unprivileged`, and commands like map modification, config alterations, and learning, which necessitate a higher level of privileges called `enable`. These privilege levels are differentiated by passwords. If only one password is specified in the configuration, it is used for both types of commands.

## Controller configuration

The Rspamd controller worker offers the following configuration options:

* `password`: This sets the password required for read-only commands.
* `enable_password`: This sets the password required for write commands.
* `secure_ip`: A list or map containing IP addresses designated as "secure." All commands are allowed from these IPs without the need for passwords. If a reverse proxy sets an `X-Forwarded-For` header, both the proxy's IP and the actual client's IP must be included in `secure_ip`.
* `static_dir`: This specifies the directory where static files for the web interface are located. Typically, this would be `${WWWDIR}`.
* `stats_path`: This sets the path where the controller worker stores persistent statistics about Rspamd, such as the count of scanned messages.
* `bind_socket`: A string defining the bind address for the controller worker (web interface). If the port number is omitted, it defaults to port 11334. You can also refer to [the common worker options](https://rspamd.com/doc/workers/#common-workers-options) for additional details.

## Encryption support

To generate a keypair for the scanner you could use:

    rspamadm keypair -u

After running this command, the keypair should appear as follows:

~~~hcl
keypair {
    pubkey = "tm8zjw3ougwj1qjpyweugqhuyg4576ctg6p7mbrhma6ytjewp4ry";
    privkey = "ykkrfqbyk34i1ewdmn81ttcco1eaxoqgih38duib1e7b89h9xn3y";
}
~~~

You can use its **public** part thereafter when scanning messages as following:

    rspamc --key tm8zjw3ougwj1qjpyweugqhuyg4576ctg6p7mbrhma6ytjewp4ry <file>

## Passwords encryption

Rspamd now suggests to encrypt passwords when storing them in a configuration. Currently, it uses `PBKDF2-Blake2` function to derive key from a password. To encrypt key, you can use `rspamadm pw` command as following:

    rspamadm pw
    Enter passphrase: <hidden input>
    $1$cybjp37q4w63iogc4erncz1tgm1ce9i5$kxfx9xc1wk9uuakw7nittbt6dgf3qyqa394cnradg191iqgxr8kb

You can use that line as `password` and `enable_password` values.

## Supported commands

* `/auth`
* `/symbols`
* `/actions`
* `/maps`
* `/getmap`
* `/graph`
* `/pie`
* `/history`
* `/historyreset` (priv)
* `/learnspam` (priv)
* `/learnham` (priv)
* `/saveactions` (priv)
* `/savesymbols` (priv)
* `/savemap` (priv)
* `/scan`
* `/check`
* `/checkv2`
* `/stat`
* `/statreset` (priv)
* `/counters`
* `/metrics`
