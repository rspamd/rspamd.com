---
layout: doc
title: DCC module
---
# DCC module

This modules performs [DCC](http://www.dcc-servers.net/dcc/) lookups to determine
the *bulkiness* of a message (e.g. how many recipients have seen it).

This information, which indicates how many recipients have seen the message, is useful for identifying bulk messages in composite rules. 
For example, if a message is from a freemail domain and is reported as bulk by DCC, it is likely to be spam and can be assigned a higher weight.

Before enabling this module, please make sure to review the License terms on the DCC website.

## Module configuration

To use the `dccifd` module, you must have the `dccifd` daemon properly configured, installed, and running. To do this, follow these steps:

1. Download and build the latest DCC client from the [latest DCC client](https://www.dcc-servers.net/dcc/source/dcc.tar.Z).  
2. Edit the `/var/dcc/dcc_conf` file, setting `DCCIFD_ENABLE=on`, `DCCM_LOG_AT=NEVER` and
`DCCM_REJECT_AT=MANY`.
3. Start the daemon by running `/var/dcc/libexec/rcDCC start`.

Once the `dccifd`, it will listen on the UNIX domain socket /var/dcc/dccifd.
To complete the setup, simply inform rspamd of the location where the `dccifd` is listening:

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

If you prefer, you can configure DCC to listen to a TCP socket on localhost or any remote server. For detailed configuration instructions, refer to the DCC manual. The following configuration line sets up DCCIFD to listen on localhost port 10045 and allows queries from the IP range `127.0.0.1/8`:
`DCCIFD_ARGS="-SHELO -Smail_host -SSender -SList-ID -p *,10045,127.0.0.0/8"`
