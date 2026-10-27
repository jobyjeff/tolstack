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
//   section  otherwise: the +X-bias section centre of the node's part (see
//            AA.modelPartSection). Several such nodes on one part are spread
//            up the stack axis across the cut's height in stack order, so a
//            part's linear stack reads as a ladder on its +X side.
//   origin   no geometry at all (no mesh installed, or the section plane
//            cuts nothing): the body's own frame origin, and the surface
//            says so.
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
  AA.modelAnchorWords = function (anchor) {
    if (!anchor) return null;
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

  // The `model` verb's grammar:
  //   model lit <edge> [<edge> ...]   the shell's lit set
  //   model lit all                   nothing emphasised
  //   model unlit dim|hide            what the rest does
  //   model select node|body <id>     show why an anchor is where it is
  //   model select clear
  AA.MODEL_VERB_ACTIONS = Object.freeze(["lit", "unlit", "select"]);
  AA.MODEL_SELECT_KINDS = Object.freeze(["node", "body", "clear"]);
  AA.parseModelVerb = function (args) {
    var list = (args || []).map(function (a) { return String(a); });
    var action = list[0];
    if (AA.MODEL_VERB_ACTIONS.indexOf(action) === -1) {
      throw new Error("model takes " + AA.MODEL_VERB_ACTIONS.join(" or ") +
        ", got " + JSON.stringify(action == null ? null : action));
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
