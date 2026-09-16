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
//   readPartMeshAliases(): Promise<object|null>
//        -- docs/topologies/part_mesh_aliases.json, the tracked topology-part
//           -> mesh part_id alias table. null if absent (an empty or missing
//           table just means no aliases resolve -- never an error).
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

  // --- which transport this page boots on -----------------------------------
  //
  // NOT a second decision procedure: apps/viewer/storage/adapter.js's
  // `chooseTransport` owns it for the whole app family, and index.html loads
  // that file as a sibling so this one can call it (handoff
  // surfaces_that_state_something_false, applying viewer_transport_honest_
  // hosted's posture here).
  //
  // Annotate hands it `http: null` -- it has no HTTP read transport at all
  // (ISSUE_20260910_annotate_has_no_http_read_transport), so the whole of the
  // decision here is *is this page local to the reader?*: a loopback server
  // gets the picker, a hosted origin gets AA.HOSTED_NOTICE and no control.
  // The hostname IS passed, unlike the viewer's page: this app has no file://
  // story at all (File System Access and a mesh-binary fetch both need a real
  // origin -- see storage/fsa.js and the README's "Run it"), so a loopback
  // server is its ONLY legitimate local page, and the protocol alone would
  // leave it with no way in on any origin.
  AA.chooseTransport = function (opts) {
    opts = opts || {};
    var viewer = window.ViewerApp;
    if (!viewer || !viewer.chooseTransport) {
      throw new Error(
        "the shared transport decision did not load: this app is served " +
        "beside apps/viewer/ (its index.html loads ../viewer/storage/" +
        "adapter.js), so serve the apps/ directory, not apps/annotate/ alone"
      );
    }
    return viewer.chooseTransport({
      protocol: opts.protocol,
      hostname: opts.hostname,
      http: null,
      fsa: opts.fsa,
    });
  };

  // Did that decision come back "hosted, so no transport at all"? The word is
  // read out of the shared frozen vocabulary (VA.TRANSPORT.UNPUBLISHED), never
  // re-spelled here, and it is read in exactly this one place so app.js does
  // not reach across into the viewer's namespace to ask.
  AA.isHosted = function (picked) {
    return !!picked && picked.kind === window.ViewerApp.TRANSPORT.UNPUBLISHED;
  };

  // What a HOSTED annotate page says instead of offering **Connect folder**.
  //
  // It states this app's own fact, not the viewer's ("the data is not
  // published on this site yet"), and deliberately so: the viewer's sentence
  // goes stale the moment drawing-checker bakes the projections, whereas this
  // one stays true either way, because what a hosted visitor cannot do is
  // WRITE. No control, no path, no command -- a reader off-machine has no
  // move here, and inventing one for them is the defect this replaces.
  AA.HOSTED_NOTICE =
    "Annotating is not available on this site — it records what it learns by " +
    "writing into the tolerance-stack repository, which only a copy of that " +
    "repository on your own machine can do.";

  // What the banner says when the connected folder holds no topology
  // projection -- this app's most likely first-run condition on a machine that
  // has never built one, and it should never look like a bug.
  //
  // PLAIN WORDS, and deliberately nothing to paste. It used to read "No
  // topology projection found. Build it: " with the build command
  // concatenated on, which put an interpreter and a backslash path on screen
  // for the reader to copy (ISSUE_20260915_annotate_banner_renders_a_terminal_
  // command_for_the_user_to_copy; apps/viewer/views/banner.js's docstring
  // records the 2026-09-10 sighting that made this a standing rule across
  // every web surface in the workspace). A BUTTON would be better still and
  // is not available: this app has no transport that could ask anything to
  // rebuild anything (ISSUE_20260910_annotate_has_no_http_read_transport), so
  // the honest interim is to say where the work happens and stop.
  //
  // It lives here, beside AA.HOSTED_NOTICE, because both are sentences this
  // app says INSTEAD of offering a way forward, and because app.js cannot be
  // loaded by the fast tier (ES module, document, WebGL) -- a constant is
  // what lets run_tests.cjs assert on the copy at all.
  AA.NO_PROJECTION_NOTICE =
    "No topology projection in the connected folder. It is built in the " +
    "tolerance-stack repository, not from this page.";

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
