---
layout: doc
title: Upgrading
---
# Updating Rspamd
{:.no_toc}

This document outlines the modifications to Rspamd in recent versions, including any incompatible changes, and provides instructions for updating your rules and configuration accordingly.

{% include toc.html %}

## Efficient Rspamd Cluster Upgrade Guide

Discover a reliable step-by-step process for upgrading your Rspamd cluster while maintaining stability and minimizing downtime. This guide emphasizes a cautious approach with extensive testing to ensure a seamless transition between versions.

1. Ensure that you have a backup of the current stable configuration files, as well as any custom rules, maps, or other settings specific to your cluster.

2. Use stable packages on a stable cluster. Always use the latest stable release of Rspamd in your production environment.

3. Add a node or multiple nodes to an experimental cluster using the experimental repository. This will allow you to test the new version in a controlled environment without affecting the stable cluster.

4. Mirror traffic from the stable cluster to the experimental cluster using the `rspamd_proxy` module. This will help you identify any potential issues or differences between the two versions of Rspamd.

5. Monitor the experimental cluster for any discrepancies, crashes, or other issues. Address these problems as they arise.

6. When a new release is cut, update the experimental cluster to the stable version.

7. Repeat steps 4-5 one more time to ensure that any previously identified issues have been resolved.

8. Once you are confident that the new version is stable and compatible with your environment, update the stable cluster to the next version.

9. Continue to monitor the stable cluster to ensure smooth operation and resolve any issues that may arise after the upgrade.

10. Repeat the entire process starting from `step 1` for future updates. This approach ensures a smooth and controlled upgrade process that minimizes potential downtime and issues in your production environment.

## Migration to Rspamd 3.7.4

The `exclude_private_ips` setting in RBL module no longer exists in this release (and was broken in previous releases), it can be removed from configuration. This setting is equivalent to `exclude_local`.

## Migration to Rspamd 3.7.2

This release introduces [returncodes matchers]({{ site.url }}{{ site.baseurl }}/doc/modules/rbl.html#returncodes-matchers) in RBL module. Previously returncodes were always treated as Lua patterns, now this behaviour is enabled by setting `matcher = "luapattern"` on the rule. For backwards-compatibility this matcher may be enabled implicitly where Lua patterns are detected but they may not be correctly detected in all cases. If you use custom RBL module configuration that makes use of Lua patterns please review it and explicitly set matcher where necessary.

## Migration to Rspamd 3.3

When migrating to Rspamd 3.3, exercise caution if you are utilizing custom passthrough rules, particularly those defined by plugins that utilize `action` rather than `least action`). In versions prior to 3.3, these rules would still allow for processing of additional rules. However, in Rspamd 3.3 and beyond, passthrough denotes a final action and skips directly to the idempotent stage.

Users of the `neural` plugin may experience a significant Redis storage leak in version 3.2. This issue is resolved in version 3.3 with [the following commit](https://github.com/rspamd/rspamd/commit/f9cfbba2c84e01f18e65618587e6854681843ff1), however, this fix will not remove any existing stale keys. These keys also do not have an expiration set. One solution to clean up the database is to remove all keys starting with the `rn_` prefix. There are various options available to accomplish this, such as exploring the [following conversation](https://stackoverflow.com/questions/4006324/how-to-atomically-delete-keys-matching-a-pattern-using-redis) on Stackoverflow.

Starting from this version, building Rspamd requires a **C++20** compatible compiler and toolchain. For Ubuntu Bionic users, this means adding the LLVM repository for the compatible C++20 standard library runtime. The necessary steps are outlined on the [downloads page](https://rspamd.com/downloads.html).

## Migration to Rspamd 3.0

The functionality for DMARC reporting is no longer included in the DMARC module. To send DMARC reports, you must now run the `rspamadm dmarc_report` command on a regular basis, such as through a cron job. Additionally, the configuration for reporting has undergone incompatible changes, so please refer to the [module documentation]({{ site.baseurl }}/doc/modules/dmarc.html) for further information.


## Migration to Rspamd 2.6

To ensure proper functionality of the GUI after upgrading to 2.6, it is necessary to clear the browser cache and restart the browser.

Additionally, the `Neural networks` plugin's training data will be lost as the internal structure of the NN has been redesigned in an incompatible manner. However, training can continue as normal.

If you encounter complaints about `SENDER_REP_HAM` and `SENDER_REP_SPAM` symbols in Rspamd logs, you may need to define scores for these symbols. Refer to the documentation https://rspamd.com/doc/modules/reputation.html). This issue will be fixed in future Rspamd releases.


## Migration to Rspamd 2.0

The RBL module has replaced both the `emails` and `surbl` modules, consolidating all Runtime Black Lists checks in a single location. The existing rules are typically automatically converted to the`rbl` syntax, including those defined in `local.d`. However, `override.d` rules will only act as overrides for `local.d` and not for RBL module. If you need to use overrides, consider converting them to `override.d/rbl.conf` rules.

Note that `emails` rules utilizing maps instead of DNS RBLs are **NO LONGER SUPPORTED**. Instead, use `multimap` with selectors.

In version 2.0, the default Bayes backend has been changed to Redis. The Sqlite backend is now considered deprecated and is not recommended for use. Therefore, if you were previously using the `sqlite` backend as default, you will need to specify its type manually or convert it to Redis (or even, start again and relearn Redis backend).

The `ip_score` module has been replaced by the `reputation` module, and the existing rules should be automatically converted to the new syntax. The symbol name has also been changed to two symbols: `SENDER_REP_SPAM` and `SENDER_REP_HAM`, and the scores for `IP_SCORE` should be automatically applied to these new symbols. However, it should be noted that any data collected by the `ip_score` plugin will be **IRRECOVERABLY LOST**. This change was necessary due to a significant flaw in the old plugin that caused the reputation to never expire.

The `neural` module has undergone a significant update. While no config incompatibilities have been identified, it should be noted that any existing network data will be **IRRECOVERABLY LOST**.

When building Rspamd from source, a **C++11** capable compiler is now required as there are bundled dependencies written in C++ (specifically, the replxx library). Additionally, the `libsodium` is also necessary. Rspamd now only supports the `clang` and `gcc` compilers. Other compilers may still work, but it is no longer guaranteed.

Additionally, Bayes expiry now always works in `lazy` mode and the default mode has been changed to `lazy` only.

Furthermore, the Log helper worker has been removed, although it is unlikely that it was being used by anyone.

## Migration to Rspamd 1.9.1

{% raw %}

From version 1.9.1, Rspamd supports [Jinja2 templates](https://jinja.palletsprojects.com) provided by [Lupa Lua library](https://foicica.com/lupa/). You can learn more about the basic syntax and capabilities of these templating engines by following the links provided. Rspamd uses a specific syntax for variable tags: `{=` and `=}` instead of the traditional `{{` and `}}` as these tags could represent, for example, a table within a table in Lua.

Therefore, in version 1.9.1 and above, your config files must be Jinja safe, meaning that there should be no special sequences such as `{%` or `{=` anywhere in your configuration. Alternatively, you can escape them using `raw` and `endraw` tags as described [here](https://shopify.github.io/liquid/tags/raw/).

{% endraw %}

## Migration to Rspamd 1.9.0

This version should not generally be incompatible with the previous one aside of the case if you build Rspamd from the sources or use a custom package. From the version 1.9, Rspamd has changed some of the default installation paths:

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

For those who are using the default packages, there should be no changes. Even in the case if you are using old `${PLUGINSDIR}` to store your custom plugins, Rspamd will still check the old location as a fallback during the plugin loading process.

Additionally, an incompatible change has been introduced for users of the **`coroutines based`** Rspamd Lua API. Starting from this version, symbols utilizing coroutines must be registered with the `coro` lag to function properly, otherwise, they will cause Rspamd to crash. More information is available in the following [issue](https://github.com/rspamd/rspamd/issues/2789).

## Migration to Rspamd 1.8.1

This version introduces several incompatibilities that may affect your setup.

### General configuration change

[Libucl](https://github.com/vstakhov/libucl) the library used to parse Rspamd's configuration files, has been modified in a way that prevents loading incomplete chunks of data. This means that each include file **MUST** be a valid configuration snippet on its own. For example, consider the following artificial example:

~~~hcl
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

The following will no longer be valid: libucl now requires that all braces are properly matched.

However, it still allows implicit braces on the top-level object. So the following file will still be **valid**:

~~~hcl
# Some include

section "foo" {
  key = value;
}

param = "value";
~~~

or this:

~~~hcl
# Implicit object
param = "value";
~~~

`rspamadm configtest` will show you if your local changes to the configuration files are incompatible with the new restrictions applied.

### Fuzzy and bayes misses for large text messages

Due to a bug introduced in version 1.8.0, the algorithm used to deterministically skip words in large text parts was not functioning as intended, resulting in different words pipelines produced by different Rspamd instances. This could affect the accuracy of classification if the `words_limit` was reached (default: `words_decay = 200` words). For large text parts, it was possible to miss both fuzzy and Bayes classifications. While missing Bayes classification is not significant, missing fuzzy classification could be severe, potentially breaking fuzzy detection for large text parts.

In version 1.8.1, we have fixed this issue. Since we have already broken compatibility with version 1.7.9, we have decided to increase `words_decay`  to 600. Please ensure that you do not override this parameter in any local or override files, such as `local.d/options.inc` or `override.d/options.inc`, or else compatibility with Rspamd's fuzzy storage will be lost for messages with more than `words_decay` threshold words.

### Different `CONFDIR` and `LOCAL_CONFDIR` case

In an extremely unlikely scenario, if your custom build uses different values for the `CONFDIR` and `LOCAL_CONFDIR` build/startup variables, you may experience missing custom Lua rules that were previously loaded from `$CONFDIR/rspamd.local.lua`, as they are now loaded from `$LOCAL_CONFDIR/rspamd.local.lua`. To the best of our knowledge, this does not affect any official packages or officially supported operating systems, such as FreeBSD or OpenBSD.

## Migration to Rspamd 1.8.0

There are several changes that may impact your setup, particularly if you use any of the following:

- **Clickhouse** module
- **User settings**

### Clickhouse changes

Starting from version 1.8, Rspamd has stopped using multiple tables and now uses a single table, `rspamd`, with all columns. This improves performance and eliminates the need for inefficient joins in Clickhouse. If you have used the Clickhouse module prior to version 1.8, your **schemas** will be automatically converted. However, **the existing data** will **NOT** be converted and will remain in the old tables. It may be necessary to use a command to enforce the new schema:

```
OPTIMIZE rspamd FINAL
```

Please note that this command may take a significant amount of time to complete if you have stored a large amount of historical data.

Additionally, you need to update your **queries** that use the additional Rspamd tables, such as `rspamd_urls`, `rspamd_asn`, `rspamd_attachments`, `rspamd_symbols`, and others. All corresponding fields are now located in the `rspamd` table. At this time, it is not possible to migrate old data from these tables.

### Settings changes

Rspamd now includes a `settings.conf` file, which incorporates `local.d/settings.conf` and `override.d/settings.conf`. If you have used these files to store settings, please ensure that they do not conflict with the new configuration layout.

## Migration to Rspamd 1.7.4

The only potential issue is that Rspamd now listens on **localhost only** by default. This could affect configurations that rely on the previous behavior of listening on all IP addresses (e.g. `*`).

However, we believe that it is important to keep the default settings as restrictive as possible to avoid potential security issues, which have occurred in other projects with 'open to all' defaults.

## Migration to Rspamd 1.7.0

It is recommended to run `rspamadm configwizard` to ensure that your configuration is compatible with version 1.7. This version no longer supports the `metrics` concept, which was never officially supported in the past. However, you may have come across instances of `metric "default"` in various parts of the Rspamd configuration and settings.

In version 1.7, we will continue to support the old `metric` keyword and scores defined under this section, such as in `rspamd.conf.local`. However, it is now recommended to define symbol scores in group settings (`local.d/group_*.conf`), which can be found in the `etc/rspamd/scores.d` folder.

There is no need to undertake any action if you have your custom scores defined in the legacy files. Rspamd will continue support of definitions in these files.

## Migrating to Rspamd 1.6.5

As a result of several important fixes made to tokenization algorithms, it is possible that the statistics and fuzzy modules may lose some precision. In these cases, you may want to consider re-learning your databases to improve the accuracy of filtering.

## Migrating to Rspamd 1.6.0

In this version, due to the implementation of the new milter interface, there is an important incompatible change that you may need to address if you use the `rmilter_headers` module. This module has been renamed to `milter_headers` and the corresponding protocol section is now named `milter` instead of `rmilter`. If you have configured this module inside `local.d/rmilter_headers.conf` or in `override.d/rmilter_headers.conf`, then no action is required, as these files will still be loaded by the renamed module. Otherwise, you will need to change the section name from `rmilter_headers` to `milter_headers`.

The `milter_headers` module now skips adding headers for local networks and authenticated users by default. This behavior can be re-enabled by setting `skip_local = false` and/or `skip_authenticated = false` in the module configuration. Alternatively, you can set `authenticated_headers` and/or `local_headers` to a list of headers that should not be skipped.

Additionally, a [proxy worker]({{ site.url }}{{ site.baseurl }}/doc/workers/rspamd_proxy.html) has been added to the default configuration and listens on all interfaces on TCP port 11332. If you do not need it, you can set `enabled = false` in `local.d/worker-proxy.inc`.

This release also eliminates the configuration split for systemd/sysv platforms. To ensure proper functionality, custom init scripts should utilize `rspamd.conf` instead of `rspamd.sysvinit.conf`. For those utilizing systemd and prefer logging to the systemd journal, the following should be added to `local.d/logging.inc`:

~~~hcl
systemd = true;
type = "console";
~~~

A significant overhaul of the Lua libraries has occurred in Rspamd 1.6. Some custom scripts may fail if they are loaded prior to `rspamd.lua` or if manual modifications have been made to `rspamd.lua`should be loaded before all custom scripts. This is the default behavior, however, in highly customized setups it may cause issues. In general, it is crucial to ensure that the following line is present in your code (found at the very beginning of `rspamd.lua`):

~~~lua
require "global_functions" ()
~~~

The Rmilter tool is now deprecated in favor of milter protocol support in the [rspamd proxy]({{ site.url }}{{ site.baseurl }}/doc/workers/rspamd_proxy.html). Examples of some specific features previously implemented in Rmilter can be found in the [milter headers module]({{ site.url }}{{ site.baseurl }}/doc/modules/milter_headers.html). It is recommended to migrate from Rmilter as soon as possible, as Rspamd 1.6 will be the last version to support the Rmilter tool. In future major releases (starting from 1.7), there will be **no guarantees** of compatibility with Rmilter.

For example, if you need the old behaviour for `extended_spam_headers` in Rmilter is desired, the following snippet can be added to `local.d/milter_headers.conf`:

~~~hcl
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

New configuration files have been added for the following modules which previously lacked them: `greylist`, `metadata_exporter` and `metric_exporter.` If you have previously configured one of these modules in `rspamd.conf.local`, it is recommended to move your configuration to `rspamd.conf.override` to ensure that it is preserved verbatim, or to rework your configuration to use `local.d/[module_name].conf` instead.

Additionally, if composites have been defined in `local.d/composites.conf` or `override.d/composites.conf`, these should be moved to `rspamd.conf.local` or reworked to the new format. An example can be found in `/etc/rspamd/composites.conf`.

You are also suggested to disable outdated and no longer supported features of Rmilter and switch them to Rspamd:

- Greylisting - provided by [greylisting module]({{ site.url }}{{ site.baseurl }}/doc/modules/greylisting.html)
- Ratelimit - is done by [ratelimit module]({{ site.url }}{{ site.baseurl }}/doc/modules/ratelimit.html)
- Replies whitelisting - is implemented in [replies module]({{ site.url }}{{ site.baseurl }}/doc/modules/replies.html)
- Antivirus filtering - provided now by [antivirus module]({{ site.url }}{{ site.baseurl }}/doc/modules/antivirus.html)
- DCC checks - are now done in [dcc module]({{ site.url }}{{ site.baseurl }}/doc/modules/dcc.html)
- Dkim signing - can be done now by using of [dkim module]({{ site.url }}{{ site.baseurl }}/doc/modules/dkim.html#dkim-signatures) and also by a more simple [dkim signing module]({{ site.url }}{{ site.baseurl }}/doc/modules/dkim_signing.html)

All duplicate features are still present in Rmilter for compatibility purposes. However, it is unlikely that any further development or bug fixes will be applied to them.

From version `1.9.1` it is possible to specify `enable` option in `greylisting` and `ratelimit` sections. It is also possible for `dkim` section since `1.9.2`. These options are `true` by default. Here is an example of configuration where greylisting and ratelimit are disabled:

~~~hcl
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

These options are enabled by default solely for compatibility reasons. In future Rmilter releases, they will be **DISABLED** by default.

## Migrating to Rmilter 1.10.0 and Rspamd 1.4.0

TThe default passwords, specifically `q1` and `q2`, are no longer permitted for remote authentication. This change is a result of the widespread misuse of these **example** passwords and the potential security risks posed by some Rspamd users.

## Migrating to Rmilter 1.9.1 and Rspamd 1.3.1

In these releases, systemd socket activation has been removed. Note that upon upgrading on Debian platforms, Rmilter may not restart correctly. To resolve this, please run `systemctl restart rmilter` after installing the package. On the other hand, Rspamd is expected to restart correctly upon upgrade. Additionally, both Rspamd and Rmilter should be configured to automatically run on reboot post-upgrade.

## Migrating from Rmilter 1.8 to Rmilter 1.9

Please note that there are a few changes to the supported features in this release:

* beanstalk support has been removed from Rmilter in honor of Redis [pub/sub](https://redis.io/docs/interact/pubsub/), you must remove the whole `beanstalk` section from the configuration file
* auto whitelist for greylisting is no longer supported as it has been broken from the very beginning, you must remove all `awl` options from the greylisting section

If you have been using Beanstalk for certain purposes, you can transition to using Redis [pub/sub](https://redis.io/docs/interact/pubsub/). The `redis` section includes settings such as `spam_servers` and `spam_channel` for sending spam, and `copy_servers`, `copy_prob`, and `copy_channel` for sending message copies, which can help you reproduce Beanstalk functions using Redis.

Rmilter now provides additional options for configuring your local settings. You can now use `rmilter.conf.local` and `rmilter.conf.d/*.conf` files to override the default configuration.

Additionally, Rmilter no longer includes several SpamAssassin-compatible headers such as `X-Spam-Status`, `X-Spam-Level`, and `X-Spamd-Bar`. Instead, Rmilter now supports adding and removing custom headers as instructed by Rspamd (version 1.3.0 or higher). To restore the removed headers, you can use the example script provided below, which should be added to `/etc/rspamd/rspamd.local.lua`:

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

Rspamd version 1.3 does not introduce any incompatible changes

## Migrating from Rspamd 1.1 to Rspamd 1.2

Rspamd version 1.2 does not introduce any incompatible changes

## Migrating from Rspamd 1.0 to Rspamd 1.1

Please note that there is an incompatible change in the per-user statistics behavior for users with per-user statistics enabled.

Both `redis` and `sqlite3` now follow a consistent approach for per-user statistics:

* If per-user statistics is enabled check per-user tokens **ONLY**
* If per-user statistics is not enabled then check common tokens **ONLY**

If the previous behavior is desired, a separate classifier for per-user statistics must be implemented, for example:

~~~hcl
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

Rspamd 1.0 has introduced changes to the default settings for statistics tokenization. The new default setting is `modern`, which generates tokens from normalized words and includes various improvements. However, these changes are not compatible with the statistics model used in pre-1.0 versions. To use these new features you should either **relearn** your statistics or continue using your old statistics **without** new features by adding a `compat` parameter:

~~~hcl
classifier {
...
    tokenizer {
        compat = true;
    }
...
}
~~~

The recommended way to store statistics now is the `sqlite3` backend (which is incompatible with the old mmap backend):

~~~hcl
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

The Rspamd web interface is now a part of the Rspamd distribution. Additionally, Rspamd itself now serves all static files, eliminating the need for a separate web server. As a result, the WebUI worker has been removed, and the controller now acts as both a web browser and the rspamc client. However, it is still recommended to set up a full-featured HTTP server in front of Rspamd for added security features such as TLS and access controls.

Furthermore, there are now two levels of password protection for Rspamd: `password` for read-only commands and `enable_password` for commands that change data. If `enable_password` is not specified, `password` is used for both types of commands.

Here is an example of the full configuration of the Rspamd controller worker to serve the WebUI:

~~~hcl
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

The settings system in Rspamd has undergone a complete overhaul. It is now implemented as a Lua plugin that registers pre-filters and assigns settings based on dynamic maps or a static configuration. To use the new settings system, please refer to the updated [documentation]({{ site.url }}{{ site.baseurl }}/doc/configuration/settings.html). The previous settings system has been entirely removed from Rspamd.

### Lua changes

Please be aware that there have been significant changes to the Lua API in this release, some of which may result in compatibility issues.

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

`rspamd_message` has been **removed** completely. Instead, task methods should be used to access message data. This includes methods such as:

* `get_date` - this method now returns a date for the task and message based on the provided arguments:

~~~lua
local dm = task:get_date{format = 'message'} -- MIME message date
local dt = task:get_date{format = 'connect'} -- check date
~~~

* `get_header` - this function has undergone significant changes. The new version of `get_header` returns a decoded string, `get_header_raw` returns an undecoded string, and `get_header_full` returns a full list of tables. For more information, please refer to the updated [documentation]({{ site.url }}{{ site.baseurl }}/doc/lua/rspamd_task.html). You may need to update your existing code that uses the `task:get_header` method.
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

* `get_from` and `get_recipients` now accept optional numeric arguments that determine where to retrieve the sender and recipients for a message. By default, this argument is set to `0`, which means that data is initially checked in the SMTP envelope (i.e., `MAIL FROM` and `RCPT TO` SMTP commands) and if the envelope data is not available, it is then obtained from MIME headers. A value of `1` means that data is checked in the envelope only, while `2` switches the mode to MIME headers. Here is an example from the `forged_recipients` module:

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

Rspamd now exclusively uses the HTTP protocol for all operations, making the use of additional client libraries unnecessary. Additionally, the fallback to the older `spamc` protocol has been implemented to ensure automatic compatibility with software such as `rmilter` and other programs that use the `rspamc` protocol.
