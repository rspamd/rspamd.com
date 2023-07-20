---
layout: doc
title: Scanning outbound mail
---
# Scanning outbound mail

## Why and how to scan outbound mail

Sending outbound spam can have severe negative consequences on your system's email delivery capabilities. It is crucial to prevent the occurrence of spam and its associated issues. In the event of an outbreak of outbound spam, it may become necessary to initiate incident response measures, such as changing the passwords of affected accounts. Conducting human analysis to verify the authenticity of the spam may also be beneficial, but it is essential to consider privacy laws and company policies, as this analysis could potentially infringe upon them. To determine the appropriate actions for dealing with suspected outbound spam, it is advisable to seek advice from legal experts and involve relevant stakeholders. Please be aware that this document does not offer specific guidance on handling such emails, although it may be expanded in the future to include illustrative strategies.

## Scanning outbound with Rspamd

Rspamd is specifically designed to facilitate straightforward configuration for outbound scanning. With proper [integration]({{ site.url }}{{ site.baseurl }}/doc/integration.html) Rspamd  can identify the authenticated user and IP address that a mail was sent from. If mail was received from an authenticated user or an IP address listed in [local_addrs]({{ site.url }}{{ site.baseurl }}/doc/configuration/options.html) several checks are automatically disabled: 

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

To enable Rspamd to scan emails sent directly via `sendmail` or other local delivery agents, you can include the `non_smtpd_milters` setting in the configuration. This will direct the Rspamd proxy worker to perform the scanning. Here is an example configuration for Postfix MTA:

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

See the [Exim specification](https://www.exim.org/exim-html-current/doc/html/spec_html/) for more information.

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
