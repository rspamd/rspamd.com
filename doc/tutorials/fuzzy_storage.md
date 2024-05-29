---
layout: doc
title: Usage of fuzzy hashes
---

# Usage of fuzzy hashes

[Russian version](./fuzzy_storage.ru.html)

## Introduction

Fuzzy hashing can be used to search for similar messages, allowing us to identify messages with the same or slightly modified text. This technique is particularly useful for blocking spam that is sent to many users simultaneously.

{% include toc.html %}

The purpose of this page is to explain how to use fuzzy hashes, not to provide extensive details or a thorough understanding of how they work within Rspamd. However, the following summary should provide a basic understanding of the content covered on this page.

Textual content is divided into tokens, also known as chunks or shingles, each of which represents a window of text with a certain number of characters. These tokens are then hashed individually and stored. When new email arrives, it is also tokenized and the hashes of these tokens are compared to the stored corpus of data. Calculations based on the position and number of matches are performed to determine if the current email is similar to or identical to previously encountered emails.

For images and other attachments, a single hash is calculated and used to check for an exact match in storage.

Since the hash function is unidirectional, it is not possible to restore the original text using the hashed data. This allows us to send requests to third-party hash storages without the risk of disclosure and to benefit from a larger corpus of data aggregated from various unrelated sources.

The source data for fuzzy hash storage includes both spam and legitimate (non-spam) emails. Fuzzy hashes are used to match emails, not to classify them as spam or non-spam. First, we determine if an email is similar to other emails, and then we evaluate the significance of this similarity separately. The weight assigned to fuzzy hash matches (that is, the measure of how closely the current email matches or does not match content in the pool of many other emails) is just one factor among many in the determination of whether an email is spam or non-spam.

This page is intended for mail system administrators who want to create and maintain their own hash storage and for those who want to understand how rspamd.com serves as a third-party resource. More details can be found in other pages here, including:

- [Fuzzy Check module]({{ site.baseurl }}/doc/modules/fuzzy_check.html)
- [Fuzzy Storage Workers]({{ site.baseurl }}/doc/workers/fuzzy_storage.html)
- [Rspamd.com infrastructure policies]({{ site.baseurl }}/doc/other/usage_policy.html)

----

**There are three high-level steps toward using fuzzy hashes**

- Step 1: Hash sources selection
- Step 2: Configuring storage
- Step 3: Configuring fuzzy_check plugin

**Optional:** Hashes replication  
**Suggested:** Storage testing

----

## Step 1: Hash sources selection

It is important to carefully select the sources of spam samples for training. The general principle is to use spam messages that are received by a large number of users. There are two main approaches to this task:

- working with users complaints
- creating spam traps (honeypot)

### Working with user complaints

User complaints can be a useful source for improving the quality of the hash storage, but it is important to be aware that users may sometimes complain about legitimate emails that they have subscribed to themselves, such as store newsletters, ticket booking notifications, and even personal emails that they do not like for some reason. Many users do not differentiate between the "Delete" and "Mark as Spam" buttons.

One solution to this issue is to prompt the user for additional information about the complaint, such as why they believe the email is spam. This may draw the user's attention to the fact that they can unsubscribe from receiving unwanted emails rather than marking them as spam. Another approach is manual processing of user spam complaints.

A combination of these methods may also be effective: assign greater weight to the emails that have been manually processed and a smaller weight to all other complaints.

There are two features in Rspamd that can help filter out false positives (emails that are mistakenly marked as spam). (Note: In this documentation, FP stands for "False Positive" and FN stands for "False Negative".)

1. Hash weight
2. Learning filters

#### Hash weight

One method to filter out false positives is to assign a weight to each complaint and add this weight to the stored hash value during each subsequent learning step.

When querying the storage, we will ignore hashes with weights that are less than a defined threshold. For example, if the weight of a complaint is `w=1` and the threshold is `t=20`, then we will ignore this hash unless we receive at least 20 user complaints.

Furthermore, Rspamd does not assign the maximum score immediately upon reaching the threshold value. Instead, the score gradually increases from zero to a maximum (up to the metric value) as the weight of the hash increases from the threshold value to twice the threshold value (t .. 2 * t).

<center><img class="img-fluid" src="{{ site.baseurl }}/img/rspamd-fuzzy-1.png" width="50%"></center>

#### Learning filters

The second method for filtering out false positives based on user complaints involves writing conditions in the Lua language that can skip the learning process or modify the value of a hash for emails from specific domains, for example. These filters offer a wide range of possibilities, but they require manual writing and configuration.

### Configuring spam traps 

The "honeypot" method of improving the value of the hash storage involves using a mailbox that only receives spam emails and does not receive legitimate emails. The idea is that a large volume of fresh, guaranteed spam (possibly 100%) will be continually received, following current patterns, providing a vast corpus of fuzzy hash data for comparison with email received by live mailboxes. As mentioned earlier, user interpretation of spam can be somewhat error-prone. A corpus of user-reported spam is not as reliable as a spam trap, where matches are very likely to indicate that a new incoming email is also spam.

One way to set up a spam trap is to expose addresses to spammer databases, but not to legitimate users. This can be done by placing email addresses in a hidden *iframe* element on a popular website, for example. The element is not visible to users due to the *hidden* property or zero size, but it is visible to spam bots. This method is not as effective as it used to be, as spammers have learned how to avoid such traps.

Another way to create a trap is to find domains that were popular in the past but are no longer functional. These domain names can be found in many spam databases. Purchase these domains and allow all incoming mail to go to a catch-all address, where it is processed for fuzzy hashing and then discarded. In general, setting up your own traps like this is only practical for large mail systems, as it can be costly in terms of maintenance and direct expenses such as domain purchases.

----

## Step 2: Configuring storage

The Rspamd process that is responsible for fuzzy hash storage is called the [`fuzzy_storage`]({{ site.baseurl }}/doc/workers/fuzzy_storage.html) worker. The information here should be useful whether you are using local or remote storage.

This process performs the following functions which will be detailed below.

1. Data storage
1. Hash expiration
1. Access control (read and write)
1. Transport protocol encryption
1. Replication

The configuration for the `worker "fuzzy"` section begins in `/etc/rspamd/rspamd.conf`.  
An `.include` directive there links to `/etc/rspamd/local.d/worker-fuzzy.inc`, which is where local settings activate and configure this process. (Earlier documentation referred to `/etc/rspamd/rspamd.conf.local`.)


### Sample configuration

The following is a sample configuration for this fuzzy storage worker process, which will be explained and referred to below. Please refer to [this page]({{ site.baseurl }}/doc/workers/fuzzy_storage.html#configuration) for any settings not profiled here.

~~~hcl
worker "fuzzy" {
  # Socket to listen on (UDP and TCP from rspamd 1.3)
  bind_socket = "*:11335";

  # Number of processes to serve this storage (useful for read scaling)
  count = 4;

  # Backend ("sqlite" or "redis" - default "sqlite")
  backend = "sqlite";

  # sqlite: Where data file is stored (must be owned by rspamd user)
  database = "${DBDIR}/fuzzy.db";

  # Hashes storage time (3 months)
  expire = 90d;

  # Synchronize updates to the storage each minute
  sync = 1min;
}
~~~

This sample shows an entire section, not as you will see it in the file, but as it looks to the controller when the setting details are collected from all files (with the `.include` directive) : Be sure to put changes in the .inc file, without the `worker` wrapper.

By default, the fuzzy_storage process is not active, with the `count=-1` directive found in the core file. To activate fuzzy storage, the local .inc file gets the `count=4` directive as seen above.

The `expire` and `sync` values are related to database cleanup and performance, as described below.

Fuzzy storage works with hashes and not with email messages. A [worker/scanner process](/doc/workers/normal.html) or a [controller process](/doc/workers/controller.html) convert emails to hashes before connecting to this process for fuzzy processing. In this sample, we see the fuzzy storage process that operates on the sqlite database is listening on socket 11335 for UDP requests from the other processes to query or update the storage. 

<center><img class="img-fluid" src="{{ site.baseurl }}/img/rspamd-fuzzy-2.png" width="75%"></center>


### Data storage

The database engine, sqlite3, has some restrictions on the storage architecture that can impact performance. Specifically, sqlite cannot handle concurrent write requests well, which can lead to significant degradation in database performance.

To address this issue, Rspamd hash storage always writes to the database from a single process, the fuzzy storage worker. This process maintains an updates queue, while all other processes simply forward write requests from clients to this process. By default, the updates queue is written to disk once per minute, but this can be configured using the sync setting in the sample configuration.

This architecture is optimized for read requests and prioritizes them.


### Hash expiration

Another important function of the fuzzy storage worker is to remove obsolete hashes using the `expire` setting.

Spam patterns change as certain tactics become more or less effective. Spammers send out blasts of spam and, after a period of time ranging from days to months, they change the patterns because they know systems like this are analyzing their data. Since the "effective lifetime" of spam emails is always limited, there is no reason to store all hashes permanently. Based on experience, it is recommended to store hashes for no longer than about three months.

It is a good idea to compare the volume of hashes learned over a certain period with the available RAM. For example, 400,000 hashes may occupy about 100 MB, and 1.5 million hashes may occupy 500 MB. To avoid a significant performance degradation, it is not recommended to increase the storage size beyond the available RAM size. That is, do not rely on swap space or allocate too many resources to other processes. If you have a small volume of hashes suitable for learning, start with an expiration time of 90 days. If the volume of data over that time period results in an unacceptable amount of available RAM, such as peak-time available RAM going down to 20%, you may want to reduce the expiration time to 70 days and see if expiring data from storage releases a more acceptable amount of RAM.


### Access control

By default, Rspamd does not allow changes to the fuzzy storage. Any system that connects to the fuzzy_storage process via UDP must be authorized, and a list of trusted IP addresses and/or networks must be provided to enable learning. In practice, it is better to write from the local address only (127.0.0.1) because fuzzy storage uses UDP, which is not protected from source IP forgery.

~~~hcl
worker "fuzzy" {
  # Same options as before ...
  allow_update = ["127.0.0.1"];

  # or 10.0.0.0/8, for internal network
}
~~~

The `allow_update` setting is a comma-delimited array of strings, or a [map]({{ site.baseurl }}/doc/modules/multimap.html) of IP addresses, that are allowed to perform changes to fuzzy storage - You should also set `read_only` = no in your fuzzy_check plugin, see step 3 below.


### Transport protocol encryption

The fuzzy hashes protocol allows optional (opportunistic) or mandatory encryption based on public-key cryptography. This feature is useful for creating restricted storages where access is allowed exclusively to customers or other business partners who have a generated public key.

**How this works:**

- The configuration is modified in `/etc/rspamd/local.d/worker-fuzzy.inc` of the local system running the fuzzy_storage worker. One public/private keypair is set for each remote UDP client that will connect on port 11335.
- One unique **public** key is given to each unique client system, so that only that one system can use that one key.

<center><img class="img-fluid" src="{{ site.baseurl }}/img/rspamd-fuzzy-3.png" width="75%"></center>

The encryption architecture uses cryptobox construction: <https://nacl.cr.yp.to/box.html> and it is similar to the algorithm for end-to-end encryption used in the DNSCurve protocol: <https://dnscurve.org/>.

To configure transport encryption, create a keypair for the storage server, using the command `rspamadm keypair -u`. Each time this command is run, unique output is returned, as shown in this example (the order of the name=value pairs may change each time this is run) :

~~~hcl
keypair {
    pubkey = "og3snn8s37znxz53mr5yyyzktt3d5uczxecsp3kkrs495p4iaxzy";
    privkey = "o6wnij9r4wegqjnd46dyifwgf5gwuqguqxzntseectroq7b3gwty";
    id = "f5yior1ag3csbzjiuuynff9tczknoj9s9b454kuonqknthrdbwbqj63h3g9dht97fhp4a5jgof1eiifshcsnnrbj73ak8hkq6sbrhed";
    encoding = "base32";
    algorithm = "curve25519";
    type = "kex";
}
~~~

The  **public** `pubkey` should be copied manually to the remote host, or published in any way that guarantees the reliability (e.g. certified digital signature or HTTPS-site hosting). As always the **private** `privkey` should never be published or shared.

Each storage can use any number of keys simultaneously, one for each remote client (or a group of clients):

~~~hcl
worker "fuzzy" {
  # Same options as before ...
  keypair = [
  {
    pubkey = ...
    privkey = ...
  },
  {
    pubkey = ...
    privkey = ...
  },
  {
    pubkey = ...
    privkey = ...
  }
]
}
~~~

This mechanism is optional, but it can be made mandatory by adding the `encrypted_only` option. In this mode, client systems that do not have a valid public key will be unable to access the storage.

~~~hcl
worker "fuzzy" {
  # Same options as before ...
  encrypted_only = true;

  keypair = [ {
    ...
  } ]
  ...
}
~~~


### Hashes replication

Having a local copy of remote fuzzy storage can be useful in many situations. To facilitate this, Rspamd provides support for hash replication, which is handled by the fuzzy storage worker. Instructions for setting up replication can be found in Step 4 below.

----

## Step 3: Configuring `fuzzy_check` plugin

The `fuzzy_check` plugin is used by scanner processes for querying a storage, and by controller processes for learning fuzzy hashes.

Plugin functions:

1. Email processing and hash creation from email parts and attachments
2. Querying from and learning to storage
3. Transport Encryption

Learning is performing by `rspamc fuzzy_add` command:

```
$ rspamc -f 1 -w 10 fuzzy_add <message|directory|stdin>
```

The `-w` parameter is used to set the hash weight, as mentioned earlier, while the `-f` parameter specifies the flag number.

Flags enable the storage of hashes from different sources. For example, a hash may originate from a spam trap, another hash may be the result of user complaints, and a third hash may come from emails on a whitelist. Each flag can be associated with its own symbol and have a weight when checking emails:

<center><img class="img-fluid" src="{{ site.baseurl }}/img/rspamd-fuzzy-4.png" width="75%"></center>

A symbol name can be used instead of a numeric flag during learning, for example:

```
$ rspamc -S FUZZY_DENIED -w 10 fuzzy_add <message|directory|stdin>
```

The FUZZY_DENIED symbol is equivalent to flag=1, as defined in modules.d/fuzzy_check.conf. To match symbols with the corresponding flags you can use the `rule` section.

local.d/fuzzy_check.conf example:

~~~hcl
rule "local" {
    # Fuzzy storage server list
    servers = "localhost:11335";
    # Default symbol for unknown flags
    symbol = "LOCAL_FUZZY_UNKNOWN";
    # Additional mime types to store/check
    mime_types = ["*"];
    # Hash weight threshold for all maps
    max_score = 20.0;
    # Whether we can learn this storage
    read_only = no;
    # Ignore unknown flags
    skip_unknown = yes;
    # Hash generation algorithm
    algorithm = "mumhash";
    # Use direct hash for short texts
    short_text_direct_hash = true;

    # Map flags to symbols
    fuzzy_map = {
        LOCAL_FUZZY_DENIED {
            # Local threshold
            max_score = 20.0;
            # Flag to match
            flag = 11;
        }
        LOCAL_FUZZY_PROB {
            max_score = 10.0;
            flag = 12;
        }
        LOCAL_FUZZY_WHITE {
            max_score = 2.0;
            flag = 13;
        }
    }
}
~~~

local.d/fuzzy_group.conf example:

~~~hcl
max_score = 12.0;
symbols = {
    "LOCAL_FUZZY_UNKNOWN" {
        weight = 5.0;
        description = "Generic fuzzy hash match";
    }
    "LOCAL_FUZZY_DENIED" {
        weight = 12.0;
        description = "Denied fuzzy hash";
    }
    "LOCAL_FUZZY_PROB" {
        weight = 5.0;
        description = "Probable fuzzy hash";
    }
    "LOCAL_FUZZY_WHITE" {
        weight = -2.1;
        description = "Whitelisted fuzzy hash";
    }
}
~~~

Here are some useful options that can be set in the module:

One option is `max_score`, which specifies the threshold for a hash weight:

<center><img class="img-fluid" src="{{ site.baseurl }}/img/rspamd-fuzzy-1.png" width="50%"></center>

The `mime_types` option specifies which attachment types are checked (or learned) using this fuzzy rule. This option takes a list of valid types in the following format: `["type/subtype", "*/subtype", "type/*", "*"]`, where `*` represents any valid type. In practice, it can be useful to save the hashes for all `application/*` attachments. Texts and embedded images are implicitly checked by `fuzzy_check` plugin, so there is no need to add `image/*` in the list of scanned attachments. Note that attachments and images are searched for an exact match, while texts are matched using the approximate algorithm (shingles).

`read_only` is quite an important option required for storage learning. It is set to `read_only=true` by default, restricting thus a storage's learning:

~~~hcl
read_only = true; # disallow learning
read_only = false; # allow learning
~~~

`Encryption_key` parameter specifies the **public** key of a storage and enables encryption for all requests.

`Algorithm` parameter specifies the algorithm for generating hashes from text parts of emails (for attachments and images [blake2b](https://blake2.net/) is always used).

Initially, rspamd only supported the [siphash](https://en.wikipedia.org/wiki/SipHash) algorithm. However, this algorithm had some performance issues, particularly on older hardware (CPU models up to Intel Haswell). Subsequently, support was added for the following algorithms:

* `mumhash`
* `xxhash`
* `fasthash`

For the vast majority of configurations we recommend `mumhash` or `fasthash` (also called `fast`). These algorithms perform well on a wide range of platforms, and `mumhash` is currently the default for all new storage. `siphash` (also called `old`) is only supported for legacy purposes.

You can evaluate the performance of different algorithms yourself by [compiling the tests set]({{ site.baseurl }}/doc/developers/writing_tests.html) from rspamd sources:

```
$ make rspamd-test
```

Run the test suite of different variants of hash algorithms on a specific platform:

```
test/rspamd-test -p /rspamd/shingles
```

**Important note:** Changing this parameter **will result in losing all data in the fuzzy hash storage**, since only one algorithm can be used for each storage at a time. It is not possible to convert one type of hash to another, as hash functions are designed to be irreversible.

### Condition scripts for the learning

As the `fuzzy_check` plugin is responsible for learning, we create the script within its configuration. This script determines whether an email is suitable for learning. The script should return a Lua function with a single argument of type [`rspamd_task`]({{ site.baseurl }}/doc/lua/rspamd_task.html) type. The function should return a boolean value (`true` to learn, `false` to skip learning), or a pair consisting of a boolean value and a numeric value (to modify the hash flag value, if necessary). Parameter `learn_condition` is used to setup learn script. The most convenient way to set the script is to write it as a multiline string supported by `UCL`:

~~~hcl
# Fuzzy check plugin configuration snippet
learn_condition = <<EOD
return function(task)
  return true -- Always learn
end
EOD;
~~~

Here are some practical examples of useful scripts. For instance, if we want to restrict learning for messages that come from certain domains:

~~~lua
return function(task)
  local skip_domains = {
    'example.com',
    'google.com',
  }

  local from = task:get_from()

  if from and from[1] and from[1]['addr'] then
    for i,d in ipairs(skip_domains) do
      if string.find(from[1]['addr'], d) then
        return false
      end
    end
  end


end
~~~

It can also be useful to split hashes into different flags based on their source. For example, such sources may be encoded in the `X-Source` title. For instance, we have the following match between flags and sources:

* `honeypot` - "black" list: 1
* `users_unfiltered` - "gray" list: 2
* `users_filtered` - "black" list: 1
* `FP` - "white" list: 3

Then the script that provides this logic may be as following:

~~~lua
return function(task)
  local skip_headers = {
    ['X-Source'] = function(hdr)
      local sources = {
        honeypot = 1,
        users_unfiltered = 2,
        users_filtered = 1,
        FP = 3
      }
      local fl = sources[hdr]

      if fl then return true,fl end -- Return true + new flag
      return false
    end
  }

  for h,f in pairs(skip_headers) do
    local hdr = task:get_header(h) -- Check for interesting header
    if h then
      return f(hdr) -- Call its handler and return result
    end
  end

  return false -- Do not learn if specified header is missing
end
~~~

----

## Hashes replication

It is often desired to have a local copy of the remote storage. Rspamd supports replication for this purposes that is implemented in the hashes storage since version 1.3:

<center><img class="img-fluid" src="{{ site.baseurl }}/img/rspamd-fuzzy-5.png" width="75%"></center>

The hashes transfer is initiated by the replication **master**. It sends hash update commands, such as adding, modifying or deleting, to all specified slaves. Therefore, the slaves must be able to accept connections from the master. This should be taken into account when configuring the firewall.

By default, a slave listens on port 11335 over TCP to accept connections. Synchronization between the master and the slave is performed via the HTTP protocol with HTTPCrypt transport encryption. To prevent repeated or invalid updates, the slave checks the update version. If the master's version is less than or equal to the local version, the update is rejected. If the master is ahead of the slave by more than one version, the following message will appear in the slave's log file:

```
rspamd_fuzzy_mirror_process_update: remote revision: XX is newer more than 1 revision than ours: YY, cold sync is recommended
```

In this case we recommend to re-create the database through a "cold" synchronization.

### The "cold" synchronization

This procedure is used to initialize a new slave or to recover a slave after the communications with the master is interrupted.

To synchronize the master host you need to stop rspamd service and create a dump of hash database. In theory, you can skip this step, however, if a version of the master increases by more than one while database cloning, it will be required to repeat the procedure:

```
sqlite3 /var/lib/rspamd/fuzzy.db ".backup fuzzy.sql"
```

Afterwards, copy the output file `fuzzy.sql` to all the slaves (it can be done without stopping rspamd service on the slaves):

```
sqlite3 /var/lib/rspamd/fuzzy.db ".restore fuzzy.sql"
```

After all, you can run rspamd on the slaves and then switch on the master.

### Replication setup

You can set the replication in the hashes storage configuration file, namely `worker-fuzzy.inc`. Master replication is configured as follows:

~~~hcl
# Fuzzy storage worker configuration snippet
# Local keypair (rspamadm keypair -u)
sync_keypair {
    pubkey = "xxx";
    privkey = "ppp";
    encoding = "base32";
    algorithm = "curve25519";
    type = "kex";
}
# Remote slave
slave {
        name = "slave1";
        hosts = "slave1.example.com";
        key = "yyy";
}
slave {
        name = "slave2";
        hosts = "slave2.example.com";
        key = "zzz";
}
~~~

Let’s focus on configuring the encryption keys. Typically, rspamd automatically generates a keypair for clients and does not require any dedicated setup. However, in replication case, the master acts as the client, so you can set a specific (public) key on the slaves for better access control. The slaves will allow updates merely for hosts that are using this key. It is also possible to set allowed IP-addresses of the master, but public key based protection seems to be more reliable. Alternatively, you can combine these methods.

The slave setup looks similar:

~~~hcl
# Fuzzy storage worker configuration snippet
# We assume it is slave1 with pubkey 'yyy'
sync_keypair {
    pubkey = "yyy";
    privkey = "PPP";
    encoding = "base32";
    algorithm = "curve25519";
    type = "kex";
}

# Allow update from these hosts only
masters = "master.example.com";
# Also limit updates to this specific public key
master_key = "xxx";
~~~

To avoid conflicts with local hashes, you can set a flag translation from the master to the slave. For example, the following configuration can be used to translate the flags `1`, `2`, and `3` to `10`, `20`, and `30`, respectively:

~~~hcl
# Fuzzy storage worker configuration snippet
master_flags {
  "1" = 10;
  "2" = 20;
  "3" = 30;
};
~~~


## Storage testing

To test the storage you can use `rspamadm control fuzzystat` command:

```
Statistics for storage 73ee122ac2cfe0c4f12
invalid_requests: 6.69M
fuzzy_expired: 35.57k
fuzzy_found: (v0.6: 0), (v0.8: 0), (v0.9: 0), (v1.0+: 20.10M)
fuzzy_stored: 425.46k
fuzzy_shingles: (v0.6: 0), (v0.8: 41.78k), (v0.9: 23.60M), (v1.0+: 380.87M)
fuzzy_checked: (v0.6: 0), (v0.8: 95.29k), (v0.9: 55.47M), (v1.0+: 1.01G)

Keys statistics:
Key id: icy63itbhhni8
        Checked: 1.00G
        Matched: 18.29M
        Errors: 0
        Added: 1.81M
        Deleted: 0

        IPs stat:
        x.x.x.x
                Checked: 131.23M
                Matched: 1.85M
                Errors: 0
                Added: 0
                Deleted: 0

        x.x.x.x
                Checked: 119.86M
                ...
```

Primarily, a general storage statistics is shown, such as the number of stored and obsolete hashes, and the distribution of requests for client Protocol versions:

* `v0.6` - requests from rspamd 0.6 - 0.8 (older versions, compatibility is limited)
* `v0.8` - requests from rspamd 0.8 - 0.9 (partially compatible)
* `v0.9` - unencrypted requests from rspamd 0.9+ (fully compatible)
* `v1.1` - encrypted requests from rspamd 1.1+ (fully compatible)

And then detailed statistics is displayed for each of the keys configured in the storage and for the latest requested client IP-addresses. In conclusion, we see the overall statistics on IP-addresses.

To change the output from this command, you can use the following options:

* `-n`: display raw numbers without reduction
* `--short`: do not display detailed statistics on the keys and IP-addresses
* `--no-keys`: do not show statistics on keys
* `--no-ips`: do not show statistics on IP-addresses
* `--sort`: sort:
  + `checked`: by the number of trusted hashes (default)
  + `matched`: by the number of found hashes
  + `errors`: by the number of failed requests
  + `ip`: by IP-address lexicographically

e.g.

```
rspamadm control fuzzystat -n
```
