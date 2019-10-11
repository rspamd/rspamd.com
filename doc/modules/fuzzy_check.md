---
layout: doc
title: Fuzzy check module
---
# Fuzzy check module

This module is intended to check messages for specific fuzzy patterns stored in
[fuzzy storage workers](../workers/fuzzy_storage.html). At the same time, this module
is responsible for teaching fuzzy storage with message patterns.

## Fuzzy patterns

Rspamd uses the `shingles` algorithm to perform a fuzzy match of messages. This algorithm
is probabilistic and uses word chains as patterns (in the shingles algorithm), and thus filter 
spam or ham messages. The `shingles` algorithm is described in the following 
[research paper](http://dl.acm.org/citation.cfm?id=283370). We use 3-grams (trigrams) for this
algorithm and a set of hash functions: siphash, mumhash and others. Currently,
rspamd uses 32 hashes for shingles.

Attachments and images are not currently matched against fuzzy hashes, but they
are checked by way of blake2 digests using strict match.

## Module outline
~~~ucl
# local.d/fuzzy_check.conf
fuzzy_check
{
	max_errors = ...; //int: Maximum number of upstream errors; affects error rate threshold
	min_bytes = ...; //int: Minimum number of *bytes* to check a non-text part
	min_height = ...; //int: Minimum pixel height of embedded images to check using fuzzy storage
	min_length = ...; //int: Minimum number of *words* to check a text part
	min_width = ...; //int: Minimum pixel width of embedded images to check using fuzzy storage
	retransmits = ...; //int: Maximum number of retransmits for a single request
	revive_time = ...; //float: Time (seconds?) to lapse before re-resolving faulty upstream
	symbol = "default symbol"; //string: Default symbol for rule (if no flags defined or matched)
	text_multiplier = ...; //float: Multiplier for bytes limit when checking for text parts
	timeout = ...; //time: Timeout to wait for a reply from a fuzzy server, e.g. 1s, 2m, 5h
	whitelist = "..."; //string: Whitelisted IPs map

	rule { //Fuzzy check rule
		algorithm = "..."; //string: rule hashing algo
		encryption_key = "..."; //string: Base32 value for the protocol encryption public key
		fuzzy_key = "..."; //string: Base32 value for the hashing key (for private storages)
		fuzzy_map = { //object: Map of SYMBOL -> data for flags configuration
			max_score = ... ; //int: Maximum score for this flag
			flag = ... ; //int: Flag number (ordinal)
		}; 
		fuzzy_shingles_key = "..."; //string: Base32 value for the shingles hashing key (for private storages)
		headers = "..."; //array: Headers that are used to make a separate hash
		learn_condition = "..."; //string: Lua script that returns boolean function to check whether this task should be considered when training fuzzy storage
		max_score = ...; //int: Max value for fuzzy hash when weight of symbol is exactly 1.0 (if value is higher, then the score is still 1.0)
		mime_types = "..."; //array: Set of mime types (in form type/subtype, or type/*, or *) to check with fuzzy
		min_bytes = ...; //int: Override module default min bytes for this rule
		read_only = ...; //boolean: If true then never try to train this fuzzy storage
		servers = "..."; //string: List of servers to check (or train)
		short_text_direct_hash = ...; //boolean: Use direct hash for short texts
		skip_hashes = "..."; //string: Whitelisted hashes map
		skip_unknown = ...; //boolean: If true then ignores unknown flags and does not add the default fuzzy symbol
		symbol = "..."; //string: Default symbol for rule (if no flags defined or matched)
	}
}
~~~

## Module configuration

The ```fuzzy_check``` module has several global options, including:

- `min_bytes`: minimum length of attachments and images in bytes to check them in fuzzy storage
- `min_height`: minimum pixel height of images to be checked
- `min_length`: minimum length of text parts in words to perform fuzzy check (default - check all text parts)
- `min_width`: minimum pixel width of images to be checked
- `retransmits`: maximum retransmissions before giving up
- `symbol`: default symbol to insert (if no flags match)
- `timeout`: timeout to wait for a reply, e.g. 1s, 2m, 5h
- `whitelist`: IPs in this list bypass all fuzzy checks

e.g.
~~~ucl
# local.d/fuzzy_check.conf
# the following are defaults in 1.9.4
fuzzy_check {
    min_bytes = 1k; # Since small parts and small attachments cause too many FP
    timeout = 2s;
    retransmits = 1;
    ...
    rule {...}
}
~~~


A fuzzy `rule` is defined as a set of `rule` definitions. Each `rule` must have a `servers`
list to check or train (teach), and a set of flags and optional parameters. 

The `servers` parameter can have the round-robin parameter to alternately try each entry, e.g. using a list:
```
        servers = "round-robin:fuzzy1.rspamd.com:11335,fuzzy2.rspamd.com:11335";
```

Available keywords for use in the `servers` parameter include: 
- `hash:`: use a stable hashing algorithm to distribute values
- `master-slave:`: always prefer upstream with a higher priority unless it is unavailable
- `round-robin:`: balance upstreams one by one, by selecting according to their weight
- `random:`: choose each entry in a list randomly
- `sequential:`: use each entry in a list sequentially



Usable parameters include:

- `algorithm`: rule hashing algo; one of: `fasthash` (or just `fast`), `mumhash`, `siphash` (or `old`) or `xxhash`
- `encryption_key`: Base32 value public key to access this rule
- `fuzzy_map`: Map of SYMBOL -> data for flags configuration
- `fuzzy_key`: Base32 value for the hashing key (for private storages).
- `learn_condition`: An Lua script that returns a boolean function to check whether this task
	should be considered when training fuzzy storage
- `max_score`: float value: score threshold for this rule's activation/trigger
- `mime_types`: array or list of acceptable mime-type regexs for this rule. Can be: `["*"]` to match anything
- `read_only`: set to `no` to enable training, set to `yes` for no training
- `servers`: list of servers to check or train
- `short_text_direct_hash`: whether to check the exact hash match for short texts where fuzzy algorithm is not applicable.
- `skip_unknown`: whether or not to ignore unmatched content; if `true` or `yes` then ignore unknown flags and 
	does not add the default fuzzy symbol
- `symbol`: the default symbol applied for a rule. 


Here is an example `rule`:

~~~ucl
# local.d/fuzzy_check.conf
...
rule "FUZZY_CUSTOM" {
  # List of servers. Can be an array or multi-value item
  servers = "127.0.0.1:11335";

  # List of additional mime types to be checked in this fuzzy ("*" for any)
  mime_types = ["application/*", "*/octet-stream"];

  # Maximum global score for all maps combined
  max_score = 20.0;

  # Ignore flags that are not listed in maps for this rule
  skip_unknown = yes;

  # If this value is false (i.e. no), then allow learning for this fuzzy rule
  read_only = no;

  # Fast hash type
  algorithm = "mumhash";
}
...
~~~

Each `rule` can have several `fuzzy_map` values, ordered by an ordinal `flag` value. A single
fuzzy storage can contain both good and bad hashes that should have different symbols,
and thus, different weights. Multiple `fuzzy_map`s are defined inside fuzzy `rule`s as follows:

~~~ucl
# local.d/fuzzy_check.conf
rule "FUZZY_LOCAL" {
...
fuzzy_map = {
  FUZZY_DENIED {
    # Maximum weight for this list
    max_score = 20.0;
    # Flag value
    flag = 1
  }
  FUZZY_PROB {
    max_score = 10.0;
    flag = 2
  }
  FUZZY_WHITE {
    max_score = 2.0;
    flag = 3
  }
}
...
}
~~~

From the above we can infer that email messages accruing a `max_score` above 20.0 
will receive the `FUZZY_DENIED` mapping, and thus be categorised as spam.

The meaning of `max_score` can be rather unclear. First of all, all hashes in
fuzzy storage have individual weights. For example, if we have a hash `A` and 100 users
marked it as a spam hash, then it will have a weight of `100 * single_vote_weight`.
Therefore, if a `single_vote_weight` is `1` then the final weight will be `100`.
`max_score` is the weight that is required for the rule to add its symbol to the maximum
score 1.0 (that will then be multiplied by the `metric` value's weight).
For example, if the `weight` of the hash is `100` and the `max_score` is set to `20`,
then the rule will be added with the weight of `1`. If `max_score` is set to `200`,
then the rule will be added with the weight likely `0.2` (calculated via hyperbolic tangent).




In the following configuration:

~~~ucl
metric {
	name = "default";
	...
	symbol {
		name = "FUZZY_DENIED";
		weight = "10.0";
	}
	...
}
fuzzy_check {
	rule {
	...
	fuzzy_map = {
		FUZZY_DENIED {
			# Maximum weight for this list
			max_score = 20.0;
			# Flag value
			flag = 1
        }
        ...
    }
}
~~~

If a hash has value `10`, then a symbol `FUZZY_DENIED` with weight of `2.0` will be added.
If a hash has value `100500`, then `FUZZY_DENIED` will have weight `10.0`.

## Training fuzzy_check

Module `fuzzy_check` can also learn from messages. You can use `rspamc` command or
connect to the **controller** worker using HTTP protocol. For learning, you must check 
the following settings:

1. Controller worker should be accessible by `rspamc` or HTTP (check `bind_socket`)
2. Controller should allow privilleged commands for this client (check `enable_password` or `allow_ip` settings)
3. Controller should have `fuzzy_check` module configured to the servers specified
4. You should know `fuzzy_key` and `fuzzy_shingles_key` to operate with this storage
5. Your `fuzzy_check` module should have `fuzzy_map` configured to the flags used by server
6. Your `fuzzy_check` rule must have `read_only` option turned off (`read_only = false`)
7. Your `fuzzy_storage` worker should allow updates from the controller's host (`allow_update` option)
8. Your controller should be able to communicate with fuzzy storage by means of the `UDP` protocol

If all these conditions are met, then you can teach rspamd messages with rspamc:

	rspamc -w <weight> -f <flag> fuzzy_add ...

or delete hashes:

	rspamc -f <flag> fuzzy_del ...

you can also delete a hash that you find in the log output:

	rspamc -f <flag> fuzzy_delhash <hash-id>

On learning, rspamd sends commands to **all** servers inside a specific rule. On check,
rspamd selects a server in a round-robin manner.

## Usage of the feeds provided by `rspamd.com`

If you use `rspamd.com` feeds (enabled by default) you need to qualify [**free usage policy**](https://rspamd.com/doc/usage_policy.html) or you would be blocked from using this service. There is a special symbol called `FUZZY_BLOCKED` that means that you violate these terms and are no longer permitted to use this service. This symbol has no weight and it should not affect any mail processing operations.
