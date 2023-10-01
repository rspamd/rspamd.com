---
layout: doc
title: Rspamd Architecture
---
# Rspamd protocol

<div id="toc" markdown="1">
  * this unordered seed list will be replaced by toc as unordered list
  {:toc}
</div>

## Protocol basics

Rspamd employs the HTTP protocol, specifically versions 1.0 or 1.1. Rspamd defines some headers which allow the passing of extra information about a scanned message, such as envelope data, IP address or SMTP SASL authentication data, etc. Rspamd supports normal and chunked encoded HTTP requests.

## Rspamd HTTP request

Rspamd encourages the use of the HTTP protocol due to its universality and compatibility with virtually every programming language, without the need for obscure libraries. A typical HTTP request takes the following form:

```
  POST /checkv2 HTTP/1.0
  Content-Length: 26969
  From: smtp@example.com
  Pass: all
  Ip: 95.211.146.161
  Helo: localhost.localdomain
  Hostname: localhost

  <your message goes here>
```

For added flexibility, chunked encoding can be utilized, streamlining data transfer, particularly when the message length is unknown.

## Rspamd protocol encryption

Rspamd supports encryption by means of lightweight protocol called HTTPCrypt. You can find comprehensive details about this protocol in the following [paper](https://highsecure.ru/httpcrypt.pdf){:target="&#95;blank"}. To enable encryption, you need to generate keypair and push it in the corresponding worker's section (e.g. `worker-controller.inc` or `worker-normal.inc` or, even, in `worker-proxy.inc`):

```
$ rspamadm keypair

keypair {
    privkey = "e4gr3yuw4xiy6dikdpqus8cmxj8c6pqstt448ycwhewhhrtxdahy";
    id = "gnyieumi6sp6d3ykkukep9yuaq13q4u6xycmiqaw7iahsrz97acpposod1x8zogynnishtgxr47o815dgsz9t69d66jcm1drjei4a5d";
    pubkey = "fg8uwtce9sta43sdwzddb11iez5thcskiufj4ug8esyfniqq5iiy";
    type = "kex";
    algorithm = "curve25519";
    encoding = "base32";
}
```

Regrettably, the HTTPCrypt protocol hasn't gained widespread adoption among popular libraries. Nonetheless, you can effectively utilize it with the `rspamc` client and various internal clients, including Rspamd's proxy, which can serve as an encryption bridge for conducting spam scans via Rspamd. 
Moreover, you have the option to employ Nginx for SSL termination on behalf of Rspamd. While Rspamd's client-side components (e.g., proxy or `rspamc`) offer native support for SSL encryption, it's important to note that SSL support on the server side is not currently available.

### HTTP request

Normally, you should just use `/checkv2` here. However, if you want to communicate with the controller then you might want to use [controller commands](#controller-http-endpoints).

### HTTP headers

To minimize redundant processing, Rspamd enables an MTA to transmit pre-processed message data using either HTTP headers or a JSON control block (which will be elaborated on later in this document). Rspamd accommodates the following non-standard HTTP headers:

| Header          | Description                       |
| :-------------- | :-------------------------------- |
| `Deliver-To` | Defines actual delivery recipient of message. Can be used for personalized statistics and for user specific options. |
| `IP`         | Defines IP from which this message is received. |
| `Helo`       | Defines SMTP helo |
| `Hostname`   | Defines resolved hostname |
| `Flags`      | Supported from version 2.0: Defines output flags as a commas separated list: {::nomarkdown}<ul><li><code>pass_all</code>: pass all filters</li><li><code>groups</code>: return symbols groups</li><li><code>zstd</code>: compressed input/output</li><li><code>no_log</code>: do not log task</li><li><code>milter</code>: apply milter protocol related hacks</li><li><code>profile</code>: profile performance for this task</li><li><code>body_block</code>: accept rewritten body as a separate part of reply</li><li><code>ext_urls</code>: extended urls information</li><li><code>skip</code>: skip all filters processing</li><li><code>skip_process</code>: skip mime parsing/processing</li></ul>{:/}
| `From`       | Defines SMTP mail from command data |
| `Queue-Id`   | Defines SMTP queue id for message (can be used instead of message id in logging). |
| `Raw`        | If set to `yes`, then Rspamd assumes that the content is not MIME and treat it as raw data. |
| `Rcpt`       | Defines SMTP recipient (there may be several `Rcpt` headers) |
| `Pass`       | If this header has `all` value, all filters would be checked for this message. |
| `Subject`    | Defines subject of message (is used for non-mime messages). |
| `User`       | Defines username for authenticated SMTP client. |
| `Message-Length` | Defines the length of message excluding the control block. |
| `Settings-ID` | Defines [settings id](../configuration/settings.html) to apply. |
| `Settings` | Defines list of rules ([settings](../configuration/settings.html) `apply` part) as raw json block to apply. |
| `User-Agent` | Defines user agent (special processing if it is `rspamc`). |
| `MTA-Tag` | MTA defined tag (can be used in settings). |
| `MTA-Name` | Defines MTA name, used in `Authentication-Results` routines. |
| `TLS-Cipher` | Defines TLS cipher name. |
| `TLS-Version` | Defines TLS version. |
| `TLS-Cert-Issuer` | Defines Cert issuer, can be used in conjunction with `client_ca_name` in [proxy worker](../workers/rspamd_proxy.html). |
| `URL-Format` | Supported from version 1.9: return all URLs and email if this header is `extended`. |
| `Filename` | Hint for filename if used with some file. |

Controller also defines certain headers, which you can find detailed information about [here](#controller-http-endpoints).

Furthermore, Rspamd supports standard HTTP headers like `Content-Length`.

## Rspamd HTTP reply

The response from Rspamd is encoded in `JSON` format. Here's an example of a typical HTTP reply:

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

For convenience, the reply is LINTed using [JSONLint](https://jsonlint.com){:target="&#95;blank"}. The actual response is compressed for efficiency.

Each response contains the following fields:

* `is_skipped` - boolean flag that is `true` if a message has been skipped due to settings
* `score` - floating-point value representing the effective score of message
* `required_score` - floating-point value meaning the threshold value for the metric
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
* `messages` - object containing optional messages added by Rspamd filters (such as `SPF`) - The value of the `smtp_message` key is intended to be returned as SMTP response text by the MTA

## Milter headers

This section of the response is utilized to manipulate headers and the SMTP session. It is located under the `milter` key in the response. Here are the potential elements within this object:

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

Starting from Rspamd version 0.9, it's also possible to transmit additional data by prepending a JSON control block to a message. Therefore, you have the flexibility to utilize either headers or a JSON block to convey information from the MTA to Rspamd.

To employ a JSON control block, you must include an additional header named `Message-Length` when forwarding the message to Rspamd. This header should specify the size of the message, but it should **exclude** the JSON control block. Consequently, the size of the control block is calculated as `Content-Length - Message-Length`. Rspamd assumes that the message immediately follows the control block without any additional CRLF (Carriage Return Line Feed) characters. This approach is equally compatible with streaming transfers. However, even when you don't explicitly specify `Content-Length`, you are still required to specify `Message-Length`.

Here's an illustrative example of a JSON control block:

~~~json
{
  "from": "smtp@example.com",
  "pass_all": "true",
  "ip": "95.211.146.161",
  "helo": "localhost.localdomain",
  "hostname": "localhost"
}
~~~

Furthermore, it's worth noting that [UCL](https://github.com/vstakhov/libucl) JSON extensions and syntax conventions are fully supported within the control block.

## Curl example

To check a message without rspamc:
`curl --data-binary @- http://localhost:11333/symbols < file.eml`

## Normal worker HTTP endpoints

The following endpoints are valid on the normal worker and accept `POST`:

* `/checkv2` - Checks message and return action

The below endpoints all use `GET`:

* `/ping` - Returns just a `pong` HTTP reply (could be used for monitoring)

## Controller HTTP endpoints

The following endpoints are valid merely on the controller. All of these may require `Password` header to be sent depending on configuration (passing this as query string works too).

* `/fuzzyadd` - Adds message to fuzzy storage
* `/fuzzydel` - Removes message from fuzzy storage

These accept `POST`. Headers which may be set are:

- `Flag`: flag identifying fuzzy storage
- `Weight`: weight to add to hashes

* `/learnspam` - Trains bayes classifier on spam message
* `/learnham` - Trains bayes classifier on ham message
* `/checkv2` - Checks message and return action (same as normal worker)

These also accept `POST`. The below endpoints all use `GET`:

* `/errors` - Returns error messages from ring buffer
* `/stat` - Returns statistics
* `/statreset` - Returns statistics and reset countes
* `/graph?type=<hourly|daily|weekly|monthly>` - Plots throughput graph
* `/history` - Returns rolling history
* `/historyreset` - Returns rolling history and resets its elements afterwards
* `/actions` - Returns thresholds for actions
* `/symbols` - Returns symbols in metric & their scores
* `/maps` - Returns list of maps
* `/neighbours` - Returns list of known peers
* `/errors` - Returns a content of erros ring buffer
* `/getmap` - Fetches contents of map according to ID passed in `Map:` header
* `/fuzzydelhash` - Deletes entries from fuzzy according to content of `Hash:` header(s)
* `/plugins` - Returns list of plugins or plugin specific stuff
* `/ping` - Returns just a `pong` HTTP reply (could be used for monitoring)
* `/metrics` - Returns OpenMetrics data

  Sample response of `/metrics` endpoint:
```
    # HELP rspamd_build_info A metric with a constant '1' value labeled by version from which rspamd was built.
  # TYPE rspamd_build_info gauge
  rspamd_build_info{version="3.2"} 1
  # HELP rspamd_config A metric with a constant '1' value labeled by id of the current config.
  # TYPE rspamd_config gauge
  rspamd_config{id="nzpuz9fm3jk1xncp3q136cudb3qycb7sygxjcko89ya69i8zs3879wbifxh9wfoip7ur8or6dx1crry9px36j9x36btbndjtxug9kub"} 1
  # HELP rspamd_scan_time_average Average messages scan time.
  # TYPE rspamd_scan_time_average gauge
  rspamd_scan_time_average 0.15881561463879001
  # HELP process_start_time_seconds Start time of the process since unix epoch in seconds.
  # TYPE process_start_time_seconds gauge
  process_start_time_seconds 1663651459
  # HELP rspamd_read_only Whether the rspamd instance is read-only.
  # TYPE rspamd_read_only gauge
  rspamd_read_only 0
  # HELP rspamd_scanned_total Scanned messages.
  # TYPE rspamd_scanned_total counter
  rspamd_scanned_total 5978
  # HELP rspamd_learned_total Learned messages.
  # TYPE rspamd_learned_total counter
  rspamd_learned_total 5937
  # HELP rspamd_spam_total Messages classified as spam.
  # TYPE rspamd_spam_total counter
  rspamd_spam_total 5978
  # HELP rspamd_ham_total Messages classified as spam.
  # TYPE rspamd_ham_total counter
  rspamd_ham_total 0
  # HELP rspamd_connections Active connections.
  # TYPE rspamd_connections gauge
  rspamd_connections 0
  # HELP rspamd_control_connections_total Control connections.
  # TYPE rspamd_control_connections_total gauge
  rspamd_control_connections_total 45399
  # HELP rspamd_pools_allocated Pools allocated.
  # TYPE rspamd_pools_allocated gauge
  rspamd_pools_allocated 45585
  # HELP rspamd_pools_freed Pools freed.
  # TYPE rspamd_pools_freed gauge
  rspamd_pools_freed 45542
  # HELP rspamd_allocated_bytes Bytes allocated.
  # TYPE rspamd_allocated_bytes gauge
  rspamd_allocated_bytes 60537276
  # HELP rspamd_chunks_allocated Memory pools: current chunks allocated.
  # TYPE rspamd_chunks_allocated gauge
  rspamd_chunks_allocated 374
  # HELP rspamd_shared_chunks_allocated Memory pools: current shared chunks allocated.
  # TYPE rspamd_shared_chunks_allocated gauge
  rspamd_shared_chunks_allocated 15
  # HELP rspamd_chunks_freed Memory pools: current chunks freed.
  # TYPE rspamd_chunks_freed gauge
  rspamd_chunks_freed 0
  # HELP rspamd_chunks_oversized Memory pools: current chunks oversized (needs extra allocation/fragmentation).
  # TYPE rspamd_chunks_oversized gauge
  rspamd_chunks_oversized 1550
  # HELP rspamd_fragmented Memory pools: fragmented memory waste.
  # TYPE rspamd_fragmented gauge
  rspamd_fragmented 0
  # HELP rspamd_learns_total Total learns.
  # TYPE rspamd_learns_total counter
  rspamd_learns_total 9526
  # HELP rspamd_actions_total Actions labelled by action type.
  # TYPE rspamd_actions_total counter
  rspamd_actions_total{type="reject"} 0
  rspamd_actions_total{type="soft reject"} 0
  rspamd_actions_total{type="rewrite subject"} 0
  rspamd_actions_total{type="add header"} 5978
  rspamd_actions_total{type="greylist"} 0
  rspamd_actions_total{type="no action"} 0
  # HELP rspamd_statfiles_revision Stat files revision.
  # TYPE rspamd_statfiles_revision gauge
  rspamd_statfiles_revision{symbol="BAYES_SPAM",type="redis"} 9429
  rspamd_statfiles_revision{symbol="BAYES_HAM",type="redis"} 97
  # HELP rspamd_statfiles_used Stat files used.
  # TYPE rspamd_statfiles_used gauge
  rspamd_statfiles_used{symbol="BAYES_SPAM",type="redis"} 0
  rspamd_statfiles_used{symbol="BAYES_HAM",type="redis"} 0
  # HELP rspamd_statfiles_totals Stat files total.
  # TYPE rspamd_statfiles_totals gauge
  rspamd_statfiles_totals{symbol="BAYES_SPAM",type="redis"} 0
  rspamd_statfiles_totals{symbol="BAYES_HAM",type="redis"} 0
  # HELP rspamd_statfiles_size Stat files size.
  # TYPE rspamd_statfiles_size gauge
  rspamd_statfiles_size{symbol="BAYES_SPAM",type="redis"} 0
  rspamd_statfiles_size{symbol="BAYES_HAM",type="redis"} 0
  # HELP rspamd_statfiles_languages Stat files languages.
  # TYPE rspamd_statfiles_languages gauge
  rspamd_statfiles_languages{symbol="BAYES_SPAM",type="redis"} 0
  rspamd_statfiles_languages{symbol="BAYES_HAM",type="redis"} 0
  # HELP rspamd_statfiles_users Stat files users.
  # TYPE rspamd_statfiles_users gauge
  rspamd_statfiles_users{symbol="BAYES_SPAM",type="redis"} 1
  rspamd_statfiles_users{symbol="BAYES_HAM",type="redis"} 1
  # HELP rspamd_fuzzy_stat Fuzzy stat labelled by storage.
  # TYPE rspamd_fuzzy_stat gauge
  rspamd_fuzzy_stat{storage="rspamd.com"} 1768011131
  # EOF
```
