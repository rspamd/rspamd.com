---
layout: doc
title: Spamtrap module
---
# Spamtrap module

The spamtrap module enables you to catch trapped spam emails, and even those from a catch-all domain. Its main purpose is to facilitate learning bayes spam, and if you operate your own fuzzy storage, to learn a fuzzy flag with a fuzzy weight. If you only wish to tag these emails, you may add a score for this symbol in the metrics. Later on, you can use this information in other modules, such as force_actions or metadata_exporter. Some examples are provided below.

## Spamtrap setup

The spamtrap plugin can utilise either a map comprising regular expressions representing email addresses or domains, or Redis, where addresses are stored as keys with values that can take any form. You may opt to use either method. When specifying a map parameter, Redis is automatically disabled.

To use Redis - [see here]({{ site.baseurl }}/doc/configuration/redis.html) for information about configuring Redis.

An example of a map is shown below.

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
map = file://$LOCAL_CONFDIR/local.d/maps.d/spamtrap.map;

enabled = true;
~~~

An example of a map file is:

~~~text
/^test@example\.test$/
/^.*@catchalldomain\.test$/
~~~

The first is a full email address, while the second is a catch-all domain.

## User settings

Please see [settings module documentation]({{ site.baseurl }}/doc/configuration/settings.html) for more information about using this module; some examples are provided below for convenience.

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

There are various methods to add emails or domains to the Redis store. One approach would be to add them directly through 'redis-cli'. However, if you need to add multiple entries, a straightforward shell script could be useful:

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

We disable specific groups to expedite testing. We do not request RBLs, check for viruses, or perform SPF, DKIM, and DMARC tests, as the majority of trapped spam emails would have already been identified by these rules. Our primary aim is to learn about fuzzy and bayes spam, hence these tests are omitted. You are welcome to include any other tests you deem appropriate.
