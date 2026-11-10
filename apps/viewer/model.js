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

  // The status of one feature: the fold over every edge end that meets its
  // node, bound winning over suggested over none. A binding or a proposal is
  // at THIS end when its `direction` names the end the node is on
  // (AA.sweepFeatureState applies the same end rule in the pane).
  function featureStatus(feature, edgesByNode, identity, identityIds) {
    var S = VA.FEATURE_STATUSES;
    var status = S.none;
    var edges = edgesByNode[feature.node] || [];
    for (var i = 0; i < edges.length; i++) {
      var edge = edges[i];
      var end = edge.from === feature.node ? VA.EDGE_ENDS.from : VA.EDGE_ENDS.to;
      var record = bindingRecord(identity, identityIds, edge.id);
      if (!record) continue;
      var bound = (record.bindings || []).some(function (b) { return b && b.direction === end; });
      if (bound) return S.bound;
      var proposed = (record.proposals || []).some(function (p) { return p && p.direction === end; });
      if (proposed) status = S.suggested;
    }
    return status;
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
    var featuresByNode = {};
    (view.features || []).forEach(function (feature) {
      status[feature.id] = featureStatus(feature, edgesByNode, identity, identityIds);
      (featuresByNode[feature.node] = featuresByNode[feature.node] || []).push(feature.id);
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
      // Does the part have an installed mesh the scene could draw?
      hasMesh: function (partId) {
        var p = parts[partId];
        return !!(p && p.mesh && p.mesh.installed);
      },
    };
    return model;
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
