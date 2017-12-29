---
layout: doc
title: Rspamadm
---

# About rspamadm

The `rspamadm` command is a container for various utility functions.

To see available commands we could invoke `rspamadm -l`:

~~~
Rspamadm 1.5.1
Usage: rspamadm [global_options] command [command_options]

Available commands:
  pw                 Manage rspamd passwords
  keypair            Create encryption key pairs
  configtest         Perform configuration file test
  fuzzy_merge        Merge fuzzy databases
  configdump         Perform configuration file dump
  control            Manage rspamd main control interface
  confighelp         Shows help for configuration options
  statconvert        Convert statistics from sqlite3 to redis
  fuzzyconvert       Convert fuzzy hashes from sqlite3 to redis
  grep               Search for patterns in rspamd logs
  signtool           Sign and verify files tool
  lua                Run LUA interpreter
  dkim_keygen        Create dkim key pairs
~~~

To see the help text for a command we can run `rspamadm [command-name] --help`.

## Rspamadm configdump

This command shows the effective configuration of rspamd after configuration files are merged. Usually you would just run `rspamadm configdump` or `rspamadm configdump [modulename]` or `rspamadm configdump [modulename].[option]` to show part of configuration.

~~~
Application Options:
  -j, --json              Json output (pretty formatted)
  -C, --compact           Compacted json output
  -c, --config            Config file to test
  -h, --show-help         Show help as comments for each option
  -s, --show-comments     Show saved comments from the configuration file
~~~

## Rspamadm confighelp

This command shows available options & configuration hints for core configuration options. Run simply as `rspamadm confighelp` it shows all options, run as `rspamadm confighelp [modulename]` or `rspamadm confighelp [modulename].[option]` it shows configuration options beneath that object, for example `rspamadm confighelp surbl.rule`.

~~~
Application Options:
  -j, --json        Output json
  -c, --compact     Output compacted
  -k, --keyword     Search by keyword
~~~

## Rspamadm configtest

This command tests that the configuration file is syntactically valid and can be loaded (it will also show warnings to point at possible problems).

~~~
Application Options:
  -q, --quiet      Suppress output
  -c, --config     Config file to test
  -s, --strict     Stop on any error in config
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

## Rspamadm fuzzy_merge

Merges fuzzy databases in SQLite format. Typical invocation would be `rspamadm fuzzy_merge -s [source.db.file] -d [destination.db.file]`.

~~~
Application Options:
  -s, --source          Source for merge (can be repeated)
  -d, --destination     Destination db
  -q, --quiet           Suppress output
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
  -p, --path             Add specified paths to lua paths
  -H, --history-file     Load history from the specified file
  -m, --max-history      Store this number of history entries
  -S, --serve            Serve http lua server
  -b, --batch            Batch execution mode
  -a, --args             Arguments to pass to Lua
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

This is a command for converting statistics from SQLite to Redis. Typical invocation to convert spam/ham databases and learn cache is shown below:

~~~
rspamadm statconvert -d /var/lib/rspamd/bayes.spam.sqlite -h 127.0.0.1 -s BAYES_SPAM
rspamadm statconvert -d /var/lib/rspamd/bayes.ham.sqlite -h 127.0.0.1 -s BAYES_HAM -c /var/lib/rspamd/learn_cache.sqlite
~~~

~~~
Application Options:
  -d, --database     Input sqlite
  -c, --cache        Input learn cache
  -h, --host         Output redis ip (in format ip:port)
  -s, --symbol       Symbol in redis (e.g. BAYES_SPAM)
  -D, --dbname       Database in redis (should be numeric)
  -p, --password     Password to connect to redis
  -r, --reset        Reset previous data instead of appending values
~~~
