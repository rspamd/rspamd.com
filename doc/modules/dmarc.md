---
layout: doc
title: DMARC module
---
# DMARC module

DMARC is a technology leveraging SPF & DKIM which allows domain owners to publish policies regarding how messages bearing
their domain in the RFC5322.From field should be handled (for example to quarantine or reject messages which do not have an
aligned DKIM or SPF identifier) and to elect to receive reporting information about such messages (to help them identify
abuse and/or misconfiguration and make informed decisions about policy application).

## DMARC in rspamd

The default configuration for the DMARC module in rspamd is an empty collection:

~~~ucl
dmarc {
}
~~~

This is enough to enable the module and check/apply DMARC policies.

Symbols added by the module are as follows:

- `DMARC_BAD_POLICY`: Policy was invalid or multiple policies found in DNS
- `DMARC_NA`: Domain in From header has no DMARC policy or From header is missing
- `DMARC_POLICY_ALLOW`: Message was authenticated & allowed by DMARC policy
- `DMARC_POLICY_REJECT`: Authentication failed- rejection suggested by DMARC policy
- `DMARC_POLICY_QUARANTINE`: Authentication failed- quarantine suggested by DMARC policy
- `DMARC_POLICY_SOFTFAIL`: Authentication failed- no action suggested by DMARC policy

Rspamd is able to store records in `redis` which could be used to generate DMARC aggregate reports but there is as of yet no available tool to generate such reports from these. Format of the records stored in `redis` is as follows:

    unixtime,ip,spf_result,dkim_result,dmarc_disposition

where spf and dkim results are `true` or `false` indicating whether an aligned spf/dkim identifier was found and dmarc_disposition is one of `none`/`quarantine`/`reject` indicating policy applied to the message.

These records are added to a list named $prefix$domain where $domain is the domain which defined policy for the message being reported on and $prefix is the value of the `key_prefix` setting (or "dmarc_" if this isn't set).

Keys are inserted to redis servers when a server is selected by hash value from sender's domain.

To enable storing of report information, `reporting` must be set to `true`. Please see the section on reporting in this document for more information.

Actions can be forced for messages based on DMARC disposition as demonstrated in example config below.

~~~ucl
dmarc {
	# Enables storing reporting information to redis
	reporting = true;
	# If Redis server is not configured below, settings from redis {} will be used
	#servers = "127.0.0.1:6379"; # Servers to use for reads and writes (can be a list)
	# Alternatively set read_servers / write_servers to split reads and writes
	# To set custom prefix for redis keys:
	#key_prefix = "dmarc_";
	# Actions to enforce based on DMARC disposition (empty by default)
	actions = {
		quarantine = "add_header";
		reject = "reject";
	}
        # Ignore "pct" setting for some domains
        # no_sampling_domains = "/etc/rspamd/dmarc_no_sampling.domains";
}
~~~

## Reporting

From Rspamd 1.6 experimental support for generation of DMARC reports is provided.

DMARC reporting information is stored in Redis- see [here]({{ site.baseurl }}/doc/configuration/redis.html) for information about configuring Redis.

For Rspamd to store information to be used for reports, you must set `reporting = true` in the DMARC module configuration

~~~ucl
# /etc/rspamd/local.d/dmarc.conf
reporting = true;
~~~

This should be enabled on every machine you want to collect reporting information from.

Sending of reports should only be enabled on single machine. This is done by adding the below settings to the configuration:

~~~ucl
# /etc/rspamd/local.d/dmarc.conf
# send_reports MUST be true
send_reports = true;
# report_settings MUST be present
report_settings {
  # The following elements MUST be present
  # organisation name to use for reports
  org_name = "Example";
  # organisation domain
  domain = "example.net";
  # sender address to use for reports
  email = "postmaster@example.net";
  # The following elements MAY be present
  # sender name to use for reports ("Rspamd" if unset)
  # from_name = "Rspamd";
  # SMTP host to send reports to ("127.0.0.1" if unset)
  # smtp = "127.0.0.1";
  # TCP port to use for SMTP (25 if unset)
  # smtp_port = 25;
  # HELO to use for SMTP ("rspamd" if unset)
  # helo = "rspamd";
  # Number of retries on temporary errors (2 if unset)
  # retries = 2;
  # Send DMARC reports here instead of domain owners
  # override_address = "postmaster@example.net";
  # Send DMARC reports here in addition to domain owners
  # additional_address = "postmaster@example.net";
  # DMARC Reports send to addition will be send as BCC
  # additional_address_bcc = false;
  # Number of records to request with HSCAN
  # hscan_count = 200
}
~~~

When sending of reports is enabled Rspamd will try to immediately send reports covering the previous day in UTC time; further sends are scheduled to run every 24 hours from this time. The file `$DBDIR/dmarc_reports_last_sent` tracks the time of the last send between restarts.

## DMARC Munging

From version 2.8, Rspamd supports DMARC munging for the mailing list. In this mode, Rspamd will change the `From:` header to some pre-defined address (e.g. a mailing list address) for those messages who have **valid** DMARC policy with **reject/quarantine** that would otherwise fail during mailing list forwarding. An example of this technique is defined here: https://mailman.readthedocs.io/en/release-3.1/src/mailman/handlers/docs/dmarc-mitigations.html
Here is an example for such a configuration:

~~~ucl
# local.d/dmarc.conf
munging {
  list_map = "/etc/rspamd/maps.d/dmarc_munging.map"; # map of maillist domains (mandatory)
  mitigate_strict_only = false; # perform mugning merely for reject/quarantine policies
  reply_goes_to_list = false; # set reply-to to the list address
  mitigate_allow_only = true; # perform munging based on DMARC_POLICY_ALLOW only
  munge_from = true; # replace from with something like <orig name> via <rcpt user>
  munge_map_condition = nil; # maps expression to enable munging
}
~~~
