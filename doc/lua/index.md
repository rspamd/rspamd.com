---
layout: doc
title: Lua API documentation
---

# Lua API documentation {#top}

[Lua](http://www.lua.org) is used for writing rules and plugins in Rspamd. Rspamd exposes various core functionality through its Lua API.

## Using Lua API from rules

Lua plugins are a powerful tool for creating complex filters that can access practically all features of Rspamd. Lua plugins can be used for writing custom rules which could interact with Rspamd in many ways such as using maps and making DNS requests. Rspamd is shipped with a number of Lua plugins that could be used as examples while writing your own plugins.

Please read the [guide]({{ site.url }}{{ site.baseurl }}/doc/tutorials/writing_rules.html) about writing Lua rules.

## Lua API reference

You can select the module you are interested in in the list on the left. Some of the modules are implied, for example, if you see `task` in the list of your function arguments it is assumed that you check for [`rspamd_task` module]({{ site.url }}{{ site.baseurl }}/doc/lua/rspamd_task.html). There is also some super globals available, for example [`rspamd_config`]({{ site.url }}{{ site.baseurl }}/doc/lua/rspamd_config.html). 

## Using async requests inside plugins

Please read the following [document]({{ site.url }}{{ site.baseurl }}/doc/lua/sync_async.html) that desribes the main principles of writing async code in Rspamd.

## References

- [Lua manual](https://www.lua.org/manual/5.1/) - reference manual
- [LuaJIT site](https://www.luajit.org) - mainly used in Rspamd (at least, in the pre-built packages)
- [Programming in Lua](https://www.lua.org/pil/) - recommended guide to Lua
- [Lua users wiki](http://lua-users.org/wiki/) - lots of information about Lua
