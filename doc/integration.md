---
layout: doc
title: Rspamd integration
---

# Rspamd integration

This document describes several methods of integration rspamd to popular MTA. Among them are:
* exim
* postfix
* sendmail
* haraka

Also this document describes rspamd smtp proxy mode suitable for any MTA.

## Integration with exim MTA

Exim may use rspamd just like spamd from SA. But for more convenient interaction it is useful to apply a patch to exim that improves communication.

### Using spam.c patch

For FreeBSD users you can just enable integration with rspamd when building exim from the ports by typing 

	# make config

and selecting the appropriate option in the dialog.

For other systems and exim < 4.86 there is a patch which placed in rspamd source tree: src/contrib/exim/patch-exim-src_spam.c.diff

It should be applied in exim's source directory:

{% highlight sh %}
# If using Exim 4.85, patch the patch first
patch -p1 patch-exim-src_spam.c.diff < patch-exim-src_spam.c.diff.exim-4.85.diff
# For Exim 4.70 to 4.84, or after patching for 4.85
patch -p1 < patch-exim-src_spam.c.diff
{% endhighlight %}

After patching you can use rspamd just like spamassassin spamd. Here is an example of such configuration:

{% highlight make %}
spamd_address = 127.0.0.1 11333 variant=rspamd

acl_smtp_data = acl_check_spam


acl_check_spam:
  ## do not scan messages submitted from our own hosts
  # accept hosts = +relay_from_hosts
  ## do not scan messages submitted by authenticated users
  # accept authenticated = *
  ## send messages to rspamd for processing
  warn    spam = nobody
  ## retry failed scans
  # warn  condition = ${if eq{$spam_action}{}}
  #       spam = nobody
  #       log_message = Retrying failed scan
  ## add spam-score header
  warn    condition = ${if eq{$spam_action}{add header}}
          message = X-Spam-Score: $spam_score ($spam_bar)
  ## add report header
  warn    condition = ${if eq{$spam_action}{add header}}
          message = X-Spam-Report: $spam_report
  ## handle outbound spam differently (check for $acl_m_userspam in routers)
  accept  authenticated = *
          condition = ${if match{$spam_action}{^reject\$|^add header\$}}
          set acl_m_userspam = 1
  ## discard high-scoring mail
  deny    condition = ${if eq{$spam_action}{reject}}
          message = Message discarded as high-probability spam
{% endhighlight %}

The other ways for integration with exim are local scan patch and dlfunc.

### Using local scan

To enable exim local scan please copy file from contrib/exim directory to exim source tree: Local/local_scan.c, edit Local/Makefile to add
{% highlight make %}
LOCAL_SCAN_SOURCE=Local/local_scan.c
LOCAL_SCAN_HAS_OPTIONS=yes
{% endhighlight %}
and compile exim.
For exim compilation with local scan feature details please visit [exim specification](http://www.exim.org/exim-html-current/doc/html/spec_html/ch42.html).

#### Example configuration
{% highlight make %}
local_scan_timeout = 50s

begin local_scan
       rspam_ip = 127.0.0.1
       rspam_port = 11333
       rspam_skip_sasl_authenticated = true
       # don't reject message if on of recipients from this list
       rspam_skip_rcpt = postmaster@example.com : some_user@example.com
       rspam_message = "Spam rejected; If this is not spam, please contact <postmaster@example.com>"
{% endhighlight %}

### Using dlfunc

For using dlfunc please visit <http://mta.org.ua/exim-4.70-conf/dlfunc/rspamd/> get provided file (rspamd.c) and examine sample configuration. For building of rspamd dlfunc you may use the following command:

	cc rspamd.c -fPIC -fpic -shared -I<exim_directory>/build-<exim_build_system>/ -o exim-dlfunc.so

## Using rspamd with postfix MTA

For using rspamd in postfix it is required to use milter. I'd recommend to use special milter that support rspamd checks - rmilter. Rmilter can be obtained from github as well: <http://github.com/vstakhov/rmilter>.

### Configuring rmilter to work with rspamd

First of all build and install rmilter:

	% ./configure
	% make
	# make install

Then copy rmilter.conf.sample to rmilter.conf and edit parameters. All parameters are described in rmilter.8 manual page. Here is an example of configuration of rspamd:

{% highlight nginx %}
spamd {
        # use rspamd action for greylisting
        spamd_greylist = yes;
        
        # use rspamd action for messages
        spamd_soft_fail = yes;

        # add extended headers for messages
        extended_spam_headers = yes;

        # servers - spamd socket definitions in format:
        # /path/to/file
        # host[:port]
        # sockets are separated by ','
        # Default: empty
        servers = r:spam1.example.com:11333, r:spam2.example.com;

        # connect_timeout - timeout in miliseconds for connecting to rspamd
        # Default: 1s
        connect_timeout = 1s;

        # results_timeout - timeout in miliseconds for waiting for rspamd response
        # Default: 20s
        results_timeout = 60s;

        # error_time - time in seconds during which we are counting errors
        # Default: 10
        error_time = 10;

        # dead_time - time in seconds during which we are thinking that server is down
        # Default: 300
        dead_time = 300;

        # maxerrors - maximum number of errors that can occur during error_time to make us thinking that
        # this upstream is dead
        # Default: 10
        maxerrors = 10;

        # reject_message - reject message for spam
        reject_message = "Spam message rejected; If this is not spam contact abuse at example.com";

        # whitelist - list of ips or nets that should be not checked with spamd
        # Default: empty
        whitelist =
                10.0.0.0/8;
        
}
{% endhighlight %}

This configuration allows milter to use rspamd actions for messages (including greylisting). Default settings are just reject or not a message according to rspamd reply.

### Configuring postfix

Postfix configuration to use rspamd via rmilter is very simple:

{% highlight make %}
smtpd_milters = unix:/var/run/rmilter/rmilter.sock
# or for TCP socket
# smtpd_milters = inet:localhost:9900
milter_protocol = 6
milter_mail_macros = i {mail_addr} {client_addr} {client_name} {auth_authen}
# skip mail without checks if milter will die
milter_default_action = accept
{% endhighlight %}

## Using rspamd with sendmail MTA

Sendmail can use rspamd via rmilter as well as postfix.

And configure it just like for postfix. Sendmail configuration may be like this:

	INPUT_MAIL_FILTER(`rmilter', `S=unix:/var/run/rmilter/rmilter.sock, F=T')
	define(`confINPUT_MAIL_FILTERS', `rmilter')

Then compile m4 to cf in an ordinary way.

## Integration with Haraka MTA

A plugin implementing Rspamd integration for Haraka can be found in the [Haraka git repository](https://github.com/baudehlo/Haraka/); documentation can be found [here](https://github.com/baudehlo/Haraka/blob/master/docs/plugins/rspamd.md).

To install: copy `plugins/rspamd.js` to your local plugins directory and `config/rspamd.ini` to your local config directory; add `rspamd` to your `config/plugins` file in the `DATA` section and edit `config/rspamd.ini` to suit.
