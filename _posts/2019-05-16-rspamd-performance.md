---
layout: post
title:  "Rspamd performance measures"
categories: misc
---

## Preface

Rspamd has always been oriented on the performance but it was always quite hard to measure how fast it was as normally it runs *just fast enough*.

However, I was recently offered to process [Abusix Intelligence](https://www.abusix.ai/) feeds using Rspamd. These feeds are used to improve Rspamd [fuzzy storage]({{ site.baseurl }}/doc/modules/fuzzy_check.html) quality, to feed URLs and Emails to the DNS black lists provided by Rspamd project and used in [SURBL module]({{ site.baseurl }}/doc/modules/surbl.html).

## Problem statement

The amount of data that required to be processing is huge - it is about 100 millions of messages per day.

Here is an example to calculate connections count when processing these messages using Rspamd:

<pre>
<div class="term">
$ rspamc stat | \
  grep 'Connections count' | \
  cut -d' ' -f3 ; \
  sleep 10 ; \
  rspamc stat | \
  grep 'Connections count' | \
  cut -d' ' -f3
23548811
23564384
</div>
</pre>

It means that over 10 seconds Rspamd has to process around 15 thousands of messages which gives us a rate of **1500 messages per second**.

## Rspamd setup

The settings used to process this amount of messages are pretty similar to those that are provided by default.

There is also some significant amount of home-crafted scripts written in Lua to provide the following functionality:

* Provides deduplication to save time on processing of duplicates
* Performs conditional checks for url and emails blacklisting:
  - checks if an url is in whitelists (around 5 whitelists stored in Redis are used)
  - check if an url is already listed
  - check if it matches any suspicious patterns
* Checks if a message should be learned on fuzzy storage (various conditions)
* Stores messages in IMAP folders providing sorting, partitioning and sampling logic
* Doing various HTTP and Redis queries for servicing purposes

## Hardware

Now some words about hardware being used.

Previously we have set the same setup on a small instance of [AX-60](https://web.archive.org/web/20190319181059/https://www.hetzner.com/dedicated-rootserver/ax60-ssd) and it was loaded for around 80%. We have decided to move to a more powerful server to have some margin for processing more emails and doing some experiments.

Hence, we now have an [AX-160](https://web.archive.org/web/20190319181053/https://www.hetzner.com/dedicated-rootserver/ax160-ssd) AMD server rented in [Hetzner](https://www.hetzner.com/). This is quite a powerful machine and the current load pictures look like this one:

<pre>
<div class="term">
top - 14:36:26 up 23:26,  1 user,  load average: 15.76, 13.22, 12.46
Tasks: 511 total,   3 running, 508 sleeping,   0 stopped,   0 zombie
%Cpu(s): 14.1 us,  4.6 sy,  0.0 ni, 78.9 id,  0.0 wa,  0.0 hi,  2.4 si,  0.0 st
MiB Mem : 128802.5 total,  56985.7 free,  27897.5 used,  43919.3 buff/cache
MiB Swap:   4092.0 total,   3925.5 free,    166.5 used. 100018.6 avail Mem

   PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
 14085 unbound   20   0 2058412   1.6g   6852 S 131.2   1.3   1478:04 unbound
 66509 _rspamd   20   0  806976 733336  23592 S  68.8   0.6 169:52.21 rspamd
 66498 _rspamd   20   0  780144 699540  23852 S  62.5   0.5 156:19.14 rspamd
 66502 _rspamd   20   0  816152 744352  23796 S  56.2   0.6 164:26.39 rspamd
 66468 _rspamd   20   0  773532 697084  23736 S  50.0   0.5 117:36.32 rspamd
 66491 _rspamd   20   0  806652 722340  23728 S  50.0   0.5 148:04.54 rspamd
 66476 _rspamd   20   0  767300 705996  23596 S  43.8   0.5 129:04.30 rspamd
 66481 _rspamd   20   0  797944 730528  23896 S  43.8   0.6 139:34.35 rspamd
 66443 _rspamd   20   0  727632 657104  23372 S  37.5   0.5  88:39.26 rspamd
 66451 _rspamd   20   0  742192 665196  23632 S  37.5   0.5  94:49.75 rspamd
 66456 _rspamd   20   0  790908 725784  23488 S  37.5   0.6 101:32.06 rspamd
 66463 _rspamd   20   0  771540 696064  23692 S  37.5   0.5 108:08.65 rspamd
 66487 _rspamd   20   0  780220 713024  23428 S  37.5   0.5 144:51.79 rspamd
 66447 _rspamd   20   0  762440 689592  23736 S  31.2   0.5  90:23.93 rspamd
 66455 _rspamd   20   0  763520 696108  23580 S  31.2   0.5  97:57.57 rspamd
 66464 _rspamd   20   0  764644 688724  23696 S  31.2   0.5 111:32.74 rspamd
 66469 _rspamd   20   0  756952 678704  23612 S  31.2   0.5 127:55.02 rspamd
127011 rbldns    20   0  358824 307700   2244 R  31.2   0.2  10:26.14 rbldnsd
 10767 redis     20   0 9912104   7.7g   2532 S  25.0   6.1 236:29.63 redis-server
 66438 _rspamd   20   0  746772 680624  23424 R  25.0   0.5  82:18.04 rspamd
 66433 _rspamd   20   0  751180 687244  23472 S  18.8   0.5  80:12.21 rspamd
 66437 _rspamd   20   0  737200 669428  23796 S  18.8   0.5  81:37.81 rspamd
 10671 stunnel4  20   0   24.0g  77252   3644 S  12.5   0.1 269:06.53 stunnel4
 26994 root      20   0   11900   3984   3072 R  12.5   0.0   0:00.02 top
 66442 _rspamd   20   0  808808 707020  23608 S  12.5   0.5  85:11.64 rspamd
 17821 clickho+  20   0   21.8g   3.9g  18964 S   6.2   3.1 116:13.04 clickhouse-serv
</div>
</pre>

Rspamd is also being fed via [proxy worker](https://rspamd.com/doc/workers/rspamd_proxy.html) that runs on another host and performs initial data collection and emitting messages via the Internet providing transport encryption using HTTPCrypt. However, its CPU usage is quite negligible - it uses only a single CPU core by around 40% in average.

## Results analytics

As you can see, this machine runs also [Clickhouse](https://clickhouse.yandex), Redis, own recursive resolver (Unbound), and it still has **~80% idle** processing these **1500 messages per second**.

If we look at the performance counters by attaching to some of the worker processes, we would see the following picture:

<pre>
<div class="term">
# timeout 30 perf record -p 66481
[ perf record: Woken up 1 times to write data ]
[ perf record: Captured and wrote 1.171 MB perf.data (29833 samples) ]
# perf report

# Overhead  Command  Shared Object            Symbol
# ........  .......  .......................  .......................................................................
#
     5.23%  rspamd   rspamd                   [.] lj_alloc_free
     3.35%  rspamd   rspamd                   [.] lj_str_new
     3.03%  rspamd   librspamd-server.so      [.] gc_sweep
     2.20%  rspamd   rspamd                   [.] lj_alloc_malloc
     1.94%  rspamd   rspamd                   [.] gc_sweep
     1.50%  rspamd   libc-2.28.so             [.] __strlen_avx2
     1.32%  rspamd   rspamd                   [.] release_unused_segments
     1.24%  rspamd   rspamd                   [.] lj_BC_TGETS
     1.17%  rspamd   libjemalloc.so.2         [.] free
     1.04%  rspamd   librspamd-server.so      [.] lj_BC_JLOOP
     1.03%  rspamd   librspamd-server.so      [.] propagatemark
     1.01%  rspamd   libpthread-2.28.so       [.] __pthread_mutex_lock
     1.01%  rspamd   libglib-2.0.so.0.5800.3  [.] g_hash_table_lookup
     0.94%  rspamd   libjemalloc.so.2         [.] malloc
     0.77%  rspamd   rspamd                   [.] lj_func_newL_gc
     0.76%  rspamd   rspamd                   [.] propagatemark
     0.75%  rspamd   rspamd                   [.] lj_tab_get
     0.69%  rspamd   libpthread-2.28.so       [.] __pthread_mutex_unlock_usercnt
     0.65%  rspamd   librspamd-server.so      [.] t1ha2_atonce
     0.61%  rspamd   librspamd-server.so      [.] newtab
     0.60%  rspamd   libicui18n.so.63.1       [.] icu_63::NGramParser::search
     0.59%  rspamd   [kernel.kallsyms]        [k] copy_user_generic_string
     0.58%  rspamd   librspamd-server.so      [.] match
     0.58%  rspamd   librspamd-server.so      [.] lj_tab_new1
     0.56%  rspamd   librspamd-server.so      [.] rspamd_task_find_symbol_result
     0.52%  rspamd   [kernel.kallsyms]        [k] _raw_spin_lock_irqsave
     0.48%  rspamd   librspamd-server.so      [.] rspamd_vprintf_common
     0.46%  rspamd   librspamd-server.so      [.] lj_str_new
     0.42%  rspamd   rspamd                   [.] index2adr
     0.42%  rspamd   rspamd                   [.] lj_BC_CALL
     0.42%  rspamd   libc-2.28.so             [.] __strcmp_avx2
     0.42%  rspamd   libc-2.28.so             [.] __memmove_avx_unaligned_erms
</div>
</pre>

The top consumers are Lua allocator and garbage collector. Since we are using [Rspamd experimental package](https://rspamd.com/downloads.html) on Debian Buster, then it is built with bundled [LuaJIT 2.1 beta3](https://luajit.org) and Jemalloc allocator, however, it seems that there is some issue with this allocator in Debian Buster, so I had to load it manually via the following command:

<pre>
<div class="term">
# systemctl edit rspamd.service

[Service]
Environment="LD_PRELOAD=/usr/lib/x86_64-linux-gnu/libjemalloc.so.2"
</div>
</pre>

Followed by restarting of Rspamd.

It is interesting that this Rspamd setup accepts all connections encrypted using [HTTPCrypt](https://highsecure.ru/httpcrypt.pdf) but `chacha_blocks_avx2` takes less than 0.16% of CPU according to `perf` report.

This particular instance of Rspamd is slightly tuned to use more memory to save some CPU cycles:

~~~hcl
# local.d/options.inc

lua_gc_step = 100;
lua_gc_pause = 400;
full_gc_iters = 10000;
~~~

These options tell Rspamd to preserve Lua objects in memory for longer time, at the same time in this mode, we can also observe GC stats on workers that performs full GC loop each 10k messages being scanned:

<pre>
<div class="term">
$ tail -f /var/log/rspamd/rspamd.log | fgrep 'full gc'

perform full gc cycle; memory stats: 58.66MiB allocated, 62.01MiB active, 6.08MiB metadata, 84.71MiB resident, 90.64MiB mapped; lua memory: 107377 kb -> 38015 kb; 308.0022420035675 ms for gc iter
</div>
</pre>

As you can see, full GC iter takes quite a significant time. However, it still keeps Lua memory usage sane. The ideas behind this GC mode have been taken from the generational GC idea in [LuaJIT Wiki](http://wiki.luajit.org/New-Garbage-Collector#gc-algorithms_generational-gc).

## Resulting graphs

Here are some UI captures taken from a previous machine:

<img width="75%" class="img-responsive" src="{{ site.baseurl }}/img/perf_webui1.png">

<img width="75%" class="img-responsive" src="{{ site.baseurl }}/img/perf_webui2.png">

As you can observe, there was some HAM portion increase over the recent days, however, it was caused by adding new sampling logic and duplicates filtering to save CPU resources (these messages are marked as ham and excepted from scan).

There is also a [Clickhouse](https://clickhouse.yandex) based dashboard that's created using [Redash](https://redash.io):

<img width="75%" class="img-responsive" src="{{ site.baseurl }}/img/perf_redash.png">

Since we have Clickhouse on board, we can do various analytics. Here is an average scan time for messages:

<pre>
<div class="term">
:) select avg(ScanTimeVirtual) from rspamd where Date=today();

SELECT avg(ScanTimeVirtual)
FROM rspamd
WHERE Date = today()

┌─avg(ScanTimeVirtual)─┐
│    95.62269064131341 │
└──────────────────────┘
</div>
</pre>

... and average size of messages:


<pre>
<div class="term">
:) select median(ScanTimeVirtual) from rspamd where Date=today();

:) select avg(Size) from rspamd where Date=today();

SELECT avg(Size)
FROM rspamd
WHERE Date = today()

┌──────────avg(Size)─┐
│ 1778.31            │
└────────────────────┘
</div>
</pre>

## Conclusions

So with this load rate (**1500 messages per second**) and with the average size of messages around 2Kb, Rspamd processes each message in around **100ms in average**. I hope these numbers could give one some impression about Rspamd performance in general.

I would like to give the main kudos to [Abusix](https://www.abusix.com) who are constantly supporting Rspamd project and have generously provided their amazing spam feeds to improve Rspamd quality!