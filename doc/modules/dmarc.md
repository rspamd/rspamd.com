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

~~~hcl
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

## Reporting

Starting from Rspamd 3.0, the recommended way to send DMARC reports is to use the `rspamadm dmarc_report` command with cron or systemd timers. Depending on the amount of traffic, this should be scheduled either daily or hourly. A working MTA running on a specific host is required to send the reports. Ideally, the local MTA should allow email to be sent without authentication or SSL.

If you're upgrading from a previous version, make sure that you remove the `reporting = true;` setting from `rspamadm configdump dmarc`. This setting has been intentionally converted to the new options schema to prevent misconfiguration. The line `reporting = true;` **must** be removed from the `local.d/dmarc.conf` if it is there.

DMARC reporting information is stored in Redis. Please refer to [this guide]({{ site.baseurl }}/doc/configuration/redis.html) for instructions on how to configure Redis.

Below are the configuration parameters for DMARC reporting, along with corresponding comments:

~~~hcl
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
    max_entries = 1k; # Maximum amount of entries per domain
    keys_expire = 2d; # Expire date for Redis keys
    #only_domains = '/path/to/map'; # Only store reports from domains or eSLDs listed in this map
    # Available from 3.3
    #exclude_domains = '/path/to/map'; # Exclude reports from domains or eSLDs listed in this map
    #exclude_domains = ["example.com", "another.com"]; # Alternative, use array to exclude reports from domains or eSLDs
    # Available from 3.8
    #exclude_recipients = '/path/to/map'; # Exclude reports for recipients listed in this map
    #exclude_recipients = ["a@example.com", "b@another.com"]; # Alternative, use array to exclude reports for recipients
  }
~~~

Here is the list of options explained:

* `enabled` (Required): Set to 'true' to enable DMARC reports. If 'false', no reports will be generated.
* `email` (Required): The email address where DMARC reports will be sent.
* `domain` (Required): The domain for which DMARC reports will be generated.
* `org_name` (Required): The name of the organization generating the reports.
* `bcc_addrs` (Optional): An array of additional email addresses to receive a copy of the DMARC reports.
* `report_local_controller` (Optional): If set to 'true', stores reports for local/controller scans, which is useful for testing purposes only.
* `helo` (Optional): The HELO identifier used in the SMTP dialog.
* `smtp` (Optional): The IP address of the SMTP server used for sending reports.
* `smtp_port` (Optional): The port number of the SMTP server.
* `from_name` (Optional): The name that appears in the 'FROM' field in the SMTP messages.
* `msgid_from` (Optional): The message ID format used in SMTP messages.
* `max_entries` (Optional): The maximum number of entries allowed per domain in the DMARC report.
* `keys_expire` (Optional): The expiration time for Redis keys storing report data.
* `only_domains` (Optional): A path to a map file containing a list of domains or eSLDs for which reports should be stored. Reports from other domains will be ignored.
* `exclude_domains` (Optional): A path to a map file containing a list of domains or eSLDs to be excluded from the reports. Alternatively, an array of domains can be used for the same purpose.
* `exclude_recipients` (Optional): A path to a map file containing a list of recipients to not send reports to. Alternatively, an array of recipients can be used for the same purpose.

In versions of Rspamd prior to 3.3, you could exclude certain domains from reporting by configuring the `no_reporting_domains` setting, which is a map of domains or eSLDs to be excluded. Starting from Rspamd 3.3, this option is also available in the `reporting` section. However, the legacy option `settings.no_reporting_domains` is still supported (although it's not recommended).

Starting from Rspamd 3.8, there is a new option `exclude_recipients` available in the reporting section. Here you can list recipient email addresses for which no reporting data should be collected (because the recipients generate bounces all the time).

## DMARC Munging

Starting from version 3.0, Rspamd supports DMARC munging for mailing lists. In this mode, Rspamd will modify the `From:` header of messages with a **valid** DMARC policy of **reject/quarantine** to a pre-defined address (such as a mailing list address) to prevent delivery failure during mailing list forwarding.
An example of this technique is [documented](https://mailman.readthedocs.io/en/release-3.1/src/mailman/handlers/docs/dmarc-mitigations.html) for the Mailman mailing list management system.

There is a configuration example below that demonstrates how to set up DMARC munging in Rspamd:

~~~hcl
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
