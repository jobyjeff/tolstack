// The model in the scene (handoff the_model_is_drawn_in_the_scene): every
// node of the topology gets a 3D anchor and every edge a line between two of
// them, so the DAG the viewer draws in 2D is also drawn on the parts it is
// about.
//
// DOM-free, fetch-free and three.js-free, like sweep.js beside it: which
// point a node anchors at, which body it rides and where a line's ends are at
// a frame of the sweep are all decided here and checked by
// `node apps/annotate/run_tests.cjs`; scene.js only turns the answers into
// dots and lines.
//
// AN ANCHOR IS A PLACE TO DRAW, NEVER A VALUE. Nothing here is written into a
// binding, a stack or a fitted nominal, and the section centre below is a
// display rule Jeff chose (2026-10-26) so a hollow ring's line does not run
// through the hole in the middle of it -- not a measurement of any feature.
//
// ---------------------------------------------------------------------------
// Where a node anchors, in order (AA.MODEL_ANCHOR_SOURCES)
//
//   joint    the node IS one end of a two-force link the run solves (its
//            `geometry.features` say so): the solver's own joint point, read
//            off the frame unchanged. This is what keeps the pitch link and
//            tangential link lines exactly the stick figure's.
//   bound    a committed binding names the node's face: that face's fitted
//            point -- a ball's centre, a bore's axis point, a plane's
//            centroid -- at the occurrence the node's body anchors.
//   joint    (again) otherwise, in sweep mode, the node is an end of any
//            other joint the run solves (a slide, a hinge, the actuator):
//            the skeleton's own point for it, so a node the stick figure
//            draws is placed where it is drawn (AA.modelSkeletonEnds; the_
//            scene_draws_the_model_alone_and_every_node_it_places_has_a_
//            leader, 2026-11-08).
//   section  otherwise: the +X-bias section centre of the node's part (see
//            AA.modelPartSection). Several such nodes on one part are spread
//            up the stack axis across the cut's height in stack order, so a
//            part's linear stack reads as a ladder on its +X side.
//   origin   no geometry at all (no mesh installed, or the section plane
//            cuts nothing): UNPLACED -- no dot and no line is drawn
//            (AA.modelDrawnGraph), and the bar's head line counts them.
//
// And then, over the anchors: ends that are one JOINT -- concentric features
// on either side of an edge -- are drawn as one node (AA.modelJointGroups).
(function (AA) {
  "use strict";

  AA.MODEL_ANCHOR_SOURCES = Object.freeze(["joint", "bound", "section", "origin"]);
  AA.MODEL_ANCHOR_SOURCE_WORDS = Object.freeze({
    joint: "the solver's joint point",
    bound: "its bound face",
    section: "the part's +X-side section",
    origin: "no anchor geometry",
  });
  // Why an `origin` anchor has no geometry, in the same plain words.
  AA.MODEL_ORIGIN_WHY = Object.freeze({
    noMesh: "no mesh installed",
    noCut: "the section plane cuts nothing",
  });

  // What a selected node's anchor says, in one line: where it came from, and
  // -- for a ladder rung -- that its height is its place in the stack.
  AA.modelAnchorWords = function (anchor, joint) {
    if (!anchor) return null;
    if (joint && joint.members && joint.members.length > 1) {
      return "one joint: " + joint.members.length + " concentric ends share this node";
    }
    var words = AA.MODEL_ANCHOR_SOURCE_WORDS[anchor.source];
    if (anchor.source === AA.MODEL_ANCHOR_SOURCES[3] && anchor.why) words += " (" + anchor.why + ")";
    if (anchor.rung) words += ", rung " + (anchor.rung[0] + 1) + " of " + anchor.rung[1] + " in stack order";
    return words;
  };

  // What an unlit line does: the viewer's own two words (VA.UNLIT_STYLES),
  // posted by the shell. Dim is the default there and here.
  AA.MODEL_UNLIT_STYLES = Object.freeze(["dim", "hide"]);
  AA.MODEL_DEFAULT_UNLIT = "dim";
  // How a line is drawn: lit (full strength), dim, or not at all.
  AA.MODEL_LINE_STRENGTHS = Object.freeze(["full", "dim", "hidden"]);

  // --- the bias, authored per topology ---------------------------------------

  AA.MODEL_AXES = Object.freeze(["x", "y", "z"]);
  // Jeff's values (2026-10-26): bias toward +X, and Z is the linear stack.
  AA.MODEL_ANCHOR_BIAS_DEFAULT = Object.freeze({ bias: "+x", stack: "z" });

  // A topology's `anchor_bias`, read and checked: {bias: "+x"|"-y"|..., stack:
  // "x"|"y"|"z"} with the two on different axes. Absent is the default. A
  // value this function cannot read is the default too, and says so in
  // `problem` -- a typo in a display preference must not take the layer down.
  AA.readAnchorBias = function (topology) {
    var raw = topology && (topology.anchor_bias ||
      (topology.topology && topology.topology.anchor_bias));
    var problem = null;
    var pick = raw || AA.MODEL_ANCHOR_BIAS_DEFAULT;
    var m = /^([+-])([xyz])$/.exec(String(pick.bias == null ? "" : pick.bias).toLowerCase());
    var stack = String(pick.stack == null ? "" : pick.stack).toLowerCase();
    if (!m || AA.MODEL_AXES.indexOf(stack) === -1 || m[2] === stack) {
      problem = "anchor_bias " + JSON.stringify(raw) + " is not {bias: \"+x\", stack: \"z\"} " +
        "shaped, so the default is used";
      pick = AA.MODEL_ANCHOR_BIAS_DEFAULT;
      m = /^([+-])([xyz])$/.exec(pick.bias);
      stack = pick.stack;
    }
    var biasAxis = AA.MODEL_AXES.indexOf(m[2]);
    var stackAxis = AA.MODEL_AXES.indexOf(stack);
    return {
      bias: pick.bias, stack: stack,
      biasAxis: biasAxis, biasSign: m[1] === "-" ? -1 : 1, stackAxis: stackAxis,
      // The section plane is spanned by the bias and stack axes, so its
      // normal is the third one.
      normalAxis: 3 - biasAxis - stackAxis,
      problem: problem,
    };
  };

  // --- the section -----------------------------------------------------------
  //
  // One part occurrence's mesh cut by the plane `normalAxis = at` (in the
  // as-modelled assembly frame), as connected regions of the cut outline.
  // A ring cut through its axis gives two; a solid boss one; the hub, being
  // 286 solids, gives many.
  //
  // Connectivity is by POSITION, quantised: a mesh's vertices are per face,
  // so the cut through a ring's inner wall and the cut through its top face
  // share no vertex index -- only a coordinate. A point is computed from its
  // edge's two ends in a fixed (coordinate) order so the same edge seen from
  // two faces gives the same bits.
  //
  // Returns [{centroid, min, max, length, segments}] (segments as flat
  // [x0,y0,z0,x1,y1,z1,...] in the assembly frame), largest first.
  AA.MODEL_SECTION_QUANTUM = 1e-3; // mm
  AA.MODEL_SECTION_NUDGE = 1e-6;    // of the part's span along the plane's normal

  AA.sectionRegions = function (positions, indices, placement, normalAxis, at) {
    var p = placement && placement.length === 12 ? placement : AA.IDENTITY_PLACEMENT;
    var nv = Math.floor(positions.length / 3);
    var w = new Float64Array(nv * 3);
    for (var v = 0; v < nv; v++) {
      var x = positions[v * 3], y = positions[v * 3 + 1], z = positions[v * 3 + 2];
      w[v * 3] = p[0] * x + p[1] * y + p[2] * z + p[3];
      w[v * 3 + 1] = p[4] * x + p[5] * y + p[6] * z + p[7];
      w[v * 3 + 2] = p[8] * x + p[9] * y + p[10] * z + p[11];
    }
    var q = AA.MODEL_SECTION_QUANTUM;
    var keyOf = function (pt) {
      return Math.round(pt[0] / q) + "," + Math.round(pt[1] / q) + "," + Math.round(pt[2] / q);
    };
    var parent = {};
    var find = function (k) {
      while (parent[k] !== k) { parent[k] = parent[parent[k]]; k = parent[k]; }
      return k;
    };
    var join = function (a, b) {
      if (parent[a] === undefined) parent[a] = a;
      if (parent[b] === undefined) parent[b] = b;
      var ra = find(a), rb = find(b);
      if (ra !== rb) parent[ra] = rb;
    };
    // A vertex exactly ON the plane counts as above it: the usual half-open
    // rule, so a cut through a row of vertices still yields segments and
    // never a zero-length pair at every vertex.
    var side = function (i) { return w[i * 3 + normalAxis] - at >= 0; };
    var cut = function (i, j) {
      var a = i, b = j;
      // Fixed order by coordinates, so the same edge gives the same point
      // from either face that carries it.
      for (var c = 0; c < 3; c++) {
        if (w[a * 3 + c] !== w[b * 3 + c]) {
          if (w[a * 3 + c] > w[b * 3 + c]) { var t0 = a; a = b; b = t0; }
          break;
        }
      }
      var da = w[a * 3 + normalAxis] - at, db = w[b * 3 + normalAxis] - at;
      var t = da / (da - db);
      return [w[a * 3] + (w[b * 3] - w[a * 3]) * t,
        w[a * 3 + 1] + (w[b * 3 + 1] - w[a * 3 + 1]) * t,
        w[a * 3 + 2] + (w[b * 3 + 2] - w[a * 3 + 2]) * t];
    };
    var segs = [];
    var nt = Math.floor(indices.length / 3);
    for (var tr = 0; tr < nt; tr++) {
      var i0 = indices[tr * 3], i1 = indices[tr * 3 + 1], i2 = indices[tr * 3 + 2];
      var s0 = side(i0), s1 = side(i1), s2 = side(i2);
      if (s0 === s1 && s1 === s2) continue;
      var pts = [];
      if (s0 !== s1) pts.push(cut(i0, i1));
      if (s1 !== s2) pts.push(cut(i1, i2));
      if (s2 !== s0) pts.push(cut(i2, i0));
      if (pts.length !== 2) continue;
      var ka = keyOf(pts[0]), kb = keyOf(pts[1]);
      join(ka, kb);
      segs.push({ a: pts[0], b: pts[1], key: ka });
    }
    var byRoot = {};
    var order = [];
    segs.forEach(function (s) {
      var r = find(s.key);
      if (!byRoot[r]) {
        byRoot[r] = { sum: [0, 0, 0], length: 0, min: [Infinity, Infinity, Infinity],
          max: [-Infinity, -Infinity, -Infinity], segments: [] };
        order.push(r);
      }
      var g = byRoot[r];
      var len = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1], s.b[2] - s.a[2]);
      for (var c = 0; c < 3; c++) {
        g.sum[c] += (s.a[c] + s.b[c]) / 2 * len;
        g.min[c] = Math.min(g.min[c], s.a[c], s.b[c]);
        g.max[c] = Math.max(g.max[c], s.a[c], s.b[c]);
      }
      g.length += len;
      g.segments.push(s.a[0], s.a[1], s.a[2], s.b[0], s.b[1], s.b[2]);
    });
    return order.map(function (r) {
      var g = byRoot[r];
      var centroid = g.length > 0
        ? [g.sum[0] / g.length, g.sum[1] / g.length, g.sum[2] / g.length]
        : [(g.min[0] + g.max[0]) / 2, (g.min[1] + g.max[1]) / 2, (g.min[2] + g.max[2]) / 2];
      return { centroid: centroid, min: g.min, max: g.max, length: g.length, segments: g.segments };
    }).sort(function (a, b) { return b.length - a.length; });
  };

  // The bias-most region: the one whose centroid sits furthest along the bias
  // direction (+X: the largest x). Null for no regions.
  AA.biasRegion = function (regions, bias) {
    var best = null;
    (regions || []).forEach(function (r) {
      var score = r.centroid[bias.biasAxis] * bias.biasSign;
      if (!best || score > best.score) best = { region: r, score: score };
    });
    return best ? best.region : null;
  };

  // Where the plane is: through the centre of the occurrence's own bounding
  // box along the normal axis. Not through the body's frame origin -- every
  // body's frame here IS the assembly frame (a sweep pose maps the
  // as-modelled assembly frame onto itself), and the plane through its
  // origin misses a part that sits off the mid-plane, like the pitch link.
  AA.sectionPlaneAt = function (positions, placement, normalAxis) {
    var p = placement && placement.length === 12 ? placement : AA.IDENTITY_PLACEMENT;
    var lo = Infinity, hi = -Infinity;
    var r = normalAxis * 4;
    for (var v = 0; v + 2 < positions.length; v += 3) {
      var c = p[r] * positions[v] + p[r + 1] * positions[v + 1] + p[r + 2] * positions[v + 2] + p[r + 3];
      if (c < lo) lo = c;
      if (c > hi) hi = c;
    }
    // Nudged off the exact middle by a millionth of the span: a mesh that is
    // symmetric about its mid-plane has a row of vertices ON it, and a seam
    // whose two copies of that row sit at +0 and -1e-16 is cut on neither
    // side -- measured on the ring check in run_tests.cjs, which lost its +X
    // wall that way.
    return lo <= hi ? (lo + hi) / 2 + (hi - lo) * AA.MODEL_SECTION_NUDGE : null;
  };

  // One part occurrence's whole section answer, for app.js to cache per
  // (mesh, occurrence): the plane, the bias-most region, how many regions the
  // cut made, and the cut's full extent along the stack axis -- the ladder's
  // span. The span is the whole cut's and not the chosen region's because a
  // many-solid part's +X-most region can be one small boss (the hub's is
  // 12 mm tall in a part 148 mm tall), and a ladder squeezed into it says
  // nothing about the stack it stands for. Null when the plane cuts nothing.
  AA.modelPartSection = function (positions, indices, placement, bias) {
    var at = AA.sectionPlaneAt(positions, placement, bias.normalAxis);
    if (at === null) return null;
    var regions = AA.sectionRegions(positions, indices, placement, bias.normalAxis, at);
    var region = AA.biasRegion(regions, bias);
    if (!region) return null;
    // Every region's extent, per axis: the stack span, and the faint plane
    // a selection draws (the normal axis's span is the plane itself).
    var bounds = [[Infinity, -Infinity], [Infinity, -Infinity], [Infinity, -Infinity]];
    regions.forEach(function (r) {
      for (var c = 0; c < 3; c++) {
        bounds[c][0] = Math.min(bounds[c][0], r.min[c]);
        bounds[c][1] = Math.max(bounds[c][1], r.max[c]);
      }
    });
    bounds[bias.normalAxis] = [at, at];
    return { at: at, region: region, regions: regions.length,
      stackRange: bounds[bias.stackAxis].slice(), bounds: bounds };
  };

  // --- which body a node is on ----------------------------------------------

  // {node id: {part, body}}: a node's part is the first it lists (a mating
  // surface lists both of its parts; the first is the one it is named for),
  // and its body is the topology body that lists that part, or null.
  AA.modelNodeHomes = function (topology) {
    var bodyOf = {};
    ((topology && topology.bodies) || []).forEach(function (b) {
      (b.parts || []).forEach(function (part) { if (!bodyOf[part]) bodyOf[part] = b.id; });
    });
    var out = {};
    ((topology && topology.nodes) || []).forEach(function (n) {
      var part = (n.parts || [])[0] || null;
      out[n.id] = { part: part, body: part ? bodyOf[part] || null : null };
    });
    return out;
  };

  // The nodes a run's geometry names as an end of one of its two-force links:
  // {node id: {joint, end}} with `end` one of AA.SWEEP_JOINT_ENDS.
  AA.modelLinkEnds = function (artifact) {
    var links = {};
    ((artifact && artifact.links) || []).forEach(function (l) { links[l.joint] = true; });
    var out = {};
    ((artifact && artifact.features) || []).forEach(function (f) {
      if (!f || !f.node || typeof f.label !== "string") return;
      var m = /^([^.]+)\.point_([ab])\[/.exec(f.label);
      if (!m || !links[m[1]] || out[f.node]) return;
      out[f.node] = { joint: m[1], end: m[2] === "a" ? AA.SWEEP_JOINT_ENDS[0] : AA.SWEEP_JOINT_ENDS[1] };
    });
    return out;
  };

  // Every node a run's geometry names as an end of ANY joint it solves --
  // links, slides, hinges, the actuator -- in the same shape: the skeleton
  // draws a point for each, and a node with no better anchor sits there. A
  // node named at two joints, or at both ends of one, keeps the first.
  AA.modelSkeletonEnds = function (artifact) {
    var out = {};
    ((artifact && artifact.features) || []).forEach(function (f) {
      if (!f || !f.node || typeof f.label !== "string" || out[f.node]) return;
      var m = /^([^.]+)\.point_([ab])\[/.exec(f.label);
      if (!m) return;
      out[f.node] = { joint: m[1], end: m[2] === "a" ? AA.SWEEP_JOINT_ENDS[0] : AA.SWEEP_JOINT_ENDS[1] };
    });
    return out;
  };

  // A part's section-anchored nodes, in stack order: the structural edges of
  // THAT part between them, followed from `from` to `to` (Kahn's order, ties
  // and the unconnected in the topology's own node order). This is the
  // ladder's order and nothing more -- a rung's height is its place in the
  // stack, not where its feature is.
  AA.modelStackOrder = function (topology, part, nodeIds) {
    var wanted = {};
    nodeIds.forEach(function (id) { wanted[id] = true; });
    var rank = {};
    ((topology && topology.nodes) || []).forEach(function (n, i) { rank[n.id] = i; });
    var incoming = {}, next = {};
    nodeIds.forEach(function (id) { incoming[id] = 0; next[id] = []; });
    ((topology && topology.edges) || []).forEach(function (e) {
      if (e.kind !== "structural" || e.part !== part) return;
      if (!wanted[e.from] || !wanted[e.to] || e.from === e.to) return;
      next[e.from].push(e.to);
      incoming[e.to]++;
    });
    var byRank = function (a, b) { return (rank[a] || 0) - (rank[b] || 0); };
    var ready = nodeIds.filter(function (id) { return !incoming[id]; }).sort(byRank);
    var out = [];
    while (ready.length) {
      var id = ready.shift();
      out.push(id);
      next[id].forEach(function (to) {
        if (--incoming[to] === 0) { ready.push(to); ready.sort(byRank); }
      });
    }
    // A cycle leaves nodes unplaced; they go last, in node order.
    nodeIds.slice().sort(byRank).forEach(function (id) {
      if (out.indexOf(id) === -1) out.push(id);
    });
    return out;
  };

  // --- the anchors -----------------------------------------------------------
  //
  // `input`:
  //   topology       the projection's topology entry
  //   bias           AA.readAnchorBias's answer
  //   linkEnds       AA.modelLinkEnds's answer ({} in bind mode)
  //   skeletonEnds   AA.modelSkeletonEnds's answer ({} in bind mode): read
  //                  after `bound`, before the section
  //   parts          {part id: {subject, section: AA.modelPartSection's
  //                   answer | null, origin, why}} -- per topology part, what
  //                   app.js read:
  //                   which sweep subject carries its anchored occurrence
  //                   (null: it does not move), its bias region, the body's
  //                   frame origin, and why there is no region when there is
  //                   none
  //   bound          {node id: [x, y, z] as-modelled} -- fitted points
  //
  // Returns {node id: {source, part, body, subject, point, joint?, end?,
  // section?: {normalAxis, at, region}, rung?: [i, n]}}. `point` is in the
  // as-modelled assembly frame; a `joint` anchor's point is the frame's own
  // and AA.modelWorldPoints reads it there.
  AA.modelAnchors = function (input) {
    var topology = input.topology;
    var homes = AA.modelNodeHomes(topology);
    var parts = input.parts || {};
    var bound = input.bound || {};
    var linkEnds = input.linkEnds || {};
    var skeletonEnds = input.skeletonEnds || {};
    var bias = input.bias;
    var out = {};
    var onSection = {};
    ((topology && topology.nodes) || []).forEach(function (n) {
      var home = homes[n.id];
      var info = (home.part && parts[home.part]) || {};
      var base = { part: home.part, body: home.body, subject: info.subject || null };
      if (linkEnds[n.id]) {
        out[n.id] = Object.assign(base, { source: "joint", joint: linkEnds[n.id].joint,
          end: linkEnds[n.id].end, point: null });
        return;
      }
      if (bound[n.id]) {
        out[n.id] = Object.assign(base, { source: "bound", point: bound[n.id].slice() });
        return;
      }
      if (skeletonEnds[n.id]) {
        out[n.id] = Object.assign(base, { source: "joint", joint: skeletonEnds[n.id].joint,
          end: skeletonEnds[n.id].end, point: null });
        return;
      }
      if (info.section && info.section.region) {
        (onSection[home.part] = onSection[home.part] || []).push(n.id);
        out[n.id] = Object.assign(base, { source: "section",
          point: info.section.region.centroid.slice(),
          section: { normalAxis: bias.normalAxis, at: info.section.at, region: info.section.region } });
        return;
      }
      out[n.id] = Object.assign(base, { source: "origin",
        point: (info.origin || [0, 0, 0]).slice(), why: info.why || null });
    });
    // The ladder: a part with more than one section anchor spreads them up
    // the stack axis across its region, evenly, in stack order.
    Object.keys(onSection).forEach(function (part) {
      var ids = onSection[part];
      if (ids.length < 2) return;
      var ordered = AA.modelStackOrder(topology, part, ids);
      var span = parts[part].section.stackRange;
      var lo = span[0], hi = span[1];
      ordered.forEach(function (id, i) {
        out[id].point[bias.stackAxis] = lo + (hi - lo) * (i + 1) / (ordered.length + 1);
        out[id].rung = [i, ordered.length];
      });
    });
    return out;
  };

  // --- a joint is one node (handoff coaxial_ends_share_one_3d_node) ---------
  //
  // Jeff's ruling (2026-11-03): a joint whose features are concentric -- a
  // bore and the bushing in it, a spindle and the plate that slides on it, a
  // ball and the seat it turns in -- is ONE node in the scene. Its internal
  // components (a bushing's thickness, a clearance to a fastener, a
  // coaxiality) are 2D-only edges: they have no length to show in 3D. Edges
  // leaving the joint attach to the one node.
  //
  // Only a FEATURE can merge, never a drawing placement: a node has feature
  // geometry when the solver places it (a run's joint end: a point, and the
  // joint's axis when it has one) or a committed binding names a round face
  // (a bore's axis, a ball's centre). A section rung or a body origin is a
  // place to draw and says nothing about where the feature is, so it never
  // merges. A flat face does not merge either: a stack of flat faces round a
  // bolt or up the hub is a linear stack, which is what the ladder draws.
  //
  // Two ends of ONE edge merge when (both measured in the as-modelled frame):
  //   axis + axis    the axes are parallel within MODEL_JOINT_ANGLE_DEG and
  //                  each axis point is within MODEL_JOINT_DISTANCE_MM of the
  //                  other's axis line (coaxial: the distance ALONG the axis
  //                  is free -- the plate slides 64 mm up the spindle);
  //   axis + point   the point is within MODEL_JOINT_DISTANCE_MM of the axis;
  //   point + point  the two are within MODEL_JOINT_DISTANCE_MM (coincident).
  // Merges chain across edges (a bushing in a bearing in a bore), but never
  // into a group holding an axis that is not parallel to the incoming one: two
  // axes that only cross at a point (the spindle and the blade's pitch axis,
  // both through the assembly origin) are two joints.
  //
  // The two thresholds and the P2 measurements that set them are in
  // docs/sessions/lessons/LESSONS_20261103_coaxial_ends_share_one_3d_node.md.
  AA.MODEL_JOINT_ANGLE_DEG = 2;   // degrees between two axes
  AA.MODEL_JOINT_DISTANCE_MM = 1; // mm, a point off an axis or off a point

  var vsub = function (a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; };
  var vdot = function (a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; };
  var vnorm = function (a) { return Math.sqrt(vdot(a, a)); };
  var vunit = function (a) { var n = vnorm(a); return n > 0 ? [a[0] / n, a[1] / n, a[2] / n] : null; };
  // A point's distance from the line through `at` along unit `dir`.
  var offAxis = function (p, at, dir) {
    var d = vsub(p, at);
    var along = vdot(d, dir);
    return vnorm([d[0] - dir[0] * along, d[1] - dir[1] * along, d[2] - dir[2] * along]);
  };

  // The solver's features, from the run's as-modelled frame (where every
  // pose is identity, so a joint end's world point IS its as-modelled one):
  // {node id: {point, axis | null, joint, end, from: "solver"}}. A node the
  // run names at two joints (the actuator repeats the plate slide's ends)
  // keeps the first. A run with no feature joins, or no as-modelled frame,
  // places nothing.
  AA.modelSolverFeatures = function (artifact) {
    var out = {};
    var index = artifact && artifact.points && artifact.points.length
      ? AA.sweepAsModelledIndex(artifact) : null;
    if (index === null || index === undefined) return out;
    var frame = AA.sweepFrameAt(artifact, index);
    ((artifact && artifact.features) || []).forEach(function (f) {
      if (!f || !f.node || typeof f.label !== "string" || out[f.node]) return;
      var m = /^([^.]+)\.point_([ab])\[/.exec(f.label);
      if (!m) return;
      var joint = frame.joints && frame.joints[m[1]];
      var end = m[2] === "a" ? AA.SWEEP_JOINT_ENDS[0] : AA.SWEEP_JOINT_ENDS[1];
      if (!joint || !joint[end]) return;
      out[f.node] = { point: joint[end].slice(), axis: joint.axis_world ? vunit(joint.axis_world) : null,
        joint: m[1], end: end, from: "solver" };
    });
    return out;
  };

  // A bound face's feature, in the as-modelled assembly frame: a bore's axis
  // (its axis point, and its direction turned by the placement), a ball's
  // centre. A flat face, or a face the classifier could not read, is none.
  AA.modelBoundFeature = function (face, placement) {
    var p = placement && placement.length === 12 ? placement : AA.IDENTITY_PLACEMENT;
    if (!face) return null;
    if (face.surface === "cylindrical" && face.axisPoint && face.axis) {
      var a = face.axis;
      var axis = vunit([p[0] * a[0] + p[1] * a[1] + p[2] * a[2],
        p[4] * a[0] + p[5] * a[1] + p[6] * a[2], p[8] * a[0] + p[9] * a[1] + p[10] * a[2]]);
      return { point: AA.applyPlacement(p, face.axisPoint), axis: axis, radius: face.radius || null,
        from: "bound" };
    }
    if (face.surface === "spherical" && face.centre) {
      return { point: AA.applyPlacement(p, face.centre), axis: null, radius: face.radius || null,
        from: "bound" };
    }
    return null;
  };

  // Two features measured against each other: {angleDeg, distanceMm, merge}.
  // `angleDeg` is null unless both have an axis.
  AA.modelJointMeasure = function (a, b) {
    var angle = null, distance;
    if (a.axis && b.axis) {
      var c = Math.min(1, Math.abs(vdot(a.axis, b.axis)));
      angle = Math.acos(c) * 180 / Math.PI;
      distance = Math.max(offAxis(b.point, a.point, a.axis), offAxis(a.point, b.point, b.axis));
    } else if (a.axis || b.axis) {
      distance = a.axis ? offAxis(b.point, a.point, a.axis) : offAxis(a.point, b.point, b.axis);
    } else {
      distance = vnorm(vsub(a.point, b.point));
    }
    var merge = distance <= AA.MODEL_JOINT_DISTANCE_MM &&
      (angle === null || angle <= AA.MODEL_JOINT_ANGLE_DEG);
    return { angleDeg: angle, distanceMm: distance, merge: merge };
  };

  // The joints: {groups: [{id, members, axis}], of: {node id: group id},
  // measured: [{edge, from, to, angleDeg, distanceMm, merge}]}. A group's id
  // is its first member in the topology's own node order; a node in no
  // group is in `of` as nothing. `measured` is every edge whose two ends both
  // have a feature -- what the lesson's calibration table is read off.
  AA.modelJointGroups = function (topology, features) {
    var feats = features || {};
    var rank = {};
    ((topology && topology.nodes) || []).forEach(function (n, i) { rank[n.id] = i; });
    var parent = {};
    var axisOf = {};
    var find = function (k) {
      while (parent[k] !== k) { parent[k] = parent[parent[k]]; k = parent[k]; }
      return k;
    };
    var root = function (id) {
      if (parent[id] === undefined) { parent[id] = id; axisOf[id] = feats[id].axis || null; }
      return find(id);
    };
    var measured = [];
    ((topology && topology.edges) || []).forEach(function (e) {
      var a = feats[e.from], b = feats[e.to];
      if (!a || !b || e.from === e.to) return;
      var m = AA.modelJointMeasure(a, b);
      measured.push({ edge: e.id, from: e.from, to: e.to, angleDeg: m.angleDeg,
        distanceMm: m.distanceMm, merge: m.merge });
      if (!m.merge) return;
      var ra = root(e.from), rb = root(e.to);
      if (ra === rb) return;
      var xa = axisOf[ra], xb = axisOf[rb];
      // Two joints that only cross at a point stay two.
      if (xa && xb && Math.acos(Math.min(1, Math.abs(vdot(xa, xb)))) * 180 / Math.PI >
          AA.MODEL_JOINT_ANGLE_DEG) return;
      var keep = (rank[ra] || 0) <= (rank[rb] || 0) ? ra : rb;
      var drop = keep === ra ? rb : ra;
      parent[drop] = keep;
      axisOf[keep] = axisOf[keep] || axisOf[drop];
    });
    var members = {};
    Object.keys(parent).forEach(function (id) {
      (members[find(id)] = members[find(id)] || []).push(id);
    });
    var groups = [];
    var of = {};
    Object.keys(members).forEach(function (r) {
      var list = members[r].sort(function (x, y) { return (rank[x] || 0) - (rank[y] || 0); });
      if (list.length < 2) return;
      var group = { id: list[0], members: list, axis: axisOf[r] };
      groups.push(group);
      list.forEach(function (id) { of[id] = group.id; });
    });
    groups.sort(function (x, y) { return (rank[x.id] || 0) - (rank[y.id] || 0); });
    return { groups: groups, of: of, measured: measured };
  };

  // One frame's world point per joint: the mean of its members' feature
  // points, each where the frame puts it -- a solver end read off the frame
  // unchanged, a bound face through its node's subject pose. Members of one
  // joint are concentric, so the mean is on their common axis (or at their
  // common centre). With no frame (bind mode) every point is as-modelled.
  // `anchors` supplies each member's subject. {group id: [x, y, z]}.
  AA.modelJointWorldPoints = function (joints, features, anchors, frame) {
    var out = {};
    ((joints && joints.groups) || []).forEach(function (g) {
      var sum = [0, 0, 0], n = 0;
      g.members.forEach(function (id) {
        var f = features[id];
        if (!f) return;
        var p = null;
        if (f.from === "solver" && frame && frame.joints) {
          var j = frame.joints[f.joint];
          p = j && j[f.end] ? j[f.end] : null;
        } else {
          var subject = anchors && anchors[id] ? anchors[id].subject : null;
          var pose = frame && subject
            ? ((frame.links && frame.links[subject]) || (frame.poses && frame.poses[subject]) || null)
            : null;
          p = pose ? AA.applyPlacement(AA.poseToPlacement(pose), f.point) : f.point;
        }
        if (!p) return;
        sum[0] += p[0]; sum[1] += p[1]; sum[2] += p[2]; n++;
      });
      out[g.id] = n ? [sum[0] / n, sum[1] / n, sum[2] / n] : null;
    });
    return out;
  };

  // A node is PLACED when it has anchor geometry: every source but `origin`.
  // An unplaced node draws no dot and no line (it used to sit at its body's
  // frame origin -- the assembly origin, for every body here -- and every
  // edge touching one fanned out of the hub's centre).
  AA.modelPlaced = function (anchor) {
    return !!anchor && anchor.source !== AA.MODEL_ANCHOR_SOURCES[3];
  };

  // What the scene draws, from the anchors and the joints: one dot per
  // placed node that is in no joint, one per joint (keyed by the joint's id,
  // listing its members), and a line per edge whose two ends are placed and
  // are not the same joint -- with its ends renamed to the joints they meet.
  // A line touching a joint is a world line (body null): a joint's point is
  // the mean of ends that may ride different bodies. `unplaced` is the ids
  // with no anchor geometry, in node order.
  // Returns {dots: {id: {members: [ids] | null}}, lines: {edge id: {from, to,
  // kind, body}}, hidden: [edge ids internal to a joint], unplaced: [ids]}.
  AA.modelDrawnGraph = function (topology, anchors, joints) {
    var of = (joints && joints.of) || {};
    var dots = {};
    var unplaced = [];
    var groupOf = {};
    ((joints && joints.groups) || []).forEach(function (g) { groupOf[g.id] = g; });
    // In node order: a joint's dot where its first member stands.
    ((topology && topology.nodes) || []).forEach(function (n) {
      if (groupOf[n.id]) { dots[n.id] = { members: groupOf[n.id].members.slice() }; return; }
      if (of[n.id]) return;
      var a = anchors[n.id];
      if (!AA.modelPlaced(a)) { if (a) unplaced.push(n.id); return; }
      dots[n.id] = { members: null };
    });
    var base = AA.modelEdgeLines(topology, anchors);
    var lines = {};
    var hidden = [];
    Object.keys(base).forEach(function (id) {
      var line = base[id];
      var from = of[line.from] || line.from, to = of[line.to] || line.to;
      if (!dots[from] || !dots[to]) return;
      if (from === to) { hidden.push(id); return; }
      // A joint's id is its first member's, so ask membership, not renaming.
      var joined = !!(of[line.from] || of[line.to]);
      lines[id] = { from: from, to: to, kind: line.kind, body: joined ? null : line.body };
    });
    return { dots: dots, lines: lines, hidden: hidden, unplaced: unplaced };
  };

  // The hollow markers: an agent's proposed point per node, beside the anchor
  // the node actually has -- {node id: {subject, point}}. A node anchored at
  // a solver joint or at a binding already has its answer and gets none; a
  // proposal NEVER replaces an anchor (the scene moves only on an accept).
  // `proposedPoints` is {node id: [x, y, z]}, read from open proposals exactly
  // as `bound` is read from bindings.
  AA.modelProposedAnchors = function (anchors, proposedPoints) {
    var out = {};
    Object.keys(proposedPoints || {}).forEach(function (id) {
      var a = anchors[id];
      if (!a || a.source === AA.MODEL_ANCHOR_SOURCES[0] || a.source === AA.MODEL_ANCHOR_SOURCES[1]) return;
      out[id] = { subject: a.subject, point: proposedPoints[id].slice() };
    });
    return out;
  };

  // Every edge's two ends, by node: {edge id: {from, to, kind, body}} where
  // `body` is the body both ends ride when they ride the same one (the
  // structural line drawn in that body's frame), else null (a joint line,
  // between two bodies, recomputed in world every frame).
  AA.modelEdgeLines = function (topology, anchors) {
    var out = {};
    ((topology && topology.edges) || []).forEach(function (e) {
      var a = anchors[e.from], b = anchors[e.to];
      if (!a || !b) return;
      out[e.id] = { from: e.from, to: e.to, kind: e.kind,
        body: a.subject === b.subject && a.source !== "joint" && b.source !== "joint"
          ? (a.subject || "") : null };
    });
    return out;
  };

  // One frame's world point per node: a `joint` anchor reads the frame's own
  // joint end, untouched (the stick figure's numbers, bit for bit); every
  // other anchor goes through its subject's pose -- a link's reconstructed
  // pose, else a body's -- the way AA.sweepMeshMatrices moves its mesh. With
  // no frame (bind mode) every point is its as-modelled self, and a `joint`
  // anchor has none.
  AA.modelWorldPoints = function (anchors, frame) {
    var out = {};
    Object.keys(anchors).forEach(function (id) {
      var a = anchors[id];
      if (a.source === "joint") {
        var j = frame && frame.joints && frame.joints[a.joint];
        out[id] = j && j[a.end] ? j[a.end] : null;
        return;
      }
      var pose = frame && a.subject
        ? ((frame.links && frame.links[a.subject]) || (frame.poses && frame.poses[a.subject]) || null)
        : null;
      out[id] = pose ? AA.applyPlacement(AA.poseToPlacement(pose), a.point) : a.point.slice();
    });
    return out;
  };

  // The body a subject's pose is, in the body's own frame, as a placement:
  // identity with no pose. scene.js puts a body's structural lines in a group
  // carrying exactly this, so they ride the sweep with the body.
  AA.modelSubjectPlacement = function (frame, subject) {
    var pose = frame && subject
      ? ((frame.links && frame.links[subject]) || (frame.poses && frame.poses[subject]) || null)
      : null;
    return AA.poseToPlacement(pose);
  };

  // How one edge is drawn: `lit` is {edge id: true} or null ("nothing
  // emphasised": every line full strength).
  AA.modelLineStrength = function (edgeId, lit, unlit) {
    if (!lit || lit[edgeId]) return AA.MODEL_LINE_STRENGTHS[0];
    return unlit === AA.MODEL_UNLIT_STYLES[1] ? AA.MODEL_LINE_STRENGTHS[2] : AA.MODEL_LINE_STRENGTHS[1];
  };

  // ...and a node: lit when any lit edge stands on it; with nothing lit,
  // every node is.
  AA.modelLitNodes = function (topology, lit) {
    if (!lit) return null;
    var out = {};
    ((topology && topology.edges) || []).forEach(function (e) {
      if (!lit[e.id]) return;
      out[e.from] = true;
      out[e.to] = true;
    });
    return out;
  };

  // The nodes a grid row's emphasis lights: the edge's two ends, read off
  // the topology whether or not the edge is drawn. An edge inside a joint
  // draws no line (coaxial_ends_share_one_3d_node), and its row still lights
  // the joint's one dot -- the scene resolves each end to the dot that stands
  // for it, and an unplaced end to nothing.
  AA.modelEmphasisNodes = function (topology, edgeId) {
    var out = [];
    ((topology && topology.edges) || []).forEach(function (e) {
      if (e.id !== edgeId) return;
      out.push(e.from, e.to);
    });
    return out;
  };

  // The `model` verb's grammar:
  //   model lit <edge> [<edge> ...]   the shell's lit set
  //   model lit all                   nothing emphasised
  //   model unlit dim|hide            what the rest does
  //   model select node|body <id>     show why an anchor is where it is
  //   model select clear
  //   model anchors                   post the anchors message now, even
  //                                   unchanged (a shell that dropped its copy)
  //   model tint <part>=<#rrggbb> ... each part in its body's colour, the
  //                                   shell's DAG ink (the_dag_is_coloured_by_
  //                                   a_chosen_attribute_and_spaced_to_taste)
  //   model tint off                  every part back to its own colour
  AA.MODEL_VERB_ACTIONS = Object.freeze(["lit", "unlit", "select", "anchors", "tint"]);
  AA.MODEL_SELECT_KINDS = Object.freeze(["node", "body", "clear"]);
  AA.parseModelVerb = function (args) {
    var list = (args || []).map(function (a) { return String(a); });
    var action = list[0];
    if (AA.MODEL_VERB_ACTIONS.indexOf(action) === -1) {
      throw new Error("model takes " + AA.MODEL_VERB_ACTIONS.join(" or ") +
        ", got " + JSON.stringify(action == null ? null : action));
    }
    if (action === AA.MODEL_VERB_ACTIONS[3]) return { action: action };
    if (action === AA.MODEL_VERB_ACTIONS[4]) {
      if (list.length === 2 && list[1] === "off") return { action: action, tints: null };
      if (list.length < 2) throw new Error("model tint takes part=#rrggbb pairs, or off");
      var tints = {};
      list.slice(1).forEach(function (pair) {
        var m = /^([^=]+)=(#[0-9a-fA-F]{6})$/.exec(pair);
        if (!m) throw new Error("model tint takes part=#rrggbb, got " + JSON.stringify(pair));
        tints[m[1]] = m[2].toLowerCase();
      });
      return { action: action, tints: tints };
    }
    if (action === AA.MODEL_VERB_ACTIONS[2]) {
      var kind = list[1];
      if (AA.MODEL_SELECT_KINDS.indexOf(kind) === -1) {
        throw new Error("model select takes " + AA.MODEL_SELECT_KINDS.join(", "));
      }
      if (kind === AA.MODEL_SELECT_KINDS[2]) return { action: action, select: null };
      if (!list[2]) throw new Error("model select " + kind + " needs an id");
      return { action: action, select: { kind: kind, id: list[2] } };
    }
    if (action === AA.MODEL_VERB_ACTIONS[1]) {
      if (AA.MODEL_UNLIT_STYLES.indexOf(list[1]) === -1) {
        throw new Error("model unlit takes " + AA.MODEL_UNLIT_STYLES.join(" or "));
      }
      return { action: action, unlit: list[1] };
    }
    if (list.length === 2 && list[1] === "all") return { action: action, lit: null };
    if (list.length < 2) throw new Error("model lit takes edge ids, or all");
    var lit = {};
    list.slice(1).forEach(function (id) { lit[id] = true; });
    return { action: action, lit: lit };
  };

  // The anchors message the shell draws its leaders from, rounded to a tenth
  // of a CSS pixel so a still scene posts the same bytes twice and the second
  // is dropped. `screen` is {node id: [x, y] | null}; an edge is reported only
  // when it is drawn and both its ends are on screen.
  AA.ANCHORS_MESSAGE = "annotate:anchors";

  // The anchor under the pointer, and the anchor clicked, out to the shell
  // (handoff a_preview_pane_replaces_the_hover_popups_and_one_record_backs_
  // every_mark): the shell previews the first in its right-hand pane and
  // freezes it on the second, so a 3D anchor presents the same record a DAG
  // dot and a grid row do. {kind, id} -- the shell's own element key -- and
  // both null off every anchor. Paired with the shell's VA.SCENE_HOVER_MESSAGE
  // and VA.SCENE_PICK_MESSAGE by the literal both tiers assert.
  AA.HOVER_MESSAGE = "annotate:hover";
  AA.PICK_MESSAGE = "annotate:pick";
  // A joint's dot stands for several nodes: `members` lists them all (the
  // joint's own id first), so the shell lights every one; absent otherwise.
  AA.modelHoverMessage = function (nodeId, members) {
    var out = { type: AA.HOVER_MESSAGE, kind: nodeId ? AA.MODEL_SELECT_KINDS[0] : null,
                id: nodeId || null };
    if (nodeId && members && members.length > 1) out.members = members.slice();
    return out;
  };
  AA.modelPickMessage = function (nodeId) {
    return { type: AA.PICK_MESSAGE, kind: AA.MODEL_SELECT_KINDS[0], id: nodeId };
  };
  AA.modelAnchorsMessage = function (lines, screen, strengths) {
    var round = function (p) { return p ? [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10] : null; };
    var nodes = {};
    Object.keys(screen).sort().forEach(function (id) { nodes[id] = round(screen[id]); });
    var edges = {};
    Object.keys(lines).sort().forEach(function (id) {
      if (strengths && strengths[id] === AA.MODEL_LINE_STRENGTHS[2]) return;
      var a = nodes[lines[id].from], b = nodes[lines[id].to];
      if (a && b) edges[id] = [a, b];
    });
    return { type: AA.ANCHORS_MESSAGE, nodes: nodes, edges: edges };
  };
})(window.AnnotateApp = window.AnnotateApp || {});
