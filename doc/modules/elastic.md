---
layout: doc
title: Elasticsearch module
---

# Elasticsearch module

Elasticsearch module pushes a variety of message-related metadata to an instance of [Elasticsearch](https://elastic.co/). This module provides exporter, template creation logic and a simple Kibana dashboard.

<img src="https://i.imgur.com/etYWT8R.png" class="img-responsive" />

This plugin is based on the [plugin](https://github.com/Menta2L/rspamd-elastic) created by [Veselin Iordanov](https://github.com/Menta2L) and adopted for the Elasticsearch 6.x

## Requirements
- [Elasticsearch 6.x](https://www.elastic.co/) - Indexing database
- [ingest-geoip](https://www.elastic.co/guide/en/elasticsearch/plugins/master/ingest-geoip.html) - Elasticsearch plugin used for geoip resolve
- [Kibana](https://www.elastic.co/products/kibana) (optional) - Used for data visualization

## Configuration

Configuration is fairly simple:

~~~ucl
# local.d/elastic.conf
# Push update when 10 records are collected (10 if unset)
limit = 10;
# IP:port of Elasticsearch server
server = "localhost:9200";
# Timeout to wait for response (5 seconds if unset)
timeout = 5;
# Elasticsearch template file (json format)
#template_file = "${PLUGINSDIR}/elastic/rspamd_template.json";
# Kibana prebuild visualizations and dashboard template (json format)
#kibana_file = "${PLUGINSDIR}/elastic/kibana.json";
# Elasticsearch index name pattern
index_pattern = "rspamd-%Y.%m.%d";
# Import Kibana template
import_kibana = false;
# Use https if needed
use_https = false;
# Ignore certificate warnings (rspamd will lookup the IP-address of a given hostname and connect with the IP-address)
no_ssl_verify = false;
# credential to connect to ElasticSearch (optional)
user = "rspamd"
password = "supersecret"
# ingest-geoip is a module (true if ElasticSearch >= 6.7.0)
ingest_module = false;
~~~
