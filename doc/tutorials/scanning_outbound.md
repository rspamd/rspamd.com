---
layout: doc
title: Scanning outbound mail
---
# Scanning outbound mail

## Why and how to scan outbound mail

Sending outbound spam can have serious negative impacts on the ability of your system to deliver mail effectively. To prevent these issues, it is important to avoid sending spam. If an outbound spam outbreak is detected, it may be necessary to take incident response measures, such as changing the passwords of affected accounts. It may also be helpful to verify the authenticity of the spam through human analysis, though this may violate privacy laws or company policies. It is important to consult with legal counsel and relevant stakeholders to determine the appropriate course of action for handling suspected outbound spam. Please note that this document does not provide specific guidance on how to handle such mail (though it may be expanded in the future to include example strategies).

## Scanning outbound with Rspamd

Rspamd is designed to be easily configured for outbound scanning. With proper [integration]({{ site.url }}{{ site.baseurl }}/doc/integration.html) Rspamd  can identify the authenticated user and IP address that a mail was sent from. If mail was received from an authenticated user or an IP address listed in [local_addrs]({{ site.url }}{{ site.baseurl }}/doc/configuration/options.html) several checks are automatically disabled: 

 - [ASN]({{ site.url }}{{ site.baseurl }}/doc/modules/asn.html): checking is disabled for local IPs, unless `check_local` is set to `true`
 - [DKIM]({{ site.url }}{{ site.baseurl }}/doc/modules/dkim.html): checking is disabled; signing is **enabled** on the contrary if the appropriate key and rule are found
 - [DMARC]({{ site.url }}{{ site.baseurl }}/doc/modules/dmarc.html): is disabled
 - [Greylist]({{ site.url }}{{ site.baseurl }}/doc/modules/greylisting.html): is disabled
 - [HFilter]({{ site.url }}{{ site.baseurl }}/doc/modules/hfilter.html): only URL-checks are applied
 - [MX Check]({{ site.url }}{{ site.baseurl }}/doc/modules/mx_check.html): is disabled
 - [One Received header policy]({{ site.url }}{{ site.baseurl }}/doc/modules/once_received.html): is disabled
 - [Ratelimit]({{ site.url }}{{ site.baseurl }}/doc/modules/ratelimit.html): only `user` ratelimit is applied (to authenticated users - does not deal with `local_addrs`)
 - [RBL]({{ site.url }}{{ site.baseurl }}/doc/modules/rbl.html): RBLs are disabled according to `exclude_users` and `exclude_local` settings for RBL rules (for example, URL lists should be checked for all directions)
 - [Replies]({{ site.url }}{{ site.baseurl }}/doc/modules/replies.html): action is not forced
 - [SPF]({{ site.url }}{{ site.baseurl }}/doc/modules/spf.html): is disabled

Additionally, it is possible to disable/enable checks selectively and/or rescore checks for your authenticated users or relay IPs using [settings module]({{ site.url }}{{ site.baseurl }}/doc/configuration/settings.html).

### MTA with milter support (e.g. Postfix or Sendmail)

You might want to add `non_smtpd_milters` setting to point Rspamd proxy worker for scanning of the emails that are sent directly via `sendmail` or other local delivery agent. Here is an example for Postfix MTA:

~~~
# postfix/main.cf
smtpd_milters=inet:127.0.0.1:11332 # For inbound scan or outbound scan via SMTP
non_smtpd_milters=inet:127.0.0.1:11332 # For invocation via LDA
~~~

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
