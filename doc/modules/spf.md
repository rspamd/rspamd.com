---
layout: doc
title: SPF module
---
# SPF module

SPF module performs checks of the sender's [SPF](http://www.openspf.org/) policy.
Many mail providers uses SPF records to define which hosts are eligible to send email
for this specific domain. In fact, there are many possibilities to create and use
SPF records, however, all they check merely the sender's domain and the sender's IP.

The specific case are automated messages from the special mailer daemon address:
`<>`. In this case Rspamd uses `HELO` to grab domain information as specified in the
standard.

## Principles of work

`SPF` can be a powerful tool when properly used. However, it is very fragile in many
cases: when a message is somehow redirected or reconstructed by mailing lists software.

Moreover, many mail providers have no clear understanding of this technology and
misuse the SPF technique. Hence, the scores for SPF symbols are relatively small
in Rspamd.

SPF uses DNS service extensively, therefore Rspamd maintain the cache of SPF records.
This cache operates on principle of `least recently used` expiration. All cached item
lifetimes are accordingly limited by the matching DNS record time to live.

You can manually specify the size and max expire of this cache by configuring SPF module.
In addition, you can to assign some parametres such as maximum number of recursive DNS subrequests (e.g. includes chanin
length), maximum count of DNS requests per record, minimum TTL enforced for all elements in SPF records, disable all IPv6
lookups and specify an IP addresses for which the SPF check will not be used.

~~~ucl
spf {
	spf_cache_size = 1k; # cache up to 1000 of the most recent SPF records
	spf_cache_expire = 1d; # default max expire for an element in this cache
	max_dns_nesting = 10; # maximum number of recursive DNS subrequests
	max_dns_requests = 30; # maximum count of DNS requests per record
	min_cache_ttl = 5m; # minimum TTL enforced for all elements in SPF records
	disable_ipv6 = false; # disable all IPv6 lookups
	whitelist = "/path/to/some/file"; # whitelist IPs from checks
}
~~~

Also, you can specify the IP addresses of external relays for checking the SPF Policy of the real sender.

~~~ucl
spf {
	external_relay = "192.168.1.1"; # use IP address from a received header produced by this relay (using by attribute)
}
~~~

For example, in mail's header below, Rspamd will check SPF policy for IP 77.77.77.77, provided that IP 192.168.1.1 was
specified as external relay by configuring SPF module.

~~~ucl
Received: from external-relay.com (external-relay.com [192.168.1.1]) by
 external-relay.com with LMTP id MJX+NoRd5F2caAAAzslS3g for <test@example.com>;
 Thu, 5 Dec 2019 18:22:18 +0300
Received: from test.com (test.com [77.77.77.77]) by
 external-relay.com (Postfix) with ESMTP id C018DA00021;
 Thu, 5 Dec 2019 18:22:18 +0300
To: test@example.com
From: root@test.com
~~~

Currently, Rspamd supports the full set of SPF elements, macros and has internal
protection from DNS recursion.
