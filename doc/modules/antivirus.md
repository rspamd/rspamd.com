---
layout: doc
title: Antivirus module
---

# Antivirus module

Antivirus module (available from Rspamd 1.4) provides integration with virus scanners. Currently supported are:

* [ClamAV](http://www.clamav.net)
* [F-Prot](http://www.f-prot.com/products/corporate_users/unix/linux/mailserver.html)
* [Sophos](https://www.sophos.com/en-us/medialibrary/PDFs/partners/sophossavdidsna.pdf) (via SAVDI)
* [Avira](https://www.avira.com/de/oem-antivirus) (via SAVAPI)
* [Kaspersky antivirus](https://www.kaspersky.com/small-to-medium-business-security/linux-mail-server) (from 1.8.3)

## Configuration

By default, given [Redis]({{ site.baseurl }}/doc/configuration/redis.html) is configured globally and `antivirus` is not explicitly disabled in redis configuration, results are cached in Redis according to message checksums.

Settings should be added to `/etc/rspamd/local.d/antivirus.conf`:

~~~ucl
# local.d/antivirus.conf

# multiple scanners could be checked, for each we create a configuration block with an arbitrary name
clamav {
  # If set force this action if any virus is found (default unset: no action is forced)
  # action = "reject";
  # message = '${SCANNER}: virus found: "${VIRUS}"';
  # Scan mime_parts seperately - otherwise the complete mail will be transfered to AV Scanner
  #attachments_only = true; # Before 1.8.1
  #scan_mime_parts = true; # After 1.8.1
  # Scanning Text is suitable for some av scanner databases (e.g. Sanesecurity)
  #scan_text_mime = false; # 1.8.1 +
  #scan_image_mime = false; # 1.8.1 +
  # If `max_size` is set, messages > n bytes in size are not scanned
  #max_size = 20000000;
  # symbol to add (add it to metric if you want non-zero weight)
  symbol = "CLAM_VIRUS";
  # type of scanner: "clamav", "fprot", "sophos" or "savapi"
  type = "clamav";
  # If set true, log message is emitted for clean messages
  #log_clean = false;
  # Prefix used for caching in Redis: scanner-specific defaults are used. If Redis is enabled and
  # multiple scanners of the same type are present, it is important to set prefix to something unique.
  #prefix = "rs_cl_";
  # For "savapi" you must also specify the following variable
  #product_id = 12345;
  # servers to query (if port is unspecified, scanner-specific default is used)
  # can be specified multiple times to pool servers
  # can be set to a path to a unix socket
  servers = "127.0.0.1:3310";
  # if `patterns` is specified virus name will be matched against provided regexes and the related
  # symbol will be yielded if a match is found. If no match is found, default symbol is yielded.
  patterns {
    # symbol_name = "pattern";
    JUST_EICAR = '^Eicar-Test-Signature$';
  }
  # In version 1.7.0+ patterns could be extended
  #patterns = {SANE_MAL = 'Sanesecurity\.Malware\.*', CLAM_UNOFFICIAL = 'UNOFFICIAL$'};
  # `whitelist` points to a map of IP addresses. Mail from these addresses is not scanned.
  whitelist = "/etc/rspamd/antivirus.wl";
}
~~~

## Sophos SAVDI specific details

Sophos SAVDI is a little daemon which extends Sophos Anti-Virus for Linux to be reachable via TCP sockets using the generic ICAP or the Sophos specific Sophie and SSSP protocols. You need to install both Sophos Anti-Virus for Linux and the Sophos SAVDI daemon.

Rspamd is using the SSSP protocol to communicate with SAVDI. For a SAVDI config example - maybe have a look here:
[https://gist.github.com/c-rosenberg/671b0a5d8b1b5a937e3e161f8515c666](https://gist.github.com/c-rosenberg/671b0a5d8b1b5a937e3e161f8515c666)

From the version 1.7.2, there are 2 special configuration parameters for handling SAVDI warnings / error messages
in the sophos section: `savdi_report_encrypted` and `savdi_report_oversized`.
When enabled pseudo virus names (SAVDI_FILE_OVERSIZED, SAVDI_FILE_ENCRYPTED) will be set in case
Sophos reports encrypted file or the file is bigger than `maxscandata` in the scanprotocol section
of the SAVDI configuration file.

If you don't want to handle those pseudo virus names like everything else you could use patterns to set
a different symbol and maybe set a score or use the symbol in force_actions.

~~~ucl
# local.d/antivirus.conf

sophos {
  ...
  savdi_report_encrypted = true;
  savdi_report_encrypted = true;

  patterns {
    # symbol_name = "pattern";
    SAVDI_FILE_ENCRYPTED = "^SAVDI_FILE_ENCRYPTED$";
    SAVDI_FILE_OVERSIZED = "^SAVDI_FILE_OVERSIZED$";
  }
  ...
}
~~~

## SAVAPI specific details

The default SAVAPI configuration has a listening unix socket. You should change this to a TCP socket. The option "ListenAddress" in savapi.conf shows some examples. Per default this module expects the socket at 127.0.0.1:4444. You can change this by setting it in the "servers" variable as seen above.

You also need to set the "product_id" that should match with the id for your HBEDV.key file. If you leave this, the default value is "0" and checking will fail with a log message that the given id was invalid.

## Kaspersky specific

You might want to use `clamav` socket to scan data. Since it is a Unix socket, you can only use it for local scan. It is also important that Rspamd should be able to write into Kaspersky Unix socket. For example, you can add Rspamd user (`_rspamd` on Linux most likely) into `klusers` group: `usermod -G klusers _rspamd` in Linux. Rspamd will also write data into some intermeniet files that are normally placed in `/tmp` folder.

~~~ucl
# local.d/antivirus.conf
kaspersky {
  symbol = "KAS_VIRUS";
  servers = "/var/run/klms/rds_av";
  max_size = 2048000;
  attachments_only = true;
  tmpdir = "/tmp"; # Must be writable by `_rspamd` user and readable by `klusers` user/group
}
~~~
