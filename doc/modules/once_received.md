---
layout: doc
title: Once received module
---
# Once received module

This module is intended to do simple checks for mail with one `Received` header. The underlying concept is that genuine emails tend to have multiple received headers, whereas spam originating from compromised user devices often exhibit certain negative characteristics, such as the use of `dynamic` or `broadband` IP addresses.

## Configuration

Configuring this module is quite straightforward: you simply need to define a `symbol` for generic emails with only one received header, specify a `symbol_strict` for emails that exhibit negative patterns or have unresolved hostnames, and include **good** and **bad** patterns, which can utilise [lua patterns](http://lua-users.org/wiki/PatternsTutorial). Use `good_host` lines to exclude certain hosts from this module, and `bad_host` lines to identify specific negative patterns. Additionally, you can create a `whitelist` to define a list of networks for which the `once_received` checks should be excluded.

## Example

~~~hcl
once_received {
    good_host = "^mail";
    bad_host = "static";
    bad_host = "dynamic";
    symbol_strict = "ONCE_RECEIVED_STRICT";
    symbol = "ONCE_RECEIVED";
    whitelist = "/tmp/ip.map";
}
~~~

As is typical, the IP map can include both IPv4 and IPv6 addresses, as well as networks in CIDR notation. You may also add optional comments to the map, indicated by a `#` symbol.
