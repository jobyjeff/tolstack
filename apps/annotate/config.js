// Annotate config (v0: edit this file by hand -- apps/viewer/config.js's
// precedent, for the same reason: the app runs from a static server (never
// file://, see storage/fsa.js's module docstring), and a hand-edited classic
// script needs no build step to change.
(function (AA) {
  "use strict";
  AA.CONFIG = {
    topologiesDir: ["docs", "topologies"],
    meshesDir: ["data", "meshes"],
    // The tracked topology-part -> mesh part_id alias table (handoff
    // mesh_part_alias_table) -- the one sanctioned bridge between the
    // topology `part` vocabulary and mesh provenance `part_id`s.
    partMeshAliases: ["docs", "topologies", "part_mesh_aliases.json"],
    // The topology PROJECTION, not the raw topology file: it already carries
    // every edge's resolved citation confidence (dimension_ref resolved out
    // of the stack file at build time by scripts/build_topology_projection.py)
    // -- reading it here means this app never re-implements that resolution
    // in JS, the same reason apps/viewer reads projections instead of authored
    // files.
    topologyProjection: ["data", "projections", "viewer", "topologies.json"],
    featureIdentityEventsDir: ["data", "inbox", "feature-identity"],
    featureIdentityProjection: ["data", "projections", "feature-identity", "bindings.json"],

    // There is deliberately NO `rebuild` entry here. It held the two build
    // commands as strings, one of which the "no projection" banner rendered
    // for the reader to copy -- the shape ruled out for every web surface in
    // this workspace (ISSUE_20260915_annotate_banner_renders_a_terminal_
    // command_for_the_user_to_copy). The other was never read by anything.
    // Nothing on this page can run a command, so this app holds none: see
    // AA.NO_PROJECTION_NOTICE in storage/adapter.js for what it says instead,
    // and run_tests.cjs for the check that keeps them from coming back.
  };
})(window.AnnotateApp = window.AnnotateApp || {});
