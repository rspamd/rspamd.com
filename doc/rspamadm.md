---
layout: doc
title: Rspamadm
---

# About rspamadm

The `rspamadm` command is a container for various utility functions.

To see available commands we could invoke `rspamadm -l`:

~~~
Rspamadm 2.5
Usage: rspamadm [global_options] command [command_options]

Available commands:
  clickhouse         Retrieve information from Clickhouse
  configdump         Perform configuration file dump
  configgraph        Produces graph of Rspamd includes
  confighelp         Shows help for configuration options
  configtest         Perform configuration file test
  configwizard       Perform guided configuration for Rspamd daemon
  control            Manage rspamd main control interface
  cookie             Produces cookies or message ids
  corpustest         Create logs files from email corpus
  dkim_keygen        Create dkim key pairs
  dnstool            DNS tools provided by Rspamd
  fuzzyconvert       Convert fuzzy hashes from sqlite3 to redis
  grep               Search for patterns in rspamd logs
  keypair            Manages keypairs for Rspamd
  lua                Run LUA interpreter
  mime               Mime manipulations provided by Rspamd
  pw                 Manage rspamd passwords
  signtool           Sign and verify files tool
  statconvert        Convert statistics from sqlite3 to redis
  template           Apply jinja templates for strings/files
  vault              Perform Hashicorp Vault management
~~~

To see the help text for a command we can run `rspamadm [command-name] --help`.

## Rspamadm clickhouse

*This is a work-in-progress*.

This command fetches information from Clickhouse - so far it is intended to generate profiles of symbols to be used for neural networks.

It will try fetch Clickhouse details from configuration if not specified.

~~~
Options:
   -h, --help                 Show this help message and exit.
         -c config_file,      Path to config file (default: /etc/rspamd/rspamd.conf)
   --config config_file
           -d database,       Name of Clickhouse database to use (default: default)
   --database database
   --no-ssl-verify            Disable SSL verification
           -p password,       Password to use for Clickhouse
   --password password
   -a, --ask-password         Ask password from the terminal
         -s server,           Address[:port] to connect to Clickhouse with
   --server server
       -u user,               Username to use for Clickhouse
   --user user
   --use-gzip use_gzip        Use Gzip with Clickhouse
   --use-https                Use HTTPS with Clickhouse

Commands:
   neural_profile             Generate symbols profile using data from Clickhouse
~~~

### Rspamadm clickhouse neural_profile

~~~
Usage: rspamadm clickhouse neural_profile [-h] [-w where] [-j]
       [--days days] [--limit limit] [--settings-id settings_id]

Generate symbols profile using data from Clickhouse

Options:
   -h, --help                 Show this help message and exit.
        -w where,             WHERE clause for Clickhouse query
   --where where
   -j, --json                 Write output as JSON
   --days days                Number of days to collect stats for (default: 7)
   --limit limit,             Maximum rows to fetch per day
        -l limit
   --settings-id settings_id  Settings ID to query (default: )
~~~

The neural_profile subcommand deals with generating profiles of symbols to be used for neural networks. User-specified conditions can be added to the `WHERE` clause using the `-w` flag to filter the data which is queried. 

## Rspamadm configdump

This command shows the effective configuration of rspamd after configuration files are merged. Usually you would just run `rspamadm configdump` or `rspamadm configdump [modulename]` or `rspamadm configdump [options] [modulename]` to show part of configuration.

~~~
Application Options:
  -j, --json              Json output (pretty formatted)
  -C, --compact           Compacted json output
  -c, --config            Config file to test
  -h, --show-help         Show help as comments for each option
  -s, --show-comments     Show saved comments from the configuration file
  -m, --modules-state     Show modules state only
  -g, --groups            Show symbols groups only
  -T, --skip-template     Do not apply Jinja templates
~~~

## Rspamadm confighelp

This command shows available options & configuration hints for core configuration options. Run simply as `rspamadm confighelp` it shows all options, run as `rspamadm confighelp [modulename]` or `rspamadm confighelp [modulename].[option]` it shows configuration options beneath that object, for example `rspamadm confighelp surbl.rule`.

## Rspamadm configtest

This command tests that the configuration file is syntactically valid and can be loaded (it will also show warnings to point at possible problems).

~~~
Application Options:
  -q, --quiet             Suppress output
  -c, --config            Config file to test
  -s, --strict            Stop on any error in config
  -T, --skip-template     Do not apply Jinja templates
~~~

## Rspamadm control

This command sends controller commands to rspamd's control socket (and should typically be run as root or the rspamd user).

Valid controller commands are:

 - `fuzzystat` : Show fuzzy statistics
 - `fuzzysync` : Immediately sync fuzzy database to storage
 - `recompile` : Recompile hyperscan regexes
 - `reresolve` : Reresolve upstreams by DNS name
 - `reload` : Reload workers dynamic data
 - `stat` : Returns worker statistics

Typical invocation would be `rspamadm control [command]`, for example `rspamadm control fuzzy_sync`.

~~~
Application Options:
  -j, --json        Output json
  -c, --compact     Output compacted
  -u, --ucl         Output ucl (default)
  -s, --socket      Use the following socket path
  -t, --timeout     Set IO timeout (1s by default)
~~~

## Rspamadm dkim_keygen

This command generates DKIM keypairs. In its default invocation it outputs a 1024-bit DKIM private key and a public key formatted for use in a DNS record to the standard output. This can be tuned by use of the available flags:

~~~
Application Options:
  -d, --domain       Use the specified domain
  -s, --selector     Use the specified selector
  -k, --privkey      Save private key in the specified file
  -b, --bits         Set key length to N bits (1024 by default)
  -t, --type         Key type: rsa or ed25519 (rsa by default)
~~~

## Rspamadm fuzzyconvert

This command migrates fuzzy hashes from SQLite to Redis. Typical invocation would be something like `rspamadm fuzzyconvert -d /var/lib/rspamd/fuzzy.db -h 127.0.0.1:6379 -e 2419200` where `-e` is your hash expiry time in seconds.

~~~
Application Options:
  -d, --database     Input sqlite
  -e, --expiry       Time in seconds after which hashes should be expired
  -h, --host         Output redis ip (in format ip:port)
  -D, --dbname       Database in redis (should be numeric)
  -p, --password     Password to connect to redis
~~~

## Rspamadm grep

This command provides a convenient way to produce logically collated logs based on search strings/regular expressions. If a match is found, `rspamadm grep` prints the entire log related to the scanned message followed by a newline as a visual indicator of where each task ends.

Typical invocation would be `rspamadm grep -s DMARC_POLICY_ACCEPT -i /var/log/rspamd/rspamd.log` for a case-insensitive string search or `-p [regex]` in place of `-s` for a regex search. The `-i` (input) flag can be specified multiple times for multiple inputs or omitted to use standard input.

~~~
Application Options:
  -s, --string        Plain string to search (case-insensitive)
  -l, --lua           Use Lua patterns in string search
  -p, --pattern       Pattern to search for (regex)
  -i, --input         Process specified inputs (stdin if unspecified)
  -S, --sensitive     Enable case-sensitivity in string search
  -o, --orphans       Print orphaned logs
  -P, --partial       Print partial logs
~~~

**IMPORTANT**: `log_re_cache` option **should** be set `true` (it's *true* by default) in `/path/to/logging.inc` to `rspamadm grep` works correctly.

## Rspamadm lua

The `rspamadm lua` command provides a Lua REPL and interpreter with access to the majority of Rspamd's Lua API which provides a convenient way to test these functions. Typical invocation would be `rspamadm lua` to start using the REPL.

~~~
Application Options:
  -s, --script           Load specified scripts
  -P, --path             Add specified paths to lua paths
  -H, --history-file     Load history from the specified file
  -m, --max-history      Store this number of history entries
  -S, --serve            Serve http lua server
  -b, --batch            Batch execution mode
  -e, --exec             Execute specified script
  -a, --args             Arguments to pass to Lua
~~~

## Rspamadm mime

This command is used to extract or modify mime messages. It supports multiple subcommands:

| command          | purpose     |
| ---------------- | ------------ |
| extract, ex, e   |          Extracts data from MIME messages
| stat, st, s      |          Extracts statistical data from MIME messages
| urls, url, u     |          Extracts URLs from MIME messages
| modify, mod, m   |          Modifies MIME message
| sign             |          Performs DKIM signing

### Rspamadm mime extract

Extracts stuff from a mime message:

~~~
Arguments:
   file                       File to process

Options:
   -h, --help                 Show this help message and exit.
   -t, --text                 Extracts plain text data from a message
   -H, --html                 Extracts htm data from a message
         -o <type>,           Output format ('raw', 'content', 'oneline', 'decoded', 'decoded_utf') (default: content)
   --output <type>
   -w, --words                Extracts words
   -p, --part                 Show part info
   -s, --structure            Show structure info (e.g. HTML tags)
               -F <type>,     Words format ('stem', 'norm', 'raw', 'full') (default: stem)
   --words-format <type>
~~~

### Rspamadm mime stat

Extracts statistical data from MIME messages

~~~
Arguments:
   file                       File to process

Options:
   -h, --help                 Show this help message and exit.
   -m, --meta                 Lua metatokens
   -b, --bayes                Bayes tokens
   -F, --fuzzy                Fuzzy hashes
   -s, --shingles             Show shingles for fuzzy hashes
~~~

### Rspamadm mime urls

Extracts urls data from MIME messages

~~~
Arguments:
   file                       File to process

Options:
   -h, --help                 Show this help message and exit.
   -t, --tld                  Get TLDs only
   -H, --host                 Get hosts only
   -f, --full                 Show piecewise urls as processed by Rspamd
   -u, --unique               Print only unique urls
   -s, --sort                 Sort output
   --count                    Print count of each printed element
   -r, --reverse              Reverse sort order
~~~

### Rspamadm mime modify

Modifies mime message and write data to stdout. Currently supported features are:

* headers alteration
* adding footer to text parts preserving message structure (and skipping signed parts)

~~~
Arguments:
   file                       File to process

Options:
   -h, --help                 Show this help message and exit.
             -a <header=value>,
   --add-header <header=value>
                              Adds specific header
                -r <header>,  Removes specific header (all occurrences)
   --remove-header <header>
                 -R <header=pattern>,
   --rewrite-header <header=pattern>
                              Rewrites specific header, uses Lua string.format pattern
              -t <file>,      Adds footer to text/plain parts from a specific file
   --text-footer <file>
              -H <file>,      Adds footer to text/html parts from a specific file
   --html-footer <file>
~~~

### Rspamadm mime sign

Performs messages signing for DKIM/ARC.

~~~
Arguments:
   file                       File to process

Options:
   -h, --help                 Show this help message and exit.
         -d <domain>,         Use specific domain
   --domain <domain>
           -s <selector>,     Use specific selector
   --selector <selector>
      -k <key>,               Use specific key of file
   --key <key>
     -t <arc|dkim>,           ARC or DKIM signing (default: dkim)
   type <arc|dkim>
         -o <message|signature>,
   --output <message|signature>
                              Output format (default: message)
~~~

## Rspamadm pw

This command is a tool for generating password hashes. Typical invocation would be `rspamadm pw` to interactively generate a password hash in the default format.

~~~
Application Options:
  -e, --encrypt      Encrypt password
  -c, --check        Check password
  -q, --quiet        Suppress output
  -p, --password     Input password
  -t, --type         PBKDF type
  -l, --list         List available algorithms
~~~

## Rspamadm signtool

This is a command for signing maps which would most likely be used with the rspamd_update module.

Typical use would involve first creating keypair using `rspamadm keypair -s -u > keypair.file` and then editing and saving the file to sign using `rspamadm signtool -e --editor=vim -k keypair.file [file.to.sign]`.

~~~
Application Options:
  -o, --openssl     Generate openssl nistp256 keypair not curve25519 one
  -v, --verify      Verify signatures and not sign
  -S, --suffix      Save signatures in file<suffix> files
  -p, --pubkey      Base32 encoded pubkey to verify
  --pubout          Output public key to the specified file
  -P, --pubfile     Load base32 encoded pubkey to verify from the file
  -k, --keypair     UCL with keypair to load for signing
  -q, --quiet       Be quiet
  -e, --edit        Run editor and sign the edited file
  --editor          Use the specified editor instead of $EDITOR environment var
~~~

## Rspamadm statconvert

This is a command for converting statistics from SQLite to Redis. A typical invocation to convert spam/ham databases and learn cache can be found in the [FAQ](https://rspamd.com/doc/faq.html#which-backend-should-i-use-for-statistics).

~~~
Application Options:
  -c, --config             Config file to read data from
  -r, --reset              Reset previous data instead of appending values
  -e, --expire             Set expiration in seconds (can be fractional)
  --symbol-spam            Symbol for spam (e.g. BAYES_SPAM)
  --symbol-ham             Symbol for ham (e.g. BAYES_HAM)
  --spam-db                Input spam file (sqlite3)
  --ham-db                 Input ham file (sqlite3)
  --cache                  Input learn cache
  -h, --redis-host         Output redis ip (in format ip:port)
  -p, --redis-password     Password to connect to redis
  -d, --redis-db           Redis database (should be numeric)
~~~
