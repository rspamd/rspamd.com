---
layout: doc
title: External Services module
---

# External Services module

External Services module (available from Rspamd 1.9.0) provides integration with various external services.

{::options parse_block_html="true" /}
<div id="toc">
  <h2 class="toc-header">Contents</h2>
  * TOC
  {:toc}
</div>

## Configuration

The configuration for an external service is done by defining rules. If a service reports one or more threats the configured symbol will be set (e.g. ICAP_VIRUS) with the threats as description and if set the reject action will be triggered.

When there is an error during the connection or the external service reports failures the fail symbol (e.g. ICAP_VIRUS_FAIL) will be set with the error message as description. For both symbols you can use patterns to set a dedicated symbol for any threat name or error message:

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

In the default configuration the complete mail will be send to the external service system. You can and you have to change this behavior for some services by setting scan_mime_parts = true; to send all mime parts detected as attachments seperately. Set scan_text_mime or scan_image_mime to true if you also want text mimes and images send to the AV scanner.

Also you are able to use 2 types of mime part filters:

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

mime_parts_filter_regex will match on the content-type or the filename of an attachment. mime_parts_filter_ext will only match the extension of the filename.

Next to the defaults you normally have to set individual config options for each rule detailed below.

By default, given [Redis]({{ site.baseurl }}/doc/configuration/redis.html) is configured globally and `external_services` is not explicitly disabled in redis configuration, results are cached in Redis according to message checksums.

Settings should be added to `/etc/rspamd/local.d/external_services.conf`:

~~~ucl
# local.d/external_services.conf

# multiple scanners could be checked, for each we create a configuration block with an arbitrary name
icap {
  servers = "127.0.0.1:1344";

  # symbol to add (add it to metric if you want non-zero weight)
  symbol = "ICAP_VIRUS";

  # type of scanner: "icap", "oletools", "dcc" or "vadesecure"
  type = "icap";

  # Scan mime_parts seperately - otherwise the complete mail will be transfered
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

ICAP servers are normally used by http proxies or file servers to scan HTTP queries or files. Only the RESPMOD method is supported in Rspamd. Currently Rspamd evaluates the X-Infection-Found and X-Virus-ID return headers.

This module was tested with these icap implementations:

*   ClamAV (using c-icap server and squidclamav)
*   Sophos (via SAVDI)
*   Symantec Protection Engine for Cloud Services

Please report other working or non-working icap implementations.

~~~ucl
# local.d/external_services.conf

clamav_icap {
  ...
  scheme = "squidclamav";
  ...
}

~~~

Scan requests are send to an icap URL (e.g. icap://127.0.0.1:1344/squidclamav). So next to IP and port a scheme is needed to communicate with the icap server. Often icap servers have multiple schemes - so choose one with RESPMOD support.

Typical error responses like `X-Infection-Found: Type=2; Resolution=2; Threat=Encrypted container violation;` will be reported as symbol fail (e.g. CLAM_ICAP_FAIL(0.00){Encrypted container violation}).


## oletools specific details

Oletools is a great python module for scanning and analyzing office documents with macros. Typically a macro-virus uses an auto-exec function to be loaded when the document is opened next to functions for executing code in a shell or save files to the system. oletools classifies bad functions in AutoExec and Suspicious. In the default mode the oletools module will set the result when at least one AutoExec and one Suspicious function is used.

Please take in mind oletools is not an antivirus scanner. It just analyzes a macro. There are also legit office files with AutoExec and Suspicious functions. Also we have seen some macro viruses not using AutoExec functions. If you want a more detailed control over the oletools modules behavior, have a look to the extended mode below. Maybe you also want to have a look to the olevba documentation: [https://github.com/decalage2/oletools/wiki/olevba](https://github.com/decalage2/oletools/wiki/olevba)

The oletools default behavior is useful if you don't want to block all office files with macros, but files with macros using functions often seen in macro viruses.

**Note**: There are some Word files with .doc extension but internally using the RTF (Rich Text Format). RTF has also security vulnerabilities. oletools currently returns RETURN_OPEN_ERROR for RTF files. This will be fixed in a future release.

To use oletools with Rspamd you have to install a wrapper daemon: [olefy](https://github.com/HeinleinSupport/olefy).

olefy communicates with Rspamd over TCP and calls olevba to get the report of an office file.


### oletools default mode

In order to send only office files to the olevba analyzer set mime_parts_filter_regex and mime_parts_filter_ext like shown below. (Maybe this list is still incomplete). Sometimes office files are sent with the generic content-type `application/octet-stream`. You can enable UNKNOWN to catch these, but this will also catch non-office file attachments like images, pdf etc. Sending non-office files to olevba will result in error messages.

~~~ucl
# local.d/external_services.conf

oletools {
  ...
  # default olefy settings
  servers = "127.0.0.1:10050"

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

In the default mode the oletools module will set a symbol description like this: `OLETOOLS(1.00)[AutoExec + Suspicious (Document_open,Shell,Chr)]`. The words inside the brackets are the macro functions reported by olevba.

If you enable debug mode for external_services the oletools module will also report the description of a function as reported by olevba.


### oletools extended mode

In the extended mode the oletools module will not trigger on specific categories, but will *always* set a threat string with all found flags when at least a macro was found. Next to the flags all reported functions will be set as individual threats:

`OLETOOLS (4.00)[MAS-----, Document_open, Shell, Chr]`

In this example 4 threats will be reported (and the symbol score will be counted 4 times). You can use `one_shot = true` change this behavior.

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

With having the flags and all functions exposed as individual threats you can now use the pattern configuration to convert the reported threats into symbols and use them in force_actions or composites.

~~~ucl
# local.d/external_services.conf

oletools {
  ...
  patterns {
    # catch Macro, AutoExec, Suspicious and Hex Strings
    BAD_MACRO_MYFLAGS = '^MAS.H...$';
    BAD_MACRO_SHELL   = '^Shell$';
  }
  ...
}

~~~

A little help for the flags:

`MASIHBDV` or `M-------`

*   M=Macros (contains VBA Macros)
*   A=Auto-executable (auto-executable macros)
*   S=Suspicious keywords (suspicious VBA keywords)
*   I=IOCs (macro contains IP, URL or executable filename)
*   H=Hex strings (hex-encoded strings (potential obfuscation))
*   B=Base64 strings (Base64-encoded strings (potential obfuscation))
*   D=Dridex strings (Dridex-encoded strings (potential obfuscation))
*   V=VBA strings (VBA string expressions (potential obfuscation))


## DCC specific details

This modules performs [DCC](http://www.dcc-servers.net/dcc/) lookups to determine
the *bulkiness* of a message (e.g. how many recipients have seen it).

Identifying bulk messages is very useful in composite rules e.g. if a message is
from a freemail domain *AND* the message is reported as bulk by DCC then you can
be sure the message is spam and can assign a greater weight to it.

Please view the License terms on the DCC website before you enable this module.

### Module configuration

This module requires that you have the `dccifd` daemon configured, running and
working correctly.  To do this you must download and build the [latest DCC client]
(https://www.dcc-servers.net/dcc/source/dcc.tar.Z).  Once installed, edit
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

## VadeSecure specific details

You need a valid VadeSecure [Filterd](https://www.vadesecure.com/en/email-content-filtering-isp/) installation. Please [contact VadeSecure](https://www.vadesecure.com) to obtain a valid trial or commercial license to get this product.

After that, you can use VadeSecure to adjust symbols according to the category returned by filterd. Here are the default settings for this module (you can redefine them in `local.d/external_services.conf` file as usual):

~~~ucl
vadesecure {
  default_port = 23808,
  url = '/api/v1/scan',
  use_https = false,
  timeout = 5.0,
  log_clean = false,
  retransmits = 1,
  cache_expire = 7200, -- expire redis in 2h
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

# SpamAssassin specific details

SpamAssassin is supported by using the spamd daemon. Please take in mind there is also a dedicated spamassassin module with different benefits. The dedicated spamassassin module is able to load spamassassin rules directly into the Rspamd environment whereas the External Services SpamAssassin module communicates to a full separate spamassassin installation.

Just a warning - compared to Rspamd SpamAssassin is much more CPU-hungry and will maybe slow down your server. If you just want to use your existing spamassassin rules you should go with the dedicated spamassassin module or even tranfer your rules into multimaps and/or composites.

The benefit of this module is the support of all spamassassin features and plugins (e.g. iXHash). Also if you are using the Neural Network plugin you maybe don't want to import thousands of extra symbols into Rspamd. Another approach is maybe the soft migration from a SpamAssassin setup to Rspamd.

## Spamd setup

Enable the spamassassin spamd daemon to listen on a socket or a TCP port. You might want to disable all unused plugins or even all remote checks by editing the config files in /etc/mail/spamassassin.

## spamassassin module default setup

In the default setup no special configuration is needed. The module will set all reported spamassassin symbols as string into the Rspamd SPAMD symbol. The score reported by spamd will be set as dynamic score. If you set the weight of the symbol it will be used as a mutliplier - so `dynamic_score * weight = total score`.

~~~ucl
# local.d/external_services.conf

spamassassin {
  symbol = "SPAMD"
  type = "spamassassin";
  servers = "127.0.0.1:783";
}
~~~

## spamassassin module extended setup

~~~ucl
# local.d/external_services.conf

spamassassin {
  ...
  extended = true;
  ...
}
~~~

When setting `extended = true` the module will set all reported symbols as dedicated threats. Be aware in the extended configuration the score calculation is `number of threats * dynamic_score * weight = total score`. You can use `one_shot = true` change this behavior.


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
