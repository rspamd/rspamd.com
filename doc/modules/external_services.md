---
layout: doc
title: External Services module
---

# External Services module

The External Services module, which has been available since Rspamd 1.9.0, enables integration with a range of external services.

<div id="toc" markdown="1">
  <h2 class="toc-header">Contents</h2>
  * TOC
  {:toc}
</div>

## Configuration

To configure an external service, rules must be defined. If the service detects one or more threats, the configured symbol (such as ICAP_VIRUS) will be set with a description of the threats. If this symbol is set, the reject action will be triggered.

In case of connection errors or failures reported by the external service, the fail symbol (e.g. ICAP_VIRUS_FAIL) will be set with an error message as its description. Patterns can be used for both symbols to assign a dedicated symbol for any threat name or error message.

~~~ucl
...
  patterns {
    # symbol_name = "pattern";
    JUST_EICAR = '^Eicar-Test-Signature$';
  }
  patterns_fail { # 1.9.0+
    # symbol_name = "pattern";
    ICAP_LIMITS_EXCEEDED = '^Container size violation$';
  }
...
~~~

By default, the complete email will be sent to the external service system. You can and you have to change this behavior for some services by setting `scan_mime_parts = true;` to send all mime parts detected as attachments separately. If you also want to scan text mimes and images using the AV scanner, you can set the `scan_text_mime` or `scan_image_mime` parameter to "true".

Furthermore, there are two types of MIME part filters available:

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

`mime_parts_filter_regex` will match on the content-type detected by rspamd or mime part header or the declared filename of an attachment or an archive file listing. `mime_parts_filter_ext` will only match the extension of the declared filename or an archives file list.

Apart from the default settings, specific configuration options need to be set for each rule as described below.

By default, if [Redis]({{ site.baseurl }}/doc/configuration/redis.html) is configured globally and `external_services` is not disabled in the Redis configuration, the results will be cached in Redis based on message checksums.

To add settings, modify the `/etc/rspamd/local.d/external_services.conf` file:

~~~ucl
# local.d/external_services.conf

# multiple scanners could be checked, for each we create a configuration block with an arbitrary name
icap {
  servers = "127.0.0.1:1344";

  # symbol to add (add it to metric if you want non-zero weight)
  symbol = "ICAP_VIRUS";

  # type of scanner: "icap", "oletools", "dcc" or "vadesecure"
  type = "icap";

  # Scan mime_parts separately - otherwise the complete mail will be transferred
  #scan_mime_parts = true;
  #scan_text_mime = false;
  #scan_image_mime = false;

  # filter attachments by content-type, filename or filename extension
  # setting a filter will also enable scan_mime_parts = true;
  mime_parts_filter_regex {
    FILE1 = "^invoice\.xls$"
    DOC1 = "application\/msword";
  }
  mime_parts_filter_ext {
    doc = "doc";
    docx = "docx";
  }

  # If set force this action if any threat is found (default unset: no action is forced)
  # action = "reject";

  # If `max_size` is set, messages > n bytes in size are not scanned
  #max_size = 20000000;

  # If set true, log message is emitted for clean messages
  #log_clean = false;

  # if `patterns` is specified threat name will be matched against provided regexes and the related
  # symbol will be yielded if a match is found. If no match is found, default symbol is yielded.
  patterns {
    # symbol_name = "pattern";
    JUST_EICAR = '^Eicar-Test-Signature$';
  }
  # same as above, but matching on the _FAIL symbol
  patterns_fail {
    # symbol_name = "pattern";
  }
  # In version 1.7.0+ patterns could be extended
  #patterns = {SANE_MAL = 'Sanesecurity\.Malware\.*', CLAM_UNOFFICIAL = 'UNOFFICIAL$'};

  # `whitelist` points to a map of IP addresses. Mail from these addresses is not scanned.
  whitelist = "/etc/rspamd/antivirus.wl";
}
~~~

## ICAP protocol specific details

ICAP servers are typically utilized by HTTP proxies or file servers to scan HTTP requests or files. In Rspamd, only the RESPMOD method is supported. In addition to the X-Infection-Found and X-Virus-ID headers, Rspamd also attempts to evaluate other uncommon headers.

Starting from version 3.2, Rspamd supports the complete ICAP protocol, which includes encapsulated HTTP headers. It is also capable of evaluating encapsulated HTTP return codes.

This module has been tested with the following ICAP implementations:

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
* Trend Micro IWSVA 6.0
* Trend Micro Web Gateway

Please report other working or non-working icap implementations.

~~~ucl
# local.d/external_services.conf

clamav_icap {
  ...
  scheme = "squidclamav";
  type = "icap";
  ...
}

~~~

Scan requests are send to an icap URL (e.g. icap://127.0.0.1:1344/squidclamav). herefore, a scheme is required to communicate with the ICAP server in addition to the host and port. Since ICAP servers often have multiple schemes, it is necessary to choose one with RESPMOD support.

If typical error responses are encountered, such as `X-Infection-Found: Type=2; Resolution=2; Threat=Encrypted container violation;`, they will be reported as a fail symbol (e.g. CLAM_ICAP_FAIL(0.00){Encrypted container violation}).

Depending on the ICAP software there are some extra options available:

~~~ucl
# local.d/external_services.conf

icap {
  user_agent = "Rspamd"; # Use none, extended or a self defined name
  x_client_header = true; # Add X-Client-IP: $IP header
  x_rcpt_header = true; # Add X-Rcpt-To: $SMTP_RCPT header
  x_from_header = true; # Add X-Mail-From: $SMTP_FROM header
}

~~~

Here some configuration examples for ICAP capable products:

~~~ucl
# local.d/external_services.conf

# C-ICAP Squidclamav
squidclamav {
  type = "icap";
  scheme = "squidclamav";
  ...
}

# Checkpoint Sandblast
sandblast {
  type = "icap";
  scheme = "sandblast";
  ...
}

# ESET Gateway Security / Antivirus for Linux
eset {
  type = "icap";
  scheme = "scan";
  ...
}

# F-Secure Internet Gatekeeper
f-secure {
  type = "icap";
  scheme = "respmod";
  x_client_header = true;
  x_rcpt_header = true;
  x_from_header = true;
  ...
}

# Kaspersky Scan Engine 2.0 (as configured in kavicapd.xml):
kaspersky {
  type = "icap";
  scheme = "resp";
  x_client_header = true;
  ...
}

# Kaspersky Web Traffic Security
kaspersky {
  type = "icap";
  scheme = "av/respmod";
  x_client_header = true;
  ...
}

# McAfee Web Gateway 9/10/11 (Headers must be activated with personal extra Rules)
mcafee {
  type = "icap";
  scheme = "respmod";
  x_client_header = true;
  ...
}

# Metadefender ICAP
metadefender {
  type = "icap";
  scheme = ""
  x_client_header = true;
}

# Sophos SAVDI example:
sophos {
  type = "icap";
  # scheme as configured in savdi.conf (name option in service section)
  scheme = "respmod";
  ...
}

# Symantec Protection Engine for Cloud Services
symantec {
  type = "icap";
  scheme = "avscan";
  ...
}

# Trend Micro IWSVA example (X-Virus-ID/X-Infection-Found headers must be activated):
trend_micro {
  type = "icap";
  scheme = "avscan";
  x_client_header = true;
  ...
}

# Trend Micro Web Gateway example (X-Virus-ID/X-Infection-Found headers must be activated):
trend_micro {
  type = "icap";
  scheme = "interscan";
  x_client_header = true;
  ...
}

~~~

## oletools specific details

Oletools is an excellent Python module for scanning and analyzing office documents containing macros. Macro-viruses typically use an auto-exec function to load when the document is opened, as well as functions for executing code in a shell or saving files to the system. Oletools classifies harmful functions as either AutoExec or Suspicious. In the default mode, the Oletools module sets the result when at least one AutoExec and one Suspicious function are used.

Please keep in mind that Oletools is not an antivirus scanner. It only analyzes macros. Additionally, there are legitimate office files that contain AutoExec and Suspicious functions. Furthermore, some macro viruses do not use AutoExec functions. If you want more detailed control over the behavior of the Oletools module, please refer to the extended mode below. You may also want to refer to the olevba documentation at [https://github.com/decalage2/oletools/wiki/olevba](https://github.com/decalage2/oletools/wiki/olevba)

The default behavior of Oletools is useful if you do not want to block all office files with macros, but rather files with macros that use functions typically seen in macro viruses.

**Note**: Some Word files may have the .doc extension but actually use the Rich Text Format (RTF), which has its own security vulnerabilities. Currently, oletools returns a RETURN_OPEN_ERROR for RTF files, but this issue will be resolved in a future release.

To use oletools with Rspamd, you need to install a wrapper daemon called [olefy](https://github.com/HeinleinSupport/olefy).

Olefy communicates with Rspamd over TCP and utilizes olevba to generate a report on an office file.

### oletools default mode

In order to send only office files to the olevba analyzer enable scan_mime_parts (needed for versions < 1.9.5) set mime_parts_filter_regex and mime_parts_filter_ext like shown below (maybe this list is still incomplete). It is worth noting that sometimes office files may be sent with the generic content-type `application/octet-stream`. You can enable the `UNKNOWN` option to capture these, but this may also capture non-office file attachments such as images, PDFs, and so on. Attempting to send non-office files to olevba will result in error messages.

~~~ucl
# local.d/external_services.conf

oletools {
  ...
  # default olefy settings
  servers = "127.0.0.1:10050"

  # needs to be set explicitly for Rspamd < 1.9.5
  scan_mime_parts = true;

  # mime-part regex matching in content-type or filename
  mime_parts_filter_regex {
    #UNKNOWN = "application\/octet-stream";
    DOC2 = "application\/msword";
    DOC3 = "application\/vnd\.ms-word.*";
    XLS = "application\/vnd\.ms-excel.*";
    PPT = "application\/vnd\.ms-powerpoint.*";
    GENERIC = "application\/vnd\.openxmlformats-officedocument.*";
  }
  # mime-part filename extension matching (no regex)
  mime_parts_filter_ext {
    doc = "doc";
    dot = "dot";
    docx = "docx";
    dotx = "dotx";
    docm = "docm";
    dotm = "dotm";
    xls = "xls";
    xlt = "xlt";
    xla = "xla";
    xlsx = "xlsx";
    xltx = "xltx";
    xlsm = "xlsm";
    xltm = "xltm";
    xlam = "xlam";
    xlsb = "xlsb";
    ppt = "ppt";
    pot = "pot";
    pps = "pps";
    ppa = "ppa";
    pptx = "pptx";
    potx = "potx";
    ppsx = "ppsx";
    ppam = "ppam";
    pptm = "pptm";
    potm = "potm";
    ppsm = "ppsm";
  }
  ...
}

~~~

By default, when using the oletools module, a symbol description will be set as `OLETOOLS(1.00)[AutoExec + Suspicious (Document_open,Shell,Chr)]`. The words inside the brackets are the macro functions reported by olevba.

If you enable debug mode for external_services the oletools module will also report the description of a function as reported by olevba.

### oletools extended mode

In extended mode, the oletools module does not trigger on specific categories but always sets a threat string with all the found flags whenever a macro is detected. These flags are sorted alphabetically and displayed at the same position every time they are set. Additionally, all reported functions are set as individual threats. For instance, `OLETOOLS (4.00)[A----MS-, Document_open, Shell, Chr]`indicates four threats reported: one for the flag list and one for each reported function. Note that the symbol score is counted four times. If you want to modify this behavior, you can use `one_shot = true`.

~~~ucl
# local.d/external_services_group.conf
...
  "OLETOOLS" {
    weight = 1.0;
    description = "OLETOOLS found a Macro";
    one_shot = true;
  }
...
~~~

By having the flags and functions as individual threats, it becomes possible to use the pattern configuration to convert the reported threats into symbols that can be utilized in force_actions or composites.

~~~ucl
# local.d/external_services.conf

oletools {
  ...

  extended = true;

  patterns {
    # catch Macro, AutoExec, Suspicious and Hex Strings
    BAD_MACRO_MYFLAGS   = '^A..H.MS.$';
    BAD_MACRO_RISKY_IOC = '^A...IMS.$';
    BAD_MACRO_SHELL     = '^Shell$';
  }
  ...
}

~~~

You can then use those patterns in the group configuration:

~~~ucl
# local.d/external_services_group.conf
description = "Oletools content rules";
symbols = {
...
  "OLETOOLS" {
    weight = 1.0;
    description = "OLETOOLS found a Macro";
    one_shot = true;
  },
  "BAD_MACRO_MYFLAGS" {
    weight = 5.0;
    description = "Suspicious hex strings in office document";
  },
  "BAD_MACRO_RISKY_IOC" {
    weight = 10.0;
    description = "Risky macro in office document";
  }
...
}
~~~

A little help for the 8 flags:

`ABDHIMSV` or `A-------`

* A=Auto-executable (auto-executable macros)
* B=Base64 strings (Base64-encoded strings (potential obfuscation))
* D=Dridex strings (Dridex-encoded strings (potential obfuscation))
* H=Hex strings (hex-encoded strings (potential obfuscation))
* I=IOCs (macro contains IP, URL or executable filename)
* M=Macros (contains VBA Macros)
* S=Suspicious keywords (suspicious VBA keywords)
* V=VBA strings (VBA string expressions (potential obfuscation))

Note that in versions <= 2.7, flags were ordered but stacked to the right in the flag string. For instance, if flags `A`, `I`, `M` and `S` are be set, the resulting flag string would be `----AIMS`.

## DCC specific details

This modules performs [DCC](https://www.dcc-servers.net/dcc/) lookups to determine
the *bulkiness* of a message (e.g. how many recipients have seen it).

This is particularly valuable in composite rules, such as when a message is from a freemail domain AND it is identified as bulk by DCC, making it easier to classify it as spam and assign a higher weight to it. 

Before enabling this module, kindly review the License terms on the DCC website.

### Module configuration

This module requires that you have the `dccifd` daemon configured, running and
working correctly.  To do this you must download and build the [latest DCC client]
(<https://www.dcc-servers.net/dcc/source/dcc.tar.Z>). Once installed, edit
`/var/dcc/dcc_conf` set `DCCIFD_ENABLE=on` and set `DCCM_LOG_AT=NEVER` and
`DCCM_REJECT_AT=MANY`. Maybe you want DCC to listen to a TCP socket by setting `DCCIFD_ARGS="-SHELO -Smail_host -SSender -SList-ID -p *,10045,127.0.0.0/8"`.

Then start the daemon by running `/var/dcc/libexec/rcDCC start`.

Once the `dccifd` daemon is started it will listen on the UNIX domain socket /var/dcc/dccifd or on localhost port 10045
and all you have to do is tell the rspamd where `dccifd` is listening.

~~~ucl
# local.d/external_services.conf

dcc {
  ...
  #servers = "/var/dcc/dccifd" # use unix socket
  #servers = "127.0.0.1:10045" # use tcp socket
  ...
}

~~~

DCC identifies bulky mails by creating hash and therefor DCC needs the complete message to work properly. `scan_mime_parts = false` is already set in the defaults.

Any messages that DCC returns a *reject* result for (based on the configured `DCCM_REJECT_AT`
value) will cause the symbol `DCC_REJECT` to fire. `DCC_BULK` will be calculated from the body, fuz1, fuz2 return values and has a dynamic score.

## Pyzor specific details

`Requires rspamd >2.8`

Pyzor is a bulk email scanner similar to Razor2 and DCC, which doesn't identify spam but instead identifies how often a message (hash) has been seen or how "bulky" a message is.

To integrate Pyzor with Rspamd, a wrapper isn't needed as it will be exposed to Rspamd through a systemd socket. To install Pyzor on CentOS/Rocky Linux, run the command `yum install pyzor`.

After installing Pyzor, enable the module by:

~~~ucl
# local.d/external_services.conf
...
pyzor {
  # default pyzor settings
  servers = "127.0.0.1:5953"
}
~~~

Restart rspamd `systemctl restart rspamd`

Add the systemd socket and service:

~~~ucl
# /usr/lib/systemd/system/pyzor.socket

[Unit]
Description=Pyzor socket

[Socket]
ListenStream=127.0.0.1:5953
Accept=yes

[Install]
WantedBy=sockets.target
~~~

~~~ucl
# /usr/lib/systemd/system/pyzor@.service

[Unit]
Description=Pyzor Socket Service
Requires=pyzor.socket

[Service]
Type=simple
ExecStart=-/usr/bin/pyzor check
StandardInput=socket
StandardError=journal
TimeoutStopSec=10

User=_rspamd
NoNewPrivileges=true
PrivateDevices=true
PrivateTmp=true
PrivateUsers=true
ProtectControlGroups=true
ProtectHome=true
ProtectKernelModules=true
ProtectKernelTunables=true
ProtectSystem=strict

[Install]
WantedBy=multi-user.target
~~~

Reload systemd `systemctl daemon-reload` and enable/start pyzor socket `systemctl enable pyzor.socket && systemctl start pyzor.socket`

`pyzor.socket` will call `pyzor@.service` so there is no need to enable/start `pyzor@.service`

Since Pyzor is executed as `_rspamd` you probably have to create the Pyzor home directory `mkdir /var/lib/rspamd/.pyzor`, alternatively create a dedicated Pyzor user and edit `pyzor@.service`.

Once Pyzor is running, the `PYZOR` symbol weight is calculated dynamically based on the number of times a message has been seen and whitelisted by Pyzor (Count - WL-Count of default_score in percent)

## Razor specific details

Razor is, like Pyzor and DCC, a bulk email scanner that doesn't detect spam but how often a message (hash) has been seen, or how "bulky" a message is.

To expose Razor to rspamd, a systemd socket is used, and a wrapper is not required.

To install Razor on CentOS/Rocky Linux, run the command yum install `perl-Razor-Agent`.

After installation, enable the module by modifying the configuration file.

~~~ucl
# local.d/external_services.conf
...
razor {
  # default razor settings
  servers = "127.0.0.1:11342"
}
~~~

Restart rspamd `systemctl restart rspamd`

Add the systemd socket and service:

~~~ucl
# /usr/lib/systemd/system/razor.socket

[Unit]
Description=Razor socket

[Socket]
ListenStream=127.0.0.1:11342
Accept=yes

[Install]
WantedBy=sockets.target
~~~

~~~ucl
# /usr/lib/systemd/system/razor@.service

[Unit]
Description=Razor Socket Service
Requires=razor.socket

[Service]
Type=simple
ExecStart=/bin/sh -c '/usr/bin/razor-check && /usr/bin/echo -n "spam" || /usr/bin/echo -n "ham"'
StandardInput=socket
StandardError=journal
TimeoutStopSec=10

User=_rspamd
NoNewPrivileges=true
PrivateDevices=true
PrivateTmp=true
PrivateUsers=true
ProtectControlGroups=true
ProtectHome=true
ProtectKernelModules=true
ProtectKernelTunables=true
ProtectSystem=strict

[Install]
WantedBy=multi-user.target
~~~

Reload systemd `systemctl daemon-reload` and enable/start razor socket `systemctl enable razor.socket && systemctl start razor.socket`

`razor.socket` will call `razor@.service` so there is no need to enable/start `razor@.service`

The `RAZOR` symbole will be added based on the exit code of Razor (0 = SPAM or 1 = HAM)

## VadeSecure specific details

To use the VadeSecure module, a valid installation of Filterd from [VadeSecure](https://www.vadesecure.com/en/isp-products/) is required. Please [contact VadeSecure](https://www.vadesecure.com) to obtain a valid trial or commercial license to get this product.

Once installed, you can use VadeSecure to adjust symbols based on the category returned by Filterd. The default settings for this module are listed below and can be redefined in the `local.d/external_services.conf` file as needed:

~~~ucl
vadesecure {
  servers = 127.0.0.1,
  default_port = 23808,
  url = '/api/v1/scan',
  use_https = false,
  timeout = 5.0,
  log_clean = false,
  retransmits = 1,
  cache_expire = 7200,
  message = '${SCANNER}: spam message found: "${VIRUS}"',
  detection_category = "hash",
  default_score = 1,
  action = false,
  log_spamcause = true,
  symbol_fail = 'VADE_FAIL',
  symbol = 'VADE_CHECK',
  symbols = {
    clean = {
      symbol = 'VADE_CLEAN',
      score = -0.5,
      description = 'VadeSecure decided message to be clean'
    },
    spam = {
      high = {
        symbol = 'VADE_SPAM_HIGH',
        score = 8.0,
        description = 'VadeSecure decided message to be clearly spam'
      },
      medium = {
        symbol = 'VADE_SPAM_MEDIUM',
        score = 5.0,
        description = 'VadeSecure decided message to be highly likely spam'
      },
      low = {
        symbol = 'VADE_SPAM_LOW',
        score = 2.0,
        description = 'VadeSecure decided message to be likely spam'
      },
    },
    malware = {
      symbol = 'VADE_MALWARE',
      score = 8.0,
      description = 'VadeSecure decided message to be malware'
    },
    scam = {
      symbol = 'VADE_SCAM',
      score = 7.0,
      description = 'VadeSecure decided message to be scam'
    },
    phishing = {
      symbol = 'VADE_PHISHING',
      score = 8.0,
      description = 'VadeSecure decided message to be phishing'
    },
    commercial =  {
      symbol = 'VADE_COMMERCIAL',
      score = 0.0,
      description = 'VadeSecure decided message to be commercial message'
    },
    community =  {
      symbol = 'VADE_COMMUNITY',
      score = 0.0,
      description = 'VadeSecure decided message to be community message'
    },
    transactional =  {
      symbol = 'VADE_TRANSACTIONAL',
      score = 0.0,
      description = 'VadeSecure decided message to be transactional message'
    },
    suspect = {
      symbol = 'VADE_SUSPECT',
      score = 3.0,
      description = 'VadeSecure decided message to be suspicious message'
    },
    bounce = {
      symbol = 'VADE_BOUNCE',
      score = 0.0,
      description = 'VadeSecure decided message to be bounce message'
    },
    other = 'VADE_OTHER',
  }
}
~~~

You can define subcategories for symbols if needed (see `spam` example above).

## SpamAssassin specific details

Note that the SpamAssassin module in External Services requires the use of the spamd daemon. However, please keep in mind that there is also a dedicated SpamAssassin module for Rspamd, which offers different benefits. The dedicated module can load SpamAssassin rules directly into the Rspamd environment, whereas the External Services module communicates with a separate SpamAssassin installation.

It's worth noting that compared to Rspamd, SpamAssassin is much more CPU-intensive and may slow down your server. If you only need to use your existing SpamAssassin rules, the dedicated module is a better option, or you could transfer your rules into multimaps and/or composites.

However, the External Services module offers the benefit of supporting all SpamAssassin features and plugins, such as iXHash. If you're using the Neural Network plugin, you may not want to import thousands of extra symbols into Rspamd. Additionally, this module could be a good choice for a soft migration from a SpamAssassin setup to Rspamd.

### Spamd setup

Enable the spamassassin spamd daemon to listen on a socket or a TCP port. To improve performance, you may want to consider disabling any unused plugins or remote checks by editing the configuration files located in /etc/mail/spamassassin.

### spamassassin module default setup

By default, no special configuration is required for this module. It will automatically set all reported SpamAssassin symbols as strings into the Rspamd SPAMD symbol, and the score reported by spamd will be set as the dynamic score. If you specify a weight for the symbol, it will be used as a multiplier. So, the total score will be calculated as `dynamic_score * weight`.

~~~ucl
# local.d/external_services.conf

spamassassin {
  symbol = "SPAMD"
  type = "spamassassin";
  servers = "127.0.0.1:783";
}
~~~

### spamassassin module extended setup

~~~ucl
# local.d/external_services.conf

spamassassin {
  ...
  extended = true;
  ...
}
~~~

When setting `extended = true` the module will set all reported symbols as dedicated threats. However, keep in mind that in the extended configuration, the score is calculated by multiplying the number of threats with the dynamic score and weight, resulting in the total score. If you want to change this behavior, you can `set one_shot = true`.

~~~ucl
# local.d/external_services_group.conf
symbols = {
...
  "SPAMD" {
    weight = 1.0;
    description = "SPAMD found symbols";
    one_shot = true;
  }
...
}
~~~

Having every symbol set as dedicated threat it is possible to set a Rspamd symbol for reported spamassassin symbols using patters.

~~~ucl
# local.d/external_services.conf

spamassassin {
  ...
  patterns {
    # symbol_name = "pattern";
    SPAMD_NIXSPAM_IXHASH = "^NIXSPAM_IXHASH$";
    SPAMD_GENERIC_IXHASH = "^GENERIC_IXHASH$";
  }
  ...
}
~~~

## Virustotal details

To receive results, Rspamd utilizes the [`file/report`](https://developers.virustotal.com/reference#file-report) endpoint of Virustotal. However, due to the strict policies of Virustotal, it is crucial that you have set your own key in the plugin configuration:

~~~ucl
# local.d/antivirus.conf
virustotal {
  # Obtained from Virustotal
  apikey = "xxx";
  # Change if you use private mirror or another API
  #url = 'https://www.virustotal.com/vtapi/v2/file';
  # Minimum required to get scored
  #minimum_engines = 3;
  # After this number we set max score
  #full_score_engines = 7;
}
~~~

Due to the strict policies of Virustotal, Rspamd does not return the full result. Instead, it only provides the number of engines that matched and the MD5 hash, which can be used to view the full report on the Virustotal website.
