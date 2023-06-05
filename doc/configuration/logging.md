---
layout: doc
title: Rspamd Logging
---

# Rspamd logging settings
{:.no_toc}

<div id="toc" markdown="1">
  <h2 class="toc-header">Contents</h2>
  * TOC
  {:toc}
</div>

## Introduction

Rspamd offers various logging options. Firstly, there are three supported types of log output: `console` logging, which outputs log messages to the console; `file` logging, which directs log messages to a file; and logging via the `syslog` daemon. Additionally, it is possible to limit logging to a specific level:

| Level          | Description                       |
| :-------------- | :-------------------------------- |
| `error` | log only critical errors
| `warning` | log errors and warnings
| `notice` | log only important notices + scan messages results
| `info` | log all non-debug messages
| `silent` | log at `info` level on start and then reduce to `notice` level when forking worker processes
| `debug` | log all including debug messages (huge amount of logging)

You have the option to enable debug messages for specific IP addresses, which can be beneficial for testing purposes. Each logging type has specific mandatory parameters: log facility for syslog (refer to the `syslog(3)` man page for facility details), and log file for file logging. File logging can also be buffered for improved performance. In order to reduce logging noise, Rspamd detects consecutive matching log messages and replaces them with the total number of repeated occurrences.

	#81123(fuzzy): May 11 19:41:54 rspamd file_log_function: Last message repeated 155 times
	#81123(fuzzy): May 11 19:41:54 rspamd process_write_command: fuzzy hash was successfully added

## Unique ID

Starting from version 1.0, Rspamd logs include a unique ID for each logging message, enabling efficient search for relevant messages. Additionally, there is now a `module` definition that specifies the module associated with the log message, such as `task` or `cfg` modules. Here is a brief example to illustrate how it works: let's consider an incoming task for a specific message. In the logs, you would observe something similar to the following entry:

    2015-09-02 16:41:59 #45015(normal) <ed2abb>; task; accept_socket: accepted connection from ::1 port 52895
    2015-09-02 16:41:59 #45015(normal) <ed2abb>; task; rspamd_message_parse: loaded message; id: <F66099EE-BCAB-4D4F-A4FC-7C15A6686397@FreeBSD.org>; queue-id: <undef>

In this case, the tag `ed2abb` is assigned to the task, and all subsequent processing related to that task will bear the same tag. This tagging feature is not limited to the `task` module alone; it is also enabled in other modules like `spf` or `lua`. For certain modules like `cfg`, the tag is generated statically using a specific characteristic, such as the checksum of the configuration file.

## Configuration parameters

Here is a summary of the logging parameters, each of which can be redefined or defined in the `local.d/logging.inc` file:

| Parameter          | Description                       |
| :-------------- | :-------------------------------- |
| `type` | Defines logging type (file, console or syslog). For some types mandatory attributes may be required.
| `filename` | Path to log file for file logging (required for **file** type)
| `facility` | Logging facility for **syslog** type (required if this type is used)
| `level` | Defines logging level (error, warning, info or debug).
| `log_buffered` | Flag that controls whether logging is buffered.
| `log_buf_size` | For file and console logging defines buffer size that will be used for logging output.
| `log_urls` | Flag that defines whether all URLs in message should be logged. Useful for testing. Default: `false`.
| `log_re_cache` | Output regular expressions statistics after each message. Default: `true`.
| `debug_ip` | List that contains IP addresses for which debugging should be turned on.
| `color` | Turn on coloring for log messages. Default: `false`.
| `systemd` | If `true` timestamps aren't prepended to log messages. Default: `false`.
| `debug_modules` | A list of modules that are enabled for debugging.
| `log_usec` | Log microseconds (e.g. `11:43:16.68071`). Default: `false`.
| `log_severity` (2.8+) | Log severity explicitly (e.g. `[info]` or `[error]`). Default: `false`.


### Defined debug modules

Here is a list of C debug modules defined in Rspamd (this list is usually incomplete):

| Module          | Description                       |
| :-------------- | :-------------------------------- |
| `bayes` | messages from Bayes classifier
| `cfg` | configuration messages
| `composites` | debug composite symbols
| `dkim` | messages from dkim module
| `dns` | messages from DNS resolver
| `fuzzy_backend` | messages from fuzzy backend
| `langdet` | messages from language detector
| `logger` | messages from the logger itself
| `main` | messages from the main process
| `map` | messages from maps in Rspamd
| `milter` | debug milter interface
| `protocol` | debug protocol details
| `proxy` | messages from proxy
| `spf` | messages from spf module
| `stat_redis` | messages from redis statistics
| `symcache` | messages from symbols cache
| `task` | task messages
 
Any Lua module can also be added to `debug_modules` as they are using somehow a similar naming semantics. E.g. you can use `dkim_signing` or `multimap` or `lua_tcp` to debug the corresponding modules.

## Log format

Rspamd supports a custom log format for writing message information to the log. This feature has been supported since version 1.1. The format string for the custom log format is as follows:

	log_format =<<EOD
	id: <$mid>,$if_qid{ qid: <$>,}$if_ip{ ip: $,}$if_user{ user: $,}$if_smtp_from{ from: <$>,}
	(default: $is_spam ($action): [$scores] [$symbols]),
	len: $len, time: $time_real real,
	$time_virtual virtual, dns req: $dns_req
	EOD

Newlines are replaced with spaces in the custom log format. The log format line can include both text and variables. Each variable can have an optional `if_` prefix, which will log the variable only if it is triggered. Additionally, each variable can have an optional body value where `$` is replaced with the variable's value. The `$` placeholder can be repeated multiple times in the body. For example, `$if_var{$$$$}` will be replaced with the variable's name repeated four times.

### Log variables

Rspamd supports the following log variables:

| Variable          | Description                       |
| :-------------- | :-------------------------------- |
| `action` | default metric action
| `digest` | cryptographic digest of a message's content (stripped to 16 bytes or 32 hex symbols)
| `dns_req` | number of DNS requests
| `filename` (from 1.8.0) | name of file if HTTP agent (e.g. rspamc) passes it
| `forced_action` (from 1.8.2) | forced action if form `<action> "<message>"; score=<score> (set by <module>)`
| `groups` (from 2.0) | symbols groups list for a task
| `ip` | from IP
| `is_spam` | a one-letter rating of spammyness: `T` for spam, `F` for ham and `S` for skipped messages
| `len` | length of message
| `lua` | custom Lua script (see below)
| `mid` | message ID
| `mime_from` | MIME from
| `mime_rcpt` | MIME rcpt - the first recipient
| `mime_rcpts` | MIME rcpts - all recipients
| `public_groups` (from 2.0) | public groups only (similar to groups but more restricted)
| `qid` | queue ID
| `scores` | summary of scores
| `settings_id` (from 2.0) | settings id for a message
| `smtp_from` | envelope from (or MIME from if SMTP from is absent)
| `smtp_rcpt` | envelope rcpt (or MIME from if SMTP from is absent) - the first recipient
| `smtp_rcpts` | envelope rcpts - all recipients
| `symbols_params` | list of all symbols and their options
| `symbols_scores_params` | list of all symbols, their scores and options
| `symbols_scores` | list of all symbols and their scores
| `symbols` | list of all symbols
| `time_real` | real time of task processing
| `time_virtual` (till 2.0) | CPU time of task processing
| `user` | authenticated user

Custom logging scripts could look like the following:

~~~lua
$lua{
  return function(task) 
    return 'text parts: ' .. tostring(#task:get_text_parts()) 
  end
}
~~~

this script will log number of text part in messages.
