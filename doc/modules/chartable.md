---
layout: doc
title: Chartable module
---
# Chartable module

This module allows to find number of characters from the different [Unicode scripts](http://www.unicode.org/reports/tr24/) in messages textual parts. If a message cannot be converted to UTF-8 (for example, when it contains unrecognized charset definition) then this module just checks number of transitions between ASCII and non ASCII characters.

Then `chartable` module evaluates number of script changes in words, e.g. 'a網絡a' is treated as 2 script changes - from Latin to Chinese and from Chinese back to Latin. Afterwards, this value is normalized: for example, short sequences of different charsets are penalized more than longer ones, and digits are treated specially when they are at the beginning or at the end of a word. It is important to note that this module examines words, so if you have one word completely in Latin and another completely in Cyrillic, then there will be no penalty added by `chartable` module.

After normalization procedure, Rspamd compares the `badness` value with the threshold, which is `0.3` by default. This value means that about 30% of words have different charsets within a single word.

~~~ucl
chartable {
  symbol = "R_MIXED_CHARSET";
  threshold = 0.3;
}
~~~

If you see too many false-positives for the R_MIXED_CHARSET symbol (eg. for multilingual or Slavic emails) you can disable it in `/etc/rspamd/local.d/chartable.conf`:

~~~ucl
enabled = false;
~~~
