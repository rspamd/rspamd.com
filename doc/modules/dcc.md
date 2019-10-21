---
layout: doc
title: DCC module
---
# DCC module

This modules performs [DCC](http://www.dcc-servers.net/dcc/) lookups to determine
the *bulkiness* of a message (e.g. how many recipients have seen it).

Identifying bulk messages is very useful in composite rules e.g. if a message is
from a freemail domain *AND* the message is reported as bulk by DCC then you can
be sure the message is spam and can assign a greater weight to it.

Please view the License terms on the DCC website before you enable this module.

## Module configuration

This module requires that you have the `dccifd` daemon configured, running and
working correctly.  To do this you must download and build the [latest DCC client]
(https://www.dcc-servers.net/dcc/source/dcc.tar.Z).  Once installed, edit
`/var/dcc/dcc_conf` set `DCCIFD_ENABLE=on` and set `DCCM_LOG_AT=NEVER` and
`DCCM_REJECT_AT=MANY`, then start the daemon by running `/var/dcc/libexec/rcDCC start`.

Once the `dccifd` daemon is started it will listen on the UNIX domain socket /var/dcc/dccifd
and all you have to do is tell the rspamd where `dccifd` is listening:

~~~ucl
# local.d/dcc.conf

enabled = true; # Required as default is to disable DCC plugin

# Define local socket or TCP servers in upstreams syntax
# When sockets and servers are definined - servers is used!

servers = "/var/dcc/dccifd"; # Unix socket
#servers = "127.0.0.1:10045" # OR TCP upstreams
body_max = 999999; # Bulkness threshold for body
fuz1_max = 999999; # Bulkness threshold for fuz1
fuz2_max = 999999; # Bulkness threshold for fuz2
symbol_fail = 'DCC_FAIL';
symbol = 'DCC_REJECT';
symbol_bulk = 'DCC_BULK';
timeout = 5.0; # Timeout to wait for checks
log_clean = false;
retransmits = 2;
~~~

Alternatively you can configure DCC to listen to a TCP Socket on localhost or any remote server.
For the detailed configuration have a look to the DCC manual. Here is the config line for having DCCIFD
listening on localhost port 10045 and allowing 127.0.0.1/8 to query:
`DCCIFD_ARGS="-SHELO -Smail_host -SSender -SList-ID -p *,10045,127.0.0.0/8"`
