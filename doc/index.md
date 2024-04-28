---
layout: doc
title: Documentation
---
# Documentation index

|---|---|
{% assign index_pages = site.pages | where: "name", "index.md" | sort_natural: "title" -%}
{%- for pg in index_pages -%}
    {%- assign path = pg.dir | split: "/" -%}
    {%- comment -%}
    # Split returns [] for "/" but ["", "doc"] "/doc/" as removes trailing empty strings.
    # Skip page unless it is a sub-directory of "/doc/".
    {%- endcomment -%}
    {%- unless path[1] == "doc" and path.size == 3 -%}
        {%- continue -%}
    {%- endunless -%}
|[{{ pg.title }}]({{ site.baseurl }}{{ pg.url }})|{{ pg.description }}|
{% endfor -%}
