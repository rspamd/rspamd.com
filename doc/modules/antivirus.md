---
layout: doc
title: Antivirus module
---

# Antivirus module

The Antivirus module, available from Rspamd version 1.4, seamlessly integrates with various virus scanners. Currently, the following scanners are supported:

* [Avast Antivirus Rest API](https://businesshelp.avast.com/Content/Products/AfB_Antivirus/Linux/InstallingAvastBusinessAntivirusLinux.htm) (from 3.3)
* [Avira](https://www.avira.com/de/oem-antivirus) (via SAVAPI)
* [ClamAV](https://www.clamav.net)
* [F-Prot](https://www.f-prot.com/)
* [Kaspersky antivirus](https://www.kaspersky.com/small-to-medium-business-security/linux-mail-server) (from 1.8.3)
* [Kaspersky Scan Engine](https://www.kaspersky.com/scan-engine) (from 2.0)
* [Sophos](https://web.archive.org/web/20140810135906/https://www.sophos.com/en-us/medialibrary/PDFs/partners/sophossavdidsna.pdf) (via SAVDI)

<div id="toc" markdown="1">
  <h2 class="toc-header">Contents</h2>
  * TOC
  {:toc}
</div>

## Configuration

The configuration for an antivirus setup is accomplished by defining rules. If the antivirus reports one or more viruses, the configured symbol (e.g. CLAM_VIRUS) will be set, with the viruses as the description. If set, the reset action will be triggered.

In case of errors during the connection or if the antivirus reports failures, the fail symbol (e.g. CLAM_VIRUS_FAIL) will be set, with the error message as the description. The [force_actions]({{ site.baseurl }}/doc/configuration/force_actions.html) plugin can be used to perform a `soft reject` if the antivirus has failed to scan the email, such as during a database reloading.

In addition to the `SYMBOLNAME` and `SYMBOLNAME_FAIL` symbols, there are currently two special symbols indicating that the scanner has reported encrypted parts or parts with Office macros: `SYMBOLNAME_ENCRYPTED` and `SYMBOLNAME_MACRO`

For virus, encrypted and macro symbols, patterns can be used to set a dedicated symbol for any virus name or error message. For the fail symbol, the `patterns_fail` option must be used.

~~~ucl
...
  patterns {
    # symbol_name = "pattern";
    JUST_EICAR = '^Eicar-Test-Signature$';
  }
  patterns_fail { # 1.8.4+
    # symbol_name = "pattern";
    CLAM_LIMITS_EXCEEDED = '^Heuristics\.Limits\.Exceeded$';
  }
...
~~~

From version 3.5, you are able to use two more types of mime part filters:

~~~ucl
...
  mime_parts_filter_regex {
    FILE1 = "^invoice\.xls$"
    DOC1 = "application\/msword";
    DOC2 = "application\/vnd\.ms-word.*";
    GEN2 = "application\/vnd\.openxmlformats-officedocument.*";
  }
  # Mime-Part filename extension matching (no regex)
  mime_parts_filter_ext {
    doc = "doc";
    docx = "docx";
  }
...
~~~

The `mime_parts_filter_regex` option matches the content-type detected by Rspamd, or a mime part header, or the declared filename of an attachment. The latter option also works for files within an archive. The `mime_parts_filter_ext` option matches the extension of the declared filename or an archive's file list.

By default, the complete email will be sent to the antivirus system. This behavior can be changed by setting the `scan_mime_parts`option to true, which will send all detected attachments as separate mime parts. The options `scan_text_mime` or `scan_image_mime` can also be set to true if you want text mimes and images sent to the AV scanner.

By default, if [Redis]({{ site.baseurl }}/doc/configuration/redis.html) is configured globally and the `antivirus` option is not explicitly disabled in the Redis configuration, the results will be cached in Redis according to message checksums.

Settings should be added to `/etc/rspamd/local.d/antivirus.conf` file:

~~~ucl
# local.d/antivirus.conf

# multiple scanners could be checked, for each we create a configuration block with an arbitrary name
clamav {
  # If set force this action if any virus is found (default unset: no action is forced)
  # action = "reject";
  # message = '${SCANNER}: virus found: "${VIRUS}"';
  # Scan mime_parts separately - otherwise the complete mail will be transferred to AV Scanner
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
  # `whitelist` points to a map of signature names. Hits on these signatures are ignored.
  whitelist = "/etc/rspamd/antivirus.wl";
}
~~~

## Sophos SAVDI specific details

Sophos SAVDI is a daemon that extends Sophos Anti-Virus for Linux to be reachable via TCP sockets using the generic ICAP or the Sophos-specific Sophie and SSSP protocols. Both Sophos Anti-Virus for Linux and the Sophos SAVDI daemon need to be installed.

Rspamd uses the SSSP protocol to communicate with SAVDI. A sample SAVDI configuration can be found at [https://gist.github.com/c-rosenberg/671b0a5d8b1b5a937e3e161f8515c666](https://gist.github.com/c-rosenberg/671b0a5d8b1b5a937e3e161f8515c666)

Note: Since version 1.9.0, SAVDI errors will be reported in the fail symbol (e.g. SOPHOS_VIRUS_FAIL), making the following configuration obsolete.

From version 1.7.2 up to 1.8.3, there are two special configuration parameters for handling SAVDI warnings/error messages in the `sophos` section: `savdi_report_encrypted` and `savdi_report_oversized`. When enabled, pseudo virus names (SAVDI_FILE_OVERSIZED, SAVDI_FILE_ENCRYPTED) will be set in case Sophos reports an encrypted file or if the file is bigger than `maxscandata` in the `scanprotocol` section of the SAVDI configuration file.

If you don't want to handle those pseudo virus names like everything else you could use patterns to set
a different symbol and maybe set a score or use the symbol in `force_actions`.

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

The default configuration for SAVAPI uses a listening unix socket. However, it is recommended to change this to a TCP socket for better security and reliability. The `ListenAddress` option in savapi.conf provides examples on how to do this. By default, the module expects the socket to be located at 127.0.0.1:4444, but this can be changed by setting it in the `servers` variable.

Additionally, it is important to set the `product_id` to match the id for your HBEDV.key file. Failure to do so will result in a log message indicating that the given id was invalid.

## Kaspersky specific

In terms of Kaspersky specific configurations, it is possible to use the `clamav` socket for data scanning. However, it should be noted that it is a unix socket and can only be used for local scans. It is also important that Rspamd should be able to write into Kaspersky Unix socket. For example, you can add Rspamd user (`_rspamd` on Linux most likely) into `klusers` group: `usermod -G klusers _rspamd` in Linux. Rspamd will also write data into some intermediate files that are normally placed in `/tmp` folder.

~~~ucl
# local.d/antivirus.conf
kaspersky {
  symbol = "KAS_VIRUS";
  servers = "/var/run/klms/rds_av";
  max_size = 2048000;
  scan_mime_parts = true; # Scan just attachments
  tmpdir = "/tmp"; # Must be writable by `_rspamd` user and readable by `klusers` user/group
}
~~~

## Kaspersky Scan Engine details

The engine utilizes the HTTP REST API version 1.0, as outlined in the Kaspersky [documentation](https://help.kaspersky.com/ScanEngine/1.0/en-US/181038.htm). Rspamd can operate in both file and TCP stream modes. The file mode may be useful if you have a fast `tmpfs` in-memory storage and wish to reduce the amount of data transferred over a socket for the local machine. However, this mode is not recommended for any type of real storage, including SSDs. The following settings are available for this engine:

~~~ucl
# local.d/antivirus.conf
kaspersky_se {
  symbol = "KAS_SE_VIRUS";
  servers = "127.0.0.1:1234"; # Mandatory, dos not supports Unix sockets
  max_size = 2048000;
  timeout = 5.0; # Allow 5 seconds for scan
  scan_mime_parts = true; # Just attachments
  use_files = false; # Or true if you want this mode
  use_https = false; # Enable if you like to use SSL
}
~~~

## Avast Antivirus Rest API details

You need to install the Avast-rest package in addition to the Avast antivirus package. It is also recommended to adjust the default settings in /etc/avast/rest.conf. Rspamd can operate in both file and TCP stream modes. File mode can be useful if you have a fast `tmpfs` that relies on memory, but this is not recommended for any type of real storage, even SSD.

Warnings such as corrupt file or possible zip bomb are only logged. However, you can set `warnings_as_threat = true` if you want Rspamd to treat these warnings as pseudo viruses. It is recommended to use patterns to avoid false positives.

With the parameter option, you can set any option for the rest-api from Rspamd.

Here are possible settings for this engine:

~~~ucl
# local.d/antivirus.conf
avast {

  symbol = "AVAST_VIRUS";
  servers = "127.0.0.1:8080";

  scan_mime_parts = true; # (Default) Just attachments
  use_files = false; # (Default) Or true if you need the file mode (not recommend)
  use_https = false; # (Default) Enable if you like to use SSL

  warnings_as_threat = false; # (Default)

  # https://repo.avcdn.net/linux-av/doc/avast-techdoc.pdf
  parameter = {
    archives = true, # (Default) 
    # email = false,
    # full = false,
    # pup = false,
    # heuristics = 40,
    # detections = false,
  
  }
}
~~~

## Generic Anti-Virus support via ICAP protocol

The ICAP protocol is implemented in [external_services]({{ site.baseurl }}/doc/modules/external_services.html#icap-protocol-specific-details).

Currently these products are tested with Rspamd (please report others):

* Checkpoint Sandblast
* ClamAV (using c-icap server and squidclamav)
* ESET Server Security for Linux 9.0
* F-Secure Internet Gatekeeper
* Kaspersky Scan Engine 2.0
* Kaspersky Web Traffic Security 6.0
* McAfee Web Gateway 9/10/11
* Metadefender ICAP
* Sophos (via SAVDI)
* Symantec Protection Engine for Cloud Services (Rspamd <3.2, >=3.2 untested)
* Trend Micro InterScan Web Security Virtual Appliance (IWSVA)
* Trend Micro Web Gateway
