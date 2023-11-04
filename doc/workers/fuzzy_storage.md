---
layout: doc
title: Fuzzy storage worker
---
# Fuzzy storage worker

Fuzzy storage worker is intended to store fuzzy hashes of messages.

## Protocol format

Fuzzy storage accepts requests using `UDP` protocol with the following structure:

~~~C
struct fuzzy_cmd  { /* attribute(packed) */
	unit8_t version;        /* command version, must be 0x2 */
	unit8_t cmd;            /* numeric command */
	unit8_t shingles_count; /* number of shingles */
	unit8_t flag;           /* flag number */
	int32_t value;          /* value to store */
	uint32_t tag;           /* random tag */
	char digest[64];        /* blake2b digest */
};
~~~

All numbers are in host byte order, so if you want to check fuzzy hashes from a
host with a different byte order, you need some additional conversions (not currently
supported by rsp.html). In the future, rspamd might use little-endian byte order for all
operations.

Fuzzy storage accepts the following commands:
- `FUZZY_CHECK` - check for a fuzzy hash
- `FUZZY_ADD` - add a new hash
- `FUZZY_DEL` - remove a hash

The `flag` field is used to store different hashes in a single storage. For example,
it allows storing blacklists and whitelists in the same fuzzy storage worker.
A client should set the `flag` field when adding or deleting hashes and check it
when querying for a hash.

The `value` is added to the currently stored value of a hash if that hash has been found.
This field can handle negative numbers as well.

The `tag` is used to distinguish requests by a client. Fuzzy storage just sets this
field in the reply equal to the value in the request.

The `digest` field contains the content of the hash. Currently, rspamd uses the `blake2b` hash
in its binary form, providing `2^512` possible hashes with negligible collision
probability. At the same time, rspamd saves the legacy format of fuzzy hashes by
means of this field. Old rspamd can work with legacy hashes only.

The `shingles_count` defines how many `shingles` are attached to this command.
Currently, rspamd uses 32 shingles, so this value should be set to 32 for commands
with shingles. Shingles should be included in the same packet and follow the command as
an array of int64_t values. Please note that rspamd rejects commands that have the wrong
shingle count or if their size is not equal to the desired one:

```
sizeof(fuzzy_cmd) + shingles_count * sizeof(int64_t)
```

The reply format of fuzzy storage is also presented as a structure:

~~~C
struct fuzzy_cmd  { /* attribute(packed) */
	int32_t value;
	uint32_t flag;
	uint32_t tag;
	float prob;
};
~~~

`prob` field is used to store the probability of match. This value is changed from
`0.0` (no match) to `1.0` (full match).

## Storage format

Rspamd's fuzzy storage uses `sqlite3` for storing hashes. All update operations are
performed in a transaction, which is committed to the main database approximately once
per minute. The `VACUUM` command is executed on startup, and hash expiration is performed
when the rspamd fuzzy storage worker terminates.

Here is the internal database structure:

```
CREATE TABLE digests(id INTEGER PRIMARY KEY,
	flag INTEGER NOT NULL,
	digest TEXT NOT NULL,
	value INTEGER,
	time INTEGER);

CREATE TABLE shingles(value INTEGER NOT NULL,
	number INTEGER NOT NULL,
	digest_id INTEGER REFERENCES digests(id) ON DELETE CASCADE ON UPDATE CASCADE);
```

Since rspamd uses normal sqlite3 you can use all tools for working with the hashes
database to perform, for example backup or analysis.

## Operation notes

To check a hash, rspamd fuzzy storage initially queries for a direct match using
the `digest` field as a key. If that match succeeds, the value is returned immediately.
Otherwise, if a command contains shingles, then rspamd checks for a fuzzy match by attempting
to find the value for each shingle. If more than 50% of the shingles match the same digest,
rspamd returns that digest's value along with the probability of the match, which generally
equals `match_count / shingles_count`.

## Configuration

Fuzzy storage accepts the following extra options:

- `hashfile` - path to the sqlite storage (where are also few outdated aliases for this command exist: hash_file, file, database)
- `backend` - set it to `redis` if you want to use a redis server
- `sync` - time to perform database sync in seconds, default value: 60
- `expire` - time value for hashes expiration in seconds, default value: 2 days
- `keypair` - encryption keypair (can be repeated for different keys), can be obtained via *rspamadm keypair -u* command
- `keypair_cache_size` - Size of keypairs cache, default value: 512
- `encrypted_only` - allow encrypted requests only (and forbid all unknown keys or plaintext requests)
- `master_timeout` - master protocol IO timeout
- `sync_keypair` - encryption key for master/slave updates
- `masters` - string, allow master/slave updates from the following IP addresses
- `master_key` - allow master/slave updates merely using the specified key
- `slave` - list of slave hosts.
- `mirror` - list of slave hosts, same as `slave`
- `allow_update` - string, array of strings or a map of IP addresses that are allowed
to perform changes to fuzzy storage (you should also set `read_only = no` in your fuzzy_check plugin).

Here is an example configuration of fuzzy storage:

~~~hcl
worker "fuzzy" {
   bind_socket = "*:11335";
   hashfile = "${DBDIR}/fuzzy.db"
   expire = 90d;
   allow_update = ["127.0.0.1", "::1"];
}
~~~

## Compatibility notes

Rspamd fuzzy storage version `0.8` is compatible with rspamd clients of all versions.
However, all updates from legacy versions (less than `0.8`) won't update the fuzzy shingles
database. The Rspamd [fuzzy check module](../modules/fuzzy_check.html) can work **only**
with the recent rspamd fuzzy storage and won't retrieve anything from the legacy storages.
