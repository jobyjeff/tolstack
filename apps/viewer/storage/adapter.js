// The storage-adapter contract — the load-bearing seam of the viewer.
//
// ALL filesystem/IO goes through an adapter; the views NEVER touch the File
// System Access API (or any transport) directly. Modelled on forge
// apps/notes/storage/adapter.js, with one deliberate difference: **every method
// here reads.** tolstack's viewer is a review surface over authored artifacts
// and derived projections; it writes nothing, so the FSA adapter asks for
// `mode: "read"` and there is no write path to get wrong.
//
// This file also owns the ONE decision above the contract: `chooseTransport`
// (and the `TRANSPORT` vocabulary the banner reads off it) -- which adapter a
// page gets, and what a page is told when none of them can serve it. It lives
// beside the contract rather than in a page's boot because the answer is a
// property of the PAGE'S ORIGIN, not of any one page.
//
// Connection states:
//   "disconnected"  — no directory handle; user must connect() (picker).
//   "needs-regrant" — a persisted handle exists but permission is "prompt";
//                     reconnect() re-grants it (must run from a click handler).
//   "ready"         — connected and permitted; reads work.
//
// Contract (every adapter implements these):
//   getState(): "disconnected" | "needs-regrant" | "ready"
//   init(): Promise<state>          — probe persisted handle, set initial state
//   connect(): Promise<state>       — show picker (user gesture)
//   reconnect(): Promise<state>     — re-grant persisted handle (user gesture)
//   readResults(): Promise<object|null>
//        — parsed data/projections/viewer/results.json, the fold projection
//          scripts/build_viewer_projection.py writes. null if absent: "not
//          built yet" is a state the banner explains, not an error.
//   readCrops(): Promise<object|null>
//        — parsed data/projections/viewer/crops.json. null if absent; the app
//          then shows every element's crop as "not built" rather than pretending
//          the citation failed to resolve. Those are different facts.
//   readTopologies(): Promise<object|null>
//        — parsed data/projections/viewer/topologies.json, the rail layout +
//          study folds scripts/build_topology_projection.py writes. Read by
//          apps/viewer/topology.html only; index.html never asks for it, and an
//          adapter returning null is the ordinary "not built yet" state.
//   readCropImage(relPath): Promise<{ url, name }|null>
//        — an object URL for data/projections/viewer/<relPath> (a crops/*.png).
//          null when the file is gone, e.g. a stale crops.json.
//   readText(segments): Promise<string|null>
//        — any repo-relative text file, given as path segments. Used for the
//          WORKSHEET_*.md files, which are read LIVE from docs/tolerance_stacks/
//          rather than copied into the projection: nothing about a worksheet is
//          derived, so an edit should show on reload without a rebuild.
//
// One method is OPTIONAL, and only storage/http.js implements it:
//   capabilities(): { worksheets: bool, rebuild: bool } | undefined
//        — what this transport can actually reach. A view must never assume
//          every adapter can service every read; the served mount that
//          drawing-checker exposes (storage/http.js's "sibling-data-mount"
//          candidate) genuinely cannot reach docs/, so readText() there always
//          resolves null and capabilities().worksheets says why before a view
//          offers a control it cannot service. An adapter with no
//          capabilities() method (fsa.js, memory.js, node_fs.js) is read as
//          fully capable — the same "absent means capable" default forge's own
//          two-transport apps use. `rebuild` (viewer_rebuild_affordance,
//          2026-09-10) is the same kind of fact, PROBED rather than assumed:
//          true only once storage/http.js has actually reached
//          tolstack_mount_rebuild_endpoint's status route.
//
// Two more methods exist ONLY when capabilities().rebuild is true (today,
// only storage/http.js can ever report it, and only over its sibling-data-
// mount candidate) — a caller must check the capability first, never call
// these speculatively:
//   requestRebuild(): Promise<object>   — POST the rebuild endpoint; resolves
//        the status payload it answers immediately (queued/running).
//   readRebuildStatus(): Promise<object>
//        — GET the same status the endpoint polls toward done/failed. Both
//          methods throw on a transport failure (a non-ok response) the same
//          way readResults()'s underlying read does for anything other than
//          "not built yet" — a rebuild that fails to even start is a real
//          failure, not an absence.
(function (VA) {
  "use strict";

  VA.STATE = Object.freeze({
    DISCONNECTED: "disconnected",
    NEEDS_REGRANT: "needs-regrant",
    READY: "ready",
  });

  VA.NotReadyError = function (state) {
    var e = new Error("storage not ready (state: " + state + ")");
    e.name = "NotReadyError";
    e.state = state;
    return e;
  };

  // Which transport the page actually got. A module-level vocabulary, never
  // inline literals: this word is spelled in three places (chooseTransport
  // below, topology_app.js's boot, views/banner.js), and a vocabulary
  // drifting between the files that read it is this repo's most-repeated
  // defect.
  VA.TRANSPORT = Object.freeze({
    MOCK: "mock",
    HTTP: "http",
    FSA: "fsa",
    // Not a transport at all -- the honest name for "this page came off a
    // server, and that server publishes no data". See chooseTransport.
    UNPUBLISHED: "unpublished",
  });

  // The one page a folder grant can legitimately be asked for.
  var FILE_PROTOCOL = "file:";

  // The hostnames on which an http(s) page can STILL legitimately ask for one.
  // A module-level vocabulary, never inline literals (repo rule).
  VA.LOCAL_HOSTNAMES = Object.freeze(["localhost", "127.0.0.1", "[::1]", "::1"]);

  // Is this page's reader plausibly holding the repo the picker would open?
  //
  // That -- not the protocol -- is the real question behind **Connect folder**,
  // and the two answers differ:
  //
  //   file://   -- they opened a file off their own disk. Nothing else can read
  //                the repo there, and the grant is the only transport.
  //   loopback  -- a server on their own machine: `ops.toml`'s serve verb, or
  //                drawing-checker's local mount (uvicorn on 127.0.0.1:8000,
  //                which is where /tolstack/annotate/ and /tolstack/viewer/
  //                live in dev). Same reader, same disk, one extra hop.
  //   any other -- a HOSTED visitor with no tolstack repo to grant. The picker
  //                cannot work for them no matter what they click, and it
  //                reads as "this page wants access to my files".
  //
  // `hostname` is the page's own (window.location.hostname). A caller that
  // omits it gets the STRICTEST answer -- only file:// is local -- so a page
  // never acquires a picker by accident. apps/viewer deliberately omits it and
  // apps/annotate deliberately passes it, because their legitimate LOCAL page
  // is not the same page: the viewer's is file:// (it is built to run by
  // double-click), and the annotator has no file:// story at all -- File
  // System Access and a mesh-binary fetch both need a real origin -- so its
  // only legitimate local page is a loopback server. (handoff
  // surfaces_that_state_something_false; whether the viewer should pass its
  // hostname too is ISSUE_20260915_viewer_says_unpublished_on_a_loopback_
  // origin_it_could_offer_a_picker_for.)
  VA.isLocalPage = function (protocol, hostname) {
    if (protocol === FILE_PROTOCOL) return true;
    return VA.LOCAL_HOSTNAMES.indexOf(String(hostname || "").toLowerCase()) !== -1;
  };

  // Which adapter a page boots on, decided in ONE place.
  //
  // Served is tried first wherever it is possible at all. The rule that
  // matters is what happens when it FAILS, and it turns on whether the page is
  // LOCAL to the reader (VA.isLocalPage above -- file://, or a loopback
  // origin the caller names):
  //
  //   local    -- FSA may be the only transport that can exist, and the picker
  //               is legitimate: the reader is sitting at the machine holding
  //               the repo.
  //   hosted   -- there is NO fallback. A hosted visitor has no tolstack repo
  //               to grant, so **Connect folder** is a control that cannot
  //               work for them no matter what they click -- and it reads as
  //               "this page wants access to my files", which is worse than
  //               useless. The honest answer is UNPUBLISHED: the caller says
  //               so in its own words, and offers nothing.
  //
  // (Verified at the wire 2026-09-14: every `/tolstack/...` URL on the hosted
  // origin answered 200 + the site index HTML -- the catch-all shape the
  // probe's content-type check exists to reject. It rejected it correctly;
  // what was wrong was the page falling through to a picker afterwards.)
  //
  // NOTHING about UNPUBLISHED is remembered -- no flag, no storage, no state
  // beyond the value returned here. A reload re-probes from scratch, so the
  // moment the origin starts serving the projections the same URL enters
  // served mode with no user action at all.
  //
  // `http`/`fsa` are the already-constructed candidates (null where the
  // context cannot support one) and `protocol`/`hostname` are the page's own,
  // so the whole decision is testable without a browser -- the node tier
  // drives it against real local servers. apps/annotate/ boots on this same
  // function with `http: null` (it has no HTTP read transport at all --
  // ISSUE_20260910_annotate_has_no_http_read_transport), which is what keeps
  // the two apps from growing two answers to one question.
  VA.chooseTransport = async function (opts) {
    opts = opts || {};
    if (opts.http) {
      var served = await opts.http.init().catch(function () { return null; });
      if (served === VA.STATE.READY) {
        return { adapter: opts.http, kind: VA.TRANSPORT.HTTP, state: served };
      }
    }
    if (!VA.isLocalPage(opts.protocol, opts.hostname)) {
      return {
        adapter: null,
        kind: VA.TRANSPORT.UNPUBLISHED,
        state: VA.STATE.DISCONNECTED,
      };
    }
    // A local page in a browser with no File System Access API: nothing can
    // read the repo, which is a real dead end and says so as an error.
    if (!opts.fsa) return { adapter: null, kind: null, state: null };
    var granted = await opts.fsa.init();
    return { adapter: opts.fsa, kind: VA.TRANSPORT.FSA, state: granted };
  };

  // Guard used by adapters before a read.
  VA.requireReady = function (adapter) {
    if (adapter.getState() !== VA.STATE.READY) {
      throw VA.NotReadyError(adapter.getState());
    }
  };

  // Parse a projection file, tolerating a partially-written one. A rebuild is
  // wipe-and-write, so a read landing mid-write must look like "absent" rather
  // than crashing the page.
  VA.parseJson = function (text) {
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (_) {
      return null;
    }
  };
})(window.ViewerApp = window.ViewerApp || {});
