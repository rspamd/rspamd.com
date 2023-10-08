---
layout: doc
title: Rspamd features
---

## About Rspamd

<abbr title="Rapid Spam Daemon"><a href="{{ site.url }}{{ site.baseurl }}">Rspamd</a></abbr> is an advanced spam filtering system that employs a range of techniques, including regular expressions, statistical analysis, and custom services like URL blacklists, to assess incoming messages. It assigns a "spam score" to each message, and depending on this score and the user's configuration, suggests an appropriate action for the MTA to take, such as allowing, rejecting, or marking the message. Rspamd boasts the capability to handle hundreds of messages per second concurrently and offers a multitude of features.

For a quick overview, you can watch the following [video](https://chemnitzer.linux-tage.de/2019/en/programm/beitrag/212) from the [Linux Chemnitz Days 2019](https://chemnitzer.linux-tage.de).

To gain a deeper understanding of Rspamd's impressive speed, you may want to explore the recent [performance analysis article](https://rspamd.com/misc/2019/05/16/rspamd-performance.html). This article provides valuable insights into Rspamd's rapid processing capabilities.

<div><h2><img src="img/features.jpg" class="" height="50" width="50" style="position: relative; bottom: 10px;"> Unique features</h2></div>

* [**Web interface**]({{ site.baseurl }}/webui/). Rspamd features a comprehensive Ajax-based web interface that empowers users to oversee and fine-tune Rspamd's rules, scoring mechanisms, dynamic lists, message scanning and learning processes, as well as access scan history. This self-hosted web interface operates without the need for additional configuration and adheres to contemporary web application standards. There's no requirement for a dedicated web server or application server to run the web UI; all that's necessary is to run Rspamd and open it in a web browser.

* [**Integration with MTA**]({{ site.baseurl }}/doc/integration.html). Rspamd seamlessly integrates with the most widely used mail transfer systems, including Postfix, Exim, Sendmail, and Haraka.

* [**Extensive Lua API**]({{ site.baseurl }}/doc/lua). Rspamd includes a vast library of Lua functions that empower you to craft custom rules for precise and effective spam filtering.

* [**Dynamic tables**]({{ site.baseurl }}/doc/faq.html#what-are-maps) - it is possible to specify bulk lists as `dynamic maps` that are checked in runtime with updating data only when they are changed. Rspamd supports file, HTTP and HTTPS maps.

<div><h2><img src="img/envelope_loupe.jpg" class="" height="50" width="50" style="position: relative; bottom: 10px;"> Content scan features</h2></div>

Content scanning features enable Rspamd to search for specific patterns within messages, including text segments, headers, and raw content. These technologies are aimed at filtering out common spam messages and contribute to the static aspect of spam filtering. Rspamd supports various types of content scanning checks, including:

* [**Regular expression filtering**]({{ site.baseurl }}/doc/modules/regexp.html) provides basic processing of messages, including their textual parts, MIME headers, and SMTP data received by the MTA. This processing is performed against a set of expressions that includes both standard regular expressions and message processing functions. Rspamd's regular expressions are a powerful tool for filtering messages based on predefined rules. Additionally, Rspamd can utilize SpamAssassin regular expressions via a [plugin]({{ site.baseurl }}/doc/modules/spamassassin.html).

* [**Fuzzy hashes**]({{ site.baseurl }}/doc/modules/fuzzy_check.html) are used to detect similar messages. Unlike regular hashes, these structures are designed to overlook minor differences between text patterns. This enables Rspamd to swiftly identify common messages. The system maintains an internal storage of these hashes, allowing users to block mass spam emails based on message reputation, as indicated by user feedback. Moreover, the fuzzy storage permits Rspamd to incorporate data from ["honeypots"](https://wikipedia.org/wiki/Honeypot_(computing)#Spam_versions) without affecting the statistical module. For more detailed information, please refer to the following [document]({{ site.baseurl }}/doc/fuzzy_storage.html).
* [**DCC**]({{ site.baseurl }}/doc/modules/dcc.html) is quite similar to the previous one but it uses the external service [DCC](https://www.rhyolite.com/dcc/) to check if a message is a bulk message (that is sent to many recipients simultaneously).

* [**Chartable**]({{ site.baseurl }}/doc/modules/chartable.html) module aids in identifying specially crafted messages designed to deceive spam filtering systems by altering the language of text and substituting letters with their counterparts. Rspamd employs `UTF-8` normalization to detect and filter such techniques, which are frequently employed by spammers.

<div><h2><img src="img/cloud.jpg" class="" height="50" width="50" style="position: relative; bottom: 10px;"> Policy check features</h2></div>

Numerous resources establish policies for various elements in email transmission, such as the sender's IP address, URLs within a message, and even the message itself. For instance, a message might be signed by the sender using <abbr title="Domain Key Identified Mail">DKIM</abbr> technology. Another example includes URL filtering, encompassing [phishing checks]({{ site.baseurl }}/doc/modules/phishing.html) or URL DNS blacklists like [SURBL]({{ site.baseurl }}/doc/modules/surbl.html). Rspamd accommodates various policy checks:

* [**SPF**]({{ site.baseurl }}/doc/modules/spf.html) checks allow to validate a message's sender using the policy defined in the DNS record of sender's domain. You can read about <abbr title="Sender Policy Framework">SPF</abbr> policies [here](https://tools.ietf.org/html/rfc7208). A number of mail systems  support SPF, such as `Gmail` or `Yahoo Mail`.

* [**DKIM**]({{ site.baseurl }}/doc/modules/dkim.html) policy validates a message's cryptographic signature against a public key placed in the DNS record of sender's domain. This method allows to ensure that a message has been received from the specified domain without altering on the path. Rspamd also supports [**DKIM signing**]({{ site.baseurl }}/doc/modules/dkim_signing.html)

* [**DMARC**]({{ site.baseurl }}/doc/modules/dmarc.html) combines DKIM and SPF techniques to define more or less restrictive policies for certain domains. Rspamd can also store data for DMARC reports in [Redis](https://redis.io) database.

* [**ARC**]({{ site.baseurl }}/doc/modules/arc.html) is a relatively new addition to the DKIM signing mechanism allowing to forward signed messages over a chain of trusted relays.

* [**Whitelists**]({{ site.baseurl }}/doc/modules/whitelist.html) serve the purpose of preventing false positive detections for trusted domains that successfully pass other checks like DKIM, SPF, or DMARC. For instance, emails from PayPal should not be filtered if they are correctly signed with a PayPal domain signature. Conversely, if they lack proper signatures and DMARC policy sets strict requirements for DKIM, marking such emails as spam is appropriate as they might be potential phishing attempts. The Whitelist module offers various modes for policy matching and the whitelisting or blacklisting of specific combinations of verification results.

* [**DNS lists**]({{ site.baseurl }}/doc/modules/rbl.html) enable the assessment of a sender's IP address or network reputation. Rspamd utilizes various DNS lists, including notable ones like `SORBS` and `SpamHaus`. Nevertheless, Rspamd doesn't solely rely on any particular DNS list and refrains from rejecting emails based solely on this criterion. Rspamd also employs white and grey DNS lists to minimize the chances of false positive spam detections.

* [**URL lists**]({{ site.baseurl }}/doc/modules/surbl.html) bear a resemblance to DNS blacklists but focus on URLs within messages to combat spam and phishing. Rspamd boasts comprehensive built-in support for leading SURBL lists, including [URIBL](https://uribl.com) and [SURBL](https://surbl.org) from SpamHaus.

* [**Phishing checks**]({{ site.baseurl }}/doc/modules/phishing.html) are immensely valuable for filtering out phishing messages and safeguarding users against cyberattacks. Rspamd employs sophisticated algorithms to detect phished URLs and accommodates well-known URL redirectors (e.g., <https://t.co>) to minimize false positives. It also offers support for popular phishing databases like [OpenPhish](https://openphish.com) and [PhishTank](https://phishtank.com).

* [**Rate limits**]({{ site.baseurl }}/doc/modules/ratelimit.html) allow to prevent mass mails to be sent from your own hacked users. This is an extremely useful feature to protect both inbound and outbound mail flows. 

* [**IP reputation**]({{ site.baseurl }}/doc/modules/ip_score.html) plugin allows to adjust reputation for specific IP addresses, networks, autonomous blocks (ASN) and even countries.

* [**Greylisting**]({{ site.baseurl }}/doc/modules/greylisting.html) is a commonly employed technique to introduce delays for suspicious messages, as many spammers do not use fully functional SMTP servers that can queue delayed messages. Rspamd incorporates greylisting internally and can delay messages with scores exceeding a certain threshold.

* [**Replies module**]({{ site.baseurl }}/doc/modules/replies.html) is intended to whitelist messages that are reply to our own messages as these messages are likely important for users and false positives are highly undesirable for them.

* [**Maps module**]({{ site.baseurl }}/doc/modules/multimap.html) provides a Swiss Knife alike tool that could filter messages based on different attributes: headers, envelope data, sender's IP and so on. This module is highly useful for constructing custom rules.

<div><h2><img src="img/graf.jpg" class="" height="50" width="50" style="position: relative; bottom: 10px;"> Statistical tools</h2></div>

The statistical approach encompasses a range of valuable spam recognition techniques that can dynamically "learn" from the messages being scanned. Rspamd offers various tools that can be trained either manually or automatically, adapting to the actual mail flow.

* [**Bayes classifier**]({{ site.baseurl }}/doc/configuration/statistic.html) is a tool for classifying spam and ham messages. Rspamd employs an advanced algorithm for generating statistical tokens, which can yield better results compared to the commonly used naive Bayes method. You can find more details about this algorithm [here](https://www.virusbulletin.com/virusbulletin/2007/02/osbf-lua/).

* [**Neural network**]({{ site.baseurl }}/doc/modules/neural.html) learns from scan results and enables the improvement of the final score by identifying common patterns of rules that are typical for either spam or ham messages. This module is particularly valuable for large email systems, as it can quickly adapt and learn from your own rules, making it effective against spam mass mailings.
