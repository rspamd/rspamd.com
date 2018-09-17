---
layout: doc_conf
title: Rspamd Selectors
---

# Rspamd selectors settings

## Introduction

From version 1.8, Rspamd includes a framework to extract data from messages and use it further in plugins by means of transform functions. For example, you can extract SMTP from address and lowercase it by the following selector:

```
smtp_from.addr.lower
```

or get a subject's digest lowercased and truncated to 16 hex characters:

```
header('Subject').first.lower.digest.encode('hex').substring(1, 16)
```

You can also operate with lists, e.g. lists of urls:

```
urls.method('get_tld')
```

Afterwards, these values can be used in various plugins:

* [`multimap`](../modules/multimap.html) - map type equal to `selector`
* [`ratelimit`](../modules/ratelimit.html) - rate bucket description with `selector` field
* `reputation` - TBD

## Selectors syntax

Typically, a selector is composed of two parts:

1. Data definition (e.g. `header` or `urls`)
2. Transform pipeline in which multiple functions, separated by dot operators (.), are chained together

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

### Null values

If data transformation function or **any** transform function returns `nil` selector is completely ignored. For example, this property is utilised in `in` and `not_in` transformation functions. Here is a sample config for `ratelimit` module that uses `in` transformation combined with `id` to drop the original string.

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

* `user.lower` - extracts authenticated username and lowercase it
* `time('connect', '!%w').in(6, 7).id('weekends')`  - if connection time is in the specified range, return string 'weekends'

These two elements are separated by `;` symbol. Modules will use these elements as a concatenated string, e.g. `user@example.com:weekends` (`:` symbol is used by ratelimit module as a separator).

But what if you want to use the same for, let's say, recipients:

```
rcpt_weekends = {
    selector = "rcpts.take_n(5).addr.lower;time('connect', '!%w').in(6, 7).id('weekends')";
    bucket = "1 / 1m";
};
```

In this sample, we take up to `5` recipients, extracts address part, lowercase it and combine with a string `weekends` if the condition is satisified. When a list of elements is concatenated with a string, then this string is appended (or prepended) to each element of the list:

```
rcpt1:weekends
rcpt2:weekends
rcpt3:weekends
```

It also works if you want to add prefix and suffix:

```
rcpt_weekends = {
    selector = "id('rcpt');rcpts.take_n(5).addr.lower;time('connect', '!%w').in(6, 7).id('weekends')";
    bucket = "1 / 1m";
};
```

will be transformed to:

```
rcpt:rcpt1:weekends
rcpt:rcpt2:weekends
rcpt:rcpt3:weekends
```

Combining of lists with different number of entries is not recommended - in this case the shortest of lists will be used:

```
id('rcpt');rcpts.take_n(5).addr.lower;urls.get_host.lower
```

will produce a list that might have up to 5 elements and concatenate it with a prefix:

```
rcpt:rcpt1:example.com
rcpt:rcpt2:example2.com
rcpt:rcpt3:example3.com
```

### Data definition functions

Data definition part defines what exactly needs to be extracted. Here is the list of methods supported by Rspamd so far:

* `request_header` - Get specific HTTP request header. The first argument must be header name.
* `id` - Return value from function's argument or an empty string. For example, `id('Something')` returns a string 'Something'
* `pool_var` - Get specific pool var. The first argument must be variable name, the second argument is optional and defines the type (string by default)
* `emails` - Get list of all emails. If no arguments specified, returns list of url objects. Otherwise, calls a specific method, e.g. `get_user`
* `asn` - Get AS number (ASN module must be executed first)
* `country` - Get country (ASN module must be executed first)
* `ip` - Get source IP address
* `time` - Get task timestamp. The first argument is type:
  - `connect`: connection timestamp (default)
  - `message`: timestamp as defined by `Date` header
  
  The second argument is optional time format, see [os.date](http://pgl.yoyo.org/luai/i/os.date) description
* `digest` - Get content digest
* `helo` - Get helo value
* `urls` - Get list of all urls. If no arguments specified, returns list of url objects. Otherwise, calls a specific method, e.g. `get_tld`
* `user` - Get authenticated user name
* `received` - Get list of received headers. If no arguments specified, returns list of tables. Otherwise, selects a specific element, e.g. `by_hostname`
* `from` - Get MIME or SMTP from (e.g. `from(smtp)` or `from(mime)`, uses any type by default)
* `attachments` - Get list of all attachments digests
* `header` - Get header with the name that is expected as an argument. The optional second argument accepts list of flags:
  - `full`: returns all headers with this name with all data (like task:get_header_full())
  - `strong`: use case sensitive match when matching header's name
* `rcpts` - Get MIME or SMTP rcpts (e.g. `rcpts(smtp)` or `rcpts(mime)`, uses any type by default)
* `files` - Get all attachments files
* `to` - Get principal recipient

### Transformation functions

* `id` - Drops input value and return values from function's arguments or an empty string
* `in` - Boolean function in. Returns either nil or its input if input is in args list
* `last` - Returns the last element
* `nth` - Returns the nth element
* `regexp` - Regexp matching
* `get_host` - Get hostname from url or a list of urls
* `join` - Joins strings into a single string using separator in the argument
* `get_tld` - Get tld from url or a list of urls
* `encode` - Encode hash to string (using hex encoding by default)
* `substring` - Extracts substring
* `lower` - Returns the lowercased string
* `drop_n` - Returns list without the first n elements
* `addr` - Get email address as a string
* `not_in` - Boolean function not in. Returns either nil or its input if input is not in args list
* `digest` - Create a digest from string or a list of strings
* `method` - Call specific userdata method
* `first` - Returns the first element
* `elt` - Extracts table value from key-value list
* `name` - Get email name as a string
* `take_n` - Returns the n first elements

## Type safety

## Own selectors

## Regular expressions selectors
