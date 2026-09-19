// VENDORED from forge apps/notes/vendor/markdown.js (local-v1, 2026-07-16),
// tolstack local-v2 (2026-09-18). tolstack renders the WORKSHEET_*.md files
// beside each stack; that is the same class of dependency-free renderer
// forge's notes app needs, and copying it keeps this repo build-free and
// npm-free.
//
// THIS COPY NOW DIVERGES, deliberately, and the note that used to say "if it
// is ever fixed upstream, re-copy rather than diverge" is why the divergence
// is written down here rather than left to be discovered:
//
//   local-v2 (2026-09-18) — A PARAGRAPH ENDS AT A BLANK LINE, not at a
//   newline. local-v1 emitted one <p> per source LINE, so a file hard-wrapped
//   at ~80 columns rendered as a column of fragments with a full paragraph
//   margin between each, and `**bold**` spanning a wrap was not parsed at all
//   (the inline pass never saw the two halves together). Measured on
//   WORKSHEET_hub_bearing_thermal_fit.md: 324 paragraphs and 38 stray `**`
//   runs on screen. Every `.md` in this repo hard-wraps at ~80 by house
//   convention, so the better the source file's typography, the worse the
//   rendered page. See ISSUE_20260917_the_worksheet_renderer_makes_one_
//   paragraph_per_source_line.md.
//
//   forge's notes app has the SAME defect for the same reason; it is simply
//   less visible there, because a capture note is short and rarely wrapped.
//   Re-copying from upstream would reintroduce this. Port this change
//   upstream, or take upstream's fix if it lands first and this one can be
//   retired — do not re-copy blind.
//
// Minimal, dependency-free markdown renderer (local — NOT the real marked.js).
//
// The handoff sanctions vendoring a single-file lib like marked.min.js, but a
// tiny local renderer avoids pulling an external minified blob into the repo
// (supply-chain surface) for the markdown subset a capture note needs — and,
// unlike marked, it is escape-first by construction so no sanitize pass is
// needed. Version: local-v1 (2026-07-16). Covers: headings, bold/italic/strike,
// inline + fenced code, links, images, unordered/ordered/nested lists,
// blockquotes, horizontal rules, and GFM pipe tables. If markdown beyond this
// is ever required, either extend here (keep escape-first) or swap for a
// vendored marked.min.js behind NA.renderMarkdown WITH an escape/sanitize step.
//
// Security invariant: the ENTIRE source is HTML-escaped FIRST; every block/inline
// transform below runs over the already-escaped text, so no raw user HTML can
// reach the DOM. (Consequence: blockquote markers arrive as "&gt;", not ">", so
// the blockquote detector matches the escaped form.) The renderer never emits an
// href/src it did not build from an allowlisted URL scheme.
// Classic script; node-safe under the vm sandbox.
(function (NA) {
  "use strict";

  // Private-use-area sentinel wrapping extracted inline-code spans. It stays
  // plain text (unlike a NUL byte, which would make git treat this as binary)
  // and cannot occur in real note text, so it never collides with a literal
  // "CODE<n>" the user might type.
  var CODE_MARK = "\uE000";

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // A url is safe to emit as an href/src iff it uses an allowlisted scheme or is
  // a same-repo attachment path. The url is already HTML-escaped by the caller;
  // escapeHtml leaves "/" untouched, so an attachment path stays "attachments/…".
  function safeUrl(url) {
    return /^(https?:|mailto:)/i.test(url) || url.indexOf("attachments/") === 0;
  }

  function inline(text) {
    var t = text;
    // Inline code first (protect its contents from other transforms).
    var codes = [];
    t = t.replace(/`([^`]+)`/g, function (_, c) {
      codes.push(c);
      return CODE_MARK + (codes.length - 1) + CODE_MARK;
    });
    // Images: ![alt](url) — emitted before links so the leading ! is consumed.
    t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (m, alt, url) {
      if (safeUrl(url)) return '<img src="' + url + '" alt="' + alt + '" />';
      return m;
    });
    // Links: [label](http/https/mailto/attachment url) — url already escaped.
    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, label, url) {
      if (safeUrl(url)) {
        return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + label + "</a>";
      }
      return m;
    });
    t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    t = t.replace(/__([^_]+)__/g, "<strong>$1</strong>");
    t = t.replace(/~~([^~]+)~~/g, "<del>$1</del>");
    t = t.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
    t = t.replace(/(^|[^_])_([^_]+)_/g, "$1<em>$2</em>");
    t = t.replace(new RegExp(CODE_MARK + "(\\d+)" + CODE_MARK, "g"),
      function (_, i) { return "<code>" + codes[Number(i)] + "</code>"; });
    return t;
  }

  // --- block helpers (operate on already-escaped lines) -------------------

  var LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
  var HR_RE = /^ {0,3}([-*_])(\s*\1){2,}\s*$/;
  var BLOCKQUOTE_RE = /^\s*&gt;\s?/;
  var HEADING_RE = /^(#{1,6})\s+(.*)$/;
  var FENCE_RE = /^\s*```/;
  var TABLE_SEP_RE = /^\s*\|?(\s*:?-{1,}:?\s*\|)+\s*:?-{1,}:?\s*\|?\s*$/;

  // Recursively build a (possibly nested) list from a run of list-item lines.
  // items: [{ indent, tag, content }]. Returns { html, next } where next is the
  // index of the first item not consumed at this indent level.
  //
  // `floor` bounds the run: it extends while items[i].indent > floor (top call
  // omits it, i.e. -1 — no ancestor). The level's own indent is the MINIMUM
  // indent within that run, not items[start].indent: a tight list whose first
  // item carries one stray leading space (indent 1) while its siblings sit at
  // indent 0 must still resolve to base level 0, or the first item's inflated
  // "indent" would wrongly read as the level and strand its siblings below it.
  function buildList(items, start, floor) {
    if (floor === undefined) floor = -1;
    var end = start;
    while (end < items.length && items[end].indent > floor) end++;
    var indent = items[start].indent;
    for (var k = start + 1; k < end; k++) {
      if (items[k].indent < indent) indent = items[k].indent;
    }
    var tag = items[start].tag;
    var out = "<" + tag + ">";
    var i = start;
    while (i < end) {
      out += "<li>" + inline(items[i].content);
      i++;
      if (i < end && items[i].indent > indent) {
        var child = buildList(items, i, indent);
        out += child.html;
        i = child.next;
      }
      out += "</li>";
    }
    return { html: out + "</" + tag + ">", next: i };
  }

  function renderTable(header, sep, rows) {
    function cells(line) {
      var s = line.trim().replace(/^\|/, "").replace(/\|$/, "");
      return s.split("|").map(function (c) { return c.trim(); });
    }
    var aligns = cells(sep).map(function (c) {
      var l = c.charAt(0) === ":", r = c.charAt(c.length - 1) === ":";
      return l && r ? "center" : r ? "right" : l ? "left" : "";
    });
    function cellTag(tag, list) {
      return list.map(function (c, idx) {
        var a = aligns[idx] ? ' style="text-align:' + aligns[idx] + '"' : "";
        return "<" + tag + a + ">" + inline(c) + "</" + tag + ">";
      }).join("");
    }
    var html = "<table><thead><tr>" + cellTag("th", cells(header)) + "</tr></thead>";
    if (rows.length) {
      html += "<tbody>";
      rows.forEach(function (r) { html += "<tr>" + cellTag("td", cells(r)) + "</tr>"; });
      html += "</tbody>";
    }
    return html + "</table>";
  }

  // Does a block OTHER than a paragraph start at lines[i]? Read by the
  // paragraph gatherer below, which consumes lines until one of these — or a
  // blank line — ends the paragraph. It is the same set of tests the main loop
  // makes, in the same order, deliberately: two lists of "what starts a block"
  // that can disagree is how a renderer swallows a heading into a paragraph.
  function startsBlock(lines, i) {
    var line = lines[i];
    return FENCE_RE.test(line) || HR_RE.test(line) || HEADING_RE.test(line) ||
      BLOCKQUOTE_RE.test(line) || LIST_RE.test(line) ||
      (line.indexOf("|") !== -1 && i + 1 < lines.length &&
       TABLE_SEP_RE.test(lines[i + 1]));
  }

  // Render a block sequence of already-escaped lines to HTML.
  function renderBlocks(lines) {
    var html = [];
    var i = 0;
    while (i < lines.length) {
      var line = lines[i];
      var trimmed = line.trim();

      // Fenced code block.
      if (FENCE_RE.test(line)) {
        var buf = [];
        i++;
        while (i < lines.length && !FENCE_RE.test(lines[i])) { buf.push(lines[i]); i++; }
        if (i < lines.length) i++; // consume closing fence
        html.push("<pre><code>" + buf.join("\n") + "</code></pre>");
        continue;
      }

      // Horizontal rule.
      if (HR_RE.test(line)) { html.push("<hr />"); i++; continue; }

      // Heading.
      var heading = line.match(HEADING_RE);
      if (heading) {
        var level = heading[1].length;
        html.push("<h" + level + ">" + inline(heading[2]) + "</h" + level + ">");
        i++;
        continue;
      }

      // Blockquote: gather consecutive "&gt;" lines, recurse on the stripped body.
      if (BLOCKQUOTE_RE.test(line)) {
        var inner = [];
        while (i < lines.length && BLOCKQUOTE_RE.test(lines[i])) {
          inner.push(lines[i].replace(BLOCKQUOTE_RE, ""));
          i++;
        }
        html.push("<blockquote>" + renderBlocks(inner) + "</blockquote>");
        continue;
      }

      // GFM table: a line with a pipe followed by a separator row.
      if (line.indexOf("|") !== -1 && i + 1 < lines.length && TABLE_SEP_RE.test(lines[i + 1])) {
        var header = line;
        var sep = lines[i + 1];
        i += 2;
        var bodyRows = [];
        while (i < lines.length && lines[i].indexOf("|") !== -1 && lines[i].trim() !== "") {
          bodyRows.push(lines[i]);
          i++;
        }
        html.push(renderTable(header, sep, bodyRows));
        continue;
      }

      // List (unordered/ordered, with nesting by indentation).
      if (LIST_RE.test(line)) {
        var items = [];
        while (i < lines.length && LIST_RE.test(lines[i])) {
          var m = lines[i].match(LIST_RE);
          items.push({
            indent: m[1].replace(/\t/g, "    ").length,
            tag: /\d/.test(m[2]) ? "ol" : "ul",
            content: m[3],
          });
          i++;
        }
        html.push(buildList(items, 0).html);
        continue;
      }

      // Blank line — paragraph break.
      if (trimmed === "") { i++; continue; }

      // Paragraph: every following line until a blank line or another block.
      // A single newline is a SOFT WRAP inside one paragraph, not a paragraph
      // of its own (local-v2 — see the divergence note at the top of this
      // file). The lines are joined with "\n" and handed to inline() as ONE
      // string, which is the half that matters beyond the margins: an emphasis
      // span that happens to straddle a wrap is only resolvable over the
      // joined text, and rendering a newline rather than a <br /> keeps the
      // author's wrap invisible, which is what a soft wrap means.
      var para = [];
      while (i < lines.length && lines[i].trim() !== "" && !startsBlock(lines, i)) {
        para.push(lines[i].trim());
        i++;
      }
      html.push("<p>" + inline(para.join("\n")) + "</p>");
    }
    return html.join("\n");
  }

  // Render an escaped-and-transformed HTML string from markdown source.
  NA.renderMarkdown = function (src) {
    return renderBlocks(escapeHtml(src == null ? "" : src).split(/\r?\n/));
  };
})(window.ViewerApp = window.ViewerApp || {});
