---
layout: doc
title: Rspamd Composites
---
# Rspamd composite symbols

## Introduction

Rspamd composites are used to combine rules and create more complex rules. Composite rules are defined in the `composites` section of the configuration. You could use `local.d/composites.conf` (which effects changes **inside** the `composites` section) to define new composites or to change/override existing composites. Names of keys here define the name of the composite; the value of the key should be an object that defines the composite's properties & expression, which is a combination of rules.

For example, you can define a composite that fires when two specific symbols are found and **replace** these symbols weights with its score:

~~~ucl
TEST_COMPOSITE {
    expression = "SYMBOL1 and SYMBOL2";
    score = 5.0;
}
~~~

In this case, if a message has both `SYMBOL1` and `SYMBOL2` then they are replaced by symbol `TEST_COMPOSITE`. The weights of `SYMBOL1` and `SYMBOL2` are subtracted from the metric accordingly.

## Composite expressions

You can use the following operations in a composite expression:

* `AND` `&` - matches true only if both operands are true
* `OR` `|` - matches true if any operands are true
* `NOT` `!` - matches true if operand is false

You also can use braces to define priorities. Otherwise operators are evaluated from left to right. For example:

~~~ucl
TEST {
    expression = "SYMBOL1 and SYMBOL2 and ( not SYMBOL3 | not SYMBOL4 | not SYMBOL5 )";
    score = 10.0;
    group = "Some group";
}
~~~

Composite rule can include other composites in the body. There is no restriction on definition order:

~~~ucl
TEST1 {
    expression = "SYMBOL1 AND TEST2";
}
TEST2 {
    expression = "SYMBOL2 OR NOT SYMBOL3";
}
~~~

Composites should not be recursive; but this is normally detected and avoided by Rspamd automatically.

It is also possible to setup policies for composites regarding symbols enclosed within a composite expression. By default Rspamd **removes** symbols and weights that trigger composite with the composite itself. However, it is possible to change this setting by 2 ways.

1. Set up removal policy for each symbol:
    * `~`: remove weight of symbol
    * `-`: do not remove anything
    * `^`: force removing of symbol and weight (by default, Rspamd prefers to leave symbols when some composite wants to remove and another composite wants to leave any of score/name pair)
2. Set the default policy for all elements in the expression using `policy` option:
    * `default`: default policy - remove weight and symbol
    * `remove_weight`: remove weight only
    * `remove_symbol`: remove symbol only
    * `leave`: leave both symbol and score

E.g.

~~~ucl
TEST_COMPOSITE {
    expression = "SYMBOL1 and SYMBOL2";
    policy = "leave";
}
TEST_COMPOSITE2 {
    expression = "SYMBOL3 and SYMBOL4";
    policy = "remove_weight";
}
~~~

## Composite weight rules

Composites can record symbols in a metric or record their weights. That could be used to create non-captive composites. For example, you have symbol `A` and `B` with weights `W_a` and `W_b` and a composite `C` with weight `W_c`.

* If `C` is `A & B` then if rule `A` and rule `B` matched then these symbols are *removed* and their weights are removed as well, leading to a single symbol `C` with weight `W_c`.
* If `C` is `-A & B`, then rule `A` is preserved, but the symbol `C` is inserted. The weight of `A` is preserved as well, so the total weight of `-A & B` will be `W_a + W_c`.
* If `C` is `~A & B`, then rule `A` is preserved, but it's weight is removed,
  leading to the total weight of `W_a` only

When you have multiple composites which include the same symbol and a composite wants to remove the symbol and another composite wants to preserve it, then the symbol is preserved by default. Here are some more examples:

~~~ucl
COMP1 {
    expression = "BLAH | !DATE_IN_PAST";
}
COMP2 {
    expression = "!BLAH | DATE_IN_PAST";
}
COMP3 {
    expression = "!BLAH | -DATE_IN_PAST";
}
~~~

Both `BLAH` and `DATE_IN_PAST` exist in the message's check results. However, `COMP3` wants to preserve `DATE_IN_PAST` so it will be saved in the output.

If we rewrite the previous example but replace `-` with `~` then `DATE_IN_PAST` will be removed (however, its weight won't be removed):

~~~ucl
COMP1 {
    expression = "BLAH | !DATE_IN_PAST";
}
COMP2 {
    expression = "!BLAH | DATE_IN_PAST";
}
COMP3 {
    expression = "!BLAH | -DATE_IN_PAST";
}
~~~

When we want to remove a symbol, despite other composites combinations, it is possible to add the prefix `^` to the symbol:

~~~ucl
COMP1 {
    expression = "BLAH | !DATE_IN_PAST";
}
COMP2 {
    expression = "!BLAH | ^DATE_IN_PAST";
}
COMP3 {
    expression = "!BLAH | -DATE_IN_PAST";
}
~~~

In this example `COMP3` wants to save `DATE_IN_PAST` once again, however `COMP2` overrides this and removes `DATE_IN_PAST`.

## Composites with symbol groups

It is possible to include a group of symbols in a composite rule. This effectively means **any** matched symbol of the specified group:

* `g:<group>` - matches **any** symbol
* `g+:<group>` - matches any symbol with **positive** score
* `g-:<group>` - matches any symbol with **negative** score

Removal policies are applied only to the matched symbols and not to the entire group.

~~~ucl
TEST2 {
    expression = "SYMBOL2 & !g:mua & g+:fuzzy";
}
~~~

## Disabling composites

You can disable a composite by adding `enabled = false` to the rule; for example, to disable the `DKIM_MIXED` composite defined in the stock configuration, you could add the following to `local.d/composites.conf`:

~~~ucl
DKIM_MIXED {
    enabled = false;
}
~~~
