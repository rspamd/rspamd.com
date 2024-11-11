---
layout: doc
title: Elasticsearch module
---

# Elasticsearch module

Elasticsearch module pushes a variety of message-related metadata to an instance of [Elasticsearch](https://elastic.co/) or [OpenSearch](https://opensearch.org/).

Additionally module manages index template & policy and ingest pipeline for geoip functionality.

## Requirements
- Supported version of [Elasticsearch](https://www.elastic.co/) or [OpenSearch](https://opensearch.org/) - Indexing database
- [Kibana](https://www.elastic.co/products/kibana) or [OpenSearch Dashboards](https://opensearch.org/) (optional) - Used for data visualization

## Configuration

Starting from version Rspamd 3.11.0 module is disabled by default and should be explicitly `enabled` via `local.d/elastic.conf` or `override.d/elastic.conf`.

*Important:* by default module configures `index_policy` to delete logs older then 30 days.
If you are updating from version 3.10.x or older and want to use a different index policy - please configure it before enabling this module.

By default, the module automatically detects the distribution and whether the server version is supported, this behaviour can be disabled by setting `autodetect_enabled` to `false`, then it will take version of distribution from configuration.

Automatic index template managment as well as index policy and geoip pipeline can be turned off by setting `managed` to `false` in corresponding config section.

If you want to use your own existing index policy but keep a managed index template - you can set index policy `managed` to `false` and change the `name` of the policy to your custom one.

If you don't want to use index policy at all you need disable it by setting `enabled` to `false` in corresponding config section, same applies for geoip.

~~~hcl
enabled = true;
server = "localhost:9200";
user = "elastic";
password = "elastic";
use_https = true;
periodic_interval = 5.0; # how often try to run background periodic tasks
timeout = 5.0; # how much wait for reply from elastic
no_ssl_verify = false;
version = {
  autodetect_enabled = true;
  autodetect_max_fail = 30;
  # override works only if autodetect is disabled
  override = {
    name = "opensearch";
    version = "2.17";
  }
};
limits = {
  max_rows = 500; # max logs in one bulk req to elastic and first reason to flush buffer to elastic
  max_interval = 60; # seconds, if first log in buffer older then interval - flush buffer
  max_fail = 10;
};
index_template = {
  managed = true;
  name = "rspamd";
  priority = 0;
  pattern = "%Y.%m.%d";
  shards_count = 3;
  replicas_count = 1;
  refresh_interval = 5; # seconds
  dynamic_keyword_ignore_above = 256;
  headers_count_ignore_above = 5; # record only N first same named headers, add "ignored above..." if reached, set 0 to disable limit
  headers_text_ignore_above = 2048; # strip specific header value and add "..." to the end; set 0 to disable limit
  symbols_nested = false;
  empty_value = "unknown"; # empty numbers, ips and ipnets are not customizable they will be always 0, :: and ::/128 respectively
};
index_policy = {
  enabled = true;
  managed = true;
  name = "rspamd"; # if you want use custom lifecycle policy, change name and set managed = false
  hot = {
    index_priority = 100;
  };
  warm = {
    enabled = true;
    after = "2d";
    index_priority = 50;
    migrate = true; # only supported with elastic distro, will not have impact elsewhere
    read_only = true;
    change_replicas = false;
    replicas_count = 1;
    shrink = false;
    shards_count = 1;
    max_gb_per_shard = 0; # zero - disabled by default, if enabled - shards_count is ignored
    force_merge = false;
    segments_count = 1;
  };
  cold = {
    enabled = true;
    after = "14d";
    index_priority = 0;
    migrate = true; # only supported with elastic distro, will not have impact elsewhere
    read_only = true;
    change_replicas = false;
    replicas_count = 1;
  };
  delete = {
    enabled = true;
    after = "30d";
  };
};
# extra headers to collect, f.e.:
# "Precedence";
# "List-Id";
extra_collect_headers = [];
geoip = {
  enabled = true;
  managed = true;
  pipeline_name = "rspamd-geoip";
};
~~~
