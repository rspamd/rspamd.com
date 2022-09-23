---
layout: doc
title: DMARC module
---
# DMARC module

DMARC is a technology leveraging SPF & DKIM, allowing domain owners to publish policies regarding how messages bearing their domain in the (RFC5322) From field should be handled.
For example, DMARC can be configured to request that a receiving MTA quarantine or reject messages which do not have an aligned DKIM or SPF identifier.
DMARC can also be configured to request reports from remote MTAs about such messages, to help identify abuse and/or misconfiguration, and to help make informed decisions about policy application.

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

From Rspamd 3.0 the `rspamadm dmarc_report` command should be used with cron or systemd timers to send reports. This should be done either daily or hourly depending on traffic. This requires a working MTA running on a specific host that allows email to be sent with no authentication/ssl - preferrably the local MTA.

When migrating from the previous versions, please ensure that you don't have `reporting = true;` in `rspamadm configdump dmarc`. That setting was intentionally converted to the new options schema to avoid misconfiguration. The line `reporting = true;` **must** be removed from the `local.d/dmarc.conf` if it is there.

DMARC reporting information is stored in Redis. See [this information]({{ site.baseurl }}/doc/configuration/redis.html) about configuring Redis.

Here are the configuration parameters for DMARC reporting, with corresponding comments:

~~~ucl
# local.d/dmarc.conf
  reporting {
    # Required attributes
    enabled = true; # Enable reports in general
    email = 'dmarc_reports@example.com'; # Source of DMARC reports
    domain = 'example.com'; # Domain to serve
    org_name = 'Example organisation'; # Organisation
    # Optional parameters
    bcc_addrs = ["postmaster@example.com"]; # additional addresses to copy on reports
    report_local_controller = false; # Store reports for local/controller scans (for testing only)
    helo = 'rspamd.localhost'; # Helo used in SMTP dialog
    smtp = '127.0.0.1'; # SMTP server IP
    smtp_port = 25; # SMTP server port
    from_name = 'Rspamd'; # SMTP FROM
    msgid_from = 'rspamd'; # Msgid format
    max_entries = 1k; # Maxiumum amount of entries per domain
    keys_expire = 2d; # Expire date for Redis keys
    #only_domains = '/path/to/map'; # Only store reports from domains or eSLDs listed in this map
    # Available from 3.3
    #exclude_domains = '/path/to/map'; # Exclude reports from domains or eSLDs listed in this map
    #exclude_domains = ["example.com", "another.com"]; # Alternative, use array to exclude reports from domains or eSLDs
  }
~~~

Prior to Rspamd 3.3 you can skip some domains from the reporting by setting `no_reporting_domains` that is a map of domains or eSLDs to be excluded. Rspamd 3.3 supports this option in `reporting` section, however, a legacy option `settings.no_reporting_domains` is also supported (but not preferred).

## DMARC Munging

From version 3.0, Rspamd supports DMARC munging for mailing lists.
In this mode, Rspamd will change the `From:` header to a pre-defined address (e.g. a mailing list address) for messages that have a **valid** DMARC policy with **reject/quarantine**, where delivery would otherwise fail during mailing list forwarding. An example of this technique is [documented](https://mailman.readthedocs.io/en/release-3.1/src/mailman/handlers/docs/dmarc-mitigations.html) for the Mailman mailing list management system.

And here is an example for such a configuration in Rspamd:

~~~ucl
# local.d/dmarc.conf
munging {
  list_map = "/etc/rspamd/maps.d/dmarc_munging.map"; # map of maillist domains (mandatory)
  mitigate_strict_only = false; # perform munging merely for reject/quarantine policies
  reply_goes_to_list = false; # set reply-to to the list address
  mitigate_allow_only = true; # perform munging based on DMARC_POLICY_ALLOW only
  munge_from = true; # replace From header with something like <orig name> via <rcpt user>
  munge_map_condition = nil; # maps expression to enable munging
}
~~~
