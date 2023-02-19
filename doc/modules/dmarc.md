---
layout: doc
title: DMARC module
---
# DMARC module

DMARC is a technology that uses SPF and DKIM to enable domain owners to publish policies regarding how email messages with their domain in the (RFC5322) `From` field should be handled.

For instance, DMARC can be configured to require a receiving MTA to quarantine or reject messages which do not have an aligned DKIM or SPF identifier.

DMARC can also be configured to request reports from remote MTAs about these messages to aid in identifying abuse and/or misconfiguration and to facilitate informed decisions about policy application.

## DMARC in rspamd

By default, the DMARC module in rspamd is configured with an empty collection, as shown below:

~~~ucl
dmarc {
}
~~~

This minimal configuration is sufficient to activate the module and enforce DMARC policies.

Symbols that the module adds are listed below:

- `DMARC_BAD_POLICY`: Policy was invalid or multiple policies found in DNS
- `DMARC_NA`: Domain in From header has no DMARC policy or From header is missing
- `DMARC_POLICY_ALLOW`: Message was authenticated & allowed by DMARC policy
- `DMARC_POLICY_REJECT`: Authentication failed- rejection suggested by DMARC policy
- `DMARC_POLICY_QUARANTINE`: Authentication failed- quarantine suggested by DMARC policy
- `DMARC_POLICY_SOFTFAIL`: Authentication failed- no action suggested by DMARC policy

Rspamd has the ability to store records in `redis`, which can be used to produce DMARC aggregate reports, but there are currently no tools available to generate such reports from these records. The format of the records stored in `redis` is as follows:

    unixtime,ip,spf_result,dkim_result,dmarc_disposition

In this format, the `spf_result` and `dkim_result` fields indicate whether an aligned SPF/DKIM identifier was found and are represented by `true` or `false`. The `dmarc_disposition` field shows the policy applied to the message and can have one of three values: `none`, `quarantine`, or `reject`.

Records are inserted into a list named `$prefix$domain`, where `$domain` corresponds to the domain that has defined the policy for the reported message, and `$prefix` is determined by the `key_prefix` setting (or defaults to `dmarc_ `if `key_prefix` is not set).

When a hash value is assigned to a sender's domain, the corresponding key is added to the Redis server.

To enable the storage of report information, the `reporting` setting must be set to `true`. For more details, please refer to the reporting section in the documentation.

The example configuration below illustrates how actions can be enforced for messages based on their DMARC disposition.

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

Starting from Rspamd 3.0, the recommended way to send DMARC reports is to use the `rspamadm dmarc_report` command with cron or systemd timers. Depending on the amount of traffic, this should be scheduled either daily or hourly. A working MTA running on a specific host is required to send the reports. Ideally, the local MTA should allow email to be sent without authentication or SSL.

If you're upgrading from a previous version, make sure that you remove the `reporting = true;` setting from `rspamadm configdump dmarc`. This setting has been intentionally converted to the new options schema to prevent misconfiguration. The line `reporting = true;` **must** be removed from the `local.d/dmarc.conf` if it is there.

DMARC reporting information is stored in Redis. Please refer to [this guide]({{ site.baseurl }}/doc/configuration/redis.html) for instructions on how to configure Redis.

Below are the configuration parameters for DMARC reporting, along with corresponding comments:

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

In versions of Rspamd prior to 3.3, you could exclude certain domains from reporting by configuring the `no_reporting_domains` setting, which is a map of domains or eSLDs to be excluded. Starting from Rspamd 3.3, this option is also available in the `reporting` section. However, the legacy option `settings.no_reporting_domains` is still supported (although it's not recommended).

## DMARC Munging

Starting from version 3.0, Rspamd supports DMARC munging for mailing lists. In this mode, Rspamd will modify the `From:` header of messages with a **valid** DMARC policy of **reject/quarantine** to a pre-defined address (such as a mailing list address) to prevent delivery failure during mailing list forwarding.
An example of this technique is [documented](https://mailman.readthedocs.io/en/release-3.1/src/mailman/handlers/docs/dmarc-mitigations.html) for the Mailman mailing list management system.

There is a configuration example below that demonstrates how to set up DMARC munging in Rspamd:

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
