---
layout: doc
title: Regexp module
directory-tree:
  emphasize: true
---

# Rspamd regexp module
{:.no_toc}

This is a core module that deals with regular expressions, internal functions and Lua code to filter messages.

{% include toc.html %}

## Principles of work

The Regexp module operates using `expressions` which consist of a logical sequence of `atoms`. `Atoms` can be regular expressions, Rspamd functions, or Lua functions. Rspamd supports a range of operators within expressions, including:

* `&&` - logical AND (can be also written as `and` or even `&`)
* `||` - logical OR (`or` `|`)
* `!` - logical NOT (`not`)
* `+` - logical PLUS, usually used with comparisons:
  - `>` more than
  - `<` less than
  - `>=` more or equal
  - `<=` less or equal

The PLUS operator in Rspamd connects multiple `atoms` or sub-expressions and compares them to a specific number:

  `A + B + C + D > 2` - evaluates to `true` if at least 3 operands are true
  `(A & B) + C + D + E >= 2` -  evaluates to `true` if at least 2 operands are true

Operator priority:
  
1. NOT
2. PLUS
3. COMPARE
4. AND
5. OR

Use parentheses to change priority. In Rspamd, all operations are *right* associative. During expression evaluation, Rspamd optimizes execution time by reordering and avoids evaluating unnecessary branches.

## Expressions components

Rspamd support the following components within expressions:

* Regular expressions
* Internal functions
* Lua global functions (not widely used)

## Regular expressions

In Rspamd, regular expressions can be used to examine different parts of the message:

* Headers (should be `Header-Name=/regexp/iumxs{header}`), MIME part headers
* Full headers string
* Textual MIME parts
* Raw messages
* URLs
* Strings returned by a selector (`re_selector_name=/regexp/iumxs{selector}`)

The match type is defined by a flag that appears after the last `/` symbol. This can be a single letter or a long type enclosed in curly braces, which has been available since Rspamd 1.3:

| Type | Long type       | Tested content |
| ---- | --------------- | -------------- |
| `H`  | `{header}`      | Header value; if the header contains [encoded words](https://tools.ietf.org/html/rfc2047) they are decoded and converted to UTF-8. All invalid UTF-8 bytes are replaced by a `?` |
| `X`  | `{raw_header}`  | Raw header value (encoded words are not decoded, but [folding](https://tools.ietf.org/html/rfc5322#section-2.2.3) is removed) |
| `B`  | `{mime_header}` | MIME header value extracted for headers in MIME parts that are not `message/rfc822` and that are enclosed in multipart containers only |
| `R`  | `{all_headers}` | Full headers content (applied for all headers in their original form and for the message only - **not** including MIME headers) |
| `M`  | `{body}`        | Full message (with all *headers*) as it was sent to Rspamd |
| `P`  | `{mime}`        | Text MIME part content; base64/quoted-printable is decoded, HTML tags are stripped; if charset is not UTF-8 Rspamd tries to convert it to UTF-8, but if conversion fails the original text is examined |
| `Q`  | `{raw_mime}`    | Text MIME part raw content (unmodified by Rspamd) |
| `C`  | `{sa_body}`     | SpamAssassin `body` analogue (see body pattern test description in [SpamAssassin documentation](https://spamassassin.apache.org/full/3.4.x/doc/Mail_SpamAssassin_Conf.html#RULE-DEFINITIONS-AND-PRIVILEGED-SETTINGS)); if charset is not UTF-8, Rspamd tries to convert text to UTF-8 |
| `D`  | `{sa_raw_body}` | SpamAssassin `rawbody` analogue (raw data inside text parts, base64/quoted-printable is decoded, but HTML tags and line breaks are preserved) |
| `U`  | `{url}`         | URLs (before 2.4 also email addresses extracted from the message body, in the same form as returned by [url:tostring()](../lua/rspamd_url.html#m6b648)) |
| `$`  | `{selector}`    | Strings returned by a [selector](../configuration/selectors.html#regular-expressions-selectors) (from 1.8) |
|      | `{email}`       | Emails extracted from the message body (from 2.4) |
|      | `{words}`       | Unicode normalized (to [NFKC](https://www.unicode.org/reports/tr15/#Norm_Forms)) and lower-cased words extracted from the text (excluding URLs), subject and From displayed name |
|      | `{raw_words}`   | The same words, but without normalization (converted to utf8 however) |
|      | `{stem_words}`  | Unicode normalized, lower-cased and [stemmed](https://en.wikipedia.org/wiki/Stemming) words extracted from the text (excluding URLs), Subject and From display name |

Each regexp also supports the following modifiers:

* `i` - ignore case
* `u` - use UTF-8 regexp
* `m` - multi-line regular expression - this flag causes the string to be treated as multiple lines. This means that the `^` and `$` symbols match the start and end of each line within the string, rather than just the start and end of the first and last lines.
* `x` - extended regular expression - this flag instructs the regular expression parser to ignore most white-space that is not escaped (`\`) or within a bracketed character class. This makes it possible to break up the regular expression into more readable parts. Additionally, the `#` character is treated as a meta-character that introduces a comment which runs up to the pattern's closing delimiter or to the end of the current line if the pattern extends onto the next line.
* `s` - dot-all regular expression - this flag causes the string to be treated as a single line. This means that the `.` symbol matches any character whatsoever, including a newline, which it would not normally match. When used together as `/ms`, they allow the `.` to match any character while still allowing `^` and `$` to respectively match just after and just before newlines within the string
* `O` - do not optimize regexp (rspamd optimizes regexps by default)
* `r` - use non-UTF-8 regular expressions (raw bytes). Defaults to `true` if `raw_mode` is set to `true` in the options section.
* `A` - return and process all matches (useful for Lua prefilters)
* `L` - match left part of regexp (useful for Lua prefilters in conjunction with Hyperscan)

## Internal functions

Rspamd supports a set of internal functions to do some common spam filtering tasks:

* `check_smtp_data(type[, str or /re/])` - checks for the specific envelope argument: `from`, `rcpt`, `user`, `subject`
* `compare_encoding(str or /re/)` - compares message encoding with string or regexp
* `compare_parts_distance(inequality_percent)` - if a message is multipart/alternative, compare two parts and return `true` if they are unequal more than `inequality_percent`
* `compare_recipients_distance(inequality_percent)` - check how different are recipients of a message (works for > 5 recipients)
* `compare_transfer_encoding(str or /re/)` - compares message transfer encoding with string or regexp
* `content_type_compare_param(param, str or /re/)` - compare content-type parameter `param` with string or regexp
* `content_type_has_param(param)` - return true if `param` exists in content-type
* `content_type_is_subtype(str or /re/` - return `true` if sub-type of content-type matches string or regexp
* `content_type_is_type(str or /re/)`- return `true` if type of content-type matches string or regexp
* `has_content_part(type)` - return `true` if the part with the specified `type` exists
* `has_content_part_len(type, len)` - return `true` if the part with the specified `type` exists and have at least `len` length
* `has_fake_html()` - check if there is an HTML part in message with no HTML tags
* `has_flag(flag)` - returns `true` is this task has a specific flag:
  - `pass_all`
  - `no_log`
  - `no_stat`
  - `skip`
  - `extended_urls`
  - `learn_spam`
  - `learn_ham`
  - `greylisted`
  - `broken_headers`
  - `skip_process`
  - `milter`
  - `bad_unicode`
* `has_html_tag(tagname)` - return `true` if HTML part contains specified tag
* `has_only_html_part()` - return `true` if there is merely a single HTML part
* `has_symbol(symbolname)` - return `true` if symbol name is present in result
* `header_exists(header)` - return `true` if a specified header exists in the message
* `is_empty_body()` - return `true` if the message has no payload body
* `is_html_balanced()` - check whether HTML part has balanced tags
* `is_recipients_sorted()` - return `true` if there are more than 5 recipients in a message and they are sorted
* `raw_header_exists()` - does the same as `header_exists`

Many of these functions are just legacy but they are supported in terms of compatibility.

## Lua atoms

Lua atoms can now be either the names of Lua global functions or callbacks. This is a compatibility feature for rules that were written previously.

## Regexp objects

Starting from Rspamd 1.0, the power of regular expression rules can be enhanced by using table notation. When writing rules, a table can contain the following fields:

- `callback`: lua callback for the rule
- `re`: regular expression (mutually exclusive with `callback` option)
- `condition`: function of task that determines when a rule should be executed
- `score`: default score
- `description`: default description
- `one_shot`: default one shot settings

Here is an example of table form definition of regexp rule:

~~~lua
config['regexp']['RE_TEST'] = {
    re = '/test/i{mime}',
    score = 10.0,
    condition = function(task)
        if task:get_header('Subject') then
            return true
        end
        return false
    end,
}
~~~

## Lua functions

Starting from version `1.8.4`, Rspamd also supports the use of local Lua functions in regular expression atoms using Regexp object notation. These functions must be defined in the `functions` element, which should be a table of functions:

~~~lua
config.regexp.BLA = {
  re = [[/re1/ & /re2/ & (lua:myfunction1 | !lua:myfunction2)]],
  functions = {
    myfunction1 = function(task) ... end,
    myfunction2 = function(task) ... end,
  }
}
~~~

Please note that you **cannot** use asynchronous functions, including those with  [coroutines]({{ site.baseurl }}/doc/developers/sync_async.html), in these Lua snippets, as Rspamd will not wait for them to finish. The only way to use such functions in Regexp expressions is to create a dedicated rule that performs asynchronous tasks, register the dependency for the regexp symbol using `rspamd_config:register_dependency('RE_SYMBOL', 'ASYNC_SYMBOL')`, and then call `task:has_symbol('ASYNC_SYMBOL')` in the Lua function defined in the Regexp expression.

## Regexp prefilters

Rspamd has supported Lua filters for regular expressions since version 2.6. The concept is to enable quick prefiltering using regular expressions and slower Lua post-processing when necessary. Here is an example of how it's used in the Bitcoin library:

~~~lua
config.regexp['RE_POSTPROCESS'] = {
  description = 'Example of post-processing for regular expressions',
  re = string.format('(%s) || (%s)', re1, re2),
  re_conditions = {
    [re1] = function(task, txt, s, e)
      if e - s <= 2 then
        return false
      end

      if check_re1(task, txt:sub(s + 1, e)) then
        return true
      end
    end,
    [re2] = function(task, txt, s, e)
      if e - s <= 2 then
        return false
      end

      if check_re2(task, txt:sub(s + 1, e)) then
        return true
      end
    end,
  },
}
~~~

This feature enables the addition of accelerated rules that are only enabled when relatively rare regular expressions match. In this particular case, the feature is used for Bitcoin wallet verification and validation.
