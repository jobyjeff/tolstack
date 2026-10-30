// Pure logic: stack-side keys, binding state derivation, and event
// construction. NO DOM, no fetch, no three.js -- this is the one file in the
// app a test can load without a browser, and app.js/scene.js are kept thin
// specifically so the interesting logic lives here instead of spread across
// DOM event handlers.
//
// The vocabularies below are tolerance_stack/feature_identity.py's
// module-level constants (STACK_KEY_KINDS, VERDICTS, DIRECTIONS, PATH_KINDS,
// GDT_MODIFIERS, PROPOSAL_CONFIDENCES, ACTOR_KINDS), read out of
// ../viewer/vocab.gen.js. They were hand copies
// until 2026-09-23, with a pytest module pairing each against its definition --
// this repo's most-repeated defect is exactly that kind of drift (CLAUDE.md,
// "A field vocabulary is a module-level constant"), so the copies are gone
// rather than checked. scripts/generate_js_vocabulary.py renders that module
// and tests/test_js_vocabulary_is_generated.py compares it, so a word added on
// the Python side with nobody regenerating is red there.
//
// It lives under apps/viewer/ rather than an apps/shared/ of its own -- the
// fourth file this app reads across that boundary, for the reason the other
// three are there (scripts/generate_js_vocabulary.py's docstring: the browser
// tier serves apps/viewer as a server root and 403s anything above it).
(function (AA, VOCAB) {
  "use strict";

  AA.STACK_KEY_KINDS = VOCAB.list("STACK_KEY_KINDS");
  AA.VERDICTS = VOCAB.list("VERDICTS");
  AA.DIRECTIONS = VOCAB.list("DIRECTIONS");
  AA.PATH_KINDS = VOCAB.list("PATH_KINDS");
  AA.GDT_MODIFIERS = VOCAB.list("GDT_MODIFIERS");

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
    // An agent proposed a face and nobody has answered yet (handoff
    // an_agent_proposes_a_face_binding_and_a_human_ratifies_it). Nothing is
    // bound: the fold keeps a proposal out of `bindings`.
    PROPOSED: "proposed",
  });

  AA.PROPOSAL_CONFIDENCES = VOCAB.list("PROPOSAL_CONFIDENCES");
  AA.ACTOR_KINDS = VOCAB.list("ACTOR_KINDS");

  // The states whose row carries NO alert, and why each is quiet. `bound`: a
  // row with nothing wrong shows nothing. `proposed`: the row's own line
  // ("suggested · high") already is the signal, and an agent's
  // proposal is a question waiting for its answer, not something wrong -- a
  // second mark beside the chip would spend the emphasis twice.
  AA.QUIET_BINDING_STATES = Object.freeze([AA.BINDING_STATES.BOUND, AA.BINDING_STATES.PROPOSED]);

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
  //
  // The precedence is the fold's (StackKeyBindings.state): bound, then
  // owner_not_in_set, then proposed -- and a record whose only events are
  // rejected proposals is unbound, exactly like no record at all.
  AA.elementBindingState = function (record, staleness) {
    if (!record) return AA.BINDING_STATES.UNBOUND;
    if (!record.bindings || record.bindings.length === 0) {
      if ((record.owner_not_in_set || []).length) return AA.BINDING_STATES.OWNER_NOT_IN_SET;
      if ((record.proposals || []).length) return AA.BINDING_STATES.PROPOSED;
      return AA.BINDING_STATES.UNBOUND;
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

  // The geometry key a pick binds, and the WHOLE of what a pick contributes
  // to an event: the part's sha256, the face id and that face's own manifest
  // record -- all part-local. Since 2026-10-14 a part is drawn at every
  // occurrence the assembly records, and a pick says which drawn occurrence
  // it landed on (`pick.occurrence`); that never reaches here, so a face
  // bound on the tangential link's third occurrence is the same binding a
  // pick on its first would have written, and the same one written before
  // parts were placed at all. `feature-identity/v0` is unchanged.
  AA.geometryKeyOfPick = function (pick) {
    return {
      sourceStepSha256: pick.sha256,
      faceId: pick.faceId,
      areaNative2: pick.record.area_native2,
      centroidNative: pick.record.centroid_native,
    };
  };

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
    // The earlier event on this same key that this one corrects. The fold
    // (tolerance_stack.feature_identity.build_projection) hides that event and
    // keeps it; nothing else about the schema changes.
    if (fields.supersedes) event.supersedes = fields.supersedes;
    // The agent's proposal this binding accepts (an Accept click).
    if (fields.ratifies) event.ratifies = fields.ratifies;
    return event;
  };

  // --- an agent's proposal, and a human's answer to it ------------------------
  //
  // scripts/propose_bindings.py writes the proposals; this app only ever
  // answers them. The fold never lets a proposal stand, so a proposal is drawn
  // apart (dashed, in the suggestion colour, a hollow anchor) and the scene's
  // anchors stay where they were until a human accepts.

  // Who a human is on an event: "annotate-app:<reviewer>". `reviewer` is
  // AA.CONFIG.reviewer, hand-edited like the rest of that file.
  AA.humanActor = function (reviewer) {
    var who = String(reviewer || "").trim();
    if (!who) throw new Error("no reviewer is configured (config.js), so this app cannot say who answered");
    return AA.ACTOR_KINDS[0] + ":" + who;
  };

  // The actor kind an event's `recorded_by` starts with, or null -- Python's
  // feature_identity.actor_kind.
  AA.actorKind = function (recordedBy) {
    var text = String(recordedBy || "");
    var cut = text.indexOf(":");
    if (cut === -1) return null;
    var head = text.slice(0, cut);
    return AA.ACTOR_KINDS.indexOf(head) === -1 ? null : head;
  };

  // Accept: the proposed face, at the proposed end, as an ordinary `bound`
  // event naming the proposal. `supersedes` only when that end already has a
  // binding the accept replaces.
  AA.buildAcceptEvent = function (proposal, fields) {
    if (!proposal || proposal.verdict !== "proposed") throw new Error("only a proposal can be accepted");
    if (AA.actorKind(fields.recordedBy) === AA.ACTOR_KINDS[1]) {
      throw new Error("an agent only proposes -- a human accepts");
    }
    var key = proposal.geometry_key;
    return AA.buildBoundEvent({
      eventId: fields.eventId, seq: fields.seq, createdAt: fields.createdAt,
      recordedBy: fields.recordedBy, stackKey: proposal.stack_key,
      geometryKey: { sourceStepSha256: key.source_step_sha256, faceId: key.face_id,
        areaNative2: key.area_native2, centroidNative: key.centroid_native },
      direction: proposal.direction,
      supersedes: fields.supersedes || null,
      ratifies: proposal.event_id,
    });
  };

  // Reject: names the proposal, carries no face.
  AA.buildRejectEvent = function (proposal, fields) {
    if (!proposal || proposal.verdict !== "proposed") throw new Error("only a proposal can be rejected");
    if (AA.actorKind(fields.recordedBy) === AA.ACTOR_KINDS[1]) {
      throw new Error("an agent only proposes -- a human rejects");
    }
    var event = {
      schema: "joby.tolerance_stack/feature-identity/v0",
      event_id: fields.eventId,
      seq: fields.seq,
      created_at: fields.createdAt,
      recorded_by: fields.recordedBy,
      stack_key: proposal.stack_key,
      verdict: "rejected",
      rejects: proposal.event_id,
    };
    if (fields.note) event.note = fields.note;
    return event;
  };

  // Who proposed, in everyday words: "agent" for an agent, the reviewer's
  // name for a person, and the raw string for an event older than the prefix.
  AA.actorWords = function (recordedBy) {
    var kind = AA.actorKind(recordedBy);
    if (kind === AA.ACTOR_KINDS[1]) return "agent";
    if (kind === AA.ACTOR_KINDS[0]) return String(recordedBy).slice(kind.length + 1);
    return String(recordedBy || "unknown");
  };

  // The open proposals on a record, one row per proposal, in the same shape
  // AA.describeBindings uses -- end name, face -- plus who, how sure and why.
  AA.describeProposals = function (record, names) {
    var nm = names || {};
    return ((record && record.proposals) || []).map(function (p) {
      var key = p.geometry_key || {};
      return {
        eventId: p.event_id,
        direction: p.direction,
        end: nm[p.direction] || p.direction,
        face: key.face_id,
        sha256: key.source_step_sha256,
        confidence: p.confidence,
        actor: AA.actorWords(p.recorded_by),
        basis: p.basis || "",
        event: p,
      };
    });
  };

  //: The words a rail row says about a suggestion, in sweep mode and in bind
  //: mode alike (handoff a_rail_row_with_a_proposal_says_so_and_accepts_it_
  //: in_place): an open proposal is "suggested · high", an end the contact
  //: engine ranked and nobody proposed is "candidates · 3". Reader words only
  //: -- who proposed it and why are on the hover, never on the row.
  AA.SUGGESTION_ROW_WORDS = Object.freeze({
    suggested: "suggested · {confidence}",
    candidates: "candidates · {n}",
    accept: "Accept",
    acceptTitle: "bind the suggested face at this end",
    pickOther: "Pick a different face",
    pickOtherTitle: "pick the face yourself; binding another face turns the suggestion down",
  });

  // A list of open proposals, surest first (AA.PROPOSAL_CONFIDENCES' order),
  // stable within one confidence.
  AA.surestFirst = function (proposals) {
    return (proposals || []).map(function (p, i) { return { p: p, i: i }; }).sort(function (a, b) {
      var d = AA.PROPOSAL_CONFIDENCES.indexOf(a.p.confidence) - AA.PROPOSAL_CONFIDENCES.indexOf(b.p.confidence);
      return d || a.i - b.i;
    }).map(function (x) { return x.p; });
  };

  // The open proposals at ONE end of a record, surest first. A null
  // direction is every end's.
  AA.endProposals = function (record, direction) {
    return AA.surestFirst(((record && record.proposals) || []).filter(function (p) {
      return p && (!direction || p.direction === direction);
    }));
  };

  // The rail row's suggestion line: "suggested · high", naming the surest of
  // the row's open proposals, or null when there is none.
  AA.proposalChip = function (record) {
    var best = AA.endProposals(record, null)[0];
    if (!best) return null;
    return AA.SUGGESTION_ROW_WORDS.suggested.replace("{confidence}", best.confidence);
  };

  // What hovering a proposed face says: who, how sure, and the basis.
  AA.proposalHoverText = function (row) {
    return "Proposed by " + row.actor + " (" + row.confidence + "): " + row.basis;
  };

  // --- one human answer at one end, planned once -----------------------------
  //
  // Every surface that answers a proposal -- the sweep rail's Accept, the
  // armed pick that binds a different face, the bind bar's Accept and Reject
  // -- plans here and writes what AA.buildAnswerEvents returns, in that
  // order. A plan is {accept: proposal|null, reject: [proposal], pick:
  // {geometryKey, direction, stackKey}|null, supersedes: event id|null}:
  // at most one `bound` event (an accepted proposal's, or a picked face's),
  // after every rejection.

  //: The three answers (AA.planAnswer's `verb`).
  AA.ANSWER_VERBS = Object.freeze(["accept", "reject", "pick"]);

  // The binding an answer at this end replaces: the end's one standing
  // binding, and nothing when it has none or several (a re-pick replaces;
  // two faces at one end are not guessed between -- AA.planArmedClick's rule).
  AA.answerSupersedes = function (standing) {
    return (standing || []).length === 1 ? standing[0].event_id : null;
  };

  // `verb` accept: `proposal` accepted. reject: `proposal` turned down.
  // pick: the human picked `pick` ({sha256, faceId, geometryKey}) at the end
  // the open proposals `open` sit at -- a proposal naming that very face is
  // accepted, and every other open one at the end is turned down, so the
  // engine never proposes those faces for this key again. `standing` is the
  // end's standing bindings.
  AA.planAnswer = function (verb, args) {
    var a = args || {};
    if (AA.ANSWER_VERBS.indexOf(verb) === -1) {
      throw new Error("an answer is one of " + AA.ANSWER_VERBS.join(", ") + ", got " + JSON.stringify(verb));
    }
    var supersedes = AA.answerSupersedes(a.standing);
    if (verb === AA.ANSWER_VERBS[0]) {
      if (!a.proposal) throw new Error("accept names the proposal it accepts");
      return { accept: a.proposal, reject: [], pick: null, supersedes: supersedes };
    }
    if (verb === AA.ANSWER_VERBS[1]) {
      if (!a.proposal) throw new Error("reject names the proposal it turns down");
      return { accept: null, reject: [a.proposal], pick: null, supersedes: null };
    }
    var pick = a.pick;
    if (!pick || !pick.geometryKey) throw new Error("a pick answer needs the picked face");
    var same = (a.open || []).filter(function (p) {
      var g = p.geometry_key || {};
      return g.source_step_sha256 === pick.geometryKey.sourceStepSha256 && g.face_id === pick.geometryKey.faceId;
    })[0] || null;
    return {
      accept: same,
      reject: (a.open || []).filter(function (p) { return p !== same; }),
      pick: same ? null : pick,
      supersedes: supersedes,
    };
  };

  // The events a plan writes, in the order they are written: every
  // `rejected`, then the one `bound`. `fields` is {eventId, seq, createdAt,
  // recordedBy}; each event after the first takes the next seq, and a
  // rejection's id is the bound event's with "-rejected-<n>" after it, so one
  // gesture's events are told apart and stay together.
  AA.buildAnswerEvents = function (plan, fields) {
    var out = [];
    var seq = fields.seq;
    (plan.reject || []).forEach(function (p, i) {
      out.push(AA.buildRejectEvent(p, { eventId: fields.eventId + "-rejected-" + (i + 1), seq: seq++,
        createdAt: fields.createdAt, recordedBy: fields.recordedBy }));
    });
    if (plan.accept) {
      out.push(AA.buildAcceptEvent(plan.accept, { eventId: fields.eventId, seq: seq++,
        createdAt: fields.createdAt, recordedBy: fields.recordedBy, supersedes: plan.supersedes }));
    } else if (plan.pick) {
      if (AA.actorKind(fields.recordedBy) === AA.ACTOR_KINDS[1]) {
        throw new Error("an agent only proposes -- a human binds");
      }
      out.push(AA.buildBoundEvent({
        eventId: fields.eventId, seq: seq++, createdAt: fields.createdAt,
        recordedBy: fields.recordedBy, stackKey: plan.pick.stackKey,
        geometryKey: plan.pick.geometryKey, direction: plan.pick.direction,
        supersedes: plan.supersedes,
      }));
    }
    return out;
  };

  // --- correcting a binding ---------------------------------------------------
  // A later event names the earlier one it corrects; the fold hides it and
  // history keeps it. These are the browser's copy of that fold for the events
  // written THIS session (the projection on disk is rebuilt by Python).

  // Add one session event to a projection row, as build_projection would.
  AA.addEventToRecord = function (row, event) {
    row.history.push(event.event_id);
    row.proposals = row.proposals || [];
    row.rejected_proposals = row.rejected_proposals || [];
    row.accepted_proposals = row.accepted_proposals || [];
    // An answer takes its proposal out of the open list: a reject keeps it
    // under `rejected_proposals` (the face is never proposed again), an accept
    // records its id and binds below.
    var answered = event.ratifies || event.rejects;
    if (answered) {
      var open = [];
      row.proposals.forEach(function (p) {
        if (p.event_id !== answered) { open.push(p); return; }
        if (event.rejects) row.rejected_proposals.push(p);
        else row.accepted_proposals.push(p.event_id);
      });
      row.proposals = open;
    }
    if (event.verdict === "proposed") {
      row.proposals.push(event);
      return row;
    }
    if (event.verdict === "rejected") return row;
    if (event.verdict !== "bound") {
      row.owner_not_in_set.push(event);
      return row;
    }
    row.superseded = row.superseded || [];
    if (event.supersedes) {
      var kept = [];
      row.bindings.forEach(function (b) {
        (b.event_id === event.supersedes ? row.superseded : kept).push(b);
      });
      row.bindings = kept;
    }
    row.bindings.push(event);
    return row;
  };

  // The event a correction writes: the binding it corrects, with the face
  // and/or the end changed. Everything else the earlier event said about the
  // feature (owner, modifier, regime, note) carries over -- a correction of
  // WHICH face must not silently drop what was recorded about it.
  AA.buildCorrectionEvent = function (earlier, fields) {
    var geometryKey = fields.geometryKey || {
      sourceStepSha256: earlier.geometry_key.source_step_sha256,
      faceId: earlier.geometry_key.face_id,
      areaNative2: earlier.geometry_key.area_native2,
      centroidNative: earlier.geometry_key.centroid_native,
    };
    var carried = {
      compositionNote: earlier.composition_note,
      ownerPart: earlier.owner_part,
      ownerPath: earlier.owner_path,
      gdtModifier: earlier.gdt_modifier,
      generalTolRegime: earlier.general_tol_regime,
      note: earlier.note,
    };
    var merged = {};
    Object.keys(carried).forEach(function (k) { merged[k] = carried[k]; });
    Object.keys(fields).forEach(function (k) {
      if (fields[k] != null) merged[k] = fields[k];
    });
    merged.geometryKey = geometryKey;
    merged.direction = fields.direction || earlier.direction;
    merged.stackKey = earlier.stack_key;
    merged.supersedes = earlier.event_id;
    return AA.buildBoundEvent(merged);
  };

  // The other end of an edge's dimension.
  AA.otherDirection = function (direction) {
    return AA.DIRECTIONS.filter(function (d) { return d !== direction; })[0];
  };

  // The record with one binding taken out -- what the bind form plans against
  // while that binding is being corrected, so the end it held is open again.
  AA.recordWithout = function (record, eventId) {
    if (!record) return record;
    var copy = {};
    Object.keys(record).forEach(function (k) { copy[k] = record[k]; });
    copy.bindings = (record.bindings || []).filter(function (b) { return b.event_id !== eventId; });
    return copy;
  };

  // What the row shows of a record's bindings, in everyday words: one line per
  // standing binding (its end's name and face) and, under a disclosure, one per
  // binding a later event corrected (date, end, face). No event ids -- they
  // stay on the event and in `eventId` for the controls to act on.
  AA.describeBindings = function (record, names) {
    var nm = names || {};
    var line = function (b) {
      var key = b.geometry_key || {};
      return {
        eventId: b.event_id,
        direction: b.direction,
        end: nm[b.direction] || b.direction,
        face: key.face_id,
        date: String(b.created_at || "").slice(0, 10),
        event: b,
      };
    };
    return {
      current: ((record && record.bindings) || []).map(line),
      earlier: ((record && record.superseded) || []).map(line),
    };
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
})(window.AnnotateApp = window.AnnotateApp || {}, window.TolstackVocab.annotate);
