// Annotate config (v0: edit this file by hand -- apps/viewer/config.js's
// precedent, for the same reason: the app runs from a static server (never
// file://, see storage/fsa.js's module docstring), and a hand-edited classic
// script needs no build step to change.
(function (AA) {
  "use strict";
  AA.CONFIG = {
    // Who answers on this machine: every event this app writes is recorded
    // as "annotate-app:<reviewer>" (AA.humanActor), so a binding says which
    // person made it and an agent's proposal can be told apart from a
    // human's accept. Hand-edit it for another reviewer.
    reviewer: "jeff",
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
    // Part number -> everyday name (handoff the_annotator_rail_resizes_and_
    // names_what_it_lists), built by scripts/build_part_names_projection.py.
    // Absent is fine: a part row then shows its number alone.
    partNamesProjection: ["data", "projections", "parts", "names.json"],
    // linkage's published sweep runs (handoff kinematic_sweep_animation).
    // READ-ONLY from here, and append-only in the repo: the `linkage` solver
    // repo writes these and nothing in this app may add to, rename or tidy
    // the directory. One `<run-id>.json` per run.
    linkageSweepsDir: ["data", "inbox", "linkage-sweeps"],
    // The kinematic studies' projection -- the file the viewer's kinematic
    // page renders (scripts/build_kinematic_projection.py). Sweep mode reads
    // one study's ranked contributor rows out of it when it was opened from
    // that study. Absent is fine: the rail's contributor group is then absent.
    // tests/test_kinematic.py pairs this line with the builder's constants.
    kinematicProjection: ["data", "projections", "viewer", "kinematic", "kinematic_studies.json"],
    // What a page reading over HTTP reads instead of walking a folder (handoff
    // the_scene_pane_is_one_flyout_that_reads_over_http): the directory a
    // served mount publishes, and under it the read set the kinematic builder
    // writes -- an index (meshes, aliases, part names, runs) and each run byte
    // for byte. storage/http.js reads them relative to `servedDataDir`.
    // tests/test_kinematic.py pairs these lines with the builder's constants.
    servedDataDir: ["data", "projections", "viewer"],
    annotateReadSet: ["data", "projections", "viewer", "kinematic", "annotate.json"],
    annotateSweepsDir: ["data", "projections", "viewer", "kinematic", "sweeps"],
    featureIdentityEventsDir: ["data", "inbox", "feature-identity"],
    featureIdentityProjection: ["data", "projections", "feature-identity", "bindings.json"],
    // Which faces could be each gap edge's interface (handoff
    // an_interface_suggests_the_faces_that_touch), built by
    // scripts/build_contact_suggestions.py. A folder grant reads it here; over
    // HTTP it comes in the read set, which copies it. Absent is fine: the bar
    // then lists no touching faces. tests/test_kinematic.py pairs this line.
    contactSuggestions: ["data", "projections", "feature-identity", "contact_suggestions.json"],

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
