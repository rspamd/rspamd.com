---
layout: doc
title: Lua rules examples
---

# Lua rules examples
{:.no_toc}

Here is the collection of the useful Lua rules snippets that are not the official rules but could be used to filter specific spam.

To enable these snippets, you can place them to the `rspamd.local.lua` file. Typically it will be `/etc/rspamd/rspamd.local.lua` file for the Linux distros (or `/usr/local/etc/rspamd/rspamd.local.lua` for others).

{::options parse_block_html="true" /}
<div id="toc">
  <h2 class="toc-header">Contents</h2>
  * TOC
  {:toc}
</div>

## Languages filter

This rule is useful to filter specific languages. This functionality is somehow similar to the [TextCat Spamassassin module](https://spamassassin.apache.org/full/3.2.x/doc/Mail_SpamAssassin_Plugin_TextCat.html).

~~~lua

local ok_langs = {
  ['en'] = true,
  ['ca'] = true,
  ['es'] = true,
  ['fr'] = true,
}

rspamd_config.LANG_FILTER = {
  callback = function(task)
    local any_ok = false
    local parts = task:get_text_parts() or {}
    local ln
    for _,p in ipairs(parts) do
      ln = p:get_language() or ''
      local dash = ln:find('-')
      if dash then
        -- from zh-cn to zh
        ln = ln:sub(1, dash-1)
      end
      if ok_langs[ln] then
        any_ok = true
        break
      end
    end
    if any_ok or not ln or #ln == 0 then
      return false
    end
    return 1.0,ln
  end,
  score = 2.0,
  description = 'no ok languages',
}
~~~
