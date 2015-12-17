---
layout: doc_quickstart
title: Rspamd quick start
---

# Rspamd quick start

This guide describes the main procedures to get and start working with rspamd.

## Installing Rspamd from packages

### Arch, CentOS, Debian, Fedora, openSUSE, SLE, Ubuntu

Rspamd project provides packages for some rpm and deb based repositories:

- Debian wheezy (amd64, i386)
- Debian jessie (amd64, i386)
- Ubuntu precise (amd64, i386)
- Ubuntu trusty (amd64, i386)
- Ubuntu vivid (amd64, i386)
- CentOS 6 (amd64), need EPEL
- CentOS 7 (amd64), need EPEL
- Fedora 21 (amd64)
- Fedora 22 (amd64)

Installation for rpm based distributions:

    wget -O /etc/yum.repos.d/rspamd.repo http://rspamd.com/rpm-stable/${YOUR_DISTRO}/rspamd.repo
    rpm --import http://rspamd.com/rpm-stable/gpg.key
    yum update
    yum install rspamd

Where `${YOUR_DISTRO}` is the short name of your os (e.g. `centos-7` or `fedora-22`).

Installation for deb based distributions:

    apt-get install -y lsb-release # optional
    CODENAME=`lsb_release -c -s`
    wget -O- http://rspamd.com/apt-stable/gpg.key | apt-key add -
	echo "deb http://rspamd.com/apt-stable/ $CODENAME main" > /etc/apt/sources.list.d/rspamd.list
	echo "deb-src http://rspamd.com/apt-stable/ $CODENAME main" >> /etc/apt/sources.list.d/rspamd.list
    apt-get update
    apt-get install rspamd

To learn your codename, you could try command `lsb_release -s -c` from the package called `lsb-release`.

For other distributions you could also check [our project on the openSUSE build service](https://software.opensuse.org/download.html?project=home%3Acebka&package=rspamd).

Rspamd is also available [some](https://packages.debian.org/source/stable/rspamd) [versions](https://packages.debian.org/source/unstable/rspamd) of Debian and [Ubuntu](http://packages.ubuntu.com/search?keywords=rspamd&searchon=names&suite=all&section=all). However, we are looking for an active maintainer for rspamd in these 'official' repos, as now rspamd is terribly outdated there.

### Other operating systems

FreeBSD users can install Rspamd from [ports](http://www.freshports.org/mail/rspamd/).

Users of NetBSD (and other systems with pkgsrc) can use [pkgsrc](http://pkgsrc.se/mail/rspamd).

OpenBSD users can use [ports](http://openports.se/mail/rspamd).

OSX users can install from [MacPorts](https://trac.macports.org/browser/trunk/dports/mail/rspamd/Portfile).

## Nightly releases

If you'd like to test the current rspamd version, you might use nightly builds that are currently available for **CentOS 6** and debian based distributions:

- Debian wheezy
- Debian jessie
- Ubuntu precise
- Ubuntu trusty
- Ubuntu vivid

Nightly builds are not as stable as mainline ones but they contain additional features and bugs are fixed very fast when detected.

There are also builds for other rpm distributions (Centos 7, Centos 6, Fedora 21 and Fedora 22). Their installation is quite similar:

    wget -O /etc/yum.repos.d/rspamd-experimental.repo http://rspamd.com/rpm/${YOUR_DISTRO}/rspamd-experimental.repo
    rpm --import http://rspamd.com/rpm/gpg.key
    yum update
    yum install rspamd

Where `${YOUR_DISTRO}` is the short name of your os (e.g. `centos-7` or `fedora-22`).

To use nightly builds on Debian based distirbutive, do the following (we assume that `codename` is your distribution name):

    apt-get install -y lsb-release # optional
    CODENAME=`lsb_release -c -s`
    wget -O- http://rspamd.com/apt/gpg.key | apt-key add -
	echo "deb http://rspamd.com/apt/ $CODENAME main" > /etc/apt/sources.list.d/rspamd.list
	echo "deb-src http://rspamd.com/apt/ $CODENAME main" >> /etc/apt/sources.list.d/rspamd.list
    apt-get update
    apt-get install rspamd

To learn your codename, you could try command `lsb_release -s -c` from the package called `lsb-release`.

## Build from sources

You can also build rspamd from the source code. To do that grab the source from [github](https://github.com/vstakhov/rspamd) using `git`:

	git clone --recursive https://github.com/vstakhov/rspamd.git

There is also a mirror of rspamd repository: https://git.rspamd.org/vstakhov/rspamd

Please note that `--recursive` option is essential for building rspamd, since it contains some submodules that must be initialized prior to the build process.

### Build requirements

Rspamd requires several 3-rd party software to build and run:

* [libevent](http://libevent.org/) - asynchronous event library
* [glib2](http://library.gnome.org/devel/glib/) - common purposes library
* [gmime2](http://spruce.sourceforge.net/gmime/) - mime parser
* [Luajit](http://www.luajit.org/) - jit compiler for [lua](http://lua.org) programming language
* [cmake](http://www.cmake.org/) - build system used to configure rspamd
* [sqlite3](http://sqlite.org) - embedded database used to store some data by rspamd
* [hiredis](https://github.com/redis/hiredis) - client library for [redis](http://redis.io) key-value storage

You can either install them from sources or (recommended) install using package manager of your system.

### Build process

To build rspamd we recommend to create a separate build directory:

	$ mkdir rspamd.build
	$ cd rspamd.build
	$ cmake ../rspamd
	$ make
	# make install

Alternatively, you can create a distribution package and use it for build your own packages. Here is an example for
[debian](http://debian.org) GNU Linux OS:

	$ mkdir rspamd.build
	$ cd rspamd.build
	$ cmake ../rspamd
	$ make dist
	$ tar xvf rspamd-<rspamd_version>.tar.xz
	$ cd rspamd-<rspamd_version>
	$ debuild

## Running Rspamd

### Platforms with systemd (Arch, CentOS 7, Debian Jessie, Fedora, openSUSE, SLE)

To enable run on startup:

	systemctl enable rspamd.socket

To start once:

	systemctl start rspamd.socket

Rspamd will be started on-demand, so to simulate this you could run:

	rspamc stat

### Ubuntu, Debian Wheezy

To enable run on startup:
	
	update-rc.d rspamd defaults

To start once:
	
	/etc/init.d/rspamd start

### CentOS 6

To enable run on startup:

	chkconfig rspamd on

To start once:

	/etc/init.d/rspamd start

For information about how to configure different MTA with rspamd, please consider the [following document](https://rspamd.com/doc/integration.html).

## Configuring Rspamd

Though Rspamd's default config aims to be useful for most purposes you may wish to make some adjustments to it to suit your environment/tastes.

There are some different approaches you could take to this which suffer similar drawbacks:

1) Is to modify the stock config files in `/etc/rspamd` directly. Your package manager will not replace the modified config files on upgrade- and may prompt you to merge changes or install these files with an added extension depending on your platform.

2) Is to instead create an `rspamd.conf.local` and/or `rspamd.conf.local.override` in the `/etc/rspamd` directory. What distinguishes these files is the way in which they alter config- `rspamd.conf.local` adds or _merges_ config elements (and is useful for example for setting custom metrics) while `rspamd.conf.local.override` adds or _replaces_ config elements (and is useful for example for configuring workers or RBLs).

### Setting listening interface

Rspamd's normal worker will by default listen on all interfaces on port 11333. If you're running Rspamd on the same machine as your mailer (or whatever will be querying it) you might want to set this to 'localhost' instead.

This is configured in `rspamd.conf` or `rspamd.sysvinit.conf` on Debian Wheezy & Ubuntu. The config to be modified is shown below (`*` should be replaced with whatever address you would prefer to listen on).

    worker {
        bind_socket = "*:11333";
        .include "$CONFDIR/worker-normal.inc"
    }

If you plan to leave this as is you may wish to use a firewall to restrict access to your own machines.

### Setting controller password

Rspamd requires a password when queried from non-trusted IPs except for scanning messages which is unrestricted (the default config trusts the loopback interface). This is configured in `worker-controller.inc`. The config to be modified is shown below (replace 'q1' with your chosen password):

`password = "q1";`

Optionally you may set `enable_password` - if set, data-changing operations (such as training bayes or fuzzy storage) will require this password. For example:

`enable_password = "q2";`

Moreover, you can store encrypted password for better security. To generate such a password just type

	$ rspamd --encrypt-password
	Enter passphrase:
	$1$4mqeynj3st9pb7cgbj6uoyhnyu3cp8d3$59y6xa4mrihaqdw3tf5mtpzg4k7u69ypebc3yba8jdssoh39x16y

Then you can copy this string and store it in the configuration file. Rspamd uses [PBKDF2](http://en.wikipedia.org/wiki/PBKDF2) algorithm that makes it very hard to brute-force this password even if it has been compromised.

### Pre-built statistics

Rspamd is shipped with [pre-built statistics](https://rspamd.com/rspamd_statistics/). Since version 1.0 release, we would recommend to bootstrap your `BAYES` statistics using sqlite3. To load the pre-built statistics, please ensure, that your 
`${CONFDIR}/statistics.conf` contains the following setting:


	classifier {
		type = "bayes";
		tokenizer {
			name = "osb";
		}
		cache {
			path = "${DBDIR}/learn_cache.sqlite";
		}
		min_tokens = 11;
		backend = "sqlite3";
		languages_enabled = true;
		statfile {
			symbol = "BAYES_HAM";
			path = "${DBDIR}/bayes.ham.sqlite";
			spam = false;
		}
		statfile {
			symbol = "BAYES_SPAM";
			path = "${DBDIR}/bayes.spam.sqlite";
			spam = true;
		}
	}

Then you can download two files using the following commands:

	wget -O /var/lib/rspamd/bayes.spam.sqlite http://rspamd.com/rspamd_statistics/bayes.spam.sqlite
	wget -O /var/lib/rspamd/bayes.ham.sqlite http://rspamd.com/rspamd_statistics/bayes.ham.sqlite

For some systems, namely old centos (6 or 7) the shipped sqlite version won't be able to use pre-shipped statfiles. For that purposes, there are also the raw sql dumps for statfiles which could
be used in the following way:
	
	wget http://rspamd.com/rspamd_statistics/bayes.spam.sql.xz
	wget http://rspamd.com/rspamd_statistics/bayes.ham.sql.xz
	xz -cd bayes.spam.sql.xz | sqlite3 /var/lib/rspamd/bayes.spam.sqlite
	xz -cd bayes.ham.sql.xz | sqlite3 /var/lib/rspamd/bayes.ham.sqlite

Don't forget to change ownership to allow rspamd user (usually `_rspamd`) to learn further messages into these statistics:

	chown _rspamd:_rspamd /var/lib/rspamd/bayes.*.sqlite

Afterwards, you would have pre-learned statistics for several languages.

### Configuring RBLs

Though Rspamd is free to use for any purpose many of the RBLs used in the default configuration aren't & care should be taken to see that your use cases are not infringing. Notes about specific RBLs follow below (please follow the links for details):

[Spamhaus](https://www.spamhaus.org/organization/dnsblusage/) - Commercial use forbidden (see link for definition); Limit of 300k queries or 100k SMTP connections per day

[URIBL](http://uribl.com/about.shtml) - Requires a commercial subscription if 'excessive queries' are sent (numbers unclear).

[SURBL](http://www.surbl.org/usage-policy) - Commercial use forbidden (see link for definition); Limit of 1k users or 250k queries per day

[DNSWL](https://www.dnswl.org/?page_id=9) - Commercial use forbidden (see link for definition); Limit of 100k queries per day

[SpamEatingMonkey](http://spameatingmonkey.com/faq.html#query-limits) - Limit of 100k queries per day or more than 5 queries per second for more than a few minutes

[SORBS](http://www.sorbs.net/general/using.shtml#largesites) - Limit of 100k users or more than 5 messages per second sustained

[Mailspike](http://mailspike.net/usage.html) - Limit of 100k messages or queries per day

[UCEProtect](http://www.uceprotect.net/en/index.php?m=6&s=11) - If you're sending 100k queries or more per day you should use the (free) Rsync service.

These are configured in `modules.conf` in the `rbl{}` and `surbl{}` sections. Detailed documentation for the RBL module is available [here](https://rspamd.com/doc/modules/rbl.html).

## Using Rspamd

### Using rspamc

`rspamc` implements a feature-complete client for Rspamd. For detailed documentation refer to `man rspamc`.

Common use-cases for `rspamc` include:

* Scanning messages stored on disk
* Training bayesian classifier
* Administering fuzzy storage
* Acting as a local delivery agent

### Using the WebUI

Rspamd has a built-in WebUI supporting setting metric actions & scores; training bayes & scanning messages- for more information see the [webui documentation](https://rspamd.com/webui).

### MTA integration

Usually you will want to integrate rspamd with your MTA- see the [integration guide](https://rspamd.com/doc/integration.html) for details.

### Custom integration

Rspamd speaks plain HTTP and can be easily integrated with your own apps- refer to the [protocol description](https://rspamd.com/doc/architecture/protocol.html) for details.
