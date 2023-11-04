---
layout: doc
title: General information
---
# Rspamd configuration
{:.no_toc}

Rspamd employs the Universal Configuration Language (UCL) for its configuration. You can find an extensive description of the UCL format in this [document](ucl.html). Additionally, Rspamd introduces a range of variables and macros to enhance UCL's functionality.

<div id="toc" markdown="1">
  <h2 class="toc-header">Contents</h2>
  * TOC
  {:toc}
</div>

## UCL sections and includes

UCL adopts the JSON data model, although Rspamd's documentation frequently refers to `sections`. Consider these sections as straightforward sub-objects of the main object. For instance, the following two definitions are equivalent in both `UCL` and `JSON` syntax:

```hcl
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

UCL also offers support for the `.include` macro, a feature heavily utilized in Rspamd's configuration. This macro allows the inclusion of other files, enabling the definition of override or merge strategies, establishment of new element priorities, and other beneficial operations. Throughout Rspamd's configuration, nearly all sections are followed by two or three include directives. The following overview outlines how the include macro is employed in Rspamd, while further elaboration can be found in the [Macros Support](ucl.html#macros-support) section of the UCL documentation.

```
.include(param=value,param=value) "filename"
```

Param/value arguments represent options, often referred to as policies, that are applicable to the included file.

The "priority" policy dictates the hierarchy for overwriting values during the inclusion process. Elements with higher priority take precedence over those with lower priority.

The "duplicate" policy specifies the behavior when encountering two objects with the same name in both files. Employing the "merge" value for the "duplicate" policy results in key merging from the included file into the current file. (For additional values, consult the Macros Support notes.)

This is how included files are processed:

* Dynamic configuration include (priority=5)  
This is used to redefine elements from WebUI. This include can be omitted in some cases.
* Override file (priority=10)  
This is used to define static overrides, which have the highest priority.
* Local file (priority=1, duplicate=merge)  
This is used to add new configuration directives.

Here is an example of how `.include` is used to achieve a desired configuration.

```hcl
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

```hcl
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

```hcl
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

```hcl
# local.d/section.conf
new_key = "new_value";
subsection {
    foo = "nobar";
}
```

Note: If an include directive is situated within a `section {}` block, it's essential that the included local.d/override.d files do not possess an identical `section {}` wrapper. This would inadvertently lead to nested blocks like `section { section{} }`. Conversely, files referred to by include directives outside of a section must explicitly delineate the sections they define, following a pattern like `section{} section{}` where the second section either overrides or merges with the first.

## Rspamd variables

Rspamd introduces a range of valuable variables designed for use in configuration files, denoted as `${VAR}` or simply as `$VAR`. These variables are dynamically replaced with corresponding values during runtime. However, it's important to note that nested variables such as `${ VAR1_${VAR2} }` are **NOT** supported.

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
Configuration files that are installed or updated with Rspamd are not meant to be modified directly by the user. Instead, these files should be overridden in site-specific configuration files. You can find more information on this process in the [quickstart](../quickstart.html#configuring-rspamd) page.

However, it's important to note that packaging typically avoids overwriting configuration files during upgrades if they have been modified by the user. For a smooth transition when upgrading to a new version of Rspamd, be sure to carefully review the [migration notes](../migration.html) for any incompatible configuration changes.

The Rspamd configuration process begins with the file `$CONFDIR/rspamd.conf`. This file contains several settings and includes references to other files, which in turn might include additional files. The complete configuration is a compilation of all processed files, following the order in which they are encountered.

Each core Rspamd file incorporates an include to the `local.d` folder for local overrides, as well as another include to the `override.d` folder for final overrides. To better understand this architectural approach, you can refer to the [related FAQ](../faq.html#what-are-local-and-override-config-files) and other resources on the topic.

### Detail
The `rspamd.conf` file commences by incorporating `common.conf`:

~~~hcl
.include "$CONFDIR/common.conf"
~~~

Within `common.conf`, a Lua script that includes rules is specified as `$RULESDIR/rspamd.lua`. This Lua configuration file is pivotal in Rspamd, as it loads and runs numerous other Lua programs as [modules](../modules/index.html).

Note: The variable `$RULESDIR` typically corresponds to a path like `/usr/share/rspamd/rules`.

Subsequently, additional files are included to establish rules, set rule priorities, and define Rspamd actions.

~~~hcl
lua = "$RULESDIR/rspamd.lua"
.include "$CONFDIR/metrics.conf"
.include "$CONFDIR/actions.conf"
.include "$CONFDIR/groups.conf"
.include "$CONFDIR/composites.conf"
.include "$CONFDIR/statistic.conf"
.include "$CONFDIR/modules.conf"
.include "$CONFDIR/settings.conf"
~~~

Each of these `.conf` files defines a specific section, along with corresponding `.include` files that permit local settings to override each section.

- The [metrics.conf](metrics.html) file, formerly featured in this documentation, was deprecated in version 1.7. It was succeeded by `actions.conf` and `groups.conf`.
- `actions.conf` (without a separate document yet) delineates score thresholds for specific [action](../faq.html#what-are-rspamd-actions) types.
- `groups.conf` (also without a separate document yet) introduces a singular "group" section housing multiple symbol groups. Each group incorporates `.include` directives pointing to files that detail symbols linked to those groups. ([For more, see](../faq.html#how-to-change-score-for-some-symbol))
- [composites.conf](composites.html) outlines composite symbols.
- Statistical filters are defined within [statistic.conf](statistic.html).
- Rspamd manages module configurations (both for Lua and internal modules) through `.conf` files located in the [modules.d](../modules/index.html) folder. For instance, configurations for the [RBL module](../modules/rbl.html) are specified in "/modules.d/rbl.conf". The `modules.conf` file primarily serves to `.include` all of these module configuration files.
- User settings receive thorough coverage in the [settings.conf](settings.html) documentation. Each setting can define a unique set of custom metric weights, symbols or action scores, as well as enable or disable specific checks.
  
~~~hcl
.include(try=true) "$LOCAL_CONFDIR/rspamd.conf.local"
.include(try=true,priority=10) "$LOCAL_CONFDIR/rspamd.conf.local.override"
.include(try=true,priority=10) "$LOCAL_CONFDIR/rspamd.conf.override"

modules {
  path = "${PLUGINSDIR}";
  fallback_path = "${SHAREDIR}/lua"; # Legacy path
  try_path = "${LOCAL_CONFDIR}/plugins.d/"; # User plugins
}
~~~

The modules section establishes paths for directories or specific files. When a directory is specified, all files in that folder with a `.lua` suffix are loaded as Lua plugins. (The directory path is treated as a `*.lua` shell pattern).

Returning to `rspamd.conf`, it encompasses a global [options](options.html) section, followed by the configuration for [logging](logging.html).

~~~hcl
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

Ultimately, a [workers](../workers/index.html) section (code not provided here) is outlined, utilizing the aforementioned `section "foo" {}` syntax, to define worker types such as normal, controller, rspamd_proxy, and fuzzy.





## Jinja templating

{% raw %}

[Jinja](https://jinja.palletsprojects.com) stands as a contemporary and design-friendly templating language for Python, modelled after Django’s templates. 
[Lupa](https://github.com/orbitalquark/lupa) is a Jinja2 template engine implementation written in Lua and supports Lua syntax within tags and variables.

Beginning with version 1.9.1, Rspamd introduces support for Jinja templates combined with Lua code within Rspamd UCL configuration files. This functionality extends beyond static assignments and `.include` directives, allowing the implementation of logic and data transformations. Notably, Rspamd employs a specific syntax for variable tags, namely `{=` and `=}`, to prevent conflicts with Lua's use of `{{` and `}}`, which might otherwise signify "a table within a table" in Lua.

{% endraw %}

Templating offers the advantage of concealing sensitive values from configuration files, achieved by placing them into environment variables. Rspamd automates the reading of environment variables that begin with the `RSPAMD_` prefix, subsequently pushing them onto the `env` variable. For instance, `RSPAMD_foo=bar` would translate to `env.foo="bar"` in the templates.

The `env` variable also contains the following information:

* `ver_major` - major version (e.g. `1`)
* `ver_minor` - minor version (e.g. `9`)
* `ver_patch` - patch version (e.g. `1`)
* `version` - full version as a string (e.g. `1.9.1`)
* `ver_num` - numeric version as a hex string (e.g. `0x1090100000000`)
* `ver_id` - git ID or `release` if not a git build
* `hostname` - local hostname

You can also add values, not merely plain strings but any Lua objects, like tables, by specifying additional environment files with the `--lua-env` command line argument. The specified Lua program file will be read by the `root` user if the Rspamd main process starts as root and then drops privileges.
<!-- TG - Not understanding the following statement (revised from original for language clarity) -->
The Lua program file (or files) when specified multiple times should return a table as a single possible outcome. For example:

```lua
return {
  var1 = "value",
  var2 = {
    subvar1 = "foo",
    subvar2 = true,
  }
}
```

You can then use the variables as follows in config files:

{% raw %}
~~~hcl
{% if env.var2.subvar2 %}
foo = {= env.var1 =};
baz = {= env.var2.subvar2 =};
{% endif %}
~~~
{% endraw %}

You can also use this for secure storage of passwords. This code sample would be used in a config file, and demonstrates many details for using Jinja.

{% raw %}
~~~hcl
# local.d/controller.inc
{% if env.password %}
password = "{= env.password|pbkdf =}"; # Password is encrypted using `catena` PBKDF
{% endif %}
~~~
{% endraw %}

Please note that the pipe symbol `|` serves the purpose of conveying the password to a Jinja [filter](https://jinja.palletsprojects.com/en/2.11.x/templates/#filters), which facilitates further processing. Within Rspamd, the `pbkdf` filter is available and is utilized to encrypt the password using the [PBKDF](https://en.wikipedia.org/wiki/PBKDF2) standard, specifically employing the [Catena](https://github.com/bsdphk/PHC/tree/master/Catena) hashing scheme.

With this enhancement, as of version 1.9.1, your config files should be Jinja safe. However, this also implies that there should be no special sequences like {% raw %}`{%` or `{=`{% endraw %} anywhere in your configuration, other than for Jinja. If you do require these sequences for any reason, you can [escape](https://jinja.palletsprojects.com/en/2.11.x/templates/#escaping) them using {% raw %}{%{% endraw %} raw {% raw %}%}{% endraw %} and {% raw %}{%{% endraw %} endraw {% raw %}%}{% endraw %} tags.

Keep in mind that the standard Jinja documentation primarily covers Python syntax and features, whereas Rspamd with Lupa introduces the usage of Lua syntax and features. For detailed information, refer to the Lupa documentation.
