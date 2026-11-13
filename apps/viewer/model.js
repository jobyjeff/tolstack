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
    // A part's or a body's container (its field or block on the DAG, its
    // bracket in the grid) is that part or body (2026-11-12).
    if (kind === F.part) return model.part(id) ? { kind: F.part, id: id } : null;
    if (kind === F.body) return model.body(id) ? { kind: F.body, id: id } : null;
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

  // The entity a lit key names (`node|<id>`, `edge|<id>`, `part|<id>`,
  // `body|<id>`): what the DAG's pointer tells the page. Null for a key that
  // is none of these (a rail's, a study group's).
  VA.focusKeyEntity = function (model, key) {
    if (typeof key !== "string") return null;
    var bar = key.indexOf("|");
    if (bar === -1) return null;
    var kind = key.slice(0, bar);
    var id = key.slice(bar + 1);
    if (VA.parseElementKey(key) || (VA.FOCUS_CONTAINER_KINDS && VA.FOCUS_CONTAINER_KINDS[kind])) {
      return VA.focusEntityOf(model, kind, id);
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

  // --- what an entity LIGHTS, in two tiers (hover_and_select_light_the_same_
  // things_on_all_four_surfaces_and_nothing_goes_opaque, 2026-11-12) ---------
  //
  // ONE resolver. For any entity -- body, part, feature, dimension,
  // interface, joint -- the set it lights, as two tiers of entities:
  //
  //   own       the entity and everything it CONTAINS. A body contains its
  //             parts and the joints inside it; a part its features and
  //             dimensions; a dimension and an interface their two end
  //             features; a joint its interfaces; a feature its bound faces
  //             (VA.focusFacesOf reads those off the same tiers).
  //   touching  what MEETS it without belonging to it. A part: the
  //             interfaces to its neighbours, their joint, and the feature on
  //             the far side of each. A body: the joints to other bodies,
  //             their interfaces and far features. A feature: the interfaces
  //             it is an end of, the feature across each, and the dimensions
  //             that end at it. A dimension: the interfaces at its two ends.
  //             An interface: its joint, and the dimensions ending at its two
  //             features. A joint: the two parts it joins.
  //
  // Hover and select both come here, and every surface -- the tree, the DAG,
  // the grid, the 3D pane -- draws the two tiers and nothing else: own in the
  // present highlight, touching visibly fainter (Jeff, 2026-11-12: "a less
  // pronounced color for interfaces"). The four functions after it are the
  // only translations of the tiers into a surface's terms: element keys for
  // the DAG and the grid (VA.focusElementKeysOf), row keys for the tree
  // (VA.focusNavRowsOf), the folds a row is behind (VA.navRevealPaths), and
  // the scene's payload (VA.sceneLightOf). Nothing else decides what lights.
  // A projection built before the model block (model null) has no entities;
  // there an element stands for itself alone.
  VA.FOCUS_TIERS = Object.freeze({ own: "own", touching: "touching" });

  function tierSet() {
    var out = { list: [], seen: {} };
    out.add = function (kind, id) {
      if (!kind || !id) return;
      var key = kind + ":" + id;
      if (out.seen[key]) return;
      out.seen[key] = true;
      out.list.push({ kind: kind, id: id });
    };
    out.has = function (kind, id) { return !!out.seen[kind + ":" + id]; };
    return out;
  }

  VA.focusLightOf = function (model, entity) {
    var own = tierSet();
    var touching = tierSet();
    if (!entity) return { own: [], touching: [] };
    if (!model) return { own: [entity], touching: [] };
    var F = VA.FOCUS_KINDS;
    var interfacesAt = function (fid) {
      return model.interfaces.filter(function (i) { return (i.ends || []).indexOf(fid) !== -1; });
    };
    var dimensionsAt = function (fid) {
      return model.dimensions.filter(function (d) { return d.from === fid || d.to === fid; });
    };
    // An interface, the joint it belongs to, and its far ends (every end not
    // among `mine`), into `tier`.
    var meet = function (tier, iface, mine) {
      tier.add(F.interface, iface.id);
      if (iface.joint && model.joint(iface.joint)) tier.add(F.joint, iface.joint);
      (iface.ends || []).forEach(function (fid) {
        if (mine.indexOf(fid) === -1) tier.add(F.feature, fid);
      });
    };
    var ownPart = function (partId) {
      var part = model.part(partId);
      if (!part) return;
      own.add(F.part, partId);
      part.features.forEach(function (fid) { own.add(F.feature, fid); });
      part.dimensions.forEach(function (did) { own.add(F.dimension, did); });
    };
    var ownInterface = function (iface) {
      own.add(F.interface, iface.id);
      (iface.ends || []).forEach(function (fid) { own.add(F.feature, fid); });
    };
    var ownJoint = function (joint) {
      own.add(F.joint, joint.id);
      model.constraintsOf(joint.id).forEach(function (c) { if (c) ownInterface(c); });
    };
    // The interfaces to a set of parts' neighbours: every interface with an
    // end on one of the parts and an end off them.
    var touchParts = function (partIds) {
      var mine = [];
      partIds.forEach(function (pid) {
        var p = model.part(pid);
        if (p) mine = mine.concat(p.features);
      });
      model.interfaces.forEach(function (iface) {
        var ends = iface.ends || [];
        var inside = ends.filter(function (fid) { return mine.indexOf(fid) !== -1; });
        if (inside.length && inside.length < ends.length) meet(touching, iface, mine);
      });
    };

    if (entity.kind === F.body) {
      var body = model.body(entity.id);
      if (!body) return { own: [], touching: [] };
      own.add(F.body, body.id);
      body.parts.forEach(ownPart);
      model.jointsWithin(body.id).forEach(ownJoint);
      touchParts(body.parts);
    } else if (entity.kind === F.part) {
      if (!model.part(entity.id)) return { own: [], touching: [] };
      ownPart(entity.id);
      touchParts([entity.id]);
    } else if (entity.kind === F.feature) {
      var f = model.feature(entity.id);
      if (!f) return { own: [], touching: [] };
      own.add(F.feature, f.id);
      interfacesAt(f.id).forEach(function (iface) { meet(touching, iface, [f.id]); });
      dimensionsAt(f.id).forEach(function (d) { touching.add(F.dimension, d.id); });
    } else if (entity.kind === F.dimension) {
      var d = model.dimension(entity.id);
      if (!d) return { own: [], touching: [] };
      own.add(F.dimension, d.id);
      own.add(F.feature, d.from);
      own.add(F.feature, d.to);
      [d.from, d.to].forEach(function (fid) {
        interfacesAt(fid).forEach(function (iface) { touching.add(F.interface, iface.id); });
      });
    } else if (entity.kind === F.interface) {
      var i = model.interface(entity.id);
      if (!i) return { own: [], touching: [] };
      ownInterface(i);
      if (i.joint && model.joint(i.joint)) touching.add(F.joint, i.joint);
      (i.ends || []).forEach(function (fid) {
        dimensionsAt(fid).forEach(function (dim) { touching.add(F.dimension, dim.id); });
      });
    } else if (entity.kind === F.joint) {
      var j = model.joint(entity.id);
      if (!j) return { own: [], touching: [] };
      ownJoint(j);
      j.parts.forEach(function (pid) { if (model.part(pid)) touching.add(F.part, pid); });
    } else {
      return { own: [], touching: [] };
    }
    return {
      own: own.list,
      touching: touching.list.filter(function (e) { return !own.has(e.kind, e.id); }),
    };
  };

  // The bound faces of a light's features, per tier, each {sha256, faceId,
  // feature}: what the 3D pane overlays. A face is identity, not a value
  // (docs/ANNOTATION_SURFACE.md), and here it is only where to draw.
  VA.focusFacesOf = function (model, light) {
    var out = { own: [], touching: [] };
    if (!model || !light) return out;
    Object.keys(out).forEach(function (tier) {
      var seen = {};
      (light[tier] || []).forEach(function (e) {
        if (e.kind !== VA.FOCUS_KINDS.feature) return;
        model.bindingsOf(e.id).forEach(function (b) {
          var key = (b.event && b.event.geometry_key) || {};
          if (!key.source_step_sha256 || key.face_id === undefined || key.face_id === null) return;
          var k = key.source_step_sha256 + "#" + key.face_id;
          if (seen[k]) return;
          seen[k] = true;
          out[tier].push({ sha256: key.source_step_sha256, faceId: key.face_id, feature: e.id });
        });
      });
    });
    return out;
  };

  // The keys the DAG and the grid light, per tier: an element's own
  // (`node|<id>`, `edge|<id>`) and a part's or a body's container
  // (`part|<id>`, `body|<id>` -- its field or block on the DAG, its bracket
  // in the grid). A joint has no mark of its own. A node two parts share is
  // one key however many features are on it. Without a model an element
  // stands for itself.
  VA.FOCUS_CONTAINER_KINDS = Object.freeze({ part: "part", body: "body" });

  function elementKeysOfTier(model, list) {
    var out = [];
    var seen = {};
    var add = function (kind, id) {
      var key = VA.elementKey(kind, id);
      if (seen[key]) return;
      seen[key] = true;
      out.push(key);
    };
    (list || []).forEach(function (e) {
      if (e.kind === VA.FOCUS_KINDS.part || e.kind === VA.FOCUS_KINDS.body) {
        add(e.kind, e.id);
        return;
      }
      var el = VA.focusElementOf(model, e);
      if (el) add(el.kind, el.id);
    });
    return out;
  }

  VA.focusElementKeysOf = function (model, entity) {
    if (!entity) return { own: [], touching: [] };
    if (!model) return { own: [VA.elementKey(entity.kind, entity.id)], touching: [] };
    var light = VA.focusLightOf(model, entity);
    var own = elementKeysOfTier(model, light.own);
    return {
      own: own,
      touching: elementKeysOfTier(model, light.touching).filter(function (k) { return own.indexOf(k) === -1; }),
    };
  };

  // The tree rows an entity lights, per tier, as `<kind>:<id>` (a row's
  // data-nav-kind and data-nav-id). Every entity has a row, so this is the
  // light itself in the tree's spelling.
  VA.focusNavRowsOf = function (model, entity) {
    if (!model || !entity) return { own: [], touching: [] };
    var light = VA.focusLightOf(model, entity);
    var key = function (e) { return e.kind + ":" + e.id; };
    return { own: light.own.map(key), touching: light.touching.map(key) };
  };

  // The folds a tree row sits behind, outermost first, as the nav's own fold
  // keys (views/nav.js: `b:<body>`, `bp:<body>`, `bi:<body>`, `p:<part>`,
  // `j:<joint>`, `i:<interface>`). A feature is listed twice in the tree --
  // under its part, and as an end under each interface it is on -- so
  // `under` says which: an interface id puts it under that interface's fold,
  // else it is under its part. A joint with one constraint has no row of its
  // own (the interface's row stands where it would be), so no `j:` key.
  VA.navRowPath = function (model, kind, id, under) {
    if (!model) return [];
    var F = VA.FOCUS_KINDS;
    var bodyPath = function (bodyId, group) {
      return bodyId && model.body(bodyId) ? ["b:" + bodyId, group + ":" + bodyId] : [];
    };
    var jointPath = function (joint) {
      if (!joint) return [];
      var path = bodyPath(joint.within, "bi");
      if (model.constraintsOf(joint.id).length > 1) path.push("j:" + joint.id);
      return path;
    };
    if (kind === F.body) return [];
    if (kind === F.part) {
      var part = model.part(id);
      return part ? bodyPath(part.body, "bp") : [];
    }
    if (kind === F.joint) return jointPath(model.joint(id));
    if (kind === F.interface) {
      var iface = model.interface(id);
      return iface ? jointPath(model.joint(iface.joint)) : [];
    }
    if (kind === F.feature) {
      var f = model.feature(id);
      if (!f) return [];
      var host = under ? model.interface(under) : null;
      if (host && (host.ends || []).indexOf(f.id) !== -1) {
        return VA.navRowPath(model, F.interface, host.id).concat(["i:" + host.id]);
      }
      return VA.navRowPath(model, F.part, f.part).concat(["p:" + f.part]);
    }
    return [];
  };

  // Where each lit row is revealed, as {`<kind>:<id>`: [fold keys]} over both
  // tiers. A TOUCHING feature (the far feature of a part's neighbour) is
  // revealed under the lit interface it is an end of, not by opening the
  // part across the joint; an OWN feature under its part -- unless the lit
  // entity is itself an interface or a joint, whose own ends are revealed
  // under that interface, where the reader is looking. A dimension has no
  // row. The page opens every key on select (hover opens nothing: a closed
  // fold that holds a lit row wears a mark instead, VA.lightNavTree).
  VA.navRevealPaths = function (model, light, entity) {
    var out = {};
    if (!model || !light) return out;
    var F = VA.FOCUS_KINDS;
    var own = light.own || [];
    var touching = light.touching || [];
    var interfacesIn = function (list) {
      return list.filter(function (e) { return e.kind === F.interface; })
        .map(function (e) { return model.interface(e.id); }).filter(Boolean);
    };
    var hostAmong = function (ifaces, fid) {
      var host = ifaces.filter(function (i) { return (i.ends || []).indexOf(fid) !== -1; })[0];
      return host ? host.id : null;
    };
    var ownHosts = entity && (entity.kind === F.interface || entity.kind === F.joint) ? interfacesIn(own) : [];
    var allHosts = interfacesIn(own.concat(touching));
    var place = function (e, hosts) {
      if (e.kind === F.dimension) return;
      var under = e.kind === F.feature ? hostAmong(hosts, e.id) : null;
      out[e.kind + ":" + e.id] = VA.navRowPath(model, e.kind, e.id, under);
    };
    own.forEach(function (e) { place(e, ownHosts); });
    touching.forEach(function (e) { place(e, allHosts); });
    return out;
  };

  // The 3D pane's reading of a light: the parts with a mesh to glow, the
  // bound faces to overlay, and the elements the model layer emphasises, per
  // tier. Ids, never geometry -- the pane resolves a part to its mesh as it
  // does for every other verb. Null for no light.
  VA.sceneLightOf = function (model, entity) {
    if (!model || !entity) return null;
    var F = VA.FOCUS_KINDS;
    var light = VA.focusLightOf(model, entity);
    if (!light.own.length) return null;
    var faces = VA.focusFacesOf(model, light);
    var tier = function (list) {
      var parts = [];
      var nodes = [];
      var edges = [];
      list.forEach(function (e) {
        if (e.kind === F.part && model.hasMesh(e.id) && parts.indexOf(e.id) === -1) parts.push(e.id);
        var el = VA.focusElementOf(model, e);
        if (!el) return;
        var into = el.kind === "node" ? nodes : edges;
        if (into.indexOf(el.id) === -1) into.push(el.id);
      });
      return { parts: parts, nodes: nodes, edges: edges };
    };
    var own = tier(light.own);
    var touching = tier(light.touching);
    var strip = function (list) {
      return list.map(function (f) { return { sha256: f.sha256, faceId: f.faceId }; });
    };
    var not = function (list, mine) {
      return list.filter(function (id) { return mine.indexOf(id) === -1; });
    };
    return {
      own: { parts: own.parts, nodes: own.nodes, edges: own.edges, faces: strip(faces.own) },
      // A shared node is one node however many features are on it: a
      // touching feature of an own node is not a second, fainter node.
      touching: { parts: not(touching.parts, own.parts), nodes: not(touching.nodes, own.nodes),
        edges: not(touching.edges, own.edges), faces: strip(faces.touching) },
    };
  };

  // The one verb the page posts for both: `light <json>`, the hover's and
  // the selection's readings together, or `light clear`. One word of JSON
  // rather than a grammar of ids: the payload is a tree of lists, and the
  // pane parses it with AA.parseLight (apps/annotate/commands.js).
  VA.SCENE_LIGHT_VERB = "light";

  VA.sceneLightCommand = function (hover, select) {
    if (!hover && !select) return [VA.SCENE_LIGHT_VERB, "clear"];
    return [VA.SCENE_LIGHT_VERB, JSON.stringify({ hover: hover || null, select: select || null })];
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
