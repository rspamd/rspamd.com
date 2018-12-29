---
layout: doc
title: Writing rules for Rspamd
---

{::options parse_block_html="true" /}

<div id="toc">
  * this unordered seed list will be replaced by toc as unordered list
  {:toc}
</div>

# Writing Rspamd rules

In this tutorial, we describe how to create new rules for Rspamd - both Lua and regexp rules.

## Introduction

Rules are the essential part of a spam filtering system and Rspamd ships with some prepared rules by default. However, if you run your own system you might want to have your own rules for better spam filtering or a better false positives rate. Rules are usually written in `Lua`, where you can specify both custom logic and generic regular expressions.

## Configuration files

Since Rspamd ships with its own rules it is a good idea to store your custom rules and configuration in separate files to avoid clashing with the default rules which might change from version to version. There are some possibilities to achieve this:

- Local rules in Lua should be stored in the file named `${CONFDIR}/rspamd.local.lua` where `${CONFDIR}` is the directory where your configuration files are placed (e.g. `/etc/rspamd`, or `/usr/local/etc/rspamd` for some systems)

Lua local configuration can be used to both override and extend:

`rspamd.lua`:

~~~lua
config['regexp']['symbol'] = '/some_re/'
~~~

`rspamd.local.lua`:

~~~lua
config['regexp']['symbol1'] = '/other_re/' -- add 'symbol1' key to the table
config['regexp']['symbol'] = '/override_re/' -- replace regexp for 'symbol'
~~~

For configuration rules you can take a look at the following examples:

`rspamd.conf`:

~~~ucl
var1 = "value1";

section "name" {
	var2 = "value2";
}
~~~

`rspamd.conf.local`:

~~~ucl
var1 = "value2";

section "name" {
	var3 = "value3";
}
~~~

Resulting config:

~~~ucl
var1 = "value1";
var1 = "value2";

section "name" {
	var2 = "value2";
}
section "name" {
	var3 = "value3";
}
~~~

Override example:

`rspamd.conf`:

~~~ucl
var1 = "value1";

section "name" {
	var2 = "value2";
}
~~~

`rspamd.conf.override`:

~~~ucl
var1 = "value2";

section "name" {
	var3 = "value3";
}
~~~

Resulting config:

~~~ucl
var1 = "value2";

# Note that var2 is removed completely

section "name" {
	var3 = "value3";
}
~~~

For each individual configuration file shipped with Rspamd, there are two special includes:

    .include(try=true,priority=1) "$CONFDIR/local.d/config.conf"
    .include(try=true,priority=1) "$CONFDIR/override.d/config.conf"

Therefore, you can either extend (using local.d) or ultimately override (using override.d) any settings in the Rspamd configuration.

For example, let's override some default symbols shipped with Rspamd. To do that we can create and edit `etc/rspamd/local.d/metrics.conf`:

    symbol "BLAH" {
        score = 20.0;
    }

We can also use an override file. For example, let's redefine actions and set a more restrictive `reject` score. To do this, we create `/etc/rspamd/override.d/actions.conf` with the following content:

~~~ucl
# override.d/actions.conf
reject = 150;
add_header = 6;
greylist = 4;
~~~

You can also disable some action completely:

~~~ucl
# override.d/actions.conf
reject = null;
~~~

This will set the other actions (e.g. `add_header` and `greylist`) to their default values.

## Writing rules

There are two types of rules that are normally defined by Rspamd:

- `Lua` rules: code in written in Lua
- `Regexp` rules: regular expressions and combinations of regular expressions to match specific patterns

Lua rules are useful for some complex tasks: check DNS, query Redis or HTTP, examine some task-specific details. Regexp rules are useful since they are heavily optimized by Rspamd (especially when `Hyperscan` is enabled) and allow matching custom patterns in headers, URLs, text parts and even the entire message body.

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

## Regexp rules

Regexp rules are executed by the `regexp` module of Rspamd. You can find a detailed description of the syntax in [the regexp module documentation]({{ site.url }}{{ site.baseurl }}/doc/modules/regexp.html)

Here are some hints to maximise performance of your regexp rules:

* Prefer lightweight regexps, such as header or URL, to heavy ones, such as mime or body regexps (unless you are using Hyperscan)
* If you need to match text in a message's content, prefer `mime` regexps as they are executed on text content only
* If you need to match the whole messages, then you might want to use [hyperscan](https://hyperscan.io). It is normally included in the Rspamd packages, however, your OS might provide own packages without Hyperscan. Please consider reading [pattern support](http://intel.github.io/hyperscan/dev-reference/compilation.html#pattern-support) to avoid expensive PCRE fallback.
* Avoid complex regexps, avoid backtracing, avoid negative groups `(?!)`, avoid capturing patterns (replace with `(?:)`), avoid potentially empty patterns, e.g. `/^.*$/`, especially when using hyperscan

Following these rules allows you to create fast and efficient rules. To add regexp rules you should use the `config` global table that is defined in any Lua file used by Rspamd:

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

Lua rules are more powerful than regexp ones but they are not as heavily optimized and can cause performance issues if written incorrectly. All Lua rules accept a special parameter called `task` which represents a scanned message.

### Return values

Each Lua rule can return `0`, or `false`, meaning that the rule has not matched, or true if the symbol should be inserted. In fact, you can return any positive or negative number which would be multiplied by the rule's static score, e.g. if the rule score is `1.2`, then when your function returns `1` the symbol will have a  score of `1.2`, and when your function returns `0.5` then the symbol will have a score of `0.6`. The common convention of the return values is to return **confidence factor** varying from `0` to `1.0`.

### Rule conditions

Like regexp rules, conditions are allowed for Lua regexps, for example:

~~~lua
rspamd_config.SYMBOL = {
	callback = function(task)
		return 1
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
          return 1
        end
      end
    end

    return 0
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

1. Pre-filters - run before other rules
2. Filters - run normally
3. Post-filters - run after all checks

The most common type of rules are generic filters. Each filter is basically a callback that is executed by Rspamd at some time, along with an optional symbol name associated with this callback. In general, there are three options to register symbols:

* register callback and associated symbol
* register just a plain callback
* register symbol with no callback (*virtual* symbol)

The last option is useful when you have a single callback but with different possible results; for example `SYMBOL_ALLOW` or `SYMBOL_DENY`. Filters are registered using the following method:

~~~lua
rspamd_config:register_symbol{
  type = 'normal', -- or virtual, callback, prefilter or postfilter
  name = 'MY_SYMBOL',
  callback = function(task) -- Main logic
  end,
  score = 1.0, -- Metric score
  group = 'some group', -- Metric group
  description = 'My super symbol',
  flags = 'fine', -- fine: symbol is always checked, skip: symbol is always skipped, empty: symbol work for checks with no message
  --priority = 2, -- useful for postfilters and prefilters to define order of execution
}
~~~

`nominal_weight` is used to define priority and the initial score multiplier. It should usually be `1.0` for normal symbols and `-1.0` for symbols with negative scores that should be executed before other symbols. Here is an example of registering one callback and a couple of virtual symbols used in the [DMARC]({{ site.url }}{{ site.baseurl }}/doc/modules/dmarc.html) module:

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

Numeric `id` is returned by a registration function with callback and can be used to link symbols:

* add virtual symbols associated with this callback
* correctly display average time for symbols without callbacks
* properly sort symbols
* register dependencies on virtual symbols (in fact, the true dependency is created based on the parent symbol but it is sometimes convenient to use virtual symbols for simplicity)

### Asynchronous actions

For asynchronous actions, such as Redis access or DNS checks it is recommended to use
dedicated callbacks, called symbol handlers. The difference to generic Lua rules is that
dedicated callbacks are not obliged to return value but they use the method `task:insert_result(symbol, weight)` to indicate a match. All Lua plugins are implemented as symbol handlers. Here is a simple example of a symbol handler that checks DNS:

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

Rspamd uses Redis heavily for different purposes. There are couple of useful functions that are defined in the file `lua_redis.lua`. These functions should be available globally in all Lua modules. Here is an example of parsing Redis config for a module and making requests subsequently:

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

It might be confusing that there are two variables with a common meaning. Unfortunately, this is a legacy of older versions of Rspamd. However, currently `rspamd_config` represents an object that can be used for almost all configuration tasks:

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

On the other hand, the `config` global is extremely simple: it's just a plain table of configuration options that is exactly the same as defined in `rspamd.conf` (and `rspamd.conf.local` or `rspamd.conf.override`). However, you can also use Lua tables and even functions for some options. For example, the `regexp` module also can accept a `callback` argument:

~~~lua
config['regexp']['SYMBOL'] = {
  callback = function(task) ... end,
  ...
}
~~~

Such syntax is discouraged, however, and is preserved mostly for compatibility reasons. Furthermore, you cannot use neither async requests nor coroutines in such callbacks - it will cause Rspamd crash.

## Configuration order

There is a strict order of configuration application:

1. Configuration files are loaded
3. **Lua** rules are loaded and they can override everything from the previous steps, with the important exception of rules scores, which are **NOT** overridden if the relevant symbol is also defined in a `metric` section
4. **Dynamic** configuration options defined in the WebUI (normally) are loaded and can override rule scores or action scores from the previous steps

## Rules check order

Rules in Rspamd are checked in the following order:

1. **Pre-filters**: checked every time and can stop all further processing by calling `task:set_pre_result()`
2. **All symbols***: can depend on each other by calling `rspamd_config:add_dependency(from, to)`
3. **Statistics**: is checked only when all symbols are checked
4. **Composites**: combine symbols to adjust the final results; pass 1
5. **Post-filters**: are executed even if a message is already rejected and symbols processing has been stopped
6. **Composites**: combine symbols to adjust the final results; pass 2
7. **Idempotent**: execute rules that cannot change result (e.g. data exporters)
