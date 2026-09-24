// GENERATED FILE -- DO NOT EDIT BY HAND.
//
// Every word below is read out of the Python definition named above it by
// scripts/js_vocabulary.py and rendered here by scripts/generate_js_vocabulary.py.
// Both apps read their vocabularies from this module; neither holds a copy of
// one. Twenty-six hand copies and three pairing test modules were retired for
// it on 2026-09-23 -- scripts/js_vocabulary.py's docstring is the argument.
//
// To change a word: change the PYTHON definition, then regenerate. The
// generation step is the first one scripts/rebuild_projections.ps1 runs.
// tests/test_js_vocabulary_is_generated.py regenerates and compares, so a
// Python edit nobody regenerated and a hand edit to this file are the same
// red test.
(function (root) {
  "use strict";

  // The runtime below is the generator's fixed template, not content. It lives
  // in the generated file rather than in a hand-written sibling so that each
  // page needs ONE extra <script> tag; edit it in scripts/generate_js_vocabulary.py.
  function namespace(app, words) {
    Object.keys(words).forEach(function (name) {
      Object.freeze(words[name]);
    });
    Object.freeze(words);

    function list(name) {
      if (!Object.prototype.hasOwnProperty.call(words, name)) {
        throw new Error("vocab: the generated module has no " + app + " " +
          "vocabulary named " + JSON.stringify(name) + ". It carries: " +
          Object.keys(words).join(", ") + ".");
      }
      return words[name];
    }

    // A rendered table, keyed by a generated vocabulary. The per-value copy --
    // the sentence a reader sees, the "what would close it" line -- stays
    // hand-authored in the app and is this function's second argument; the KEY
    // SET is the vocabulary's, compared here. So a value Python can emit that
    // the page has no branch for, and a branch for a value Python cannot emit,
    // both throw AT LOAD, before anything renders -- which is what the old
    // set-pairing tests could only say after the fact, and what no test could
    // say at all about a key attached from outside the literal.
    //
    // The returned table is frozen: adding a key later (`VA.GAP_KINDS.x = {}`,
    // `Object.assign(VA.GAP_KINDS, ...)`) throws in strict mode, which every
    // app file is. That was the one hole the retired scanner documented and
    // could not close.
    function table(name, entries) {
      var expected = list(name);
      var missing = expected.filter(function (word) {
        return !Object.prototype.hasOwnProperty.call(entries, word);
      });
      var extra = Object.keys(entries).filter(function (key) {
        return expected.indexOf(key) === -1;
      });
      if (missing.length || extra.length) {
        throw new Error("vocab: the " + app + " table for " + name +
          " has drifted from the generated vocabulary." +
          (missing.length ? " No entry for: " + missing.join(", ") + "." : "") +
          (extra.length ? " Entry for a word Python cannot emit: " +
            extra.join(", ") + "." : "") +
          " The words come from the Python definition named beside " + name +
          " in apps/viewer/vocab.gen.js; teach the table the value, or delete the branch.");
      }
      return Object.freeze(entries);
    }

    return { WORDS: words, list: list, table: table };
  }

  root.viewer = namespace("viewer", {
    // scripts/build_viewer_projection.py: PROJECTION_CONFIDENCES
    // (tolerance_stack/stack.py: CONFIDENCES, ranked, plus the synthesised
    // NO_SOURCE_REF)
    CONFIDENCES: ["traced", "inferred", "untraced", "no_source_ref"],

    // scripts/build_topology_projection.py: UNVERIFIED_CONFIDENCES
    UNVERIFIED_CONFIDENCES: ["untraced", "no_source_ref"],

    // scripts/build_viewer_projection.py and
    // scripts/build_topology_projection.py: the `how` each worksheet_for
    // returns (None spelled `null`, which is what the projection JSON carries
    // and what a JS property key coerces to)
    WORKSHEET_SOURCES: ["by_name", "declared", "null"],

    // tolerance_stack/stack.py: VERDICTS
    VERDICTS: ["pass", "marginal", "fail"],

    // tolerance_stack/stack.py: VERDICT_SCOPES
    VERDICT_SCOPES: ["joint", "budget"],

    // tolerance_stack/stack.py: EXPORT_STATUSES
    EXPORT_STATUSES: ["established", "unestablished"],

    // scripts/build_viewer_projection.py: what identity_rule_of_ref returns
    IDENTITY_RULES: ["spec_pile_filename"],

    // tolerance_stack/thermal.py: the values_status check in
    // MaterialEntry.__post_init__
    VALUES_STATUSES: ["inline", "library", "not_transcribed"],

    // scripts/build_viewer_crops.py: the `resolved_by` literals in
    // resolve_pdf
    CROP_RULES: ["joint_export_run", "source_ref_export", "spec_pile"],

    // scripts/build_viewer_crops.py: the `located_by` literals in locate()
    CROP_PLACEMENTS: [
      "balloon_view", "callout_text", "declared_region", "page_context",
      "sheet_full", "zone_cell"
    ],

    // scripts/build_viewer_crops.py: HIGHLIGHT_KINDS
    CROP_HIGHLIGHT_KINDS: ["verified_match", "declared_region"],

    // scripts/build_topology_projection.py: ROW_KINDS
    TOPO_ROW_KINDS: ["node", "edge"],

    // scripts/build_topology_projection.py: LINK_KINDS
    TOPO_LINK_KINDS: ["branch", "close"],

    // scripts/build_topology_projection.py: STUDY_STATUSES
    STUDY_STATUSES: ["ok", "error"],

    // scripts/build_topology_projection.py: MESH_FACT_FIELDS
    MESH_FACT_FIELDS: ["installed", "part_id"],

    // scripts/build_topology_projection.py: VALUE_SOURCES
    VALUE_SOURCES: ["inline", "stack_ref", "derived"],

    // scripts/build_topology_projection.py: TOPOLOGY_GAP_KINDS
    GAP_KINDS: [
      "excluded_from_model", "hardware_entry", "unverified_value",
      "no_tolerance_recorded"
    ],

    // tolerance_stack/topology.py: NODE_KINDS
    NODE_KINDS: ["mating_surface", "datum_feature"],

    // tolerance_stack/topology.py: EDGE_KINDS
    EDGE_KINDS: ["structural", "gap"],

    // tolerance_stack/topology.py: TRANSFORM_KINDS
    TRANSFORM_KINDS: ["identity", "ratio", "linear_to_rotary"],

    // tolerance_stack/topology.py: the StudyError subclasses
    STUDY_ERRORS: [
      "BranchAmbiguity", "BrokenChain", "CycleDetected", "UnitMismatch"
    ],
  });

  root.annotate = namespace("annotate", {
    // tolerance_stack/feature_identity.py: STACK_KEY_KINDS
    STACK_KEY_KINDS: ["topology_edge", "stack_element"],

    // tolerance_stack/feature_identity.py: VERDICTS
    VERDICTS: ["bound", "owner_not_in_set"],

    // tolerance_stack/feature_identity.py: DIRECTIONS
    DIRECTIONS: ["from", "to"],

    // tolerance_stack/feature_identity.py: PATH_KINDS
    PATH_KINDS: ["direct", "hypothesis"],

    // tolerance_stack/feature_identity.py: GDT_MODIFIERS
    GDT_MODIFIERS: ["M", "L"],
  });
})(window.TolstackVocab = window.TolstackVocab || {});
