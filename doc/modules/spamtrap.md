---
layout: doc_modules
title: Spamtrap module
---
# Spamtrap module

With the spamtrap module you can catch spam trapped emails or even a catch-all domain.
It is intended for learning bayes spam and, if you run your own fuzzy storage, for learning
a fuzzy flag with a fuzzy weight. You can also add a score for this symbol in the metrics,
if you only want to tag such emails. You can use this later in other modules like
force_actions or metadata_exporter. Examples will be given below.

## Spamtrap setup

Spamtrap currently requires redis being configured and used. The idea is to add all your
spamtrap emails or domains to redis including several settings that you can combine with the
settings redis module.

### Module settings

Parameters for the spamtrap modules are listed here.

- `symbol`: The name of a symbol that will be inserted, if a match between
  recipient and a spam trapped email/domain was found. Defaults to 'SPAMTRAP'
- `score`: The score for this symbol. It defaults to neutral 0.0
- `learn_fuzzy`: Boolean that enables or disables fuzzy learning. Defaults to
  'false'
- `learn_spam`: Boolean that enables or disables bayes spam learning. Defaults
  to 'false'
- `fuzzy_flag`: Fuzzy flag, which must match with a defined flag in fuzzy_check
  for a 'denied' rule
- `fuzzy_weight`: A weight factor for the fuzzy rule. It defaults to 10.0
- `key_prefix`: The redis prefix which is used to find spamtrap records. It
  defaults to 'sptr_'

### settings_redis example

The following is an example that you can use for the spamtrap module. It will look
in redis and collect settings for dealing with spam trapped emails or domains. You
can place this in /etc/rspamd/rspamd.conf.local:

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
        }
}
~~~

### Adding emails and domains to redis

There are several way to add emails or domains to the redis store. One would be to add
it directly with the redis-cli. But if you have more than one entry to add, a simple
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
emails would already be catched by these rules. Our goal is primarly on learning fuzzy and
bays spam, so we skip these tests. Feel free to add whatever you want.

### Optional using force_actions

How do you deal with spam trapped emails, after you have identified them? One way was to
discard them in your MTA setup. Or you could send them using the metadata_exporter module.
Another way is to accept these emails and deleiver it to a spamtrap mailbox, where you can
review the original mail.

In all these cases, you want to accept the email in Rspamd by forcing a 'no action'. The following
example demonstrates a rule that will do the job. You can create it in 
/etc/rspamd/local.d/force_actions.conf:

~~~ucl
rules {
    SPAMTRAP_ALLOW {
        action = "no action";
        expression = "SPAMTRAP";
    }
}
~~~
