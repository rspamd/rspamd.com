---
layout: doc
title: UCL language
---
# UCL configuration language

**Table of Contents**

- [Introduction](#introduction)
- [Basic structure](#basic-structure)
- [Improvements to the json notation](#improvements-to-the-json-notation)
	- [General syntax sugar](#general-syntax-sugar)
	- [Automatic arrays creation](#automatic-arrays-creation)
	- [Named keys hierarchy](#named-keys-hierarchy)
	- [Convenient numbers and booleans](#convenient-numbers-and-booleans)
- [General improvements](#general-improvements)
	- [Comments](#comments)
	- [Macros support](#macros-support)
	- [Variables support](#variables-support)
	- [Multiline strings](#multiline-strings)
- [Emitter](#emitter)
- [Validation](#validation)
- [Performance](#performance)
- [Conclusion](#conclusion)

## Introduction {#introduction}

This document describes the main features and principles of the configuration
language called `UCL` - universal configuration language.

## Basic structure {#basic-structure}

UCL is heavily infused by `nginx` configuration as the example of a convenient configuration
system. However, UCL is fully compatible with `JSON` format and is able to parse json files.
For example, you can write the same configuration in the following ways:

* in nginx like:

~~~hcl
param = value;
section {
    param = value;
    param1 = value1;
    flag = true;
    number = 10k;
    time = 0.2s;
    string = "something";
    subsection {
        host = {
            host = "hostname";
            port = 900;
        }
        host = {
            host = "hostname";
            port = 901;
        }
    }
}
~~~

* or in JSON:

~~~json
{
    "param": "value",
    "param1": "value1",
    "flag": true,
    "subsection": {
        "host": [
        {
            "host": "hostname",
            "port": 900
        },
        {
            "host": "hostname",
            "port": 901
        }
        ]
    }
}
~~~

## Improvements to the json notation. {#improvements-to-the-json-notation}

There are several features that make the UCL configuration easier to edit than strict JSON formatting:

### General syntax sugar

* Braces are not necessary to enclose a top object as it is automatically treated as an object:

~~~json
"key": "value"
~~~

is equal to:

~~~json
{"key": "value"}
~~~

* There is no requirement of quotes for strings and keys, moreover, `:` may be replaced `=` or even be skipped for objects:

~~~hcl
key = value;
section {
    key = value;
}
~~~

is equal to:

~~~json
{
    "key": "value",
    "section": {
        "key": "value"
    }
}
~~~

* You can safely place a comma or semicolon after the last element in an array or object without causing any formatting issues:

~~~json
{
    "key1": "value",
    "key2": "value",
}
~~~

### Automatic arrays creation

* Non-unique keys in an object are allowed and are automatically converted to the arrays internally:

~~~json
{
    "key": "value1",
    "key": "value2"
}
~~~

is converted to:

~~~json
{
    "key": ["value1", "value2"]
}
~~~

### Named keys hierarchy

UCL allows for named keys and organizes them into a hierarchical object structure internally. For example, this process can be illustrated as follows:

~~~hcl
section "blah" {
	key = value;
}
section foo {
	key = value;
}
~~~

is converted to the following object:

~~~hcl
section {
	blah {
		key = value;
	}
	foo {
		key = value;
	}
}
~~~

Plain definitions may be more complex and contain more than a single level of nested objects:

~~~hcl
section "blah" "foo" {
	key = value;
}
~~~

is presented as:

~~~hcl
section {
	blah {
		foo {
			key = value;
		}
	}
}
~~~

### Convenient numbers and booleans

* Numbers can have suffixes to specify standard multipliers:
    + `[kKmMgG]` - standard 10 base multipliers (so `1k` is translated to 1000)
    + `[kKmMgG]b` - 2 power multipliers (so `1kb` is translated to 1024)
    + `[s|min|d|w|y]` - time multipliers, all time values are translated to float number of seconds, for example `10min` is translated to 600.0 and `10ms` is translated to 0.01
* Hexadecimal integers can be represented using the `0x` prefix,  such as`key = 0xff`. However, floating point values can only be expressed in decimal base.
* Booleans can be specified as `true` or `yes` or `on` and `false` or `no` or `off`.
* It is still possible to treat numbers and booleans as strings by enclosing them in double quotes.

## General improvements {#general-improvements}

### Comments {#comments}

UCL supports different style of comments:

* single line: `#`
* multiline: `/* ... */`

Multiline comments may be nested:

~~~c
# Sample single line comment
/*
 some comment
 /* nested comment */
 end of comment
*/
~~~

### Macros support

UCL supports external macros both multiline and single line ones:

~~~hcl
.macro "sometext";
.macro {
    Some long text
    ....
};
~~~

In addition, each macro can accept an optional list of arguments in braces. These arguments are themselves a UCL object that is parsed and passed to the macro as options:

~~~hcl
.macro(param=value) "something";
.macro(param={key=value}) "something";
.macro(.include "params.conf") "something";
.macro(#this is multiline macro
param = [value1, value2]) "something";
.macro(key="()") "something";
~~~

UCL also provides a convenient `include` macro that allows you to load the contents of another file into the current UCL object. This macro accepts either a file path or URL as an argument:

~~~hcl
.include "/full/path.conf"
.include "./relative/path.conf"
.include "${CURDIR}/path.conf"
~~~

or URL (if ucl is built with url support provided by either `libcurl` or `libfetch`):

	.include "http://example.com/file.conf"

`.include` macro supports a set of options:

* `try` (default: **false**) - if this option is `true` than UCL treats errors on loading of
this file as non-fatal. For example, such a file can be absent but it won't stop the parsing
of the top-level document.
* `sign` (default: **false**) - if this option is `true` UCL loads and checks the signature for
a file from path named `<FILEPATH>.sig`. Trusted public keys should be provided for UCL API after
parser is created but before any configurations are parsed.
* `glob` (default: **false**) - if this option is `true` UCL treats the filename as GLOB pattern and load
all files that matches the specified pattern (normally the format of patterns is defined in `glob` manual page
for your operating system). This option is meaningless for URL includes.
* `url` (default: **true**) - allow URL includes.
* `path` (default: empty) - A UCL_ARRAY of directories to search for the include file.
Search ends after the first patch, unless `glob` is true, then all matches are included.
* `prefix` (default false) - Put included contents inside an object, instead
of loading them into the root. If no `key` is provided, one is automatically generated based on each files basename()
* `key` (default: <empty string>) - Key to load contents of include into. If
the key already exists, it must be the correct type
* `target` (default: object) - Specify if the `prefix` `key` should be an
object or an array.
* `priority` (default: 0) - specify priority for the include (see below).
* `duplicate` (default: 'append') - specify policy of duplicates resolving:
	- `append` - this is the default strategy. If a new object of higher priority is encountered, it will replace the old object. If a new object with lower priority is encountered, it will be completely ignored. If two duplicate objects with the same priority are encountered, a multi-value key (implicit array) will be created
	- `merge` - if an object or array is encountered, new keys are merged within it. If a plain object is encountered, an implicit array is created (regardless of priorities)
	- `error` - create error on duplicate keys and stop parsing
	- `rewrite` - always rewrite an old value with new one (ignoring priorities)

UCL uses priorities to manage the policy of object rewriting during the inclusion of other files as follows:

* If two objects have the same priority, an implicit array is formed
* If a new object has a higher priority, it overwrites the old object
* If a new object has a lower priority, it is ignored

By default, the priority of top-level object is set to zero (lowest priority). You can currently define up to 16 priorities (ranging from 0 to 15). If an include has a higher priority, it will overwrite keys from objects with lower priorities according to the specified policy.

### Variables support

UCL supports variables in input. Variables are registered by a user of the UCL parser and can be presented in the following forms:

* `${VARIABLE}`
* `$VARIABLE`

UCL currently does not support nested variables. To escape variables one could use double dollar signs:

* `$${VARIABLE}` is converted to `${VARIABLE}`
* `$$VARIABLE` is converted to `$VARIABLE`

If no valid variables are found in a string, no expansion will be performed and `$$` remains unchanged. This may be subject to change in future releases of libucl.

### Multiline strings

UCL can handle multiline strings as well as single line ones. It uses shell/perl like notation for such objects:

    key = <<EOD
    some text
    split to
    lines
    EOD

In this example `key` will be interpreted as the following string: `some text\nsplitted to\nlines`.
Here are some rules for this syntax:

* Multiline terminator must start just after `<<` symbols and it must consist of capital letters only (e.g. `<<eof` or `<< EOF` won't work);
* Terminator must end with a single newline character (and no spaces are allowed between terminator and newline character);
* To finish multiline string you need to include a terminator string just after newline and followed by a newline (no spaces or other characters are allowed as well);
* The initial and the final newlines are not inserted to the resulting string, but you can still specify newlines at the begin and at the end of a value, for example:


    key <<EOD

    some
    text

    EOD


## Emitter {#emitter}

Each UCL object can be serialized to one of the three supported formats:

* `JSON` - canonic json notation (with spaces indented structure);
* `Compacted JSON` - compact json notation (without spaces or newlines);
* `Configuration` - nginx like notation;
* `YAML` - yaml inlined notation.

## Validation {#validation}

UCL allows for the validation of objects using the [json schema v4](https://json-schema.org). UCL supports the full set of JSON Schema, with the exception of remote references. This feature may not be useful for configuration objects. A schema definition can also be written in UCL format, which simplifies schema writing. Additionally, since UCL supports multiple values for keys in an object, it is possible to specify generic integer constraints `maxValues` and `minValues` to define the limits on the number of values for a single key. UCL is not strictly enforcing validation of the schema itself, so it is important for users to provide valid schemas according to the JSON Schema v4 specification to ensure proper validation of input objects.

## Performance {#performance}

Is the UCL parser and emitter fast enough? Here are some performance measurements.
A 19Mb file consisting of approximately 700,000 lines of JSON (obtained from https://www.json-generator.com/) was used to compare the performance of the jansson library, which handles JSON parsing and emitting, with UCL. Here are the results::

    jansson: parsed json in 1.3899 seconds
    jansson: emitted object in 0.2609 seconds

    ucl: parsed input in 0.6649 seconds
    ucl: emitted config in 0.2423 seconds
    ucl: emitted json in 0.2329 seconds
    ucl: emitted compact json in 0.1811 seconds
    ucl: emitted yaml in 0.2489 seconds

So far, UCL seems to be significantly faster than jansson on parsing and slightly faster on emitting. Additionally,
UCL compiled with optimizations (-O3) performs faster:


    ucl: parsed input in 0.3002 seconds
    ucl: emitted config in 0.1174 seconds
    ucl: emitted json in 0.1174 seconds
    ucl: emitted compact json in 0.0991 seconds
    ucl: emitted yaml in 0.1354 seconds


You can do your own benchmarks by running `make check` in libucl top directory.

## Conclusion {#conclusion}

UCL has a clear design that should make it easy to read and write. At the same time, it is compatible with the JSON language and can be used as a simple JSON parser. The macro logic allows for the extension of the configuration language (e.g. by including Lua code) and comments allow for quick enabling or disabling of parts of a configuration.
