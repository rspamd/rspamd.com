---
layout: doc
title: Usage of fuzzy hashes
---

# Usage of fuzzy hashes

[Russian version](./fuzzy_storage.ru.html)

## Introduction

Fuzzy hashes are used to search for similar messages – i.e. they help us to find messages with the same or slightly modified text. This technology is well-suited to blocking spam that is simultaneously sent to many users.

<div id="toc" markdown="1">
  <h2 class="toc-header">Contents</h2>
  * TOC
  {:toc}
</div>

The intent of this page is to explain how to use fuzzy hashes, not to provide extended details and nuances of what fuzzy hashes are or how they work within Rspamd. However the following summary provides a base understanding for the content of this page.

Textual content is broken down into tokens (also known as chunks or shingles). Each token represents a "window" of text of some number of characters. These tokens are then individually hashed and stored. When new email arrives, it is similarly tokenized, each token is hashed, and this new collection of hashes is compared to the corpus of data in storage. Calculations are performed based on the position and number of matches, to determine if the current mail item is similar to or identical to previously encountered mail items.

For images and other attachment types, a single hash is calculated and that hash is used to check for an exact match in storage.

Since the hash function is unidirectional, it is impossible to restore the original text using the hashed data. This allows us the option to send requests to third-party hash storages without risk of disclosure, and to benefit from a much larger corpus of data aggregated from any number of unrelated sources.

The source data for fuzzy hash storage includes both spam and ham. Fuzzy hashes are used to match, not to classify messages. First, we see if an email looks like other emails, then, separately, we evaluate what that similarity means. The weight assigned to fuzzy hash matches (that is, the measure of how the current email item matches or does not match content in the pool of many other email items) is only one factor of many in the determination of ham versus spam.

This page is intended for mail system administrators who wish to create and maintain their own hash storage, and for those who wish to understand how rspamd.com serves as such a third-party resource. More details can be found in other pages here, including:

- [Fuzzy Check module]({{ site.baseurl }}/doc/modules/fuzzy_check.html)
- [Fuzzy Collection module]({{ site.baseurl }}/doc/modules/fuzzy_collect.html)
- [Fuzzy Storage Workers]({{ site.baseurl }}/doc/workers/fuzzy_storage.html)
- [Rspamd.com infrastructure policies]({{ site.baseurl }}/doc/usage_policy.html)

----

**There are three high-level steps toward using fuzzy hashes**

- Step 1: Hash sources selection
- Step 2: Configuring storage
- Step 3: Configuring fuzzy_check plugin

**Optional:** Hashes replication  
**Suggested:** Storage testing

----

## Step 1: Hash sources selection

It is important to choose the sources of spam samples to learn on. The basic principle is to use spam messages that are received by a lot of users. There are two main approaches to this task:

- working with users complaints
- creating spam traps (honeypot)

### Working with user complaints

User complaints can be used as an effective source for improving the quality of the hash storage. Unfortunately, users sometimes complain about legitimate mailings they’ve subscribed on to by themselves, for example: stores newsletters, notifications from ticket bookings, and even personal emails which they do not like for some reason. Many users simply do not see the difference between "Delete" and "Mark as Spam" buttons.

Perhaps, a good idea would be to prompt a user for additional information about the complaint, for example, why he or she decided that it is a spam email. This may draw the user's attention to the fact that they should unsubscribe from receiving requested mailings rather than marking them as spam. Another way to solve this problem is manual processing of user spam complaints.

A combination of these methods might also work: assign greater weight to the manually processed emails, and a smaller one for all other complaints.

There are two features in Rspamd that allow for filtering out some false positives. (Tip: The abbreviation FP in this documentation means "False Positive", and FN means "False Negative".)

1. Hash weight
2. Learning filters

#### Hash weight

The first method to filter out false positives is pretty simple: let's assign some weight to each complaint, and then add this weight to the stored hash value for each subsequent learning step.

When querying a storage we will not consider hashes with weights that are less than a defined threshold. For instance, if the weight of a complaint is `w=1` and the threshold is `t=20`, then we ignore this hash unless receiving at least 20 user complaints.

In addition, Rspamd does not assign the maximum score finding a threshold value - scores gradually increases from zero to a maximum (up to metric value) when the weight of hash grows up to the threshold value multiplied by two (t .. 2 * t).

<center><img class="img-responsive" src="{{ site.baseurl }}/img/rspamd-fuzzy-1.png" width="50%"></center>

#### Learning filters

The second method to filter out false positives, as reported through user complaints, allows you to write certain conditions that can skip learning or change a value of a hash, for instance, for emails from a specific domain. Such filters are written in the Lua language. The possibilities for these filters are quite extensive. However, they require manual writing and configuring.

### Configuring spam traps

This "honey pot" method of improving the value of a hash storage requires a mailbox that doesn't receive legitimate emails - it should only receive spam emails. The main idea here is that a large volume of fresh, (perhaps 100%) guaranteed spam will be continually received, following current patterns, providing a huge corpus of fuzzy hash data for comparison with email coming in to live mailboxes. As described above, user interpretation of spam is subject to some degree of error. A corpus of user-described spam is not as reliable as a spam trap, where matches are very highly likely to indicate that a new inbound mail item is also spam. 

One way to configure a spam trap is to expose addresses to spammer databases, and not show them to legitimate users. This can be accomplished, for example, by putting email addresses in a hidden *iframe* element on a fairly popular website. This element is not visible to users due to the *hidden* property or zero size, but it is visible to spam bots. This method is not as effective as it was some years ago, as spammers have learnt how to avoid such traps.

Another way to create a trap is to find domains that were popular in the past but that are no longer functional. Domain names like this can be found in many spam databases. Buy domains and allow all inbound mail to go to a catch-all address, where it is processed for fuzzy hashing and then purged. In general, setting your own traps like this is only reasonable for large mail systems, as it might be expensive both in terms of maintenance and with direct expenses like domain purchases.

----

## Step 2: Configuring storage

The Rspamd process that is responsible for fuzzy hash storage is called the [`fuzzy_storage`]({{ site.baseurl }}/workers/fuzzy_storage.html) worker. The information here should be useful whether you are using local or remote storage.

This process performs the following functions which will be detailed below.

1. Data storage
1. Hash expiration
1. Access control (read and write)
1. Transport protocol encryption
1. Replication

The configuration for the `worker "fuzzy"` section begins in `/etc/rspamd/rspamd.conf`.  
An `.include` directive there links to `/etc/rspamd/local.d/worker-fuzzy.inc`, which is where local settings activate and configure this process. (Earlier documentation referred to `/etc/rspamd/rspamd.conf.local`.)


### Sample configuration

The following is a sample configuration for this fuzzy storage worker process, which will be explained and referred to below. Please refer to [this page]({{ site.baseurl }}/workers/fuzzy_storage.html#configuration) for any settings not profiled here.

~~~ucl
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

<center><img class="img-responsive" src="{{ site.baseurl }}/img/rspamd-fuzzy-2.png" width="75%"></center>


### Data storage

The database engine, namely sqlite3, imposes some restrictions on the storage architecture. The most important concern is that sqlite cannot deal well with concurrent write requests. This translates to database performance being degraded significantly.

To manage this, Rspamd hash storage always writes to the database strictly from one process, the fuzzy storage worker. This one process maintains the updates queue whilst all other processes simply forward write requests from clients to this process. The updates queue is written to disk once per minute by default, configurable with the `sync` setting seen in the sample.

This architecture is optimized with priority given to read requests.


### Hash expiration

Another major function of the fuzzy storage worker is to remove obsolete hashes, using the `expire` setting, above.

Spam patterns change as tactics are found to be more or less successful. Blasts of spam go out, and after some period of time, anywhere from days to months, spammers change the patterns, because they know systems like this are operating on their data. Since the "effective lifetime" of spam mailings is always limited, there is no reason to store all hashes permanently. Therefore, based on experiemce, it recommended to store the hashes for no longer than about three months.

It would be prudent to compare the volume of hashes learned over some time with available RAM. For example, 400 thousands hashes may occupy about 100 Mb and 1.5 million hashes may occupy 0.5 Gb. It is not recommended to increase storage size more than the available RAM size due to a significant performance degradation. That is, don't rely on swap space, and don't choke other processes for resources. If you have a small volume of hashes suitable for learning, start with an expiration time of 90 days. Tune that down if the volume of data over that time period results in an unsuitable amount of available RAM - for example, if peak-time available RAM goes down to 20%, reduce the expiration time to 70 days, and see if data expiring from storage releases a more acceptable amount of RAM.


### Access control

Rspamd does not allow changes to fuzzy storage by default. Any system connecting via UDP to the fuzzy_storage process must be authorized. A list of trusted IP-addresses and/or networks must be provided to make learning possible. Practically, it is better to write from the local address only (127.0.0.1) since fuzzy storage uses UDP that is not protected from source IP forgery.

~~~ucl
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

<center><img class="img-responsive" src="{{ site.baseurl }}/img/rspamd-fuzzy-3.png" width="75%"></center>

The encryption architecture uses cryptobox construction: <https://nacl.cr.yp.to/box.html> and it is similar to the algorithm for end-to-end encryption used in the DNSCurve protocol: <https://dnscurve.org/>.

To configure transport encryption, create a keypair for the storage server, using the command `rspamadm keypair -u`. Each time this is run, unique output is returned as seen in this example (the order of the name=value pairs may change each time this is run) :

~~~ucl
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

~~~ucl
worker "fuzzy" {
  # Same options as before ...
  keypair {
    pubkey = ...
    privkey = ...
  }
  keypair {
    pubkey = ...
    privkey = ...
  }
  keypair {
    pubkey = ...
    privkey = ...
  }
}
~~~

This mechanism is optional unless explicitly made mandatory. To enable mandatory encryption mode, add the `encrypted_only` option. In this mode, client systems that do not use a valid public key will not able to access the storage.

~~~ucl
worker "fuzzy" {
  # Same options as before ...
  encrypted_only = true;

  keypair {
    ...
  }
  ...
}
~~~


### Hashes replication

It is often desirable to have a local copy of remote fuzzy storage. For this, Rspamd supports hash replication, which is managed by the fuzzy storage worker. Details for replication setup are below in Step 4.

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

The `-w` parameter is for setting the hash weight discussed above, whilst the `-f` parameter specifies the flag number.

Flags allows for storage of hashes from different origins. For example, one hash may originate from a spam trap, another hash may originate from user complaints, and other hash may originate from emails that come from a whitelist. Each flag may be associated with its own symbol, and have a weight while checking emails:

<center><img class="img-responsive" src="{{ site.baseurl }}/img/rspamd-fuzzy-4.png" width="75%"></center>

A symbol name can be used instead of a numeric flag during learning, for example:

```
$ rspamc -S FUZZY_DENIED -w 10 fuzzy_add <message|directory|stdin>
```

The FUZZY_DENIED symbol is equivalent to flag=1, as defined in modules.d/fuzzy_check.conf. To match symbols with the corresponding flags you can use the `rule` section.

local.d/fuzzy_check.conf example:

~~~ucl
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

~~~ucl
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

Let’s discuss some useful options that could be set in the module.

Firstly, `max_score` specifies the threshold for a hash weight:

<center><img class="img-responsive" src="{{ site.baseurl }}/img/rspamd-fuzzy-1.png" width="50%"></center>

Another useful option is `mime_types` that specifies what attachments types are checked (or learned) using this fuzzy rule. This parameter contains a list of valid types in format: `["type/subtype", "*/subtype", "type/*", "*"]`, where `*` matches any valid type. In practice, it is quite useful to save the hashes for all `application/*` attachments. Texts and embedded images are implicitly checked by `fuzzy_check` plugin, so there is no need to add `image/*` in the list of scanned attachments. Please note that attachments and images are searched for the exact match whilst texts are matched using the approximate algorithm (shingles).

`read_only` is quite an important option required for storage learning. It is set to `read_only=true` by default, restricting thus a storage's learning:

~~~ucl
read_only = true; # disallow learning
read_only = false; # allow learning
~~~

`Encryption_key` parameter specifies the **public** key of a storage and enables encryption for all requests.

`Algorithm` parameter specifies the algorithm for generating hashes from text parts of emails (for attachments and images [blake2b](https://blake2.net/) is always used).

Initially, rspamd only supported the [siphash](https://en.wikipedia.org/wiki/SipHash) algorithm. However, that had some performance issues, especially on obsolete hardware (CPU models through to Intel Haswell). Support was later added for the following algorithms:

* `mumhash`
* `xxhash`
* `fasthash`

For the vast majority of configurations we recommend `mumhash` or `fasthash` (also called `fast`). These perform excellently on a wide variety of platforms, and `mumhash` is the current default for all new storage. `siphash` (also called `old`) is only supported for legacy purposes.

You can evaluate the performance of different algorithms yourself by [compiling the tests set]({{ site.baseurl }}/doc/tutorials/writing_tests.html) from rspamd sources:

```
$ make rspamd-test
```

Run the test suite of different variants of hash algorithms on a specific platform:

```
test/rspamd-test -p /rspamd/shingles
```

**Important note:** Changing this parameter **will result in losing all data in the fuzzy hash storage**, as only one algorithm can be used simultaneously for each storage. Conversion of one type of hash to another is impossible by design, as a hash function cannot be reversed.

### Condition scripts for the learning

As the `fuzzy_check` plugin is responsible for learning, we create the script within its configuration. This script checks if a email is suitable for learning. Script should return a Lua function with exactly one argument of [`rspamd_task`]({{ site.baseurl }}/doc/lua/rspamd_task.html) type. This function should return either a boolean value: `true` - learn, `false` - skip learning, or a pair of a boolean value and numeric value - new flag value in case it is required to modify the hash flag. Parameter `learn_condition` is used to setup learn script. The most convenient way to set the script is to write it as a multiline string supported by `UCL`:

~~~ucl
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

Also, it is useful to split hashes to various flags in accordance with their source. For example, such sources may be encoded in the `X-Source` title. For instance, we have the following match between flags and sources:

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

<center><img class="img-responsive" src="{{ site.baseurl }}/img/rspamd-fuzzy-5.png" width="75%"></center>

The hashes transfer is initiated by the replication **master**. It sends hash update commands, such as adding, modifying or deleting, to all specified slaves. Hence, the slaves should be able to accept such a connection from the master - it should be considered while configuring a firewall.

A slave normally listens on the same port 11335 (by default) over TCP to accept a connection. The master and the slave synchronization are occurred via the HTTP protocol with HTTPCrypt transport encryption. The slave checks the update version to prevent repeated or invalid updates. If the master's version is less or equal to the local one, then the update is rejected. But if the master is ahead of the slave for  more than one version, the following message will appear in the log file of the slave:

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

~~~ucl
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

Let’s focus on configuring the encryption keys. Typically, rspamd does not require dedicated setup for a client's keypair as such a keypair is generated automatically. However, in replication case, the master acts as the client, so you can set a specific (public) key on the slaves for better access control. The slaves will allow updates merely for hosts that are using this key. It is also possible to set allowed IP-addresses of the master, but public key based protection seems to be more reliable. As an option, you can combine these methods.

The slave setup looks similar:

~~~ucl
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

It is possible to set a flag translation from the master to the slave in order to avoid conflicts with the local hashes. For example, if we want to translate the flags `1`, `2` and `3` to the flags `10`, `20` and `30` accordingly, we can use the following configuration:

~~~ucl
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

Primarily, a general storage statistics is shown, namely the number of stored and obsolete hashes, as well as the requests distribution for versions of the client Protocol:

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
