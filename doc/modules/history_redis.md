---
layout: doc
title: Redis history module
---

# Redis history module

The purpose of this module is to enable the storage of history in Redis lists with increased precision, thanks to its finer control over fields, optional compression, and out-of-the-box cluster support.

## Storage model

This module stores keys as follows:

1. Get key prefix
2. Append hostname
3. Append `_zst` if history is compressed

In addition, there is a special set where suffixes are stored, and the keyname for this set is simply `key_prefix`. For example, if there is a host `example.local` and it stores compressed history entries, it will save the following element if `key_prefix` is set: `example.local_zst`.

## Compression

Rspamd uses [zstd](https://facebook.github.io/zstd/) compression, which is highly efficient for both compression and decompression, offering a typical compression rate of 50% for history elements. As long as you have sufficient computational power, it is recommended to use zstd in order to minimize Redis memory usage when storing elements.

## WebUI support

The Web Interface automatically recognises that history is stored in Redis and loads it appropriately.

## Configuration

The configuration of this module is pretty straightforward (use `local.d/history_redis.conf` to define your own values):

~~~hcl
servers = 127.0.0.1:6379; # Redis server to store history
expire = 432000; # Expire in seconds for inactive keys, default to 5 days
nrows = 200; # Default rows limit
compress = true; # Use zstd compression when storing data in Redis
subject_privacy = false; # Subject privacy is off
~~~

**Note:** Reducing the `expire` value can result in a one-time situation where newer entries are deleted before older ones, creating a gap in the middle of the history.
