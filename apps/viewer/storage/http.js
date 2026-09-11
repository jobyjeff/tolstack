// HTTP adapter — reads the three projection JSONs (+ crops + worksheets) over
// a static/served origin, with NO folder grant. The load-time probe
// (topology_app.js's chooseAdapter) tries this FIRST whenever the page is not
// on file://; FSA remains the fallback for a double-clicked page or a served
// page whose origin answers neither candidate below.
//
// Two mount shapes are known to exist, and BOTH are probed, in this order
// (measured 2026-09-09, HANDOFF_20260909_viewer_http_transport):
//
//   1. sibling-data-mount — drawing-checker's own mounts
//      (webui/analyses.py::mount_tolstack): the page is served under
//      `/tolstack/viewer/`, and a SIBLING mount `/tolstack/data/` serves
//      `data/projections/viewer/` directly — so `../data/<file>`, relative to
//      the page, reaches a projection. This mount does NOT expose docs/ at
//      all (only the viewer app and its projection dir are mounted), so a
//      worksheet is genuinely unreachable here — a fact this adapter reports
//      through capabilities().worksheets, not a bug to work around.
//   2. repo-root-static — a plain static server rooted at the repo
//      (`python -m http.server` from the repo root): the page is served under
//      `apps/viewer/`, so everything under the repo root is reachable by
//      walking up two levels — `../../data/projections/viewer/<file>` for a
//      projection, `../../docs/...` for a worksheet.
//
// The probe fetches `topologies.json` and checks BOTH `res.ok` AND the
// content-type header actually says JSON — status alone is not enough, per
// drawing-checker's own nginx lesson: a catch-all route can answer 200 + HTML
// for any path, and a page that trusted that would boot into a page full of
// markup instead of falling back to FSA.
//
// `pathname`/`fetchImpl` are constructor overrides for the node test tier
// only (no real `window.location`/`fetch` there); a browser never passes
// them, and both default to the real globals.
//
// `rebuildDir` (viewer_rebuild_affordance, 2026-09-10): the sibling-data-mount
// candidate is drawing-checker's own mount, so it alone can also carry a
// sibling `/tolstack/rebuild` endpoint (`tolstack_mount_rebuild_endpoint`,
// staged the same day) — a plain repo-root static server never can, since
// nothing serves it. Presence is PROBED (see _probeRebuild), never assumed
// from the candidate matching: the endpoint's own handoff may not have
// shipped yet even where the mount otherwise looks right, and a probe is the
// only way to tell "not built yet" from "not here at all" without hardcoding
// either answer.
(function (VA) {
  "use strict";

  var CANDIDATES = [
    { name: "sibling-data-mount", dataDir: "../data", textDir: null, rebuildDir: "../rebuild" },
    { name: "repo-root-static", dataDir: "../../data/projections/viewer", textDir: "../..", rebuildDir: null },
  ];

  // Resolve a `../`-relative path against the PAGE's own directory, exactly
  // the way a browser resolves a relative URL — done by hand, in plain string
  // math, rather than the `URL` constructor: the same technique forge's own
  // `FT.deriveBase` uses (apps/shared/transport.js), and it means this file
  // needs nothing from the sandbox but a pathname string.
  function resolvePath(pagePathname, relative) {
    var dir = pagePathname.slice(0, pagePathname.lastIndexOf("/") + 1);
    var parts = (dir + relative).split("/");
    var stack = [];
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (part === "" || part === ".") continue;
      if (part === "..") stack.pop(); else stack.push(part);
    }
    return "/" + stack.join("/");
  }

  function HttpAdapter(opts) {
    opts = opts || {};
    this._state = VA.STATE.DISCONNECTED;
    this._candidate = null;
    this._pathname = opts.pathname ||
      (typeof window !== "undefined" && window.location ? window.location.pathname : "/");
    // bind(window), not bind(null): native fetch brand-checks its receiver, so
    // an unbound call (`this._fetch(url)`, receiver = this adapter instance)
    // throws "Illegal invocation" in a real browser — the same lesson forge's
    // own apps/shared/transport.js recorded. That throw would otherwise be
    // swallowed by _fetchQuiet's own catch and misread as "neither candidate
    // resolves", so an unbound fetch here silently fails EVERY probe.
    this._fetch = opts.fetchImpl ||
      (typeof fetch === "function"
        ? (typeof window !== "undefined" ? fetch.bind(window) : fetch)
        : null);
  }

  // file:// never reaches here (Chrome forbids fetch() of local files,
  // config.js's own reason the app is classic scripts at all) and neither
  // does a context with no fetch — both read as "not supported" so
  // chooseAdapter falls straight through to FSA.
  HttpAdapter.isSupported = function (opts) {
    opts = opts || {};
    var hasFetch = !!(opts.fetchImpl || typeof fetch === "function");
    var proto = typeof window !== "undefined" && window.location
      ? window.location.protocol : "http:";
    return hasFetch && proto !== "file:";
  };

  HttpAdapter.prototype.getState = function () { return this._state; };

  // What this transport can actually serve. `worksheets` is false under the
  // sibling-data-mount candidate — docs/ is not reachable through it at all,
  // which is a fact about the MOUNT, not a missing file, and views must not
  // offer a control this transport cannot service (forge apps/README.md,
  // "Two transports, and the page says which one it is on"). `rebuild` is
  // set only once `_probeRebuild` has actually reached the endpoint — never
  // inferred from the candidate alone (see the CANDIDATES comment above).
  HttpAdapter.prototype.capabilities = function () {
    return {
      worksheets: !!(this._candidate && this._candidate.textDir !== null),
      rebuild: !!this._rebuildAvailable,
    };
  };

  HttpAdapter.prototype._url = function (relative) {
    return resolvePath(this._pathname, relative);
  };

  HttpAdapter.prototype._fetchQuiet = function (relative, init) {
    return this._fetch(this._url(relative), init).catch(function () { return null; });
  };

  // Try each candidate in order; the first whose `topologies.json` answers
  // `ok` AND a JSON content-type wins. Neither candidate answering (a served
  // origin with nothing built yet, or a plain file server with no mount at
  // all) is DISCONNECTED, not an error — chooseAdapter reads that as "fall
  // back to FSA", the same fallback a double-clicked page always had.
  HttpAdapter.prototype.init = async function () {
    for (var i = 0; i < CANDIDATES.length; i++) {
      var candidate = CANDIDATES[i];
      var res = await this._fetchQuiet(candidate.dataDir + "/topologies.json",
        { cache: "no-store" });
      if (res && res.ok) {
        var ct = (res.headers && typeof res.headers.get === "function"
          && res.headers.get("content-type")) || "";
        if (ct.toLowerCase().indexOf("json") !== -1) {
          this._candidate = candidate;
          this._state = VA.STATE.READY;
          await this._probeRebuild();
          return this._state;
        }
      }
    }
    this._state = VA.STATE.DISCONNECTED;
    return this._state;
  };

  // Same shape as the data-candidate probe above (ok + JSON content-type,
  // never status alone): a catch-all route answering 200 for anything would
  // otherwise read as "the rebuild endpoint is live" when it is really the
  // sibling-data-mount's own SPA fallback. Absence (no mount, or the mount
  // exists but tolstack_mount_rebuild_endpoint hasn't shipped yet) is left as
  // `false`, the same "not here" reading every other absent-capability check
  // in this adapter uses.
  HttpAdapter.prototype._probeRebuild = async function () {
    this._rebuildAvailable = false;
    if (!this._candidate || !this._candidate.rebuildDir) return;
    var res = await this._fetchQuiet(this._candidate.rebuildDir + "/status",
      { cache: "no-store" });
    if (!res || !res.ok) return;
    var ct = (res.headers && typeof res.headers.get === "function"
      && res.headers.get("content-type")) || "";
    if (ct.toLowerCase().indexOf("json") === -1) return;
    this._rebuildAvailable = true;
  };

  // Neither is ever reachable from the UI (served mode never shows the
  // connect-folder banner, since a picked HttpAdapter is only ever already
  // READY), but the contract requires them and re-probing is the honest
  // answer for what either would mean.
  HttpAdapter.prototype.connect = function () { return this.init(); };
  HttpAdapter.prototype.reconnect = HttpAdapter.prototype.connect;

  HttpAdapter.prototype.readResults = function () { return this._readProjection("results.json"); };
  HttpAdapter.prototype.readCrops = function () { return this._readProjection("crops.json"); };
  HttpAdapter.prototype.readTopologies = function () { return this._readProjection("topologies.json"); };

  // 404 is the ordinary "not built yet" answer, same as every other adapter's
  // reading of a missing file. Anything else — a network failure, a 5xx, a
  // non-ok response from a server that has gone away mid-session — is a REAL
  // transport failure and must reach the caller as a rejection: collapsing it
  // into the same "absent" null is exactly the silently-empty-page bug
  // viewer_error_surface_and_layout's render() seam exists to catch, one
  // layer further down, at the read that feeds it.
  HttpAdapter.prototype._readProjection = async function (name) {
    VA.requireReady(this);
    var res = await this._fetch(this._url(this._candidate.dataDir + "/" + name),
      { cache: "no-store" });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("GET " + name + " failed: " + res.status);
    return VA.parseJson(await res.text());
  };

  // A HEAD is enough proof of presence — this adapter never decodes pixels,
  // same reasoning as the node-fs adapter's own readCropImage. Absence (a
  // stale crops.json naming a PNG that is gone) is null, never a throw,
  // matching every other adapter.
  HttpAdapter.prototype.readCropImage = async function (relPath) {
    VA.requireReady(this);
    var rel = this._candidate.dataDir + "/" + String(relPath);
    var res = await this._fetchQuiet(rel, { method: "HEAD", cache: "no-store" });
    if (!res || !res.ok) return null;
    return { url: this._url(rel), name: String(relPath).split("/").pop() };
  };

  // Absence — including "this mount cannot reach docs/ at all" — is never a
  // throw: views/worksheet.js already has an honest sentence for "the
  // projection names this worksheet but it could not be read", and that
  // sentence covers both a missing file and an unreachable mount alike.
  HttpAdapter.prototype.readText = async function (segments) {
    VA.requireReady(this);
    if (!this._candidate || this._candidate.textDir === null) return null;
    var res = await this._fetchQuiet(
      this._candidate.textDir + "/" + segments.join("/"), { cache: "no-store" });
    if (!res || !res.ok) return null;
    return res.text();
  };

  // Both rebuild methods require the capability the caller already checked
  // (`capabilities().rebuild`) — never called speculatively, so an unready
  // candidate here is a caller bug, not a transport state to swallow quietly.
  //
  // POST kicks off tolstack_mount_rebuild_endpoint's single-flight runner;
  // GET status is the same payload, polled. Both resolve the parsed JSON
  // status object (whatever shape the endpoint answers — this adapter reads
  // only `busy`/`state` off it, topology_app.js's own poll loop) and both
  // THROW on a non-ok response: a rebuild failing to even start is a real
  // transport failure, not "not built yet", so it must reach the caller as a
  // rejection the same way _readProjection's non-404 failures do.
  HttpAdapter.prototype.requestRebuild = async function () {
    VA.requireReady(this);
    var res = await this._fetch(this._url(this._candidate.rebuildDir),
      { method: "POST", cache: "no-store" });
    if (!res.ok) throw new Error("rebuild request failed: " + res.status);
    return VA.parseJson(await res.text());
  };

  HttpAdapter.prototype.readRebuildStatus = async function () {
    VA.requireReady(this);
    var res = await this._fetch(this._url(this._candidate.rebuildDir + "/status"),
      { cache: "no-store" });
    if (!res.ok) throw new Error("rebuild status failed: " + res.status);
    return VA.parseJson(await res.text());
  };

  VA.HttpAdapter = HttpAdapter;
  // Exposed so the node test tier can assert on the exact candidate list
  // rather than duplicating it, and so a future third mount shape has one
  // place to add itself.
  VA.HTTP_CANDIDATES = CANDIDATES;
})(window.ViewerApp = window.ViewerApp || {});
