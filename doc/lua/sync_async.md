---
layout: doc
title: Sync and Async API comparison
---

# Rspamd asynchronous calls

This guide describes how to make asynchronous calls from Rspamd plugins and rules.

<div id="toc" markdown="1">
  * this unordered seed list will be replaced by toc as unordered list
  {:toc}
</div>

## Overview {#overview}

Prior to 1.8.0, if you needed to perform an action involving network request
(i.e. Redis query, Anti-virus scan), you had to use callback-style approach.
You define callback and initiate an asynchronous request and stop the execution
to allow other tasks proceed. 

As soon as request is completed, callback is called.

~~~lua
  -- define a callback
  local function request_done(err, code, body)
    if not err then
      task:insert_result('REQUEST_DONE', 1.0, body)
    end
    ...
  end

  -- initiate the request
  api.start_request({
    callback = request_done,
    ...
  })
~~~

### Introducing pseudo-synchronous API {#pseudo-synchronous-API}

Rspamd 1.8.0 introduces a new pseudo-synchronous API. Now you can write code in a typical imperative manner without blocking other tasks.

Each operation that could potentially block creates a yielding point. Consequently, the code is paused until the operation is completed (similar to blocking), and it resumes only when there is a result. Meanwhile, other tasks are processed as usual.

<small>
**Please note** that synchronous mode requires symbol to be registered with **`coro`** flag from the version 1.9 (see "full example").
</small>

~~~lua
  local err, response = api.do_request(...)

  if not err then
    task:insert_result('REQUEST_DONE', 1.0, response)
  end
  ...
~~~


## API example {#API-example}
### HTTP module {#API-example-http-module}

To use Sync with HTTP API, just remove **callback** parameter from call parameters.
It returns two values: 

- err `nil` or `string` containing error description if network or internal error happened
- response `nil` if error happened (*note*: HTTP-codes are returned with corresponding codes) or `table`:
  - code `int` HTTP response code
  - content `string` Response body
  - headers `table` (header -> value) list of response headers


#### Asynchronous HTTP request
{:.no_toc}

~~~lua
  -- define a callback
  local function request_done(err, code, body)
    if not err then
      task:insert_result('HTTP_RESPONSE' .. code, 1.0, body)
    end
    ...
  end

  -- initiate the request
  rspamd_http.request({
    url = 'http://127.0.0.1:18080/abc',
    callback = request_done,
    ...
  })
~~~~~


<div>
    <a class="btn btn-info btn-code" data-toggle="collapse" data-target="#async_http">
        <i class="fa fa-caret-square-o-down fa-pull-right"></i>
        Full example
    </a>
<div id="async_http" class="collapse collapse-block">

{% highlight lua %}
-- standard includes
local rspamd_http = require "rspamd_http"
local rspamd_logger = require "rspamd_logger"

local function http_symbol(task)

  -- define a callback
  local function request_done(err, code, body)
    if err then
      rspamd_logger.errx('http_callback error: ' .. err)
      task:insert_result('HTTP_ERROR', 1.0, err)
    else
      task:insert_result('HTTP_RESPONSE', 1.0, body)
    end
  end

  -- initiate the request
  rspamd_http.request({
    url = 'http://127.0.0.1:18080/abc',
    task = task,
    callback = request_done,
  })
end

rspamd_config:register_symbol({
  name = 'SIMPLE_HTTP',
  score = 1.0,
  callback = http_symbol,
})

{% endhighlight %}

</div></div>


#### Synchronous HTTP request
{:.no_toc}

<small>
**Please note** that synchronous mode requires symbol to be registered with **coro** flag (see "full example").
</small>

~~~ lua
  local err, response = rspamd_http.request({
    url = 'http://127.0.0.1:18080/abc',
    ...
  })

  if not err then
    task:insert_result('HTTP_SYNC', 1.0, response.content)
  end
  ...
~~~~~~~~~~~~

<div><!-- Do not change the DOM structure -->
    <a class="btn btn-info btn-code" data-toggle="collapse" data-target="#sync_http">
        <i class="fa fa-caret-square-o-down fa-pull-right"></i>
        Full example
    </a>
<div id="sync_http" class="collapse collapse-block">

{% highlight lua %}
local rspamd_http = require "rspamd_http"
local rspamd_logger = require "rspamd_logger"

local function http_symbol(task)
  -- start the request
  local err, response = rspamd_http.request({
    url = 'http://127.0.0.1:18080' .. url,
    task = task,
    method = 'post',
    timeout = 1,
  })

  rspamd_logger.errx(task, 'rspamd_http.request[done] err: %1 response:%2', err, response)

  -- check response
  if err then
    rspamd_logger.errx('http error: ' .. err)
    task:insert_result('HTTP_ERROR', 1.0, err)
   else
    task:insert_result('HTTP_RESPONSE', 1.0, response.content)
  end
end

rspamd_config:register_symbol({
  name = 'SIMPLE_HTTP',
  score = 1.0,
  callback = http_symbol,
  -- Symbol using Synchronous API should have "coro" flag.
  flags = 'coro',
})

{% endhighlight %}
</div></div>


### DNS module {#API-example-DNS-module}

To work with DNS properly, a new module called `rspamd_dns` has been introduced, which replaces the former `task:get_resolver()` calls. The new API requires explicit specification of the type of request, rather than providing a set of `resolve_*` methods.

#### Asynchronous DNS request
{:.no_toc}

~~~lua
local function dns_callback(_, to_resolve, results, err)
  if not err then
    ...
  end
end

task:get_resolver():resolve_a({
  name = 'rspamd.com'
  callback = dns_callback,
  ...
})
~~~

<div><!-- Do not change the DOM structure -->
    <a class="btn btn-info btn-code" data-toggle="collapse" data-target="#async_dns">
        <i class="fa fa-caret-square-o-down fa-pull-right"></i>
        Full example
    </a>
<div id="async_dns" class="collapse collapse-block">

{% highlight lua %}
local rspamd_dns = require "rspamd_dns"
local logger = require "rspamd_logger"

local function dns_symbol(task)
  local function dns_cb(_, to_resolve, results, err)
    logger.errx(task, "_=%1, to_resolve=%2, results=%3, err%4", _, to_resolve, results, err)
    if err then
      task:insert_result('DNS_ERROR', 1.0, err)
    else
      task:insert_result('DNS', 1.0, tostring(results[1]))
    end
  end

  task:get_resolver():resolve_a({
    task = task,
    name = 'rspamd.com',
    callback = dns_cb
  })
end

rspamd_config:register_symbol({
  name = 'SIMPLE_DNS',
  score = 1.0,
  callback = dns_symbol,
})
{% endhighlight %}
</div></div>


#### Synchronous DNS request
{:.no_toc}

<small>
**Please note** that synchronous mode requires symbol to be registered with **coro** flag (see "full example").
</small>

~~~lua
  local is_ok, results = rspamd_dns.request({
    type = 'a',
    name = to_resolve ,
    ...
  })
  if is_ok then
    task:insert_result('DNS_SYNC', 1.0, tostring(results[1]))
  end
~~~

<div><!-- Do not change the DOM structure -->
    <a class="btn btn-info btn-code" data-toggle="collapse" data-target="#sync_dns">
        <i class="fa fa-caret-square-o-down fa-pull-right"></i>
        Full example
    </a>
<div id="sync_dns" class="collapse collapse-block">

{% highlight lua %}

local rspamd_dns = require "rspamd_dns"
local logger = require "rspamd_logger"

local function dns_sync_symbol(task)
  local to_resolve = tostring(task:get_request_header('to-resolve'))
  local is_ok, results = rspamd_dns.request({
    task = task,
    type = 'a',
    name = to_resolve ,
  })

  logger.errx(task, "is_ok=%1, results=%2, results[1]=%3", is_ok, results, results[1])

  if not is_ok then
    task:insert_result('DNS_SYNC_ERROR', 1.0, results)
  else
    task:insert_result('DNS_SYNC', 1.0, tostring(results[1]))
  end
end

rspamd_config:register_symbol({
  name = 'SIMPLE_DNS_SYNC',
  score = 1.0,
  callback = dns_sync_symbol,
  -- Symbol using Synchronous API should have "coro" flag.
  flags = 'coro',
})
{% endhighlight %}
</div></div>


### TCP module {#API-example-TCP-module}
It is recommended to use `lua_tcp_sync` module to work TCP.

#### Asynchronous TCP request
{:.no_toc}

~~~lua
  local function http_read_cb(err, data, conn)
    task:insert_result('HTTP_ASYNC_RESPONSE', 1.0, data or err)
    ...
  end
  rspamd_tcp:request({
    callback = http_read_cb,
    host = '127.0.0.1',
    data = {'GET /request HTTP/1.1\r\nConnection: keep-alive\r\n\r\n'},
    ...
  })
~~~

<div><!-- Do not change the DOM structure -->
    <a class="btn btn-info btn-code" data-toggle="collapse" data-target="#async_tcp">
        <i class="fa fa-caret-square-o-down fa-pull-right"></i>
        Full example
    </a>
<div id="async_tcp" class="collapse collapse-block">

{% highlight lua %}
local rspamd_tcp = require "rspamd_tcp"
local logger = require "rspamd_logger"

local function http_simple_tcp_async_symbol(task)
  logger.errx(task, 'http_tcp_symbol: begin')
  local function http_read_cb(err, data, conn)
    logger.errx(task, 'http_read_cb: got reply: %s, error: %s, conn: %s', data, err, conn)
    task:insert_result('HTTP_ASYNC_RESPONSE', 1.0, data or err)
    -- if we want to send another request
    -- conn:add_write(http_read_post_cb, "POST /request2 HTTP/1.1\r\n\r\n")
  end
  rspamd_tcp:request({
    task = task,
    callback = http_read_cb,
    host = '127.0.0.1',
    data = {'GET /request HTTP/1.1\r\nConnection: keep-alive\r\n\r\n'},
    read = true,
    port = 18080,
  })
end

rspamd_config:register_symbol({
  name = 'SIMPLE_TCP_ASYNC_TEST',
  score = 1.0,
  callback = http_simple_tcp_async_symbol,
  -- Symbol using Synchronous API should have "coro" flag.
  flags = 'coro',
})
{% endhighlight %}
</div></div>


#### Synchronous TCP request
{:.no_toc}

<small>
**Please note** that synchronous mode requires symbol to be registered with **coro** flag (see "full example").
</small>

~~~lua
  local is_ok, connection = tcp_sync.connect {
    host = '127.0.0.1',
    ...
  }

  if not is_ok then
    logger.errx(task, 'write error: %1', connection)
  end

  logger.errx(task, 'connect_sync %1, %2', is_ok, tostring(connection))

  is_ok, err = connection:write('GET /request_sync HTTP/1.1\r\nConnection: keep-alive\r\n\r\n')
  if not is_ok then
    logger.errx(task, 'write error: %1', err)
  end
  
  is_ok, data = connection:read_once(); 
  task:insert_result('HTTP_RESPONSE', 1.0, data or err)
~~~

<div><!-- Do not change the DOM structure -->
    <a class="btn btn-info btn-code" data-toggle="collapse" data-target="#sync_tcp">
        <i class="fa fa-caret-square-o-down fa-pull-right"></i>
        Full example
    </a>
<div id="sync_tcp" class="collapse collapse-block">

{% highlight lua %}
local logger = require "rspamd_logger"
local tcp_sync = require "lua_tcp_sync"

local function http_tcp_symbol(task)

  local err
  local is_ok, connection = tcp_sync.connect {
    task = task,
    host = '127.0.0.1',
    timeout = 20,
    port = 18080,
  }

  logger.errx(task, 'connect_sync %1, %2', is_ok, tostring(connection))
  if not is_ok then
    logger.errx(task, 'connect error: %1', connection)
    return
  end

  is_ok, err = connection:write(string.format('GET /request_sync HTTP/1.1\r\nConnection: close\r\n\r\n'))

  if not is_ok then
    logger.errx(task, 'write error: %1', err)
    return
  end

  local content_length, content

  while true do
    local header_line
    is_ok, header_line = connection:read_until("\r\n")
    if not is_ok then
      logger.errx(task, 'failed to get header: %1', header_line)
      return
    end

    if header_line == "" then
      logger.errx(task, 'headers done')
      break
    end

    local value
    local header = header_line:gsub("([%w-]+): (.*)", 
        function (h, v) value = v; return h:lower() end)

    logger.errx(task, 'parsed header: %1 -> "%2"', header, value)

    if header == "content-length" then
      content_length = tonumber(value)
    end

  end

  if content_length then
    is_ok, content = connection:read_bytes(content_length)
    if is_ok then
      task:insert_result('HTTP_SYNC_CONTENT', 1.0, content)
    end
  else
    is_ok, content = connection:read_until_eof()
    if is_ok then
      task:insert_result('HTTP_SYNC_EOF', 1.0, content)
    end
  end
  logger.errx(task, '(is_ok: %1) content [%2 bytes] %3', is_ok, content_length, content)
end

rspamd_config:register_symbol({
  name = 'HTTP_TCP_TEST',
  score = 1.0,
  callback = http_tcp_symbol,
  -- Symbol using Synchronous API should have "coro" flag.
  flags = 'coro',
})
{% endhighlight %}
</div></div>


### Redis module {#API-example-Redis-module}

#### Asynchronous Redis request
{:.no_toc}

~~~lua
  local function redis_cb(err, data)
    if not err then
      task:insert_result('REDIS_ASYNC201809_ERROR', 1.0, err)
    end
    ...
  end

  local attrs = {
    callback = redis_cb
    ...
  }
  local request = {...}
  redis_lua.request(redis_params, attrs, request)
~~~

<div><!-- Do not change the DOM structure -->
    <a class="btn btn-info btn-code" data-toggle="collapse" data-target="#async_redis">
        <i class="fa fa-caret-square-o-down fa-pull-right"></i>
        Full example
    </a>
<div id="async_redis" class="collapse collapse-block">

{% highlight lua %}
local logger = require "rspamd_logger"
local redis_lua = require "lua_redis"
local lua_util = require "lua_util"
local redis_params
local N = 'redis_test'

local function redis_simple_async_api(task)
  local function redis_cb(err, data)
    if err then
      task:insert_result('REDIS_ASYNC_ERROR', 1.0, err)
    else
      task:insert_result('REDIS_ASYNC', 1.0, data)
    end
  end

  local attrs = {
    task = task,
    callback = redis_cb
  }
  local request = {
    'GET', 
    'test_key'
  }
  redis_lua.request(redis_params, attrs, request)
end

redis_params = rspamd_parse_redis_server(N)

rspamd_config:register_symbol({
  name = 'SIMPLE_REDIS_ASYNC_TEST',
  score = 1.0,
  callback = redis_simple_async_api,
  -- Symbol using Synchronous API should have "coro" flag.
  flags = 'coro',
})

{% endhighlight %}
</div></div>

#### Synchronous Redis request
{:.no_toc}

<small>
**Please note** that synchronous mode requires symbol to be registered with **coro** flag (see "full example").
</small>

~~~lua
  local is_ok, connection = redis_lua.connect(...)
  if not is_ok then
    return
  end

  is_ok, err = connection:add_cmd('EVAL', {[[return "hello from lua on redis"]], 0})

  if not is_ok then
    return
  end

  is_ok,data = connection:exec()
  if is_ok then
    task:insert_result('REDIS', 1.0, data)
  end
  ...
~~~

<div><!-- Do not change the DOM structure -->
    <a class="btn btn-info btn-code" data-toggle="collapse" data-target="#sync_redis">
        <i class="fa fa-caret-square-o-down fa-pull-right"></i>
        Full example
    </a>
<div id="sync_redis" class="collapse collapse-block">

{% highlight lua %}
local logger = require "rspamd_logger"
local redis_lua = require "lua_redis"

local redis_params
local N = 'redis_test'

local function redis_symbol(task)

  local attrs = {task = task}
  local is_ok, connection = redis_lua.connect(redis_params, attrs)

  logger.infox(task, "connect: %1, %2", is_ok, connection)

  if not is_ok then
    task:insert_result('REDIS_ERROR', 1.0, connection)
    return
  end

  local err, data

  local lua_script = [[return "hello from lua on redis"]]

  is_ok, err = connection:add_cmd('EVAL', {lua_script, 0})
  logger.infox(task, "add_cmd: %1, %2", is_ok, err)

  if not is_ok then
    task:insert_result('REDIS_ERROR_2', 1.0, err)
    return
  end

  is_ok,data = connection:exec()

  logger.infox(task, "exec: %1, %2", is_ok, data)

  if not is_ok then
    task:insert_result('REDIS_ERROR_3', 1.0, data)
    return
  end

  task:insert_result('REDIS', 1.0, data)

end

redis_params = rspamd_parse_redis_server(N)

rspamd_config:register_symbol({
  name = 'REDIS_TEST',
  score = 1.0,
  callback = redis_symbol,
  -- Symbol using Synchronous API should have "coro" flag.
  flags = 'coro',
})

{% endhighlight %}
</div></div>
