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
const http = require("http");

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
// --- a real local static server, for storage/http.js's node tier -----------
//
// The http adapter's whole job is deciding WHICH real URL shape it is served
// under, so its tests need a real server, not a fetch mock -- a fake that
// only ever answers what the adapter expects would never catch the adapter
// asking the wrong question. Fixed routes, not a filesystem tree: these tests
// are about the TRANSPORT (probing, content-type checking, 404-vs-network-
// failure), not about any one projection's shape.
const SAMPLE_TOPOLOGIES = JSON.stringify({ topologies: [{ id: "demo" }] });
const SAMPLE_RESULTS = JSON.stringify({ stacks: [] });
const SAMPLE_CROPS = JSON.stringify({ by_stack: {} });
const SAMPLE_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const SAMPLE_WORKSHEET = "# Demo worksheet\n\nHTTP tier fixture.\n";

// Both mount shapes' absolute paths coexist on one server without collision
// (one is nested under data/projections/viewer/, the other is not), so a
// single server can prove both candidates at once. The sibling-data-mount
// paths are under /tolstack/data/ -- ../data relative to a page at
// /tolstack/viewer/ steps up ONE level, to /tolstack/, not to the server
// root, exactly matching drawing-checker's own VIEWER_MOUNT/DATA_MOUNT pair
// (webui/analyses.py::mount_tolstack).
const DATA_ROUTES = {
  "/tolstack/data/topologies.json": { contentType: "application/json", body: SAMPLE_TOPOLOGIES },
  "/tolstack/data/results.json": { contentType: "application/json", body: SAMPLE_RESULTS },
  "/tolstack/data/crops.json": { contentType: "application/json", body: SAMPLE_CROPS },
  "/tolstack/data/crops/sample.png": { contentType: "image/png", body: SAMPLE_PNG },
  "/data/projections/viewer/topologies.json": { contentType: "application/json", body: SAMPLE_TOPOLOGIES },
  "/data/projections/viewer/results.json": { contentType: "application/json", body: SAMPLE_RESULTS },
  "/data/projections/viewer/crops.json": { contentType: "application/json", body: SAMPLE_CROPS },
  "/data/projections/viewer/crops/sample.png": { contentType: "image/png", body: SAMPLE_PNG },
  "/docs/tolerance_stacks/WORKSHEET_demo.md": { contentType: "text/markdown", body: SAMPLE_WORKSHEET },
};

function startStaticServer(routes) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const route = routes[(req.url || "/").split("?")[0]];
      if (!route) { res.writeHead(404, { "content-type": "text/plain" }); res.end("not found"); return; }
      res.writeHead(route.status || 200, { "content-type": route.contentType });
      if (req.method === "HEAD") { res.end(); return; }
      res.end(route.body);
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

// The trap the probe has to survive: a catch-all that answers EVERY path with
// 200 + HTML (an nginx default page, an SPA fallback) -- drawing-checker's own
// nginx lesson, cited in the handoff this adapter was built for. A candidate
// must fail here even though the status is ok.
function startHtmlCatchAllServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { "content-type": "text/html" });
      res.end("<html>not a projection</html>");
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

// --- a stub tolstack_mount_rebuild_endpoint, for storage/http.js's rebuild
// capability probe and its two rebuild methods (viewer_rebuild_affordance) --
//
// Not the real drawing-checker endpoint (staged the same day, not owned by
// this handoff) -- a stand-in that answers the same shape this adapter
// consumes (`busy`, `state`), so the click path (POST, then poll GET .../status
// until it stops being busy) is exercised end to end without depending on
// that other handoff having shipped. Serves the ordinary DATA_ROUTES too, so
// one server can prove both the data candidate AND the rebuild candidate at
// once, the same "one server proves both shapes" trick DATA_ROUTES itself uses.
function startRebuildOrigin() {
  return new Promise((resolve) => {
    let busy = false;
    const server = http.createServer((req, res) => {
      const u = (req.url || "/").split("?")[0];
      if (u === "/tolstack/rebuild/status" && req.method === "GET") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ busy, state: busy ? "running" : "done" }));
        return;
      }
      if (u === "/tolstack/rebuild" && req.method === "POST") {
        busy = true;
        // Goes idle shortly after -- long enough for a test to observe
        // `busy: true` on the immediate response, short enough not to slow
        // the suite down waiting for it.
        setTimeout(() => { busy = false; }, 20);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ busy: true, state: "running" }));
        return;
      }
      const route = DATA_ROUTES[u];
      if (!route) { res.writeHead(404, { "content-type": "text/plain" }); res.end("not found"); return; }
      res.writeHead(route.status || 200, { "content-type": route.contentType });
      if (req.method === "HEAD") { res.end(); return; }
      res.end(route.body);
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

// A mount that DOES answer the status probe (so capability reads true) but
// whose POST fails -- proves requestRebuild() rejects on a real transport
// failure instead of resolving as if nothing were wrong, same contract as
// _readProjection's own non-404 failures.
function startRebuildFailOrigin() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const u = (req.url || "/").split("?")[0];
      if (u === "/tolstack/rebuild/status" && req.method === "GET") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ busy: false, state: "done" }));
        return;
      }
      if (u === "/tolstack/rebuild" && req.method === "POST") {
        res.writeHead(500, { "content-type": "text/plain" });
        res.end("boom");
        return;
      }
      const route = DATA_ROUTES[u];
      if (!route) { res.writeHead(404, { "content-type": "text/plain" }); res.end("not found"); return; }
      res.writeHead(route.status || 200, { "content-type": route.contentType });
      if (req.method === "HEAD") { res.end(); return; }
      res.end(route.body);
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

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
  "storage/http.js",
  "views/dom.js",
  "views/banner.js",
  "views/nav.js",
  "views/stack.js",
  "views/crop.js",
  "views/cards.js",
  "views/worksheet.js",
  "views/detail.js",
  "views/topology.js",
  "tests.js",
];
for (const f of files) {
  vm.runInContext(fs.readFileSync(path.join(here, f), "utf8"), sandbox, { filename: f });
}

(async () => {
  const dataServer = await startStaticServer(DATA_ROUTES);
  const htmlServer = await startHtmlCatchAllServer();
  const emptyServer = await startStaticServer({});
  const rebuildServer = await startRebuildOrigin();
  const rebuildFailServer = await startRebuildFailOrigin();
  let dataServerClosed = false;
  sandbox.fetch = fetch;
  sandbox.HTTP_FIXTURE = {
    dataOrigin: `http://127.0.0.1:${dataServer.address().port}`,
    htmlOrigin: `http://127.0.0.1:${htmlServer.address().port}`,
    // A server that 404s everything -- proves neither candidate resolving is
    // read as DISCONNECTED, not an error.
    emptyOrigin: `http://127.0.0.1:${emptyServer.address().port}`,
    // tolstack_mount_rebuild_endpoint stand-ins (viewer_rebuild_affordance):
    // rebuildOrigin answers both the data candidate and a live rebuild
    // endpoint; rebuildFailOrigin's status route says "capable" but its POST
    // 500s, for the request-rejects-on-failure case.
    rebuildOrigin: `http://127.0.0.1:${rebuildServer.address().port}`,
    rebuildFailOrigin: `http://127.0.0.1:${rebuildFailServer.address().port}`,
    // Simulates a mid-session server stop for exactly one test -- forced
    // through closeAllConnections() first so a kept-alive fetch socket can't
    // leave this hanging.
    stopDataServer: () => new Promise((resolve) => {
      if (dataServerClosed) { resolve(); return; }
      dataServerClosed = true;
      dataServer.closeAllConnections();
      dataServer.close(() => resolve());
    }),
  };

  console.log(`repo root for the node-fs tier: ${repoRoot}`);
  let results;
  try {
    results = await sandbox.ViewerApp.runTests();
  } finally {
    if (!dataServerClosed) dataServer.closeAllConnections();
    dataServer.close();
    htmlServer.closeAllConnections();
    htmlServer.close();
    emptyServer.closeAllConnections();
    emptyServer.close();
    rebuildServer.closeAllConnections();
    rebuildServer.close();
    rebuildFailServer.closeAllConnections();
    rebuildFailServer.close();
  }
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
