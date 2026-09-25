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
// A BORROWED PROJECTION IS STILL PAIRED AGAINST THIS TREE -- see "is the
// projection this run will read built from THIS tree?" below; --repo says where
// the file is, never that its contents may be taken on trust.
//
// The DOM shim is forge apps/notes/run_tests.cjs's, extended with the few things
// the viewer's views touch (style, remove-by-tag queries, getAttribute defaults).
const vm = require("vm");
const fs = require("fs");
const path = require("path");
const http = require("http");
const { execFileSync } = require("child_process");

const here = __dirname;
const argv = process.argv.slice(2);
const repoFlag = argv.indexOf("--repo");
const repoRoot = repoFlag === -1
  ? path.resolve(here, "..", "..")
  : path.resolve(argv[repoFlag + 1]);
// The tree whose SOURCE is under test -- always this checkout, never --repo,
// for the same reason VIEWER_SRC is: `fixtures.js` is read from `here`, so the
// tree the projection has to be paired against is the one `here` sits in.
const sourceRoot = path.resolve(here, "..", "..");

// --- minimal DOM shim ---------------------------------------------------
function makeDocument() {
  function Node(tag) {
    this.tagName = (tag || "").toUpperCase();
    this.childNodes = [];
    this.attributes = {};
    // A plain bag, plus the two custom-property methods a real CSSStyleDeclaration
    // has: VA.cropFigure sets `--crop-ratio` on a crop's frame, and a `style`
    // object without setProperty throws rather than recording it. Stored under
    // the property's own name so a test can read it back the way it was written.
    this.style = {
      setProperty: function (name, value) { this[name] = value; },
      getPropertyValue: function (name) {
        return this[name] === undefined ? "" : this[name];
      },
    };
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
// The page's ORIGIN, which is a real input to the views now: whether a link to
// a local file can be followed at all is a property of it (VA.localFileUrl /
// VA.originOpensLocalFiles, measured 2026-09-15 -- an http page cannot open a
// file:// URL and the click silently does nothing). file:// is the viewer's
// own default origin, so that is what the shim reports; a test that wants the
// other answer sets `window.location.protocol` and restores it.
sandbox.location = { protocol: "file:", hostname: "", search: "" };
sandbox.URL = { createObjectURL: function () { return "blob:x"; } };
sandbox.setTimeout = setTimeout;
sandbox.clearTimeout = clearTimeout;

// --- is the projection this run will read built from THIS tree? -----------
//
// The [real] tier compares `apps/viewer/fixtures.js` — read from `here`, this
// checkout — against `data/projections/viewer/*`, which is gitignored, shared
// by every worktree, and rebuilt by hand. Those two can come from different
// trees, and when they do the comparison is not a check at all: on 2026-09-24
// the batch merge's candidate ran this tier at 514/514 against a projection
// built BEFORE the merge, merged, rebuilt, and got 513/514 out of exactly the
// same code (ISSUE_20260924_fixture_shape_drift_is_invisible_until_the_
// gitignored_projection_is_rebuilt). The fixture-shape guard was comparing the
// new fixtures against the old projection and agreeing with itself.
//
// So the tier asks first. Each projection carries a provenance stamp naming the
// commit it was built from (`scripts/projection_provenance.py`), and the
// question put to git is deliberately not "which branch" or "how far behind"
// but the only one that decides whether the comparison means anything: ARE THE
// INPUTS IT WAS BUILT FROM STILL WHAT IS ON DISK HERE? One answer covers a
// stale projection, a newer one, a divergent branch and an uncommitted edit,
// and it is quiet on every branch that touches none of them — two of the thirty
// commits before this one moved a projected input, so this is not an alarm that
// is always on.
//
// WHAT A WORKTREE IS SUPPOSED TO DO, decided here rather than left to the
// caller (the handoff asked for the reasoning in the diff). `--repo` borrows
// the main checkout's projection; the borrowed projection is freshness-checked
// against THIS worktree's tree, and a borrow that fails is loud — a failed
// check and a skipped tier, not a downgraded pass. The alternative considered
// was accepting the borrow and softening the verdict, and it was rejected
// because it makes the pre-merge candidate test unable to produce a trustworthy
// answer at all: the merge candidate is exactly the moment the pairing has to
// be falsifiable, and "this cannot be read as a pass" is not the same as "this
// would have caught it". A worktree must NOT rebuild the shared projection to
// clear the red — `data/` is one directory shared by every live worktree — so
// the remedy the message names is a rebuild in the checkout that owns it.
const PROJECTION_DIR = ["data", "projections", "viewer"];
// The projection files the [real] tier reads. A file that is not there is not
// stale: `topologies.json`'s own sub-tier already skips itself when it is
// absent, and `results.json`'s absence is the tier's existing skip.
const PROJECTION_FILES = ["results.json", "topologies.json", "crops.json"];
// The one input that is NOT derivable from a stamp. All three builders import
// it — build_viewer_projection and build_topology_projection through
// `tolerance_stack.stack`/`.topology`, build_viewer_crops through
// `tolerance_stack.spec_crop_regions` — so a change in it can change what any
// of the three writes, and the stamp records only the builder's own path and
// its source directory.
const SHARED_BUILDER_LIB = "tolerance_stack";

// `git <args>` in `cwd`, or null if it failed — same "null covers every cannot
// know" posture projection_provenance.git takes on the write side.
function gitOut(cwd, args) {
  try {
    return execFileSync("git", args, {
      cwd: cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (_) {
    return null;
  }
}

// The repo-relative inputs a stamp names. The KEY its source directory is filed
// under is the builder's choice — `stacks_dir` for the two viewer projections,
// `events_dir` for the spec library, and projection_provenance.py calls it "a
// label for the reader" precisely so it can differ — so it is found by SHAPE
// rather than by name: it is the value that is an absolute path inside the
// recorded repo root. Spelling the key here would be a second copy of a fact
// Python owns, and it would go quietly wrong the day a fourth builder picks a
// third word.
function inputsOf(stamp) {
  const root = String(stamp.repo_root || "").replace(/\/+$/, "");
  const inputs = [];
  if (root) {
    for (const key of Object.keys(stamp)) {
      const value = stamp[key];
      if (key !== "repo_root" && typeof value === "string" &&
          value.indexOf(root + "/") === 0) {
        inputs.push(value.slice(root.length + 1));
      }
    }
  }
  if (typeof stamp.built_by === "string" && stamp.built_by) inputs.push(stamp.built_by);
  inputs.push(SHARED_BUILDER_LIB);
  return inputs;
}

function short(sha) {
  return String(sha || "?").slice(0, 12);
}

function projectionFreshness(dataRoot, treeRoot) {
  // `--git-dir` + `--work-tree` rather than a bare `git -C`, and it is
  // load-bearing twice over: a linked worktree's `.git` is a file, and the
  // mutation-witness shadow (tmp/mutation-witness/, a copy of the tracked tree
  // inside the repo) is a directory git would otherwise read straight past to
  // the real working tree. Naming the work tree explicitly is what makes this
  // guard answer for the files the tier is actually reading, and therefore what
  // makes it witnessable at all. `--no-optional-locks` so a run from a shadow
  // cannot write the real checkout's index.
  const gitDir = gitOut(treeRoot, ["rev-parse", "--absolute-git-dir"]);
  if (gitDir === null) {
    return {
      fresh: false,
      why: "git could not be asked which tree " + treeRoot + " is, so the " +
        "projection under " + dataRoot + " could not be paired with it. A " +
        "[real] comparison against a projection of unknown provenance is not " +
        "a check — see the note in apps/viewer/run_tests.cjs.",
    };
  }
  const gitArgs = ["--no-optional-locks", "--git-dir=" + gitDir.trim(),
                   "--work-tree=" + treeRoot];

  const stale = [];
  const paired = [];
  for (const name of PROJECTION_FILES) {
    const full = path.join(dataRoot, ...PROJECTION_DIR, name);
    if (!fs.existsSync(full)) continue;
    let stamp = null;
    try {
      const parsed = JSON.parse(fs.readFileSync(full, "utf8"));
      stamp = parsed && parsed.provenance;
    } catch (_) {
      stamp = null;
    }
    if (!stamp || typeof stamp.head_sha !== "string" || !stamp.head_sha) {
      stale.push(name + " carries no provenance stamp, so which tree built it " +
        "cannot be established — it was built before stamping, or hand-edited");
      continue;
    }
    const sha = stamp.head_sha;
    if (gitOut(treeRoot, ["cat-file", "-e", sha + "^{commit}"]) === null) {
      stale.push(name + " was built from commit " + short(sha) +
        ", which is not in this tree at all");
      continue;
    }
    const inputs = inputsOf(stamp);
    const diff = gitOut(treeRoot,
      gitArgs.concat(["diff", "--name-only", sha, "--"], inputs));
    if (diff === null) {
      stale.push(name + ": git could not diff this tree against " + short(sha) +
        ", the commit it was built from");
      continue;
    }
    const changed = diff.split("\n").map((s) => s.trim()).filter(Boolean);
    if (!changed.length) {
      paired.push(name + " @ " + short(sha));
      continue;
    }
    const shown = changed.slice(0, 6).join(", ") +
      (changed.length > 6 ? ", and " + (changed.length - 6) + " more" : "");
    stale.push(name + " was built from " + short(sha) + ", and " +
      changed.length + " of its input file(s) differ in this tree: " + shown);
  }

  if (!stale.length) return { fresh: true, why: "", paired: paired };
  const head = gitOut(treeRoot, ["rev-parse", "HEAD"]);
  return {
    fresh: false,
    paired: paired,
    why: [
      "the projection this tier reads was NOT built from this tree, so every " +
      "[real] check would be comparing this checkout's fixtures against " +
      "another tree's projection:",
      ...stale.map((line) => "  - " + line),
      "",
      "  projection: " + path.join(dataRoot, ...PROJECTION_DIR).replace(/\\/g, "/"),
      "  this tree:  " + treeRoot.replace(/\\/g, "/") + " @ " + short(head),
      "",
      "A stale projection makes the fixture pairing agree with itself: on " +
      "2026-09-24 the batch merge's candidate reported 514/514 against a " +
      "projection built before the merge and 513/514 out of the same code " +
      "once it was rebuilt.",
      "",
      "Rebuild in the checkout that owns data/ -- never from a worktree, " +
      "which would overwrite the shared artifact for everyone:",
      "    powershell -ExecutionPolicy Bypass -File scripts/rebuild_projections.ps1",
      "then run this tier again against that checkout.",
    ].join("\n"),
  };
}

// The node-fs shim the real-data tier reads through. POSIX, repo-root-relative,
// absence is null/false — never a throw.
sandbox.NODE_FS = {
  root: repoRoot.replace(/\\/g, "/"),
  // The verdict above, computed here because the suite runs in a vm sandbox
  // with no `require` and so can no more run git than it can read a file.
  freshness: projectionFreshness(repoRoot, sourceRoot),
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

// A server that starts DATALESS and is given the projection mid-session --
// the mid-session-stop fixture below, inverted. This is what proves an
// unpublished origin latches NOTHING (viewer_transport_honest_hosted,
// deliverable 3): probe it before publishing and the page is UNPUBLISHED;
// publish, re-probe exactly the way a browser reload does, and the same URL
// is in served mode with no user action in between.
function startPublishableServer() {
  return new Promise((resolve) => {
    let published = false;
    const server = http.createServer((req, res) => {
      const route = published ? DATA_ROUTES[(req.url || "/").split("?")[0]] : null;
      if (!route) { res.writeHead(404, { "content-type": "text/plain" }); res.end("not found"); return; }
      res.writeHead(route.status || 200, { "content-type": route.contentType });
      if (req.method === "HEAD") { res.end(); return; }
      res.end(route.body);
    });
    server.listen(0, "127.0.0.1", () => resolve({
      server,
      publish: () => { published = true; },
    }));
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
  "vocab.gen.js",
  "reader_facing_bans.js",
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
  "warning_icon.js",
  "views/dom.js",
  "views/banner.js",
  "views/nav.js",
  "views/stack.js",
  "views/crop.js",
  "views/cards.js",
  "views/lightbox.js",
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
  const publishable = await startPublishableServer();
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
    // Starts dataless, gains the projection when publishData() is called --
    // the reload-recovers proof (viewer_transport_honest_hosted).
    publishableOrigin: `http://127.0.0.1:${publishable.server.address().port}`,
    publishData: () => publishable.publish(),
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
  // Printed before the checks rather than only inside the failure, because
  // "which projection did this run actually read, and does it match the tree
  // I am testing?" is the question the 2026-09-24 merge could not answer from
  // its own log afterwards.
  const freshness = sandbox.NODE_FS.freshness;
  console.log(freshness.fresh
    ? `projection paired with this tree: ${(freshness.paired || []).join(", ") || "(none on disk)"}`
    : "projection NOT paired with this tree -- the [real] tier is stale");
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
    publishable.server.closeAllConnections();
    publishable.server.close();
    rebuildServer.closeAllConnections();
    rebuildServer.close();
    rebuildFailServer.closeAllConnections();
    rebuildFailServer.close();
  }
  let failed = 0;
  let skipped = 0;
  for (const r of results) {
    if (r.skipped) {
      skipped++;
      console.log(`SKIP  ${r.name}\n      ${r.skipped}`);
    } else if (r.ok) {
      console.log(`PASS  ${r.name}`);
    } else {
      failed++;
      console.log(`FAIL  ${r.name}\n      ${r.error}`);
    }
  }
  // A SKIPPED TIER BELONGS IN THE TOTAL LINE, because the total line is the
  // only line a caller reliably reads. This printed `368/368 passed` and
  // exited 0 from a worktree until 2026-09-18 -- counting the node-fs tier's
  // skip marker as a pass while the 85 [real] checks behind it did not exist
  // -- and a batch merge read exactly that as a green suite
  // (ISSUE_20260918_real_tier_red_on_trunk_after_the_batch_merge_and_
  // projection_rebuild). The skip leaves the numerator AND the denominator: a
  // tier that could not run did not pass, and it was never among the checks
  // that ran either.
  const ran = results.length - skipped;
  console.log(`\n${ran - failed}/${ran} passed` + (skipped
    ? `, ${skipped} TIER${skipped === 1 ? "" : "S"} SKIPPED -- NOT RUN, NOT PASSED`
    : ""));
  // The exit code still reports FAILURES only. `tests/test_viewer_js_suite.py`
  // is what turns a skipped tier red, so the mutation-witness harness and the
  // browser runner keep the exit code's existing meaning.
  process.exit(failed ? 1 : 0);
})();
