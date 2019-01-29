---
layout: doc
title: Writing tests for Rspamd
---

# Writing tests for Rspamd

Testing is an important part of maintaining stable product. In case of Rspamd, there was a historical lack of proper testing, however, we are working on improvements here. Any help from the community with regard to tests is much appreciated.

{::options parse_block_html="true" /}

<div id="toc">
  * this unordered seed list will be replaced by toc as unordered list
  {:toc}
</div>

## Introduction

Rspamd has two types of tests:

* Unit tests - those type of tests are intended to test some particular function in Rspamd and are written in Lua + FFI (if testing plain C function) using [telescope framework](https://github.com/norman/telescope);
* Functional tests - are used to test the whole daemon behaviour with complex setup involving custom configuration, external services, such as Redis, and so on. Functional tests are written using [Robot framework](https://robotframework.org/).

## Unit tests

Unit tests are placed in `test/lua/unit`. Each tests defines testing context, where there are main definitions used by all test cases, for example, [FFI](http://luajit.org/ext_ffi.html) definitions:

```lua
context("Inet addr check functions", function()
  local ffi = require("ffi")

  ffi.cdef[[
  typedef struct rspamd_inet_addr_s rspamd_inet_addr_t;
  bool rspamd_parse_inet_address (rspamd_inet_addr_t **target,
    const char *src);
  void rspamd_inet_address_free (rspamd_inet_addr_t *addr);
  ]]
  
  ...
end)
```

Then, there could be some test cases:

```lua
  local cases = {
    {'192.168.1.1', true},
    {'2a01:4f8:190:43b5::99', true},
    {'256.1.1.1', false},
    {'/tmp/socket', true},
    {'./socket', true},
    {'[fe80::f919:8b26:ff93:3092%5]', true},
    {'[fe80::f919:8b26:ff93:3092]', true},
  }

  for i,c in ipairs(cases) do
    test("Create inet addr from string " .. i, function()
      local ip = ffi.new("rspamd_inet_addr_t* [1]");
      local res = ffi.C.rspamd_parse_inet_address(ip, c[1])
      assert_equal(res, c[2], "Expect " .. tostring(c[2]) .. " while parsing " .. c[1])
      if res then
        ffi.C.rspamd_inet_address_free(ip[0])
      end
    end)
```

Bear in mind, that a single `test` invocation should define one specific case.

Running unit tests requires to build a special `rspamd-test` target. If you use `make` to build Rspamd from the sources, you should type `make rspamd-test` to do it. After that, you would have `test/rspamd-test` binary available in your build directory. 

To run unit tests, just type `test/rspamd-test -p /rspamd/lua`

Unfortunately, it is currently impossible to execute specific unit tests only.

## Functional tests

Functional tests are intended to test the whole setup of Rspamd and you should first learn some basics about the [Robot framework](https://robotframework.org/) that is used to write tests.

Functional tests live in `test/functional` directory. To run functional tests, you first need to **install** Rspamd in your system (or a container). Then you can run them manually using something like `RSPAMD_INSTALLROOT=/usr/local robot -s '280*' ~/rspamd/test/functional/cases`, where:

* `RSPAMD_INSTALLROOT` - a prefix where Rspamd is installed (e.g. `/usr` for the vast majority of Linux installations)
* `-s` - pattern to match tests (may be skipped if all tests are needed)
* `~/rspamd/test/functional/cases` - directory where test cases are placed

Functional tests are also executed by [Rspamd CI](https://ci.rspamd.com/rspamd/rspamd). It also covers pull requests you send on the Github site.

### Functional tests structure

Each test usually has 3 components:

* Test case (written in Robot) that lives in `test/functional/cases`
* Some configuration that lives in `test/functional/configs`
* Messages to scan in `test/functional/messages`

In many cases you'd also need to have some specific Lua code that should be placed in `test/functional/lua`. For complicated setups, e.g. if you need some fake or real external service, you could need to write some python code that should be placed to `test/functional/lib` and, for fake services, in `test/functional/util`.

You could find plenty of examples about how to run those fake servers in the existing tests.

### Test case structure

TODO
