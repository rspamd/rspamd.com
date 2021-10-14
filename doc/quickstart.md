---
layout: doc
title: Quickstart
---

# Rspamd quick start
{:.no_toc}

This guide describes the main steps to get and start working with Rspamd. In particular, we describe the following setup:

- Ubuntu Bionic (or another OS with systemd)
- Postfix MTA
- Redis cache
- Dovecot with Sieve plugin to sort mail and learn by moving messages to `Junk` folder

<div id="toc" markdown="1">
  <h2 class="toc-header">Contents</h2>
  * TOC
  {:toc}
</div>

## Alternative guides (3rd party)

* [An alternative introduction to rspamd configuration](https://www.0xf8.org/2018/05/an-alternative-introduction-to-rspamd-configuration-introduction/){:target="&#95;blank"} - a detailed information about Rspamd configuration files and their purposes from the sysadmin point of view: concentrating on two main questions “What is there to configure?” and “How do I configure things?”.
* [Own mail server based on Dovecot, Postfix, MySQL, Rspamd and Debian 9 Stretch](https://thomas-leister.de/en/mailserver-debian-stretch/){:target="&#95;blank"} - a good example of all-in-one tutorial about how to setup your own mail server. Please bear in mind that the advice of adding `level = error` to /etc/rspamd/local.d/logging.inc is not correct. You should use the default `info` in the most of the cases or `silent` if you merely want important information to be logged.
* [A guide to self-hosting your email on FreeBSD using Postfix, Dovecot, Rspamd, and LDAP.](https://www.c0ffee.net/blog/mail-server-guide){:target="&#95;blank"} - similar to the previous guide but uses a different technologies stack. Here, you should ignore an advice about `url_tag` module.
* [A introduction and guide to configuring Rspamd, including examples for Multimaps](https://blog.ohmysmtp.com/blog/how-to-catch-spam-with-rspamd/){:target="&#95;blank"} - an end to end example explaining and demonstrating how Rspamd can be configured, and how to add Multimap RegEx rules

## Preparation steps

First of all, you need a working <abbr title="Mail Transfer Agent">MTA</abbr> that can send and receive email for your domain using <abbr title="Simple Mail Transfer Protocol">SMTP</abbr> protocol. In this guide, we describe the setup of the [Postfix MTA](http://www.postfix.org/){:target="&#95;blank"}. However, Rspamd can work with other MTA software - you can find details in the [integration document]({{ site.baseurl }}/doc/integration.html). Exim MTA has a very limited support of Rspamd so it is not recommended to run Exim in conjunction with Rspamd.

You should also consider to setup your own [local  DNS resolver]({{ site.baseurl }}/doc/faq.html#resolver-setup).

### TLS Setup

It is strongly recommended to setup TLS for your mail system. We suggest to use certificates issued by [Let’s&nbsp; Encrypt](https://letsencrypt.org){:target="&#95;blank"} as they are free to use and are convenient to manage. You can read more about this topic in one of the guides available on the Internet, for instance, [this one](https://www.upcloud.com/support/secure-postfix-using-lets-encrypt/){:target="&#95;blank"}.
In this guide, we assume that all services have the same certificate which might not be desired if you want greater levels of security.

### Postfix setup

We assume that you are installing Postfix with your OS's package manager (e.g. `apt install postfix`). Here is the desired configuration for Postfix:

<div><!-- Do not change the DOM structure -->
    <a class="btn btn-info btn-block btn-code" data-toggle="collapse" data-target="#main_cf">
        <i class="fa fa-caret-square-o-down fa-pull-right"></i>
        main.cf
    </a>
<div id="main_cf" class="collapse collapse-block">
<pre><code>
# TLS setup (we assume the same certs for IMAP and SMTP here)
smtpd_tls_cert_file = /etc/letsencrypt/live/your.domain/fullchain.pem
smtpd_tls_key_file = /etc/letsencrypt/live/your.domain/privkey.pem
smtpd_use_tls = yes
smtpd_tls_session_cache_database = btree:${data_directory}/smtpd_scache
smtp_tls_session_cache_database = btree:${data_directory}/smtp_scache
#smtp_tls_security_level = dane # Works only with the recent postfix
#smtp_dns_support_level = dnssec
smtpd_tls_ciphers = high
smtpd_tls_mandatory_protocols = !SSLv2, !SSLv3
smtp_tls_mandatory_ciphers = high
smtp_tls_mandatory_exclude_ciphers = RC4, MD5, DES
smtp_tls_exclude_ciphers = aNULL, RC4, MD5, DES, 3DES
# Change this for your domain
myhostname = mail.example.com
alias_maps = hash:/etc/aliases
alias_database = hash:/etc/aliases
virtual_alias_maps = hash:/etc/postfix/virtual
myorigin = /etc/mailname
mydestination = example.com, localhost, localhost.localdomain, localhost
relayhost =
mynetworks = 127.0.0.0/8 [::ffff:127.0.0.0]/104 [::1]/128 10.0.0.0/8
mailbox_size_limit = 0
recipient_delimiter = +
inet_interfaces = all
home_mailbox = Maildir/
smtpd_sasl_auth_enable = yes
smtpd_sasl_type = dovecot
smtpd_sasl_path = private/auth # Need to be enabled for Dovecot as well
smtpd_sasl_authenticated_header = yes
smtpd_sasl_security_options = noanonymous
smtpd_sasl_local_domain = $myhostname
broken_sasl_auth_clients = yes
smtpd_sender_restrictions = reject_unknown_sender_domain
mailbox_command = /usr/lib/dovecot/deliver -c /etc/dovecot/dovecot.conf -m "${EXTENSION}"
smtpd_tls_received_header = yes
smtpd_tls_auth_only = yes
tls_random_source = dev:/dev/urandom
message_size_limit = 52428800

# Setup basic SMTP attrs
smtpd_soft_error_limit = 2
smtpd_error_sleep_time = ${stress?0}${stress:10s}
smtpd_hard_error_limit = ${stress?3}${stress:20}
smtpd_recipient_limit = 100
smtpd_timeout = ${stress?30}${stress:300}
smtpd_delay_reject = no
smtpd_helo_required = yes
strict_rfc821_envelopes = yes
# Greeting delay of 7 seconds
smtpd_client_restrictions =
        check_client_access hash:/etc/postfix/access,
        permit_mynetworks,
        sleep 7,
        reject_unauth_pipelining,

smtpd_recipient_restrictions = reject_unknown_sender_domain, reject_unknown_recipient_domain, reject_unauth_pipelining, permit_mynetworks, permit_sasl_authenticated, reject_unauth_destination
smtpd_data_restrictions =
        permit_sasl_authenticated,
        permit_mynetworks,
        reject_unauth_pipelining,

smtpd_end_of_data_restrictions =
        permit_sasl_authenticated,
        permit_mynetworks,
smtpd_relay_restrictions = check_recipient_access hash:/etc/postfix/access, reject_non_fqdn_sender, reject_unknown_sender_domain, permit_sasl_authenticated, permit_mynetworks, reject_unauth_destination, reject_non_fqdn_helo_hostname, reject_invalid_helo_hostname,

# Milter setup
smtpd_milters = inet:localhost:11332
milter_default_action = accept
milter_protocol = 6

</code></pre>
</div></div>

You also need to create maps for access control and virtual aliases:

    touch /etc/postfix/virtual
    touch /etc/postfix/access
    postmap hash:/etc/postfix/virtual
    postmap hash:/etc/postfix/access

### Dovecot setup

For <abbr title="Internet Mail Access Protocol">IMAP</abbr> we recommend to install Dovecot. For Debian based systems you can use the following packages:

    apt install dovecot-imapd dovecot-sieve

Configuration of Dovecot (especially its authentication mechanisms) is a bit out of the scope for this guide but you can find many good guides at the [Dovecot main site](http://dovecot.org){:target="&#95;blank"}. By default, Dovecot uses Unix users in system and place mail into the standard mailbox `/var/mail/username`.

However, you should set up Postfix authentication. This lives in `/etc/dovecot/conf.d/10-master.conf`: make sure that you have uncommented the following lines in this file:

~~~
  # Postfix smtp-auth
  unix_listener /var/spool/postfix/private/auth {
    mode = 0666
  }
~~~

Furthermore, it might be useful to set up TLS to avoid passwords and other sensitive information to be passed through insecure connections.

~~~
# /etc/dovecot/conf.d/10-ssl.conf

ssl = required
ssl_cert = </etc/letsencrypt/live/<your.domain>/fullchain.pem
ssl_key = </etc/letsencrypt/live/<your.domain>/privkey.pem
~~~

## Caching setup

Rspamd uses [Redis](https://redis.io){:target="&#95;blank"} as a storage for non-volatile data:
- a backend for tokens storage and cache of learned messages by [statistical module](configuration/statistic.html) (BAYES classifier)
- a fuzzy storage backend (optional)

and as a cache for volatile data:

- key-value cache storage by [many Rspamd modules](configuration/redis.html#introduction)
- greylisting (delaying of suspicious emails)
- rate-limiting
- whitelisting of reply messages (storing reply message IDs to avoid certain checks for replies to our own sent messages)

Installation of Redis is quite straightforward: install it using the preferred way for your OS (e.g. from packages), start redis-server with the default settings (it should listen on the local interface using port 6379) and you are done.

We strongly recommend using a separate Redis **instance** for each module that stores non-volatile data, in particular for the statistical module (BAYES classifier) and fuzzy storage. A multi-instance Redis configuration simplifies some administration tasks (e.g. backup/restore) and makes possible to set memory limits and eviction policies, establish data replication between Rspamd installations. A detailed explanation of multi-instance Redis configuration can be found in the [Redis replication](tutorials/redis_replication.html) tutorial.

You might also want to limit the memory used by Redis at some sane value:

    maxmemory 500mb

and **for non-volatile data** Redis instances you might want to set `volatile-ttl` eviction policy:
    
    maxmemory-policy volatile-ttl

Eviction of volatile data keys can cause undesirable effects.

Please bear in mind that Redis could listen for connections from all network interfaces. This is potentially dangerous and in most cases should be limited to the loopback interfaces, with the following configuration directive:

    bind 127.0.0.1 ::1

For saving data to disk, it is also useful to setup overcommit memory behavior which might be useful for loaded systems. It could be done in Linux by using the following command:

    echo 1 > /proc/sys/vm/overcommit_memory

## Rspamd installation

The download process is described in the [downloads page]({{ site.baseurl }}/downloads.html) where you can find how to get Rspamd, how to install it in your system, and, alternatively, how to build Rspamd from the sources.

## Running Rspamd

### Platforms with systemd (Arch, CentOS 7, Debian, Fedora, Ubuntu)

Packaging should start rspamd and configure it to run on startup on installation.

You can verify it's running as follows:

```
systemctl status rspamd
```

## Configuring Rspamd

Though Rspamd's default config aims to be useful for most purposes you may wish to make some adjustments to suit your environment/tastes.

### Using of configwizard

From version 1.7, there is a configuration wizard available as `rspamadm` subcommand. This wizard can help you to configure the most commonly used features in Rspamd, for instance:

* Redis server
* Controller password
* DKIM signing for outbound

To run the wizard, use the following command:

```
rspamadm configwizard
```

This tool will guide you interactively throughout the configuration process using CLI interface.

### Manual configuration

First of all, please read the basic configuration principles [here](configuration/index.html).

It is recommended to use the special include files that are referenced in the stock configuration. Conventionally every configuration file in `/etc/rspamd/` will include two such includes:

~~~ucl
# /etc/rspamd/modules.d/imaginary_module.conf
imaginary_module {
  # there would probably be some settings in this area
  .include(try=true,priority=1,duplicate=merge) "$CONFDIR/local.d/imaginary_module.conf"
  .include(try=true,priority=10) "$CONFDIR/override.d/imaginary_module.conf"
}
~~~

Settings in `local.d` will be merged with stock configuration (where possible: ie. the setting is a list `[]` or collection `{}`) where-as settings in `override.d` will always replace the stock configuration. Unlike `rspamd.conf.local` and `rspamd.conf.override`, these include directives are effective *inside* a given block of configuration (`{}`). Similarly to `rspamd.conf.override` settings in `override.d` have higher priority than settings generated by the web interface, unlike `local.d` and `rspamd.conf.local`.

### Overriding symbols scores and actions thresholds

You can read more about actions, scores and these configuration parameters in this [explanation]({{ site.url }}{{ site.baseurl }}/doc/faq.html#what-are-rspamd-actions).

Since Rspamd 1.7, you can edit `local.d/actions.conf` for thresholds setup:

~~~ucl
# local.d/actions.conf

 reject = 150; # Reject when reaching this score
 add_header = 6; # Add header when reaching this score
 greylist = 4; # Apply greylisting when reaching this score (will emit `soft reject action`)
~~~

For symbols scores, you should redefine scores defined in `scores.d/` directory where they are placed by a symbol's group:

* `fuzzy_group.conf` - fuzzy hashes scores
* `headers_group.conf` - various headers checks
* `hfilter_group.conf` - host filter symbols
* `mime_types_group.conf` - mime types rules
* `mua_group.conf` - MUA related rules
* `neural_group.conf` - neural network produced scores
* `phishing_group.conf` - URL phishing symbols
* `policies_group.conf` - policies (DKIM, SPF, DMARC, ARC)
* `rbl_group.conf` - RBL produced rules
* `statistics_group.conf` - Bayes statistics
* `subject_group.conf` - subject checks
* `surbl_group.conf` - URL blackslists symbols

You can also change the weight of rules using the WebUI. To get the current information about symbols and scores, you can use `rspamc counters` command.

If you want to add your own rule or just change the score without taking extra care about groups, you can still use file `local.d/groups.conf` in the following way:

~~~ucl
# /etc/rspamd/local.d/groups.conf

# Just scores for Rspamd defined symbols
symbols = {
  "R_DKIM_ALLOW" = {
    score = -0.1;
  }
  "BAYES_SPAM" = {
    score = 5.0;
  }
}

# Custom user defined symbols and groups
group "mygroup" {
  symbols =  {
    "FOO" {
      score = 20.0;
    }
  }
}
~~~

### One more note about scores

There are two components of the final score in Rspamd:

```
score = runtime_score * static_score
```

Runtime score is a concept used to express confidence. For example, you
have IP reputation and it changes in range `[-1;1]` smoothly. Then you
tell that the static score for IP reputation is `3.0`. Hence,

```
score = runtime_score * static_score = 0.5 * 3.0 = 1.5
```

And you don't need to define something like

- IP_SCORE_TOO_BAD
- IP_SCORE_BAD
- IP_SCORE_SOMEHOW_BAD

... and so on to achieve this distinction.

### Other configuration advice

You should notice that individual files are included **within** sections:

    module { .include "..."; }

Hence, you don't need to repeat `module { ... }` inside the included file! Rspamd will issue an error in this case: `nested section: module { module { ... } }, it is likely a configuration error`.

In addition to equivalents to files in `/etc/rspamd/modules.d` the following includes are referenced in the stock configuration (both of `local.d`/`override.d`):

 - `classifier-bayes.conf`: included inside `classifier "bayes" {}` block
 - `logging.inc`: included inside `logging { }`
 - `options.inc`: included inside `options { }`
 - `worker-normal.inc`: included inside normal `worker {}` block
 - `worker-controller.inc`: included inside controller `worker {}` block
 - `worker-proxy.inc`: included inside rspamd_proxy `worker {}` block


### Setting listening interface

Rspamd's normal worker will, by default, listen on all interfaces on port 11333. **From Rspamd `1.7.4`, it has changed to `localhost` by default**. 

If you're running Rspamd on the same machine as your mailer (or whatever will be querying it) you might want to set this to 'localhost' instead. This option should be defined in `/etc/rspamd/local.d/worker-normal.inc`:

~~~ucl
# /etc/rspamd/local.d/worker-normal.inc
bind_socket = "localhost:11333";
~~~

If you plan to leave this as is you may wish to use a firewall to restrict access to your machine. Please review the [worker documentation]({{ site.url }}{{ site.baseurl }}/doc/workers/) for more information about `bind_socket` and related settings.

Rspamd controller worker listens on the port `11334` by default, and the proxy worker uses port `11332` accordingly.

Because Rspamd skips some checks for local networks, you may want to tune global `local_addrs` map.

~~~ucl
# /etc/rspamd/local.d/options.inc

# Local networks (default)
local_addrs = "192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12, fd00::/8, 169.254.0.0/16, fe80::/10";
~~~

Please review the [global options documentation]({{ site.url }}{{ site.baseurl }}/doc/configuration/options.html) for other global settings you may want to use.

### Setting the controller password

Rspamd requires a password when queried from non-trusted IPs, except for scanning messages which are unrestricted (the default config trusts the loopback interface). This is configured in the file `/etc/rspamd/local.d/worker-controller.inc`.

You should store an encrypted password for better security. To generate such a password just type

    $ rspamadm pw
    Enter passphrase:
    $2$g95ywihfinjqx4r69u6mgfs9cqbfq1ay$1h4bm5uod9njfu3hdbwd3w5xf5d9u8gb7i9xnimm5u8ddq3c5byy 

The config to be modified is shown below (replace 'q1' with your chosen password):

~~~ucl
# /etc/rspamd/local.d/worker-controller.inc
password = "$2$g95ywihfinjqx4r69u6mgfs9cqbfq1ay$1h4bm5uod9njfu3hdbwd3w5xf5d9u8gb7i9xnimm5u8ddq3c5byy";
~~~

Optionally you may set `enable_password` - if set, data-changing operations (such as Bayes training or fuzzy storage) will require this password. For example:

~~~ucl
# /etc/rspamd/local.d/worker-controller.inc
enable_password = "$2$qda98oexjhcf6na4mfujqjwf4qmbi545$ijkrmjx96iyj56an9jfzbba6mf1iezpog4axpeym9qhtf6nhjswy";
~~~

From version 1.7, the setting of passwords is also suggested by `rspamadm configwizard`.

**Important information**: the default passwords (namely, `q1` and `q2`) are **BANNED**, so you cannot use them in your installation. Please set the appropriate passwords before using the controller. This is done to prevent an occasional data leak caused by misconfiguration.

### Setting up the WebUI

WebUI is managed by a controller worker but you might want to proxy its requests using Nginx, for example, to add `TLS` support. Here is a minimal setup required for nginx to do that:

<div>
<a class="btn btn-info btn-block btn-code" data-toggle="collapse" data-target="#nginx_cf"><i class="fa fa-caret-square-o-down fa-pull-right"></i>nginx.conf</a><div id="nginx_cf" class="collapse collapse-block"><pre><code>
{% highlight nginx %}
worker_processes  2;
user www-data www-data;

pid        /var/run/nginx.pid;

events {
        worker_connections 8192;
        use epoll;
}

http {
    include       mime.types;
    default_type  text/plain;

    sendfile  on;
    tcp_nopush   on;
    tcp_nodelay on;

    gzip  on;

    server {
        listen 443 ssl;
        add_header Strict-Transport-Security "max-age=31536000; includeSubdomains";
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options SAMEORIGIN;
        add_header X-XSS-Protection "1; mode=block";

        include ssl.conf;
        ssl_certificate /etc/letsencrypt/live/your.domain/fullchain.pem;
        ssl_trusted_certificate /etc/letsencrypt/live/your.domain/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/your.domain/privkey.pem;

        server_name example.com;
        location / {
            root /usr/share/rspamd/www/;
            try_files $uri @proxy;
        }
        location @proxy {
                proxy_pass  http://127.0.0.1:11334;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header Host $http_host;
        }
        ssl on;
        ssl_protocols TLSv1.2 TLSv1.3;

        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:TLS:10m;
        ssl_session_timeout 1d;
        ssl_stapling on;
        ssl_stapling_verify on;
        server_tokens off;
    }
}
{% endhighlight %}
</code>
</pre>
</div>
</div>

You might also use subdirs, as suggested by [@julienmalik](https://github.com/julienmalik){:target="&#95;blank"}:

<div>
<a class="btn btn-info btn-block btn-code" data-toggle="collapse" data-target="#nginx_cf1"><i class="fa fa-caret-square-o-down fa-pull-right"></i>nginx.conf</a><div id="nginx_cf1" class="collapse collapse-block"><pre><code>
{% highlight nginx %}
location /rspamd/ {
    proxy_pass       http://localhost:11334/;

    proxy_set_header Host      $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
{% endhighlight %}
</code>
</pre>
</div>
</div>

Alternatively, you could set up HTTP authentication in Nginx itself.

## Using of Milter protocol (for Rspamd >= 1.6)

From Rspamd 1.6, rspamd proxy worker supports the `milter` protocol which is supported by some of the popular MTA, such as Postfix or Sendmail. The introducing of this feature also finally obsoletes the `rmilter` project in honor of the new integration method. Milter support is presented in `rspamd_proxy` **only**, however, there are two possibilities to use milter protocol:

* Proxy mode (for large instances) with a dedicated scan layer
* Self-scan mode (for small instances)

Here, we describe the simplest `self-scan` option:

<img class="img-responsive" src="{{ site.baseurl }}/img/rspamd_milter_direct.png">

In this mode, `rspamd_proxy` scans messages itself and talks to MTA directly using the Milter protocol. The advantage of this approach is its simplicity. Here is a sample configuration for this mode:

~~~ucl
# local.d/worker-proxy.inc
milter = yes; # Enable milter mode
timeout = 120s; # Needed for Milter usually
upstream "local" {
  default = yes; # Self-scan upstreams are always default
  self_scan = yes; # Enable self-scan
}
count = 4; # Spawn more processes in self-scan mode
max_retries = 5; # How many times master is queried in case of failure
discard_on_reject = false; # Discard message instead of rejection
quarantine_on_reject = false; # Tell MTA to quarantine rejected messages
spam_header = "X-Spam"; # Use the specific spam header
reject_message = "Spam message rejected"; # Use custom rejection message
~~~

For more advanced proxy usage, please see the corresponding [documentation]({{ site.url }}{{ site.baseurl }}/doc/workers/rspamd_proxy.html).

## Setup Redis statistics

From version 1.1, it is also possible to specify Redis as a backend for statistics and caching of learned messages. Redis is recommended for clustered configurations as it allows simultaneous learning and checking and, besides, is very fast. To set up Redis, you could specify `redis` backend for a classifier (cache is set to the same servers accordingly).

{% highlight ucl %}
# /etc/rspamd/local.d/classifier-bayes.conf
servers = "127.0.0.1";
backend = "redis";
{% endhighlight %}

Please review the full [statistics documentation]({{ site.baseurl }}/doc/configuration/statistic.html) for further information as well as the [Redis configuration documentation]({{ site.baseurl }}/doc/configuration/redis.html) if you plan to use Redis.


## Configuring maps

Another feature of Rspamd is dynamic map support. Maps are lists of values, for example, domain names or IP/networks listed in an external file or by HTTP that are periodically monitored by Rspamd and reloaded in case of updates. This technique is useful for writing your own rules, whitelisting or blacklisting some networks and so on. The important difference with maps is that Rspamd restart is not required when those lists are changed. Maps are defined as `URI` strings:

* `http://example.com/file.map` - HTTP map (server should respect `If-Modified-Since` header to avoid unnecessary updates)
* `file:///path/to/map` - file map
* `/path/to/map` - alternative syntax for file map

All maps behaves in the same way so you can have some choices about how to define a map:

1. Plain path to file or http (like `map = "http://example.com/file.txt"` or `map = "/tmp/mymap"`)
2. Composite path like `map = ["http://example.com/file.txt", "/tmp/mymap"]`. Maps data is concatenated from the sources.
3. An embedded map like `map = ["foo bar"];` or `map = ["foo 1", "bar b", "baz bababa"]` or `map = ["192.168.1.1/24", "10.0.0.0/8"]`
4. A fully decomposed object with lots of options

For the second option it is also possible to have a composite path with a fallback:

~~~ucl
exceptions = [
  "https://maps.rspamd.com/rspamd/2tld.inc.zst",
  "${DBDIR}/2tld.inc.local",
  "fallback+file://${CONFDIR}/2tld.inc"
];
~~~

In the example above `fallback+file://${CONFDIR}/2tld.inc` will be used when the first composite backend is somehow unreachable (e.g. when the first load of Rspamd or all elements are invalid).

Bear in mind that (1) and (3) can only be distinguished by making an array-like `map = ["192.168.1.1/24"]`
Historically just for the radix map (IP network ones) you could also use `map = "192.168.1.1/24"` but it is not recommended.

Within maps, you can use whitespace or comments. For example, here is an example of IP/network map:

    # Example map
    127.0.0.1 # localhost

    10.0.0.0/8
    fe80::/64

There is a special module called `multimap` that allows you to define your maps without writing Lua rules. You can check the module's [documentation]({{ site.baseurl }}/doc/modules/multimap.html) and create your configuration in `local.d/multimap.conf`.

## Configuring RBLs

Though Rspamd is free to use for any purpose many of the RBLs used in the default configuration aren't & care should be taken to see that your use cases are not infringing. Notes about specific RBLs follow below (please follow the links for details):

[Abusix Mail Intelligence](https://abusix.com/products/abusix-mail-intelligence/){:target="&#95;blank"} - Free for home/non-commercial use up to 100k queries per day (requires registration), commercial use requires a subscription

[DNSWL](https://www.dnswl.org/?page_id=9){:target="&#95;blank"} - Commercial use forbidden (see link for definition); Limit of 100k queries per day

[Mailspike](http://mailspike.org/usage.html){:target="&#95;blank"} - Limit of 100k messages or queries per day

[Rspamd URIBL](http://www.rspamd.com/doc/usage_policy.html){:target="&#95;blank"} - Commercial use forbidden (see link for definition); Limit of 250k queries per day

[SORBS](http://www.sorbs.net/general/using.shtml#largesites){:target="&#95;blank"} - Limit of 100k users or more than 5 messages per second sustained

[SpamEatingMonkey](http://spameatingmonkey.com/faq.html#query-limits){:target="&#95;blank"} - Limit of 100k queries per day or more than 5 queries per second for more than a few minutes

[Spamhaus](https://www.spamhaus.org/organization/dnsblusage/){:target="&#95;blank"} - Commercial use forbidden (see link for definition); Limit of 300k queries or 100k SMTP connections per day

[SURBL](http://www.surbl.org/usage-policy){:target="&#95;blank"} - Commercial use forbidden (see link for definition); Limit of 1k users or 250k queries per day

[UCEProtect](http://www.uceprotect.net/en/index.php?m=6&s=11){:target="&#95;blank"} - If you're sending 100k queries or more per day you should use the (free) Rsync service.

[URIBL](http://uribl.com/about.shtml){:target="&#95;blank"} - Requires a commercial subscription if 'excessive queries' are sent (numbers unclear).

Refer to the [RBL]({{ site.url }}{{ site.baseurl }}/doc/modules/rbl.html) module documentation for information about disabling RBLs/SURBLs.

## Using Rspamd

### Using rspamc console routine

`rspamc` implements a feature-complete client for Rspamd. For detailed documentation refer to `man rspamc`.

Common use-cases for `rspamc` include:

* Scanning messages stored on disk:

~~~
rspamc < file.eml
rspamc file.eml
rspamc directory1/ directory2/*.eml
~~~

* Training the Bayesian classifier

~~~
rspamc learn_spam < file.eml
rspamc learn_ham file.eml
# In case of multiple classifiers
rspamc -c "bayes2" learn_spam directory1/ directory2/*.eml
~~~

* Administering fuzzy storage

~~~
rspamc -f 1 -w 1 fuzzy_add file.eml
rspamc -f 2 fuzzy_del file2.eml
~~~

* Acting as a local delivery agent (read the [integration document]({{ site.baseurl }}/doc/integration.html))

### The rspamadm command

Rspamadm is a new utility that is intended to manage rspamd directly. It comes with embedded help that can be displayed by typing:

~~~
% rspamadm help
Rspamadm 2.6
Usage: rspamadm [global_options] command [command_options]

Available commands:
  configdump         Perform configuration file dump
  configgraph        Produces graph of Rspamd includes
  confighelp         Shows help for configuration options
  configtest         Perform configuration file test
  configwizard       Perform guided configuration for Rspamd daemon
  control            Manage rspamd main control interface
  cookie             Produces cookies or message ids
  corpustest         Create logs files from email corpus
  dkim_keygen        Create dkim key pairs
  dnstool            DNS tools provided by Rspamd
  fuzzyconvert       Convert fuzzy hashes from sqlite3 to redis
  grep               Search for patterns in rspamd logs
  keypair            Manages keypairs for Rspamd
  lua                Run LUA interpreter
  mime               Mime manipulations provided by Rspamd
  pw                 Manage rspamd passwords
  signtool           Sign and verify files tool
  statconvert        Convert statistics from sqlite3 to redis
  template           Apply jinja templates for strings/files
  vault              Perform Hashicorp Vault management
~~~

For example, it is possible to get help for a specific configuration option by typing something like

    rspamadm confighelp -k fuzzy

See [here]({{ site.url }}{{ site.baseurl }}/doc/rspamadm.html) for more information about rspamadm utilities.

### Using mail system utilities

It is also useful to have a simple `Sieve` script to place all messages marked as spam in the `Junk` folder. Here is an example of such a script (~/.dovecot.sieve):

{% highlight nginx %}
require ["fileinto"];

if header :is "X-Spam" "Yes" {
        fileinto "Junk";
}
{% endhighlight %}

You can also setup rspamc to learn via passing messages to a certain email address. I recommend using `/etc/aliases` for these purposes and `mail-redirect` command (e.g. provided by [Mail Redirect addon](https://addons.mozilla.org/en-GB/thunderbird/addon/mailredirect/){:target="&#95;blank"} for `Thunderbird` MUA). The desired aliases could be the following:

    learn-spam123: "| rspamc learn_spam"
    learn-ham123: "| rspamc learn_ham"

You'd need some less predictable aliases to avoid sending messages to such addresses by some adversary or just by a mistake to prevent statistics pollution.

There is also an add-on for Thunderbird MUA written by Alexander Moisseev to visualise Rspamd stats. You can download the latest version from its [homepage](https://github.com/moisseev/rspamd-spamness/){:target="&#95;blank"} or a version reviewed by `moz://a` from  [Tunderbird Add-ons page](https://addons.thunderbird.net/thunderbird/addon/rspamd-spamness/){:target="&#95;blank"}. You'd need to add extended spam headers (`X-Spamd-Result`) with Rspamd proxy worker and/or (from add-on's version 0.8.0) `X-Spam-Score` and `X-Spam-Report` headers with Exim to make the whole setup work.

To enable extended spam headers in [Milter headers module]({{ site.baseurl }}/doc/modules/milter_headers.html) add the following line to `local.d/milter_headers.conf`:

{% highlight ucl %}
extended_spam_headers = true;
{% endhighlight %}

To enable headers in Exim refer to the "Integration with Exim MTA" section of the [MTA integration]({{ site.baseurl }}/doc/integration.html) document.

Here is a screenshot of this addon in use:

<img class="img-responsive" src="{{ site.baseurl }}/img/thunderbird_rspamd.png">

### Using the WebUI

Rspamd has a built-in WebUI which supports setting metric actions and scores; Bayes training and scanning messages - for more information see the [WebUI documentation]({{ site.url }}{{ site.baseurl }}/webui).

## Using Rspamd in large email systems

Rspamd has been designed to be used in large scale email systems. It supports various features to simplify processing emails for thousands or millions of users. However, the default settings are quite conservative to provide a suitable experience for small grade systems.

First of all, you are strongly advised to get the official Rspamd packages from `rspamd.com` site if you use Debian derived Linux. They are heavily optimized in terms of performance and features. For users of other platforms, it is advised to ask Rspamd support (mailto://support@rspamd.com) about your specific demands. Maybe there are optimized packages for your specific platform that is not automatically built yet.

Secondly, you need to setup Redis. Normally, you need two types of Redis instances:

* Master-slave replicated instances for `persistent` data: statistics, fuzzy hashes, neural networks. These instances are mostly read-only so you can split your load over read-only slaves.
* Non-replicated but (probably) sharded instances for `volatile` data: greylisting, replies, IP reputation, and other temporary stuff. These instances are not required to be persistent and they could be scaled by sharding that is automatically performed by Rspamd if you specify multiple servers. These instances have mixed read-write payload.

You might also want to enable the following modules:

* [IP score]({{ site.baseurl }}/doc/modules/ip_score.html): IP reputation module, requires volatile Redis instance (or shared volatile Redis instance). In some cases, it can provide your results common to the expensive IP DNS blacklists. However, it also depends on the quality of your rules and your scale.
* [Neural networks]({{ site.baseurl }}/doc/modules/neural.html): this module provides significant improvement for your filtering quality but it requires CPU resources (SandyBridge or newer Intel CPUs are strongly adviced) and somehow good rules set. It also requires some setup and a persistent Redis instance. From version 2.0 Rspamd uses `libkann` for neural networks which demonstrates better performance and preciseness than the pre 1.7 implementations based on `libfann`. Here is a minimal setup for neural networks module:

```ucl
# local.d/neural.conf
 servers = "redis:6384";
timeout = 25s; # Sometimes ANNs are very large
train {
  max_trains = 1k; # Number ham/spam samples needed to start train
  max_usages = 20; # Number of learn iterations while ANN data is valid
  spam_score = 8; # Score to learn spam
  ham_score = -2; # Score to learn ham
  learning_rate = 0.01; # Rate of learning
  max_iterations = 100; # Maximum iterations of learning (better preciseness but also lower speed of learning)
}

ann_expire = 2d; # For how long ANN should be preserved in Redis
```

* [Ratelimit]({{ site.baseurl }}/doc/modules/ratelimit.html): this module is very useful to limit spam waves as it allows to temporary delay senders that have either bad reputation or send messages too aggressively without somehow a good reputation. Requires a volatile Redis instance.
* [Replies]({{ site.baseurl }}/doc/modules/replies.html): whitelists replies to your user's mail. It is very useful to provide users instant communication with known recipients. Requires a volatile Redis instance.
* [URL redirector]({{ site.baseurl }}/doc/modules/url_redirector.html): resolves URL redirects on some common redirectors and URLs shorteners, e.g. `t.co` or `goo.gl`. Requires a volatile Redis instance.
* [Clickhouse]({{ site.baseurl }}/doc/modules/clickhouse.html): saves analytical data to the [Clickhouse](https://clickhouse.yandex){:target="&#95;blank"} server. Clickhouse server can be used thereafter to create new filtering rules or maintaining blacklists. You can treat it as an advanced Syslog with indexes and complex analytics queries. There are also graphical interfaces available for Clickhouse, e.g. [Redash](https://redash.io/){:target="&#95;blank"}
