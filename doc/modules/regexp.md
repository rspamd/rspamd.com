---
layout: doc
title: Regexp module
---

# Rspamd regexp module
{:.no_toc}

This is a core module that deals with regular expressions, internal functions and Lua code to filter messages.

<div id="toc" markdown="1">
  <h2 class="toc-header">Contents</h2>
  * TOC
  {:toc}
</div>

## Principles of work

Regexp module operates with `expressions` - a logical sequence of different `atoms`. Atoms
are elements of the expression and could be represented as regular expressions, rspamd
functions and lua functions. Rspamd supports the following operators in expressions:

* `&&` - logical AND (can be also written as `and` or even `&`)
* `||` - logical OR (`or` `|`)
* `!` - logical NOT (`not`)
* `+` - logical PLUS, usually used with comparisons:
	- `>` more than
	- `<` less than
	- `>=` more or equal
	- `<=` less or equal

Whilst logical operators are clear for understanding, PLUS is not so clear. In rspamd,
it is used to join multiple atoms or subexpressions and compare them to a specific number:

	A + B + C + D > 2 - evaluates to `true` if at least 3 operands are true
	(A & B) + C + D + E >= 2 -  evaluates to `true` if at least 2 operands are true

Operators has their own priorities:
	
1. NOT
2. PLUS
3. COMPARE
4. AND
5. OR

You can change priorities by braces, of course. All operations are *right* associative in rspamd.
While evaluating expressions, rspamd tries to optimize their execution time by reordering and does not evaluate
unnecessary branches.

## Expressions components

Rspamd support the following components within expressions:

* Regular expressions
* Internal functions
* Lua global functions (not widely used)

## Regular expressions

In Rspamd, regular expressions can be used to examine different parts of the message:

* Headers (should be `Header-Name=/regexp/iumxs{header}`), mime part headers
* Full headers string
* Textual mime parts
* Raw messages
* URLs
* Strings returned by a selector (`re_selector_name=/regexp/iumxs{selector}`)

The match type is defined by a special flag (after the last `/` symbol).
It can be either a single letter or a long type in curly braces (from Rspamd 1.3):

| Type | Long type       | Tested content |
| ---- | --------------- | -------------- |
| `H`  | `{header}`      | Header value; if the header contains [encoded words](https://tools.ietf.org/html/rfc2047) they are decoded and converted to utf-8, all invalid utf-8 bytes are replaced by a `?` |
| `X`  | `{raw_header}`  | Raw header value (encoded words are not decoded, but [folding](https://tools.ietf.org/html/rfc5322#section-2.2.3) is removed) |
| `B`  | `{mime_header}` | Raw MIME header value (applied for headers in MIME parts only) |
| `R`  | `{all_headers}` | Full headers content (applied for all headers in their original form and for the message only - **not** including MIME headers) |
| `M`  | `{body}`        | Full message (with all *headers*) as it was send to Rspamd |
| `P`  | `{mime}`        | Text MIME part content; base64/quoted-printable is decoded, HTML tags are stripped; if charset is not utf-8 Rspamd tries to convert it to utf-8, but if conversion fails the original text is examined |
| `Q`  | `{raw_mime}`    | Text MIME part raw content (unmodified by Rspamd) |
| `C`  | `{sa_body}`     | SpamAssassin `body` analogue (see body pattern test description in [SpamAssassin documentation](https://spamassassin.apache.org/full/3.4.x/doc/Mail_SpamAssassin_Conf.html#RULE-DEFINITIONS-AND-PRIVILEGED-SETTINGS)); if charset is not utf-8 Rspamd tries to convert text to utf-8 |
| `D`  | `{sa_raw_body}` | SpamAssassin `rawbody` analogue (raw data inside text parts, base64/quoted-printable is decoded, but HTML tags and line breaks are preserved) |
| `U`  | `{url}`         | URLs (before 2.4 also email addresses extracted from the message body, in the same form as returned by [url:tostring()](../lua/rspamd_url.html#m6b648)) |
| `$`  | `{selector}`    | Strings returned by a [selector](../configuration/selectors.html#regular-expressions-selectors) (from 1.8) |
|      | `{email}`       | Emails extracted from the message body (from 2.4) |
|      | `{words}`       | Unicode normalized (to [NFKC](http://www.unicode.org/reports/tr15/#Norm_Forms)) and lowercased words extracted from the text (excluding URLs), subject and From displayed name |
|      | `{raw_words}`   | The same words, but without normalization (converted to utf8 however) |
|      | `{stem_words}`  | Unicode normalized, lowercased and [stemmed](https://en.wikipedia.org/wiki/Stemming) words extracted from the text (excluding URLs), subject and From displayed name |

Each regexp also supports the following modifiers:

* `i` - ignore case
* `u` - use utf8 regexp
* `m` - multiline regexp - treat string as multiple lines. That is, change "^" and "$" from matching the start of the string's first line and the end of its last line to matching the start and end of each line within the string
* `x` - extended regexp - this flag tells the regular expression parser to ignore most whitespace that is neither backslashed nor within a bracketed character class. You can use this to break up your regular expression into (slightly) more readable parts. Also, the # character is treated as a metacharacter introducing a comment that runs up to the pattern's closing delimiter, or to the end of the current line if the pattern extends onto the next line.
* `s` - dotall regexp - treat string as single line. That is, change `.` to match any character whatsoever, even a newline, which normally it would not match. Used together, as `/ms`, they let the `.` match any character whatsoever, while still allowing `^` and `$` to match, respectively, just after and just before newlines within the string.
* `O` - do not optimize regexp (rspamd optimizes regexps by default)
* `r` - use non-utf8 regular expressions (raw bytes). This is default `true` if `raw_mode` is set to `true` in the options section.

## Internal functions

Rspamd supports a set of internal functions to do some common spam filtering tasks:

* `check_smtp_data(type[, str or /re/])` - checks for the specific envelope argument: `from`, `rcpt`, `user`, `subject`
* `compare_encoding(str or /re/)` - compares message encoding with string or regexp
* `compare_parts_distance(inequality_percent)` - if a message is multipart/alternative, compare two parts and return `true` if they are inequal more than `inequality_percent`
* `compare_recipients_distance(inequality_percent)` - check how different are recipients of a message (works for > 5 recipients)
* `compare_transfer_encoding(str or /re/)` - compares message transfer encoding with string or regexp
* `content_type_compare_param(param, str or /re/)` - compare content-type parameter `param` with string or regexp
* `content_type_has_param(param)` - return true if `param` exists in content-type
* `content_type_is_subtype(str or /re/` - return `true` if subtype of content-type matches string or regexp
* `content_type_is_type(str or /re/)`- return `true` if type of content-type matches string or regexp
* `has_content_part(type)` - return `true` if the part with the specified `type` exists
* `has_content_part_len(type, len)` - return `true` if the part with the specified `type` exists and have at least `len` length
* `has_fake_html()` - check if there is an HTML part in message with no HTML tags
* `has_html_tag(tagname)` - return `true` if html part contains specified tag
* `has_only_html_part()` - return `true` if there is merely a single HTML part
* `header_exists(header)` - return `true` if a specified header exists in the message
* `is_empty_body()` - return `true` if the message has no payload body
* `is_html_balanced()` - check whether HTML part has balanced tags
* `is_recipients_sorted()` - return `true` if there are more than 5 recipients in a message and they are sorted
* `raw_header_exists()` - does the same as `header_exists`
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

Many of these functions are just legacy but they are supported in terms of compatibility.

## Lua atoms

Lua atoms now can be lua global functions names or callbacks. This is 
a compatibility feature for previously written rules.

## Regexp objects

From rspamd 1.0, it is possible to add more power to regexp rules by using of
table notation while writing rules. A table can have the following fields:

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

From version `1.8.4`, there is also support of using local Lua functions from regexp atoms using Regexp objects notation. These functions need to be defined in `functions` element that, in turn, should be a table of functions:

~~~lua
config.regexp.BLA = {
  re = [[/re1/ & /re2/ & (lua:myfunction1 | !lua:myfunction2)]],
  functions = {
    myfunction1 = function(task) ... end,
    myfunction2 = function(task) ... end,
  }
}
~~~

Please bear in mind that you **cannot** use asynchronous functions (including those with [coroutines](../lua/sync_async.html)) in these Lua snippets as Rspamd will not wait for them to be finished. The only way to use such functions in Regexp expressions is to create a dedicated rule that performs async stuff and then register dependency for regexp symbol: `rspamd_config:register_dependency('RE_SYMBOL', 'ASYNC_SYMBOL')` and then call `task:has_symbol('ASYNC_SYMBOL')` in Lua function defined in Regexp expression.

## Regexp prefilters

Rspamd supports lua filters for regular expressions from version 2.6. The idea is to allow fast pre-filter with regular expressions and slow Lua postprocessing for the cases where this processing is needed. Here is how it's used in bitcoin library:

~~~lua
config.regexp['RE_POSTPROCESS'] = {
  description = 'Example of postprocessing for regular expressions',
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

This allows to add accelerated rules that are enabled merely if some relatively rare regular expression matches. In this particular case this feature is used to do BTC wallet verification and validation.
