// The storage-adapter contract — the load-bearing seam of the viewer.
//
// ALL filesystem/IO goes through an adapter; the views NEVER touch the File
// System Access API (or any transport) directly. Modelled on forge
// apps/notes/storage/adapter.js, with one deliberate difference: **every method
// here reads.** tolstack's viewer is a review surface over authored artifacts
// and derived projections; it writes nothing, so the FSA adapter asks for
// `mode: "read"` and there is no write path to get wrong.
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
//   readCropImage(relPath): Promise<{ url, name }|null>
//        — an object URL for data/projections/viewer/<relPath> (a crops/*.png).
//          null when the file is gone, e.g. a stale crops.json.
//   readText(segments): Promise<string|null>
//        — any repo-relative text file, given as path segments. Used for the
//          WORKSHEET_*.md files, which are read LIVE from docs/tolerance_stacks/
//          rather than copied into the projection: nothing about a worksheet is
//          derived, so an edit should show on reload without a rebuild.
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
