---
layout: doc
title: Data usage policy
---

# Rspamd fuzzy feed, DNSBL and site usage policies

If you use Rspamd [fuzzy feeds](https://rspamd.com/doc/modules/fuzzy_check.html) and/or Rspamd URLs/Emails black lists then you need to understand the existing limits and whether you are qualifying for the free usage terms.

We cover here fuzzy storage feeds, DNS lists (specifically URLs and Emails black lists) and `rspamd.com` site usage for maps distribution. In future that could be extended to other intelligence resources provided by `rspamd.com`.

## Free usage policy

We provide infrastructure to collect spam messages data and algorithms to convert spam waves to a usable set of blocked fuzzy hashes, urls and emails. All these operations require both hardware and human resources. Hence, we define `fair usage` policies to use these services.

To qualify for free usage of the feeds you must satisfy the following conditions:

1. Your use of the data is **non-commercial**

    **and**

2. Your query volume is less than **500,000 queries per day**

If you qualify (1) and (2) but still got blocked then please contact us by using our email address: <mailto:support@rspamd.com>

## Vendors policies

Rspamd maps check are typically running quietly in the background. When servers are chosen they will typically remain in the configuration "forever". If the client traffic causes trouble for the server it is extremely difficult to mitigate if not carefully planned for in advance.

For example, there was an [incident](https://www.reddit.com/r/synology/comments/f5jczp/mailplus_server_and_rspamdcom/) that caused troubles for both Rspamd project and the vendor's users.

Hence, we are kindly asking to [contact us](mailto:support@rspamd.com) before embedding Rspamd in any sort of commercial or open source project. In this way, we could decide about the strategy to avoid issues with the embedded solution in future.

## Premium service

If you do not qualify these definitions than you could either stop using this service or contact us for a premium service that is mainly intended to cover our costs to provide free access. Please use the same email address for enquiries: <mailto:support@rspamd.com>

Another benefit of the premium service is that it has more hashes and longer retention policies, furthermore the latency between spamtrap hit and fuzzy hash being placed in the storage is lower than for free storage. In some extreme cases you can also have your local storage synchronized with our storage to provide in-premises intelligence access if needed.

This service also includes `rsync` based access to URLs and Emails feeds so you can use your own [rbldnsd](https://github.com/rspamd/rbldnsd) to serve this data with no delays to your email scanners.
