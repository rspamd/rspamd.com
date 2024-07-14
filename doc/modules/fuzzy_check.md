---
layout: doc
title: Fuzzy check module
---
# Fuzzy check module

The purpose of this module is to verify messages for certain fuzzy patterns that are stored in the
[fuzzy storage workers](../workers/fuzzy_storage.html). At the same time, this module
is responsible for teaching fuzzy storage with message patterns.

## Fuzzy patterns

Rspamd utilizes the `shingles` algorithm to conduct fuzzy matching of messages. This algorithm 
operates in a probabilistic manner by using word chains as patterns, which helps to filter 
out spam or ham messages. A detailed description of the `shingles` algorithm can be found in the
[research paper](https://dl.acm.org/doi/10.5555/283554.283370).

In Rspamd, we employ trigrams (3-grams) for the shingles algorithm, and we use 
a set of hash functions, including siphash, mumhash, and others.
Currently, Rspamd uses 32 hashes for `shingles`.

Note that attachments and images are currently not matched against fuzzy hashes. 
Instead, they are verified by blake2 digests using strict match.

## Module outline
~~~hcl
# local.d/fuzzy_check.conf
fuzzy_check
{
    max_errors = ...; //int: Maximum number of upstream errors; affects error rate threshold
    min_bytes = ...; //int: Minimum number of *bytes* to check a non-text part
    min_height = ...; //int: Minimum pixel height of embedded images to check using fuzzy storage
    min_length = ...; //int: Minimum number of *words* to check a text part
    min_width = ...; //int: Minimum pixel width of embedded images to check using fuzzy storage
    retransmits = ...; //int: Maximum number of retransmissions for a single request
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
~~~hcl
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


A fuzzy `rule` is defined as a set of `rule` definitions. Each `rule` is required to have a `servers` list for checking or teaching (training), along with a set of flags and optional parameters. 

The `servers` parameter defines [upstream]({{ site.baseurl }}/doc/configuration/upstream.html) object that can be configured to rotate or shard as needed. Sharding is performed based on the hash value itself.

The available parameters include:

- `algorithm`: rule hashing algo; one of: `fasthash` (or just `fast`), `mumhash`, `siphash` (or `old`) or `xxhash`. The default value is `mumhash` currently.
- `encryption_key`: Base32 value public key to perform wire encryption
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

~~~hcl
# local.d/fuzzy_check.conf
...
rule "FUZZY_CUSTOM" {
  # List of servers. Can be an array or multi-value item
  servers = "127.0.0.1:11335";

  # List of additional mime types to be checked in this fuzzy ("*" for any)
  mime_types = ["application/*"];

  # Maximum global score for all maps combined
  max_score = 20.0;

  # Ignore flags that are not listed in maps for this rule
  skip_unknown = yes;

  # If this value is false (i.e. no), then allow learning for this fuzzy rule
  read_only = no;

  # Fast hash type
  algorithm = "mumhash";
  # This is used for binary parts and for text parts (size in bytes)
  min_bytes = 1024;
  # Text parts only: minimum number of words
  min_length = 64;
  # Divide min_bytes by 4 for texts
  text_multiplier = 4.0,

  # Minimum dimensions for images (in pixels)
  min_height = 500;
  min_width = 500;

  # Scan all archives mime parts (e.g. zip attachments)
  scan_archives = true;
  # If part has num words < min_length, use direct hash instead of fuzzy
  short_text_direct_hash = true;

  # Apply fuzzy logic for text parts
  text_shingles = true;
  # Skip images if needed
  skip_images = false;
}
...
~~~

Each `rule` can have several `fuzzy_map` values, ordered by an ordinal `flag` value. A single
fuzzy storage can contain both good and bad hashes that should have different symbols,
and thus, different weights. To accommodate these varying needs, multiple `fuzzy_maps` 
can be defined within a fuzzy `rule`, as follows:

~~~hcl
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

Based on the information provided above, we can deduce that email messages accumulating 
a `max_score` above 20.0 will be assigned the `FUZZY_DENIED` mapping, thus being categorized as spam.

However, the concept of `max_score` can be somewhat ambiguous. It's important to note that all hashes 
in the fuzzy storage have individual weights. For instance, if we have a hash `A` that has been marked 
as spam by 100 users, then its weight will be `100 * single_vote_weight`. 
Consequently, if the `single_vote_weight` is `1`, the final weight will be `100`.

In the context of fuzzy rules, `max_score` refers to the weight that must be achieved by a rule in order 
for it to add its symbol to the maximum score of 1.0 (which is then multiplied by the `metric` value's weight). 
For example, if the weight of a hash is `100` and the `max_score` is set to `20`, then the rule will be added 
with a weight of `1`. However, if the `max_score` is set to `200`, the rule will be added with a weight 
likely calculated through hyperbolic tangent as `0.2`.

In the following configuration:

~~~hcl
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

Module `fuzzy_check` is not only able to check messages for fuzzy patterns, but it can also learn from them. 
To accomplish this, you can use the `rspamc` command or connect to the **controller** worker using HTTP protocol. 
For learning, you must check the following settings:

1. Controller worker should be accessible by `rspamc` or HTTP (check `bind_socket`)
2. Controller should allow privileged commands for this client (check `enable_password` or `secure_ip` settings)
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

By default, `rspamd.com` feeds are enabled. However, if you decide to use these feeds, 
it's important to ensure that you comply with the [**free usage policy**]({{ site.baseurl }}/doc/other/usage_policy.html). 
Failure to do so may result in being blocked from using the service. In such cases, the special `FUZZY_BLOCKED` symbol 
will be assigned to the messages in question. It's worth noting that this symbol has no weight and will not affect any mail processing operations.
