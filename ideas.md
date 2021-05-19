---
layout: default
title: Rspamd project ideas
---

# Rspamd project ideas

## Introduction

This page is intended for those who are interested in contribution to rspamd. In particular, this page might be useful for those who are going to participate in [Google Summer of Code program](https://developers.google.com/open-source/gsoc/). However, this is not limited by this purpose,
since we appreciate any valuable contributions to rspamd project.

## Information for GSoC participants

Prospective students are required to have [a github account](https://github.com), carefully examine the [rspamd source repository](https://github.com/vstakhov/rspamd) and join our discussion IRC channel: #rspamd at irc.oftc.net. All projects suggested requires medium to advanced knowledge in *C* and *Lua* programming languages or at least a strong desire to study the missing one (Lua will not be a problem most likely).

You should also be familiar with git version control system. Should you want to study more about git then please read the following [book](http://git-scm.com/book/en/v2). For the project itself, we suppose to clone rspamd repo to your local github account and do all job there, synchronizing with the rspamd mainline repository by means of `git rebase`.

We encourage picking projects which you feel you can **realistically** do within the **12-week** timeline. Some of the projects imply certain research work, however, we have placed the **approximate** evaluation criteria for the timeline specified by the summer of code programme. Taking such a project is a challenging task but it could improve your research skills and hence lead to a good research project.

All code contributed must be licensed under Apache 2 license.

## Important information about proposals selection

Based on our previous experiences, we have decided to create a list of `small tasks` that could be taken by a prospective students to demonstrate their skills and desire to work with Rspamd this summer. We are publishing this list in our [wiki](https://github.com/vstakhov/rspamd/wiki/GSOC-2018-introductionary-tasks). If you plan to take any of these tasks, then please drop a quick notice in IRC or mailing list where you can find further help and support. All these tasks are intended to be simple enough to be realistically completed in not more than a couple of hours.


#### List of mentors available for the project via IRC and Google groups mailing list:

|---
| Mentor | IRC nick | E-Mail | Role
|:-|:-|-:|:-|
| Vsevolod Stakhov | cebka | vsevolod@rspamd.com | Mentor, Organization Administrator
| Andrew Lewis | notkoos | notkoos@rspamd.com | Mentor, Backup Administrator
| Andrej Zverev | az | az@rspamd.com | Mentor
| Steve Freegard | smf | steve@rspamd.com | Mentor

## List of projects available

Here is the list of projects that are desired for rspamd. However, students are encouraged to suggest their own project assuming they could provide reasonable motivation for it.

- [List of projects available](#list-of-projects-available)
  - [XMPP filtering support](#xmpp-filtering-support)
  - [HTTPS server support](#https-server-support)
  - [WebUI plugins improvements](#webui-plugins-improvements)
  - [Tarantool support](#tarantool-support)
  - [Languages based redis backend for bayes](#languages-based-redis-backend-for-bayes)
  - [Bayes signatures in webui](#bayes-signatures-in-webui)
  - [Bag of words NN model](#bag-of-words-nn-model)
  - [GnuPG signing and verification support](#gnupg-signing-and-verification-support)

### XMPP filtering support

Rspamd can now be used for filtering of email messages. However, there are no obstacles in applying Rspamd for other protocols such as XMPP. We expect that during this project a prospective student will study xmpp protocol specific details and will write integration for some popular jabber servers (for example, prosody or ejabberd).

* Difficulty: medium
* Required skills: lua skills, understanding of XMPP, basic machine learning
* Possible mentors: cebka, az

Benefits for a student:

Evaluation details:

* We suppose that at the midterm evaluation, we could estimate the following:
	- basic integration with one of jabber servers,
	- basic adoption of Rspamd to filter XMPP messages.
* At the final evaluation we suppose to have the following features implemented:
	- full integration with one or two jabber servers,
	- XMPP specific rules, plugins and configuration for fast deployment

### HTTPS server support

Rspamd HTTP library supports client mode of HTTPS and server mode with HTTPCrypt. However, in some cases, the usage of HTTPCrypt is not possible due to client's restriction and HTTPS is the only sane choice. Rspamd should be able to support HTTPS as a secure server.

* Difficulty: medium
* Required skills: strong C skills, experiences with openssl and secure programming principles
* Possible mentors: cebka, az

Benefits for a student:

Upon completing of this project, a student will know more about secure protocols and OpenSSL library internals as well as low level C programming.

Evaluation details:

* We suppose that at the midterm evaluation, we could estimate the following:
	- basic HTTPS support on server side of the HTTP library
* At the final evaluation we suppose to have the following features implemented:
	- support for multiple certs, client certificates and ciphers selection
	- certificates generation tool using `rspamadm`

### WebUI plugins improvements

Currently, Rspamd has support to execute plugins callbacks from Lua plugins and return data to WebUI. The idea of this project is to improve support of this method by adding the corresponding functions to the existing plugins:

- surbl (extract URLs)
- fuzzy check (generate hashes)
- multimap (update or check data)
- dkim check (sign a message)
- whitelist (manage lists)

These features are highly demanded by Rspamd users.

* Difficulty: easy
* Required skills: Javascript, Lua
* Possible mentors: notkoos, cebka

Benefits for a student:

Upon completing of this project, a student will have more experiences with Web development, Javascript and Lua programming languages.

Evaluation details:

* We suppose that at the midterm evaluation, we could estimate the following:
	- support of at least 3 plugins in WebUI
* At the final evaluation we suppose to have the following features implemented:
	- support of all plugins with useful configuration in WebUI

### Tarantool support

Rspamd now supports Redis to store all data. [Tarantool](https://tarantool.org) is an excellent modern alternative to Redis providing SQL like interface, more sophisticated data storage with transactions and ACID guarantees as well as Lua scripting support on the server side. Since Rspamd supports message pack (using libucl) it might be a good idea to add Tarantool support to Rspamd for certain (or even all) data.

* Difficulty: medium/hard
* Required skills: Lua, C
* Possible mentors: notkoos, cebka, az

Benefits for a student:

Upon completing of this project, a student will have knowledge in NoSQL systems, data serialization formats and Lua scripting

Evaluation details:

* We suppose that at the midterm evaluation, we could estimate the following:
	- support of Tarantool in C and LuaAPI for Tarantool calls
	- statistics in Tarantool
* At the final evaluation we suppose to have the following features implemented:
	- architecture to support dual backends: Redis and Tarantool
	- adoption of plugins
	- fuzzy storage backend in Tarantool

### Languages based redis backend for bayes

Rspamd Bayes classifier lacks languages support since language detection was not good at all before Rspamd 1.7. So far, it is possible to deal with multi-languages messages and it will be useful to have languages support in statistics.

* Difficulty: medium
* Required skills: C
* Possible mentors: notkoos, cebka, smf

Benefits for a student:

Upon completing of this project, a student will have knowledge about statistical methods, namely Hidden Markov Bayes model and ngramms based language detection.

Evaluation details:

* We suppose that at the midterm evaluation, we could estimate the following:
	- basic language support for bayes backends (primary language)
* At the final evaluation we suppose to have the following features implemented:
	- full language support for multi-language messages
	- preciseness evaluation
	- documentation

### Bayes signatures in webui

Rspamd has some preliminary support of Bayes signatures: a traces of messages being passed expressed as sets of statistical tokens. However, to manage these signatures, we need some front-end support in the Web Interface, namely to observe signatures, learn spam or ham, removing old signatures.

* Difficulty: easy/medium
* Required skills: JS, Lua
* Possible mentors: notkoos, smf

Benefits for a student:

Upon completing of this project, a student will have knowledge about REST HTTP API projecting, bayes models and improve his or her JavaScript skills.

Evaluation details:

* We suppose that at the midterm evaluation, we could estimate the following:
	- history like table with a list of all signatures and associated emails
	- learning support
* At the final evaluation we suppose to have the following features implemented:
	- expiring of signatures
	- statistics of signatures
	- converting a message to a signature
	- documentation

### Bag of words NN model

Bag-of-words or word2vec are two main technologies used for text classification using Neural Networks. Since  we have a sane language detector, it would be beneficial to try some of these text models to build textual neural net based classifier.

* Difficulty: medium
* Required skills: Lua, Torch
* Possible mentors: cebka, smf

Benefits for a student:

Upon completing of this project, a student will have knowledge about natural language processing in machine learning, neural networks and LuaTorch framework.

Evaluation details:

* We suppose that at the midterm evaluation, we could estimate the following:
	- implementation of word2vec or bag-of-words model in Rspamd
	- English language support
* At the final evaluation we suppose to have the following features implemented:
	- evaluation of the model
	- adding meta data to the neural network
	- optimizing of the network architecture
	- multiple languages support
	- documentation

### GnuPG signing and verification support

Rspamd has no support of signed messages. It would be good to add support for both scanning and signing/encryption of the outbound messages. We suggest to use gnupg compatible format as it seems to be the most popular so far. We expect candidates with strong C knowledge and experiences for this task as it involves some low level parsing of untrusted data.

* Difficulty: hard
* Required skills: C, Lua
* Possible mentors: cebka

Benefits for a student:

Upon completing of this project, a student will have knowledge about cryptography, PGP and improve skills in writing secure code in plain C.

Evaluation details:

* We suppose that at the midterm evaluation, we could estimate the following:
	- support of gnupg messages parsing
	- basic support of messages signing
* At the final evaluation we suppose to have the following features implemented:
	- full support of messages signing using multiple private keys
	- verification of known senders
	- messages encryption for known recipients
	- documentation
