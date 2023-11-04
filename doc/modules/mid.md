---
layout: doc
title: MID module
---

# MID module

The purpose of the MID module is to suppress the `INVALID_MSGID` (malformed Message-ID header) and `MISSING_MID` (missing Message-ID) rules for messages which are DKIM-signed by some particular domains.

## Configuration

The default configuration of this module is shown below:

~~~hcl
mid = {
  url = [
    "${CONFDIR}/mid.inc",
  ]; 
}
~~~

The `url` setting points to a list of maps to check DKIM signatures (& optionally message-ids) against, formatted as follows:

~~~
example.com /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}-0$/
example.net
~~~

With this configuration scoring for `INVALID_MSGID` and `MISSING_MID` symbols is removed if the domain is DKIM-signed `example.net` or the domain is signed `example.com` and the message-id matches the specified regex.
