---
layout: doc
title: Rspamd Architecture
---
# Rspamd protocol

## Protocol basics

Rspamd uses the HTTP protocol, either version 1.0 or 1.1. Rspamd defines some headers which allow the passing of extra information about a scanned message, such as envelope data, IP address or SMTP SASL authentication data, etc. Rspamd supports normal and chunked encoded HTTP requests.

## Rspamd HTTP request

Rspamd encourages the use of the HTTP protocol since it is standard and can be used by every programming language without the use of exotic libraries. A typical HTTP request looks like the following:

	POST /checkv2 HTTP/1.0
	Content-Length: 26969
	From: smtp@example.com
	Pass: all
	Ip: 95.211.146.161
	Helo: localhost.localdomain
	Hostname: localhost

	<your message goes here>

You can also use chunked encoding that allows streamlined data transfer which is useful if you don't know the length of a message.

### HTTP request

Normally, you should just use `/checkv2` here. However, if you want to communicate with the controller then you might want to use [controller commands](#controller-http-endpoints).

### HTTP headers

To avoid unnecessary work, Rspamd allows an MTA to pass pre-processed data about the message by using either HTTP headers or a JSON control block (described further in this document). Rspamd supports the following non-standard HTTP headers:

| Header          | Description                       |
| :-------------- | :-------------------------------- |
| `Deliver-To` | Defines actual delivery recipient of message. Can be used for personalized statistics and for user specific options. |
| `IP`         | Defines IP from which this message is received. |
| `Helo`       | Defines SMTP helo |
| `Hostname`   | Defines resolved hostname |
| `From`       | Defines SMTP mail from command data |
| `Queue-Id`   | Defines SMTP queue id for message (can be used instead of message id in logging). |
| `Rcpt`       | Defines SMTP recipient (there may be several `Rcpt` headers) |
| `Pass`       | If this header has `all` value, all filters would be checked for this message. |
| `Subject`    | Defines subject of message (is used for non-mime messages). |
| `User`       | Defines SMTP user. |
| `Message-Length` | Defines the length of message excluding the control block. |
| `Settings-ID` | Defines [settings id](../configuration/settings.html) to apply. |
| `Settings` | Defines list of rules ([settings](../configuration/settings.html) `apply` part) as raw json block to apply. |
| `User-Agent` | Defines user agent (special processing if it is `rspamc`). |
| `MTA-Tag` | MTA defined tag (can be used in settings). |
| `MTA-Name` | Defines MTA name, used in `Authentication-Results` routines. |
| `TLS-Cipher` | Defines TLS cipher name. |
| `TLS-Version` | Defines TLS version. |
| `TLS-Cert-Issuer` | Defines Cert issuer, can be used in conjunction with `client_ca_name` in [proxy worker](../workers/rspamd_proxy.html). |
| `Filename` | Hint for filename if used with some file. |

Controller also defines certain headers, see [here](#controller-http-endpoints) for detail.

Standard HTTP headers, such as `Content-Length`, are also supported.

## Rspamd HTTP reply

Rspamd reply is encoded in `JSON`. Here is a typical HTTP reply:

	HTTP/1.1 200 OK
	Connection: close
	Server: rspamd/0.9.0
	Date: Mon, 30 Mar 2015 16:19:35 GMT
	Content-Length: 825
	Content-Type: application/json

~~~json
{
    "is_skipped": false,
    "score": 5.2,
    "required_score": 7,
    "action": "add header",
    "symbols": {
        "DATE_IN_PAST": {
            "name": "DATE_IN_PAST",
            "score": 0.1
        },
        "FORGED_SENDER": {
            "name": "FORGED_SENDER",
            "score": 5
        },
        "TEST": {
            "name": "TEST",
            "score": 100500
        },
        "FUZZY_DENIED": {
            "name": "FUZZY_DENIED",
            "score": 0,
            "options": [
                "1: 1.00 / 1.00",
                "1: 1.00 / 1.00"
            ]
        },
        "HFILTER_HELO_5": {
            "name": "HFILTER_HELO_5",
            "score": 0.1
        }
    },
    "urls": [
        "www.example.com",
        "another.example.com"
    ],
    "emails": [
        "user@example.com"
    ],
    "message-id": "4E699308EFABE14EB3F18A1BB025456988527794@example"
}
~~~

For convenience, the reply is LINTed using [JSONLint](http://jsonlint.com). The actual reply is compressed for speed.

Each reply has the following fields:

* `is_skipped` - boolean flag that is `true` if a message has been skipped due to settings
* `score` - floating point value representing the effective score of message
* `required_score` - floating point value meaning the threshold value for the metric
* `action` - recommended action for a message:
	- `no action` - message is likely ham (please notice space, not an underscore)
	- `greylist` - message should be greylisted
	- `add header` - message is suspicious and should be marked as spam (please notice space, not an underscore)
	- `rewrite subject` - message is suspicious and should have subject rewritten
	- `soft reject` - message should be temporary rejected (for example, due to rate limit exhausting)
	- `reject` - message should be rejected as spam
* `symbols` - all symbols added during a message's processing, indexed by symbol names:
    - `name` - name of symbol
    - `score` - final score
    - `options` - array of symbol options as an array of strings

Additional keys that could be in the reply include:

* `subject` - if action is `rewrite subject` this value defines the desired subject for a message
* `urls` - a list of URLs found in a message (only hostnames)
* `emails` - a list of emails found in a message
* `message-id` - ID of message (useful for logging)
* `messages` - object containing optional messages added by Rspamd filters (such as `SPF`)
        - The value of the `smtp_message` key is intended to be returned as SMTP response text by the MTA

## Milter headers

This block of reply is used to manipulate headers and SMTP session. It is placed under `milter` key in the reply. Here are possible elements in this object:

* `add_headers`: headers to add (object, indexed by header name)
* `remove_headers`: headers to remove (object, indexed by header name)
* `change_from`: change SMTP from value (plain string)
* `reject`: custom rejection (plain string value), e.g. `reject="discard"` or `reject="quarantine"`
* `spam_header`: custom spam header (plain string - header name)
* `no_action`: instead of doing any action to a message, just add header `X-Rspamd-Action` equal to that action and accept message (boolean value)
* `add_rcpt`: (from 1.8.0) add new recipients (array of strings)
* `del_rcpt`: (from 1.8.0) delete recipients (array of strings)

### Adding headers

`add_headers` element has the following format:

```json
{
    "<header_name>": {
        "value": "<header_value>",
        "order": 0
    },
}
```

Where `<header_name>` represents header's name, `<header_value>` - value, and `order` the order of insertion (e.g. 0 will be the first header).

### Removing headers

`remove_headers` element has the following format:

```json
{
    "<header_name>": 1
}
```

Where `<header_name>` represents header's name, and the value is the order of the header to remove (starting from 1). There are special treatment for orders `0` and negative order:

* if order is equal to zero, then it means that **all* headers with this name should be removed
* if order is negative, it means that the `N`th header from the **end** should be removed (where `N` is `abs(order)`)

### Complete example

```json
{
    "milter":
    {
        "add_headers": {
            "ArcMessageSignature": {
                "value": "some_value with JSON\nencoded values",
                "order": 0
            },
        },
        "remove_headers": {
            "DKIM-Signature": -1
        }
    }
}
```

## Rspamd JSON control block

Since Rspamd version 0.9 it is also possible to pass additional data by prepending a JSON control block to a message. So you can use either headers or a JSON block to pass data from the MTA to Rspamd.

To use a JSON control block, you need to pass an extra header called `Message-Length` to Rspamd. This header should be equal to the size of the message **excluding** the JSON control block. Therefore, the size of the control block is equal to `Content-Length - Message-Length`. Rspamd assumes that a message starts immediately after the control block (with no extra CRLF). This method is equally compatible with streaming transfer, however even if you are not specifying `Content-Length` you are still required to specify `Message-Length`.

Here is an example of a JSON control block:

~~~json
{
	"from": "smtp@example.com",
	"pass_all": "true",
	"ip": "95.211.146.161",
	"helo": "localhost.localdomain",
	"hostname": "localhost"
}
~~~

Moreover, [UCL](https://github.com/vstakhov/libucl) JSON extensions and syntax conventions are also supported inside the control block.

## Curl example

To check a message without rspamc:
`curl --data-binary @- http://localhost:11333/symbols < file.eml`

## Normal worker HTTP endpoints

The following endpoints are valid on the normal worker and accept `POST`:

* `/checkv2` - Check message and return action

## Controller HTTP endpoints

The following endpoints are valid merely on the controller. All of these may require `Password` header to be sent depending on configuration (passing this as query string works too).

* `/fuzzyadd` - Add message to fuzzy storage
* `/fuzzydel` - Remove message from fuzzy storage

These accept `POST`. Headers which may be set are:

- `Flag`: flag identifying fuzzy storage
- `Weight`: weight to add to hashes

* `/learnspam` - Train bayes classifier on spam message
* `/learnham` - Train bayes classifier on ham message

These also accept `POST`. The below endpoints all use `GET`:

* `/errors` - Return error messages from ring buffer
* `/stat` - Return statistics
* `/graph?type=<hourly|daily|weekly|monthly>` - Plots throughput graph
* `/history` - Returns rolling history
* `/actions` - Return thresholds for actions
* `/symbols` - Returns symbols in metric & their scores
* `/maps` - Returns list of maps
* `/getmap` - Fetches contents of map according to ID passed in `Map:` header
* `/fuzzydelhash` - Delete entries from fuzzy according to content of `Hash:` header(s)
