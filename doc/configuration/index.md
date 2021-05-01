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

UCL also supports a `.include` macro which is used extensively in Rspamd configuration. This allows inclusion of another file (or files), to define an override/merge strategy, to define new element priorities, and to do other useful things. Almost all Rspamd sections are followed by two or three include directives. The following is a summary of how the include macro is used in Rspamd. More details are available in the [Macros Support](ucl.html#macros-support) section of the UCL document.

```
.include(param=value,param=value) "filename"
```

Param/value arguments are options (sometimes called policies) which are applied to the file being included.

The "priority" policy determines how values are overwritten during include. Higher priority elements overwrite lower priority ones. 

The "duplicate" policy defines what happens if there are two objects with the same name in both files. The value "merge" on the "duplicate" policy causes a merge of keys from the included file into the current file. (See the Macros Support notes for other values.)

This is how included files are processed:

* Dynamic configuration include (priority=5)  
This is used to redefine elements from WebUI. This include can be omitted in some cases.
* Override file (priority=10)  
This is used to define static overrides, which have the highest priority.
* Local file (priority=1, duplicate=merge)  
This is used to add new configuration directives.

Here is an example of how `.include` is used to achieve a desired configuration.

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

Typical _section_ in Rspamd (where _section_ is replaced with an actual section name):

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

If you want to add or redefine some of those default values, you can use a `local.d/section` file:

```ucl
# local.d/section.conf
new_key = "new_value";
subsection {
    foo = "nobar";
}
```

Note: When an include directive is inside of a `section {}` block, the included local.d/override.d files must not also have the same `section {}` wrapper. This would result in nested blocks: `section { section{} }`. Files referenced by include directives outside of a section must specify the sections being defined, achieving the following pattern: `section{} section{}` where the second section overrides or merges with the first.

## Rspamd variables

Rspamd defines some useful variables to use in configuration files, as `${VAR}`, or simply as `$VAR`). These variables are replaced with substitution values at run-time. Nested variables like `${ VAR1_${VAR2} }` are **NOT** supported.

- *CONFDIR*: configuration directory for Rspamd, found in `$PREFIX/etc/rspamd/`
- *LOCAL_CONFDIR*: site-local configuration directory for Rspamd (usually the same value as $CONFDIR, and not to be confused with local.d)
- *RUNDIR*: runtime directory to store pidfiles or UNIX sockets
- *DBDIR*: persistent databases directory (used for statistics or symbols cache)
- *LOGDIR*: a directory to store log files
- *PLUGINSDIR*: plugins directory for Lua plugins
- *RULESDIR*: directory in which rules are kept
- *PREFIX*: basic installation prefix (may be null, for example for /etc/rspamd compared to /prefix/etc/rspamd)
- *VERSION*: Rspamd version string (e.g. "2.7")
- *WWWDIR*: root directory for web interface

## Rspamd specific macros

- *.include_map*: defines a map that is dynamically reloaded and updated if its content has changed. This macro is intended to define dynamic configuration files.

## Rspamd basic configuration

### Overview
Configuration files that are installed or updated with Rspamd are not intended to be changed by the user. Rather, files should be overridden in site-specific configuration files. See the [quickstart](../quickstart.html#configuring-rspamd) page for details.

Nevertheless, packaging will generally never overwrite configuration files on upgrade if they have been touched by the user. Please read the [migration notes](../migration.html) carefully if you upgrade Rspamd to a new version for all incompatible configuration changes.

Rspamd configuration starts in file `$CONFDIR/rspamd.conf`. That file has a few settings, and includes other files, which themselves include yet more files. The final configuration is the sum of all files processed in the order found.

For each Rspamd "core" file, there is an include to the `local.d` folder for local overrides, and another include to the `overide.d` folder for final overrides. For clarity on this architecture, see [this FAQ](../faq.html#what-are-local-and-override-config-files) and others related to the topic.

### Detail
The `rspamd.conf` file starts by including `common.conf`:

~~~ucl
.include "$CONFDIR/common.conf"
~~~

In `common.conf`, a Lua script containing rules is defined, `$RULESDIR/rspamd.lua`. This is the main Lua config file for Rspamd, which loads and executes many other Lua programs as [modules](../modules/index.html).

Tip: $RULESDIR may be something like /usr/share/rspamd/rules.

 Other files are then included to define rules, and set rule weights and Rspamd actions.

~~~ucl
lua = "$RULESDIR/rspamd.lua"
.include "$CONFDIR/metrics.conf"
.include "$CONFDIR/actions.conf"
.include "$CONFDIR/groups.conf"
.include "$CONFDIR/composites.conf"
.include "$CONFDIR/statistic.conf"
.include "$CONFDIR/modules.conf"
.include "$CONFDIR/settings.conf"
~~~

Each of those .conf files defines a specific section, as well as `.include` files to override each section with local settings.

- The [metrics.conf](metrics.html) file was previously included in this documentation. It was deprecated in v1.7 and was replaced with `actions.conf` and `groups.conf`.
- actions.conf (no separate doc yet) defines score limits for specific [action](../faq.html#what-are-rspamd-actions) types.
- groups.conf (no separate doc yet) defines a single "group" section, with multiple symbol groups. Each group has `.include` directives to files containing details for symbols related to those groups. ([See also](../faq.html#how-to-change-score-for-some-symbol))
- [composites.conf](composites.html) describes composite symbols.
- Statistical filters are defined in [statistic.conf](statistic.html).
- Rspamd stores module configurations (for both Lua and internal modules) in .conf files in the [modules.d](../modules/index.html) folder. For example, settings for the [RBL module](../modules/rbl.html) are defined in "/modules.d/rbl.conf". The `modules.conf` file exists merely to `.include` all of those files.
- User settings are described extensively in the [settings.conf](settings.html) documentation. Each setting can define a set of custom metric weights, symbols or action scores, and enable or disable certain checks.

After those includes, `common.conf` ends with a check for final override settings, and a small `modules` section:

~~~ucl
.include(try=true) "$LOCAL_CONFDIR/rspamd.conf.local"
.include(try=true,priority=10) "$LOCAL_CONFDIR/rspamd.conf.local.override"
.include(try=true,priority=10) "$LOCAL_CONFDIR/rspamd.conf.override"

modules {
  path = "${PLUGINSDIR}";
  fallback_path = "${SHAREDIR}/lua"; # Legacy path
  try_path = "${LOCAL_CONFDIR}/plugins.d/"; # User plugins
}
~~~

The modules section defines paths of directories or specific files. If a directory is specified, all files in that folder with a `.lua` suffix are loaded as Lua plugins. (The directory path is treated as a `*.lua` shell pattern).

Coming back to `rspamd.conf`, a global [options](options.html) section is defined, followed by [logging](logging.html) configuration.

~~~ucl
options {
    pidfile = "$RUNDIR/rspamd.pid";
    .include "$CONFDIR/options.inc"
    .include(try=true; priority=1,duplicate=merge) "$LOCAL_CONFDIR/local.d/options.inc"
    .include(try=true; priority=10) "$LOCAL_CONFDIR/override.d/options.inc"
}

.include(try=true; duplicate=merge) "$CONFDIR/cgp.inc"
.include(try=true; priority=1,duplicate=merge) "$LOCAL_CONFDIR/local.d/cgp.inc"

logging {
    type = "file";
    filename = "$LOGDIR/rspamd.log";
    .include "$CONFDIR/logging.inc"
    .include(try=true; priority=1,duplicate=merge) "$LOCAL_CONFDIR/local.d/logging.inc"
    .include(try=true; priority=10) "$LOCAL_CONFDIR/override.d/logging.inc"
}
~~~

Finally, a [workers](../workers/index.html) section (code not provided here) is defined using the `section "foo" {}` syntax noted above, for worker types: normal, controller, rspamd_proxy, and fuzzy.





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

