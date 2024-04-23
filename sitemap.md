---
layout: support
title: Site map
---

# Site map

<div class="row site-map">
  <div class="col-md">
    <h2 class="mt-3">Pages</h2>

{% include directory-tree.html %}

  </div>
  <div class="col-md">
    <h2 class="mt-3">Posts</h2>

    <ul>
      {%- for post in site.posts -%}
        {%- assign date = post.date | split: " " | first -%}
        {%- assign year = date | split: "-" | first -%}
        {%- unless year == prev_year -%}
        {%- unless prev_year == nil %}
        </ul>
      </li>
        {%- endunless %}
      <li>
        <strong>{{ year }}</strong>
        <ul>
        {%- endunless %}
          <li>{{ date }} <a href="{{ site.baseurl }}{{ post.url }}">{{ post.title }}</a></li>
          {%- assign prev_year = year -%}
      {%- endfor %}
        </ul>
      </li>
    </ul>

  </div>
</div>
