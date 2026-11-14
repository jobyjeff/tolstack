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
// A binding is a FEATURE's (handoff a_feature_is_bound_once_to_a_set_of_faces,
// 2026-11-12). A feature-identity/v1 event names {topology_id, part, node} and
// a list of faces; an old v0 event names an edge end and is READ THROUGH to
// the feature that end is (VA.readThroughOf -- the model view's rule, off the
// topology projection's own `model.features[].identity`). With the topologies
// handed in, the fold adds `features`: one record per feature, the three
// collision outcomes decided as Python decides them (`same_surface` is the
// served log's list of face pairs that are one surface -- the page has no
// meshes' fits to ask). And every reader that is addressed by an edge end
// asks the feature through VA.endView: the end's row carries the binding of
// the feature that end IS, so a feature bound once reads bound at every end
// that uses it.
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
(function (VA, VOCAB) {
  "use strict";

  // The feature fold's words (tolerance_stack/feature_identity.py's
  // FEATURE_OUTCOMES and FEATURE_STATES, generated).
  VA.FEATURE_OUTCOMES = VOCAB.list("FEATURE_OUTCOMES");
  VA.FEATURE_STATES = VOCAB.list("FEATURE_STATES");
  VA.READ_THROUGH_ORPHANS = VOCAB.list("ORPHAN_REASONS");
  var ONE = VA.FEATURE_OUTCOMES[0], SET = VA.FEATURE_OUTCOMES[1], DISAGREE = VA.FEATURE_OUTCOMES[2];

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

  // FeatureKey.token() / GeometryKey.token().
  VA.featureToken = function (k) { return k ? k.topology_id + ":" + k.part + "@" + k.node : null; };
  VA.faceToken = function (g) { return g ? g.source_step_sha256 + ":" + g.face_id : null; };

  // Every face an event names, whichever shape (FeatureIdentityEvent.faces).
  VA.eventFaces = function (e) {
    if (!e) return [];
    if (Array.isArray(e.geometry_keys)) return e.geometry_keys;
    return e.geometry_key ? [e.geometry_key] : [];
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
  // `rowOf` ({event id: the record it was folded into}) lets an event act on
  // an event in ANOTHER record -- a feature's answer to an edge end's
  // proposal, a feature's correction or unbind of an edge end's binding.
  // Without it every pointer is to this record, as before 2026-11-12.
  VA.addIdentityEvent = function (row, event, rowOf) {
    var at = function (id) { return (rowOf && rowOf[id]) || row; };
    VA.IDENTITY_RECORD_LISTS.forEach(function (k) { row[k] = row[k] || []; });
    row.history.push(event.event_id);
    // An answer takes its proposal out of the open list: a reject keeps it
    // under `rejected_proposals` (the face is never proposed again), an
    // accept records its id and binds below. An answer to a proposal that is
    // no longer open repeats an earlier answer (feature_identity's
    // `restated`): it stands once, so the repeat is in history only.
    var answered = event.ratifies || event.rejects;
    if (answered) {
      var home = at(answered);
      VA.IDENTITY_RECORD_LISTS.forEach(function (k) { home[k] = home[k] || []; });
      var open = [];
      var wasOpen = false;
      home.proposals.forEach(function (p) {
        if (p.event_id !== answered) { open.push(p); return; }
        wasOpen = true;
        if (event.rejects) home.rejected_proposals.push(p);
        else home.accepted_proposals.push(p.event_id);
      });
      home.proposals = open;
      home.state = VA.identityRecordState(home);
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
      if (event.supersedes) {
        var sup = at(event.supersedes);
        sup.bindings = take(sup.bindings, standingId(sup, event.supersedes), sup.superseded).kept;
        sup.state = VA.identityRecordState(sup);
      }
      row.bindings.push(event);
    } else if (event.verdict === "retracted") {
      var ret = at(event.retracts);
      ret.bindings = take(ret.bindings, standingId(ret, event.retracts), ret.retracted).kept;
      ret.state = VA.identityRecordState(ret);
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
  function featureSortKey(k) { return [k.topology_id, k.part, k.node].join("\u0000"); }

  // --- reading an old edge-end event through to its feature -----------------

  // The topologies as the fold reads them: by id, each with its edges by id,
  // its nodes' first parts, and its features' identity keys -- the projection's
  // own rows, nothing recomputed.
  function topologyIndex(topologies) {
    var out = {};
    (topologies || []).forEach(function (t) {
      if (!t || !t.id) return;
      var edges = {}, firstPart = {}, identity = {};
      (t.edges || []).forEach(function (e) { edges[e.id] = e; });
      (t.nodes || []).forEach(function (n) { if (n && (n.parts || []).length) firstPart[n.id] = n.parts[0]; });
      ((t.model && t.model.features) || []).forEach(function (f) { identity[f.id] = f.identity; });
      out[t.id] = { id: t.id, edges: edges, firstPart: firstPart, identity: identity };
    });
    return out;
  }

  // The feature key an end of `edge` IS, on topology `t` (an index entry):
  // model_view.end_feature, then the projection's identity for that feature
  // (keyed under the model whose ids it is). Null when the edge is gone.
  function endFeatureKey(t, edgeId, direction) {
    var edge = t && t.edges[edgeId];
    if (!edge || (direction !== "from" && direction !== "to")) return null;
    var node = direction === "from" ? edge.from : edge.to;
    var part = edge.kind === "structural" ? edge.part : t.firstPart[node];
    if (!part) return null;
    return t.identity[part + "@" + node] || { topology_id: t.id, part: part, node: node };
  }
  VA.endFeatureKey = function (topology, edgeId, direction) {
    var index = topologyIndex([topology]);
    return endFeatureKey(index[topology && topology.id], edgeId, direction);
  };

  // feature_identity.read_through: {v0 event id: feature key | null} and
  // {v0 event id: orphan reason}. A face verdict by its end; a rejection or an
  // unbind where the event it names went; an owner_not_in_set nowhere.
  VA.readThroughOf = function (sorted, topologies) {
    var index = topologyIndex(topologies);
    var reasons = VA.READ_THROUGH_ORPHANS;
    var map = {}, orphans = {};
    sorted.forEach(function (e) {
      if (e.feature_key) return;
      var key = null, reason = reasons[2];
      var k = e.stack_key || {};
      if (e.verdict === "bound" || e.verdict === "proposed") {
        if (k.kind === "topology_edge" && (e.direction === "from" || e.direction === "to")) {
          var t = index[k.topology_id];
          if (!t) reason = reasons[0];
          else if (!t.edges[k.edge_id]) reason = reasons[1];
          else { key = endFeatureKey(t, k.edge_id, e.direction); reason = key ? null : reasons[1]; }
        }
      } else {
        var named = e.rejects || e.retracts;
        if (named && Object.prototype.hasOwnProperty.call(map, named)) {
          key = map[named];
          reason = orphans[named] || null;
        }
      }
      map[e.event_id] = key;
      if (!key) orphans[e.event_id] = reason || reasons[2];
    });
    return { map: map, orphans: orphans };
  };

  // feature_identity._outcome: [outcome, faces held, disagreement groups].
  function outcomeOf(standing, newShape, shared) {
    if (!standing.length) return [null, [], []];
    var groups = [];
    standing.forEach(function (event) {
      var faces = VA.eventFaces(event);
      var units = newShape ? [faces] : faces.map(function (f) { return [f]; });
      units.forEach(function (unit) {
        var names = unit.map(VA.faceToken).sort().join("|");
        var hit = groups.filter(function (g) { return g.names === names; })[0];
        if (hit) hit.events.push(event.event_id);
        else groups.push({ names: names, faces: unit, events: [event.event_id] });
      });
    });
    var held = [], seen = {};
    groups.forEach(function (g) {
      g.faces.forEach(function (f) {
        var t = VA.faceToken(f);
        if (!seen[t]) { seen[t] = true; held.push(f); }
      });
    });
    var plain = groups.map(function (g) { return { faces: g.faces, events: g.events }; });
    if (groups.length === 1) return [held.length > 1 ? SET : ONE, held, []];
    var all = !newShape && held.every(function (a, i) {
      return held.slice(i + 1).every(function (b) {
        return a.source_step_sha256 === b.source_step_sha256 && shared(VA.faceToken(a), VA.faceToken(b));
      });
    });
    if (all) return [SET, held, []];
    return [DISAGREE, held, plain];
  }

  // FeatureBindings.state.
  VA.featureRecordState = function (r) {
    if ((r.bindings || []).length) return r.outcome === DISAGREE ? VA.FEATURE_STATES[1] : VA.FEATURE_STATES[0];
    if ((r.owner_not_in_set || []).length) return VA.FEATURE_STATES[2];
    if ((r.proposals || []).length) return VA.FEATURE_STATES[3];
    return VA.FEATURE_STATES[4];
  };

  function emptyFeature(key) {
    return { feature_key: key, state: VA.FEATURE_STATES[4], outcome: null, faces: [], bindings: [],
      disagreement: [], proposals: [], rejected_proposals: [], accepted_proposals: [], superseded: [],
      retracted: [], replaced: [], owner_not_in_set: [], read_through: [], history: [] };
  }

  // feature_identity._fold_features, over the records the per-subject fold
  // made: `v0Rows` (edge-end records), `v1Rows` (feature records), `rt` the
  // read-through, `pos` {event id: log position}, `byId` {event id: event}.
  function foldFeatures(v0Rows, v1Rows, rt, pos, byId, sameSurface) {
    var pairs = {};
    (sameSurface || []).forEach(function (p) {
      if (Array.isArray(p) && p.length === 2) pairs[[p[0], p[1]].sort().join("|")] = true;
    });
    var shared = function (a, b) { return !!pairs[[a, b].sort().join("|")]; };
    var out = {}, inherited = {}, written = {};
    var rec = function (key) {
      var t = VA.featureToken(key);
      if (!out[t]) out[t] = emptyFeature(key);
      return out[t];
    };
    var byPos = function (a, b) { return pos[a.event_id] - pos[b.event_id]; };
    v0Rows.forEach(function (row) {
      row.history.forEach(function (id) {
        var key = rt[id];
        if (!key) return;
        var r = rec(key);
        r.read_through.push(id);
        r.history.push(id);
      });
      row.bindings.forEach(function (b) {
        var key = rt[b.event_id];
        if (key) (inherited[VA.featureToken(key)] = inherited[VA.featureToken(key)] || []).push(b);
      });
      ["proposals", "rejected_proposals"].forEach(function (name) {
        row[name].forEach(function (e) { var key = rt[e.event_id]; if (key) rec(key)[name].push(e); });
      });
      row.accepted_proposals.forEach(function (id) { var key = rt[id]; if (key) rec(key).accepted_proposals.push(id); });
    });
    v1Rows.forEach(function (row) {
      var r = rec(row.feature_key);
      r.history = r.history.concat(row.history);
      ["proposals", "rejected_proposals", "accepted_proposals", "superseded", "retracted",
        "owner_not_in_set", "bindings"].forEach(function (name) { r[name] = r[name].concat(row[name]); });
      written[VA.featureToken(row.feature_key)] = row.history.some(function (id) {
        var e = byId[id];
        return e && (e.verdict === "bound" || e.verdict === "retracted");
      });
    });
    Object.keys(out).forEach(function (t) {
      var r = out[t];
      var old = (inherited[t] || []).slice().sort(byPos);
      if (written[t]) r.replaced = old; else r.bindings = old;
      r.history.sort(function (a, b) { return pos[a] - pos[b]; });
      r.proposals.sort(byPos);
      var o = outcomeOf(r.bindings, !!written[t], shared);
      r.outcome = o[0]; r.faces = o[1]; r.disagreement = o[2];
      r.state = VA.featureRecordState(r);
    });
    return Object.keys(out).map(function (t) { return out[t]; }).sort(function (a, b) {
      var ka = featureSortKey(a.feature_key), kb = featureSortKey(b.feature_key);
      return ka < kb ? -1 : (ka > kb ? 1 : 0);
    });
  }

  // FeatureIdentityProjection.summary.
  VA.featureSummary = function (features, orphans) {
    var S = VA.FEATURE_STATES;
    return {
      features_bound: features.filter(function (r) { return r.state === S[0]; }).length,
      features_holding_a_set: features.filter(function (r) { return r.state === S[0] && r.outcome === SET; }).length,
      disagreements: features.filter(function (r) { return r.state === S[1]; }).length,
      orphans: Object.keys(orphans || {}).length,
    };
  };

  // The whole log, folded: the projection's own shape (`built_from_events`,
  // `counts`, `stack_keys` sorted by key), so every reader of bindings.json
  // reads this unchanged. `verdicts` is the verdict vocabulary the counts are
  // keyed by (the generated one; null counts whatever the log holds).
  // `opts.topologies` (the topology projection's list) turns on the feature
  // fold -- `features`, `orphans`, `summary` -- and `opts.sameSurface` is the
  // served log's `same_surface`.
  VA.foldIdentityEvents = function (events, verdicts, opts) {
    var sorted = (events || []).filter(function (e) { return e && e.event_id; }).slice().sort(VA.identityLogOrder);
    var byKey = {}, bySubject = {}, rowOf = {}, byId = {}, pos = {};
    var order = [], subjects = [];
    var counts = {};
    (verdicts || []).forEach(function (v) { counts[v] = 0; });
    sorted.forEach(function (event, i) {
      byId[event.event_id] = event;
      pos[event.event_id] = i;
      var row;
      if (event.feature_key) {
        var t = VA.featureToken(event.feature_key);
        if (!bySubject[t]) {
          bySubject[t] = VA.emptyIdentityRecord(null);
          delete bySubject[t].stack_key;
          bySubject[t].feature_key = event.feature_key;
          subjects.push(t);
        }
        row = bySubject[t];
      } else {
        var k = keyOf(event.stack_key);
        if (!byKey[k]) { byKey[k] = VA.emptyIdentityRecord(event.stack_key); order.push(k); }
        row = byKey[k];
      }
      VA.addIdentityEvent(row, event, rowOf);
      rowOf[event.event_id] = row;
      counts[event.verdict] = (counts[event.verdict] || 0) + 1;
    });
    order.sort();
    var rows = order.map(function (k) { return byKey[k]; });
    var v1Rows = subjects.map(function (t) { return bySubject[t]; });
    counts.open_proposals = rows.concat(v1Rows).reduce(function (n, r) { return n + r.proposals.length; }, 0);
    var out = {
      built_from_events: sorted.map(function (e) { return e.event_id; }),
      counts: counts,
      stack_keys: rows,
    };
    if (opts && opts.topologies) {
      var rt = VA.readThroughOf(sorted, opts.topologies);
      out.features = foldFeatures(rows, v1Rows, rt.map, pos, byId, opts.sameSurface);
      out.orphans = Object.keys(rt.orphans).sort().map(function (id) {
        return { event_id: id, reason: rt.orphans[id] };
      });
      out.summary = VA.featureSummary(out.features, rt.orphans);
      out.summary.read_through = Object.keys(rt.map).filter(function (id) { return rt.map[id]; }).length;
    }
    return out;
  };

  // --- the end view: an edge end asks the feature it IS ----------------------

  // The feature record of a key (or a token), in a fold that has `features`.
  VA.featureRecordOf = function (identity, key) {
    var t = typeof key === "string" ? key : VA.featureToken(key);
    var rows = (identity && identity.features) || [];
    for (var i = 0; i < rows.length; i++) if (VA.featureToken(rows[i].feature_key) === t) return rows[i];
    return null;
  };

  // One event, as seen at one end: the event's own fields, at `direction`,
  // naming `face` -- and the feature it is about. What the edge-end readers
  // (a row's state, a bound face's mark, an Accept) read.
  function atEnd(event, direction, face, featureKey) {
    var copy = {};
    Object.keys(event).forEach(function (k) { copy[k] = event[k]; });
    copy.direction = direction;
    copy.geometry_key = face;
    copy.feature_key = event.feature_key || featureKey;
    return copy;
  }
  function expand(list, direction, featureKey) {
    var out = [];
    (list || []).forEach(function (e) {
      VA.eventFaces(e).forEach(function (f) { out.push(atEnd(e, direction, f, featureKey)); });
    });
    return out;
  }

  // The rows a topology's edge-end readers ask: one per edge of `topology`
  // (a projection row: `id`, `edges`, `nodes`, `model`) that any feature or
  // record says something about, keyed {topology_edge, topology.id, edge}.
  // At each end: the bindings of the feature that end IS (one per face it
  // holds, a disagreement's held back -- it is not bound), its open,
  // rejected, superseded and taken-back events likewise, and the end's
  // `disagreement` groups. An edge end has no record of its own any more; a
  // v0 `owner_not_in_set` (keyed by edge) is carried on its edge's row.
  VA.endView = function (identity, topology) {
    if (!identity || !identity.features || !topology) return identity;
    var index = topologyIndex([topology])[topology.id];
    var byToken = {};
    identity.features.forEach(function (r) { byToken[VA.featureToken(r.feature_key)] = r; });
    var owners = {};
    var ids = [topology.id].concat(topology.ids_from ? [topology.ids_from] : []);
    (identity.stack_keys || []).forEach(function (row) {
      var k = row.stack_key || {};
      if (k.kind === "topology_edge" && ids.indexOf(k.topology_id) !== -1 && (row.owner_not_in_set || []).length) {
        owners[k.edge_id] = (owners[k.edge_id] || []).concat(row.owner_not_in_set);
      }
    });
    var rows = [];
    (topology.edges || []).forEach(function (edge) {
      var row = VA.emptyIdentityRecord({ kind: "topology_edge", topology_id: topology.id, edge_id: edge.id });
      row.disagreement = [];
      row.owner_not_in_set = owners[edge.id] || [];
      ["from", "to"].forEach(function (d) {
        var key = endFeatureKey(index, edge.id, d);
        var r = key ? byToken[VA.featureToken(key)] : null;
        if (!r) return;
        if (r.state === VA.FEATURE_STATES[0]) {
          r.bindings.forEach(function (b) {
            VA.eventFaces(b).forEach(function (f) {
              if (r.faces.some(function (h) { return VA.faceToken(h) === VA.faceToken(f); })) {
                row.bindings.push(atEnd(b, d, f, r.feature_key));
              }
            });
          });
        }
        if (r.state === VA.FEATURE_STATES[1]) {
          r.disagreement.forEach(function (g) {
            row.disagreement.push({ direction: d, feature_key: r.feature_key, faces: g.faces, events: g.events });
          });
        }
        row.proposals = row.proposals.concat(expand(r.proposals, d, r.feature_key));
        row.rejected_proposals = row.rejected_proposals.concat(expand(r.rejected_proposals, d, r.feature_key));
        row.superseded = row.superseded.concat(expand(r.superseded.concat(r.replaced), d, r.feature_key));
        row.retracted = row.retracted.concat(expand(r.retracted, d, r.feature_key));
        row.accepted_proposals = row.accepted_proposals.concat(r.accepted_proposals);
        row.history = row.history.concat(r.history);
      });
      var said = VA.IDENTITY_RECORD_LISTS.some(function (k) { return row[k].length; }) || row.disagreement.length;
      if (!said) return;
      row.state = VA.identityRecordState(row);
      rows.push(row);
    });
    var out = {};
    Object.keys(identity).forEach(function (k) { out[k] = identity[k]; });
    out.stack_keys = rows;
    out.end_view_of = topology.id;
    return out;
  };

  // Does the pane's posted record ({projection, eventIds}) replace the
  // page's? Only when it folds every event the page's record does: the pane
  // writes, so it is the fresher of the two -- but a pane reading other data
  // (a demo, an origin that publishes nothing) must never take the page's
  // bindings away. A page with no record takes any.
  VA.paneIdentityWins = function (current, msg) {
    if (!msg || !msg.projection || typeof msg.projection !== "object" || !Array.isArray(msg.eventIds)) return false;
    var known = {};
    msg.eventIds.forEach(function (id) { known[id] = true; });
    return ((current && current.built_from_events) || []).every(function (id) { return known[id]; });
  };

  // What a reader of the bindings gets from whatever its transport reached:
  // the served log ({events, installed_meshes, same_surface}) folded here --
  // with the feature fold when `topologies` is given -- or, where no log is
  // reached, the built projection as it is (which carries `features` since
  // 2026-11-12). `installedMeshes` is the log's sha256 list, or null where
  // nothing said which meshes exist.
  VA.identityFromSources = function (log, projection, verdicts, topologies) {
    if (log && Array.isArray(log.events)) {
      return { projection: VA.foldIdentityEvents(log.events, verdicts,
        topologies ? { topologies: topologies, sameSurface: log.same_surface || [] } : null),
        installedMeshes: Array.isArray(log.installed_meshes) ? log.installed_meshes : null };
    }
    return { projection: projection || null, installedMeshes: null };
  };
})(window.ViewerApp = window.ViewerApp || {}, window.TolstackVocab.viewer);
