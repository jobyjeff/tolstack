// The ONE model object in the browser (handoff the_model_is_derived_once_and_
// the_left_column_is_its_tree, 2026-11-10).
//
// Python derives the model once (tolerance_stack/model_view.py) and the
// topology projection carries it per topology as `model`, beside `bodies`:
// bodies > parts > features, dimensions, interfaces (a node two parts share
// and a gap edge, in one list) and joints (interfaces grouped by part pair).
// This file turns that block into the lookups the surfaces need -- by id, by
// part, by node -- and folds the feature-identity projection into ONE status
// per feature. It is pure: no DOM, no fetch, nothing read off the raw
// `nodes[].parts` / `edges[].part` / `bodies[].parts` arrays. Everything the
// handoff wrote or rewrote reads this; the DAG's own derivations (VA.partPins,
// VA.partSpans, VA.gridPlan, VA.bodyOfPart) still read the raw arrays and are
// a later handoff's to move -- the lesson lists them.
//
// A feature is a node AS SEEN ON ONE PART (`<part>@<node>`), so a node two
// parts share is two features, one per part, and a part's features are its
// own. That is a view id: bindings stay keyed by edge end
// (docs/DAG_TOPOLOGY.md, "The model view").
(function (VA) {
  "use strict";

  // One status mark per feature: the coloured circle and the warning triangle
  // the two rails used to wear are one mark now (Jeff, 2026-11-09). A module-
  // level table, never an inline literal (repo rule).
  //   bound      a committed binding stands at this end of an edge on the node
  //   suggested  an agent's open proposal at this end, and nothing bound
  //   none       neither
  VA.FEATURE_STATUSES = Object.freeze({
    bound: "bound",
    suggested: "suggested",
    none: "none",
  });

  // The two ends of an edge, the feature-identity stream's own words
  // (tolerance_stack.feature_identity.DIRECTIONS). Which end a node is on an
  // edge is read off the edge's `from`/`to`, nowhere else.
  VA.EDGE_ENDS = Object.freeze({ from: "from", to: "to" });

  // The feature-identity record for `edgeId` under any of the model's
  // identity ids (its own, and the model it reuses ids from -- Python lists
  // them; nothing here asks whether the model reuses ids), or null.
  function bindingRecord(identity, identityIds, edgeId) {
    var rows = (identity && identity.stack_keys) || [];
    for (var i = 0; i < rows.length; i++) {
      var key = rows[i] && rows[i].stack_key;
      if (!key || key.kind !== "topology_edge" || key.edge_id !== edgeId) continue;
      if (identityIds.indexOf(key.topology_id) !== -1) return rows[i];
    }
    return null;
  }

  // The edge ends a feature IS, as [{edgeId, end}] in edge-id order: the
  // edges at its node whose part THERE is the feature's part -- a dimension
  // edge's own `part`, a gap edge's end part, which is the node's first part
  // (tolerance_stack/model_view.py's _end_part). A node two parts share is two
  // features, and each reads only its own part's ends (handoff a_binding_
  // shows_the_moment_it_is_made_and_is_corrected_where_it_is_shown: event 0076
  // bound the hub's side of the tangential link mount base face, and until
  // then the mount's feature read it as its own). The first end is where a
  // feature with nothing bound is keyed when it is picked.
  // `gapPart` is the node's first part: the model lists a node's features in
  // the order of its parts (model_view.py), so it is the part of the node's
  // first feature.
  function featureEnds(feature, edgesByNode, gapPart) {
    var out = [];
    (edgesByNode[feature.node] || []).forEach(function (edge) {
      // A dimension is EDGE_KINDS[0] ("structural", topology.py's own word).
      var part = edge.kind === VA.EDGE_KINDS[0] ? edge.part : gapPart;
      if (part !== feature.part) return;
      if (edge.from === feature.node) out.push({ edgeId: edge.id, end: VA.EDGE_ENDS.from });
      if (edge.to === feature.node) out.push({ edgeId: edge.id, end: VA.EDGE_ENDS.to });
    });
    return out.sort(function (a, b) {
      return a.edgeId < b.edgeId ? -1 : (a.edgeId > b.edgeId ? 1 : (a.end < b.end ? -1 : 1));
    });
  }

  // The standing bindings and the open proposals at a feature's own ends,
  // each as {edgeId, end, event}.
  function featureEvents(ends, identity, identityIds, list) {
    var out = [];
    ends.forEach(function (e) {
      var record = bindingRecord(identity, identityIds, e.edgeId);
      ((record && record[list]) || []).forEach(function (ev) {
        if (ev && ev.direction === e.end) out.push({ edgeId: e.edgeId, end: e.end, event: ev });
      });
    });
    return out;
  }

  // The status of one feature: bound winning over suggested over none, over
  // its OWN ends only. A binding or a proposal is at an end when its
  // `direction` names it (AA.sweepFeatureState applies the same end rule in
  // the pane).
  function featureStatus(ends, identity, identityIds) {
    var S = VA.FEATURE_STATUSES;
    if (featureEvents(ends, identity, identityIds, "bindings").length) return S.bound;
    if (featureEvents(ends, identity, identityIds, "proposals").length) return S.suggested;
    return S.none;
  }

  // `topoProj` is one topology of the projection (its `model` block is what
  // is read, plus `edges` for which end a node is on); `identity` is the
  // feature-identity projection, or null for "nothing bound" -- the ordinary
  // reading where no mount serves it. Returns null for a projection built
  // before the model block existed, which every caller treats as "no tree".
  VA.buildModel = function (topoProj, identity) {
    var view = topoProj && topoProj.model;
    if (!view) return null;
    var byId = function (rows) {
      var out = {};
      (rows || []).forEach(function (row) { out[row.id] = row; });
      return out;
    };
    var parts = byId(view.parts);
    var features = byId(view.features);
    var dimensions = byId(view.dimensions);
    var interfaces = byId(view.interfaces);
    var joints = byId(view.joints);
    var bodies = byId(view.bodies);

    var edgesByNode = {};
    ((topoProj && topoProj.edges) || []).forEach(function (edge) {
      (edgesByNode[edge.from] = edgesByNode[edge.from] || []).push(edge);
      (edgesByNode[edge.to] = edgesByNode[edge.to] || []).push(edge);
    });
    var identityIds = view.identity_ids || [view.id];
    var status = {};
    var ends = {};
    var featuresByNode = {};
    (view.features || []).forEach(function (feature) {
      (featuresByNode[feature.node] = featuresByNode[feature.node] || []).push(feature.id);
    });
    (view.features || []).forEach(function (feature) {
      var first = features[featuresByNode[feature.node][0]];
      ends[feature.id] = featureEnds(feature, edgesByNode, first ? first.part : null);
      status[feature.id] = featureStatus(ends[feature.id], identity, identityIds);
    });

    // A body's tint index, the DAG's rule (VA.bodyTint): its position in the
    // authored list, modulo the palette.
    var tintOf = {};
    (view.bodies || []).forEach(function (body, i) { tintOf[body.id] = i % VA.BODY_TINTS; });

    // Parts the model places in no body (a document with no `bodies`), in
    // authored order: a tree lists them where bodies would be.
    var unbodied = (view.parts || []).filter(function (p) { return p.body === null || p.body === undefined; })
      .map(function (p) { return p.id; });

    var model = {
      id: view.id,
      title: view.title,
      identityIds: identityIds,
      counts: view.counts || {},
      // The entity lists, in the view's own (authored) order.
      bodies: view.bodies || [],
      parts: view.parts || [],
      features: view.features || [],
      dimensions: view.dimensions || [],
      interfaces: view.interfaces || [],
      joints: view.joints || [],
      unbodiedParts: unbodied,
      // Lookups.
      body: function (id) { return bodies[id] || null; },
      part: function (id) { return parts[id] || null; },
      feature: function (id) { return features[id] || null; },
      dimension: function (id) { return dimensions[id] || null; },
      interface: function (id) { return interfaces[id] || null; },
      joint: function (id) { return joints[id] || null; },
      // The body a part moves with, or null.
      bodyOf: function (partId) { var p = parts[partId]; return p ? p.body : null; },
      // The one way the part is named (model_view.part_label), by id.
      label: function (partId) { var p = parts[partId]; return p ? p.label : String(partId); },
      // A body's tint index for `--tv-body-ink-<n>`.
      tint: function (bodyId) { return tintOf[bodyId] === undefined ? 0 : tintOf[bodyId]; },
      // Every feature a node is, one per part it is on.
      featuresOfNode: function (nodeId) { return featuresByNode[nodeId] || []; },
      // A part's features / dimensions, as rows.
      featuresOf: function (partId) {
        var p = parts[partId];
        return p ? p.features.map(function (fid) { return features[fid]; }) : [];
      },
      dimensionsOf: function (partId) {
        var p = parts[partId];
        return p ? p.dimensions.map(function (did) { return dimensions[did]; }) : [];
      },
      // The joints inside one body, and the joints between two bodies, each
      // in first-seen order with its constraints resolved to interfaces.
      jointsWithin: function (bodyId) {
        return (view.joints || []).filter(function (j) { return j.within === bodyId; });
      },
      jointsBetween: function () {
        return (view.joints || []).filter(function (j) { return j.within === null || j.within === undefined; });
      },
      constraintsOf: function (jointId) {
        var j = joints[jointId];
        return j ? j.constraints.map(function (iid) { return interfaces[iid]; }) : [];
      },
      // One status word per feature (VA.FEATURE_STATUSES).
      status: function (featureId) { return status[featureId] || VA.FEATURE_STATUSES.none; },
      // The edge ends a feature is ([{edgeId, end}], featureEnds), and the
      // standing bindings / open proposals at them ([{edgeId, end, event}]).
      endsOf: function (featureId) { return ends[featureId] || []; },
      bindingsOf: function (featureId) {
        return featureEvents(ends[featureId] || [], identity, identityIds, "bindings");
      },
      // The standing bindings at one edge end, under the model's identity ids.
      bindingsAt: function (edgeId, end) {
        var record = bindingRecord(identity, identityIds, edgeId);
        return ((record && record.bindings) || []).filter(function (b) { return b && b.direction === end; });
      },
      proposalsOf: function (featureId) {
        return featureEvents(ends[featureId] || [], identity, identityIds, "proposals");
      },
      // Does the part have an installed mesh the scene could draw?
      hasMesh: function (partId) {
        var p = parts[partId];
        return !!(p && p.mesh && p.mesh.installed);
      },
    };
    return model;
  };

  // --- the ONE selection and the ONE hover, in the model's terms ---------------
  // (one_selection_one_hover_and_leaders_off, 2026-11-10)
  //
  // What the page selects or hovers is a model ENTITY -- {kind, id} with kind
  // one of VA.FOCUS_KINDS -- held in one place (topology_app.js's
  // `state.focus`) and written by one setter each. The DAG and the grid draw
  // ELEMENTS (a node, an edge), so the four functions below are the only
  // translation: which entity an element is, which element an entity is
  // shown as, which element keys an entity lights, and which tree rows. A
  // projection built before the model block (model null) has no entities;
  // there an element stands for itself, so the page still lights what it
  // can, and the tree -- which needs the model -- lights nothing.
  VA.FOCUS_KINDS = Object.freeze({
    body: "body",
    part: "part",
    feature: "feature",
    dimension: "dimension",
    interface: "interface",
    joint: "joint",
  });

  function sameEntity(a, b) {
    return !!a && !!b && a.kind === b.kind && a.id === b.id;
  }
  VA.sameFocus = sameEntity;

  // The entity a DAG element is: a node two parts share is the interface it
  // is, a node on one part is that part's feature of it; a gap edge is the
  // interface it is, any other edge the dimension it is. Null for an id the
  // model does not know; the element itself where there is no model.
  VA.focusEntityOf = function (model, kind, id) {
    if (!kind || !id) return null;
    if (!model) return { kind: kind, id: id };
    var F = VA.FOCUS_KINDS;
    var iface = model.interface(id);
    if (kind === "node") {
      if (iface && iface.source === "node") return { kind: F.interface, id: id };
      var features = model.featuresOfNode(id);
      return features.length ? { kind: F.feature, id: features[0] } : null;
    }
    if (kind === "edge") {
      if (iface && iface.source === "edge") return { kind: F.interface, id: id };
      return model.dimension(id) ? { kind: F.dimension, id: id } : null;
    }
    return null;
  };

  // The element an entity is shown as (the Preview's record, the scene's
  // `model select node`, the deep link): a feature its node, an interface
  // its node or edge, a dimension its edge; a body, a part or a joint is no
  // one element, so null.
  VA.focusElementOf = function (model, entity) {
    if (!entity) return null;
    if (!model) return VA.TOPO_ROW_KINDS.indexOf(entity.kind) !== -1 ? { kind: entity.kind, id: entity.id } : null;
    var F = VA.FOCUS_KINDS;
    if (entity.kind === F.feature) {
      var f = model.feature(entity.id);
      return f ? { kind: "node", id: f.node } : null;
    }
    if (entity.kind === F.interface) {
      var i = model.interface(entity.id);
      return i ? { kind: i.source === "edge" ? "edge" : "node", id: i.id } : null;
    }
    if (entity.kind === F.dimension) return model.dimension(entity.id) ? { kind: "edge", id: entity.id } : null;
    return null;
  };

  // Every element key (`node|<id>`, `edge|<id>`) an entity lights on the DAG
  // and in the grid: its own element -- a gap interface's its edge AND its
  // two ends' nodes, since the gap and the two features it stands between
  // are one interface (a joint's one 3D dot is those two nodes) -- or, for
  // a part, a body or a joint, the elements of everything it holds.
  VA.focusElementKeysOf = function (model, entity) {
    if (!entity) return [];
    var F = VA.FOCUS_KINDS;
    var out = [];
    var seen = {};
    var add = function (kind, id) {
      if (!id) return;
      var key = VA.elementKey(kind, id);
      if (seen[key]) return;
      seen[key] = true;
      out.push(key);
    };
    var addEntity = function (e) {
      var el = VA.focusElementOf(model, e);
      if (el) add(el.kind, el.id);
      if (model && e.kind === F.interface) {
        var iface = model.interface(e.id);
        if (iface && iface.source === "edge") {
          (iface.ends || []).forEach(function (fid) {
            var f = model.feature(fid);
            if (f) add("node", f.node);
          });
        }
      }
    };
    var addPart = function (partId) {
      model.featuresOf(partId).forEach(function (f) { if (f) add("node", f.node); });
      model.dimensionsOf(partId).forEach(function (d) { if (d) add("edge", d.id); });
    };
    var addJoint = function (jointId) {
      model.constraintsOf(jointId).forEach(function (c) {
        if (c) addEntity({ kind: F.interface, id: c.id });
      });
    };
    if (!model || entity.kind === F.feature || entity.kind === F.interface || entity.kind === F.dimension) {
      addEntity(entity);
    } else if (entity.kind === F.part) {
      addPart(entity.id);
    } else if (entity.kind === F.body) {
      var body = model.body(entity.id);
      (body ? body.parts : []).forEach(addPart);
      model.jointsWithin(entity.id).forEach(function (j) { addJoint(j.id); });
    } else if (entity.kind === F.joint) {
      addJoint(entity.id);
    }
    return out;
  };

  // The tree rows an entity lights, as `<kind>:<id>` (the row's data-nav-kind
  // and data-nav-id): a feature's own row and the other rows of its node (a
  // node two parts share is one thing, two rows) and the interface row that
  // node is; an interface's row and its ends' feature rows; a dimension's two
  // end features; a part's, a body's or a joint's own row.
  VA.focusNavRowsOf = function (model, entity) {
    if (!model || !entity) return [];
    var F = VA.FOCUS_KINDS;
    var out = [];
    var seen = {};
    var add = function (kind, id) {
      if (!id) return;
      var key = kind + ":" + id;
      if (seen[key]) return;
      seen[key] = true;
      out.push(key);
    };
    var addNode = function (nodeId) {
      model.featuresOfNode(nodeId).forEach(function (fid) { add(F.feature, fid); });
      var iface = model.interface(nodeId);
      if (iface && iface.source === "node") add(F.interface, nodeId);
    };
    if (entity.kind === F.feature) {
      var f = model.feature(entity.id);
      if (f) { add(F.feature, f.id); addNode(f.node); }
    } else if (entity.kind === F.interface) {
      var i = model.interface(entity.id);
      if (i) {
        add(F.interface, i.id);
        if (i.source === "node") addNode(i.id);
        else (i.ends || []).forEach(function (fid) { add(F.feature, fid); });
      }
    } else if (entity.kind === F.dimension) {
      var d = model.dimension(entity.id);
      if (d) { add(F.feature, d.from); add(F.feature, d.to); }
    } else if (entity.kind === F.part || entity.kind === F.body || entity.kind === F.joint) {
      add(entity.kind, entity.id);
    }
    return out;
  };

  // --- a binding that names something gone (deliverable 6) -------------------
  //
  // Every standing topology-edge binding whose edge no loaded model has --
  // under any of a model's identity ids -- or whose mesh is not among the
  // installed meshes the log listed (`installed` null: nothing said, so no
  // mesh is judged). Each as {event, reason, edgeId}, `reason` one of
  // VA.ORPHAN_REASONS. It refuses nothing: the tree counts them in one line.
  // The two outcomes it answers: an interface left v2 on 2026-11-10 with no
  // reader noticing whether a binding sat on it, and the 2026-10-01 mesh
  // re-key orphaned bindings by a directory rename.
  VA.ORPHAN_REASONS = Object.freeze({ edge: "edge", mesh: "mesh" });

  VA.orphanBindings = function (identity, topologies, installed) {
    var edges = {};
    ((topologies && topologies.topologies) || []).forEach(function (t) {
      var ids = (t.model && t.model.identity_ids) || [t.id];
      ids.forEach(function (id) {
        (t.edges || []).forEach(function (e) { edges[id + "\u0000" + e.id] = true; });
      });
    });
    var meshes = installed ? {} : null;
    (installed || []).forEach(function (sha) { meshes[sha] = true; });
    var out = [];
    ((identity && identity.stack_keys) || []).forEach(function (row) {
      var key = row && row.stack_key;
      if (!key || key.kind !== "topology_edge") return;
      (row.bindings || []).forEach(function (b) {
        var sha = b.geometry_key && b.geometry_key.source_step_sha256;
        if (!edges[key.topology_id + "\u0000" + key.edge_id]) {
          out.push({ event: b, reason: VA.ORPHAN_REASONS.edge, edgeId: key.edge_id });
        } else if (meshes && sha && !meshes[sha]) {
          out.push({ event: b, reason: VA.ORPHAN_REASONS.mesh, edgeId: key.edge_id });
        }
      });
    });
    return out;
  };

  // The models of a whole projection, keyed by topology id: built once per
  // loaded projection (topology_app.js's load), never per paint.
  VA.buildModels = function (topologies, identity) {
    var out = {};
    ((topologies && topologies.topologies) || []).forEach(function (t) {
      out[t.id] = VA.buildModel(t, identity);
    });
    return out;
  };
})(window.ViewerApp = window.ViewerApp || {});
