---
layout: doc
title: Upgrading
---
# Updating Rspamd
{:.no_toc}

This document describes incompatible changes introduced in recent Rspamd versions and details how to update your rules and configuration accordingly.

<div id="toc" markdown="1">
  <h2 class="toc-header">Contents</h2>
  * TOC
  {:toc}
</div>

## Migration to Rspamd 3.3

Please be cautious if you migrate to Rspamd 3.3 when you use custom passthrough rules (meaning the most of plugins that define `action` and not `least action`). Prior to 3.3, you could still process other rules, whilst in 3.3+ passthrough means exactly what it means: set the final action and skip directly to the idempotent stage.

Users of the `neural` plugin can have a significant Redis storage leak introduced in the version 3.2. This issue is fixed in the version 3.3 since [the following commit](https://github.com/rspamd/rspamd/commit/f9cfbba2c84e01f18e65618587e6854681843ff1), however, this fix will not remove old stale keys. Unfortunately, those keys do not have any expire either. One of the possible sollutions to clean the database up is to remove all keys starting with `rn_` prefix. There are multiple options available to perform this action, so you can take a look at the [following conversation](https://stackoverflow.com/questions/4006324/how-to-atomically-delete-keys-matching-a-pattern-using-redis) on the Stackoverflow.

## Migration to Rspamd 3.0

Dmarc reporting stuff is no longer in the dmarc module: you need to run `rspamadm dmarc_report` command periodically to send DMARC reports. This could be done via cron. Configuration of the reporting has also changed in the incompatible matter, please check the [module documentation](modules/dmarc.html).


## Migration to Rspamd 2.6

It is necessary to clear the browser cache and restart the browser for the GUI to work properly after upgrading to 2.6.

`Neural networks` plugin training data will also be lost as the internal structure of the NN has been reworked in an incompatible way. Further training should continue as usually.

If you observe complains about `SENDER_REP_HAM` and `SENDER_REP_SPAM` symbols in Rspamd logs, then you might need to define the corresponding scores for these symbols (see more in the documentation: https://rspamd.com/doc/modules/reputation.html). This issue will be fixed in future Rspamd releases.


## Migration to Rspamd 2.0

RBL module has replaced both `emails` and `surbl` module unifying all Runtime Black Lists checks in a single place. The existing rules are normally automatically converted to `rbl` syntax which also includes even your `local.d` defines. `override.d` defines act as `local.d` overrides unfortunately. If you need to use overrides then please consider converting them to `override.d/rbl.conf` rules.

`Emails` rules with maps instead of DNS RBLs are **NO LONGER SUPPORTED**. Please use `multimap` with selectors instead.

Default Bayes backend is also changed to Redis now whilst Sqlite backend is now marked as deprecated and is not recommended for use. Hence, if you have `sqlite` backend that was default before 2.0, you'd need to specify its' type manually or convert it to Redis (or even, relearn Redis backend from the scratch).

`ip_score` module has been replaced by `reputation` module. The existing rules should be automatically converted to `reputation` rules. The name of symbol has also been changed to two symbols: `SENDER_REP_SPAM` and `SENDER_REP_HAM`. The scores of `IP_SCORE` should be automatically applied to new symbols. The data collected from `ip_score` plugin will be **LOST** unevitably. The main reason behind it was the significant flaw of the old plugin that caused reputation never expire.

`neural` module has received a major update. No config incompatibilities have been introduced to our best knowledge, however, the existing network data will be **LOST** unevitably.

If you build Rspamd from the sources, you now need **C++11** capable compiler as there are now bundled dependencies written in C++ (specifically, replxx library). You also need `libsodium` library. Rspamd now supports merely `clang` and `gcc` compilers. Other compilers might work as well but it is not guaranteed any longer.

Bayes expiry now always work in `lazy` mode and the default mode has been changed to `lazy` only.

Log helper worker has been removed (but probably nobody have used it anyway).

## Migration to Rspamd 1.9.1

{% raw %}

From version 1.9.1, Rspamd supports [Jinja2 templates](http://jinja.pocoo.org) provided by [Lupa Lua library](https://foicica.com/lupa/). You can read the basic syntax documnentation and the abilities provided by these templating engines using the links above. Rspamd itself uses a specific syntax for variable tags: `{=` and `=}` instead of the traditional `{{` and `}}` as these tags could mean, e.g. a table in table in Lua.

As a consequence, from the version 1.9.1, your config files should be Jinja safe, meaning that there should be no special sequences like `{%` or `{=` anywhere in your configuration. Alternatively, you can escape them using `raw` and `endraw` tags as described [here](https://shopify.github.io/liquid/tags/raw/).

{% endraw %}

## Migration to Rspamd 1.9.0

This version should not generally be incompatible with the previous one aside of the case if you build Rspamd from the sources or use a custom package. From the version 1.9, Rspamd has changed some of the default instalation paths:

- There is a new `${LIBDIR}/rspamd/librspamd-server.so` library that contains common functions for `rspamd`, `rspamadm` and `rspamc` binaries
- `${PLUGINSDIR}` is now set to a specific path for Lua plugins and is **no longer** in the Lua path; it is suggested to use `${LUALIBDIR}` for all shared Lua code
- Here are default values for the paths used by Rspamd:
  * `CONFDIR` = `${PREFIX}/etc/rspamd` - main path for the configuration
  * `LOCAL_CONFDIR` = `${PREFIX}/etc/rspamd` - path for the user's defined configuration
  * `RUNDIR` = OS specific (`/var/run/rspamd` on Linux) - used to store volatile runtime data (e.g. PIDs)
  * `DBDIR` = OS specific (`/var/lib/rspamd` on Linux) - used to store static runtime data (e.g. databases or cached files)
  * `SHAREDIR` = `${PREFIX}/share/rspamd` - used to store shared files
  * `LOGDIR` = OS specific (`/var/log/rspamd` on Linux) - used to store Rspamd logs in file logging mode
  * `LUALIBDIR` = `${SHAREDIR}/lualib` - used to store shared Lua files (included in Lua path)
  * `PLUGINSDIR` = `${SHAREDIR}/plugins` - used to place Lua plugins
  * `RULESDIR` = `${SHAREDIR}/rules` - used to place Lua rules
  * `LIBDIR` = `${PREFIX}/lib/rspamd` - used to place shared libraries (included in RPATH and Lua CPATH)
  * `WWWDIR` = `${SHAREDIR}/www` - used to store static WebUI files

For those who are using the default packages there should be no changes. Even in the case if you are using old `${PLUGINSDIR}` to store your custom plugins, Rspamd will look at the old location as a fallback in the plugins loading logic.

Another incompatible change has been introduced for those who are using **`coroutines based`** Rspamd Lua API. From this version, you need to register symbols where coroutines are used with `coro` flag to allow them to be functional (otherwise they just crash Rspamd). More details are available in the following [issue](https://github.com/rspamd/rspamd/issues/2789).

## Migration to Rspamd 1.8.1

This version introduces several incompatibilities that mught be related to your setup.

### General configuration change

[Libucl](https://github.com/vstakhov/libucl) that is used to parse configuration files for Rspamd has been changed in a way that prevented to load incomplete chunks of the data. It means, that each include file **MUST** be a valid configuration snippet as is. For example, you migh have the following artificial example:

~~~ucl
.include "top.conf"
var = "bar";
.include "bottom.conf"
~~~

Where top/bottom could have something like:

~~~
# top.conf
{
~~~


~~~
# bottom.conf
}
~~~

This will not work any longer: libucl requires that all braces are matching.

However, it still allows implicit braces over the top object. So this file will still be **valid**:

~~~ucl
# Some include

section "foo" {
  key = value;
}

param = "value";
~~~

or this:

~~~ucl
# Implicit object
param = "value";
~~~

`rspamadm configtest` will show you if your local changes to the configuration files are incompatible with the new restrictions applied.

### Fuzzy and bayes misses for large text messages

Due to bug introduced in 1.8.0, there algorithm used to deterministically skip words in large text parts was not deterministic. It means that the exact words pipelines produced by different Rspamd instances might be different. It could affect if your words_limit was reached (default: `words_decay = 200` words). Hence, for large text parts it was expected to have misses in fuzzy and in Bayes classification. Whilst bayes missing should not be significant, the fuzzy misses might be very severe and they might break fuzzy detection for large text parts.

In 1.8.1, we have fixed this issue and, since we have already broken the compatibility with 1.7.9, we have decided to increase `words_decay` to 600. Please ensure that you don't override this parameter anywhere (e.g. in `local.d/options.inc`, `override.d/options.inc` or any other override or local file) or your compatibility with Rspamd fuzzy storage would be lost for messages with more than `words_decay` threshold words.

### Different `CONFDIR` and `LOCAL_CONFDIR` case

In a very unlikely case if your custom build has different values for `CONFDIR` and `LOCAL_CONFDIR` build/startup variables, you might miss your custom Lua rules that were previously loaded from `$CONFDIR/rspamd.local.lua` and from this version they are loaded from `$LOCAL_CONFDIR/rspamd.local.lua`. To our very best knowledge, it doesn't affect any official packages nor any officially supported operation systems, such as FreeBSD or OpenBSD.

## Migration to Rspamd 1.8.0

There are couple of slashing changes that might affect your setup, especially if you use one of the following:

- **Clickhouse** module
- **User settings**

### Clickhouse changes

From the version 1.8, Rspamd stops usage of multiple tables and uses one table `rspamd` with all columns in it. It provides benefits in performance and helps to avoid joins that are not extremely efficient in Clickhouse. If you have used Clickhouse module before 1.8, then your **schemas** will be converted automatically. However, **the existing data** will **NOT** be converted and will remain in the old tables. It is sometimes required to enforce new schema application by using command

```
OPTIMIZE rspamd FINAL
```

This command might take significant time to be completed if you store lots of historical data.

You also need to update your **queries** that use additional Rspamd tables, such as `rspamd_urls`, `rspamd_asn`, `rspamd_attachments`, `rspamd_symbols` and others. All corresponding fields are now placed in `rspamd` table. It is impossible to migrate old data from those tables so far.

### Settings changes

Rspamd now provides `settings.conf` which includes `local.d/settings.conf` and `override.d/settings.conf`. If you have used some of these files to store settings please ensure that they don't conflict with the new configuration layout.

## Migration to Rspamd 1.7.4

The only potential issue is that now Rspamd listens on **localhost only** by default. It might break some configurations where you rely on the previous behaviour, specifically, on listening on all IP addresses (e.g. `*`).

However, we think that we should keep the default settings as restrictive as possible to avoid potential security issues that proved to happen with other projects with 'open to all' defaults.

## Migration to Rspamd 1.7.0

You should consider running of `rspamadm configwizard` to ensure that your configuration is compatible. From version 1.7, Rspamd does not support `metrics` concept. In fact, that was never supported in the past, however, you could see `metric "default"` in many places within Rspamd configuration and settings. 

In this version, we still support old `metric` keyword and scores defined under this section, for instance in `rspamd.conf.local`. However, it is now recommended to define symbols scores in groups settings (`local.d/group_*.conf`). Groups configurations live in `etc/rspamd/scores.d` folder.

There is no need to undertake any action if you have your custom scores defined in the legacy files. Rspamd will continue support of definitions in these files.

## Migrating to Rspamd 1.6.5

Due to a couple of serious fixes in tokenization algorithms, it is be possible that statistics and fuzzy modules will loose their preciseness. In this cases you might try to relearn your databases to improve accuracy of filtering.

## Migrating to Rspamd 1.6.0

Due to implementation of the new milter interface, there is an important incompatible change that you might need to handle if you use `rmilter_headers` module. This module has been renamed to `milter_headers` and the according protocol section is now named `milter` instead of `rmilter`. If you configured this module inside `local.d/rmilter_headers.conf` or in `override.d/rmilter_headers.conf` then you don't need to undertake any actions: these files are still loaded by the renamed module. Otherwise, you need to change section name from `rmilter_headers` to `milter_headers`.

Milter_headers module now skips adding headers for local networks & authenticated users by default; this can be re-enabled by setting `skip_local = false` and/or `skip_authenticated = false` in the module configuration; or alternatively you could set `authenticated_headers` and/or `local_headers` to a list of headers that should not be skipped.

[Proxy worker]({{ site.url }}{{ site.baseurl }}/doc/workers/rspamd_proxy.html) has been added to the default configuration and listens on all interfaces on TCP port 11332. If you don't need it you can set `enabled = false` in `local.d/worker-proxy.inc`.

This release removes the config split for systemd/sysv platforms. If you have custom init scripts you should ensure that these use `rspamd.conf` rather than `rspamd.sysvinit.conf`. If you use systemd and prefer to log to the systemd journal, you should add the following to `local.d/logging.inc`:

~~~ucl
systemd = true;
type = "console";
~~~

A major rework of lua libraries has taken place in Rspamd 1.6. Some of the custom scripts might be broken if they are loaded **before** `rspamd.lua` or if you have edited `rspamd.lua` manually. To ensure that everything is fine you need to load vendor `rspamd.lua` before all of your custom scripts. It is a default behaviour, however, in some highly custiomised setups it might cause issues. In general, you need to ensure that the following line is somewhere in your code (it is at the very beginning of `rspamd.lua`):

~~~lua
require "global_functions" ()
~~~

Rmilter tool is now **deprecated** in honor of milter protocol support in [rspamd proxy]({{ site.url }}{{ site.baseurl }}/doc/workers/rspamd_proxy.html). There are examples of some particular features that were previously implemented in Rmilter in [milter headers module]({{ site.url }}{{ site.baseurl }}/doc/modules/milter_headers.html). You should consider migrating from Rmilter as soon as possible since Rspamd 1.6 will be the last version that supports Rmilter tool. In future major releases (starting from 1.7), there are absolutely **no guarantees** of compatibility with Rmilter.

For example, if you need the old behaviour for `extended_spam_headers` in Rmilter, then you can use the following snippet added to the `local.d/milter_headers.conf`:

~~~ucl
# local.d/milter_headers.conf
extended_spam_headers = true;
~~~

## Migrating to Rspamd 1.5.3

The rspamd_update module has been disabled by default; if you need it please set `enabled = true` in `local.d/rspamd_update.conf`.

## Migrating to Rspamd 1.5.2

New configuration files have been added for the following modules which previously missed them; if you have previously configured one of these modules in `rspamd.conf.local` please move your configuration to `rspamd.conf.override` to ensure that it is preserved verbatim or rework your configuration to use `local.d/[module_name].conf` instead.

- antivirus
- dkim_signing
- mx_check (set `enabled = true` if you use `local.d`)
- replies
- spamassassin
- trie

## Migrating to Rspamd 1.5

New configuration files have been added for the following modules which previously missed them: `greylist`, `metadata_exporter` and `metric_exporter.` If you have previously configured one of these modules in `rspamd.conf.local` please move your configuration to `rspamd.conf.override` to ensure that it is preserved verbatim or rework your configuration to use `local.d/[module_name].conf` instead.

If you have composites defined in `local.d/composites.conf` or `override.d/composites.conf` these will need to be moved to `rspamd.conf.local` or reworked to the new format, see `/etc/rspamd/composites.conf` for an example.

You are also suggested to disable outdated and no longer supported features of Rmilter and switch them to Rspamd:

The list of features includes the following ones:

- Greylisting - provided by [greylisting module]({{ site.url }}{{ site.baseurl }}/doc/modules/greylisting.html)
- Ratelimit - is done by [ratelimit module]({{ site.url }}{{ site.baseurl }}/doc/modules/ratelimit.html)
- Replies whitelisting - is implemented in [replies module]({{ site.url }}{{ site.baseurl }}/doc/modules/replies.html)
- Antivirus filtering - provided now by [antivirus module]({{ site.url }}{{ site.baseurl }}/doc/modules/antivirus.html)
- DCC checks - are now done in [dcc module]({{ site.url }}{{ site.baseurl }}/doc/modules/dcc.html)
- Dkim signing - can be done now by using of [dkim module]({{ site.url }}{{ site.baseurl }}/doc/modules/dkim.html#dkim-signatures) and also by a more simple [dkim signing module]({{ site.url }}{{ site.baseurl }}/doc/modules/dkim_signing.html)

All duplicating features are still kept in Rmilter for compatibility reasons. However, no further development or bug fixes will likely be done for them.

From version `1.9.1` it is possible to specify `enable` option in `greylisting` and `ratelimit` sections. It is also possible for `dkim` section since `1.9.2`. These options are `true` by default. Here is an example of configuration where greylisting and ratelimit are disabled:

~~~ucl
# /etc/rmilter.conf.local
limits {
    enable = false;
}
greylisting {
    enable = false;
}
dkim {
    enable = false;
}
~~~

These options are in their default enabled states merely for compatibility purposes. In future Rmilter releases, they will be **DISABLED** by default.

## Migrating to Rmilter 1.10.0 and Rspamd 1.4.0

The default passwords, namely `q1` and `q2` are no longer allowed to be used for remote authentication. This is done due to many misusages of these **example** passwords and dangerous security flaws introduced by some Rspamd users.

## Migrating to Rmilter 1.9.1 and Rspamd 1.3.1

Systemd socket activation has been removed in these releases. Rmilter may not restart correctly on upgrade on Debian platforms. Please run `systemctl restart rmilter` after installing the package if necessary. Rspamd is expected to restart correctly on upgrade. Both Rspamd & Rmilter should be automatically configured to run on reboot post-upgrade.

## Migrating from Rmilter 1.8 to Rmilter 1.9

There are couple of things that are no longer supported:

* beanstalk support has been removed from Rmilter in honor of Redis [pub/sub](http://redis.io/topics/pubsub), you must remove the whole `beanstalk` section from the configuration file
* auto whitelist for greylisting is no longer supported as it has been broken from the very beginning, you must remove all `awl` options from the greylisting section

If you have used beanstalk for some purposes then you could move to Redis [pub/sub](http://redis.io/topics/pubsub). There are settings for sending spam (`spam_servers` and `spam_channel`) and for sending messages copies (`copy_servers`, `copy_prob` and `copy_channel`) in the `redis` section that allow you to reproduce beanstalk functions using Redis.

Rmilter now supports configuration override from `rmilter.conf.local` and from `rmilter.conf.d/*.conf` files. You should consider using these methods for your local configuration options.

Rmilter no longer adds several SpamAssassin-compatible headers: namely `X-Spam-Status`, `X-Spam-Level` and `X-Spamd-Bar`. Support has been added for adding/removing custom headers under instruction of Rspamd (Requires Rspamd 1.3.0+). Example script which restores the removed headers is shown below (to be added to `/etc/rspamd/rspamd.local.lua`):

~~~lua
rspamd_config:register_symbol({
  name = 'RMILTER_HEADERS',
  type = 'postfilter',
  priority = 10,
  callback = function(task)
    local metric_score = task:get_metric_score('default')
    local score = metric_score[1]
    local required_score = metric_score[2]
    -- X-Spamd-Bar & X-Spam-Level
    local spambar
    local spamlevel = ''
    if score <= -1 then
      spambar = string.rep('-', score*-1)
    elseif score >= 1 then
      spambar = string.rep('+', score)
      spamlevel = string.rep('*', score)
    else
      spambar = '/'
    end
    -- X-Spam-Status
    local is_spam
    local spamstatus
    local action = task:get_metric_action('default')
    if action ~= 'no action' and action ~= 'greylist' then
      is_spam = 'Yes'
    else
      is_spam = 'No'
    end
    spamstatus = is_spam .. ', score=' .. string.format('%.2f', score)
    -- Add headers
    task:set_rmilter_reply({
      add_headers = {
        ['X-Spamd-Bar'] = spambar,
        ['X-Spam-Level'] = spamlevel,
        ['X-Spam-Status'] = spamstatus
      },
      remove_headers = {
        ['X-Spamd-Bar'] = 1,
        ['X-Spam-Level'] = 1,
        ['X-Spam-Status'] = 1
      }
    })
  end
})
~~~

## Migrating from Rspamd 1.2 to Rspamd 1.3

There are no incompatible changes introduced in Rspamd 1.3 version.

## Migrating from Rspamd 1.1 to Rspamd 1.2

There are no incompatible changes introduced in Rspamd 1.2 version.

## Migrating from Rspamd 1.0 to Rspamd 1.1

The only change here affects users with per-user statistics enabled. There is an incompatible change in `sqlite3` and per-user behaviour:

Now both `redis` and `sqlite3` follow common principles for per-user statistics:

* If per-user statistics is enabled check per-user tokens **ONLY**
* If per-user statistics is not enabled then check common tokens **ONLY**

If you need the old behaviour, then you need to use a separate classifier for per-user statistics, for example:

~~~ucl
    classifier {
        tokenizer {
            name = "osb";
        }
        name = "bayes_user";
        min_tokens = 11;
        backend = "sqlite3";
        per_language = true;
        per_user = true;
        statfile {
            path = "/tmp/bayes.spam.sqlite";
            symbol = "BAYES_SPAM_USER";
        }
        statfile {
            path = "/tmp/bayes.ham.sqlite";
            symbol = "BAYES_HAM_USER";
        }
    }
    classifier {
        tokenizer {
            name = "osb";
        }
        name = "bayes";
        min_tokens = 11;
        backend = "sqlite3";
        per_language = true;
        statfile {
            path = "/tmp/bayes.spam.sqlite";
            symbol = "BAYES_SPAM";
        }
        statfile {
            path = "/tmp/bayes.ham.sqlite";
            symbol = "BAYES_HAM";
        }
    }
~~~

## Migrating from Rspamd 0.9 to Rspamd 1.0

In Rspamd 1.0 the default settings for statistics tokenization have been changed to `modern`, meaning that tokens are now generated from normalized words and there are various improvements which are incompatible with the statistics model used in pre-1.0 versions. To use these new features you should either **relearn** your statistics or continue using your old statistics **without** new features by adding a `compat` parameter:

~~~ucl
classifier {
...
    tokenizer {
        compat = true;
    }
...
}
~~~

The recommended way to store statistics now is the `sqlite3` backend (which is incompatible with the old mmap backend):

~~~ucl
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
~~~

## Migrating from Rspamd 0.6 to Rspamd 0.7

### WebUI changes

The Rspamd web interface is now a part of the Rspamd distribution. Moreover, all static files are now served by Rspamd itself so you won't need to set up a separate web server to distribute static files. At the same time, the WebUI worker has been removed and the controller acts as WebUI+old_controller which allows it to work with both a web browser and the rspamc client. However, you might still want to set up a full-featured HTTP server in front of Rspamd to enable, for example, TLS and access controls.

Now there are two password levels for Rspamd: `password` for read-only commands and `enable_password` for data changing commands. If `enable_password` is not specified then `password` is used for both commands.

Here is an example of the full configuration of the Rspamd controller worker to serve the WebUI:

~~~ucl
worker {
	type = "controller";
	bind_socket = "localhost:11334";
	count = 1;
	password = "q1";
	enable_password = "q2";
	secure_ip = "127.0.0.1"; # Allows to use *all* commands from this IP
	static_dir = "${WWWDIR}";
}
~~~

### Settings changes

The settings system has been completely reworked. It is now a lua plugin that registers pre-filters and assigns settings according to dynamic maps or a static configuration. Should you want to use the new settings system then please check the recent [documentation]({{ site.url }}{{ site.baseurl }}/doc/configuration/settings.html). The old settings have been completely removed from Rspamd.

### Lua changes

There are many changes in the lua API and some of them are, unfortunately, breaking ones.

* many superglobals are removed: now Rspamd modules need to be loaded explicitly,
the only global remaining is `rspamd_config`. This affects the following modules:
	- `rspamd_logger`
	- `rspamd_ip`
	- `rspamd_http`
	- `rspamd_cdb`
	- `rspamd_regexp`
	- `rspamd_trie`

~~~lua
local rspamd_logger = require "rspamd_logger"
local rspamd_trie = require "rspamd_trie"
local rspamd_cdb = require "rspamd_cdb"
local rspamd_ip = require "rspamd_ip"
local rspamd_regexp = require "rspamd_regexp"
~~~

* new system of symbols registration: now symbols can be registered by adding new indices to `rspamd_config` object. Old version:

~~~lua
local reconf = config['regexp']
reconf['SYMBOL'] = function(task)
...
end
~~~

new one:

~~~lua
rspamd_config.SYMBOL = function(task)
...
end
~~~

`rspamd_message` is **removed** completely; you should use task methods to access message data. This includes such methods as:

* `get_date` - this method can now return a date for task and message based on the arguments:

~~~lua
local dm = task:get_date{format = 'message'} -- MIME message date
local dt = task:get_date{format = 'connect'} -- check date
~~~

* `get_header` - this function is totally reworked. Now `get_header` version returns just a decoded string, `get_header_raw` returns an undecoded string and `get_header_full` returns the full list of tables. Please consult the corresponding [documentation]({{ site.url }}{{ site.baseurl }}/doc/lua/rspamd_task.html) for details. You also might want to update the old invocation of task:get_header to the new one.
Old version:

~~~lua
function kmail_msgid (task)
	local msg = task:get_message()
	local header_msgid = msg:get_header('Message-Id')
	if header_msgid then
		-- header_from and header_msgid are tables
		for _,header_from in ipairs(msg:get_header('From')) do
	    	...
		end
	end
	return false
end
~~~

new one:

~~~lua
function kmail_msgid (task)
	local header_msgid = task:get_header('Message-Id')
	if header_msgid then
		local header_from = task:get_header('From')
		-- header_from and header_msgid are strings
	end
	return false
end
~~~

or with the full version:

~~~lua
rspamd_config.FORGED_GENERIC_RECEIVED5 = function (task)
	local headers_recv = task:get_header_full('Received')
	if headers_recv then
		-- headers_recv is now the list of tables
		for _,header_r in ipairs(headers_recv) do
			if re:match(header_r['value']) then
				return true
			end
		end
	end
    return false
end
~~~

* `get_from` and `get_recipients` now accept optional numeric arguments that specifies where to get sender and recipients for a message. By default, this argument is `0` which means that data is initially checked in the SMTP envelope (meaning `MAIL FROM` and `RCPT TO` SMTP commands) and if the envelope data is inaccessible then it is grabbed from MIME headers. Value `1` means that data is checked on envelope only, while `2` switches mode to MIME headers. Here is an example from the `forged_recipients` module:

~~~lua
-- Check sender
local smtp_from = task:get_from(1)
if smtp_from then
	local mime_from = task:get_from(2)
	if not mime_from or
			not (string.lower(mime_from[1]['addr']) ==
			string.lower(smtp_from[1]['addr'])) then
		task:insert_result(symbol_sender, 1)
	end
end
~~~

### Protocol changes

Rspamd now uses `HTTP` protocols for all operations, therefore an additional client library is unlikely to be needed. The fallback to the old `spamc` protocol has also been implemented to be automatically compatible with `rmilter` and other software that uses the `rspamc` protocol.
