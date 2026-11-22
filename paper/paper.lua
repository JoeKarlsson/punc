-- Turns draft.md's plain-Markdown conventions into a paper:
-- the "## Abstract" section becomes the abstract (plus keywords), "1." and "5.1" heading
-- numbers are dropped for LaTeX's own, "Table N. caption" paragraphs become table captions,
-- and the author list gets affiliation and ORCID lines.

local function stringify(x) return pandoc.utils.stringify(x) end

-- Typesetting: number ranges (1700-1749, 24-51%) take an en dash, negative numbers and the
-- formula's spaced "-" a minus sign, and subscripted symbols (S_a, w_s) become math.
function Str(s)
  if s.text == "-" then return pandoc.Str("−") end
  if s.text:find("%d%d%d%d%-%d%d%-%d%d") then return end -- ISO dates keep their hyphens
  local text = s.text:gsub("(%d)%-(%d)", "%1–%2"):gsub("^%-(%d)", "−%1"):gsub("%(%-(%d)", "(−%1")
  if not text:find("%a_%a") then
    if text ~= s.text then return pandoc.Str(text) end
    return
  end
  local out, pos = {}, 1
  for start, symbol, finish in text:gmatch("()(%a_%a)()") do
    if start > pos then table.insert(out, pandoc.Str(text:sub(pos, start - 1))) end
    table.insert(out, pandoc.Math("InlineMath", symbol))
    pos = finish
  end
  if pos <= #text then table.insert(out, pandoc.Str(text:sub(pos))) end
  return out
end

function Pandoc(doc)
  local blocks, abstract, in_abstract = {}, {}, false
  for i, block in ipairs(doc.blocks) do
    if block.t == "Header" and stringify(block) == "Abstract" then
      in_abstract = true
    elseif in_abstract and block.t == "Header" then
      in_abstract = false
    end
    if in_abstract then
      if block.t ~= "Header" then table.insert(abstract, block) end
    elseif block.t == "Header" then
      local first = block.content[1]
      if first and first.t == "Str" and first.text:match("^%d+[%.%d]*$") then
        block.content:remove(1)
        if block.content[1] and block.content[1].t == "Space" then block.content:remove(1) end
      end
      table.insert(blocks, block)
    elseif block.t == "Table" and #blocks > 0 and blocks[#blocks].t == "Para"
        and stringify(blocks[#blocks]):match("^Table %d+%. ") then
      local caption = table.remove(blocks).content
      for _ = 1, 4 do caption:remove(1) end -- "Table", " ", "N.", " "
      block.caption = pandoc.Caption({pandoc.Plain(caption)})
      -- Keep a short table and its caption on one page instead of letting longtable split it.
      table.insert(blocks, pandoc.RawBlock("latex",
        string.format("\\needspace{%d\\baselineskip}", #block.bodies[1].body + 8)))
      table.insert(blocks, block)
    else
      table.insert(blocks, block)
    end
  end
  assert(#abstract > 0, "draft.md has no ## Abstract section")

  local keywords = doc.meta.keywords
  if keywords then
    local words = {}
    for _, k in ipairs(keywords) do table.insert(words, stringify(k)) end
    table.insert(abstract, pandoc.Para({pandoc.Strong("Keywords:"), pandoc.Space(),
      pandoc.Str(table.concat(words, "; "))}))
  end
  doc.meta.abstract = pandoc.MetaBlocks(abstract)

  local authors = {}
  for _, a in ipairs(doc.meta.author or {}) do
    local parts = {stringify(a.name)}
    if a.affiliation then table.insert(parts, "\\\\ \\small " .. stringify(a.affiliation)) end
    if a.orcid and stringify(a.orcid) ~= "" then
      table.insert(parts, "\\\\ \\small ORCID \\href{https://orcid.org/" .. stringify(a.orcid) .. "}{"
        .. stringify(a.orcid) .. "}")
    end
    table.insert(authors, pandoc.MetaInlines({pandoc.RawInline("latex", table.concat(parts, " "))}))
  end
  if #authors > 0 then doc.meta.author = pandoc.MetaList(authors) end

  doc.blocks = blocks
  return doc
end
