// The feature-identity fold, in the browser (handoff a_binding_shows_the_
// moment_it_is_made_and_is_corrected_where_it_is_shown).
//
// tolerance_stack/feature_identity.py's build_projection is THE fold: it
// validates the log and writes data/projections/feature-identity/bindings.json,
// which the fitter and every Python reader use. That file is a snapshot from
// the last rebuild, and both pages used to read only it -- so a binding Jeff
// made was gone on the next reload until somebody rebuilt, which is what
// "they keep getting wiped" was. The pages now read the LOG (the served copy,
// projections/viewer/feature-identity/log.json, or the inbox itself through a
// folder grant) and fold it here, in the same shape: one record per stack-side
// key with `bindings`, `superseded`, `retracted`, `proposals`,
// `rejected_proposals`, `accepted_proposals`, `owner_not_in_set` and
// `history`. tests/test_identity_fold_is_paired.py folds one log both ways and
// compares them record by record, so the two cannot drift.
//
// Lenient where Python refuses: a log the builder would reject (a pointer to
// an event that is not there, an answer given twice differently) is folded as
// far as it goes here, because a page that shows nothing over one bad event is
// worse than one that shows the rest -- the rebuild rail is where a bad log
// stops loudly.
//
// One file for both apps: the annotator reads it as a sibling
// (../viewer/identity_fold.js), as it does warning_icon.js, and its
// AA.addEventToRecord is this file's VA.addIdentityEvent.
(function (VA) {
  "use strict";

  // The lists a record carries, each a list of whole events except
  // `history` and `accepted_proposals`, which are ids (Python's as_dict).
  VA.IDENTITY_RECORD_LISTS = Object.freeze(["bindings", "owner_not_in_set", "history", "superseded",
    "proposals", "rejected_proposals", "accepted_proposals", "retracted"]);

  VA.emptyIdentityRecord = function (stackKey) {
    var row = { stack_key: stackKey, state: "unbound" };
    VA.IDENTITY_RECORD_LISTS.forEach(function (k) { row[k] = []; });
    return row;
  };

  // StackKeyBindings.state: bound, then owner_not_in_set, then proposed.
  VA.identityRecordState = function (row) {
    if ((row.bindings || []).length) return "bound";
    if ((row.owner_not_in_set || []).length) return "owner_not_in_set";
    if ((row.proposals || []).length) return "proposed";
    return "unbound";
  };

  // The fold's total order (feature_identity.log_order): seq, then when it
  // was written, then its id.
  VA.identityLogOrder = function (a, b) {
    if (a.seq !== b.seq) return a.seq - b.seq;
    var ta = String(a.created_at || ""), tb = String(b.created_at || "");
    if (ta !== tb) return ta < tb ? -1 : 1;
    var ia = String(a.event_id), ib = String(b.event_id);
    return ia < ib ? -1 : (ia > ib ? 1 : 0);
  };

  function take(list, eventId, into) {
    var kept = [];
    var found = false;
    (list || []).forEach(function (e) {
      if (e && e.event_id === eventId) { found = true; into.push(e); } else kept.push(e);
    });
    return { kept: kept, found: found };
  }

  // {repeat answer id: the binding that answer repeats}, kept off the
  // record's enumerable fields so the record serialises as Python's does. A
  // correction or an unbind naming the repeat acts on the binding standing.
  function restatedOf(row) {
    if (!row._restated) Object.defineProperty(row, "_restated", { value: {}, enumerable: false });
    return row._restated;
  }
  function standingId(row, id) {
    return (row._restated && row._restated[id]) || id;
  }

  // Add one event to a record, as build_projection would. Returns the row.
  VA.addIdentityEvent = function (row, event) {
    VA.IDENTITY_RECORD_LISTS.forEach(function (k) { row[k] = row[k] || []; });
    row.history.push(event.event_id);
    // An answer takes its proposal out of the open list: a reject keeps it
    // under `rejected_proposals` (the face is never proposed again), an
    // accept records its id and binds below. An answer to a proposal that is
    // no longer open repeats an earlier answer (feature_identity's
    // `restated`): it stands once, so the repeat is in history only.
    var answered = event.ratifies || event.rejects;
    if (answered) {
      var open = [];
      var wasOpen = false;
      row.proposals.forEach(function (p) {
        if (p.event_id !== answered) { open.push(p); return; }
        wasOpen = true;
        if (event.rejects) row.rejected_proposals.push(p);
        else row.accepted_proposals.push(p.event_id);
      });
      row.proposals = open;
      if (!wasOpen) {
        var first = row.bindings.filter(function (b) { return b.ratifies === answered; })[0];
        if (first) restatedOf(row)[event.event_id] = first.event_id;
        row.state = VA.identityRecordState(row);
        return row;
      }
    }
    if (event.verdict === "proposed") {
      row.proposals.push(event);
    } else if (event.verdict === "bound") {
      if (event.supersedes) row.bindings = take(row.bindings, standingId(row, event.supersedes), row.superseded).kept;
      row.bindings.push(event);
    } else if (event.verdict === "retracted") {
      row.bindings = take(row.bindings, standingId(row, event.retracts), row.retracted).kept;
    } else if (event.verdict === "owner_not_in_set") {
      row.owner_not_in_set.push(event);
    }
    // a `rejected` event lives in history; what it does is to its proposal
    row.state = VA.identityRecordState(row);
    return row;
  };

  function keyOf(stackKey) {
    var k = stackKey || {};
    return k.kind === "topology_edge"
      ? [k.kind, k.topology_id, k.edge_id].join("\u0000")
      : [k.kind, k.stack_id, k.element_id].join("\u0000");
  }

  // The whole log, folded: the projection's own shape (`built_from_events`,
  // `counts`, `stack_keys` sorted by key), so every reader of bindings.json
  // reads this unchanged. `verdicts` is the verdict vocabulary the counts are
  // keyed by (the generated one; null counts whatever the log holds).
  VA.foldIdentityEvents = function (events, verdicts) {
    var sorted = (events || []).filter(function (e) { return e && e.event_id; }).slice().sort(VA.identityLogOrder);
    var byKey = {};
    var order = [];
    var counts = {};
    (verdicts || []).forEach(function (v) { counts[v] = 0; });
    sorted.forEach(function (event) {
      var k = keyOf(event.stack_key);
      if (!byKey[k]) { byKey[k] = VA.emptyIdentityRecord(event.stack_key); order.push(k); }
      VA.addIdentityEvent(byKey[k], event);
      counts[event.verdict] = (counts[event.verdict] || 0) + 1;
    });
    order.sort();
    var rows = order.map(function (k) { return byKey[k]; });
    counts.open_proposals = rows.reduce(function (n, r) { return n + r.proposals.length; }, 0);
    return {
      built_from_events: sorted.map(function (e) { return e.event_id; }),
      counts: counts,
      stack_keys: rows,
    };
  };

  // What a reader of the bindings gets from whatever its transport reached:
  // the served log ({events, installed_meshes}) folded here, or -- where no
  // log is reached -- the built projection as it is. `installedMeshes` is the
  // log's sha256 list, or null where nothing said which meshes exist.
  VA.identityFromSources = function (log, projection, verdicts) {
    if (log && Array.isArray(log.events)) {
      return { projection: VA.foldIdentityEvents(log.events, verdicts),
        installedMeshes: Array.isArray(log.installed_meshes) ? log.installed_meshes : null };
    }
    return { projection: projection || null, installedMeshes: null };
  };
})(window.ViewerApp = window.ViewerApp || {});
