---
layout: doc
title: Getting feedback from users with IMAPSieve
---
# Getting feedback from users with IMAPSieve

The solution is very similar to [Replacing antispam plugin with IMAPSieve](https://doc.dovecot.org/configuration_manual/howto/antispam_with_sieve/),
but instead of automatic learning it is supposed to store a copy of the message moved by user for further manual reviewing.

In the example below when any user moves a message into or from `Junk` folder, a copy  of the message is placed into `report_ham` or `report_spam` folder of `spam@example.com` mailbox respectively. When a message located in `Junk` folder replied to or forwarded, a copy of the message is placed into `report_spam_reply` folder.

## Requirements

pigeonhole `v0.4.14` or later

## Folders

Create `report_ham`, `report_spam` and `report_spam_reply` folders in the `spam@example.com` mailbox.

## Dovecot configuration

`20-imap.conf`:

```sh
protocol imap {
  mail_plugins = $mail_plugins imap_sieve
}
```

`90-plugin.conf`:

```sh
plugin {
  sieve_plugins = sieve_imapsieve sieve_extprograms

  # From elsewhere to Spam folder or flag changed in Spam folder
  imapsieve_mailbox1_name = Junk
  imapsieve_mailbox1_causes = COPY FLAG
  imapsieve_mailbox1_before = file:/usr/local/etc/dovecot/sieve/report-spam.sieve

  # From Spam folder to elsewhere
  imapsieve_mailbox2_name = *
  imapsieve_mailbox2_from = Junk
  imapsieve_mailbox2_causes = COPY
  imapsieve_mailbox2_before = file:/usr/local/etc/dovecot/sieve/report-ham.sieve

  sieve_pipe_bin_dir = /usr/local/libexec/dovecot

  sieve_global_extensions = +vnd.dovecot.pipe
}
```

## Sieve scripts

/usr/local/etc/dovecot/sieve/report-spam.sieve:

```sh
require ["vnd.dovecot.pipe", "copy", "imapsieve", "environment", "imap4flags"];

if environment :is "imap.cause" "COPY" {
    pipe :copy "dovecot-lda" [ "-d", "spam@example.com", "-m", "report_spam" ];
}

# Catch replied or forwarded spam
elsif anyof (allof (hasflag "\\Answered",
                    environment :contains "imap.changedflags" "\\Answered"),
             allof (hasflag "$Forwarded",
                    environment :contains "imap.changedflags" "$Forwarded")) {
    pipe :copy "dovecot-lda" [ "-d", "spam@example.com", "-m", "report_spam_reply" ];
}
```

/usr/local/etc/dovecot/sieve/report-ham.sieve:

```sh
require ["vnd.dovecot.pipe", "copy", "imapsieve", "environment", "variables"];

if environment :matches "imap.mailbox" "*" {
  set "mailbox" "${1}";
}

if string "${mailbox}" [ "Trash", "train_ham", "train_prob", "train_spam" ] {
  stop;
}

pipe :copy "dovecot-lda" [ "-d", "spam@example.com", "-m", "report_ham" ];
```

Compile Sieve scripts:

```sh
# sievec /usr/local/etc/dovecot/sieve/report-spam.sieve
# sievec /usr/local/etc/dovecot/sieve/report-ham.sieve
```

Now copies of e-mail messages should be placed in the `report_ham` and `report_spam` folders of `spam@example.com` mailbox when user moves e-mails between folders. 

## References

- [Replacing antispam plugin with IMAPSieve](https://wiki.dovecot.org/HowTo/AntispamWithSieve)
- [Pigeonhole/Sieve](https://wiki.dovecot.org/Pigeonhole/Sieve)
