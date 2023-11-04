---
layout: doc
title: Redis history module
---

# Redis history module

The purpose of this module is to enable the storage of history in Redis lists with increased precision, thanks to its finer control over fields, optional compression, and out-of-the-box cluster support.

## Storage model

This module stores keys as following:

1. Get key prefix
2. Append hostname
3. Append `_zst` if history is compressed

In addition, there is a special set where suffixes are stored, and the keyname for this set is simply `key_prefix`. For example, if there is a host `example.local` and it stores compressed history entries then it will save the following element if `key_prefix` set: `example.local_zst`.

## Compression

Rspamd uses [zstd](https://facebook.github.io/zstd/) compression, which is highly efficient for both compression and decompression, offering a typical compression rate of 50% for history elements. As long as you have sufficient computational power, it is recommended to use zstd in order to minimize Redis memory usage when storing elements.

## WebUI support

Web Interface automatically recognises that history is stored in Redis and load it appropriately.

## Configuration

The configuration of this module is pretty straightforward (use `local.d/history_redis.conf` to define your own values:

~~~hcl
servers = 127.0.0.1:6379; # Redis server to store history
key_prefix = "rs_history"; # Default key name
nrows = 200; # Default rows limit
compress = true; # Use zstd compression when storing data in Redis
subject_privacy = false; # subject privacy is off
~~~
