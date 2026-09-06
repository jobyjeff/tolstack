// Annotate config (v0: edit this file by hand -- apps/viewer/config.js's
// precedent, for the same reason: the app runs from a static server (never
// file://, see storage/fsa.js's module docstring), and a hand-edited classic
// script needs no build step to change.
(function (AA) {
  "use strict";
  AA.CONFIG = {
    topologiesDir: ["docs", "topologies"],
    meshesDir: ["data", "meshes"],
    // The topology PROJECTION, not the raw topology file: it already carries
    // every edge's resolved citation confidence (dimension_ref resolved out
    // of the stack file at build time by scripts/build_topology_projection.py)
    // -- reading it here means this app never re-implements that resolution
    // in JS, the same reason apps/viewer reads projections instead of authored
    // files.
    topologyProjection: ["data", "projections", "viewer", "topologies.json"],
    featureIdentityEventsDir: ["data", "inbox", "feature-identity"],
    featureIdentityProjection: ["data", "projections", "feature-identity", "bindings.json"],

    rebuild: {
      topologies: "venv-win\\Scripts\\python.exe scripts\\build_topology_projection.py",
      bindings: "venv-win\\Scripts\\python.exe scripts\\build_feature_identity_projection.py",
    },
  };
})(window.AnnotateApp = window.AnnotateApp || {});
