---
layout: doc
title: Redis history module
---

# Redis history module

This module is intended to store history in Redis list with more fine-grained control over fields, optional compression and out-of-the box cluster support.

## Storage model

This module stores keys as following:

1. Get key prefix
2. Append hostname
3. Append `_zst` if history is compressed

There is also a special set where suffixes are stored, keyname for it is just `key_prefix`. For example, if there is a host `example.local` and it stores compressed history entries then it will save the following element if `key_prefix` set: `example.local_zst`.

## Compression

Rspamd uses [zstd](https://zstd.net) compression. It is very fast for both compression and decompression and provides typically 50% compression rate for history elements. It should be used whenever you have enough computational power as it allows to reduce Redis memory footprint when storing elements.

## WebUI support

Web Interface automatically recognises that history is stored in Redis and load it appropriately.

## Configuration

The configuration of this module is pretty straightforward (use `local.d/history_redis.conf` to define your own values:

~~~ucl
servers = 127.0.0.1:6379; # Redis server to store history
key_prefix = "rs_history"; # Default key name
nrows = 200; # Default rows limit
compress = true; # Use zstd compression when storing data in Redis
subject_privacy = false; # subject privacy is off
~~~
