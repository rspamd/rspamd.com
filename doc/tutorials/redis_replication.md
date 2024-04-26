---
layout: doc
title: Multi-instance Redis replication
---
# Bayesian statistics and fuzzy storage replication with multi-instance Redis backend

This tutorial presents a step-by-step guide on setting up statistics and fuzzy storage replication on FreeBSD. The configuration procedures for other operating systems are quite similar.

The tutorial focuses on a centralized model where Bayesian classifier and fuzzy storage learning occur on a single host and are then distributed among Rspamd installations in remote locations. For the sake of simplicity, the tutorial covers replication to a single `replica` database for each of the `masters`.

To achieve this, we need to replicate the bayes and fuzzy storage backend data to the remote host. Since we don't want to mirror the entire Redis cache, we should use dedicated Redis instances. It would be wise to separate the bayes and fuzzy storage as well.

We will create three Redis instances on both the `master` and `replica` sides: `bayes`, `fuzzy`, and `redis` for the remaining cache.

|instance|Redis socket|
|---|---|
|`redis`|localhost:6379|
|`bayes`|localhost:6378|
|`fuzzy`|localhost:6377|

## Installation

To begin, install the `databases/redis` package by executing the following command:

```sh
# pkg install redis
```

Next, create separate working directories for the instances:

```sh
# cd /var/db/redis && mkdir bayes fuzzy && chown redis bayes fuzzy
```

To enable `redis` and its specific instances, add the following lines to the `/etc/rc.conf` file:

```sh
redis_enable="YES"
redis_profiles="redis bayes fuzzy"
```

To enable log rotation for Redis, create a newsyslog configuration file named `/usr/local/etc/newsyslog.conf.d/redis.newsyslog.conf`:

```sh
# logfilename          [owner:group]    mode count size when  flags [/pid_file] [sig_num]
/var/log/redis/redis.log    redis:redis    644  5       100    *  J
/var/log/redis/bayes.log    redis:redis    644  5       100    *  J
/var/log/redis/fuzzy.log    redis:redis    644  5       100    *  J
```

## Configuration

Generate the default configuration on both the `master` and `replica` hosts, which will be common for all instances:

```sh
# cp /usr/local/etc/redis.conf.sample /usr/local/etc/redis.conf
```

Due to security concerns, it is not advisable to expose Redis to external interfaces. Instead, configure Redis to listen on loopback interfaces and utilize stunnel to establish TLS tunnels between the `replica` and `master` hosts. However, please note that this approach also has its own security vulnerabilities. Therefore, **do not set up replication** if you cannot trust the users of the replica host.

Configure the listening sockets and memory limit (optional) as follows:

```diff
# diff -u1 /usr/local/etc/redis.conf.sample /usr/local/etc/redis.conf
--- /usr/local/etc/redis.conf.sample    2016-11-03 06:30:49.000000000 +0300
+++ /usr/local/etc/redis.conf   2016-11-27 13:10:43.671584000 +0300
@@ -60,3 +60,3 @@
 # ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-bind 127.0.0.1
+bind 127.0.0.1 ::1

@@ -537,2 +537,3 @@
 # maxmemory <bytes>
+maxmemory 200M
```

Configure the `redis` instance on both the `master` and `replica` hosts in a way that maintains compatibility with a single instance configuration. This ensures that if you already have a single instance database, it will continue to function properly.

`/usr/local/etc/redis-redis.conf`:

```sh
include /usr/local/etc/redis.conf
```

## Master instances configuration

`/usr/local/etc/redis-bayes.conf`:

```sh
include /usr/local/etc/redis.conf

port 6378

pidfile /var/run/redis/bayes.pid
logfile /var/log/redis/bayes.log
dbfilename bayes.rdb
dir /var/db/redis/bayes/

maxmemory 600M
```

`/usr/local/etc/redis-fuzzy.conf`:

```sh
include /usr/local/etc/redis.conf

port 6377

pidfile /var/run/redis/fuzzy.pid
logfile /var/log/redis/fuzzy.log
dbfilename fuzzy.rdb
dir /var/db/redis/fuzzy/
```

If needed, the `maxmemory` is adjusted for specific instances according to expected database size.

## Starting Redis on the master

`# service redis start`

## Setting up encrypted tunnel using stunnel

Please refer to the [Setting up encrypted tunnel using stunnel](./stunnel_setup.html) guide.

## Replica instances configuration

`/usr/local/etc/redis-bayes.conf`:

```sh
include /usr/local/etc/redis.conf

port 6378

pidfile /var/run/redis/bayes.pid
logfile /var/log/redis/bayes.log
dbfilename bayes.rdb
dir /var/db/redis/bayes/

replicaof localhost 6478

maxmemory 600M
```

`/usr/local/etc/redis-fuzzy.conf`:

```sh
include /usr/local/etc/redis.conf

port 6377

pidfile /var/run/redis/fuzzy.pid
logfile /var/log/redis/fuzzy.log
dbfilename fuzzy.rdb
dir /var/db/redis/fuzzy/

replicaof localhost 6477
```

As `replicas` do not connect to `masters` directly, `stunnel's` sockets are specified in the `replicaof` directives.

## Starting Redis on the replica

`# service redis start`

## Checking

Check replica instances logs. If resynchronization with the masters was successful, you are done.

## Rspamd configuration on the master

On the `master` side configure Rspamd to use distinct Redis instances respectively:

`local.d/redis.conf`:

```hcl
servers = "localhost";
```

`local.d/classifier-bayes.conf`:

```hcl
backend = "redis";
servers = "localhost:6378";
```

`override.d/worker-fuzzy.inc`:

```hcl
backend = "redis";
servers = "localhost:6377";
```

## Rspamd configuration on the replica

On the `replica` side Rspamd should use local `redis` instance for both reading and writing as it is not replicated.

`local.d/redis.conf`:

```hcl
servers = "localhost";
```

Since local `bayes` and `fuzzy` Redis instances are replicas, Rspamd should use them for reading, but write to the replication `master`.

`local.d/classifier-bayes.conf`:

```hcl
backend = "redis";
read_servers = "localhost:6378";
write_servers = "localhost:6478";
```

`override.d/worker-fuzzy.inc`:

```hcl
backend = "redis";
read_servers = "localhost:6377";
write_servers = "localhost:6477";
```
