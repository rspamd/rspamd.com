---
layout: doc
title: Rspamd features
---

## About Rspamd

<abbr title="Rapid Spam Daemon"><a href="{{ site.url }}{{ site.baseurl }}">Rspamd</a></abbr>  is an advanced spam filtering system that uses various methods, such as regular expressions, statistical analysis, and custom services like URL blacklists, to evaluate messages. It assigns each message a "spam score" and based on this score and the user's settings, recommends an action for the MTA to take on the message, such as passing, rejecting, or adding a header. Rspamd is capable of processing hundreds of messages per second simultaneously and has many features available.

For a brief introduction, you can watch the following [video](https://chemnitzer.linux-tage.de/2019/en/programm/beitrag/212) from the [Linux Chemnitz Days 2019](https://chemnitzer.linux-tage.de).

You can also check the recent [performance analyse article](https://rspamd.com/misc/2019/05/16/rspamd-performance.html) to have a better impression about how fast Rspamd could be.

<div><h2><img src="img/features.jpg" class="" height="50" width="50" style="position: relative; bottom: 10px;"> Unique features</h2></div>

* [**Web interface**]({{ site.baseurl }}/webui/). Rspamd includes a fully functional, Ajax-based web interface that allows users to monitor and configure Rspamd rules, scores, dynamic lists, scan and learn messages, and view scan history. The web interface is self-hosted, requires no configuration, and follows current web application standards. No web server or application server is needed to run the web UI - simply run Rspamd and a web browser.

* [**Integration with MTA**]({{ site.baseurl }}/doc/integration.html). Rspamd can work with the most popular mail transfer systems, such as Postfix, Exim, Sendmail or Haraka.

* [**Extensive Lua API**]({{ site.baseurl }}/doc/lua). Rspamd ships with hundreds of Lua functions that are helpful to create your own rules for efficient and targeted spam filtering.

* [**Dynamic tables**]({{ site.baseurl }}/doc/faq.html#what-are-maps) - it is possible to specify bulk lists as `dynamic maps` that are checked in runtime with updating data only when they are changed. Rspamd supports file, HTTP and HTTPS maps.

<div><h2><img src="img/envelope_loupe.jpg" class="" height="50" width="50" style="position: relative; bottom: 10px;"> Content scan features</h2></div>

Content scan features allow Rspamd to search for specific patterns in messages, including text parts, headers, and raw content. These technologies are designed to filter out common spam messages and provide a static aspect of spam filtering. Rspamd supports various types of content scanning checks, including:

* [**Regular expression filtering**]({{ site.baseurl }}/doc/modules/regexp.html) offers basic processing of messages, their textual parts, MIME headers and SMTP data received by MTA against a set of expressions that includes both normal regular expressions and message processing functions. Rspamd regular expressions are a powerful tool that allows to filter messages based on some pre-defined rules. Rspamd can also use SpamAssassin regular expressions via [plugin]({{ site.baseurl }}/doc/modules/spamassassin.html).

* [**Fuzzy hashes**]({{ site.baseurl }}/doc/modules/fuzzy_check.html) are used by Rspamd to find similar messages. Unlike regular hashes, these structures are designed to ignore small differences between text patterns, allowing Rspamd to quickly identify common messages. Rspamd has an internal storage of these hashes and allows users to block spam mass emails based on the reputation of the message as indicated by user feedback. Additionally, the fuzzy storage allows Rspamd to incorporate data from ["honeypots"]((http://en.wikipedia.org/wiki/Honeypot_(computing)#Spam_versions) without contaminating the statistical module. You can read more about it in the following [document]({{ site.baseurl }}/doc/fuzzy_storage.html).

* [**DCC**]({{ site.baseurl }}/doc/modules/dcc.html) is quite similar to the previous one but it uses the external service [DCC](http://www.rhyolite.com/dcc/) to check if a message is a bulk message (that is sent to many recipients simultaneously).

* [**Chartable**]({{ site.baseurl }}/doc/modules/chartable.html) module helps to find specially crafted messages that are intended to cheat spam filtering systems by switching the language of text and replacing letters with their analogues. Rspamd uses `UTF-8` normalization to detect and filter such techniques commonly used by many spammers.

<div><h2><img src="img/cloud.jpg" class="" height="50" width="50" style="position: relative; bottom: 10px;"> Policy check features</h2></div>

There are many resources that define policies for different objects in email transfer: for sender's IP address, for URLs in a message and even for a message itself. For example, a message could be signed by sender using <abbr title="Domain Key Identified Mail">DKIM</abbr> technology. Another example could be URL filtering: [phishing checks]({{ site.baseurl }}/doc/modules/phishing.html) or URL DNS blacklists - [SURBL]({{ site.baseurl }}/doc/modules/surbl.html). Rspamd supports various policy checks:

* [**SPF**]({{ site.baseurl }}/doc/modules/spf.html) checks allow to validate a message's sender using the policy defined in the DNS record of sender's domain. You can read about <abbr title="Sender Policy Framework">SPF</abbr> policies [here](https://tools.ietf.org/html/rfc7208). A number of mail systems  support SPF, such as `Gmail` or `Yahoo Mail`.

* [**DKIM**]({{ site.baseurl }}/doc/modules/dkim.html) policy validates a message's cryptographic signature against a public key placed in the DNS record of sender's domain. This method allows to ensure that a message has been received from the specified domain without altering on the path. Rspamd also supports [**DKIM signing**]({{ site.baseurl }}/doc/modules/dkim_signing.html)

* [**DMARC**]({{ site.baseurl }}/doc/modules/dmarc.html) combines DKIM and SPF techniques to define more or less restrictive policies for certain domains. Rspamd can also store data for DMARC reports in [Redis](https://redis.io) database.

* [**ARC**]({{ site.baseurl }}/doc/modules/arc.html) is a relatively new addition to the DKIM signing mechanism allowing to forward signed messages over a chain of trusted relays.

* [**Whitelists**]({{ site.baseurl }}/doc/modules/whitelist.html) are used to avoid false positive hits for trusted domains that pass other checks, such as DKIM, SPF or DMARC. For example, we should not filter messages from PayPal if they are correctly signed with PayPal domain signature. On the other hand, if they are not signed and DMARC policy defines restrictive rules for DKIM, we should mark this message as spam as it is potentially phishing. Whitelist module provides different modes to perform policy matching and whitelisting or blacklisting of certain combinations of verification results.

* [**DNS lists**]({{ site.baseurl }}/doc/modules/rbl.html) allows to estimate reputation of sender's IP address or network. Rspamd uses a number of DNS lists including such lists as `SORBS` or `SpamHaus`. However, Rspamd doesn't trust ultimately any specific DNS list and does not reject mail based just on this factor. Rspamd also uses white and grey DNS lists to avoid false positive spam hits.

* [**URL lists**]({{ site.baseurl }}/doc/modules/surbl.html) are rather similar to DNS black lists but uses URLs in a message to fight spam and phishing. Rspamd has full embedded support of the most popular SURBL lists, such as [URIBL](http://uribl.com) and [SURBL](http://surbl.org) from SpamHaus.

* [**Phishing checks**]({{ site.baseurl }}/doc/modules/phishing.html) are extremely useful to filter phishing messages and protect users from cyber attacks. Rspamd uses sophisticated algorithms to find phished URLs and supports the popular URL redirectors (for example, <http://t.co>) to avoid false positive hits. Popular phishing databases, such as [OpenPhish](https://openphish.com) and [PhishTank](https://phishtank.com) are also supported.

* [**Rate limits**]({{ site.baseurl }}/doc/modules/ratelimit.html) allow to prevent mass mails to be sent from your own hacked users. This is an extremely useful feature to protect both inbound and outbound mail flows. 

* [**IP reputation**]({{ site.baseurl }}/doc/modules/ip_score.html) plugin allows to adjust reputation for specific IP addresses, networks, autonomous blocks (ASN) and even countries.

* [**Greylisting**]({{ site.baseurl }}/doc/modules/greylisting.html) is a common method to introduce delay for suspicious messages, as many spammers do not use the fully functional SMTP servers that allow to queue delayed messages. Rspamd implements greylisting internally and can delay messages that has a score higher than certain threshold.

* [**Replies module**]({{ site.baseurl }}/doc/modules/replies.html) is intended to whitelist messages that are reply to our own messages as these messages are likely important for users and false positives are highly undesirable for them.

* [**Maps module**]({{ site.baseurl }}/doc/modules/multimap.html) provides a Swiss Knife alike tool that could filter messages based on different attributes: headers, envelope data, sender's IP and so on. This module is very useful for building custom rules.

<div><h2><img src="img/graf.jpg" class="" height="50" width="50" style="position: relative; bottom: 10px;"> Statistical tools</h2></div>

Statistical approach includes many useful spam recognition techniques that can **learn** dynamically from messages being scanned. Rspamd provides different tools that could be learned either manually or automatically and adopt for the actual mail flow.

* [**Bayes classifier**]({{ site.baseurl }}/doc/configuration/statistic.html) is a tool to classify spam and ham messages. Rspamd uses an [advanced algorithm](https://www.virusbulletin.com/virusbulletin/2007/02/osbf-lua/) of statistical tokens generation that might achieve better results than the mostly used naive Bayes method.

* [**Neural network**]({{ site.baseurl }}/doc/modules/neural.html) learns from scan results and allows to improve the final score by finding some common patterns of rules that are typical for either spam or ham messages. This module is especially useful for large email systems as it can learn from your own rules and adopt quickly for spam mass mailings.
