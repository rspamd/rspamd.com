---
layout: doc
title: Clickhouse module
---

# Clickhouse module
{:.no_toc}

The Clickhouse module pushes a range of message-related metadata to an instance of [Clickhouse](https://clickhouse.yandex/), an open-source column-oriented database management system for real-time analytics. Information that could be collected includes: senders/recipients/scores of scanned messages and metadata such as DKIM/DMARC/bayes/fuzzy status & information about URLs and attachments.

Additionally, this module enables you to construct your custom analytical dashboard using [Redash](https://redash.io), similar to using Elastic and Kibana.

<div id="toc" markdown="1">
  <h2 class="toc-header">Contents</h2>
  * TOC
  {:toc}
</div>

## Module Configuration

Example configuration shown below, for the minimum working configuration you need to define Clickhouse servers:

~~~ucl
# local.d/clickhouse.conf

# Push update when 1000 records are collected (1000 if unset) (until 2.1, see limits section below for >2.1)
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
# store digest/hash of email (default false)
enable_digest = false;
# store Symbols.Names, Symbols.Scores, Symbols.Options, Groups.Names and Groups.Scores (default false)
enable_symbols = false;
# These are symbols of other checks in Rspamd
# Set these if you use non-default symbol names (unlikely)
#bayes_spam_symbols = ["BAYES_SPAM"];
#bayes_ham_symbols = ["BAYES_HAM"];
#ann_symbols_spam = {'NEURAL_SPAM'},
#ann_symbols_ham = {'NEURAL_HAM'},
#fuzzy_symbols = ["FUZZY_DENIED"];
#whitelist_symbols = ["WHITELIST_DKIM", "WHITELIST_SPF_DKIM", "WHITELIST_DMARC"];
#dkim_allow_symbols = ["R_DKIM_ALLOW"];
#dkim_reject_symbols = ["R_DKIM_REJECT"];
#dkim_dnsfail_symbols = {'R_DKIM_TEMPFAIL', 'R_DKIM_PERMFAIL'},
#dkim_na_symbols = {'R_DKIM_NA'},
#dmarc_allow_symbols = {'DMARC_POLICY_ALLOW'},
#dmarc_reject_symbols = {'DMARC_POLICY_REJECT'},
#dmarc_quarantine_symbols = {'DMARC_POLICY_QUARANTINE'},
#dmarc_softfail_symbols = {'DMARC_POLICY_SOFTFAIL'},
#dmarc_na_symbols = {'DMARC_NA'},
#spf_allow_symbols = {'R_SPF_ALLOW'},
#spf_reject_symbols = {'R_SPF_FAIL'},
#spf_dnsfail_symbols = {'R_SPF_DNSFAIL', 'R_SPF_PERMFAIL'},
#spf_neutral_symbols = {'R_DKIM_TEMPFAIL', 'R_DKIM_PERMFAIL'},
#spf_na_symbols = {'R_SPF_NA'},
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
#  # https://clickhouse.com/docs/en/sql-reference/statements/alter/partition
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

#### Main options

1. `limit = 1000;`: Set the push update limit to 1000 records (default is 1000).
2. `server = "localhost:8123";`: Set the ClickHouse server's IP and port (default is "localhost:8123").
3. `timeout = 5;`: Set the timeout for waiting for a response (default is 5 seconds).
4. `ipmask = 19;`: Set the number of bits to mask in logs for IPv4 sender IPs (default is 19).
5. `ipmask6 = 48;`: Set the number of bits to mask in logs for IPv6 sender IPs (default is 48).
6. `full_urls = false;`: Disable recording URL paths (default is false).
7. `from_tables`: (Commented) Points to a map of domain names to record general metadata in a table named after the domain.
8. `enable_digest = false;`: Disable storing the email's digest/hash (default is false).
9. `enable_symbols = false;`: Disable storing Symbols.Names, Symbols.Scores, Symbols.Options, Groups.Names, and Groups.Scores (default is false).

#### Other options:
1. `database`: Set the ClickHouse database name to be used for storing data (default is 'default').
2. `use_https`: Set this option to 'true' to enable HTTPS communication with the ClickHouse server (default is 'false').
3. `use_gzip`: Set this option to 'true' to enable transport compression when sending data to the ClickHouse server (default is 'false').
4. `allow_local`: Set this option to 'true' to store data for local scans (default is 'false').
5. `user`: Set the username for basic authentication when connecting to the ClickHouse server (default is 'null', which means no authentication).
6. `password`: Set the password for basic authentication when connecting to the ClickHouse server (default is 'null', which means no authentication).
7. `no_ssl_verify`: Set this option to 'true' to disable SSL certificate verification when connecting to the ClickHouse server over HTTPS (default is 'false', which means SSL certificate verification is enabled).


#### Limits section (from Rspamd 2.1):

1. `max_rows`: Set the maximum number of rows allowed before sending the collected data to the ClickHouse server. If this limit is reached, the data will be sent immediately. A value of 0 disables this limit (default is not set).
2. `max_memory`: Set the maximum amount of memory the collected data should occupy before sending it to the ClickHouse server. If this memory limit is reached, the data will be sent immediately. Use a value with a unit like '50mb' or '1gb' (default is not set).
3. `max_interval`: Set the maximum time interval between sending collected data to the ClickHouse server. After this interval is reached, the data will be sent regardless of the number of rows or the amount of memory occupied. Use a value with a unit like '60s', '5m', or '1h' (default is not set).

These options allow you to control how often Rspamd sends data to the ClickHouse server based on the number of rows, memory usage, and time interval. By configuring these limits, you can optimize the performance and resource usage of your Rspamd and ClickHouse instances.


### Clickhouse retention

Privacy is a crucial consideration in many email systems. The Clickhouse dumps may contain sensitive client data. Rspamd supports automatic cleanup of the outdated data using **retention policies**. By default, data is not expired in Clickhouse, but expiration can be set to comply with regulations such as the General Data Protection Regulation (GDPR) as follows:

~~~ucl
# local.d/clickhouse.conf
retention {
  enable = true;
  # drop | detach, please refer to ClickHouse docs for details
  # https://clickhouse.com/docs/en/sql-reference/statements/alter/partition
  method = "drop";
  # how many month the data should be kept in ClickHouse
  period_months = 3;
  # how often run the cleanup process
  run_every = 7d;
}
~~~

To remove data for particular users, you might consider using of the [Clickhouse mutations](https://clickhouse.yandex/docs/en/query_language/alter/#alter-mutations)

### Subject privacy

Similarly to previous, from the version 1.9, you can store email subject in Clickhouse (disabled by default). The following settings are available:

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


### Extra columns

You can also extract additional data and add it to a set of extra columns. This feature is available from the version Rspamd 2.4 and Clickhouse 19.3.

~~~ucl
# local.d/clickhouse.conf

extra_columns = {
        Mime_From = {
                selector = "from('mime'):addr";
                type = "String";
                # this is the returning answer if the value is null 
                default_value = "none";
                comment = "Mime from column";
        }
        Mime_Rcpt = {
                selector = "rcpts('mime'):addr";
                type = "Array(String)";
        }
}
~~~

## Clickhouse usage examples

Clickhouse module is extremely useful to perform statistical researches for mail flows. For example, to find top sending domains for spam and ham:

~~~sql
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

~~~sql
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

~~~sql
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

Rspamd also provides the capability to send data copies for specific domains to separate tables, making analytics easier.

For mailing lists, Rspamd sends list ids which allows to provide very precise statistics for each particular mailing list:

~~~sql
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

Using extra columns (see [Configuration](https://rspamd.com/doc/modules/clickhouse.html#extra-columns))

~~~sql
SELECT
    From,
    Mime_From,
    Mime_Rcpt
FROM rspamd
WHERE (Date = today())
GROUP BY From
ORDER BY TS From
LIMIT 10

┌─From─────────────────┬─Mime_From─────────────┬─────Mime_Rcpt─────────────┐
│ example@example.com  │ example@example.com   │ ['test@example.com']      │
│ test@test.com        │ hello@test.com        │ ['no@simple.test.com']    │
...
└──────────────────────┴───────────────────────┴───────────────────────────┘
~~~

## URLs storage

This text has been contributed by [Anton Yuzhaninov](https://github.com/citrin)

From version 2.8, Rspamd stores URLs from all sources, together with the corresponding flags.
To differentiate different types we've added `Urls.Flags` column which will contain all flags as an integer. 

All currently used bit flags are listed here:
https://github.com/rspamd/rspamd/blob/master/src/libserver/url.h#L17

For example, to exclude `img_src` and `PDF` URLs and keep all other URLs (old behaviour) one needs to exclude Urls where `bit 19` (img) or `bit 21` (content == pdf) are set: `bitTest(Flags, 19)`. If you don't mind having additional urls in `Urls.Url` column you can continue use it as is.

Here are some examples explained:

* The first line (regular_urls) is what has been logged originally;
* The second line - urls from html img tag src attribue
* The third line - urls extracted by content module; currently, it contains only PDF Urls

Numbers `19`, `21`, `22` correspond to flags `RSPAMD_URL_FLAG_IMAGE`, `RSPAMD_URL_FLAG_CONTENT`, `RSPAMD_URL_FLAG_NO_TLD`: https://github.com/rspamd/rspamd/blob/master/src/libserver/url.h#L17

~~~sql
SELECT
       MessageId,
       arrayMap(x -> x.1, arrayFilter(x -> NOT bitTestAny(x.2, 19, 21), arrayZip(Urls.Url, Urls.Flags))) AS regular_urls,
       arrayMap(x -> x.1, arrayFilter(x -> bitTest(x.2, 19), arrayZip(Urls.Url, Urls.Flags))) AS img_src,
       arrayMap(x -> x.1, arrayFilter(x -> bitTest(x.2, 21), arrayZip(Urls.Url, Urls.Flags))) AS pdf_urls
FROM rspamd
WHERE Date = '2021-02-26'
      AND arrayExists(x -> bitTestAny(x, 19, 21, 22), Urls.Flags)
LIMIT 250
~~~

Not all flags are equally interesting, but some are: for example `bitTest(Urls.Flags, 1)` allows much faster select URls with IP than a regexp for `Urls.Url`.
`Bit 20` allows to select for urls that we extract from query args in other urls (e. g. Rspamd extracts `to.com` in `http://example.com/foo?redirect=http://to.com`):

~~~sql
SELECT
       Urls.Tld,
       bitTest(Urls.Flags, 0) AS phished,
       bitTest(Urls.Flags, 1) AS numeric,
       bitTest(Urls.Flags, 4) AS html_disp,
       bitTest(Urls.Flags, 5) AS txt,
       bitTest(Urls.Flags, 6) AS subj,
       bitTest(Urls.Flags, 13) AS has_port,
       bitTest(Urls.Flags, 15) AS no_schema,
       bitTest(Urls.Flags, 16) AS not_norm,
       bitTest(Urls.Flags, 18) AS disp_url,
       bitTest(Urls.Flags, 19) AS img_src,
       bitTest(Urls.Flags, 20) AS from_query,
       bitTest(Urls.Flags, 21) AS pdf,
       bitTest(Urls.Flags, 22) AS no_tld,
       Urls.Flags,
       Urls.Url
FROM rspamd ARRAY JOIN Urls
WHERE Date >= today() - 1 AND TS >= subtractHours(now(), 1)
AND bitTestAny(Urls.Flags, 19, 21)
ORDER BY TS
LIMIT 250
~~~
