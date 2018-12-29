---
layout: doc
title: Spamtrap module
---
# Spamtrap module

With the spamtrap module you can catch spam trapped emails or even a catch-all domain.
It is intended for learning bayes spam and, if you run your own fuzzy storage, for learning
a fuzzy flag with a fuzzy weight. You can also add a score for this symbol in the metrics,
if you only want to tag such emails. You can use this later in other modules like
force_actions or metadata_exporter. Examples will be given below.

## Spamtrap setup

The spamtrap plugin may either use a map containing regular expressions that represent
email addresses or domains, or Redis, where addresses are stored as keys and values can
be anything. You can use one or the other method. By setting a map parameter, Redis is
automatically turned off.

To use Redis - [see here]({{ site.baseurl }}/doc/configuration/redis.html) for information about configuring Redis.

An example of a map is hown below.

### Module settings

Parameters for the spamtrap modules are listed here.

- `action`: You can optionally set an action
- `symbol`: The name of a symbol that will be inserted, if a match between
  recipient and a spam trapped email/domain was found. Defaults to 'SPAMTRAP'
- `score`: The score for this symbol. It defaults to neutral 0.0
- `learn_fuzzy`: A boolean that enables or disables fuzzy learning. Defaults to
  'false'
- `learn_spam`: A boolean that enables or disables bayes spam learning. Defaults
  to 'false'
- `fuzzy_flag`: Fuzzy flag, which must match with a defined flag in fuzzy_check
  for a 'denied' rule
- `fuzzy_weight`: A weight factor for the fuzzy rule. It defaults to 10.0
- `key_prefix`: The Redis prefix which is used to find spamtrap records. It
  defaults to 'sptr\_'
- `map`: You can define a regexp map, which automatically disables Redis for
  this module
- `check_authed`: A boolean that enables spamtrap checks for authenticated users. Defaults to 'true'
- `check_local`: A boolean that enables spamtrap checks for local networks. Defaults to 'true'


Configuration example `/etc/rspamd/local.d/spamtrap.conf`:

~~~ucl
action = "no action";
score = 1.0;
learn_fuzzy = true;
learn_spam = true;
map = file://$LOCAL_CONFDIR/maps.d/spamtrap.map;

enabled = true;
~~~

An example of a map file is:

~~~text
/^test@example\.test$/
/^.*@catchalldomain.test$/
~~~

The first is a full email address, while the second is a catch-all domain.

### Advanced: settings_redis example

The following is an example that you can use for the spamtrap module. It will look
in Redis and collect settings for dealing with spam trapped emails or domains. You
can place this in `/etc/rspamd/rspamd.conf.local`:

~~~ucl
# Return spamtrap e-mail addresses from Redis
settings_redis {
        handlers = {
                SPAMTRAP = <<EOD
return function(task)
        local rcpt = task:get_recipients('smtp')
        if not (rcpt and #rcpt == 1) then
                return
        end
        return 'sptr_' .. rcpt[1]['addr']:lower()
end
EOD;
                SPAMTRAP_DOMAIN = <<EOD
return function(task)
        local rcpt = task:get_recipients('smtp')
        if not (rcpt and #rcpt == 1) then
                return
        end
        return 'sptr_' .. '@' .. rcpt[1]['domain']:lower()
end
EOD;
        }
}
~~~

### Advanced: Adding emails and domains to Redis

There are several way to add emails or domains to the Redis store. One would be to add
it directly with the 'redis-cli'. But if you have more than one entry to add, a simple
shell script will help you:

~~~bash
#!/bin/bash

spamtrap_emails=(
    "@some-catchall.test"
    "address1@example.test"
    "another@foobar.test"
)

for name in ${spamtrap_emails[@]}; do
    echo -n "$name: "
    redis-cli SET \
        "sptr_$name" \
        '{ groups_disabled = ["rbl", "antivirus", "dkim", "spf", "dmarc"]; }'
done

exit 0
~~~

We disable certain groups here, as we can speed up tests. We do not ask for RBLs, checking
for viruses or doing some kind of SPF, DKIM and DMARC tests, as most of the spam trapped
emails would already be caught by these rules. Our goal is primarily on learning fuzzy and
bays spam, so we skip these tests. Feel free to add whatever you want.
