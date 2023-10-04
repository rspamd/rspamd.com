---
layout: doc
title: Writing tests for Rspamd
---

# Writing tests for Rspamd

Testing is a crucial aspect of ensuring the stability of a product. In the case of Rspamd, there has historically been a lack of comprehensive testing, but we are actively working to improve this. We welcome and greatly appreciate any contributions from the community.

<div id="toc" markdown="1">
  * this unordered seed list will be replaced by toc as unordered list
  {:toc}
</div>

## Introduction

Rspamd has two types of tests:

* Unit tests - those type of tests are intended to test some particular function in Rspamd and are written in Lua + FFI (if testing plain C function) using [Telescope framework](https://github.com/norman/telescope);
* Functional tests - are used to test the whole daemon behaviour with complex setup involving custom configuration, external services, such as Redis, and so on. Functional tests are written using [Robot Framework](https://robotframework.org/).

## Unit tests

Unit tests are located in the `test/lua/unit` directory. Each test defines a testing context, which contains main definitions utilized by all test cases. For instance, it includes [FFI (Foreign Function Interface)](https://luajit.org/ext_ffi.html) definitions.

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

Please note that a single `test` invocation should define one specific case.

Running unit tests requires building a special `rspamd-test` target. If you use `make` to build Rspamd from the sources, you can do so by running `make rspamd-test`. This will create the `test/rspamd-test` binary in your build directory.

To run unit tests, simply execute `test/rspamd-test -p /rspamd/lua`.

However, it's important to note that it's currently not possible to execute specific unit tests individually.

## Functional tests

Functional tests are designed to assess the entire Rspamd setup, and before diving into them, it's important to familiarize yourself with the [Robot Framework](https://robotframework.org/), which is used to write these tests.

Functional tests are located in the `test/functional` directory. To run them, you'll need to first **install** Rspamd on your system or within a container. After installation, you can execute the tests manually using a command like this:

```
RSPAMD_INSTALLROOT=/usr/local robot -s '280*' ~/rspamd/test/functional/cases
```

Here's what these components do:

* `RSPAMD_INSTALLROOT` - a prefix where Rspamd is installed (e.g. `/usr` for the vast majority of Linux installations)
* `-s` - pattern to match tests (may be skipped if all tests are needed)
* `~/rspamd/test/functional/cases` - directory where test cases are placed

It's worth noting that functional tests are also executed by [Rspamd CI](https://ci.rspamd.com/rspamd/rspamd), which includes testing for pull requests submitted on the GitHub repository.

### Functional tests structure

Each test usually has 3 components:

* Test case (written in Robot) that lives in `test/functional/cases`
* Some configuration that lives in `test/functional/configs`
* Messages to scan in `test/functional/messages`

In many cases, you may also require specific Lua code, which should be located in the `test/functional/lua` directory. For more complex setups, such as when you need to simulate fake or real external services, you might need to write some Python code. This Python code should be placed in the `test/functional/lib` directory and, for simulating fake services, in `test/functional/util`.

You can find numerous examples of how to run these fake servers in the existing tests, providing valuable guidance for your testing needs.

### Test case structure

Each test is enclosed within some specific test case. Test case consist of `setup`, `set of tests` and `teardown`.

General testing advice on the Robot Framework is listed [here](https://github.com/robotframework/HowToWriteGoodTestCases/blob/master/HowToWriteGoodTestCases.rst).

Test case has also a preamble that defines some common variables and setup + teardown procedures:

```
*** Settings ***
Suite Setup     Rbl Setup
Suite Teardown  Rbl Teardown
Library         ${TESTDIR}/lib/rspamd.py
Resource        ${TESTDIR}/lib/rspamd.robot
Variables       ${TESTDIR}/lib/vars.py

*** Variables ***
${CONFIG}       ${TESTDIR}/configs/plugins.conf
${MESSAGE}      ${TESTDIR}/messages/spam_message.eml
${RSPAMD_SCOPE}  Suite
${URL_TLD}      ${TESTDIR}/../lua/unit/test_tld.dat
```

Setup procedure starts Rspamd using specific config file, teardown procedure, in turn, switches everything off. Both are listed in the `Keywords` section:

```
*** Keywords ***
Rbl Setup
  ${PLUGIN_CONFIG} =  Get File  ${TESTDIR}/configs/rbl.conf
  Set Suite Variable  ${PLUGIN_CONFIG}
  Generic Setup  PLUGIN_CONFIG

Rbl Teardown
  Normal Teardown
  Terminate All Processes    kill=True
```

Test cases are listed within `*** Test Cases ***` section:

```
*** Test Cases ***
RBL FROM MISS
  ${result} =  Scan Message With Rspamc  ${MESSAGE}  -i  1.2.3.4
  Check Rspamc  ${result}  FAKE_RBL_CODE_2  inverse=True

RBL FROM HIT
  ${result} =  Scan Message With Rspamc  ${MESSAGE}  -i  4.3.2.1
  Check Rspamc  ${result}  FAKE_RBL_CODE_2
```

### General advice on making test cases for Rspamd

* Always use fake DNS records:

~~~ucl
dns {
 fake_records = [
 { # ed25519
   name = "test._domainkey.example.com";
   type = txt;
   replies = ["k=ed25519; p=yi50DjK5O9pqbFpNHklsv9lqaS0ArSYu02qp1S0DW1Y="];
 },
 ...
 ]
}
~~~

* Use fake servers to emulate large software (e.g. a virus scanner)
* Try to reduce external dependencies, DNS requests, TCP requests etc
* Push all tests that require some specific config within a single test suite to avoid setup/teardown cost on testing
* Logs for tests are saved in `$(CURDIR)/robot-save`: you can find the exact configuration and the full debug logs for all tests; test name is enclosed in queue id of the messages to simplify logs reading
