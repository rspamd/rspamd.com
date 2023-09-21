---
layout: doc
title: Writing rules for Rspamd
---

# Writing Rspamd rules

In this tutorial, we describe how to create new rules for Rspamd - both using Lua and regular expressions.

<div id="toc" markdown="1">
  * this unordered seed list will be replaced by toc as unordered list
  {:toc}
</div>

## Introduction

Rules play a vital role in a spam filtering system, and Rspamd comes equipped with a set of default rules. However, if you operate your own system, you may want to create your own rules for more effective spam filtering or a lower false positive rate. Rules are typically written in Lua, where you can define both custom logic and generic regular expressions.

## Configuration files

It is advisable to store your custom rules and configuration in separate files to avoid conflicts with the default rules, which may change from version to version. Rspamd comes with its own set of rules, so keeping your customizations separate can help to ensure that they are not overwritten or disrupted when updating the software.

There are several ways to achieve this:

* Local rules, both in Lua and regular expression format, should be stored in the file ${CONFDIR}/rspamd.local.lua, where ${CONFDIR} is the directory where your configuration files are located (e.g. /etc/rspamd or /usr/local/etc/rspamd on some systems).

* Lua local configuration can be used to both override and extend existing rules. For example, if the main lua file includes the following line:

`rspamd.lua`:

~~~lua
-- Regular expression rule defined in the main Rspamd configuration
config['regexp']['symbol'] = '/some_re/'
~~~

then you can define additional rules in `rspamd.local.lua`:

~~~lua
-- Regular expression rules defined in a local configuration
config['regexp']['symbol1'] = '/other_re/' -- add 'symbol1' key to the table
config['regexp']['symbol'] = '/override_re/' -- replace regexp for 'symbol'
~~~

Please note that this method is different from the standard configuration files, which use a different syntax (UCL-based) and typically include two special files:

```
.include(try=true,priority=1) "$CONFDIR/local.d/config.conf"
.include(try=true,priority=1) "$CONFDIR/override.d/config.conf"
```

With this approach, you can either modify or add to the existing settings in the Rspamd configuration (using local.d) or completely override them (using override.d).

For instance, you can override some default symbols provided by Rspamd by creating and editing the file etc/rspamd/local.d/metrics.conf.":

## Writing rules

Rspamd typically defines two types of rules:

* **Lua** rules: code written in Lua
* **Regexp** rules: regular expressions and combinations of regular expressions to match specific patterns

Lua rules are useful for performing complex tasks, such as checking DNS, querying Redis or HTTP, and examining task-specific details. Regexp rules are optimized by Rspamd (especially when Hyperscan is enabled) and can be used to match custom patterns in headers, URLs, text parts, and even the entire message body.

There is another option called [selectors](https://rspamd.com/doc/configuration/selectors.html) that allows you to combine data extraction and transformation routines, so you don't have to write custom Lua code. The selectors framework is also useful for reusing custom extraction/transformation routines in different plugins and even in regular expression constructions.

### Rule weights

Rule weights are usually defined in the `metrics` section and contain the following data:

- score triggers for different actions
- symbol scores
- symbol descriptions
- symbol group definitions:
	+ symbols in group
	+ description of group
	+ joint group score limit

For built-in rules scores are placed in the file called `${CONFDIR}/metrics.conf`, however, you have two possibilities to define scores for your rules:

1. Define scores in `local.d/groups.conf` as following:

~~~ucl
symbol "MY_SYMBOL" {
  description = "my cool rule";
  score = 1.5;
}
# Or, if you want to include it into a group:
group "mygroup" {
	symbol "MY_SYMBOL" {
	  description = "my cool rule";
	  score = 1.5;
	}
}
~~~

2. Define scores directly in Lua when describing symbol:

~~~lua
-- regexp rule
config['regexp']['MY_SYMBOL'] = {
	re = '/a/M & From=/blah/',
	score = 1.5,
	description = 'my cool rule',
	group = 'my symbols'
}

-- lua rule
rspamd_config.MY_LUA_SYMBOL = {
	callback = function(task)
		-- Do something
		return true
	end,
	score = -1.5,
	description = 'another cool rule',
	group = 'my symbols'
}
~~~

Keep in mind that the scores you define directly from Lua have lower priority and will be overridden by scores defined in the groups.conf file. Scores defined in the WebUI have even higher priority.

## Regexp rules

Regexp rules are executed by the `regexp` module of Rspamd. You can find a detailed description of the syntax in [the regexp module documentation]({{ site.url }}{{ site.baseurl }}/doc/modules/regexp.html)

To maximize the performance of your regexp rules, consider the following:

 * Prefer lightweight regexps, such as those for headers or URLs, over heavy ones like those for MIME or the body (unless you are using Hyperscan, which is the default for all Intel-based platforms).
 * Avoid complex regexps, backtracking (e.g. `/*+a?`), lookaheads/lookbehinds, potentially empty patterns, and large boundary constraints (e.g. `a{1000,100000}`). These constructions can increase scan complexity, especially when using Hyperscan, and even PCRE can experience exponential growth for some of these cases.

By following these guidelines, you can create fast and efficient rules. To add regexp rules, you can use the config global table defined in any Lua file used by Rspamd:

~~~lua
local reconf = config['regexp'] -- Create alias for regexp configs

local re1 = 'From=/foo@/H' -- Mind local here
local re2 = '/blah/P'

reconf['SYMBOL'] = {
	re = string.format('(%s) && !(%s)', re1, re2), -- use string.format to create expression
	score = 1.2,
	description = 'some description',

	condition = function(task) -- run this rule only if some condition is satisfied
		return true
	end,
}
~~~

## Lua rules

While Lua rules are more powerful than regexp rules, they are not as heavily optimized and can impact performance if written improperly. All Lua rules accept a special parameter called task, which represents the message being scanned.

### Return values

Each Lua rule can return 0 or false, indicating that the rule did not match, or true if the symbol should be inserted. You can also return any positive or negative number, which will be multiplied by the rule's static score. For example, if the rule score is 1.2, a return value of 1 will result in a symbol score of 1.2, while a return value of 0.5 will result in a symbol score of 0.6. It is common to return a **confidence factor** ranging from 0 to 1.0. Any other return values are treated as options for the symbol, and can be either in a single table:

~~~lua
return true,1.0,{'option1', 'option2'}
~~~

or as a list of return values:

~~~lua
return true,1.0,'option1','option2'
~~~

There is no difference in these notations. Tables are usually more convenient if you form list of options during the rule progressing.

### Rule conditions

Like regexp rules, conditions are allowed for Lua regexps, for example:

~~~lua
rspamd_config.SYMBOL = {
	callback = function(task)
		return true
	end,
	score = 1.2,
	description = 'some description',

	condition = function(task) -- run this rule only if some condition is satisfied
		return true
	end,
}
~~~

### Useful task manipulations

There are a number of methods in [task]({{ site.url }}{{ site.baseurl }}/doc/lua/rspamd_task.html) objects. For example, you can get any part of a message:

~~~lua
rspamd_config.HTML_MESSAGE = {
  callback = function(task)
    local parts = task:get_text_parts()

    if parts then
      for i,p in ipairs(parts) do
        if p:is_html() then
          return true
        end
      end
    end

    return false
  end,
  score = -0.1,
  description = 'HTML included in message',
}
~~~

You can get HTML information:

~~~lua
local function check_html_image(task, min, max)
  local tp = task:get_text_parts()

  for _,p in ipairs(tp) do
    if p:is_html() then
      local hc = p:get_html()
      local len = p:get_length()


      if len >= min and len < max then
        local images = hc:get_images()
        if images then
          for _,i in ipairs(images) do
            if i['embedded'] then
              return true
            end
          end
        end
      end
    end
  end
end

rspamd_config.HTML_SHORT_LINK_IMG_1 = {
  callback = function(task)
    return check_html_image(task, 0, 1024)
  end,
  score = 3.0,
  group = 'html',
  description = 'Short html part (0..1K) with a link to an image'
}
~~~

You can get message headers with full information passed:

~~~lua

rspamd_config.SUBJ_ALL_CAPS = {
  callback = function(task)
    local util = require "rspamd_util"
    local sbj = task:get_header('Subject')

    if sbj then
      local stripped_subject = subject_re:search(sbj, false, true)
      if stripped_subject and stripped_subject[1] and stripped_subject[1][2] then
        sbj = stripped_subject[1][2]
      end

      if util.is_uppercase(sbj) then
        return true
      end
    end

    return false
  end,
  score = 3.0,
  group = 'headers',
  description = 'All capital letters in subject'
}
~~~

You can also access HTTP headers, URLs and other useful properties of Rspamd tasks. Moreover, you can use global convenience modules exported by Rspamd, such as [rspamd_util]({{ site.url }}{{ site.baseurl }}/doc/lua/rspamd_util.html) or [rspamd_logger]({{ site.url }}{{ site.baseurl }}/doc/lua/rspamd_logger.html) by requiring them in your rules:

~~~lua
rspamd_config.SUBJ_ALL_CAPS = {
  callback = function(task)
    local util = require "rspamd_util"
    local logger = require "rspamd_logger"
    ...
  end,
}
~~~

## Rspamd symbols

Rspamd rules fall under three categories:

0. Connection filters - are executed before a message has been processed (e.g. on a connection stage)
1. Pre-filters - run before other rules
2. Filters - run normally
3. Post-filters - run after all checks
4. Idempotent filters - performs statistical checks and are NOT allowed to change scan result in any way

The most common type of rule is the generic filter. Essentially, a filter is a callback that is executed by Rspamd at a specific time, along with an optional symbol name associated with the callback. There are three options for registering symbols:

* Register a callback and an associated symbol
* Register just a plain callback (the symbol is not expected to be inserted into the result)
* Register a virtual symbol with no callback, but with an associated callback rule

The last option is useful when you have a single callback with different possible results, such as SYMBOL_ALLOW or SYMBOL_DENY. Filters are registered using the following method:

~~~lua
rspamd_config:register_symbol{
  type = 'normal', -- or virtual, callback, prefilter or postfilter
  name = 'MY_SYMBOL',
  callback = function(task) -- Main logic
  end,
  score = 1.0, -- Metric score
  group = 'some group', -- Metric group
  description = 'My super symbol',
  flags = 'fine', -- fine: symbol is always checked, skip: symbol is always skipped, empty: symbol allows to be executed with no message
  --priority = 2, -- useful for postfilters and prefilters to define order of execution
}
~~~

~~~lua
local id = rspamd_config:register_symbol({
  name = 'DMARC_CALLBACK',
  type = 'callback',
  callback = dmarc_callback
})
rspamd_config:register_symbol({
  name = dmarc_symbols['allow'],
  flags = 'nice',
  parent = id,
  type = 'virtual'
})
rspamd_config:register_symbol({
  name = dmarc_symbols['reject'],
  parent = id,
  type = 'virtual'
})
rspamd_config:register_symbol({
  name = dmarc_symbols['quarantine'],
  parent = id,
  type = 'virtual'
})
rspamd_config:register_symbol({
  name = dmarc_symbols['softfail'],
  parent = id,
  type = 'virtual'
})
rspamd_config:register_symbol({
  name = dmarc_symbols['dnsfail'],
  parent = id,
  type = 'virtual'
})
rspamd_config:register_symbol({
  name = dmarc_symbols['na'],
  parent = id,
  type = 'virtual'
})

rspamd_config:register_dependency(id, symbols['spf_allow_symbol'])
rspamd_config:register_dependency(id, symbols['dkim_allow_symbol'])
~~~

The registration function with a callback returns a numeric id, which can be used to link symbols in the following ways:

* Add virtual symbols associated with the callback
* Correctly display the average time for symbols without callbacks
* Properly sort symbols
* Register dependencies on virtual symbols (in reality, the true dependency is based on the parent symbol, but it can be simpler to use virtual symbols in some cases)

### Asynchronous actions

For asynchronous actions, such as accessing Redis or performing DNS checks, it is recommended to use dedicated callbacks called symbol handlers. Unlike generic Lua rules, symbol handlers are not required to return a value. Instead, they use the method `task:insert_result(symbol, weight)` to indicate a match. All Lua plugins are implemented as symbol handlers. Here is a simple example of a symbol handler that performs a DNS check:

~~~lua
rspamd_config:register_symbol('SOME_SYMBOL', 1.0,
	function(task)
		local to_resolve = 'google.com'
		local logger = require "rspamd_logger"

		local dns_cb = function(resolver, to_resolve, results, err)
			if results then
				logger.infox(task, '<%1> host: [%2] resolved for symbol: %3',
					task:get_message_id(), to_resolve, 'RULE')
				task:insert_result(rule['symbol'], 1)
			end
		end
		task:get_resolver():resolve_a({
			task=task,
			name = to_resolve,
			callback = dns_cb})
	end)
~~~

You can also set the desired score and description:

~~~lua
rspamd_config:set_metric_symbol('SOME_SYMBOL', 1.2, 'some description')
-- Table version
if rule['score'] then
  if not rule['group'] then
    rule['group'] = 'whitelist'
  end
  rule['name'] = symbol
  rspamd_config:set_metric_symbol(rule)
end
~~~

You can also use [`coroutines`](https://rspamd.com/doc/lua/sync_async.html) to simplify your asynchronous code.

## Redis requests

Rspamd relies heavily on Redis for various purposes. A couple of useful functions for working with Redis are defined in the file `lua_redis.lua` and should be globally available in all Lua modules. Here is an example of how to parse the Redis configuration for a module and make requests:

~~~lua
local redis_params
local lua_redis = require "lua_redis"

local function symbol_cb(task)
  local function redis_set_cb(err)
    if err ~=nil then
      rspamd_logger.errx(task, 'redis_set_cb received error: %1', err)
    end
  end
  -- Create hash of message-id and store to redis
  local key = make_key(task)
  local ret = lua_redis.redis_make_request(task,
    redis_params, -- connect params
    key, -- hash key
    true, -- is write
    redis_set_cb, --callback
    'SETEX', -- command
    {key, tostring(settings['expire']), "1"} -- arguments
  )
end

-- Load redis server for module named 'module'
redis_params = lua_redis.parse_redis_server('module')
if redis_params then
  -- Register symbol
end
~~~

## Using maps from Lua plugin

Maps hold dynamically loaded data like lists or IP trees. It is possible to use 3 types of maps:

* **radix** stores IP addresses
* **hash** stores plain strings and values
* **set** stores plain strings with no values
* **regexp** stores regular expressions (powered by hyperscan if possible)
* **regexp_multi** stores regular expressions and returns **all* matches using `get_key` method
* **glob** stores glob expressions (powered by hyperscan if possible)
* **glob_multi** stores glob expressions and returns **all* matches using `get_key` method
* **callback** call for a specified Lua callback when a map is loaded or changed, map's content is passed to that callback as a parameter

Here is a sample of using maps from Lua API:

~~~lua
local rspamd_logger = require "rspamd_logger"

-- Add two maps in configuration section
local hash_map = rspamd_config:add_map{
  type = "hash",
  urls = ['file:///path/to/file'],
  description = 'sample map'
}
local radix_tree = rspamd_config:add_map{
  type = 'radix', 
  urls = ['http://somehost.com/test.dat', 'fallback+file:///path/to/file'], 
  description = 'sample ip map'
}
local generic_map = rspamd_config:add_map{
  type = 'callback',
  urls = ['file:///path/to/file']
  description = 'sample generic map',
  callback = function(str)
    -- This callback is called when a map is loaded or changed
    -- Str contains map content
    rspamd_logger.info('Got generic map content: ' .. str)
  end
}

local function sample_symbol_cb(task)
    -- Check whether hash map contains from address of message
    if hash_map:get_key(task:get_from()) then
        -- Check whether radix map contains client's ip
        if radix_map:get_key(task:get_from_ip_num()) then
        ...
        end
    end
end
~~~

## Difference between `config` and `rspamd_config`

It may be confusing that there are two variables with a similar meaning. This is a legacy from older versions of Rspamd. However, currently, rspamd_config represents an object that can be used for most configuration tasks:

* Get configuration options:

~~~lua
rspamd_config:get_all_opts('section')
~~~

* Add maps:

~~~lua
rule['map'] = rspamd_config:add_kv_map(rule['domains'],
            "Whitelist map for " .. symbol)
~~~

* Register callbacks for symbols:

~~~lua
rspamd_config:register_symbol('SOME_SYMBOL', 1.0, some_functions)
~~~

* Register lua rules (note that `__newindex` metamethod is actually used here):

~~~lua
rspamd_config.SYMBOL = {...}
~~~

* Register composites, pre-filters, post-filters and so on

On the other hand, the config global is a very simple table of configuration options that is exactly the same as defined in rspamd.conf (and rspamd.conf.local or rspamd.conf.override). However, you can also use Lua tables and even functions for some options. For example, the regexp module can also accept a callback argument:

~~~lua
config['regexp']['SYMBOL'] = {
  callback = function(task) ... end,
  ...
}
~~~

You cannot use neither async requests nor coroutines in such callbacks - it will cause Rspamd to crash.

## Configuration order

Configuration application follows a strict order:

1. Configuration files are loaded
2. Lua rules are loaded and can override most previous settings, with the exception of rule scores, which are not overridden if the relevant symbol is defined in a metric section
3. Dynamic configuration options defined in the WebUI (usually) are loaded and can override rule scores or action scores from previous steps.

## Rules check order

Rules in Rspamd are checked in the following order:

| Stage | Description |
:- | :-----------
| **Connection filters** (from 2.7) | initial stage just after a connection has been established (these rules should not rely on any body content)
| **Message processing** | a stage where Rspamd performs text extraction, htm parsing, language detection etc
| **Pre-filters** | checked before all normal filters and are executed in order from high priority to low priority ones (e.g. a prefilter with priority 10 is executed before a prefilter with priority 1)
| **Normal filters** | normal rules that form dependency graph on each other by calling `rspamd_config:register_dependency(from, to)`, otherwise the order of execution is not defined
| **Statistics** | checked only when all normal symbols are checked
| **Composites** | combined symbols to adjust the final results; pass 1
| **Post-filters** | rules that are called after normal filters and composites pass, the order of execution is from low priority to high priority (e.g. a postfilter with priority 10 is executed after a postfilter with priority 1)
| **Composites** | combined symbols to adjust the final results (including postfilter results); pass 2
| **Idempotent filters** | rules that cannot change result in any way (so adding symbols or changing scores are not allowed on this stage), the order of execution is from low priority to high priority, same as postfilters
