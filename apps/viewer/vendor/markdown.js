// VENDORED from forge apps/notes/vendor/markdown.js (local-v1, 2026-07-16),
// verbatim apart from the namespace on the last line (NotesApp -> ViewerApp)
// and this note. tolstack renders the WORKSHEET_*.md files beside each stack;
// that is the same class of dependency-free renderer forge's notes app needs,
// and copying it keeps this repo build-free and npm-free. If it is ever fixed
// upstream, re-copy rather than diverge.
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
  function buildList(items, start) {
    var indent = items[start].indent;
    var tag = items[start].tag;
    var out = "<" + tag + ">";
    var i = start;
    while (i < items.length && items[i].indent >= indent) {
      if (items[i].indent > indent) {
        // Deeper than the current level with no sibling to hang it off: nest it
        // as its own list (defensive — normal nesting is handled below).
        var orphan = buildList(items, i);
        out += orphan.html;
        i = orphan.next;
        continue;
      }
      out += "<li>" + inline(items[i].content);
      i++;
      if (i < items.length && items[i].indent > indent) {
        var child = buildList(items, i);
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

      // Paragraph.
      html.push("<p>" + inline(line) + "</p>");
      i++;
    }
    return html.join("\n");
  }

  // Render an escaped-and-transformed HTML string from markdown source.
  NA.renderMarkdown = function (src) {
    return renderBlocks(escapeHtml(src == null ? "" : src).split(/\r?\n/));
  };

  // Plain-text one-liner for collapsed summaries: the first non-empty line with
  // its markdown syntax stripped (so a heading "# Title" shows as "Title", not a
  // literal "#"). Not for innerHTML — callers assign it via textContent.
  NA.summaryLine = function (text) {
    var line = NA.firstLine(text);
    if (line === "(empty note)") return line;
    return line
      .replace(/^\s{0,3}(#{1,6})\s+/, "")          // heading marker
      .replace(/^\s*>\s?/, "")                     // blockquote marker (firstLine is raw)
      .replace(/^\s*([-*+]|\d+[.)])\s+/, "")       // list marker
      .replace(/!\[([^\]]*)\]\([^)\s]+\)/g, "$1")   // image → alt
      .replace(/\[([^\]]+)\]\([^)\s]+\)/g, "$1")     // link → label
      .replace(/`([^`]+)`/g, "$1")                  // inline code
      .replace(/\*\*([^*]+)\*\*/g, "$1")            // bold
      .replace(/__([^_]+)__/g, "$1")
      .replace(/~~([^~]+)~~/g, "$1")                // strike
      .replace(/\*([^*]+)\*/g, "$1")               // italic
      .replace(/_([^_]+)_/g, "$1")
      .trim() || "(empty note)";
  };
})(window.ViewerApp = window.ViewerApp || {});
