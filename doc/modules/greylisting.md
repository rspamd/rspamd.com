---
layout: doc
title: Greylisting module
---

# Greylisting module
{:.no_toc}

The purpose of this module is to delay messages that have a spam score above the `greylisting` action threshold.

<div id="toc" markdown="1">
  <h2 class="toc-header">Contents</h2>
  * TOC
  {:toc}
</div>

## Principles of work

When the Greylisting module is enabled, two hashes are saved for each message in Redis:

* **meta** hash is based on triplet `from`:`to`:`ip`
* **data** hash is taken from the message's body if it has enough length for it

IP address is stored with certain mask applied: it is `/19` for IPv4 and `/64` for IPv6 accordingly. Each hash has its own timestamp and Rspamd checks for the following times:

* `greylisting` time - when a message should be temporary rejected
* `expire` time - when a greylisting hash is stored in Redis

The hashes lifetime is depicted in the following scheme:

<img class="img-responsive" width="75%" src="{{ site.baseurl }}/img/greylisting.png">

The greylisting module triggers a `soft reject` action, which is intended to be interpreted by the MTA as a temporary rejection (typically through the Milter interface). For Exim, you can configure it to recognize `soft reject` using the guidelines provided in the [integration guide]({{ site.baseurl }}/doc/integration.html#integration-with-exim-mta) for details. For Haraka, support is available from version 2.9.0 onward.

## Module configuration

To use the greylisting module, you must first set up a Redis server to store hashes. You can find detailed instructions on how to do this in the [following document]({{ site.baseurl }}/doc/configuration/redis.html). Once the Redis server is set up, you can modify a few specific options for the greylisting module. It is recommended that you define these options in `local.d/greylist.conf`:

* **`expire`**: setup hashes expire time (1 day by default)
* **`greylist_min_score`**: messages with scores below this threshold are not greylisted (default unset)
* **`ipv4_mask`**: mask to apply for IPv4 addresses (19 by default)
* **`ipv6_mask`**: mask to apply for IPv6 addresses (64 by default)
* **`key_prefix`**: prefix for hashes to store in Redis (`rg` by default)
* **`max_data_len`**: maximum length of data to be used for body hash (10kB by default)
* **`message`**: a message for temporary rejection reason (`Try again later` by default)
* **`timeout`**: defines greylisting timeout (5 min by default)
* **`whitelisted_ip`**: map of IP addresses and/or subnets to skip greylisting for
* **`whitelist_domains_url`**: map of hostnames and/or eSLDs of hostnames to skip greylisting for
* **`report_time`**: tell when greylisting is expired (appended to `message`)
* **`whitelist_symbols`**: skip greylisting when specific symbols have been found (from 1.9.1)

If you want to skip greylisting based on other conditions, you can simply disable the `GREYLIST_CHECK` and `GREYLIST_SAVE` symbols using the [settings module]({{ site.baseurl }}/doc/configuration/settings.html).

To enable the module with its default settings, you must define at least one [redis]({{ site.baseurl }}/doc/configuration/redis.html) server to store greylisting data. You can do this by adding the following lines to `local.d/greylist.conf`:

~~~ucl
# local.d/greylist.conf
servers = "127.0.0.1:6379";
~~~

Adding servers to store greylisting data enables greylisting in Rspamd.
