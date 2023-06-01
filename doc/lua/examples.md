---
layout: doc
title: Lua rules examples
---

# Lua rules examples
{:.no_toc}

Here is the collection of the useful Lua rules snippets that are not the official rules but could be used to filter specific spam.

To enable these snippets, you can place them to the `rspamd.local.lua` file. Typically it will be `/etc/rspamd/rspamd.local.lua` file for the Linux distros (or `/usr/local/etc/rspamd/rspamd.local.lua` for others).

<div id="toc" markdown="1">
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

## Maildir delivery based on Rspamd

This sample shows how to store email into Dovecot (or other IMAP server) maildir using Rspamd and different matching criterias. 

~~~lua
local fun = require "fun"
local logger = require "rspamd_logger"

-- Returns newline delimiter for specific task
local function get_newline_delim(task)

  local nlines = task:get_newlines_type()
  local fchars = "\r\n"
  if nlines == 'cr' then
    fchars = "\r"
  elseif nlines == 'lf' then
    fchars = "\n"
  end

  return fchars
end

-- Stores symbols into generic headers
local function symbols_to_header(task)
  local syms = task:get_symbols_all()
  local hdr = {}
  local res = task:get_metric_score()

  hdr[1] = string.format('default: False [%.2f / %.2f]', res[1], res[2])
  local m = fun.map(function(sym)
    return string.format('%s(%.2f)[%s]', sym.name, sym.score, table.concat(sym.options or {}, ','))
  end, syms)

  fun.each(function(e)
    hdr[#hdr + 1] = e
  end, m)

  local crlf = get_newline_delim(task)
  local folded = table.concat(hdr, crlf .. '  ')
  return string.format('%s: %s%s', 'X-Spamd-Result', folded, crlf)
end

-- Performs maildir saving, sharded by day
local function save_task(task, folder, extra_hdrs)
  local util = require "rspamd_util"
  -- To organise moving
  local base_folder = '/var/spool/dovecot/maildir/tmp'
  local dst_folder = '/var/spool/dovecot/maildir'
  
  -- Random filename
  local fname = string.format('%s', util.random_hex(64))
  local src_folder = string.format('%s/', base_folder)
  util.mkdir(src_folder)
  local src_file = string.format('%s/%s', src_folder, fname)
  file = io.open(src_file, 'w')

  if not file then
    logger.errx('cannot save file %s', src_file)
    return false
  end
  
  -- Add some more data when saving
  file:write(tostring(task:get_raw_headers()))
  file:write(symbols_to_header(task))

  for k,v in pairs(extra_hdrs) do
    file:write(k, ': ')
    file:write(util.fold_header(k, v))
    file:write(get_newline_delim(task))
  end

  file:write(get_newline_delim(task))
  file:write(tostring(task:get_rawbody()))
  file:close()
  
  local err,st = util.stat(src_file)
  -- Perform sharding, ensure that dirs are existing
  local dst_folder = string.format('%s/.%s.%s/', dst_folder, os.date('%F'), folder)
  util.mkdir(dst_folder)
  dst_folder = dst_folder .. '/new'
  util.mkdir(dst_folder)
  local dst_file = string.format('%s/%s,S=%s', dst_folder, fname, st.size)
  -- Final rename
  os.rename(src_file, dst_file)

  logger.messagex(task, 'saved in %s', dst_file)

  return true
end

rspamd_config.SAVE_MAILDIR = {
  callback = function(task)

    local foo_var = task:get_mempool():get_variable('FOO')
    local bar_var = task:get_mempool():get_variable('BAR')
    local res = task:get_metric_result()

    if foo_var then
      save_task(task, 'foo', {['X-Rspamd-FOO'] = foo_var})
    elseif bar_var then
      save_task(task, 'bar', {['X-Rspamd-BAR'] = bar_var})
    elseif task:has_symbol('LEAKED_PASSWORD_SCAM') then
      save_task(task, 'bitcoin', {})
    elseif task:has_symbol('DMARC_POLICY_REJECT') or task:has_symbol('R_DKIM_REJECT') then
      save_task(task, 'policy_failure', {})
    elseif res.score <= 0 then
      -- Sampling, 10%
      if math.random() > 0.9 then
        save_task(task, 'ham', {})
      end
    else
      -- Sampling 0.1%
      if math.random() > 0.999 then
        save_task(task, 'gen', {})
      end
    end
  end,
  type = 'idempotent',
  priority = 10,
}
~~~
