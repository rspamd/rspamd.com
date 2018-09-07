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

### Data definition functions

Data definition part defines what exactly needs to be extracted. Here is the list of methods supported by Rspamd so far:

TBD

### Transformation functions

TBD

## Type safety

## Selectors combinations

## Own selectors

