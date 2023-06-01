---
layout: doc
title: Workers documentation
---
# Rspamd workers

Rspamd defines several types of worker processes. Each type is designed for its specific
purpose, for example to scan mail messages, to perform control actions, such as learning or
statistic grabbing. There is also flexible worker type named `lua` worker that allows
to run any Lua script as Rspamd worker providing proxy from Rspamd Lua API.

## Worker types

Currently Rspamd defines the following worker types:

- [normal](normal.html): this worker is designed to scan mail messages
- [controller](controller.html): this worker performs configuration actions, such as
learning, adding fuzzy hashes and serving web interface requests
- [fuzzy_storage](fuzzy_storage.html): stores fuzzy hashes
- [rspamd_proxy](rspamd_proxy.html): handles requests forwarding and milter protocol
- [lua](lua_worker.html): runs custom Lua scripts

## Workers connections

All client applications should interact with two main workers: `normal` and `controller`.
Both of these workers use `HTTP` protocol for all operations and rely on HTTP headers
to get extra information from a client. Depending on network configuration, it might be
useful to bind all workers to the loopback interface preventing all interaction from the
outside. Rspamd workers are **not** supposed to run in an unprotected environment, such as
Internet. Currently there is neither secrecy nor integrity control in these protocols and
using of plain HTTP might leak sensitive information.

[Fuzzy worker](fuzzy_storage.html) is different: it is intended to serve external requests, however, it
listens on an UDP port and does not save any state information.

## Common workers options

All workers share a set of common options. Here is a typical example of a normal
worker configuration that uses merely common worker options:

~~~ucl
worker "normal" {
    bind_socket = "*:11333";
}
~~~

Here are options available to all workers:

- `bind_socket` - a string that defines bind address of a worker. If the port number is omitted, port 11333 is assumed.
- `count` - number of worker instances to run (some workers ignore that option, e.g. `hs_helper`)
- `enabled` (1.6.2+) - a Boolean (`true` or `false`), enable or disable a worker (`true` by default)

`bind_socket` is the mostly common used option. It defines the address where worker should accept
connections. Rspamd allows both names and IP addresses for this option:

~~~ucl
bind_socket = "localhost:11333";
bind_socket = "127.0.0.1:11333";
bind_socket = "[::1]:11333"; # note that you need to enclose ipv6 in '[]'
~~~

Also universal listening addresses are defined:

~~~ucl
bind_socket = "*:11333"; # any ipv4 and ipv6 address
bind_socket = "*v4:11333"; # any ipv4 address
bind_socket = "*v6:11333"; # any ipv6 address
~~~

It is possible to use systemd sockets as configured via a [socket unit file](https://www.freedesktop.org/software/systemd/man/systemd.socket.html) (but not recommended- particularly if one uses official packages or requires use of multiple sockets):

~~~ucl
# Use the first socket passed through a systemd .socket file.
bind_socket = "systemd:0";
# Starting with Rspamd 2.4, one can use named socket files too. If the systemd
# FileDescriptorName= option is not specified, the socket unit name can be used.
bind_socket = "systemd:rspamd.socket";
~~~

For UNIX sockets, it is also possible to specify owner and mode using this syntax:

~~~ucl
bind_socket = "/tmp/rspamd.sock mode=0666 owner=user";
~~~

Without owner and mode, rspamd uses the active user as owner (e.g. if started by root,
then `root` is used) and `0644` as access mask. Please note that you need to specify
**octal** number for mode, namely prefixed by a zero. Otherwise, modes like `666` will produce
a weird result.

You can specify multiple `bind_socket` options to listen on as many addresses as
you want.
