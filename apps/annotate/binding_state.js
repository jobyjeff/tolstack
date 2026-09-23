// Pure logic: stack-side keys, binding state derivation, and event
// construction. NO DOM, no fetch, no three.js -- this is the one file in the
// app a test can load without a browser, and app.js/scene.js are kept thin
// specifically so the interesting logic lives here instead of spread across
// DOM event handlers.
//
// The vocabularies below are a HAND-COPY of tolerance_stack/feature_identity.py's
// module-level constants (STACK_KEY_KINDS, VERDICTS, DIRECTIONS, PATH_KINDS,
// GDT_MODIFIERS) -- this repo's most-repeated defect is exactly this kind of
// drift (ARCHITECTURE.md, "A field vocabulary is a module-level constant").
// tests/test_annotate_js_vocabulary.py pairs all five against their Python
// definitions (the apps/viewer/tests/test_js_python_vocabulary.py shape,
// generalised to a second app's namespace) -- a value added to one side with
// no matching literal on the other fails there, not silently here.
(function (AA) {
  "use strict";

  AA.STACK_KEY_KINDS = ["topology_edge", "stack_element"];
  AA.VERDICTS = ["bound", "owner_not_in_set"];
  AA.DIRECTIONS = ["from", "to"];
  AA.PATH_KINDS = ["direct", "hypothesis"];
  AA.GDT_MODIFIERS = ["M", "L"];

  // The COARSE state a list row shows. "unbound" is never written by the
  // fold (tolerance_stack.feature_identity.StackKeyBindings.state has no
  // such value) -- it is what this function returns when no record exists
  // at all, the same "absence is the consumer's to notice" posture the
  // Python side documents.
  AA.BINDING_STATES = Object.freeze({
    BOUND: "bound",
    UNBOUND: "unbound",
    OWNER_NOT_IN_SET: "owner_not_in_set",
    NEEDS_RECONFIRMATION: "needs_re_confirmation",
  });

  // What each coarse state MEANS, in everyday words, and which of them is an
  // alert a reader has to act on (flyout_resize_annotator_filter_and_deselect,
  // deliverable 5). Jeff: "Left side menu is now impressively 'loud'… roll all
  // the alert badges into one single alert badge (something like a triangle !
  // icon). Mouse over the icon has a popup that lists out the actual alerts."
  //
  // Until 2026-09-16 each row printed the raw state VALUE as its badge text --
  // `needs_re_confirmation`, a schema word with underscores, on the row. This
  // table is where the reader-facing sentence lives instead, keyed by
  // AA.BINDING_STATES so the two cannot drift: a state with no row here renders
  // no alert at all, and the fast tier pairs the key sets so adding a state
  // without deciding whether it is an alert fails there.
  //
  // `bound` is deliberately absent rather than present-and-quiet: a row with
  // nothing wrong shows NOTHING (the standing rule), so "is this an alert?" and
  // "what does it say?" are one question with one answer.
  AA.BINDING_STATE_ALERTS = Object.freeze({
    unbound: "No face is bound to this element yet.",
    owner_not_in_set: "Recorded as belonging to a part that is not in this set, " +
      "so no face here can stand for it.",
    needs_re_confirmation: "The mesh behind this binding changed — someone has " +
      "to look at the face again before the binding can be trusted.",
  });

  // The mark the rail's consolidated badge wears (Jeff: "something like a
  // triangle ! icon"), and it is the SIBLING APP'S -- one definition of the
  // mark for both surfaces. Jeff, 2026-09-21, on this badge beside the
  // viewer's: "same purpose, just in a different place."
  //
  // It was `AA.ALERT_ICON = "\u26A0"` until 2026-09-22, set straight onto
  // `badge.textContent` in app.js
  // (ISSUE_20260922_the_alert_glyph_is_still_a_character_on_two_rails). A
  // character is sized by `font-size`, whose steps tests/test_app_type_scale.py
  // owns, and U+26A0 renders as a colour emoji on Windows as often as not --
  // which overrules the one thing the mark exists to say. So it is drawn now,
  // and drawn ONCE: apps/viewer/warning_icon.js, loaded by this app's
  // index.html as a sibling exactly the way storage/adapter.js's transport
  // decision is.
  //
  // Reached through here rather than from app.js, and that is the rule this
  // app already follows for the other shared thing it uses (see
  // storage/adapter.js's AA.chooseTransport): a renderer does not reach across
  // into the viewer's namespace, and when the sibling file did not load the
  // failure says which file and why rather than `undefined is not a function`.
  AA.warningIcon = function (className) {
    var viewer = window.ViewerApp;
    if (!viewer || !viewer.warningIcon) {
      throw new Error(
        "the shared alert mark did not load: this app is served beside " +
        "apps/viewer/ (its index.html loads ../viewer/warning_icon.js), so " +
        "serve the apps/ directory, not apps/annotate/ alone"
      );
    }
    return viewer.warningIcon(className);
  };

  // The alerts ONE row has to admit about itself, as a list, because the badge
  // that shows them is one badge however many there are. A coarse state is
  // single-valued today, so this returns zero or one; it is a list anyway
  // because the badge's contract ("lists out the actual alerts") is the plural
  // one, and a second carrier added later must not need a new badge.
  AA.elementAlerts = function (bindingState) {
    var text = AA.BINDING_STATE_ALERTS[bindingState];
    return text ? [{ state: bindingState, text: text }] : [];
  };

  AA.topologyEdgeKey = function (topologyId, edgeId) {
    return { kind: "topology_edge", topology_id: topologyId, edge_id: edgeId };
  };

  AA.stackElementKey = function (stackId, elementId) {
    return { kind: "stack_element", stack_id: stackId, element_id: elementId };
  };

  function stackKeyEquals(a, b) {
    if (!a || !b || a.kind !== b.kind) return false;
    if (a.kind === "topology_edge") {
      return a.topology_id === b.topology_id && a.edge_id === b.edge_id;
    }
    return a.stack_id === b.stack_id && a.element_id === b.element_id;
  }
  AA.stackKeyEquals = stackKeyEquals;

  // `identityProjection` is data/projections/feature-identity/bindings.json,
  // parsed -- its `stack_keys` array, one entry per StackKeyBindings.as_dict().
  AA.findBindingRecord = function (identityProjection, key) {
    if (!identityProjection || !identityProjection.stack_keys) return null;
    for (var i = 0; i < identityProjection.stack_keys.length; i++) {
      var row = identityProjection.stack_keys[i];
      if (stackKeyEquals(row.stack_key, key)) return row;
    }
    return null;
  };

  // `staleness` is an optional {event_id: "confirmed"|"needs_re_confirmation"}
  // map -- tolerance_stack.feature_identity.revalidate_projection's output,
  // if the caller has one loaded (a projection rebuild that named a
  // --mesh-replacements file). Absent staleness info means "nothing known to
  // have changed", which reads as plain `bound`, never a guessed confirmation.
  AA.elementBindingState = function (record, staleness) {
    if (!record) return AA.BINDING_STATES.UNBOUND;
    if (!record.bindings || record.bindings.length === 0) {
      return AA.BINDING_STATES.OWNER_NOT_IN_SET;
    }
    if (staleness) {
      for (var i = 0; i < record.bindings.length; i++) {
        var eventId = record.bindings[i].event_id;
        if (staleness[eventId] === "needs_re_confirmation") {
          return AA.BINDING_STATES.NEEDS_RECONFIRMATION;
        }
      }
    }
    return AA.BINDING_STATES.BOUND;
  };

  // --- event construction ---------------------------------------------------
  // Mirrors tolerance_stack.feature_identity.FeatureIdentityEvent.as_dict()
  // field for field, so a file this app writes round-trips through
  // FeatureIdentityEvent.from_dict() with no translation step. Validates the
  // same invariants __post_init__ does, on the fields a UI can get wrong
  // before a write ever reaches disk -- defense in depth, not a replacement
  // for the Python-side check the projection rebuild still runs.

  function requireOneOf(name, value, vocabulary) {
    if (vocabulary.indexOf(value) === -1) {
      throw new Error(name + " must be one of " + vocabulary.join(", ") + ", got " + JSON.stringify(value));
    }
  }

  AA.buildBoundEvent = function (fields) {
    requireOneOf("direction", fields.direction, AA.DIRECTIONS);
    if (!fields.geometryKey) throw new Error("a bound event requires a geometryKey");
    if (fields.gdtModifier != null) requireOneOf("gdt_modifier", fields.gdtModifier, AA.GDT_MODIFIERS);
    if (fields.ownerPath) requireOneOf("owner_path.kind", fields.ownerPath.kind, AA.PATH_KINDS);

    var event = {
      schema: "joby.tolerance_stack/feature-identity/v0",
      event_id: fields.eventId,
      seq: fields.seq,
      created_at: fields.createdAt,
      recorded_by: fields.recordedBy,
      stack_key: fields.stackKey,
      verdict: "bound",
      geometry_key: {
        source_step_sha256: fields.geometryKey.sourceStepSha256,
        face_id: fields.geometryKey.faceId,
        area_native2: fields.geometryKey.areaNative2,
        centroid_native: fields.geometryKey.centroidNative,
      },
      direction: fields.direction,
    };
    if (fields.compositionNote) event.composition_note = fields.compositionNote;
    if (fields.ownerPart) event.owner_part = fields.ownerPart;
    if (fields.ownerPath) {
      event.owner_path = { kind: fields.ownerPath.kind };
      if (fields.ownerPath.via) event.owner_path.via = fields.ownerPath.via;
      if (fields.ownerPath.note) event.owner_path.note = fields.ownerPath.note;
    }
    if (fields.gdtModifier) event.gdt_modifier = fields.gdtModifier;
    if (fields.generalTolRegime) event.general_tol_regime = fields.generalTolRegime;
    if (fields.note) event.note = fields.note;
    return event;
  };

  AA.buildOwnerNotInSetEvent = function (fields) {
    var event = {
      schema: "joby.tolerance_stack/feature-identity/v0",
      event_id: fields.eventId,
      seq: fields.seq,
      created_at: fields.createdAt,
      recorded_by: fields.recordedBy,
      stack_key: fields.stackKey,
      verdict: "owner_not_in_set",
    };
    if (fields.note) event.note = fields.note;
    return event;
  };

  // "<NNNN>_<slug>.json", the same convention docs/spec_library/events/ and
  // data/inbox/feature-identity/README.md both name. `existingFilenames` is
  // whatever the app has already listed from the events directory (or
  // written this session) -- the next number is one past the highest seen,
  // never reused, so two sessions racing each other collide on a filename
  // (and therefore fail loudly at write time) rather than silently
  // overwriting different events under the same number.
  AA.nextEventFilename = function (existingFilenames, slug) {
    var max = 0;
    (existingFilenames || []).forEach(function (name) {
      var m = /^(\d{4})_/.exec(name);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    var n = String(max + 1).padStart(4, "0");
    return n + "_" + slug + ".json";
  };
})(window.AnnotateApp = window.AnnotateApp || {});
