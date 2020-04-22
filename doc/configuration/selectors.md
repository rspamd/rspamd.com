---
layout: doc
title: Rspamd Selectors
---

# Rspamd selectors settings
{:.no_toc}

Rspamd selectors is a Lua framework that allows functional extraction and processing of data from messages.

<div id="toc" markdown="1">
  <h2 class="toc-header">Contents</h2>
  * TOC
  {:toc}
</div>

## Introduction

<center><img class="img-responsive" src="{{ site.baseurl }}/img/selectors.png" width="50%"></center>

From version 1.8, Rspamd includes a framework to extract data from messages and use it further in plugins by means of transform functions. For example, you can extract SMTP from address and lowercase it by the following selector:

```
smtp_from.lower
```

or get a subject's digest lowercased and truncated to 16 hex characters:

```
header('Subject').lower.digest('hex').substring(1, 16)
```

You can also operate with lists, e.g. lists of URLs:

```
urls:get_tld
```

Afterwards, these values can be used in various plugins:

* [`multimap`](../modules/multimap.html) - map type equal to `selector`
* [`ratelimit`](../modules/ratelimit.html) - rate bucket description with `selector` field
* [`reputation`](../modules/reputation.html) - generic selector rules
* [`regexp`](../modules/regexp.html) - regular expressions based on selector's data
* [`clustering`] - TBD

## Selectors syntax

Typically, a selector is composed of two parts:

1. Data definition (e.g. `header` or `urls`)
2. Optional data transformation method separated by `:`
3. Transform pipeline in which multiple functions, separated by dot operators (.), are chained together

You can also combine multiple selectors by using `;` as a separator:

```
smtp_from.addr.lower;ip.addr
```

Both data definition and transformation functions support arguments separated by commas. Single and double quotes are supported to simplify escaping:

```
header('Subject').regexp("^A-Z{10,}.*")
header('Subject').regexp("^A-Z{10,}\"'.*")
header('Subject').regexp('^A-Z{10,}"\'.*')
```

### Data transformation method

Some data extractors return complex objects (or list of such a complex objects):

- table
- userdata (Lua object)

There are two possibilities to convert these complex objects to a simple ones (strings or list of strings): implicit conversion and using of the method/table key extraction. 

1. For objects, implicit conversion is just calling of `tostring` while method is a plain method call. The following are equal: `ip:to_string.lower` and `ip.lower`. However, you can call different methods of the objects: `urls:get_tld` will return a list of strings with all eSLD parts of urls in the message.

2. For tables, explicit conversion just extracts the specific key, for example, `from:addr` or `from('mime'):name`. Implicit conversion is a bit more complicated:

  - If there is a field `value` in table it will be used for implicit conversion
  - Otherwise, if there is a field `addr` in table it will be used for implicit conversion
  - Otherwise `table.concat(t, ' ')` will be used for implicit conversion

### Null values

If data transformation function or **any** transform function returns `nil`, selector is completely ignored. For example, this property is utilised in `in` and `not_in` transformation functions. Here is a sample config for `ratelimit` module that uses `in` transformation combined with `id` to drop the original string.

```
user_workdays = {
    selector = "user.lower;time('connect', '!%w').in(1, 2, 3, 4, 5).id('work')";
    bucket = "10 / 1m";
};
user_weekends = {
    selector = "user.lower;time('connect', '!%w').in(6, 7).id('weekends')";
    bucket = "1 / 1m";
};
```

In this sample, `user_weekdays` will be completely ignored during weekends and, vice versa, `user_weekends` will not be used during the working days.

## Selectors combinations

In the previous example, the selector had multiple components:

* `user.lower` - extracts authenticated username and lowercases it
* `time('connect', '!%w').in(6, 7).id('weekends')`  - if connection time is in the specified range, return string 'weekends'

These two elements are separated by `;` symbol. Modules will use these elements as a concatenated string, e.g. `user@example.com:weekends` (`:` symbol is used by ratelimit module as a separator).

But what if you want to use the same for, let's say, recipients:

```
rcpt_weekends = {
    selector = "rcpts.take_n(5).lower;time('connect', '!%w').in(6, 7).id('weekends')";
    bucket = "1 / 1m";
};
```

In this sample, we take up to `5` recipients, extract address part, lowercase it and combine with a string `weekends` if the condition is satisfied. When a list of elements is concatenated with a string, then this string is appended (or prepended) to each element of the list:

```
rcpt1:weekends
rcpt2:weekends
rcpt3:weekends
```

It also works if you want to add prefix and suffix:

```
rcpt_weekends = {
    selector = "id('rcpt');rcpts:addr.take_n(5).lower;time('connect', '!%w').in(6, 7).id('weekends')";
    bucket = "1 / 1m";
};
```

will be transformed to:

```
rcpt:rcpt1:weekends
rcpt:rcpt2:weekends
rcpt:rcpt3:weekends
```

Combining of lists with different number of entries is not recommended - in this case the shortest of the lists will be used:

```
id('rcpt');rcpts.take_n(5).lower;urls.get_host.lower
```

will produce a list that might have up to 5 elements and concatenate it with a prefix:

```
rcpt:rcpt1:example.com
rcpt:rcpt2:example2.com
rcpt:rcpt3:example3.com
```

## Data definition functions

Data definition part defines what exactly needs to be extracted. Here is the list of methods supported by Rspamd so far:

| Extraction method          | Version  | Description                       |
| :------------------------- | :------: | :-------------------------------- |
| `asn` | 1.8+ | Get AS number (ASN module must be executed first)
| `attachments` | 1.8+ | Get list of all attachments digests
| `country` | 1.8+ | Get country (ASN module must be executed first)
| `digest` | 1.8+ | Get content digest
| `emails` | 1.8+ | Get list of all emails. If no arguments specified, returns list of url objects. Otherwise, calls a specific method, e.g. `get_user`
| `files` | 1.8+ | Get all attachments files
| `from` | 1.8+ | Get MIME or SMTP from (e.g. `from('smtp')` or `from('mime')`, uses any type by default)
| `header` | 1.8+ | Get header with the name that is expected as an argument. The optional second argument accepts list of flags:<ul><li>`full`: returns all headers with this name with all data (like task:get_header_full())</li><li>`strong`: use case sensitive match when matching header's name</li></ul>
| `helo` | 1.8+ | Get helo value
| `id` | 1.8+ | Return value from function's argument or an empty string, For example, `id('Something')` returns a string 'Something'
| `ip` | 1.8+ | Get source IP address
| `languages` | 1.9+ | Get languages met in a message
| `list` | 2.0+ | Returns a list of values from its arguments or an empty list
| `messageid` | 2.6+ | Get message ID
| `pool_var` | 1.8+ | Get specific pool var. The first argument must be variable name, the second argument is optional and defines the type (string by default)
| `queueid` | 2.6+ | Get queue ID
| `rcpts` | 1.8+ | Get MIME or SMTP rcpts (e.g. `rcpts('smtp')` or `rcpts('mime')`, uses any type by default)
| `received` | 1.8+ | Get list of received headers. If no arguments specified, returns list of tables. Otherwise, selects a specific element, e.g. `by_hostname`
| `request_header` | 1.8+ | Get specific HTTP request header. The first argument must be header name.
| `symbol` | 2.6+ | Get symbol with the name that is expected as first argument. Returns the symbol table (like task:get_symbol())
| `time` | 1.8+ | Get task timestamp. The first argument is type: <ul><li>`connect`: connection timestamp (default)</li><li>`message`: timestamp as defined by `Date` header</li></ul>The second argument is optional time format, see [os.date](http://pgl.yoyo.org/luai/i/os.date) description
| `to` | 1.8+ | Get principal recipient
| `uid` | 2.6+ | Get ID of the task being processed
| `urls` | 1.8+ | Get list of all urls. If no arguments specified, returns list of url objects. Otherwise, calls a specific method, e.g. `get_tld`
| `user` | 1.8+ | Get authenticated user name

## Transformation functions

| Transform  method          | Version  | Description                       |
| :------------------------- | :------: | :-------------------------------- |
| `append` | 2.0+ | Appends a string or a strings list
| `apply_map` | 2.0+ | Returns a value from some map corresponding to some key (or acts like a `map` function). Map name must be registered first!
| `digest` | 1.8+ | Create a digest from a string. The first argument is encoding (`hex`, `base32`, `base64`), the second argument is optional hash type (`blake2`, `sha256`, `sha1`, `sha512`, `md5`)
| `drop_n` | 1.8+ | Returns list without the first n elements
| `equal` | 2.0+ | Boolean function equal. Returns either nil or its argument if input is equal to argument
| `filter_map` | 2.0+ | Returns a value if it exists in some map (or acts like a `filter` function). Map name must be registered first!
| `first` | 1.8+ | Returns the first element
| `id` | 1.8+ | Drops input value and return values from function's arguments or an empty string
| `in` | 1.8+ | Boolean function in. Returns either nil or its input if input is in args list
| `inverse` | 2.0+ | Inverses input. Empty string comes the first argument or `true`, non-empty string comes `nil`
| `ipmask` | 2.0+ | Applies mask to IP address. The first argument is the mask for IPv4 addresses, the second is the mask for IPv6 addresses.
| `join` | 1.8+ | Joins strings into a single string using separator in the argument
| `last` | 1.8+ | Returns the last element
| `lower` | 1.8+ | Returns the lowercased string
| `not_in` | 1.8+ | Boolean function not in. Returns either nil or its input if input is not in args list
| `nth` | 1.8+ | Returns the `n`-th element
| `prepend` | 2.0+ | Prepends a string or a strings list
| `regexp` | 1.8+ | Regexp matching
| `sort` | 2.0+ | Sort strings lexicographically
| `substring` | 1.8+ | Extracts substring. Arguments are equal to lua [string.sub](http://pgl.yoyo.org/luai/i/string.sub)
| `take_n` | 1.8+ | Returns the n first elements
| `to_ascii` | 2.6+ | Returns the string with all non-ascii bytes replaced with the character given as second argument or `?`
| `uniq` | 2.0+ | Returns a list of unique elements (using a hash table - no order preserved!)

### Maps in transformations

From the version 2.0, Rspamd supports using of maps within selectors. It is done by adding maps to a special `lua_selectors.maps` table. This table must have name-value pairs where `name` is a symbolic name of map that could be used in transformation/extraction functions and value is the return of `lua_maps.map_add_from_ucl`. Here is an example:

~~~lua
local lua_selectors = require "lua_selectors"
local lua_maps = require "lua_maps"

lua_selectors.maps.test_map = lua_maps.map_add_from_ucl({
    'key value',
    'key1 value1',
    'key3 value1',
  }, 'hash', 'test selectors maps')

local samples = {
    ["map filter"] = {
      selector = "id('key').filter_map(test_map)",
      expect = {'key'}
    },
    ["map apply"] = {
      selector = "id('key').apply_map(test_map)",
      expect = {'value'}
    },
    ["map filter list"] = {
      selector = "list('key', 'key1', 'key2').filter_map(test_map)",
      expect = {{'key', 'key1'}}
    },
    ["map apply list"] = {
      selector = "list('key', 'key1', 'key2', 'key3').apply_map(test_map)",
      expect = {{'value', 'value1', 'value1'}}
    },
    ["map apply list uniq"] = {
      selector = "list('key', 'key1', 'key2', 'key3').apply_map(test_map).uniq",
      expect = {{'value1', 'value'}}
    },
}
~~~

## Type safety

All selectors provide type safety controls. It means that Rspamd checks if types within pipeline match each other. For example, `rcpts` extractor returns a list of addresses, and `from` returns a single address. If you need to lowercase this address you need to convert it to a string as the first step. This could be done by getting a specific element of this address, e.g. `from.addr` -> this returns a `string` (you could also get `from.name` to get a displayed name, for example). Each processor has its own list of the accepted types.

However, in the case of recipients, `rcpt` returns a list of addresses not a single address. Despite of this, you can still apply the same pipeline `rcpts.addr.tolower`. This magic works as many processors could be functionally applied as a map:

```
elt1 -> f(elt1) -> elt1'
elt2 -> f(elt2) -> elt2'
elt3 -> f(elt3) -> elt3'
```

So a list of elements of type `t` is element-wise transformed using processor `f` forming a new list of type `t1` (could be same as `t`). The length of the new list is the same.

For convenience, the final values could be transformed implicitly to their string form. For example, URLs, emails and IP addresses could be converted to strings implicitly.

Normally, you should not care about type safety unless you have type errors. This mechanism is intended to protect selectors architecture from users mistakes.

## Own selectors

You can add your own extractors and process functions. This should be done prior to using of these selectors somewhere else. For example, it is guaranteed that `rspamd.local.lua` is executed before any plugins initialisation so it is generally safe to register your functions there. Here is a small example about how to register your own extractors and processors.

~~~lua
local lua_selectors = require "lua_selectors" -- Import module

lua_selectors.register_extractor(rspamd_config, "get_something", {
  get_value = function(task, args) -- mandatory field
    return task:get_something(),'string' -- result + type
  end,
  description = 'Sample extractor' -- optional
})

lua_selectors.register_processor(rspamd_config, "append_string", {
  types = {['string'] = true}, -- accepted types
  process = function(input, type, args)
    return input .. table.concat(args or {}),'string' -- result + type
  end,
  map_type = 'string', -- can be used in map like invocation, always return 'string' type
  description = 'Adds all arguments to the input string'
})

-- List processor example
lua_selectors.register_transform(rspamd_config, "take_second", {
  types = {['list'] = true}, -- accepted types
  process = function(input, t)
    return input[2],t:match('^(.*)_list$') -- second element and list type
  end,
  desctiption = 'Returns the second element of the list'
})
~~~

You can use these functions in your selectors subsequently.

## Regular expressions selectors

It is also possible to use selectors for Rspamd [regexp module](../modules/regexp.html). The idea behind that is that you can use data extracted and processed by the selector framework to match it against different regular expression.

First of all, you need to register a selector in regexp module (e.g. in `rspamd.local.lua` file):

~~~lua
rspamd_config:register_re_selector('test', 'user.lower;header(Subject).lower', ' ')
~~~

The first argument represents a symbolic name of the selector that will be used further to reference it in re rules. The second argument is the selector in a usual syntax. The optional last argument defines a character that will be used to join selector parts. For instance, this selector will produce a value of authenticated user concatenated with `Subject` header's value using a space character.

Subsequently, you can reference this selector in regexp rules (order doesn't matter, so you can use the name of selector even before its registration in the code).

~~~lua
config['regexp']['TEST_SELECTOR_RE'] = {
  re = 'test=/user some subject/$',
  score = 100500,
}
~~~

The syntax of regexp for selectors is somehow similar to the headers regexp: you define selector's name followed by `=` and the regular expression itself and use `$` as type. Omitting `$` sign will tell Rspamd that you implicitly define header regexp, not a selector one. Hence, it is important to include this symbol. Alternatively, you can use a long syntax for re type:

~~~lua
config['regexp']['TEST_SELECTOR_RE'] = {
  re = 'test=/user some subject/{selector}',
  score = 100500,
}
~~~

If selector returns multiple values (e.g. recipients), then this regular expression would be matched against all elements in such a list. Hence, it might be important to include `one_shot` to avoid multiple symbols insertion if unintended:

~~~lua
rspamd_config:register_re_selector('test_rcpt', 'rcpts.addr.lower;header(Subject).lower', ' ')
config['regexp']['TEST_SELECTOR_RCPT'] = {
  re = 'test_rcpt=/user@example.com some subject/{selector}',
  score = 100500,
  one_shot = true,
}
~~~

Data extracted via selector is cached internally, so you can reuse it safely in multiple regular expressions (in case of `Hyperscan` support multiple regular expressions will also be composed as usually).
