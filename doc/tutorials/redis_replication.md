---
layout: doc
title: Bayesian statistics and fuzzy storage replication with multi-instance Redis backend
---
# Bayesian statistics and fuzzy storage replication with multi-instance Redis backend

This step-by-step tutorial will explain how to establish statistics and fuzzy storage replication on FreeBSD. Configuration procedures for other operating systems are very similar. 

This tutorial describes a centralized model when Bayesian classifier and fuzzy storage learning is performed on one host and distributed among Rspamd installations at remote locations. For simplicity, the tutorial only covers replication to one `replica` database for each of the `masters`.

To accomplish this we should replicate bayes and fuzzy storage backend data to the remote host. As the rest of the Redis cache should not be mirrored we need to use dedicated Redis instances. Probably separating bayes and fuzzy is good idea as well.

We will create 3 Redis instances on both `master` and `replica` sides: `bayes`, `fuzzy` and `redis` for the rest of the cache:

|instance|Redis socket|
|---|---|
|`redis`|localhost:6379|
|`bayes`|localhost:6378|
|`fuzzy`|localhost:6377|

## Installation

First install the `databases/redis` package:

```sh
# pkg install redis
```

Create separate working directories for instances:

```sh
# cd /var/db/redis && mkdir bayes fuzzy && chown redis bayes fuzzy
```

To enable `redis` and its specific instances add the following lines to the `/etc/rc.conf`:

```sh
redis_enable="YES"
redis_profiles="redis bayes fuzzy"
```

Enable Redis logs rotation by creating a newsyslog configuration file `/usr/local/etc/newsyslog.conf.d/redis.newsyslog.conf`:

```sh
# logfilename          [owner:group]    mode count size when  flags [/pid_file] [sig_num]
/var/log/redis/redis.log    redis:redis    644  5       100    *  J
/var/log/redis/bayes.log    redis:redis    644  5       100    *  J
/var/log/redis/fuzzy.log    redis:redis    644  5       100    *  J
```

## Configuration

Create the default configuration on both `master` and `replica` (common for all of the instances):

```sh
# cp /usr/local/etc/redis.conf.sample /usr/local/etc/redis.conf
```

Since it is not safe to expose Redis to external interfaces, configure Redis to listen on loopbacks and use `stunnel` to create TLS tunnels between `replica` and `master` hosts. As this approach has security vulnerabilities as well, **you should not setup replication** if the replica host's users cannot be trusted.

Set listening sockets and memory limit (optional) as follows:

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

Configure the `redis` instance on both `master` and `replica` in a manner to keep it compatible with a single instance configuration. So if you already had a single instance database it will keep working.

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

```ucl
servers = "localhost";
```

`local.d/classifier-bayes.conf`:

```ucl
backend = "redis";
servers = "localhost:6378";
```

`override.d/worker-fuzzy.inc`:

```ucl
backend = "redis";
servers = "localhost:6377";
```

## Rspamd configuration on the replica

On the `replica` side Rspamd should use local `redis` instance for both reading and writing as it is not replicated.

`local.d/redis.conf`:

```ucl
servers = "localhost";
```

Since local `bayes` and `fuzzy` Redis instances are replicas, Rspamd should use them for reading, but write to the replication `master`.

`local.d/classifier-bayes.conf`:

```ucl
backend = "redis";
read_servers = "localhost:6378";
write_servers = "localhost:6478";
```

`override.d/worker-fuzzy.inc`:

```ucl
backend = "redis";
read_servers = "localhost:6377";
write_servers = "localhost:6477";
```
