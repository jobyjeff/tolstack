// The storage-adapter contract -- apps/viewer/storage/adapter.js's precedent,
// with one deliberate difference: this app WRITES. Every event file this app
// produces goes through `writeFeatureIdentityEvent`, never a direct FSA call
// from app.js or scene.js, so there is exactly one place a write happens and
// exactly one place `canWrite()` has to be honest.
//
// Connection states -- same three as the viewer's:
//   "disconnected"  -- no directory handle; user must connect() (picker).
//   "needs-regrant" -- a persisted handle exists but permission is "prompt";
//                      reconnect() re-grants it (must run from a click handler).
//   "ready"         -- connected and permitted; reads work.
//
// Contract (every adapter implements these):
//   getState(): "disconnected" | "needs-regrant" | "ready"
//   init(): Promise<state>
//   connect(): Promise<state>
//   reconnect(): Promise<state>
//   canWrite(): bool
//        -- true only when this transport can actually create a file under
//           data/inbox/feature-identity/. A `file://` page cannot (fetch() of
//           local binaries is CORS-blocked, per the step_tessellation spike's
//           own finding, and there is no write API at all without FSA) --
//           the app's write controls must be HIDDEN, not disabled-and-silent,
//           when this is false. See index.html's binding panel.
//   readTopologyProjection(): Promise<object|null>
//        -- data/projections/viewer/topologies.json. null if absent.
//   readFeatureIdentityProjection(): Promise<object|null>
//        -- data/projections/feature-identity/bindings.json. null if absent
//           (nobody has rebuilt it, or nothing has ever been bound).
//   listMeshes(): Promise<Array<{sha256, label, part_id}>>
//        -- every data/meshes/<sha256>/ subdirectory that has a
//           provenance.json, read for its human label. This is how the app
//           offers a part picker with no hand-maintained catalog file to go
//           stale against data/meshes/'s own contents.
//   readMeshManifest(sha256): Promise<object|null>
//        -- data/meshes/<sha256>/manifest.json.
//   readMeshBuffer(sha256, filename): Promise<ArrayBuffer|null>
//        -- data/meshes/<sha256>/<filename> (positions.f32 / indices.u32 /
//           face_ids.u32), as raw bytes for a typed-array view.
//   writeFeatureIdentityEvent(filename, eventObject): Promise<void>
//        -- data/inbox/feature-identity/<filename>, JSON.stringify'd. Throws
//           if canWrite() is false or the file already exists (append-only:
//           a write must never overwrite a prior event).
(function (AA) {
  "use strict";

  AA.STATE = Object.freeze({
    DISCONNECTED: "disconnected",
    NEEDS_REGRANT: "needs-regrant",
    READY: "ready",
  });

  AA.NotReadyError = function (state) {
    var e = new Error("storage not ready (state: " + state + ")");
    e.name = "NotReadyError";
    e.state = state;
    return e;
  };

  AA.requireReady = function (adapter) {
    if (adapter.getState() !== AA.STATE.READY) {
      throw AA.NotReadyError(adapter.getState());
    }
  };

  AA.parseJson = function (text) {
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (_) {
      return null;
    }
  };
})(window.AnnotateApp = window.AnnotateApp || {});
