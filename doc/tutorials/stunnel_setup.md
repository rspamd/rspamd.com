---
layout: doc
title: Setup stunnel to protect Redis
---
# Setting up encrypted tunnel using stunnel

To establish encrypted communication between Redis masters and slaves, we recommend using [stunnel](https://www.stunnel.org). Stunnel serves as a TLS encryption wrapper between the client and server.

This tutorial provides a detailed explanation of installing and configuring `stunnel` proxies on both the FreeBSD client and server.

If you are using [DigitalOcean's managed Redis](https://docs.digitalocean.com/products/databases/redis/), there is a [community tutorial](https://www.digitalocean.com/community/tutorials/how-to-connect-to-managed-redis-over-tls-with-stunnel-and-redis-cli) available as an alternative.

Although the configuration procedures for other operating systems are quite similar, this tutorial focuses on replication to a single client host to simplify the process. This configuration does not require individual pre-shared keys for each client.

## Introduction

Assuming we have 3 Redis instances on both `server` and `client`, listening sockets on the `server` (master side):

|instance|Redis socket|stunnel socket|
|---|---|---|
|`redis`|localhost:6379|-|
|`bayes`|localhost:6378|master.example.com:6478|
|`fuzzy`|localhost:6377|master.example.com:6477|

Since the `redis` instance should not be mirrored, we will replicate the `fuzzy` and `bayes` instances. Consequently, we need to set up two TLS tunnels.

## Installation

First install the `security/stunnel` package:

```sh
# pkg install stunnel
```

Create pid-file directory:

```sh
# mkdir /var/run/stunnel && chown stunnel:stunnel /var/run/stunnel
```

To enable `stunnel` add the following lines to the `/etc/rc.conf`:

```sh
stunnel_enable="YES"
stunnel_pidfile="/var/run/stunnel/stunnel.pid"
```

## Server configuration (master side)

`/usr/local/etc/stunnel/stunnel.conf`:

```
setuid = stunnel
setgid = nogroup

pid = /var/run/stunnel/stunnel.pid

[bayes]
accept  = 6478
connect = 6378
ciphers = PSK
PSKsecrets = /usr/local/etc/stunnel/psk.txt

[fuzzy]
accept  = 6477
connect = 6377
ciphers = PSK
PSKsecrets = /usr/local/etc/stunnel/psk.txt
```

## Client configuration (slave side)

`/usr/local/etc/stunnel/stunnel.conf`:

```
setuid = stunnel
setgid = nogroup

pid = /var/run/stunnel/stunnel.pid

[bayes]
client = yes
accept  = localhost:6478
connect = master.example.com:6478
ciphers = PSK
PSKsecrets = /usr/local/etc/stunnel/psk.txt

[fuzzy]
client = yes
accept  = localhost:6477
connect = master.example.com:6477
ciphers = PSK
PSKsecrets = /usr/local/etc/stunnel/psk.txt
```

## Preshared keys

Create `/usr/local/etc/stunnel/psk.txt` .
 The `psk.txt` file contains one line for each client:

`test1:oaP4EishaeSaishei6rio6xeeph3az`

> _Do not use example passwords._

Since both the `bayes` and `fuzzy` Redis instances are located on the same host, we can use the same key for both of them.

Considering that this file contains sensitive information, it is crucial to maintain its secrecy by setting secure permissions on it:

`# chmod 600 /usr/local/etc/stunnel/psk.txt`

## Starting stunnel

`# service stunnel start`

## Testing

From the client host use the `redis-cli` utility to connect to the remote instances:

```sh
# redis-cli -p 6477
# redis-cli -p 6478
```

Now that the connection is established, you are ready to proceed with configuring replication between the Redis instances. You can follow the instructions provided in the [Redis replication configuration guide](redis_replication.html#rspamd-configuration-on-the-replica).
