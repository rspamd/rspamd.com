---
layout: doc
title: Workers documentation
---
# Rspamd workers

Rspamd defines several types of worker processes, each designed for specific purposes. 
For instance, some are meant for scanning mail messages, while others handle control actions 
like learning or statistic grabbing. Additionally, there's a versatile worker type 
called the 'lua' worker, which permits the execution of any Lua script as an Rspamd worker. 
This worker type acts as a proxy for Rspamd's Lua API.

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
Both of these workers utilize the `HTTP` protocol for all operations and depend on HTTP headers
to retrieve additional information from a client. Depending on your network configuration, it might be
beneficial to bind all workers to the loopback interface to prevent any external interactions.
It's important to note that Rspamd workers are **not** meant to operate in an unprotected environment, such as
the Internet. Currently, there are no provisions for secrecy or integrity control in these protocols, and
using plain HTTP might potentially leak sensitive information.

[Fuzzy worker](fuzzy_storage.html) is different: it is intended to serve external requests, however, it
listens on an UDP port and does not save any state information.

## Common workers options

All workers share a set of common options. Here's a typical example of a normal worker configuration that utilizes only the common worker options:

~~~hcl
worker "normal" {
    bind_socket = "*:11333";
}
~~~

Here are options available to all workers:

- `bind_socket` - a string that defines the bind address of a worker. If the port number is omitted, port 11333 is assumed.
- `count` - the number of worker instances to run (some workers ignore this option, e.g., `hs_helper`)
- `enabled` (1.6.2+) - a Boolean (`true` or `false`), enabling or disabling a worker (`true` by default)

`bind_socket` is the most commonly used option. It defines the address where the worker should accept
connections. Rspamd allows both names and IP addresses for this option:

~~~hcl
bind_socket = "localhost:11333";
bind_socket = "127.0.0.1:11333";
bind_socket = "[::1]:11333"; # note that you need to enclose ipv6 in '[]'
~~~

Also universal listening addresses are defined:

~~~hcl
bind_socket = "*:11333"; # any ipv4 and ipv6 address
bind_socket = "*v4:11333"; # any ipv4 address
bind_socket = "*v6:11333"; # any ipv6 address
~~~

It is possible to use systemd sockets as configured via a [socket unit file](https://www.freedesktop.org/software/systemd/man/systemd.socket.html). 
However, this is not recommended, especially if one is using official packages or requires the use of multiple sockets:

~~~hcl
# Use the first socket passed through a systemd .socket file.
bind_socket = "systemd:0";
# Starting with Rspamd 2.4, one can use named socket files too. If the systemd
# FileDescriptorName= option is not specified, the socket unit name can be used.
bind_socket = "systemd:rspamd.socket";
~~~

For UNIX sockets, it is also possible to specify owner and mode using this syntax:

~~~hcl
bind_socket = "/tmp/rspamd.sock mode=0666 owner=user";
~~~

Without specifying an owner and mode, Rspamd uses the active user as the owner 
(for instance, if started by root, then `root` is used) and `0644` as the access mask. 
Please note that you need to specify the **octal** number for the mode, specifically prefixed by a zero. 
Otherwise, modes like `666` will produce unexpected results.

You can specify multiple `bind_socket` options to listen on as many addresses as you want.
