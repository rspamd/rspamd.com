---
layout: doc
title: Frequently asked questions
---

# Frequently asked questions
{:.no_toc}

This document includes some questions and practical examples that are frequently asked by Rspamd users.

{% include toc.html %}

## General questions

### Where to get help about Rspamd

The most convenient place for asking questions about Rspamd is the IRC channel _#rspamd_ on [OFTC](https://oftc.net). For more information you can also check the [support page]({{ site.url }}{{ site.baseurl }}/support.html)

### What versions of Rspamd are supported

Rspamd typically maintains two supported branches in its git repository: the stable branch (`rspamd-<version>`) and the development branch (known as `master`). Stable releases are typically created from the stable branch, while unstable or `mainline` releases come from the `master` branch. When a new major release is ready to transition to the stable phase, support for the old stable branch is discontinued. Users are encouraged to migrate to the new stable branch at that point. The project does not provide support for old releases and old stable branches.

### Using of the experimental packages

Experimental packages are typically created from the `master` branch and do not have precise change logs or release notes. However, all experimental packages are identified by a git hash. You can conveniently access all the changes by using the following command:

```
git log <old_hash>..<new_hash>
```

Experimental packages are generally regarded as less stable but are usually built once they successfully pass all internal tests. These packages often include new major and minor features that could be beneficial for your specific setup.

You should consider experimental packages in the following cases:

* You experience a significant issue with a stable package that is (likely) fixed in experimental packages.
* You are running a small system, so you can manage the bleeding-edge version of Rspamd and can manually downgrade the package if needed (e.g., if a fresh package conflicts with your configuration).
* You can test a new version using [mirroring in Rspamd proxy]({{ site.baseurl }}/doc/workers/rspamd_proxy.html).

In fact, the last option is recommended for all users, even if you prefer to use stable packages exclusively. This approach assists in reducing stress and mitigating risks by allowing you to test new versions with your specific configuration and production traffic without impacting your live environment. The only downside is that it requires some computational and mental resources to establish a mirror for experiments, as you need to replicate your entire environment, including local configurations and Redis instances (probably with a reduced `maxmemory` limit, of course).

### How Rspamd packages are built

Rspamd packages are available for a variety of [platforms]({{ site.baseurl }}/downloads.html). These packages are constructed based on the following principles:

1. Where possible, enable `link time optimizations` to enhance overall performance.
2. Bundle [LuaJIT](https://luajit.org) using 2.1 beta versions from the vendor. In certain experiments, this approach has demonstrated a performance boost of up to 30% compared to the stable LuaJIT.
3. Enable jemalloc.
4. Support [Hyperscan](https://www.hyperscan.io/).

It's important to note that some of these options may not be available on older platforms like Debian wheezy, Ubuntu Precise, or CentOS 6, due to limitations in the provided software.

All packages are digitally signed and should be downloaded via `https`. Additionally, debugging packages are provided (such as `rspamd-debuginfo` for RPM packages and `rspamd-dbg` for DEB packages).

For advanced debugging needs, there are ASAN packages. These packages are built with minimal optimizations and incorporate [Address Sanitizer](https://en.wikipedia.org/wiki/AddressSanitizer) for issue diagnosis. While they are significantly slower and not recommended for typical production usage (although they could be used), they are indispensable for debugging Rspamd-related problems.

### Resolver setup

DNS resolving is a very important part of the spam filtering process as it is a primary source of information from various DNS lists, including IP and URL blacklists, whitelists, and reputation data. In the absence of proper DNS resolution, Rspamd can become entirely non-functional and might even fail to initiate. Moreover, if you rely on your service provider's resolver or a public resolver, you could encounter issues such as being blocked by the majority of DNS list providers or receiving inaccurate results.

Please keep in mind that Rspamd does NOT utilize standard resolver libraries for performance and reliability considerations. Consequently, all resolver configurations must either be static, residing in the typical `/etc/resolv.conf` or specified in `local.d/options.inc` for Rspamd's custom resolvers. Changes to DNS resolvers require Rspamd to be reloaded or restarted. Rspamd does not currently read the `/etc/hosts` file either.

It's essential to note that Rspamd can encounter issues when your provider's DNS returns an IP address for browser redirection rather than the actual response.

Therefore, it is strongly advised to employ your own recursive resolver when using Rspamd or any other email-related technology. Our recommended choice is to set up Unbound or, for more advanced setups, the Knot Resolver. You can find basic setup information for Unbound [here](https://wiki.archlinux.org/index.php/unbound).

Following that, you can configure your local resolver globally via `/etc/resolv.conf` or explicitly for Rspamd in the `local.d/options.inc` file:

~~~hcl
# local.d/options.inc
dns {
  nameserver = ["127.0.0.1"];
}
~~~

or, if you want some backup as a last resort, you can use `master-slave` [rotation](configuration/upstream.html) as following:

~~~hcl
# local.d/options.inc
dns {
  nameserver = "master-slave:127.0.0.1,8.8.8.8";
}
~~~

If you use large scale DNS system you might want to set up `hash` rotation algorithm. It will significantly increase cache hit rate and reduce number of recursive queries if you have more than one upstream resolver:

~~~hcl
# local.d/options.inc
dns {
  nameserver = "hash:10.0.0.1,10.1.0.1,10.3.0.1";
}
~~~

Rspamd uses consistent hashing and has some tolerance to the configuration changes.


### How to figure out why Rspamd process crashed

Similar to other programs written in the `C` language, the most effective approach for diagnosing these issues is to obtain a `core` dump. Unfortunately, there is no universal solution suitable for all platforms. However, for FreeBSD (and potentially other BSD-like systems), Linux, or macOS, you can follow these steps:

To begin, create a dedicated directory for core files that is writable by all users on the system:

```
mkdir /coreland
chmod 1777 /coreland
```

Additionally, it's advisable to include the following settings in `/etc/sysctl.conf` and then execute `sysctl -p` to apply them:

**Linux specific**

```
sysctl kernel.core_pattern=/coreland/%e.core
```

or (with PID)

```
sysctl kernel.core_pattern=/coreland/%e-%p.core
```

Also add the following:

```
sysctl kernel.core_uses_pid=1
sysctl fs.suid_dumpable=2
```

You also need to install `debuginfo` package, that is called `rspamd-debuginfo` for RPM based Linux distributions and `rspamd-dbg` for Debian based ones (e.g. Ubuntu).

**FreeBSD specific**

For FreeBSD you can have either one core for all processes by setting:

```
sysctl kern.corefile=/coreland/%N.core
```

or a separate core for each crash (that includes PID of process):

```
sysctl kern.corefile=/coreland/%N-%P.core
```

Additional settings:

```
sysctl kern.sugid_coredump=1
```

To automatically set the variables each time the machine boots, add them to `/etc/sysctl.conf`. For instance,

```
kern.corefile=/coreland/%N.core
kern.sugid_coredump=1
```

**macOS specific**

The default settings in macOS disable core dumps and set the sticky bit on the macOS core dump directory /cores. As a result, core dumps can only be appended and not deleted.

To check the existing hard and soft settings on macOS:

```
sysctl -a | grep core | grep -v cpu
ulimit -c
launchctl limit | grep core
ls -ld /cores
```

Enable core dumps on macOS, and see them in the Finder if desired:
```
ulimit -c unlimited
sudo launchctl limit core unlimited
# defaults write com.apple.finder AppleShowAllFiles TRUE
```

Disable core dumps on macOS, and not show `/cores` in the Finder:
```
ulimit -c 0
sudo launchctl limit core 0 unlimited
# defaults delete com.apple.finder AppleShowAllFiles
```

Delete core dumps on macOS:
```
sudo chown root /cores/core.*
sudo rm /cores/core.*
```

#### ASAN builds

You should also consider using the [ASAN packages]({{ site.baseurl }}/downloads.html) if they are available for your system (or rebuild Rspamd from the sources with ASAN support, but this is significantly more complicated). In some cases, it is the only way to debug and fix your issue. Additionally, you may need an ASAN log in case of a crash. Since these logs are dumped to `stderr` by default, you might need to set a special environment variable on startup:

```
export ASAN_OPTIONS="log_path=/tmp/rspamd-asan"
```

Or add this to `systemctl edit rspamd` if using systemd:

```
[Service]
Environment="ASAN_OPTIONS=log_path=/tmp/rspamd-asan"
```

If you discover that Rspamd has crashed, you might want to utilize both the core file (backtrace from it) and the `/tmp/rspamd-asan.<pid>` file (where `<pid>` is the PID of the crashed process) to report your issue.

#### Setting system limits

In distributions with traditional SysV init, you can utilize the service init file, such as `/etc/init.d/rspamd`, to enable the dumping of core files by setting the appropriate resource limit. Add the following line:

```
ulimit -c unlimited
```

just after the header comment. On FreeBSD, you can use the file `/usr/local/etc/rc.d/rspamd` in the same way.

A good way to test the core files setup is by sending a `SIGILL` signal to a process. For example, run `pkill --signal 4 rspamd` or `kill -s 4 <YOUR_PID>` and then check the `/coreland` directory for a core dump.

#### Systemd notes

On a distro with systemd (most mainstream Linux distros), the process is a bit different. Firstly, edit the file `/etc/systemd/system.conf` and uncomment the `DefaultLimitCORE` parameter to enable systemd core dumps:

```
DefaultLimitCORE=infinity
```

After this, run `systemctl daemon-reload` to reread the configuration, followed by `systemctl daemon-reexec` to apply it.

More information about core dumps and systemd can be found [here](https://wiki.archlinux.org/index.php/Core_dump).

### How to limit number of core files

Rspamd can halt core dumps upon reaching a specified limit. To enable this functionality, add the following lines to `/etc/rspamd/local.d/options.inc`:

```
cores_dir = "/coreland/";
max_cores_size = 1G;
```

This configuration limits the combined size of files in the `/coreland/` directory to 1 gigabyte. Once this limit is reached, Rspamd will cease dumping core files. (Please note that Rspamd cannot distinguish its own core files from other core files on the system.)

### What can I do with core files

In most cases, it is sufficient to open the core file with `gdb` or another debugger, such as `lldb`:

```bash
gdb `which rspamd` -c /coreland/rspamd.core
lldb `which rspamd` -c /coreland/rspamd.core
```

If the core file is opened without errors, you can type `bt full` for GDB or `bt all` for LLDB in the debugger command line to obtain the full stack trace that caused this specific error.

### Why do I have zero score for a spam message

This is a common question from Rspamd users. A typical log sample looks like this:

```
2018-08-27 13:23:11 #29623(normal) <xxx>; task; rspamd_task_write_log: id: <xxx@xxx.com>, qid: <xxx>, ip: xx.xx.xx.xx, from: <info@xxx.xxx>, (default: F (soft reject): [0.00/15.00] [DBL_SPAM(6.50){xxx.dbl.spamhaus.org;},URIBL_SBL_CSS(6.50){xxx.xxx;},RBL_SPAMHAUS_CSS(2.00){xx.xx.xx.xx.zen.spamhaus.org : 127.0.0.3;},RECEIVED_SPAMHAUS_CSS(1.00){116.179.76.62.zen.spamhaus.org : 127.0.0.3;},GREYLIST(0.00){greylisted;Mon, 27 Aug 2018 10:28:11 GMT;new record;}), len: xx, time: 978.464ms real, 15.045ms virtual, dns req: 45, digest: <xxx>, rcpts: <x@x.x>, mime_rcpts: <x@x.x.>
```

Rspamd treats scores internally, and no external services should depend on those scores. Generally, you need to use only the `action` to decide what to do with a message. In the example above, the greylisting module decided to greylist the message to build better confidence about it. The MTA, in turn, should emit a temporary error in this case. Scores should be used to understand the decision process, but they should not be relied upon to take action on a message—this is a rule of thumb.

### Why my score is not a plain sum

In some cases, plugins in Rspamd may trigger a `passthrough` action. In such instances, the score could be set to a specific value or to the action threshold. Starting from version 1.8.1, you will find a special record in the log:

```
2018-10-13 09:34:20.03286 #97398(controller) <0260c3>; csession; rspamd_task_write_log: id: <xxxx>, from: <xxx>, (default: T (reject): [100500.00/15.00] [RCPT_COUNT_ONE(0.00){1;},RCVD_COUNT_THREE(0.00){3;},RE_TEST(0.00){},TOP(0.00){},TO_DN_NONE(0.00){}]), len: x, time: 1ms real, 1ms virtual, dns req: 64, digest: <xxx>, mime_rcpts: <xxx>, forced: reject "test"; score=100500.00 (set by bla)
```

The `forced:` section indicates what has occurred. Here is a list of plugins that can set a forced action:

* [greylist](modules/greylisting.html) - will set `soft reject` when a message needs to be greylisted
* [ratelimit](modules/ratelimit.html) - will set `soft reject` when a ratelimit is reached
* [dmarc](modules/dmarc.html) - might set actions if configured to do so (not enabled by default but listed in an example)
* [antivirus](modules/antivirus.html) - can set actions if that's explicitly set in rules
* [multimap](modules/multimap.html) - will set actions for maps where `action` is set
* [replies](modules/replies.html) - can set `no action` for replies if configured to do so
* [force_actions](modules/force_actions.html) - specific module to define passthrough actions
* [spamtrap](modules/spamtrap.html) - can set specific bypass for spamtrap
* [metadata_exporter](modules/metadata_exporter.html) - can set `soft reject` if cannot send reports if configured specifically

### Why can I have different results for the same message

If your message accumulates a `reject` score, Rspamd will halt further checks to conserve resources. However, certain checks, like network checks, might still proceed as they could be initiated before reaching the threshold for the message. Consequently, you might observe varying results (all exceeding or equal to the `reject` threshold) for the same message. To mitigate this behavior, set the HTTP header:

```
Pass: all
```

when sending a request to Rspamd (equivalent to the `-p` flag for the `rspamc` client).

Another potential reason for differing results is a too-low DNS or task timeout setting, preventing asynchronous rules from obtaining results before being terminated by a timeout. For information on the relevant options, use the following commands:

```
rspamadm confighelp options.dns
rspamadm confighelp options.dns_max_requests
rspamadm confighelp workers.normal.task_timeout
```

and more generally:

```
rspamadm confighelp -k timeout
```

### How to debug some module in Rspamd

If you're unfamiliar with certain functionalities of Rspamd [modules]({{ site.url }}{{ site.baseurl }}/doc/modules/), enabling debugging for those modules can be quite beneficial. To accomplish this, include the following in your configuration:

```hcl
# local.d/logging.inc
debug_modules = ["module_name"];
```

It's worth noting that some modules may not generate any useful debug information at this time.

### How to report bugs found in Rspamd

If your concern pertains to system crashes, it's crucial to acquire the core file before submitting a report. Additionally, it proves helpful to elucidate when the crash occurs and, if applicable, furnish a concise test message or the problematic configuration.

In instances concerning rule-related issues, we typically require a **message sample** that triggers the problem. To safeguard your privacy, feel free to redact irrelevant headers and content. For instance, consider anonymizing message sender/recipients, subject, and/or other fields.

If the issue revolves around SPF, we need the SMTP From (or Helo) and the sender's IP address.

Regarding problems with statistics, DKIM, or ARC, regrettably, we require a complete message with all headers and content preserved.

Please note that bug reports lacking message samples will not be considered unless accompanied by either a patch or if the bug is inherently straightforward.

Ultimately, we strongly prefer patches/pull requests over plain bug reports.

For reporting bugs or making suggestions about the documentation or the website, please refer to [this Github repository](https://github.com/vstakhov/rspamd.com).

### What is the difference between `rspamc` and `rspamadm`

rspamadm is an administration tool that works with the **local** Rspamd daemon via a unix socket and performs management tasks. You can get help for this tool, and its options, by typing:

```
rspamadm help
rspamadm help <command>
```

rspamc is a client for an Rspamd remote daemon. It can communicate with an Rspamd scanner process or Rspamd controller process using the HTTP (with optional encryption) protocol, getting and displaying the results. It can do tasks such as scanning, learning and getting statistics:

```
rspamc message.eml # Scan a message
rspamc learn_spam message.eml # Learn message
rspamc -f 1 -w 10 fuzzy_add message.eml # Add message to fuzzy storage
```

### How does Rspamd support different characters sets

By default, Rspamd converts all messages to the `UTF-8` encoding. This conversion includes text parts (both `text/plain` and `text/html`), headers, and MIME elements (such as boundaries and filenames). If there is no information on how to convert something to `UTF-8`—for example, when there is no `charset` attribute in the `Content-Type` header or if there are some broken `UTF-8` characters—then Rspamd treats this text as raw for safety considerations. The distinction between raw and `UTF-8` text lies in the fact that for `UTF-8`, it is possible to use Unicode regular expressions by specifying the `/U` flag. For raw texts, Rspamd uses raw complementary expressions, which may lack some features.

It is always safe to assume that everything will be encoded in `UTF-8`; even in the case of raw messages, you might miss some particular features. There is also a module called [chartable]({{ site.url }}{{ site.baseurl }}/doc/modules/chartable.html) that checks for different Unicode (or `ASCII` - non-`ASCII` characters in raw mode) symbols and tries to determine if there is an attempt to mix character sets.

### How can I report a false positive with fuzzy hit

Sometimes, the fuzzy lists provided by Rspamd yield false positives (e.g., hits on legitimate messages). Here is the procedure to delist those hashes from the storage:

1. **Extract the Short Hash from the Symbol**: The short hash is listed in the symbol's options for the fuzzy symbols, e.g., `1:xxxxxxfe7x:0.99:txt`. In this example, the short hash value is a hexadecimal string like `xxxxxxfe7x`.
2. **Search for the Log Line**: In your Rspamd logs, look for lines indicating the discovery of fuzzy hashes. These lines typically contain the short hash and the full hash. Search for a log line resembling:

~~~
found fuzzy hash: <short_hash> -> <full_hash>
~~~

Here, `<short_hash>` is the short hash you extracted from the symbol, and `<full_hash>` is the full hash you want to delist.

3. **Use the Log Line as Context**: Once you locate the log line with the full hash, use it as context when submitting the hash for delisting on bl.rspamd.com. This context will help the Rspamd team understand why you believe the hash is a false positive, providing evidence that the hash has been detected in legitimate content.

4. **Submit the Full Hash with Context**: Visit the Rspamd Fuzzy List Submission page at [https://bl.rspamd.com](https://bl.rspamd.com) and enter the full hash extracted from the logs. In the "Context" or "Comments" field, paste the log line containing the short and full hashes. This context aids the Rspamd team in understanding the situation and reviewing the delisting request more effectively.

### Can I relearn messages for fuzzy storage or for statistics

If you need to move a hash from one list (e.g., blacklist) to another (e.g., whitelist), follow these steps:

1. Use the `rspamc fuzzy_del` command for the first list (lists are identified by number).
2. Follow up with the `rspamc fuzzy_add` command:

For example:

```
rspamc -f 1 fuzzy_del message.eml
rspamc -f 2 -w <weight> fuzzy_add message.eml
```

If you just need to increase a score, call `fuzzy_add` with the desired score change. Note that it is not possible to decrease a score.

Statistics are treated differently. Rspamd maintains hashes of tokens learned in a storage called the `learn_cache`. If Rspamd finds that a particular token combination has been learned already, it performs the following actions:

* if the class of tokens is the same (e.g., spam and spam), Rspamd refuses to learn these tokens again.
* otherwise, Rspamd performs a process called `relearning`:
  + scores in the current class are decreased for this token set.
  + scores in the opposite class are increased for this token set.
  + the class of tokens in the learn cache is updated accordingly.

All these actions are automatically performed if the `learn_cache` is enabled. It is highly recommended to enable this setting, as repeated learnings will affect the performance of the statistical module.

### Why do some symbols have different scores for different messages

Rspamd supports what are known as `dynamic` symbols. In this context, a metric score is multiplied by a value, typically in the range of `[0..1]`, and then added to the scan result. For instance, the Bayes classifier introduces a score based on probability:

* if the probability is close to `50%`, the score is very close to 0.
* as the probability increases in the range `[50% .. 75%]`, the score gradually rises.
* when the probability approaches `90%`, the symbol's score is close to 0.95, reaching 1.0 at `100%`.
* this logic is reversed for HAM probability, with the score decreasing from `50%` to `0%` for spam probability.

Many Rspamd rules, including `PHISHING` and fuzzy checks, utilize dynamic scoring.

### Can I check a message with Rspamd without rspamc

```
curl --data-binary @- http://localhost:11333/symbols < file.eml
```

### How is Rspamd spelled and capitalized?

Rspamd, as a spam-filtering system or project, is spelled with a capital 'R' followed by a lowercase 'spamd.' However, when referring to the process or application, it is not capitalized.

## Configuration questions

### How to get my configuration

You can achieve this with the `rspamadm configdump` command. This command links all files together and displays the configuration as Rspamd observes it internally.

To convert it to JSON, use the `-j` flag. If you want to preserve comments, pass the `-c` flag. You can also dump specific parts of the configuration by typing:

```
rspamadm configdump multimap
rspamadm configdump worker
rspamadm configdump classifier
```

Configuration snippets are often requested when reporting issues found in Rspamd, especially if you are using a non-standard configuration.

### How to get the list of the enabled plugins

You can use `rspamadm configdump -m` to check or `rspamadm configwizard` to check and probably configure some of the plugins.

### How to change score for some symbol

Unfortunately, it's not a straightforward question. If you are using the [WebUI](../webui/), it redefines all scores and action thresholds. Once you set a symbol's score in WebUI, changing it through other means becomes challenging (you can achieve it by modifying or removing the file `$DBDIR/rspamd_dynamic`, typically located at `/var/lib/rspamd_dynamic` or `/var/db/rspamd_dynamic` depending on your OS).

If you intend to modify a symbol's score in the configuration, you should do it in the `local.d/groups.conf` file. This can be accomplished using the following syntax:

~~~hcl
# local.d/groups.conf

symbols {
  "SOME_SYMBOL" {
    weight = 1.0; # Define your weight
  }
}
~~~

Despite of the name of this file, this syntax does not change the group of the symbol, but it changes it's weight. You can also define your own symbols groups in this file:

~~~hcl
group "mygroup" {
  max_score = 10.0;
  
  symbols {
    "MY_SYMBOL" {
      weight = 1.0; # Define your weight
    }
  }
}
~~~

To redefine symbols for existing groups, it is recommended to use a specific `local.d` or `override.d` file, for example, `local.d/rbl_group.conf` to add your custom RBLs. To get the full list of such files, you can refer to the `groups.conf` file in the main Rspamd configuration directory (e.g., `/etc/rspamd/groups.conf`).

You can check your new scores by using `rspamadm configdump -g` from version 2.5: this command shows all Rspamd groups, symbols, and their scores. You can add the flag `-j` for JSON output and use the `jq` tool to operate with the output.

### Rspamd configuration nesting

Have you added an extra `section_name {}` to `local.d/section.conf` file? For example, this one will **NOT** work:

```hcl
# local.d/dkim_signing.conf
dkim_signing { # !!!! DO NOT ADD THIS
 domain {
   ...
 }
}
```

The correct version is the following:

```hcl
# local.d/dkim_signing.conf
domain {
   ...
}
```

Rspamd now also reports about this sort of nesting on configuration load and in `rspamadm configtest` as well.

### Rspamd paths

There are several variables defined in the UCL configuration parser, and they are also exported via the `rspamd_paths` global table in Lua code, available everywhere. Here are the default meanings and values for those paths (with `${PREFIX}` denoting the default installation prefix, e.g., `/usr`):

  * `CONFDIR` = `${PREFIX}/etc/rspamd` - main path for the configuration
  * `LOCAL_CONFDIR` = `${PREFIX}/etc/rspamd` - path for the user-defined configuration
  * `RUNDIR` = OS specific (`/var/run/rspamd` on Linux) - used to store volatile runtime data (e.g. PIDs)
  * `DBDIR` = OS specific (`/var/lib/rspamd` on Linux) - used to store static runtime data (e.g. databases or cached files)
  * `SHAREDIR` = `${PREFIX}/share/rspamd` - used to store shared files
  * `LOGDIR` = OS specific (`/var/log/rspamd` on Linux) - used to store Rspamd logs in file logging mode
  * `LUALIBDIR` = `${SHAREDIR}/lualib` - used to store shared Lua files (included in Lua path)
  * `PLUGINSDIR` = `${SHAREDIR}/plugins` - used to place Lua plugins
  * `RULESDIR` = `${SHAREDIR}/rules` - used to place Lua rules
  * `LIBDIR` = `${PREFIX}/lib/rspamd` - used to place shared libraries (included in RPATH and Lua CPATH)
  * `WWWDIR` = `${SHAREDIR}/www` - used to store static WebUI files

### What are Rspamd actions

Unlike SpamAssassin, Rspamd **suggests** the desired action for a specific message scanned. This could be treated as a recommendation to MTA what it should do with this message. Here is a list of possible choices that are sent by Rspamd:

- `discard`: drop an email but return success for sender (should be used merely in special cases)
- `reject`: ultimately reject message
- `rewrite subject`: rewrite subject to indicate spam
- `add header`: add specific header to indicate spam
- `no action`: allow message
- `soft reject`: temporarily delay message (this is used, for instance, to greylist or ratelimit messages)

From version 1.9, there are also some more actions:

- `quarantine`: push a message to quarantine (must be supported by MTA)
- `discard`: silently discard a message

From version 1.9, you can also define any action you'd like with its own threshold or use that in the `force_actions` module:

```hcl
actions {
  # Generic threshold
  my_action = {
    score = 9.0;
  },
  # Force action only
  phishing = {
    flags = ["no_threshold"],
  }
}
```

This might be a bit confusing, but internally Rspamd operates with rules. Each rule can add a positive or negative score to the result. Therefore, it is required to have some thresholds for actions that are applied to a message. These thresholds are defined in the `actions` section:

```hcl
actions {
  reject = 15;
  add_header = 6;
  greylist = 4;
}
```

As you can see, it is slightly different from the real actions list. The name `actions` should actually be treated as `score thresholds`, but it has this name historically. As you can see, there is no `discard` and `soft reject` actions, but there is a very special `greylist` element that specifies the score threshold for the greylisting plugin.

Thresholds usually define when this or that action should be applied. However, some modules can directly set a specific action without regard to the score-based thresholds. Hence, you should never rely on the score when making a decision about what to do with a message scanned by Rspamd. In short, you should always use the action and use scoring just to specify **generic** thresholds and for debugging purposes. There is completely **no guarantee** that the score, action threshold, and the real action will match for a message.

### What are local and override config files

Historically, Rspamd provided user-editable configuration files. However, as the project developed, it became clear that this idea had certain drawbacks. Rspamd configuration defines the overall filtering quality, performance, and other important characteristics. However, it is extremely difficult to maintain merging of local and updated configurations with new releases of Rspamd. Hence, we have decided to add two recommended ways to apply local changes:

1. Override configurations
2. Local configurations

An override configuration (`/etc/rspamd/rspamd.conf.override`) is used to ultimately redefine the default values in Rspamd. In this file, you can redefine **whole sections** of the default configuration. For example, if you have a module `example` defined in the default configuration as follows:

```hcl
example {
  option1 = "value";
  option2 = true;
}
```

and you wanted to override `option2` by adding the following to `/etc/rspamd/rspamd.conf.override`:

```hcl
example {
  option2 = false;
}
```

this might work unexpectedly: the new config would have an `example` section with a single key `option2`, while `option1` would be ignored. The global local file, namely `rspamd.conf.local`, has the same limitation: you can add your configuration there but you should **NOT** redefine anything from the default configuration or it will just be ignored. The only exception to this rule is the _metric_ section. So you could use something like:

```hcl
metric "default" {
  symbol "MY_SYMBOL" {
    score = 10.0;
    description = "my rule";
  }
}
```

and add this to the `rspamd.conf.local` (but not override).

### What are the local.d and override.d directories

From Rspamd version 1.2 onwards, the default configuration provides two more ways to extend or redefine each configuration file shipped with Rspamd. Each section definition includes two files with different priorities:

- `/etc/rspamd/local.d/<conf_file>` - included with priority `1` that allows you to redefine and extend the default rules; but `dynamic updates` or items redefined via the WebUI will have higher priority and can redefine the values included
- `/etc/rspamd/override.d/<conf_file>` - included with priority `10` that allows you to redefine all other things that could change configuration in Rspamd

The types of settings which can be merged are collections (`{}`) and lists (`[]`); other settings would be effectively overridden by either file.

An important difference from the global override and local rules is that these files are included within each section. Here is an example of utilizing local.d for the `modules.d/example.conf` configuration file:

```hcl
example {
  # WebUI include
  .include(try=true,priority=5) "${DBDIR}/dynamic/example.conf"
  # Local include
  .include(try=true,priority=1) "$LOCAL_CONFDIR/local.d/example.conf"
  # Override include
  .include(try=true,priority=10) "$LOCAL_CONFDIR/override.d/example.conf"
  option1 = "value";
  option2 = true;
}
```

in `local.d/example.conf`:

```hcl
option2 = false;
option3 = 1.0;
```

in `override.d/example.conf`:

```hcl
option3 = 2.0;
option4 = ["something"];
```

and the target configuration (that you could see using `rspamadm configdump example`):

```hcl
example {
  option1 = "value"; # From default settings
  option2 = false; # From local.d
  option3 = 2.0; # Local is overridden by override
  option4 = ["something"]; # From override.d
}
```

Here is another example with more complicated structures inside. Here is the original configuration:

```hcl
# orig.conf
rule "something" {
  key1 = value1;
  key2 = {
    subkey1 = "subvalue1";
  }
}
rule "other" {
  key3 = value3;
}
```

and there is some `local.d/orig.conf` that looks like this:

```hcl
# local.d/orig.conf
rule "something" {
  key1 = other_value; # overwrite "value1"
  key2 = {
    subkey2 = "subvalue2"; # append new value
  }
}
rule "local" { # add new rule
  key_local = "value_local";
}
```

then we will have the following merged configuration:

```hcl
# config with local.d/orig.conf
rule "something" {
  key1 = other_value; # from local
  key2 = {
    subkey1 = "subvalue1";
    subkey2 = "subvalue2"; # from local
  }
}
rule "other" {
  key3 = value3;
}
rule "local" { # from local
  key_local = "value_local";
}
```

If you have the same config but in `override.d` directory, then it will **completely** override all rules defined in the original file:

```hcl
# config with override.d/orig.conf
rule "something" {
  key1 = other_value;
  key2 = {
    subkey2 = "subvalue2";
}
rule "local" {
  key_local = "value_local";
}
```

This may seem complex, but it facilitates smoother updates and streamlines automatic management. If you're uncertain about your configuration, refer to the output of the `rspamadm configdump` command, which presents the target configuration with numerous available options. Additionally, you can use the `rspamadm confighelp` command to access help for various Rspamd options.

### What are rspamd.conf.local and rspamd.conf.override

While `override.d` and `local.d` modify entries within block elements, `rspamd.conf.local` and `rspamd.conf.override` act on entire blocks (`{}`).

The key difference lies in how these files modify the configuration. `rspamd.conf.local` adds or merges config elements (useful for setting custom metrics, for instance), while `rspamd.conf.override` adds or replaces config elements (useful for completely redefining settings).

### What are maps

Maps are files that contain lists of keys or key-value pairs that Rspamd can dynamically reload when changed. The significant distinction from configuration elements is that map reloading is done 'live' without an expensive restart procedure. Additionally, Rspamd can monitor both file and HTTP maps for changes (modification time for files and HTTP `If-Modified-Since` header for HTTP maps). Currently, Rspamd supports `HTTP` and `file` maps.

All maps operate in a similar way, providing you with choices on how to define a map:

1. Plain path to file or http (like `map = "http://example.com/file.txt"` or `map = "/tmp/mymap"`)
2. Composite path like `map = ["http://example.com/file.txt", "/tmp/mymap"]`. Maps data is concatenated from the sources.
3. An embedded map like `map = ["foo bar"];` or `map = ["foo 1", "bar b", "baz bababa"]` or `map = ["192.168.1.1/24", "10.0.0.0/8"]`
4. A fully decomposed object with lots of options

For the second option, it is also possible to have a composite path with fallback:

~~~hcl
exceptions = [
  "https://maps.rspamd.com/rspamd/2tld.inc.zst",
  "${DBDIR}/2tld.inc.local",
  "fallback+file://${CONFDIR}/2tld.inc"
];
~~~

In the example above, `fallback+file://${CONFDIR}/2tld.inc` will be used when the first composite backend is somehow unreachable (e.g. when first load of Rspamd or all elements are invalid).

Bear in mind that (1) and (3) can only be distinguished by making an array like `map = ["192.168.1.1/24"]`
Historically, just for radix map (ipnetwork ones) you could also use `map = "192.168.1.1/24"`, but it is not recommended.

### How is maps.rspamd.com maintained

The Rspamd source code refers to some online maps from `maps.rspamd.com`.

These are maintained in [https://github.com/rspamd/maps](https://github.com/rspamd/maps).

### What can be in the maps

Maps can have the following objects:

- spaces and one line comments started by `#` symbols
- keys
- optional values separated by a space character
- keys with spaces enclosed in double quotes
- keys with slashes (regular expressions) enclosed in slashes
- IP addresses with optional mask

Here are some examples:

```
key1 # Single key
# Comment ignored

# Empty line ignored
key2 1 # Key and value
"key3 with space"
"key with \" escaped" value with spaces
```

Regexp maps:

```
/regexp/i
/regexp/is some other value
```

IP maps:

```
192.168.0.1 # Mask is /32
[::1] # Mask is /128
[::1]/64
192.168.0.1/19
```

### How HTTP maps are loaded

There is a difference between a hot start and a cold start:

* on a hot start, Rspamd reuses cached maps for HTTP maps (including their `Cache-Control/ETag` attributes), so it starts using them immediately after the start.
* on a cold start (when new maps are added or when `/var/lib/rspamd` is cleaned), Rspamd fetches maps right after workers are started. There could be a gap, and this might be covered by the `file+fallback` backend option if map downtime is unacceptable.

```
map = [
  "https://maps.rspamd.com/rspamd/spf_dkim_whitelist.inc.zst",
  "$LOCAL_CONFDIR/local.d/maps.d/spf_dkim_whitelist.inc.local",
  "${DBDIR}/spf_dkim_whitelist.inc.local",
  "fallback+file://${CONFDIR}/maps.d/spf_dkim_whitelist.inc"
];
```

In this case, the first three backends will be used when the HTTP map is available, and all the data will be joined together. The final location defines a cold startup fallback, which will be replaced when/if the HTTP map is downloaded.

### How to sign maps

From Rspamd version 1.2 onwards, each map can have a digital signature using the `EdDSA` algorithm. To sign a map, you can use `rspamadm signtool`, and to generate a signing keypair, use `rspamadm keypair -s -u`:

```hcl
keypair {
   pubkey = "zo4sejrs9e5idqjp8rn6r3ow3x38o8hi5pyngnz6ktdzgmamy48y";
   privkey = "pwq38sby3yi68xyeeuup788z6suqk3fugrbrxieri637bypqejnqbipt1ec9tsm8h14qerhj1bju91xyxamz5yrcrq7in8qpsozywxy";
   id = "bs4zx9tcf1cs5ed5mt4ox8za54984frudpzzny3jwdp8mkt3feh7nz795erfhij16b66piupje4wooa5dmpdzxeh5mi68u688ixu3yd";
   encoding = "base32";
   algorithm = "curve25519";
   type = "sign";
}
```

Then you can use `signtool` to edit the map file:

```
rspamadm signtool -e --editor=vim -k <keypair_file> <map_file>
```

To enforce signing policies, you should add a `sign+` string to your map definition:

```
map = "sign+http://example.com/map"
```

To specify the trusted key you could either put the **public** key from the keypair in the `local.d/options.inc` file as following:

```
trusted_keys = ["<public key string>"];
```

or add it as a `key` definition in the map string:

```
map = "sign+key=<key_string>+http://example.com/map"
```

### What are one-shot rules

In Rspamd, a rule has the potential to be triggered multiple times. Consider a scenario where a message contains 10 URLs, and 8 of them match entries in a URL blacklist, identified by their unique top-level domain (TLD). In this situation, Rspamd would apply the URIBL rule 8 times for the same message. However, there are instances where this behaviour may not be desired. In such cases, simply include `one_shot = true` in the symbol's definition within the metric for that symbol, and the symbol will not be redundantly added multiple times.

### What is the use of symbol groups

Symbol groups serve the purpose of grouping similar rules together, proving particularly beneficial when employing group names in composite expressions like `gr:<group_name>`. Additionally, it is viable to establish a collective limit for the score of a specific group:

```hcl
group "test" {
  symbol "test1" {
    score = 10;
  }
  symbol "test2" {
    score = 20;
  }

  max_score = 15;
}
```

In this instance, should both `test1` and `test2` trigger, their combined score will not exceed `15`.

To review your group configuration in version 2.5 and beyond, utilize the command `rspamadm configdump -g`. This command provides a comprehensive display of all Rspamd groups, symbols, and their associated scores. For JSON output, include the `-j` flag and employ the `jq` tool for further manipulation of the output.

### Why are some symbols missing in the metric configuration

It is now feasible to establish rules entirely through Lua, enabling the configuration of all essential attributes without the need to modify the configuration files. Nevertheless, it remains possible to override the default scores in any configuration file. Here is an illustrative example of such a rule:

~~~lua
rspamd_config.LONG_SUBJ = {
  callback = function(task)
    local sbj = task:get_header('Subject')
    if sbj and util.strlen_utf8(sbj) > 200 then
      return true
    end
    return false
  end,

  score = 3.0,
  group = 'headers',
  description = 'Subject is too long'
}
~~~

You can use the same approach when writing rules in `rspamd.local.lua`.

### How can I disable some Rspamd rules safely

The best way is to add a condition for the specific symbol. This could be done, for example, in `/etc/rspamd/rspamd.local.lua`:

~~~lua
rspamd_config:add_condition('SOME_SYMBOL', function(task) return false end)
~~~

While more intricate conditions can be introduced, this particular one stands out as the simplest in terms of rule management and upgrades.

Furthermore, you have the option to dynamically enable or disable symbols selectively through the [settings module]({{ site.url }}{{ site.baseurl }}/doc/configuration/settings.html).

To deactivate an entire module, simply set `enabled = false` in its configuration.

### How can I disable some Rspamd action

You can dynamically enable/disable actions with [settings module]({{ site.url }}{{ site.baseurl }}/doc/configuration/settings.html). From version 1.8.1, you can set `null` to some module there:

~~~hcl
settings {
  some_settings {
    authenticated = true;
    apply {
      actions {
        rewrite_subject = null;
      }
    }
  }
}
~~~

### How can I disable greylisting

Just disable `greylisting` module by adding the following configuration:

~~~hcl
# local.d/greylist.conf
enabled = false;
~~~

### Can I scan outgoing mail with Rspamd

Certainly, Rspamd is designed to be inherently secure for outbound scanning by default. For detailed information, please refer to [this documentation]({{ site.url }}{{ site.baseurl }}/doc/tutorials/scanning_outbound.html).

It's important to note that this mode is activated **by default** for both **authenticated** senders and senders originating from **local networks** (located in options.inc -> local_networks). The default settings for local networks encompass connections initiated from both loopback/unix sockets and RFC 1918 private networks, such as `10.0.0.0/8` or `192.168.0.0/16`. For outbound checks, numerous checks are deactivated. Therefore, exercise caution to prevent unintentional activation of this mode, for instance, by neglecting to use XCLIENT on a proxy MTA or when employing a backup MX.

### Can I just sign messages using DKIM

Yes, use [user settings]({{ site.url }}{{ site.baseurl }}/doc/configuration/settings.html) and enable just `DKIM_SIGN` symbol (and `DKIM_SIGNED` in case if `dkim_signing` module is used), e.g.

```hcl
# rspamd.conf.local
settings { 
  sign_id {
    id = "dkim";
    apply {
      symbols_enabled = ["DKIM_SIGNED"]; # add ARC_SIGNED for ARC signing
      flags = ["skip_process"]; # To skip message processing
    }
  }
  sign_authenticated {
    authenticated = true;
    apply {
      symbols_enabled = ["DKIM_SIGNED"]; # add ARC_SIGNED for ARC signing
      flags = ["skip_process"]; # To skip message processing
    }
  }
  sign_networks {
    ip = ["172.16.0.0/16", "10.0.0.0/8"];
    apply {
      symbols_enabled = ["DKIM_SIGNED"]; # add ARC_SIGNED for ARC signing
      flags = ["skip_process"]; # To skip message processing
    }
  }
}
```

In this example, we deactivate all checks, except for the DKIM/ARC check and signing. This configuration is effective for authenticated users, local networks (two networks specified in this instance), or when a specific HTTP header is provided during a manual check:

```
rspamc --header="settings-id=dkim" message.eml
```

## Administration questions

### Where can I find all configuration options supported by Rspamd

To obtain a description of the options supported by Rspamd, utilise the `rspamadm confighelp` command. You can either specify a particular option or path, such as `rspamadm confighelp options`, or conduct a keyword search with commands like `rspamadm confighelp -k servers`. Refer to `rspamadm help confighelp` for the comprehensive list of command line options associated with this command.

### How to read Rspamd logs

Rspamd logs are augmented, meaning that each log line normally includes a `tag` which can help to figure out log lines that are related to, for example, a specific task:

```
# fgrep 'b120f6' /var/log/rspamd/rspamd.log

2016-03-18 15:15:01 #29588(normal) <b120f6>; task; accept_socket: accepted connection from 127.0.0.1 port 52870
2016-03-18 15:15:01 #29588(normal) <b120f6>; task; rspamd_message_parse: loaded message; id: <201603181414.u2IEEfKL062480@repo.freebsd.org>; queue-id: <D4CFE300135>
2016-03-18 15:15:01 #29588(normal) <b120f6>; task; rspamd_task_write_log: id: <201603181414.u2IEEfKL062480@repo.freebsd.org>, qid: <D4CFE300135>, ip: 2001:1900:2254:206a::19:2, from: <owner-ports-committers@freebsd.org>, (default: F (no action): [-2.11/15.00] [MIME_GOOD,R_SPF_ALLOW,RCVD_IN_DNSWL_HI,MAILLIST,BAYES_HAM,FANN_SCORE,FORGED_RECIPIENTS_MAILLIST,FORGED_SENDER_MAILLIST]), len: 6849, time: 538.803ms real, 26.851ms virtual, dns req: 22
```

Normally, you might want to check the final log line, for example, `rspamd_task_write_log` and subsequently find the tag which is `b120f6` in this example. Thereafter, you can check all log messages that are associated with this message.

### Can I customize log output for logger

Certainly, the `logging.inc` file includes a `log_format` option. The following configuration snippet proves useful as it enables the inclusion of additional information compared to the default output from the Rspamd logger:

```hcl
# local.d/logging.inc

log_format =<<EOD
id: <$mid>, $if_qid{ qid: <$>,} ip: [$ip], $if_user{ user: $,} smtp_from: <$smtp_from>, mime_from: <$mime_from>, smtp_rcpts: <$smtp_rcpts>, mime_rcpts: <$mime_rcpts>,
(default: $is_spam ($action): [$scores] [$symbols_scores]),
len: $len, time: $time_real real,
$time_virtual virtual, dns req: $dns_req, url domains:
$lua{
    return function(task)
      local fun = require "fun"
      local domains = {}
      local unique = fun.filter(function(dom)
        if not domains[dom] then
          domains[dom] = 1
          return true
        end
        return false
      end, fun.map(function(url) return url:get_host() end, task:get_urls()))
      local s = table.concat(fun.totable(unique), ',')
      return s
    end}
EOD
```

As evident, you have the flexibility to employ both embedded log variables and Lua code for tailoring log output. Further details can be found in the [logger documentation]({{ site.url }}{{ site.baseurl }}/doc/configuration/logging.html).

For obtaining debug information on a specific module in Rspamd, the `debug_modules` option within the logging configuration proves to be a valuable resource:

```hcl
# local.d/logging.inc

debug_modules = ["spf"];
```

### Which backend should I use for statistics

Currently, we recommend using `redis` for the statistics and fuzzy storage backend.

For those with existing statistics in `sqlite`, you can seamlessly convert them using the `rspamadm statconvert` routine:

```
# rspamadm statconvert --spam-db /var/lib/rspamd/bayes.spam.sqlite --symbol-spam BAYES_SPAM --ham-db /var/lib/rspamd/bayes.ham.sqlite --symbol-ham BAYES_HAM -h localhost
```
Importing the learn cache should be done only once.

A notable constraint of the redis backend is its lack of support for per-language statistics. However, it's worth noting that this feature is typically unnecessary in the majority of cases. The mechanism for per-user statistics in redis differs from that in sqlite. Detailed information is available in the [relevant documentation]({{ site.url }}{{ site.baseurl }}/doc/configuration/statistic.html).

Additionally, you can convert the fuzzy storage using `rspamadm fuzzyconvert`:

```
# rspamadm fuzzyconvert -d fuzzy.db -h 127.0.0.1:6379 -e 7776000
```

Finally, you need to change the default `sqlite` backend to `redis` and restart rspamd.

local.d/classifier-bayes.conf:

```hcl
backend = "redis";
```

override.d/worker-fuzzy.inc:

```hcl
backend = "redis";
```

### What Redis keys are used by Rspamd

The statistics module employs `<SYMBOL><username>` as keys, with statistical tokens stored within a corresponding hash table bearing the same name. Conversely, the `ratelimit` module utilises a distinct key for each value stored in Redis, as elaborated in the [ratelimit module documentation]({{ site.url }}{{ site.baseurl }}/doc/modules/ratelimit.html). The DMARC module follows suit, employing multiple keys to store cumulative reports, assigning a separate key for each domain.

It is advisable to establish limits for dynamic Rspamd data stored in Redis, encompassing ratelimits, IP reputation, and DMARC reports. For greater flexibility, you may opt to employ a separate Redis instance for statistical tokens, setting distinct limits or utilising separate databases by specifying the `db` parameter during the setup of the redis backend.

### How to delete multiple Redis keys matching a glob-style pattern

```sh
redis-cli [-p 6379] --scan --pattern 'rn_SHORT_*' | xargs redis-cli unlink
```

### How to run Rspamd using Unix sockets

From [https://github.com/vstakhov/rspamd/issues/1905](https://github.com/vstakhov/rspamd/issues/1905)


**Redis**

`/etc/redis/rspamd.conf`  (changes only)

    bind 127.0.0.1
    port 0
    unixsocket /var/run/redis/rspamd.sock
    unixsocketperm 770
    pidfile /var/run/redis/rspamd.pid
    logfile /var/log/redis/rspamd.log
    dir /var/lib/redis/rspamd/

Ensure the directory `/var/lib/redis/rspamd` is created and granted write permissions for the user `redis`.

If there is a necessity to initiate a distinct `Redis` instance specifically for `Rspamd`, refer to [these instructions](https://medium.com/@MauroMorales/running-multiple-redis-on-a-server-472518f3b603).

`/etc/rspamd/local.d/redis.conf`

    servers = "/var/run/redis/rspamd.sock";

`/etc/rspamd/local.d/classifier-bayes.conf`

    backend = "redis";
    autolearn = true;

Don't overlook the step of adding the user `_rspamd` to the `redis` group by executing the command `usermod -a -G redis _rspamd`.

To verify the connection, you can use the following command:

    myserver:~ # redis-cli -s /run/redis/rspamd.sock
    redis /run/redis/rspamd.sock> ping
    PONG
    redis /run/redis/rspamd.sock> monitor
    OK
    1509722016.014458 [0 unix:/var/run/redis/rspamd.sock] "SMEMBERS" "BAYES_HAM_keys"
    1509722018.522879 [0 unix:/var/run/redis/rspamd.sock] "SMEMBERS" "BAYES_SPAM_keys"
    1509722018.523305 [0 unix:/var/run/redis/rspamd.sock] "HLEN" "BAYES_SPAM"
    1509722018.523334 [0 unix:/var/run/redis/rspamd.sock] "HGET" "BAYES_SPAM" "learns"
    1509722024.892442 [0 unix:/var/run/redis/rspamd.sock] "SMEMBERS" "BAYES_SPAM_keys"
    1509722024.892870 [0 unix:/var/run/redis/rspamd.sock] "HLEN" "BAYES_SPAM"
    1509722024.892899 [0 unix:/var/run/redis/rspamd.sock] "HGET" "BAYES_SPAM" "learns"
    ...

**Nginx**

`/etc/tmpfiles.d/rspamd.conf`  (create this file if needed and run `systemd-tmpfiles --create`)

    d  /var/run/rspamd  0755  _rspamd  _rspamd  -

`/etc/rspamd/local.d/worker-controller.inc`

    bind_socket = "/run/rspamd/worker-controller.socket mode=0660 owner=_rspamd group=www";
    password = "$2$paparrytknfm8...";
    enable_password = "$2$paparrytknfm8...";

`nginx.conf`

    location /rspamd/ {
        auth_basic "Restricted Area";
        auth_basic_user_file /srv/www/.mydomain.tld.htpasswd;
        map $status $loggable {
            ~^[23]  0;
            default 1;
        }
        access_log /var/log/nginx/rspamd.access.log combined if=$loggable;
        error_log /var/log/nginx/rspamd.error.log warn;
        proxy_pass http://unix:/run/rspamd/worker-controller.socket:/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

### What data should be backed up?

The following directories and files should be included in a backup:

|Data|Location|
|---|---|
|Main configuration directory|`CONFDIR` = `${PREFIX}/etc/rspamd`|
|User-defined configuration directory|`LOCAL_CONFDIR` = `${PREFIX}/etc/rspamd`|
|Static runtime data (e.g. databases)<sup>[1](#Backup_fn1)</sup>|`DBDIR`<sup>[2](#Backup_fn2)</sup>: OS specific, `/var/lib/rspamd` or `/var/db/rspamd`|
|Redis configuration|OS specific, `/etc/redis/redis.conf` or `/usr/local/etc/redis.conf`<sup>[3](#Backup_fn3)</sup>|
|Redis database(s)|OS specific, `/var/lib/redis/dump.rdb` or `/var/db/redis/dump.rdb`.<sup>[3](#Backup_fn3),[4](#Backup_fn4)</sup>|

<a name="Backup_fn1">1</a>: You don't need to backup cached files: Hyperscan cache files ( `*.hs`, `*.hsmp`) and Rspamd maps (`*.map`) as they will be recreated by Rspamd.

<a name="Backup_fn2">2</a>: Some modules allow to set paths for their static data (e.g. ARC and DKIM keys locations) outside the `DBDIR`. Make sure you have included these custom directories in the backup.

<a name="Backup_fn3">3</a>: For multi-instance Redis please consult your Redis configuration.

<a name="Backup_fn4">4</a>: Copying RDB files is completely safe while the server is running. You don't have to stop `redis` or `rspamd`.

### Why am I getting errors after moving Rspamd to a different platform (CPU type)?

* Hyperscan cannot utilise cache files built for a different platform. Ensure to delete Hyperscan cache files (`*.hs`, `*.hsmp`). Failure to do so may result in errors such as:
~~~
cannot open hyperscan cache file /var/lib/rspamd/{...}.hs: compiled for a different platform
~~~

* Unfortunately, transferring RRD files directly between different architectures is not feasible. Attempting to do so will result in errors appearing in the log:
~~~
...; csession; rspamd_controller_handle_graph: no rrd configured
~~~
and WebUI alerts:
~~~
Cannot receive throughput data: error 404 No rrd configured for graphs
~~~
To convert RRD, you need to dump the `rspamd.rrd` file on the server that created it to XML using `rrdtool`:
~~~sh
# rrdtool dump rspamd.rrd > rspamd.rrd.xml
~~~
Then transfer it to the new server and restore it to a binary RRD:
~~~sh
# rrdtool restore -f rspamd.rrd.xml rspamd.rrd
~~~

## Plugin questions

### How to whitelist messages or skip spam checks for certain users

You have several options available. Firstly, if you require establishing a whitelist based on `SPF`, `DKIM`, or `DMARC` policies, consider consulting the [whitelist module]({{ site.url }}{{ site.baseurl }}/doc/modules/whitelist.html). Alternatively, the [multimap module]({{ site.url }}{{ site.baseurl }}/doc/modules/multimap.html) provides various checks to add symbols based on list matches or to set pre-actions, allowing you to either reject or permit specific messages.

An alternative is to deactivate spam filtering for certain senders or recipients through [user settings]({{ site.url }}{{ site.baseurl }}/doc/configuration/settings.html). By specifying `symbols_enabled = [];`, Rspamd will bypass all filtering rules that meet specific conditions set in the user settings. It's worth noting that the use of the more potent `want_spam = yes` can be potentially [confusing](https://github.com/rspamd/rspamd/issues/3552).

### How to blacklist messages based on extension

In this example, we want to blacklist the following extensions using the [multimap module]({{ site.url }}{{ site.baseurl }}/doc/modules/multimap.html):

```
exe
arj
scr
lnk
```

Then define the following multimap rule in `local.d/multimap.conf`:

```hcl
file_extension_blacklist {
  type = "filename";
  filter = "extension";
  map = "${LOCAL_CONFDIR}/local.d/file_extensions.map";
  symbol = "FILE_EXTENSION_BLACKLISTED";
  prefilter = true;
  action = "reject";
  message = "attachment type not allowed";
# skip_archives = true; # Uncomment if filenames in archives should be excluded from this check
}
```

### What are filters, pre-filters and post-filters

Rspamd executes various types of filters depending on the stage of execution:

- `pre-filters` run before any other processes and can establish a `pre-result` that ultimately determines the message classification. Filters and post-filters are bypassed in this scenario.
- `filters` encompass generic Rspamd rules.
- `post-filters` are assured to execute after all filters, allowing the implementation of actions dependent on the scan results.
- `idempotent post-filters` operate after all stages and **MUST NOT** alter the metric result in any manner; these filters can be utilised for historical purposes.

The overall execution order in Rspamd follows this sequence:

1. pre-filters
2. filters
3. classifiers
4. composite symbols
5. post-filters
6. autolearn rules
7. composites second pass (from 1.7)
8. idempotent rules (from 1.7)


### What is the meaning of the `URIBL_BLOCKED` symbol

This symbol indicates that you have surpassed the permissible limit of DNS queries for non-commercial use as specified by SURBL services. If you are currently using a public DNS server, such as Google Public DNS, consider switching to your local DNS resolver or establishing one, for instance, using [Unbound](https://www.unbound.net/). Alternatively, if you prefer to continue using the service, it is advisable to procure a [commercial subscription](http://www.surbl.org/df) to avoid any disruption. The `URIBL_BLOCKED` symbol carries a weight of 0 and is solely employed to notify you of this issue.

### How can I use commercial feeds for SURBL/RBL others

The most straightforward approach is to employ your own local resolver with forward zones directed towards a dedicated rbldnsd instance or instances that serve static zones from various vendors, such as Spamhaus or SURBL. Below is an example configuration snippet for the `Unbound` caching resolver:

```
forward-zone:
    name: "sbl.spamhaus.org."
    forward-addr: x.x.x.x # Your rbldnsd instance IP
    forward-addr: y.y.y.y # Secondary server if needed
    forward-first: yes
```

Additionally, you have the option to modify suffixes in the Rspamd configuration to incorporate custom ones, such as premium zones. To implement this, utilise either `local.d/rbl.conf` or `local.d/surbl.conf`.

### What are monitored checks

Rspamd conducts periodic checks on diverse DNS lists to preempt potential issues arising from anomalies in DNS responses, such as unexpected redirects instead of NXDOMAIN errors from your nameserver. Additionally, it monitors the lists themselves to prevent scenarios where certain lists mistakenly blacklist extensive portions of the Internet, as has occurred in the past with specific lists.

Consequently, Rspamd queries the following addresses:

* `1.0.0.127.rbl.tld` - this **MUST** return `NXDOMAIN` for all RBLs
* `facebook.com.uribl.tld` - it is highly unlikely that any sane URIBL would ever block Facebook, hence, this query is used to check URL black lists sanity

If the monitored checks prove unsuccessful, Rspamd will deactivate the affected resource and subsequently reattempt these checks after a designated period (approximately 1 minute). Upon successful checks, the resource will be re-enabled.

### Why do I have `monitored` errors in my log files

Some users complain about log lines like the following ones:

```
<xxx>; monitored; rspamd_monitored_dns_cb: DNS reply returned 'no error' for multi.uribl.com while 'no records with this name' was expected
```

This error typically indicates that you are restricted on `uribl.com`, suggesting that you might be relying on a public DNS resolver, such as Google DNS. If you are not using a public resolver but experience substantial mail traffic, it's possible that you have exceeded the `free band` for URIBL. In such a scenario, you may want to explore the [commercial subscription](http://www.surbl.org/df) option. Nevertheless, it is advisable to utilise dedicated resolvers rather than public ones, as detailed in the [DNS setup documentation]({{ site.baseurl }}/doc/configuration/options.html#dns-options).

The second potential cause of this error is a malfunction in RBL/URLBL, wherein it produces positive results for queries that should not be flagged, such as `facebook.com` or `127.0.0.1`. This indicates a significant issue with the DNS list.

The third reason may lie with your DNS server. Occasionally, DNS servers may furnish false responses for queries that are not found, redirecting users to a search or informational page. In such instances, Rspamd cannot function optimally and will deactivate DNSBL lookups. It is recommended to consider employing your own forwarding DNS server in such cases.

### What is the meaning of the message like `inv_chi_square: exp overflow`

This message usually means that some statistics class is overflowed with tokens and another one is underflowed. You should consider to learn more messages from both Spam and Ham classes for Bayes classifier.

### How can I learn messages

Utilise the `rspamc learn_spam` and `rspamc learn_ham` commands to train the Spam and Ham classes, respectively. It's crucial to maintain a nearly equal number of learned messages for both classes to enhance the statistical engine's performance. Learning necessitates the `enable` level for the controller, and you must specify either an `enable_password` or employ the `secure_ip` setting to permit learning and other modifications from specific IP addresses.

### How to learn Rspamd automatically

Please check the [following document]({{ site.url }}{{ site.baseurl }}/doc/configuration/statistic.html#autolearning) for more details.

### What is faster between custom Lua rules and regular expressions

Migrating from C to Lua can incur expenses. Consequently, it is advisable to utilise regular expressions for straightforward checks whenever feasible. If Rspamd is compiled with [Hyperscan](https://www.hyperscan.io/), the addition of another regular expression is typically cost-effective. However, it's essential to avoid constructs not supported by Hyperscan, such as backtracking, lookbehind, and some [others](http://intel.github.io/hyperscan/dev-reference/compilation.html#unsupported-constructs). Conversely, Lua offers distinct functions that regular expressions do not cover. In such instances, it is recommended to opt for Lua.

## WebUI questions

### What are `enable_password` and `password` for the WebUI

Rspamd can limit the functions available through the WebUI in three ways:

1. Allow read-only commands when `password` is specified
2. Allow all commands when `enable_password` is specified
3. Allow all commands when client IP address matches the `secure_ip` list in the controller configuration

When `password` is specified but `enable_password` is missing then `password` is used for **both** read and write commands.

### How to store passwords securely

Rspamd has the capability to encrypt passwords and store them using [PBKDF2](https://en.wikipedia.org/wiki/PBKDF2) or [Catena](https://www.uni-weimar.de/de/medien/professuren/mediensicherheit/research/catena/). Since version `1.4`, Catena is employed by default as it offers enhanced resistance to brute-force attacks by necessitating additional memory for computation (memory-hard function). To leverage this feature, employ the `rspamadm pw` command as illustrated below:

```
rspamadm pw
Enter passphrase:
$1$jhicbyeuiktgikkks7in6mecr5bycmok$boniuegw5zfc77pfbqf14bjdxmzd3yajnngwdekzwhjk1daqjixb
```

Subsequently, you can utilise the resulting string (formatted as `$<algorithm_id>$<salt>$<encrypted_data>`) as either the `password` or `enable_password`. It is important to note that this command generates **distinct** encrypted strings even for identical passwords, which is the intended behaviour.

### How to use the WebUI behind a proxy server

Here is an example for nginx:

```nginx
location /rspamd/ {
  proxy_pass       http://localhost:11334/;

  proxy_set_header Host      $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For "";
}
```

Corresponding Apache configuration:

```xml
<Location /rspamd>
 <IfVersion >= 2.3>
      Require all granted
  </IfVersion>
  <IfVersion < 2.3>
      Order allow,deny
      Allow from all
  </IfVersion>
</Location>
RewriteRule ^/rspamd$ /rspamd/ [R,L]
RewriteRule ^/rspamd/(.*) http://localhost:11334/$1 [P,L]
```

When a connection originates from an IP listed in `secure_ip` or from a Unix socket, Rspamd examines two headers: `X-Forwarded-For` and, if not found, `X-Real-IP`. If either of these headers is present, Rspamd treats the connection as if it originates from the IP specified in that header. For instance, if `X-Real-IP: 8.8.8.8` is present, it will prompt checks against `secure_ip` for `8.8.8.8`.

### Where does the WebUI store settings

The WebUI sends `AJAX` requests for Rspamd and Rspamd can store data in a `dynamic_conf` file. By default, it is defined in `options.inc` as following:

```
dynamic_conf = "$DBDIR/rspamd_dynamic";
```

Rspamd loads symbols and actions settings from this file with priority 5 which allows you to redefine those settings in an override configuration.

### Why can't I edit some maps with the WebUI

The map file may lack adequate permissions or not exist. It's noteworthy that the WebUI disregards all `HTTP` maps. Additionally, the editing of signed maps is not yet supported.

### How to setup cluster in WebUI

You need to add neighbours list to the global options configuration.

Please see the [Rspamd options settings]({{ site.baseurl }}/doc/configuration/options.html#neighbours-list) for details.

### Why does the User column show 'undefined'?

The User column shows the authenticated username of the message sender- you would have to be scanning authenticated outbound mail to see something here.

### How to exclude rows from the History tab?

To exclude some rows from the `History` tab you could add a **minus sign**  (**-**) before a query value (`IP-address`, `Envelope From`, etc) in the `Search` field, like this one: `-sender@test.ru`

## Lua questions

### What is the difference between plugins and rules

Rules are designed to conduct straightforward checks and provide either `true` when the rule matches or `false` when it doesn't. Typically, rules cannot execute asynchronous requests or insert multiple symbols. While theoretically possible, it's advisable to register plugins using `rspamd_config:register_symbol` functions for such tasks. Plugins are anticipated to independently insert results using the `task:insert_result` method.

### What is table form of a function call

The difference between table and sequential forms is simple:

```lua
func(a, b, c, d) -- sequential form
func({
  param1 = a,
  param2 = b,
  param3 = c,
  param4 = d
}) -- table form
```

Historically, all Lua methods used the sequential call type. Nevertheless, this approach has evolved and now offers several advantages:

- Eliminates the need to remember the exact **order** of arguments.
- Provides a `name = value` pair, aiding in debugging.
- Facilitates the extension of methods with new features while maintaining backward compatibility.
- Simplifies the inclusion of **optional** arguments.

However, it is important to note a drawback: table calls incur slightly higher computational costs. Despite this, the difference is negligible in the majority of cases. Consequently, Rspamd now supports the table form for most functions that accept more than two or three arguments. The allowed forms for a specific function can be referenced in the [documentation]({{ site.url }}{{ site.baseurl }}/doc/lua/).

### How to use rspamd modules

Use a `require` statement:

```lua
local rspamd_logger = require 'rspamd_logger'
local rspamd_regexp = require 'rspamd_regexp'
```

Rspamd also ships some additional lua modules which you can use in your rules:

- [Lua functional](https://github.com/rtsisyk/luafun)
- [Lua LPEG](https://www.inf.puc-rio.br/~roberto/lpeg/)

### How to write to Rspamd log
The [Rspamd logger]({{ site.url }}{{ site.baseurl }}/doc/lua/rspamd_logger.html) offers numerous convenient methods for logging data from Lua rules and plugins. It is advisable to explore the modern methods (with the `x` suffix) that enable the use of `%s` and `%1` .. `%N` notation. The `%s` format is employed to print the **next** argument, while `%<number>` processes a specific argument (starting from `1`):

```lua
local rspamd_logger = require 'rspamd_logger'

rspamd_logger.infox("%s %1 %2 %s", "abc", 1, {true, 1})
-- This will show abc abc 1 [[1] = true, [2] = 1]
```

Additionally, you can utilise other objects, such as Rspamd task or Rspamd config, to enhance logger output with a task or config logging tag.

Furthermore, the `rspamd_logger.slog` function serves as an alternative to the Lua standard function `string.format` when printing complex objects, such as tables.

### Should I use `local` for my variables

Certainly, always opt for `local` variables unless it is absolutely necessary. Excessive use of global variables can result in considerable performance degradation for Lua scripts.

### How can I create regexps in Lua

Regexp objects are special in case of Rspamd. Unlike other objects, they do not have garbage collection method and should be explicitly destroyed. For example, if you have this code:

~~~lua
rspamd_config.RULE = function(task)
  local re = rspamd_regexp.create('/re/') -- Memory leak here!
  ...
end
~~~

In this scenario, the `re` object will persist without destruction, leading to a memory leak. To address this issue, it is crucial to consistently utilise the global regexps cache, which remains available throughout the entire Rspamd process lifetime:

~~~lua
rspamd_config.RULE = function(task)
  local re = rspamd_regexp.create_cached('/re/') -- Regexp will be reused from the cache if possible
  ...
end
~~~

The only situation when you might have a problem with this approach is when you need to create regular expressions dependent on some external data:

~~~lua
local function blah(task)
  -- Return something that depends on task properties
end

rspamd_config.RULE = function(task)
  local re = rspamd_regexp.create_cached(blah(task)) -- Too many regexps could be created
  ...
end
~~~

If you cannot avoid this bad pattern (and it is bad since regexp creation is an expensive procedure), then you can explicitly destroy regexp object:

~~~lua
local function blah(task)
  -- Return something that depends on task properties
end

rspamd_config.RULE = function(task)
  local re = rspamd_regexp.create(blah(task)) -- This is expensive procedure!
  ...
  re:destroy() -- frees memory
end
~~~

However, you should consider using regexp maps with [multimap module]({{ site.baseurl }}/doc/modules/multimap.html) when you need something like this.

## Integration questions

### How to distinguish inbound and outbound traffic for Rspamd instance

Starting from version 1.7.0, the proxy worker has the capability to transmit a designated header called `settings-id` during checks, applicable to both proxy and self-scan modes. This header empowers Rspamd to apply specific settings tailored to a message. Custom scores can be assigned, certain rules or rule groups can be deactivated, and more. For instance, to disable specific rules for outbound scanning, an entry in the [settings]({{ site.url }}{{ site.baseurl }}/doc/configuration/settings.html) module can be created:

```hcl
settings {
  outbound {
    priority = high;
    id = "outbound"; # Can be omitted as the rule itself is already called `outbound`
    apply {
      actions {
        reject = 150.0;
        "add header" = 6.0;
      }
      BAYES_SPAM = 7.0;
      groups_disabled = [
        "hfilter",
        "spf",
        "rbl"
      ]
    }
  }
}
```

Then, we can apply this setting ID on the outbound MTA using the proxy configuration:

```hcl
upstream "local" {
  default = yes;
  self_scan = yes; # Enable self-scan
  settings_id = "outbound";
}
```

An alternative approach is to apply settings based on the sender being authenticated or having an IP address within a specific range. Refer to the [documentation]({{ site.url }}{{ site.baseurl }}/doc/configuration/settings.html) for more details.

### How can I restore the old Rmilter SPF behaviour

Formerly, Rmilter had the capability to reject mail that failed SPF verification for specific domains. This functionality can now be achieved using Rspamd.

One can establish rules in Rspamd to enforce rejection based on selected symbols, among other conditions. The DMARC module, for instance, includes built-in support for such behavior, with [multimap]({{ site.url }}{{ site.baseurl }}/doc/modules/multimap.html) being a particularly versatile option.

For instance, add the following to `/etc/rspamd/rspamd.local.lua`:

~~~lua
local myfunc = function(task)
  if task:has_symbol('R_SPF_REJECT') then
    task:set_pre_result('reject', 'I rejected it')
  end
end
local id = rspamd_config:register_symbol('MY_REJECT', 1.0, myfunc)
rspamd_config:register_dependency(id, 'R_SPF_REJECT')
~~~

Rspamd also provides the capability to test SPF without message data, a feature not currently supported by Rmilter.
