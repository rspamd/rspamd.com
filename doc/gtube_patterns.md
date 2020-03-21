---
layout: doc
title: GTUBE-like test patterns
---
# GTUBE-like test patterns

Unlike SpamAssassin where GTUBE carries a spam score, in Rspamd it triggers an action and inserts the `GTUBE` symbol.

|pattern|action|enabled|
|---|---|---|
|`XJS*C4JDBQADN1.NSBN3*2IDNEN*GTUBE-STANDARD-ANTI-UBE-TEST-EMAIL*C.34X`|`reject`|`Yes`|
|`YJS*C4JDBQADN1.NSBN3*2IDNEN*GTUBE-STANDARD-ANTI-UBE-TEST-EMAIL*C.34X`|`add header`|`No`|
|`ZJS*C4JDBQADN1.NSBN3*2IDNEN*GTUBE-STANDARD-ANTI-UBE-TEST-EMAIL*C.34X`|`rewrite subject`|`No`|
|`AJS*C4JDBQADN1.NSBN3*2IDNEN*GTUBE-STANDARD-ANTI-UBE-TEST-EMAIL*C.34X`|`no action`|`No`|

Because non-reject GTUBE-like patterns can be used to bypass spam filtering, they are disabled by default unless you add this option to the `local.d/options` (2.3+):

~~~ucl
enable_test_patterns = true;
~~~

Enabling non-reject GTUBE-like patterns **is NOT recommended for production** usage!
