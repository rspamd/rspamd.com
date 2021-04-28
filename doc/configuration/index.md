---
layout: doc
title: General information
---
# Rspamd configuration
{:.no_toc}

Rspamd uses the Universal Configuration Language (UCL) for its configuration. The UCL format is described in detail in this [document](ucl.html). Rspamd defines several variables and macros to extend
UCL functionality.

<div id="toc" markdown="1">
  <h2 class="toc-header">Contents</h2>
  * TOC
  {:toc}
</div>

## UCL sections and includes

UCL implements the JSON data model. However, there are a lot of mentions of `sections` in Rspamd documentation. You can treat sections as simple sub-objects of the top object. For example, here are two equivalent definitions in `UCL` and in `JSON` syntax:

```ucl
section "foo" {
    opt = 10;
}
```

vs

```json
{
    "section": {
        "foo": {
            "opt": 10
        }
    }
}
```

UCL also supports a `.include` directive which is used extensively in Rspamd configuration. This directive allows inclusion of another file (or files), to define override/merge strategy, to define new element priorities, and to do other useful things. Normally, all Rspamd sections contain 2 or 3 includes.

The format of an include directive is as follows:

```
.include(key=value,key=value) "filename"
```

Key/value arguments are called policies, which are applied to the file being included.

The "priority" policy determines how values are overwritten during include. Higher priority elements overwrite lower priority ones. 

The "duplicate" policy defines what happens if there are two objects with the same name in both files. The value "merge" on the "duplicate" policy causes a merge of keys from the included file into the current file.

This is how included files are processed:

* Dynamic configuration include (priority=5)  
This is used to redefine elements from WebUI. This include can be omitted in some cases.
* Override file (priority=10)  
This is used to define static overrides, which have the highest priority.
* Local file (priority=1, duplicate=merge)  
This is used to add new configuration directives.

Here is an example of how .include is used to achieve a desired configuration.

```ucl
# fileA.conf
obj {
    key = 1;
    subobj {
        subkey = 2;
    }
}
.include(duplicate=merge,priority=1) "fileB.conf"

# fileB.conf
obj {
    key = 2;
    nkey = 1;
    subobj {
        subkey = 3;
        nsub = 1;
    }
}
```

will form the following configuration:

```ucl
obj {
    key = 2; # fileB overrides fileA
    nkey = 1; # added from fileB
    subobj {
        subkey = 3; # fileB overrides fileA
        nsub = 1; # added from fileB
    }
}
```

Typical section in Rspamd:

```ucl
section {
  default_key = "value";
  subsection {
      foo = "bar";
  }

  .include(try=true,priority=5) "${DBDIR}/dynamic/section.conf"
  .include(try=true,priority=1,duplicate=merge) "$LOCAL_CONFDIR/local.d/section.conf"
  .include(try=true,priority=10) "$LOCAL_CONFDIR/override.d/section.conf"
}
```

If you want to add or redefine some of those default values, you can use `local.d/section.conf` file:

```ucl
# local.d/section.conf
new_key = "new_value";
subsection {
    foo = "nobar";
}
```

Please mention that you **don't need** to add `section {}` in local.d/override.d files. It will break your configuration since include directives are already placed directly inside of the `section {}` block.

## Rspamd variables

Rspamd defines some of the useful variables to use in the configuration files (as "${VAR}"). These variables are simply replaced with substitution value. Nested variables (e.g. "${VAR1_${VAR2}}") are **NOT** supported.

- *CONFDIR*: configuration directory for Rspamd, found in `$PREFIX/etc/rspamd/`
- *LOCAL_CONFDIR*: site-local configuration directory for Rspamd, usually $CONFDIR
- *RUNDIR*: runtime directory to store pidfiles or UNIX sockets
- *DBDIR*: persistent databases directory (used for statistics or symbols cache).
- *LOGDIR*: a directory to store log files
- *PLUGINSDIR*: plugins directory for Lua plugins
- *RULESDIR*: directory in which rules are kept
- *PREFIX*: basic installation prefix
- *VERSION*: Rspamd version string (e.g. "0.6.6")
- *WWWDIR*: root directory for web interface

## Rspamd specific macros

- *.include_map*: defines a map that is dynamically reloaded and updated if its content has changed. This macro is intended to define dynamic configuration files.

## Rspamd basic configuration

The basic Rspamd configuration is stored in `$CONFDIR/rspamd.conf`. By default, this file looks like this one:

~~~ucl
.include "$CONFDIR/common.conf"

options {
    .include "$CONFDIR/options.inc"
    .include(try=true; priority=1,duplicate=merge) "$LOCAL_CONFDIR/local.d/options.inc"
    .include(try=true; priority=10) "$LOCAL_CONFDIR/override.d/options.inc"
}

logging {
    type = "console";
    systemd = true;
    .include "$CONFDIR/logging.inc"
    .include(try=true; priority=1,duplicate=merge) "$LOCAL_CONFDIR/local.d/logging.inc"
    .include(try=true; priority=10) "$LOCAL_CONFDIR/override.d/logging.inc"
}

worker {
    bind_socket = "*:11333";
    .include "$CONFDIR/worker-normal.inc"
    .include(try=true; priority=1,duplicate=merge) "$LOCAL_CONFDIR/local.d/worker-normal.inc"
    .include(try=true; priority=10) "$LOCAL_CONFDIR/override.d/worker-normal.inc"
}

worker {
    bind_socket = "localhost:11334";
    .include "$CONFDIR/worker-controller.inc"
    .include(try=true; priority=1,duplicate=merge) "$LOCAL_CONFDIR/local.d/worker-controller.inc"
    .include(try=true; priority=10) "$LOCAL_CONFDIR/override.d/worker-controller.inc"
}
~~~

In `common.conf`, we read a Lua script placed in `$RULESDIR/rspamd.lua` and load Lua rules from it. Then we include a global [options](options.html) section followed by [logging](logging.html) logging configuration. The [metrics.conf](metrics.html) file defines metric settings, including rule weights and Rspamd actions. The [workers](../workers/index.html) section specifies Rspamd workers settings. [Composites.conf](composites.html) describes composite symbols. Statistical filters are defined in [statistics.conf](statistic.html). Rspamd stores module configurations (for both Lua and internal modules) in  [modules.d](../modules/index.html) section while modules themselves are loaded from the following portion of `common.conf`:

~~~ucl
modules {
	path = "$PLUGINSDIR/lua/"
}
~~~

The modules section defines the path or paths of directories or specific files. If a directory is specified then all files with a `.lua` suffix are loaded as lua plugins (the directory path is treated as a `*.lua` shell pattern).

This configuration is not intended to be changed by the user, rather it should be overridden in site-specific configuration files- see the [quickstart]({{ site.baseurl }}/doc/quickstart.html#configuring-rspamd) for details. Nevertheless, packaging will generally never overwrite configuration files on upgrade if they have been touched by the user. Please read the [migration notes]({{ site.baseurl }}/doc/migration.html) carefully if you upgrade Rspamd to a new version for all incompatible configuration changes.

## Jinja templating

{% raw %}

From version 1.9.1, Rspamd supports [Jinja2 templates](http://jinja.pocoo.org) provided by [Lupa Lua library](https://foicica.com/lupa/). You can read the basic syntax documnentation and the abilities provided by these templating engines using the links above. Rspamd itself uses a specific syntax for variable tags: `{=` and `=}` instead of the traditional `{{` and `}}` as these tags could mean, e.g. a table in table in Lua.

{% endraw %}

Templating might be useful to hide some secrets from config files and places them in environment. Rspamd automatically reads environment variables that start from `RSPAMD_` prefix and pushes it to the `env` variable, e.g. `RSPAMD_foo=bar` comes to `env.foo="bar"` in templates.

`env` variable also contains the following information:

* `ver_major` - major version (e.g. `1`)
* `ver_minor` - minor version (e.g. `9`)
* `ver_patch` - patch version (e.g. `1`)
* `version` - full version as a string (e.g. `1.9.1`)
* `ver_num` - numeric version as a hex string (e.g. `0x1090100000000`)
* `ver_id` - git id or `release` if not a git build
* `hostname` - local hostname

You can also add values, not merely plain strings but any Lua objects, e.g. tables, specifying additional environment files with `--lua-env` command line argument. This file will be read by `root` user if Rspamd main process starts as root and then drops privilleges. These file or files when specified multiple times should return a table as a single possible outcome, for example:

```lua
return {
  var1 = "value",
  var2 = {
    subvar1 = "foo",
    subvar2 = true,
  }
}
```

You can use them as following in the config files:

{% raw %}
~~~ucl
{% if env.var2.subvar2 %}
foo = {= env.var1 =};
baz = {= env.var2.subvar2 =};
{% endif %}
~~~
{% endraw %}

You can also use that for secure storing of the passwords:

{% raw %}
~~~ucl
# local.d/controller.inc
{% if env.password %}
password = "{= env.password|pbkdf =}"; # Password also will be encrypted using `catena` PBKDF
{% endif %}
~~~
{% endraw %}

{% raw %}

As a consequence, from the version 1.9.1, your config files should be Jinja safe, meaning that there should be no special sequences like `{%` or `{=` anywhere in your configuration. Alternatively, you can escape them using `raw` and `endraw` tags.

{% endraw %}

