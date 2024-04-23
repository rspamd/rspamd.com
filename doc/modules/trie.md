---
layout: doc
title: Trie module
directory-tree:
  de-emphasize: true
---

# Trie plugin

### Deprecation warning
This plugin is obsolete as all its functionality is now provided by the [multimap module](multimap.html). The multimap module supports regular expressions and pattern-based rules that fully encompass the features listed below. Additionally, using the regular expressions module for the same purposes is safe, as these expressions are typically accelerated by a multi-pattern lookup engine. However, this module can still be valuable for certain platforms, such as arm/mips or non-x86 systems. Therefore, there are no plans to remove it from Rspamd.

## Module description
The Trie plugin is specifically designed for efficiently searching multiple strings within raw messages or text parts. It achieves this with remarkable speed by utilizing the aho-corasick algorithm, which performs exceptionally well even with large texts and numerous input strings.

This module offers a user-friendly interface for working with the search trie structure.

## Configuration

Here is an example of trie configuration:

~~~hcl
trie {
	# Each subsection defines a single rule with associated symbol
	SYMBOL1 {
		# Define rules in the file (it is *NOT* a map)
		file = "/some/path";
		# Raw rules search within the whole undecoded messages
		raw = true;
		# If we have multiple occurrences of strings from this rule
		# then we insert a symbol multiple times
		multi = true;
	}
	SYMBOL2 {
		patterns = [
			"pattern1",
			"pattern2",
			"pattern3"
		]
	}
}
~~~

Despite the Aho-Corasick trie's impressive speed, it only supports plain strings and lacks the ability to differentiate word boundaries. For instance, the string `test` would be found in texts such as `test`, `tests` or even `123testing`. As a result, it is more suitable for searching for specific and relatively precise patterns, rather than for matching whole words.
