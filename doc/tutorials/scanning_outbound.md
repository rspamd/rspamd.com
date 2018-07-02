---
layout: doc
title: Scanning outbound mail
---
# Scanning outbound mail

## Why and how to scan outbound mail

Outbound spam can be extremely damaging to the ability of your system to successfully deliver mail so it is pragmatic to avoid delivering spam. Unlike inbound spam, outbound spam outbreaks require incident response (e.g. changing passwords of affected accounts). If the spam outbreak was identified by automated content scanning human verification could be helpful - but may be in violation of applicable privacy laws or company policies. Please consult your legal counsel & company stakeholders to determine policies regarding handling of suspected outbound spam that are suitable for your purposes. How such mail should ultimately be handled is beyond the scope of this document (though it may eventually be extended to provide some example recipes).

## Scanning outbound with Rspamd

Rspamd tries to be suitable for outbound scanning with no or little configuration. With proper [integration]({{ site.url }}{{ site.baseurl }}/doc/integration.html) Rspamd should have knowledge of whether mail was sent by an authenticated user (and which) as well as the IP address the mail was received from. If mail was received from an authenticated user or an IP address listed in [local_addrs]({{ site.url }}{{ site.baseurl }}/doc/configuration/options.html) several checks are immutably disabled: 

 - [ASN]({{ site.url }}{{ site.baseurl }}/doc/modules/asn.html): checking is disabled for local IPs, unless `check_local` is set to `true`
 - [DKIM]({{ site.url }}{{ site.baseurl }}/doc/modules/dkim.html): checking is disabled; signing is enabled
 - [DMARC]({{ site.url }}{{ site.baseurl }}/doc/modules/dmarc.html): is disabled
 - [Greylist]({{ site.url }}{{ site.baseurl }}/doc/modules/greylisting.html): is disabled
 - Hfilter: only URL-checks are applied
 - [IP Score]({{ site.url }}{{ site.baseurl }}/doc/modules/ip_score.html): is disabled
 - [MX Check]({{ site.url }}{{ site.baseurl }}/doc/modules/mx_check.html): is disabled
 - [One Received header policy]({{ site.url }}{{ site.baseurl }}/doc/modules/once_received.html): is disabled
 - [Ratelimit]({{ site.url }}{{ site.baseurl }}/doc/modules/ratelimit.html): only `user` ratelimit is applied (to authenticated users - does not deal with `local_addrs`)
 - [RBL]({{ site.url }}{{ site.baseurl }}/doc/modules/rbl.html): RBLs are disabled according to `exclude_users` and `exclude_local` settings (all save for `RAMBLER_EMAILBL`)
 - [Replies]({{ site.url }}{{ site.baseurl }}/doc/modules/replies.html): action is not forced
 - [SPF]({{ site.url }}{{ site.baseurl }}/doc/modules/spf.html): is disabled

Additionally, it is possible to disable/enable checks selectively and/or rescore checks for your authenticated users or relay IPs using [settings module]({{ site.url }}{{ site.baseurl }}/doc/configuration/settings.html).

### Rmilter

To enable scanning of outbound mail you should set `strict_auth = true`, see [here]({{ site.baseurl }}/rmilter/configuration.html) for more information (deprecated since Rspamd 1.6).

### Exim

Here is an example configuration suitable for filtering outbound email.

~~~
# Global options
spamd_address = 127.0.0.1 11333 variant=rspamd
acl_smtp_data = acl_check_data

begin acl

acl_check_data:
  # Set default value for a variable
  warn
    set acl_m_outspam = 0
  # Always scan mail
  warn
    spam = nobody:true
  # Honor "reject" action for inbound mail...
  deny
    ! authenticated = *
    condition = ${if eq{$spam_action}{reject}}
    message = Discarded high-probability spam
  # If it's our user set acl_m_outspam = 1 instead
  warn
    authenticated = *
    condition = ${if eq{$spam_action}{reject}}
    set acl_m_outspam = 1
  accept

begin routers

# Apply special handling to messages with $acl_m_outspam==1
redirect_outbound_spam:
  driver = redirect
  condition = ${if eq{$acl_m_outspam}{1}}
  data = admin@example.com
# <rest of configuration>
~~~

See the [Exim specification](http://www.exim.org/exim-html-current/doc/html/spec_html/) for more information.

### Haraka

To enable scanning of outbound mail set the following in `config/rspamd.ini`:

~~~
[check]
authenticated=true
~~~

If you wish to honor `reject` action for authenticated users set the following:
~~~
[reject]
authenticated=true
~~~
