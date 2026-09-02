// Headless runner for the viewer's JS tests (the fast tier of forge
// CONVENTIONS.md §7). Loads the same classic scripts test.html loads into a vm
// sandbox that supplies a fake `window` and a minimal DOM shim, then runs
// ViewerApp.runTests(). Exits non-zero on any failure.
//
//   node apps/viewer/run_tests.cjs                     # this checkout
//   node apps/viewer/run_tests.cjs --repo C:\workspace\tolstack
//
// The --repo argument is the worktree escape hatch: data/ (and therefore
// data/projections/viewer/) exists only in the MAIN checkout, so from a worktree
// point the node-fs tier at the main checkout or it reports itself skipped.
//
// The DOM shim is forge apps/notes/run_tests.cjs's, extended with the few things
// the viewer's views touch (style, remove-by-tag queries, getAttribute defaults).
const vm = require("vm");
const fs = require("fs");
const path = require("path");

const here = __dirname;
const argv = process.argv.slice(2);
const repoFlag = argv.indexOf("--repo");
const repoRoot = repoFlag === -1
  ? path.resolve(here, "..", "..")
  : path.resolve(argv[repoFlag + 1]);

// --- minimal DOM shim ---------------------------------------------------
function makeDocument() {
  function Node(tag) {
    this.tagName = (tag || "").toUpperCase();
    this.childNodes = [];
    this.attributes = {};
    this.style = {};
    this._className = "";
    this._text = "";
    this._html = null;
    this.value = "";
    this.nodeType = tag === undefined ? 3 : 1;
    var self = this;
    this.classList = {
      add: function (c) { var s = self._classSet(); s.add(c); self._className = Array.from(s).join(" "); },
      remove: function (c) { var s = self._classSet(); s.delete(c); self._className = Array.from(s).join(" "); },
      contains: function (c) { return self._classSet().has(c); },
    };
  }
  Node.prototype._classSet = function () {
    return new Set((this._className || "").split(/\s+/).filter(Boolean));
  };
  Object.defineProperty(Node.prototype, "className", {
    get: function () { return this._className; },
    set: function (v) { this._className = v || ""; },
  });
  Node.prototype.appendChild = function (c) { this.childNodes.push(c); c.parentNode = this; return c; };
  // `class` is set through setAttribute on SVG nodes (className is read-only
  // there), so the shim has to keep the two in step or querySelectorAll(".x")
  // would see an HTML row and miss the rail mark beside it.
  Node.prototype.setAttribute = function (k, v) {
    this.attributes[k] = v;
    if (k === "class") this._className = String(v);
  };
  Node.prototype.getAttribute = function (k) {
    return Object.prototype.hasOwnProperty.call(this.attributes, k) ? this.attributes[k] : null;
  };
  Object.defineProperty(Node.prototype, "textContent", {
    get: function () {
      if (this.nodeType === 3) return this._text;
      var s = this._text || "";
      this.childNodes.forEach(function (c) { s += c.textContent; });
      return s;
    },
    set: function (v) { this.childNodes = []; this._text = String(v); this._html = null; },
  });
  Object.defineProperty(Node.prototype, "innerHTML", {
    get: function () { return this._html == null ? "" : this._html; },
    set: function (v) { this.childNodes = []; this._text = ""; this._html = String(v); },
  });
  Node.prototype.click = function () {
    if (typeof this.onclick === "function") this.onclick({ preventDefault: function () {} });
  };
  Node.prototype.addEventListener = function (type, fn) {
    (this._listeners || (this._listeners = {}))[type] = fn;
  };
  Node.prototype._walk = function (fn) {
    this.childNodes.forEach(function (c) { fn(c); if (c._walk) c._walk(fn); });
  };
  // Supports "tag", ".class" and "tag.class" — the last is what lets a test say
  // querySelectorAll("tr.el-row") without matching a chip of the same class.
  function matcher(sel) {
    sel = sel.trim();
    var dot = sel.indexOf(".");
    var tag = dot === -1 ? sel : sel.slice(0, dot);
    var cls = dot === -1 ? null : sel.slice(dot + 1);
    return function (n) {
      if (tag && n.tagName !== tag.toUpperCase()) return false;
      if (cls && !(n._classSet && n._classSet().has(cls))) return false;
      return true;
    };
  }
  Node.prototype.querySelectorAll = function (sel) {
    var out = [], m = matcher(sel);
    this._walk(function (n) { if (n.nodeType === 1 && m(n)) out.push(n); });
    return out;
  };
  Node.prototype.querySelector = function (sel) { return this.querySelectorAll(sel)[0] || null; };

  return {
    createElement: function (tag) { return new Node(tag); },
    // The shim has no namespaces; an SVG node is a Node with a tag like any
    // other. What it DOES have to reproduce is the method existing, because
    // VA.svg falls back to createElement when it does not — and that fallback
    // is the browser-only bug the fast tier must not paper over.
    createElementNS: function (_ns, tag) { return new Node(tag); },
    createTextNode: function (t) { var n = new Node(); n.nodeType = 3; n._text = String(t); return n; },
  };
}

const sandbox = { console };
sandbox.window = sandbox;
sandbox.document = makeDocument();
sandbox.URL = { createObjectURL: function () { return "blob:x"; } };
sandbox.setTimeout = setTimeout;
sandbox.clearTimeout = clearTimeout;

// The node-fs shim the real-data tier reads through. POSIX, repo-root-relative,
// absence is null/false — never a throw.
sandbox.NODE_FS = {
  root: repoRoot.replace(/\\/g, "/"),
  io: {
    readText: function (relPath) {
      const full = path.join(repoRoot, relPath);
      try { return fs.readFileSync(full, "utf8"); } catch (_) { return null; }
    },
    exists: function (relPath) {
      try { return fs.existsSync(path.join(repoRoot, relPath)); } catch (_) { return false; }
    },
  },
};

// Reads apps/viewer's OWN source files — always from `here` (this worktree),
// never through `--repo`. NODE_FS above is deliberately re-pointable at the
// main checkout to reach gitignored data/; a structural test asserting on
// index.html/app.js must NOT go through that seam, or `--repo` (needed to
// reach data/projections/viewer/) would silently check trunk's HTML against
// this branch's script logic.
sandbox.VIEWER_SRC = {
  readText: function (relPath) {
    try { return fs.readFileSync(path.join(here, relPath), "utf8"); } catch (_) { return null; }
  },
};
vm.createContext(sandbox);

const files = [
  "config.js",
  "viewer.js",
  "topology.js",
  "fixtures.js",
  "topology_fixtures.js",
  "vendor/markdown.js",
  "storage/adapter.js",
  "storage/memory.js",
  "storage/node_fs.js",
  "views/dom.js",
  "views/banner.js",
  "views/list.js",
  "views/stack.js",
  "views/crop.js",
  "views/worksheet.js",
  "views/detail.js",
  "views/topology.js",
  "tests.js",
];
for (const f of files) {
  vm.runInContext(fs.readFileSync(path.join(here, f), "utf8"), sandbox, { filename: f });
}

(async () => {
  console.log(`repo root for the node-fs tier: ${repoRoot}`);
  const results = await sandbox.ViewerApp.runTests();
  let failed = 0;
  for (const r of results) {
    if (r.skipped) {
      console.log(`SKIP  ${r.name}\n      ${r.skipped}`);
    } else if (r.ok) {
      console.log(`PASS  ${r.name}`);
    } else {
      failed++;
      console.log(`FAIL  ${r.name}\n      ${r.error}`);
    }
  }
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})();
