---
layout: doc
title: SPF module
---
# SPF module

SPF module performs checks of the sender's [SPF](http://www.open-spf.org/) policy.
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
In addition, you can assign some parameters such as maximum number of recursive DNS subrequests (e.g. includes chain
length), maximum count of DNS requests per record, minimum TTL enforced for all elements in SPF records, disable all IPv6
lookups.

## Example configuration

~~~ucl
# local.d/spf.conf

	spf_cache_size = 1k; # cache up to 1000 of the most recent SPF records
	spf_cache_expire = 1d; # default max expire for an element in this cache
	max_dns_nesting = 10; # maximum number of recursive DNS subrequests
	max_dns_requests = 30; # maximum count of DNS requests per record
	min_cache_ttl = 5m; # minimum TTL enforced for all elements in SPF records
	disable_ipv6 = false; # disable all IPv6 lookups
	whitelist = "/path/to/some/file"; # whitelist IPs from checks
~~~

## Using SPF with forwarding

If your MTA is placed behind some trusted forwarder you can still check SPF policies for the originating domains and IP addresses. Please consider checking the [external relay](external_relay.html) documentation. There is a legacy option `external_relay` in SPF plugin itself but it is kept for compatibility and should not be used nowadays.
