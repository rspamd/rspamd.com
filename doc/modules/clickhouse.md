---
layout: doc
title: Clickhouse module
---

# Clickhouse module
{:.no_toc}

Clickhouse module pushes a variety of message-related metadata to an instance of [Clickhouse](https://clickhouse.yandex/), an open-source column-oriented DBMS useful for realtime analytics. Information that could be collected includes: senders/recipients/scores of scanned messages and metadata such as DKIM/DMARC/bayes/fuzzy status & information about URLs and attachments.

You can also use [Redash](https://redash.io) to build your own analytical board using this module (similar to Elastic + Kibana).

<div id="toc" markdown="1">
  <h2 class="toc-header">Contents</h2>
  * TOC
  {:toc}
</div>

## Module Configuration

Example configuration shown below, for the minimum working configuration you need to define Clickhouse servers:

~~~ucl
# local.d/clickhouse.conf

# Push update when 1000 records are collected (1000 if unset)
limit = 1000;
# IP:port of Clickhouse server ("localhost:8123" if unset)
server = "localhost:8123";
# Timeout to wait for response (5 seconds if unset)
timeout = 5;
# How many bits of sending IP to mask in logs for IPv4 (19 if unset)
ipmask = 19;
# How many bits of sending IP to mask in logs for IPv6 (48 if unset)
ipmask6 = 48;
# Record URL paths? (default false)
full_urls = false;
# This parameter points to a map of domain names
# If a message has a domain in this map in From: header and DKIM signature,
# record general metadata in a table named after the domain
#from_tables = "/etc/rspamd/clickhouse_from.map";
# These are symbols of other checks in Rspamd
# Set these if you use non-default symbol names (unlikely)
#bayes_spam_symbols = ["BAYES_SPAM"];
#bayes_ham_symbols = ["BAYES_HAM"];
#fann_symbols = ["FANN_SCORE"];
#fuzzy_symbols = ["FUZZY_DENIED"];
#whitelist_symbols = ["WHITELIST_DKIM", "WHITELIST_SPF_DKIM", "WHITELIST_DMARC"];
#dkim_allow_symbols = ["R_DKIM_ALLOW"];
#dkim_reject_symbols = ["R_DKIM_REJECT"];
#dmarc_allow_symbols = ["DMARC_POLICY_ALLOW"];
#dmarc_reject_symbols = ["DMARC_POLICY_REJECT", "DMARC_POLICY_QUARANTINE"];
# Subject related (from 1.9)
insert_subject = false; 
# Privacy is off
subject_privacy = false; 
# Default hash-algorithm to obfuscate subject
subject_privacy_alg = 'blake2';
# Prefix to show it's obfuscated
subject_privacy_prefix = 'obf';
# Cut the length of the hash
subject_privacy_length = 16;

# Other options
#database = 'default';
#use_https = false;
# Transport compression
#use_gzip = true;
# Store data for local scanes
#allow_local = false;
# Basic auth
#user = null;
#password = null;
# Disable SSL verification
#no_ssl_verify = false,

# This section configures how long the data will be stored in ClickHouse
#retention {
#  # disabled by default
#  enable = true;
#  # drop | detach, please refer to ClickHouse docs for details
#  # http://clickhouse-docs.readthedocs.io/en/latest/query_language/queries.html#manipulations-with-partitions-and-parts
#  method = "drop";
#  # how many month the data should be kept in ClickHouse
#  period_months = 3;
#  # how often run the cleanup process
#  run_every = 7d;
#}
# This section defines how often Rspamd will send data to Clickhouse (from 2.1)
#limits {
#  max_rows = 1000; # How many rows are allowed (0 for disable this)
#  max_memory = 50mb; # How many memory should be occupied before sending collection
#  max_interval = 60s; # Maximum collection interval
#}
~~~

### Clickhouse retention

Privacy is important for many email systems. Clickhouse dumps might store client sensitive data. Rspamd supports automatic cleanup of the outdated data using **retention policies**. By default, data is not expired in Clickhouse. However, you can set expiration as following (e.g. to comply with GDPR):

~~~ucl
# local.d/clickhouse.conf
retention {
  enable = true;
  # drop | detach, please refer to ClickHouse docs for details
  # http://clickhouse-docs.readthedocs.io/en/latest/query_language/queries.html#manipulations-with-partitions-and-parts
  method = "drop";
  # how many month the data should be kept in ClickHouse
  period_months = 3;
  # how often run the cleanup process
  run_every = 7d;
}
~~~

To remove data for particular users, you might consider using of the [Clickhouse mutations](https://clickhouse.yandex/docs/en/query_language/alter/#alter-mutations)

### Subject privacy

Similarly to previous, from the version 1.9, you can store email subject in Clickhouse (disabled by default). Here are settings available:

~~~ucl
insert_subject = false; 
# Privacy is off
subject_privacy = false; 
# Default hash-algorithm to obfuscate subject
subject_privacy_alg = 'blake2';
# Prefix to show it's obfuscated
subject_privacy_prefix = 'obf';
# Cut the length of the hash
subject_privacy_length = 16;
~~~

You can use obfuscated subjects to group messages with a same subject for example.

## Clickhouse usage examples

Clickhouse module is extremely useful to perform statistical researches for mail flows. For example, to find top sending domains for spam and ham:

~~~
SELECT
    From,
    count() AS c
FROM rspamd
WHERE (Date = today()) AND ((Action = 'reject') OR (Action = 'add header'))
GROUP BY From
ORDER BY c DESC
LIMIT 10

┌─From────────────┬──────c─┐
│ xxx.com         │ 152931 │
│ xxx.com         │ 102123 │
│ gmail.com       │  60865 │
│ yahoo.com       │  58832 │
│ xxx.com         │  58082 │
...
└─────────────────┴────────┘
~~~

Or messages with failed DKIM and DMARC groupped by domain:

~~~
SELECT
    From,
    IP,
    count() AS c
FROM rspamd
WHERE (Date = today()) AND (IsDkim = 'reject')
GROUP BY
    From,
    IP
ORDER BY c DESC
LIMIT 10

┌─From─────────────────┬─IP─────────────┬─────c─┐
│ xxx.xxx              │ xx.xx.xx.xx    │ 27542 │
│ xxx.xxx              │ xx.yy.yy.yy    │ 24958 │
...
└──────────────────────┴────────────────┴───────┘
~~~

Or perform some attachments analysis (e.g. top attachments types for Spam):

~~~
SELECT
    count() AS c,
    d
FROM rspamd
ARRAY JOIN Attachments.ContentType AS d
WHERE (Date = today()) AND ((Action = 'reject') OR (Action = 'add header'))
GROUP BY d
ORDER BY c DESC
LIMIT 5

┌──────c─┬─d────────────────────────┐
│ ddd    │ image/jpeg               │
│ ddd    │ image/png                │
│ ddd    │ application/octet-stream │
│ ddd    │ image/gif                │
│ ddd    │ application/msword       │
└────────┴──────────────────────────┘
~~~

Rspamd can also send copies of data for specific domains to a separate tables to simplify analytics.

For mailing lists, Rspamd sends list ids which allows to provide very precise statistics for each particular mailing list:

~~~
SELECT
    ListId,
    IP,
    count() AS c
FROM rspamd
WHERE (Date = today()) AND (ListId != '')
GROUP BY
    ListId,
    IP
ORDER BY c DESC
LIMIT 10

┌─ListId───────────────────────────────┬─IP──────────────┬──────c─┐
│ xxx                                  │ xx.xx.xx.xx     │ dddd   │
...
└──────────────────────────────────────┴─────────────────┴────────┘
~~~

