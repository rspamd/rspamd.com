---
layout: post
title: "IP changed for rspamd.com"
categories: announce
---

## Synopsis

We have migrated hardware that served <https://rspamd.com> site and related services including [fuzzy storage](https://rspamd.com/doc/modules/fuzzy_check.html).

## Problem description

All Rspamd users who are using `rspamd.com` fuzzy storage might see the following messages in the log:

```
fuzzy_check_timer_callback: got IO timeout with server rspamd.com(5.9.155.182), after 3 retransmits
```

Normally, Rspamd re-resolves hostnames in this case. However, if there is a single server specified (as enabled by default) there is no resolving on errors. Unfortunately, this bug has been [fixed](https://github.com/vstakhov/rspamd/commit/81d002bdfe667692e75845474d781a7aed49e9f6) merely in the master branch and is not released in the stable versions yet.

## Potential outcome

The quality of filtering might be temporary reduced as fuzzy storage helps to filter certain spam types.

## Workaround

You just need to restart Rspamd and it will use the new IP address as intended. We do apologise for any inconveniences caused.
