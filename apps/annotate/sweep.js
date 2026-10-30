// Sweep mode's pure half (handoff kinematic_sweep_animation): reading a
// `linkage-sweep/v1` artifact, interpolating between its points, mapping the
// scrubber to the driver, choosing which mesh instance a body is, and
// composing a body pose onto a mesh instance's recorded placement.
//
// DOM-free, fetch-free and **three.js-free**, like commands.js and
// face_geometry.js beside it -- every number sweep mode renders is computed
// here and checked by `node apps/annotate/run_tests.cjs`, and app.js/scene.js
// only turn the results into objects on a screen. That split is the whole
// reason the slerp lives here rather than being THREE.Quaternion.slerp at the
// call site: the midpoint of a 90-degree rotation being 45 degrees is a fact
// a test in Node can hold, and `new THREE.Quaternion()` in Node is not.
//
// NOTHING IN THIS FILE WRITES. The artifact is a solver's output, read out of
// the inbox and rendered; the one write path the app has
// (storage.writeFeatureIdentityEvent) is not reachable from anything here --
// sweep mode's one write, an armed pick's bind, is app.js's (armedClick), and
// this file only plans it (AA.planArmedClick).
//
// ---------------------------------------------------------------------------
// The one matrix layout, stated once
//
// A rigid placement is **12 floats, 3x4 row-major**:
//
//     [ r00 r01 r02 tx   r10 r11 r12 ty   r20 r21 r22 tz ]
//
// which is exactly what `provenance.json`'s `placement_world` carries and what
// `tolerance_stack/feature_geometry.py`'s PLACEMENT_VALUES documents for the
// Python side. Everything in this file speaks that layout -- a body pose
// becomes one (`poseToPlacement`), two compose into one (`composePlacement`),
// and a point goes through one (`applyPlacement`). scene.js converts to a
// THREE.Matrix4 in exactly one function. A second layout in this app would be
// a second place for a transpose to be wrong, which is the same argument
// ARCHITECTURE.md makes for there being one fold().
(function (AA) {
  "use strict";

  // The schema this app reads, literally. v0 exists on disk and carries no
  // poses at all, so "nearly right" is not a thing to accept here.
  AA.SWEEP_SCHEMA = "linkage-sweep/v1";

  // Where a run's geometry came from -- the single fact Jeff's review depends
  // on being impossible to miss. Read out of the artifact's own `source`.
  AA.SWEEP_SOURCES = Object.freeze(["sheet", "cad"]);

  // What can be drawn, as a vocabulary rather than four booleans spelled in
  // four places: the `layer` verb, the toggles in the bar and the renderer all
  // read this list.
  // `model` is the topology drawn on its parts (model_layer.js), and the one
  // layer bind mode can draw as well.
  AA.SWEEP_LAYERS = Object.freeze(["stick", "bodies", "trail", "ghost", "model"]);
  AA.SWEEP_DEFAULT_LAYERS = Object.freeze(
    { stick: true, bodies: true, trail: false, ghost: false, model: true });

  // Playback. `loop` is a three-valued word, not a boolean, because
  // ping-pong is the one a reader actually wants on a sweep that runs out and
  // back.
  AA.SWEEP_LOOP_MODES = Object.freeze(["off", "on", "pingpong"]);
  AA.SWEEP_SPEEDS = Object.freeze([0.25, 0.5, 1, 2, 4]);
  AA.SWEEP_DEFAULT_SPEED = 1;
  //: Sweep points per second of wall clock at 1x. 80 points at 24/s is a
  //: little over three seconds end to end, which is the pace a reader can
  //: still see a linkage move at.
  AA.SWEEP_POINTS_PER_SECOND = 24;

  //: How far a body's placed joint feature may sit from the artifact's own
  //: joint point before this app refuses to say which instance the body is
  //: (mm), and how close the runner-up may come before the two are a tie.
  //: Five pitch arms sit a hundred millimetres apart, so neither number is
  //: delicate -- they are here to catch a body matched against the wrong
  //: joint, not to arbitrate a close call.
  AA.SWEEP_INSTANCE_MAX_MM = 1.0;
  AA.SWEEP_INSTANCE_TIE_MM = 0.01;

  // Two ways to say where a part's joint feature is, and the surface says
  // which one it used every time, because they do not deserve the same
  // trust:
  //
  //   fitted    the part's faces classified and fitted -- a bore's axis
  //             point, a ball's centre. The real answer, and the one the
  //             1 mm acceptance above is calibrated for.
  //   centroid  the manifest's per-face centroids, with no geometry read.
  //             Good enough to tell five occurrences a hundred millimetres
  //             apart from each other and NOT good enough to call a
  //             millimetre: a bore face's triangle centroid sits on the axis
  //             at mid-length, not at the joint.
  //
  // The fallback exists because fitting is linear in triangles and the hub is
  // 286 solids: a surface that locked up for twenty seconds on load would get
  // turned off, and a surface that silently guessed would be worse. So it
  // degrades, widens its own acceptance to match, and says so.
  AA.SWEEP_FEATURE_SOURCES = Object.freeze(["fitted", "centroid"]);
  AA.SWEEP_FEATURE_SOURCE_WORDS = Object.freeze({
    fitted: "matched on fitted bore and ball centres",
    centroid: "matched on face centroids — too coarse to call a millimetre",
  });
  //: Above this many triangles a part is matched on centroids instead of
  //: being fitted. Measured 2026-10-01 over the installed store with this
  //: app's own classifier: the hub (363,681 triangles, 286 solids) takes
  //: 1.2 s and the blade (608,637) takes 2.4 s, once per mesh per session and
  //: then cached. Both are inside this budget on purpose -- at 60,000 the
  //: blade fell back to centroids and could not tell which of the three
  //: installed blade geometries was blade 1, which is the one substitution
  //: this whole surface was asked to get right.
  AA.SWEEP_FIT_TRIANGLE_BUDGET = 700000;
  AA.SWEEP_INSTANCE_MAX_COARSE_MM = 25.0;
  AA.SWEEP_INSTANCE_TIE_COARSE_MM = 1.0;

  // The acceptance pair for a feature source, so no caller picks one by hand.
  AA.sweepInstanceLimits = function (featureSource) {
    return featureSource === "centroid"
      ? { maxMm: AA.SWEEP_INSTANCE_MAX_COARSE_MM, tieMm: AA.SWEEP_INSTANCE_TIE_COARSE_MM }
      : { maxMm: AA.SWEEP_INSTANCE_MAX_MM, tieMm: AA.SWEEP_INSTANCE_TIE_MM };
  };

  // --- schema ---------------------------------------------------------------

  // Reads an artifact, or throws naming the schema it actually found. Returns
  // a normalised view: every field this app reads, under this app's own names,
  // so no consumer below re-reaches into the raw document.
  AA.readSweepArtifact = function (doc) {
    if (!doc || typeof doc !== "object") {
      throw new Error("that run file is not a sweep artifact (no document to read)");
    }
    var found = doc.schema;
    if (found !== AA.SWEEP_SCHEMA) {
      throw new Error(
        "this surface reads " + AA.SWEEP_SCHEMA + " runs; that file is " +
        (found ? String(found) : "a file with no schema") +
        (found === "linkage-sweep/v0"
          ? " -- a v0 run carries measurements but no body poses, so there is nothing to animate"
          : ""));
    }
    var rawPoints = Array.isArray(doc.points) ? doc.points : [];
    if (!rawPoints.length) throw new Error("that run has no sweep points");

    var points = rawPoints.map(function (p, i) {
      return {
        index: typeof p.index === "number" ? p.index : i,
        driver: Number(p.driver_value),
        measures: p.measures || {},
        converged: p.converged !== false,
        residualNorm: typeof p.residual_norm === "number" ? p.residual_norm : null,
        poses: p.poses || {},
        joints: p.joints || {},
        links: p.links || {},
      };
    });
    var mechanism = doc.mechanism || {};
    var measures = doc.measures || {};
    return {
      runId: doc.run_id || null,
      pipelineCommit: doc.pipeline_commit || null,
      // When the run was published -- what `sweep latest` orders by
      // (AA.orderSweepRuns), never the run id's spelling.
      ts: typeof doc.ts === "string" ? doc.ts : null,
      source: doc.source || null,
      frame: doc.frame || null,
      mechanismName: mechanism.name || null,
      driverLabel: (mechanism.driver && mechanism.driver.label) || null,
      driverUnit: (mechanism.driver && mechanism.driver.unit) || null,
      measureUnits: measures.units || {},
      bodies: Array.isArray(doc.bodies) ? doc.bodies : [],
      links: Array.isArray(doc.links) ? doc.links : [],
      reference: doc.reference || null,
      // What the sweep rail's mechanism tree reads (handoff the_sweep_rail_
      // shows_the_mechanism): each joint's residual rows, which are what its
      // TYPE is on the solver side (AA.sweepJointTypes), and the feature
      // joins, which say which topology node or edge each geometry parameter
      // is and which body it sits on. Both absent on the oldest runs.
      rowLabels: Array.isArray(mechanism.row_labels) ? mechanism.row_labels : [],
      features: (doc.geometry && Array.isArray(doc.geometry.features))
        ? doc.geometry.features : [],
      // The topology this run is ABOUT, read off the artifact's own feature
      // joins: every `geometry.features[]` entry names one (the driver entry
      // names none). Null when no entry does -- the 10-01 runs carry no
      // features at all, and a null is not a guess.
      topologyId: AA.sweepTopologyId(doc),
      points: points,
      notConverged: points.filter(function (p) { return !p.converged; }).length,
    };
  };

  // The topology a run's feature joins name: the most-named id when several
  // appear, null when none does. An id nobody names is never invented.
  AA.sweepTopologyId = function (doc) {
    var features = (doc && doc.geometry && Array.isArray(doc.geometry.features))
      ? doc.geometry.features : [];
    var counts = {};
    var best = null;
    features.forEach(function (feature) {
      var id = feature && typeof feature.topology === "string" ? feature.topology : "";
      if (!id) return;
      counts[id] = (counts[id] || 0) + 1;
      if (best === null || counts[id] > counts[best]) best = id;
    });
    return best;
  };

  // What the hint bar's one line says about the loaded run. Returns the parts;
  // the bar joins them, because the separator is presentation.
  // `opts.mechanism: false` leaves the mechanism out, for a bar whose run
  // picker already names it.
  AA.sweepSummaryParts = function (artifact, opts) {
    var withMechanism = !opts || opts.mechanism !== false;
    var parts = [];
    if (artifact.runId) parts.push(artifact.runId);
    if (artifact.source) parts.push(AA.sweepSourceWords(artifact.source));
    // The mechanism in words, so "which run am I watching" is answerable
    // from the page: two runs of one linkage differ by a run id a reader has
    // to decode and by this, which they do not.
    if (withMechanism && artifact.mechanismName) {
      parts.push(AA.measureLabel(artifact.mechanismName));
    }
    parts.push(artifact.points.length + " point" + (artifact.points.length === 1 ? "" : "s"));
    if (artifact.notConverged) parts.push(artifact.notConverged + " did not converge");
    return parts;
  };

  // The one place the two source words become reader-facing sentences. Jeff's
  // whole concern with this surface is knowing which of the two he is looking
  // at, so neither is rendered as the bare artifact token.
  AA.SWEEP_SOURCE_WORDS = Object.freeze({
    sheet: "geometry from the motion sheet",
    cad: "geometry fitted from CAD",
  });
  AA.sweepSourceWords = function (source) {
    return AA.SWEEP_SOURCE_WORDS[source] || String(source);
  };

  // --- rotations ------------------------------------------------------------
  //
  // A rotation vector (axis * angle, radians) is what the artifact carries;
  // a unit quaternion [x, y, z, w] is what interpolates. Both directions are
  // here and nowhere else.

  AA.rotvecToQuat = function (rv) {
    var x = rv[0], y = rv[1], z = rv[2];
    var angle = Math.sqrt(x * x + y * y + z * z);
    if (angle < 1e-12) return [0, 0, 0, 1];
    var s = Math.sin(angle / 2) / angle;
    return [x * s, y * s, z * s, Math.cos(angle / 2)];
  };

  AA.quatToRotvec = function (q) {
    var x = q[0], y = q[1], z = q[2], w = q[3];
    var s = Math.sqrt(x * x + y * y + z * z);
    if (s < 1e-12) return [0, 0, 0];
    // atan2 rather than acos(w): accurate for the small angles a scrubbed
    // frame is full of, where acos loses most of its digits.
    var angle = 2 * Math.atan2(s, w);
    if (angle > Math.PI) angle -= 2 * Math.PI;
    var k = angle / s;
    return [x * k, y * k, z * k];
  };

  AA.quatSlerp = function (a, b, t) {
    var ax = a[0], ay = a[1], az = a[2], aw = a[3];
    var bx = b[0], by = b[1], bz = b[2], bw = b[3];
    var cos = ax * bx + ay * by + az * bz + aw * bw;
    // Shortest arc: a quaternion and its negation are the same rotation, and
    // without this a 180-degree-plus pair interpolates the long way round.
    if (cos < 0) { cos = -cos; bx = -bx; by = -by; bz = -bz; bw = -bw; }
    var ka, kb;
    if (cos > 0.9999995) {
      ka = 1 - t; kb = t; // nearly parallel: lerp, then renormalise below
    } else {
      var omega = Math.acos(cos);
      var sin = Math.sin(omega);
      ka = Math.sin((1 - t) * omega) / sin;
      kb = Math.sin(t * omega) / sin;
    }
    var q = [ka * ax + kb * bx, ka * ay + kb * by, ka * az + kb * bz, ka * aw + kb * bw];
    var n = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]) || 1;
    return [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
  };

  // --- placements (3x4 row-major, 12 floats -- see this file's header) ------

  AA.PLACEMENT_VALUES = 12;
  AA.IDENTITY_PLACEMENT = Object.freeze([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]);

  AA.quatToPlacement = function (q, translation) {
    var x = q[0], y = q[1], z = q[2], w = q[3];
    var t = translation || [0, 0, 0];
    return [
      1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), t[0],
      2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), t[1],
      2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y), t[2],
    ];
  };

  // A body pose, as the artifact states it, as a placement. The artifact's own
  // frame sentence is `p_world = R(rotvec) @ p_as_modelled + translation`, so
  // this is literally that, written as a matrix.
  AA.poseToPlacement = function (pose) {
    if (!pose) return AA.IDENTITY_PLACEMENT.slice();
    // Either spelling: `rotvec` is what the artifact carries, `quaternion` is
    // what an interpolated frame carries. One function takes both so no caller
    // has to know which kind of pose it is holding.
    var q = pose.quaternion || AA.rotvecToQuat(pose.rotvec || [0, 0, 0]);
    return AA.quatToPlacement(q, pose.translation || [0, 0, 0]);
  };

  // a ∘ b -- apply b first, then a.
  AA.composePlacement = function (a, b) {
    var out = new Array(12);
    for (var r = 0; r < 3; r++) {
      for (var c = 0; c < 3; c++) {
        out[r * 4 + c] =
          a[r * 4] * b[c] + a[r * 4 + 1] * b[4 + c] + a[r * 4 + 2] * b[8 + c];
      }
      out[r * 4 + 3] =
        a[r * 4] * b[3] + a[r * 4 + 1] * b[7] + a[r * 4 + 2] * b[11] + a[r * 4 + 3];
    }
    return out;
  };

  AA.applyPlacement = function (m, p) {
    return [
      m[0] * p[0] + m[1] * p[1] + m[2] * p[2] + m[3],
      m[4] * p[0] + m[5] * p[1] + m[6] * p[2] + m[7],
      m[8] * p[0] + m[9] * p[1] + m[10] * p[2] + m[11],
    ];
  };

  // The whole of phase 2's transform, in one named function so nothing else
  // has to get the order right: `pose(t) ∘ placement_world`. The mesh is in
  // its product's own local frame; `placement_world` carries it to the
  // as-modelled 217755 assembly frame; the pose carries that to this instant.
  AA.anchorPlacement = function (pose, placementWorld) {
    return AA.composePlacement(AA.poseToPlacement(pose),
      placementWorld && placementWorld.length === 12
        ? placementWorld : AA.IDENTITY_PLACEMENT);
  };

  // --- interpolation --------------------------------------------------------

  function lerp3(a, b, t) {
    if (!a) return b ? b.slice() : null;
    if (!b) return a.slice();
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }

  function interpolatePose(a, b, t) {
    var qa = AA.rotvecToQuat((a && a.rotvec) || [0, 0, 0]);
    var qb = AA.rotvecToQuat((b && b.rotvec) || [0, 0, 0]);
    return {
      translation: lerp3((a && a.translation) || [0, 0, 0],
        (b && b.translation) || [0, 0, 0], t),
      quaternion: AA.quatSlerp(qa, qb, t),
    };
  }

  // The scene at a fractional point index. `index` is clamped into range and
  // may sit anywhere between two points -- that is what the draggable bar
  // produces, and what `prefers-reduced-motion` deliberately does not (it
  // steps whole points instead; see app.js).
  //
  // Translations lerp and rotations slerp, which is the only honest thing to
  // do between two solved poses: there is no solve here, and this app is a
  // viewer of a solver's output. The READOUTS therefore do not interpolate --
  // they are the nearer point's own numbers, carried with its index, so a
  // number on screen is always a number the solver actually produced.
  AA.sweepFrameAt = function (artifact, index) {
    var n = artifact.points.length;
    var f = Math.min(Math.max(Number(index) || 0, 0), n - 1);
    var i0 = Math.floor(f);
    var i1 = Math.min(i0 + 1, n - 1);
    var t = f - i0;
    var a = artifact.points[i0];
    var b = artifact.points[i1];
    var nearerIndex = t < 0.5 ? i0 : i1;

    var poses = {};
    var name;
    for (name in a.poses) {
      if (!Object.prototype.hasOwnProperty.call(a.poses, name)) continue;
      poses[name] = interpolatePose(a.poses[name], b.poses[name], t);
    }
    var joints = {};
    for (name in a.joints) {
      if (!Object.prototype.hasOwnProperty.call(a.joints, name)) continue;
      var ja = a.joints[name], jb = b.joints[name] || {};
      joints[name] = {
        point_a_world: lerp3(ja.point_a_world, jb.point_a_world, t),
        point_b_world: lerp3(ja.point_b_world, jb.point_b_world, t),
        axis_world: ja.axis_world ? lerp3(ja.axis_world, jb.axis_world, t) : null,
      };
    }
    var links = {};
    for (name in a.links) {
      if (!Object.prototype.hasOwnProperty.call(a.links, name)) continue;
      var la = a.links[name], lb = b.links[name] || la;
      var pose = interpolatePose(la, lb, t);
      links[name] = {
        translation: pose.translation,
        quaternion: pose.quaternion,
        length: la.length + ((lb.length == null ? la.length : lb.length) - la.length) * t,
        convention: la.convention || null,
      };
    }
    return {
      index: f,
      nearerIndex: nearerIndex,
      nearer: artifact.points[nearerIndex],
      driver: a.driver + (b.driver - a.driver) * t,
      poses: poses,
      joints: joints,
      links: links,
    };
  };

  // --- the scrubber, along the driver ---------------------------------------
  //
  // The driver is actuator travel in mm and it runs DOWNWARD over this sweep
  // (64.466 -> 0), so neither direction may be assumed. Both functions work
  // off the end values and are exact at both ends.

  AA.sweepDriverValues = function (artifact) {
    return artifact.points.map(function (p) { return p.driver; });
  };

  // mm -> fractional index. Monotone in the driver, clamped to both ends.
  AA.driverToIndex = function (values, mm) {
    var n = values.length;
    if (n < 2) return 0;
    var descending = values[n - 1] < values[0];
    var x = Number(mm);
    for (var i = 0; i < n - 1; i++) {
      var lo = values[i], hi = values[i + 1];
      var within = descending ? (x <= lo && x >= hi) : (x >= lo && x <= hi);
      if (within) {
        var span = hi - lo;
        return Math.abs(span) < 1e-12 ? i : i + (x - lo) / span;
      }
    }
    // Outside the sweep: clamp to whichever end it is past.
    var pastStart = descending ? x > values[0] : x < values[0];
    return pastStart ? 0 : n - 1;
  };

  // fractional index -> mm, the inverse of the above on the swept range.
  AA.indexToDriver = function (values, index) {
    var n = values.length;
    if (!n) return 0;
    var f = Math.min(Math.max(Number(index) || 0, 0), n - 1);
    var i0 = Math.floor(f);
    var i1 = Math.min(i0 + 1, n - 1);
    return values[i0] + (values[i1] - values[i0]) * (f - i0);
  };

  // --- playback -------------------------------------------------------------

  // One tick of wall clock, as a pure transition. `state` is
  // {index, playing, speed, loop, direction}; `count` is the point count.
  // Returned fresh rather than mutated, so a test can hold both.
  AA.sweepAdvance = function (state, dtSeconds, count) {
    var out = {
      index: state.index, playing: state.playing, speed: state.speed,
      loop: state.loop, direction: state.direction || 1,
    };
    if (!state.playing || count < 2) return out;
    var step = AA.SWEEP_POINTS_PER_SECOND * (state.speed || 1) * dtSeconds * out.direction;
    var next = state.index + step;
    var last = count - 1;
    if (next > last || next < 0) {
      if (state.loop === "pingpong") {
        out.direction = -out.direction;
        // Reflect the overshoot rather than dropping it, so a long frame at
        // 4x does not sit the handle on the endpoint for a tick.
        next = next > last ? last - (next - last) : -next;
        next = Math.min(Math.max(next, 0), last);
      } else if (state.loop === "on") {
        var span = last || 1;
        next = ((next % span) + span) % span;
      } else {
        next = next > last ? last : 0;
        out.playing = false;
      }
    }
    out.index = next;
    return out;
  };

  // Step by whole points -- the +/- buttons, the arrow keys, and what
  // `prefers-reduced-motion` gets instead of an animation.
  AA.sweepStepIndex = function (index, delta, count) {
    return Math.min(Math.max(Math.round(index) + delta, 0), count - 1);
  };

  // --- which instance a body is ---------------------------------------------

  // A FEATURE is a point, or an AXIS, and the difference is the whole reason
  // the pitch arm resolves at all. `{p: [x,y,z]}` is a located point -- a
  // ball centre, a face centroid -- and the distance to it is the plain
  // distance. `{p, d}` is a point ON an infinite axis with direction `d` -- a
  // bore -- and the distance to it is the PERPENDICULAR distance, because a
  // bore locates a joint in two degrees of freedom and says nothing about the
  // third. Measured: the pitch arm's link bore fitted an axis point at
  // mid-length of the bore, 4.57 mm along the axis from the ball centre the
  // solver reports, so the plain distance refused a correct match that the
  // perpendicular distance accepts at 0.0007 mm.
  //
  // A bare `[x, y, z]` is read as `{p}`, so a caller with nothing but points
  // may hand over an array of arrays.
  AA.sweepFeatureDistance = function (feature, target) {
    var f = Array.isArray(feature) ? { p: feature } : feature;
    var v = [target[0] - f.p[0], target[1] - f.p[1], target[2] - f.p[2]];
    if (!f.d) return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    var n = Math.sqrt(f.d[0] * f.d[0] + f.d[1] * f.d[1] + f.d[2] * f.d[2]);
    if (!(n > 0)) return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    var u = [f.d[0] / n, f.d[1] / n, f.d[2] / n];
    var along = v[0] * u[0] + v[1] * u[1] + v[2] * u[2];
    var rx = v[0] - along * u[0], ry = v[1] - along * u[1], rz = v[2] - along * u[2];
    return Math.sqrt(rx * rx + ry * ry + rz * rz);
  };

  // Carries a local feature into the assembly frame through an occurrence's
  // recorded placement. A direction goes through the rotation only, which is
  // why it cannot just be run through applyPlacement.
  AA.placeSweepFeature = function (placement, feature) {
    var f = Array.isArray(feature) ? { p: feature } : feature;
    var out = { p: AA.applyPlacement(placement, f.p) };
    if (f.d) {
      var o = AA.applyPlacement(placement, [0, 0, 0]);
      var q = AA.applyPlacement(placement, f.d);
      out.d = [q[0] - o[0], q[1] - o[1], q[2] - o[2]];
    }
    return out;
  };

  // Which recorded occurrences are candidates for a part, and it is EXACT
  // rather than geometric -- the geometry decides between candidates, this
  // decides what is even in the running.
  //
  // Three sources, each derived from what the extraction already recorded:
  //
  //   * the aliased mesh's OWN occurrences;
  //   * every occurrence sharing one of those occurrences' `instance_name`.
  //     The five pitch arms are all named `215071-001.2` and differ only in
  //     their path, and all three installed blade geometries are named
  //     `211587-001.3` -- so this is what puts blade 1's slot in the running
  //     for a design blade mesh whose own instance is blade 2's;
  //   * every occurrence named `<this mesh's product>.<n>`. The STEP names an
  //     instance after the DESIGN part even where the product sitting in it
  //     is the instrumented variant, so blade 1's pitch link is recorded as
  //     `213862-002.1` on `546293-002`'s provenance -- and this is what finds
  //     it without this app being told which drawing substitutes for which.
  //
  // Occurrences are keyed by their full instance PATH, never by
  // `instance_name`, which is not unique across the assembly.
  AA.sweepCandidateOccurrences = function (own, all, productName) {
    var out = (own || []).slice();
    var seen = {};
    var names = {};
    out.forEach(function (o) { seen[o.key] = true; names[o.instance_name] = true; });
    (all || []).forEach(function (o) {
      if (seen[o.key]) return;
      var sameSlotName = !!names[o.instance_name];
      var sameProductSlot = !!productName &&
        String(o.instance_name).indexOf(productName + ".") === 0;
      if (!sameSlotName && !sameProductSlot) return;
      seen[o.key] = true;
      out.push(o);
    });
    return out;
  };

  // `candidates` are mesh occurrences carrying that mesh's own features in
  // the assembly frame: {instance_name, key, points: [feature, ...]}, where a
  // feature is AA.sweepFeatureDistance's own shape. `target` is the
  // artifact's joint point for that body at the as-modelled frame.
  //
  // Nearest wins; a nearest farther than SWEEP_INSTANCE_MAX_MM refuses, and so
  // does a runner-up within SWEEP_INSTANCE_TIE_MM of it. Refusing returns a
  // reason rather than throwing: the caller's answer to "which of five pitch
  // arms is this" being "I cannot tell" is a state the bar shows, with the
  // stick figure still drawn.
  AA.chooseSweepInstance = function (candidates, target, opts) {
    var o = opts || {};
    var maxMm = o.maxMm == null ? AA.SWEEP_INSTANCE_MAX_MM : o.maxMm;
    var tieMm = o.tieMm == null ? AA.SWEEP_INSTANCE_TIE_MM : o.tieMm;
    var scored = (candidates || []).map(function (c) {
      var best = Infinity;
      (c.points || []).forEach(function (feature) {
        var d = AA.sweepFeatureDistance(feature, target);
        if (d < best) best = d;
      });
      return { instance_name: c.instance_name, key: c.key || c.instance_name,
        candidate: c, residual: best };
    }).filter(function (s) { return isFinite(s.residual); });

    if (!scored.length) {
      return { chosen: null, refused: true,
        reason: "no placed feature to match against the solved joint point" };
    }
    scored.sort(function (a, b) { return a.residual - b.residual; });
    var best = scored[0];
    var runnerUp = scored[1] || null;
    if (best.residual > maxMm) {
      return { chosen: null, refused: true, residual: best.residual, runnerUp: runnerUp,
        reason: "the nearest occurrence sits " + best.residual.toFixed(3) +
          " mm from the solved joint point, past the " + maxMm + " mm this surface will accept" };
    }
    if (runnerUp && runnerUp.residual - best.residual <= tieMm) {
      return { chosen: null, refused: true, residual: best.residual, runnerUp: runnerUp,
        reason: "two occurrences sit the same distance from the solved joint point" };
    }
    return { chosen: best.instance_name, key: best.key, candidate: best.candidate,
      refused: false, residual: best.residual, runnerUp: runnerUp };
  };

  // How an occurrence is NAMED at a reader: the part of its path that tells
  // it apart from the other candidates, and nothing else.
  //
  // `instance_name` cannot do this job -- all five pitch arms are named
  // `215071-001.2` and all three installed blade geometries are named
  // `211587-001.3`, so the name alone says the same thing for every
  // candidate. Nor can a fixed number of trailing segments: the pitch arms
  // differ three segments from the end and the pitch links one. So: drop the
  // prefix every candidate shares, and show what is left. With one candidate
  // there is nothing to distinguish and the last segment is the answer.
  AA.sweepOccurrenceLabel = function (key, allKeys) {
    var mine = String(key).split("/");
    var others = (allKeys || []).filter(function (k) { return k !== key; });
    if (!others.length) return mine[mine.length - 1];
    var common = mine.length;
    others.forEach(function (other) {
      var theirs = String(other).split("/");
      var n = 0;
      while (n < mine.length && n < theirs.length && mine[n] === theirs[n]) n++;
      if (n < common) common = n;
    });
    var tail = mine.slice(common);
    return tail.length ? tail.join(" / ") : mine[mine.length - 1];
  };

  // --- readouts -------------------------------------------------------------
  //
  // THE FOUR NUMBERS THAT ARE THE VERIFICATION. This app formats digits and
  // authors no verdict: there is no "within tolerance" here, no colour on a
  // difference, no rounding that hides one. A label is DERIVED from the
  // artifact's own measure name (underscores to spaces) rather than tabled, so
  // a measure linkage adds tomorrow reads as words here with nothing to edge
  // out of step -- the only authored words are the four qualifiers below.

  AA.SWEEP_READOUT_WORDS = Object.freeze({
    solved: "solved",
    reference: "reference",
    difference: "difference",
    residual: "residual norm",
    linkLength: "length",
  });

  AA.measureLabel = function (name) {
    return String(name).replace(/_/g, " ");
  };

  // Significant-figure-free, deliberately: a fixed number of decimals per unit
  // so a column of them lines up and a digit never moves under a scrub.
  AA.SWEEP_DECIMALS = Object.freeze({ mm: 4, deg: 3 });
  AA.formatSweepNumber = function (value, unit) {
    if (value == null || !isFinite(value)) return "—";
    var dp = AA.SWEEP_DECIMALS[unit];
    if (dp == null) return String(Number(value.toPrecision(6)));
    return value.toFixed(dp);
  };

  // The two figures a reader scrubs for, at the handle: the driver's value
  // and the measure the run has a reference for (blade pitch, on the pitch
  // linkage). One composition for both places they are shown -- the chip that
  // rides the scrubber, and the folded bar's summary line (handoff the_scene_
  // pane_is_one_flyout_that_reads_over_http, deliverable 5) -- so the two can
  // never read differently. `measure` is null where the run names no
  // reference measure, or the nearer point does not carry it.
  AA.sweepHeadlineFigures = function (artifact, driverValues, index, frame) {
    var driver = AA.indexToDriver(driverValues, index);
    var referenced = artifact.reference && artifact.reference.measure;
    var value = referenced && frame.nearer.measures[referenced];
    return {
      driver: {
        label: artifact.driverLabel || "",
        text: AA.formatSweepNumber(driver, artifact.driverUnit) + " " + (artifact.driverUnit || ""),
      },
      measure: value != null ? {
        label: AA.measureLabel(referenced),
        text: AA.formatSweepNumber(value, artifact.measureUnits[referenced]) + " " +
          (artifact.measureUnits[referenced] || ""),
      } : null,
    };
  };

  // The rows the bar renders at the current frame: {key, label, value, unit}.
  // `frame` is AA.sweepFrameAt's result; the numbers come from its NEARER
  // point, never from the interpolation (see sweepFrameAt's note).
  AA.sweepReadouts = function (artifact, frame) {
    var rows = [];
    var point = frame.nearer;
    var units = artifact.measureUnits || {};
    var referenceValue = AA.sweepReferenceValue(artifact, frame.nearerIndex);
    var W = AA.SWEEP_READOUT_WORDS;

    Object.keys(point.measures).forEach(function (name) {
      var label = AA.measureLabel(name);
      var isReferenced = artifact.reference && artifact.reference.measure === name;
      rows.push({
        key: name,
        label: isReferenced ? label + " (" + W.solved + ")" : label,
        value: point.measures[name],
        unit: units[name] || null,
      });
      if (isReferenced && referenceValue != null) {
        rows.push({ key: name + ":reference", label: label + " (" + W.reference + ")",
          value: referenceValue, unit: units[name] || null });
        rows.push({ key: name + ":difference", label: label + " " + W.difference,
          value: point.measures[name] - referenceValue, unit: units[name] || null });
      }
    });

    // Each distance-constraint member, measured off the artifact's own joint
    // points against the length it is supposed to hold. This is the check a
    // reader can make with their eyes on a moving linkage.
    (artifact.links || []).forEach(function (link) {
      var joint = point.joints[link.joint];
      var declared = point.links[link.joint];
      if (!joint || !joint.point_a_world || !joint.point_b_world) return;
      var a = joint.point_a_world, b = joint.point_b_world;
      var measured = Math.sqrt(
        Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2) + Math.pow(a[2] - b[2], 2));
      rows.push({ key: "link:" + link.joint,
        label: AA.measureLabel(link.joint) + " " + W.linkLength,
        value: measured, unit: "mm",
        expected: declared ? declared.length : null });
    });

    rows.push({ key: "residual_norm", label: W.residual,
      value: point.residualNorm, unit: null });
    return rows;
  };

  // The 3DX sheet's own blade pitch at this point, or null where the artifact
  // carries no reference for it. The reference block is indexed by the same
  // point order the sweep is.
  AA.sweepReferenceValue = function (artifact, index) {
    var ref = artifact.reference;
    if (!ref || !Array.isArray(ref.values)) return null;
    var v = ref.values[index];
    return typeof v === "number" ? v : null;
  };

  // --- what the stick figure is made of -------------------------------------
  //
  // DERIVED from the artifact, never declared by it: linkage names its joints
  // and says which of them are distance constraints, and that plus whether a
  // joint carries an axis is the whole of what this app can honestly say
  // about a joint's kind. Three classes, not a catalogue of joint types this
  // app would then have to keep in step with a solver in another repo.
  AA.SWEEP_JOINT_KINDS = Object.freeze(["distance", "axial", "point"]);
  AA.SWEEP_JOINT_KIND_WORDS = Object.freeze({
    distance: "two-force member — its two ends hold a fixed distance",
    axial: "turns or slides about one axis",
    point: "two points held together",
  });

  AA.sweepJointKind = function (artifact, jointName, joint) {
    var isLink = (artifact.links || []).some(function (l) { return l.joint === jointName; });
    if (isLink) return "distance";
    return (joint && joint.axis_world) ? "axial" : "point";
  };

  // Which joint ENDS ride on which body -- MEASURED, not declared. The
  // artifact says which parts a body carries and where every joint point is,
  // but never which joint belongs to which body, and a body's triad has to be
  // drawn somewhere that means something. So: an end rides on a body when
  // that body's pose, applied to the end's as-modelled point, reproduces the
  // end's own point at every sampled instant. That is a fact about the
  // numbers in the file rather than a convention this app and linkage would
  // both have to remember.
  //
  // BOTH ENDS, separately, and that is the whole of why this works. A joint
  // between ground and a body has a ground-side end that never moves and a
  // body-side end that does; taking only the `a` end hands every such joint
  // to whatever body happens to reproduce a stationary point, and a body
  // rotating about the origin reproduces the origin. Measured on the real P1
  // run, where the a-end-only version put `plate_slide` and `actuator` -- the
  // pitch plate's two joints -- on the BLADE.
  //
  // GROUND WINS A TIE for the same reason: a point that does not move over
  // the whole sweep is ground's, whoever else's pose also happens to leave it
  // alone.
  AA.SWEEP_RIDES_EPS = 1e-6; // mm
  AA.SWEEP_JOINT_ENDS = Object.freeze(["point_a_world", "point_b_world"]);

  AA.sweepBodyJoints = function (artifact) {
    var points = artifact.points;
    var last = points[points.length - 1];
    // The as-modelled point is the one whose poses are identity; the artifact
    // writes it explicitly, so find it rather than assuming an end.
    var reference = last;
    for (var k = points.length - 1; k >= 0; k--) {
      if (AA.sweepIsAsModelled({ poses: posesAsQuaternions(points[k]) })) {
        reference = points[k]; break;
      }
    }
    // Three instants is enough to tell a body apart from every other body
    // and from ground, and keeps this O(bodies x joints) rather than
    // O(bodies x joints x points).
    var samples = [points[0], points[Math.floor(points.length / 2)], last];
    var out = {};
    (artifact.bodies || []).forEach(function (body) { out[body.name] = []; });

    Object.keys(reference.joints).forEach(function (jointName) {
      AA.SWEEP_JOINT_ENDS.forEach(function (end) {
        var home = reference.joints[jointName][end];
        if (!home) return;
        var winner = null;
        (artifact.bodies || []).forEach(function (body) {
          var rides = samples.every(function (point) {
            var joint = point.joints[jointName];
            var pose = point.poses[body.name];
            if (!joint || !joint[end] || !pose) return false;
            var moved = AA.applyPlacement(AA.poseToPlacement(pose), home);
            var p = joint[end];
            return Math.abs(moved[0] - p[0]) <= AA.SWEEP_RIDES_EPS &&
              Math.abs(moved[1] - p[1]) <= AA.SWEEP_RIDES_EPS &&
              Math.abs(moved[2] - p[2]) <= AA.SWEEP_RIDES_EPS;
          });
          if (!rides) return;
          if (!winner || (!winner.ground && body.ground)) winner = body;
        });
        if (winner) out[winner.name].push({ joint: jointName, end: end });
      });
    });
    return out;
  };

  function posesAsQuaternions(point) {
    var out = {};
    Object.keys(point.poses).forEach(function (name) {
      var pose = point.poses[name];
      out[name] = { translation: pose.translation,
        quaternion: AA.rotvecToQuat(pose.rotvec || [0, 0, 0]) };
    });
    return out;
  }

  // What a hovered joint says, in one line. The kind's own words, plus -- for
  // a two-force member -- the convention its reconstructed pose was built
  // under, which the artifact states and which a reader looking at a link
  // rotating has every reason to want.
  //
  // The convention comes out of the ARTIFACT, verbatim, and is not a sentence
  // this app authors: it is the producer's claim about its own numbers, and
  // re-wording it here would be this app asserting something it did not
  // compute.
  AA.sweepJointTooltip = function (artifact, frame, jointName) {
    var kind = AA.sweepJointKind(artifact, jointName,
      (frame.joints && frame.joints[jointName]) || null);
    var parts = [AA.measureLabel(jointName) + " — " + AA.SWEEP_JOINT_KIND_WORDS[kind]];
    var link = frame.links && frame.links[jointName];
    if (link) {
      parts.push("length " + AA.formatSweepNumber(link.length, "mm") + " mm");
      if (link.convention) parts.push(link.convention);
    }
    var joint = frame.joints && frame.joints[jointName];
    if (joint && joint.axis_world) {
      parts.push("axis " + joint.axis_world
        .map(function (v) { return AA.formatSweepNumber(v, null); }).join(", "));
    }
    return parts.join("\n");
  };

  // Everything the renderer needs to BUILD the overlay once: which joints
  // exist and what kind each is, which of them are drawn as a line between
  // two ends, and where each body's triad is anchored. Read off the
  // artifact's first point, which carries every joint the run has.
  AA.sweepStructure = function (artifact) {
    var first = artifact.points[0];
    var joints = Object.keys(first.joints).map(function (name) {
      return { name: name, kind: AA.sweepJointKind(artifact, name, first.joints[name]) };
    });
    var riders = AA.sweepBodyJoints(artifact);
    var asModelled = artifact.points[artifact.points.length - 1];
    return {
      joints: joints,
      links: (artifact.links || []).map(function (l) { return { joint: l.joint }; }),
      bodies: (artifact.bodies || []).map(function (b) {
        // The triad's anchor: the centroid, in the as-modelled frame, of the
        // joints this body carries. A body with none (nothing resolved to it)
        // gets no anchor and its triad is not drawn -- better than one at the
        // assembly origin, where every body's would coincide.
        var mine = riders[b.name] || [];
        var names = mine.map(function (r) { return r.joint; });
        // GROUND is the one body whose anchor is not measured: its frame IS
        // the assembly frame, so its triad belongs at the assembly origin and
        // is drawn there once, muted.
        if (b.ground) {
          return { name: b.name, ground: true, joints: names, riders: mine,
            anchor: [0, 0, 0] };
        }
        var sum = [0, 0, 0], n = 0;
        mine.forEach(function (rider) {
          var joint = asModelled.joints[rider.joint];
          var p = joint && joint[rider.end];
          if (!p) return;
          sum[0] += p[0]; sum[1] += p[1]; sum[2] += p[2]; n++;
        });
        // `joints` is the names, for anything that renders them; `riders` is
        // the {joint, end} pairs, which is what an occurrence has to agree
        // with. Two readings of one measurement, never re-derived.
        return { name: b.name, ground: !!b.ground, joints: names, riders: mine,
          anchor: n ? [sum[0] / n, sum[1] / n, sum[2] / n] : null };
      }),
    };
  };

  // Each joint's whole path through the sweep, for the faint trail. Computed
  // once on load: 80 points times a handful of joints is nothing, and
  // recomputing it per frame would be the one thing in this file that scales
  // with the clock.
  AA.sweepTrails = function (artifact) {
    var trails = {};
    artifact.points.forEach(function (point) {
      Object.keys(point.joints).forEach(function (name) {
        var p = point.joints[name].point_a_world;
        if (!p) return;
        (trails[name] = trails[name] || []).push(p);
      });
    });
    return trails;
  };

  // --- verb arguments -------------------------------------------------------
  //
  // Parsed here, not in app.js, for the reason commands.js's own helpers are:
  // a verb's argument grammar is pure, and the message a bad argument gets is
  // the only documentation a reader of the command box has.

  AA.parseSweepSpeed = function (text) {
    var value = Number(String(text == null ? "" : text).replace(/x$/i, ""));
    if (!isFinite(value) || AA.SWEEP_SPEEDS.indexOf(value) === -1) {
      throw new Error("speed is one of " + AA.SWEEP_SPEEDS.join(", "));
    }
    return value;
  };

  AA.parseSweepLoop = function (text) {
    var value = String(text == null ? "" : text).toLowerCase();
    if (AA.SWEEP_LOOP_MODES.indexOf(value) === -1) {
      throw new Error("loop is one of " + AA.SWEEP_LOOP_MODES.join(", "));
    }
    return value;
  };

  // `seek #12` is a point index; `seek 41.3` is a driver value in the
  // artifact's own unit. Two grammars because both are things a reader has:
  // an index off the scrubber's own marks, and a travel they read off a sheet.
  AA.parseSweepSeek = function (text, driverValues) {
    var raw = String(text == null ? "" : text).trim();
    if (!raw) throw new Error("seek takes a driver value, or #<point index>");
    if (raw.charAt(0) === "#") {
      var i = Number(raw.slice(1));
      if (!isFinite(i)) throw new Error("seek #<point index> needs a number");
      return Math.min(Math.max(Math.round(i), 0), driverValues.length - 1);
    }
    var mm = Number(raw);
    if (!isFinite(mm)) throw new Error("seek takes a driver value, or #<point index>");
    return AA.driverToIndex(driverValues, mm);
  };

  AA.parseSweepLayer = function (name) {
    var value = String(name == null ? "" : name).toLowerCase();
    if (AA.SWEEP_LAYERS.indexOf(value) === -1) {
      throw new Error("layer is one of " + AA.SWEEP_LAYERS.join(", "));
    }
    return value;
  };

  // --- the frame rule -------------------------------------------------------

  //: How far a pose may sit from identity and still count as the as-modelled
  //: frame -- the frame in which, and only in which, a face pick means what it
  //: has always meant. Tight on purpose: the artifact writes index 79's poses
  //: as exact identity, so anything else is a moved body.
  AA.SWEEP_AS_MODELLED_EPS = 1e-9;

  // Is every body at its as-modelled pose? Binding is disabled whenever this
  // is false -- a face picked on a body that has been carried somewhere by a
  // solver is still the right FACE, but every reason a reader has to trust
  // what they clicked is about where it was.
  AA.sweepIsAsModelled = function (frame) {
    var poses = frame.poses || {};
    for (var name in poses) {
      if (!Object.prototype.hasOwnProperty.call(poses, name)) continue;
      var p = poses[name];
      var t = p.translation || [0, 0, 0];
      if (Math.abs(t[0]) > AA.SWEEP_AS_MODELLED_EPS ||
          Math.abs(t[1]) > AA.SWEEP_AS_MODELLED_EPS ||
          Math.abs(t[2]) > AA.SWEEP_AS_MODELLED_EPS) return false;
      var q = p.quaternion || [0, 0, 0, 1];
      if (Math.abs(Math.abs(q[3]) - 1) > AA.SWEEP_AS_MODELLED_EPS) return false;
    }
    return true;
  };

  // The first frame at which every body is at its as-modelled pose, or null
  // when no frame of the run is. Computed once per loaded run: which frame it
  // is belongs to the run (P2's is the LAST one, not the first), so the words
  // below say where it is instead of assuming "the start".
  AA.sweepAsModelledIndex = function (artifact) {
    for (var i = 0; i < artifact.points.length; i++) {
      if (AA.sweepIsAsModelled(AA.sweepFrameAt(artifact, i))) return i;
    }
    return null;
  };

  // The one sentence the gate line carries -- the only place this rule is
  // written. `index` is AA.sweepAsModelledIndex's answer.
  AA.sweepGateWords = function (artifact, index) {
    if (index === null || index === undefined) {
      return "No frame of this run is at the as-modelled pose, so faces cannot be picked here.";
    }
    // The value a reader is scrubbing TO: the run's reference measure (blade
    // pitch) where it has one, the driver otherwise -- the same choice the
    // chip at the scrubber handle makes.
    var measure = artifact.reference && artifact.reference.measure;
    var at = artifact.points[index];
    var value, unit;
    if (measure && at.measures[measure] != null) {
      value = at.measures[measure];
      unit = artifact.measureUnits[measure] || "";
    } else {
      value = AA.indexToDriver(AA.sweepDriverValues(artifact), index);
      unit = artifact.driverUnit || "";
    }
    return "Face picking works at the as-modelled pose only — frame " +
      (index + 1) + " of " + artifact.points.length + ", " +
      AA.formatSweepNumber(value, unit) + (unit ? " " + unit : "") + ".";
  };

  //: The label of the control that goes to that frame.
  AA.SWEEP_GO_TO_POSE = "Go there";

  //: What the bar says about a run whose artifact names no topology.
  AA.SWEEP_NO_TOPOLOGY = "This run names no topology, so the element list stays as it was.";

  // --- where a part sits in the assembly (every mode, not only this one) ----
  //
  // Handoff parts_sit_where_the_assembly_puts_them (2026-10-14). Jeff, on the
  // side-by-side layout this replaced: "I don't think they should be, even
  // for the face picker ... they should be positioned exactly as they are in
  // the assembly." So ONE rule, for the whole app: an opened part with
  // recorded occurrences is drawn at every one of them, at its
  // `placement_world`, in the 217755 frame -- in sweep mode and out of it.
  // A part with none keeps its own origin and says so in words.
  //
  // These live here rather than in a file of their own because this file
  // already owns the one placement layout; a second module would be a second
  // place to learn which way round the 12 floats go.

  //: The most occurrences of one part this app draws. The cost of an
  //: occurrence is a draw call and a matrix, not a copy of the buffers
  //: (scene.js shares them), so the cap is for a pathological part and not a
  //: real one: it sits well above the most-repeated part in the installed
  //: store, which is drawn in full (a [real] check in run_tests.cjs reads the
  //: store and holds the cap to that). A part past the cap is drawn at the
  //: first this-many and says how many it has.
  AA.OCCURRENCE_DRAW_LIMIT = 256;

  // Every occurrence the installed store records, out of each mesh's own
  // provenance: {all, byMesh, productOf}. The pure half of app.js's
  // loadOccurrences -- an occurrence is keyed by its full instance PATH,
  // because `instance_name` is not unique (all five pitch arms are
  // `215071-001.2`).
  AA.readMeshOccurrences = function (meshes, provenanceBySha) {
    var all = [];
    var byMesh = {};
    var productOf = {};
    (meshes || []).forEach(function (mesh) {
      var provenance = (provenanceBySha || {})[mesh.sha256] || null;
      var extraction = (provenance && provenance.extraction) || {};
      productOf[mesh.sha256] = extraction.product_name || null;
      byMesh[mesh.sha256] = [];
      (extraction.instances || []).forEach(function (instance) {
        var placement = instance.placement_world;
        if (!placement || placement.length !== AA.PLACEMENT_VALUES) return;
        var path = instance.instance_path || [instance.instance_name];
        var occurrence = {
          instance_name: instance.instance_name,
          path: path,
          key: path.join("/"),
          placement: placement,
          mesh: mesh.sha256,
        };
        byMesh[mesh.sha256].push(occurrence);
        all.push(occurrence);
      });
    });
    return { all: all, byMesh: byMesh, productOf: productOf };
  };

  // Where one part is drawn when nothing moves it: its own recorded
  // occurrences, up to the cap. `total` is how many it HAS, so a capped part
  // and a part with no position at all can both say what they are.
  AA.restPlacements = function (own, limit) {
    var list = own || [];
    var cap = limit == null ? AA.OCCURRENCE_DRAW_LIMIT : limit;
    var drawn = list.slice(0, cap);
    return {
      placements: drawn.map(function (o) { return o.placement; }),
      keys: drawn.map(function (o) { return o.key; }),
      total: list.length,
      capped: list.length > drawn.length,
    };
  };

  // The two honest notes a part's position can need, in the README's
  // absent-state style: plain words, the state first, what is drawn second.
  AA.ASSEMBLY_POSITION_WORDS = Object.freeze({
    none: "no position in the assembly — shown at its own origin",
    capped: "drawn at {drawn} of its {total} positions in the assembly",
  });

  // null when there is nothing to say -- a part drawn at every one of its
  // positions needs no note, and a row with nothing wrong shows nothing.
  AA.assemblyPositionNote = function (rest) {
    if (!rest || !rest.total) return AA.ASSEMBLY_POSITION_WORDS.none;
    if (rest.capped) {
      return AA.ASSEMBLY_POSITION_WORDS.capped
        .replace("{drawn}", String(rest.placements.length))
        .replace("{total}", String(rest.total));
    }
    return null;
  };

  // A part as a list NAMES it: the installed label without the trailing
  // "(extracted from <the STEP file>)" every mesh from one assembly carries,
  // which is provenance -- the same for all of them -- and not a name.
  AA.meshShortName = function (label) {
    var text = String(label == null ? "" : label);
    var cut = text.replace(/\s*\(extracted from [^)]*\)\s*$/, "");
    return cut || text;
  };

  // Is the occurrence at `key` the one at `ancestor`, or inside it? Paths, not
  // names: `.../215177-001.3/NAS77C3-015.1` is inside `.../215177-001.3`, and
  // `.../215177-001.30` is not.
  AA.occurrenceWithin = function (key, ancestor) {
    var k = String(key), a = String(ancestor);
    return k === a || k.indexOf(a + "/") === 0;
  };

  // --- which occurrences a sweep moves ---------------------------------------
  //
  // A body owns the occurrences its listed parts were MATCHED to (the
  // anchoring above), and -- since 2026-10-14 -- everything recorded inside
  // one of those occurrences. Jeff, on the pitch plate: 215177-001 is "the
  // assembly with the bushings pressed into it", and the bushings are
  // separate meshes under the plate's own occurrence. Listing every one of
  // them on the body by hand is the restated copy linkage's
  // ISSUE_20261001_body_parts_and_link_parts_are_a_hand_restated_copy_of_
  // tolstacks_topology_ids already names; the extraction's own paths say
  // which body a bushing rides on, so this reads them.
  //
  // `claims` are the matched placements, one per moving occurrence:
  // {sha256, key, subject, part}. A listed claim always beats an inherited
  // one, and among inherited ones the DEEPEST enclosing claim wins, so a
  // bearing pressed into a link pressed into a plate rides the link. An
  // occurrence of a DIFFERENT mesh at exactly a claimed path (the design and
  // the instrumented pitch link both recorded at `213862-002.1`) is the same
  // occurrence and moves too; `inside` says which of the two it is.
  AA.sweepCarriedOccurrences = function (all, claims) {
    var listed = {};
    (claims || []).forEach(function (c) { listed[c.sha256 + "|" + c.key] = true; });
    var out = [];
    (all || []).forEach(function (o) {
      if (listed[o.mesh + "|" + o.key]) return;
      var best = null;
      (claims || []).forEach(function (c) {
        if (!AA.occurrenceWithin(o.key, c.key)) return;
        if (!best || c.key.length > best.key.length) best = c;
      });
      if (!best) return;
      out.push({
        sha256: o.mesh, key: o.key, instance_name: o.instance_name,
        placement: o.placement, subject: best.subject, by: best.part,
        under: best.key, inside: o.key !== best.key,
      });
    });
    return out;
  };

  // Per mesh, what to draw at every frame: one entry per occurrence, each
  // {key, placement, subject} where `subject` is the body (or link) whose pose
  // carries it, or null for an occurrence this run does not move. Built ONCE
  // per run, so the frame loop composes matrices and decides nothing.
  //
  // `rows` are app.js's per-part anchoring rows (only `matched` ones move --
  // a ground body's parts sit where the assembly puts them, which is the rest
  // rule already). A mesh appears in `plan` only if something of it moves;
  // every other opened part keeps its rest placements untouched.
  AA.sweepDrawPlan = function (rows, occurrences, limit) {
    var occ = occurrences || { all: [], byMesh: {} };
    var claims = [];
    (rows || []).forEach(function (row) {
      if (row.state !== "matched") return;
      (row.placements || []).forEach(function (p) {
        claims.push({ sha256: row.sha256, key: p.key, placement: p.placement,
          subject: row.subject, part: row.part });
      });
    });
    var carried = AA.sweepCarriedOccurrences(occ.all, claims);
    var moving = {};
    claims.concat(carried).forEach(function (m) {
      (moving[m.sha256] = moving[m.sha256] || []).push(m);
    });
    var plan = {};
    Object.keys(moving).forEach(function (sha) {
      var own = AA.restPlacements((occ.byMesh || {})[sha], limit);
      var entries = own.keys.map(function (key, i) {
        return { key: key, placement: own.placements[i], subject: null };
      });
      moving[sha].forEach(function (m) {
        var at = -1;
        entries.forEach(function (e, i) { if (e.key === m.key) at = i; });
        var entry = { key: m.key, placement: m.placement, subject: m.subject };
        if (at === -1) entries.push(entry); else entries[at] = entry;
      });
      plan[sha] = entries;
    });
    return { plan: plan, carried: carried };
  };

  // One frame's matrices for one mesh's plan entries: a moving occurrence is
  // `pose(t) o placement_world` (AA.anchorPlacement), a still one is its own
  // placement. A distance-constraint member's pose is the artifact's
  // reconstructed one; every other body's is its `poses` entry.
  AA.sweepMeshMatrices = function (entries, frame) {
    var f = frame || {};
    return (entries || []).map(function (e) {
      if (!e.subject) return e.placement;
      var pose = (f.links && f.links[e.subject]) || (f.poses && f.poses[e.subject]) || null;
      return AA.anchorPlacement(pose, e.placement);
    });
  };

  // --- which run is "latest" -------------------------------------------------

  // What a run listing carries per run, read off the run's own document:
  // its id, when it was published, and its mechanism.
  AA.sweepRunEntry = function (runId, doc) {
    var d = doc || {};
    return {
      runId: runId,
      ts: typeof d.ts === "string" ? d.ts : null,
      mechanism: (d.mechanism && d.mechanism.name) || null,
    };
  };

  // Newest first BY THE ARTIFACT'S OWN `ts`, tie-broken by run id. Until
  // 2026-10-14 every adapter sorted by run id alone, which is alphabetical:
  // `vpa-pitch-s-...` beat `vpa-pitch-p1-...` on the letter after the
  // prefix, and Jeff watched run S believing it was P1. A run with no
  // readable `ts` sorts after every run that has one. Every adapter that
  // lists runs answers through this, so there is one ordering to get right.
  AA.orderSweepRuns = function (entries) {
    function when(e) {
      var t = e && e.ts ? Date.parse(e.ts) : NaN;
      return isFinite(t) ? t : -Infinity;
    }
    return (entries || []).slice().sort(function (a, b) {
      var ta = when(a), tb = when(b);
      if (ta !== tb) return tb > ta ? 1 : -1;
      return a.runId < b.runId ? 1 : (a.runId > b.runId ? -1 : 0);
    });
  };

  // --- the mechanism tree (handoff the_sweep_rail_shows_the_mechanism) ------
  //
  // In sweep mode the rail shows the mechanism instead of the bind workflow:
  // bodies, each expanding into its parts; joints, each expanding into the
  // topology features that define it; and, when the run was opened from a
  // kinematic study, that study's ranked contributors at the nearest stop.
  // Everything below is read off the artifact (and the study's projection) and
  // decides nothing about the scene; app.js renders it. Nothing here writes.

  var VOCAB = window.TolstackVocab.annotate;

  //: linkage's joint types and, index for index, the residual rows each one
  //: writes (tolerance_stack/kinematic.py owns both; generated, never copied).
  AA.LINKAGE_JOINT_TYPES = VOCAB.list("LINKAGE_JOINT_TYPES");
  AA.LINKAGE_JOINT_ROW_SIGNATURES = VOCAB.list("LINKAGE_JOINT_ROW_SIGNATURES");

  //: A joint type in the words a reader uses for it. The key set is the
  //: Python vocabulary's, compared when this file loads.
  AA.SWEEP_JOINT_TYPE_WORDS = VOCAB.table("LINKAGE_JOINT_TYPES", {
    spherical: "ball joint",
    distance: "ball-ended link",
    revolute: "hinge",
    cylindrical: "slide",
    prismatic: "straight slide",
    screw: "screw",
    fixed: "fixed joint",
    axial_position: "driver",
  });

  // Each joint's linkage type, read off its own residual rows in
  // `mechanism.row_labels` (`<joint>.<row>`, in the solver's order). The
  // artifact never states a type; the rows are what a type IS on the solver
  // side, so this is a reading and not a guess. A joint whose rows match no
  // type -- a relaxed row, a type added in linkage and not yet here -- is
  // null, and the tree then shows its name without a type word.
  AA.sweepJointTypes = function (artifact) {
    var rows = {};
    (artifact.rowLabels || []).forEach(function (label) {
      var at = String(label).indexOf(".");
      if (at <= 0) return;
      var joint = label.slice(0, at);
      (rows[joint] = rows[joint] || []).push(label.slice(at + 1));
    });
    var out = {};
    Object.keys(rows).forEach(function (joint) {
      var i = AA.LINKAGE_JOINT_ROW_SIGNATURES.indexOf(rows[joint].join(" "));
      out[joint] = i === -1 ? null : AA.LINKAGE_JOINT_TYPES[i];
    });
    return out;
  };

  // The two geometry parameters that say where a joint's two ends sit.
  AA.SWEEP_JOINT_END_PARAMETERS = Object.freeze(["point_a", "point_b"]);

  // The tree's two groups, read off the artifact:
  //
  //   bodies  -- `bodies[]` in the artifact's order: name, ground, parts.
  //              A body that moves is open by default; ground is not.
  //   joints  -- every joint the run solves, in the artifact's order: its
  //              type (above), the body at each end, the parts of a two-force
  //              member (`links[]`), and its features -- one entry per
  //              topology node or edge its `geometry.features[]` entries name,
  //              first appearance first.
  //
  // A joint's two bodies come from the feature joins' own `body` (declared by
  // the producer); where a run carries no joins, from which body each end was
  // MEASURED to ride on (AA.sweepBodyJoints); and where neither answers, null.
  AA.sweepMechanismTree = function (artifact) {
    var types = AA.sweepJointTypes(artifact);
    var riders = AA.sweepBodyJoints(artifact);
    var linkParts = {};
    (artifact.links || []).forEach(function (l) { linkParts[l.joint] = l.parts || []; });
    var names = Object.keys((artifact.points[0] || {}).joints || {});
    Object.keys(types).forEach(function (name) {
      if (names.indexOf(name) === -1) names.push(name);
    });

    var bodies = (artifact.bodies || []).map(function (b) {
      return { name: b.name, ground: !!b.ground, parts: (b.parts || []).slice(),
        open: !b.ground };
    });

    var joints = names.map(function (name) {
      var prefix = name + ".";
      var mine = (artifact.features || []).filter(function (f) {
        return f && typeof f.label === "string" && f.label.indexOf(prefix) === 0;
      });
      var features = [];
      mine.forEach(function (f) {
        if (!f.topology || !(f.node || f.edge)) return;
        var kind = f.node ? "node" : "edge";
        var id = f.node || f.edge;
        var known = features.some(function (x) {
          return x.kind === kind && x.id === id && x.topology === f.topology;
        });
        if (!known) features.push({ topology: f.topology, kind: kind, id: id });
      });
      var ends = AA.SWEEP_JOINT_END_PARAMETERS.map(function (parameter, i) {
        var declared = mine.filter(function (f) {
          return f.body && f.label.indexOf(prefix + parameter + "[") === 0;
        })[0];
        if (declared) return declared.body;
        var end = AA.SWEEP_JOINT_ENDS[i];
        var measured = Object.keys(riders).filter(function (body) {
          return riders[body].some(function (r) { return r.joint === name && r.end === end; });
        })[0];
        return measured || null;
      });
      var type = Object.prototype.hasOwnProperty.call(types, name) ? types[name] : null;
      return { name: name, type: type, words: type ? AA.SWEEP_JOINT_TYPE_WORDS[type] : null,
        bodies: ends, parts: linkParts[name] || [], features: features };
    });
    return { bodies: bodies, joints: joints };
  };

  //: The rail's own words in sweep mode: the three group heads and the one
  //: control a feature row carries.
  AA.SWEEP_RAIL_WORDS = Object.freeze({
    bodies: "bodies",
    joints: "joints",
    contributors: "contributors",
    repick: "Re-pick",
    pick: "Pick",
    repickTitle: "leave the sweep and pick this feature's face at the as-modelled pose",
    showBody: "show or hide this body where the mechanism draws it",
  });

  // One body row's text: its name and how many parts it carries.
  AA.sweepBodyRowWords = function (body) {
    var n = body.parts.length;
    return AA.measureLabel(body.name) + " · " + n + " part" + (n === 1 ? "" : "s");
  };

  // One joint row's text: its name, its type in words, and the two bodies it
  // joins. Every piece the artifact cannot answer is simply left out.
  AA.sweepJointRowWords = function (joint) {
    var parts = [AA.measureLabel(joint.name)];
    if (joint.words) parts.push(joint.words);
    var ends = joint.bodies.filter(Boolean).map(AA.measureLabel);
    if (ends.length === 2 && ends[0] !== ends[1]) parts.push(ends[0] + " ↔ " + ends[1]);
    else if (ends.length) parts.push(ends[0]);
    return parts.join(" · ");
  };

  // Which edge a feature is bound THROUGH, and in which direction. A binding
  // is per topology edge (feature-identity/v0's stack key), one face per end
  // (AA.DIRECTIONS), so:
  //
  //   an edge feature -> that edge, both ends (direction null);
  //   a node feature  -> the edge between it and the joint's other node when
  //                      the topology has one (the link's own length, the two
  //                      bores' coaxiality), else the first edge that ends on
  //                      it -- in the direction that end is.
  //
  // `{edgeId: null}` when no edge of the topology ends on the node: nothing
  // can be bound there, and the row says unbound.
  AA.sweepFeatureEdge = function (topology, feature, siblings) {
    if (feature.kind === "edge") return { edgeId: feature.id, direction: null };
    var edges = (topology && topology.edges) || [];
    var touches = edges.filter(function (e) { return e.from === feature.id || e.to === feature.id; });
    var others = (siblings || []).filter(function (s) {
      return s.kind === "node" && s.id !== feature.id;
    }).map(function (s) { return s.id; });
    var between = touches.filter(function (e) {
      return others.indexOf(e.from === feature.id ? e.to : e.from) !== -1;
    })[0];
    var edge = between || touches[0] || null;
    if (!edge) return { edgeId: null, direction: null };
    return { edgeId: edge.id,
      direction: edge.from === feature.id ? AA.DIRECTIONS[0] : AA.DIRECTIONS[1] };
  };

  // A feature's binding state, in AA.BINDING_STATES -- the element rows'
  // vocabulary, so the rows are coloured by the same rules. An edge feature
  // is its edge's state; a node feature is the state of the binding at ITS
  // end of the edge it is bound through.
  AA.sweepFeatureState = function (identityProjection, staleness, topologyId, via) {
    if (!via || !via.edgeId) return AA.BINDING_STATES.UNBOUND;
    var record = AA.findBindingRecord(identityProjection,
      AA.topologyEdgeKey(topologyId, via.edgeId));
    if (!via.direction || !record) return AA.elementBindingState(record, staleness);
    var all = record.bindings || [];
    var mine = all.filter(function (b) { return b && b.direction === via.direction; });
    if (mine.length) return AA.elementBindingState({ bindings: mine }, staleness);
    if (all.length) return AA.BINDING_STATES.UNBOUND;
    // Nothing bound on the edge: the record's own state -- except that a
    // proposal at the OTHER end is not a suggestion at this one.
    var whole = AA.elementBindingState(record, staleness);
    if (whole === AA.BINDING_STATES.PROPOSED && !AA.endProposals(record, via.direction).length) {
      return AA.BINDING_STATES.UNBOUND;
    }
    return whole;
  };

  // What a feature row has to SUGGEST at its end (handoff a_rail_row_with_a_
  // proposal_says_so_and_accepts_it_in_place), or null:
  //
  //   {kind: "proposed", proposals}      an agent's open proposal(s) at the
  //                                      end, surest first
  //   {kind: "candidates", n, face}      no proposal, but the contact engine
  //                                      ranked n touching pairs on the edge;
  //                                      `face` is the top one's face at this
  //                                      end ({sha256, faceId})
  //
  // A bound end suggests nothing (bound wins, as the fold says). An edge
  // feature (direction null) is either end's proposals, and never
  // candidates: a candidate is a face at ONE end.
  AA.SUGGESTION_KINDS = Object.freeze(["proposed", "candidates"]);
  AA.endSuggestion = function (identityProjection, contactDoc, topologyId, via) {
    if (!via || !via.edgeId) return null;
    var record = AA.findBindingRecord(identityProjection, AA.topologyEdgeKey(topologyId, via.edgeId));
    var bound = ((record && record.bindings) || []).some(function (b) {
      return b && (!via.direction || b.direction === via.direction);
    });
    if (bound) return null;
    var open = AA.endProposals(record, via.direction);
    if (open.length) return { kind: AA.SUGGESTION_KINDS[0], proposals: open };
    if (!via.direction) return null;
    var row = null;
    ((contactDoc && contactDoc.topologies) || []).forEach(function (t) {
      if (t.id !== topologyId) return;
      (t.edges || []).forEach(function (r) { if (r.edge === via.edgeId) row = r; });
    });
    var candidates = (row && row.status === "ok" && row.candidates) || [];
    if (!candidates.length) return null;
    var top = candidates.slice().sort(function (a, b) { return a.rank - b.rank; })[0];
    var side = top[via.direction] || {};
    var face = side.sha256 && (side.faces || []).length
      ? { sha256: side.sha256, faceId: side.faces[0] } : null;
    return { kind: AA.SUGGESTION_KINDS[1], n: candidates.length, face: face };
  };

  // The row's line for a suggestion, in AA.SUGGESTION_ROW_WORDS.
  AA.suggestionWords = function (suggestion) {
    if (!suggestion) return null;
    if (suggestion.kind === AA.SUGGESTION_KINDS[0]) {
      return AA.SUGGESTION_ROW_WORDS.suggested.replace("{confidence}", suggestion.proposals[0].confidence);
    }
    return AA.SUGGESTION_ROW_WORDS.candidates.replace("{n}", String(suggestion.n));
  };

  // A feature's reader-facing name: the topology's own name for the node or
  // edge, else its id in words.
  AA.sweepFeatureName = function (topology, feature) {
    var list = topology ? (feature.kind === "node" ? topology.nodes : topology.edges) : null;
    var row = (list || []).filter(function (x) { return x.id === feature.id; })[0];
    return row && row.name ? row.name : AA.measureLabel(feature.id);
  };

  // --- the open study's contributors -----------------------------------------

  //: A stop's unit as it is written after the number. A unit this table does
  //: not carry is written after a space, as itself.
  AA.STOP_UNIT_MARKS = Object.freeze({ deg: "°" });

  // The stop of a kinematic study nearest the current frame: by the study's
  // own measure where the frame carries it (a stop IS a measure value -- the
  // builder finds its point by value, never by index), by sweep index
  // otherwise. Null for a study with no stops.
  AA.kinematicStopAt = function (study, frame) {
    var stops = (study && study.stops) || [];
    if (!stops.length) return null;
    var measures = frame && frame.nearer && frame.nearer.measures;
    var value = measures && study.measure ? measures[study.measure] : null;
    var byValue = typeof value === "number" && isFinite(value);
    var best = null, bestDistance = Infinity;
    stops.forEach(function (stop) {
      var distance = byValue && typeof stop.target === "number"
        ? Math.abs(value - stop.target)
        : Math.abs((frame ? frame.index : 0) - stop.index);
      if (distance < bestDistance) { best = stop; bestDistance = distance; }
    });
    return best;
  };

  // Which kinematic study a loaded run may list the contributors of: only the
  // one that folded THIS run (handoff the_kinematic_study_checks_its_run_its_
  // units_and_shows_its_limit). A study's rows are magnitudes computed from its
  // own sweep's Jacobian, so under another run's animation they are numbers
  // about a mechanism that is not on screen -- and nothing about them looks
  // wrong. So a mismatched pair is refused where it is received: the study is
  // dropped (the "absent means the group is absent" rule of the sweep rail)
  // and `refusal` is the one line that says why, for the banner and the
  // console. `{study: null, refusal: null}` when no study was asked for.
  //
  // REJECTED: keeping the group under a muted head naming the other run. It
  // still puts numbers beside the animation that are not about the animation.
  AA.sweepStudyFor = function (study, runId) {
    if (!study) return { study: null, refusal: null };
    var folded = study.sweep && study.sweep.run_id;
    if (folded && folded === runId) return { study: study, refusal: null };
    var name = study.title || study.id;
    return { study: null, refusal: folded
      ? "Contributors left out: " + name + " was folded on run " + folded +
        ", not on " + runId + "."
      : "Contributors left out: " + name + " did not build, so it has none for " +
        runId + "." };
  };

  // The contributor group's head: "at the −7° stop", "at the +72° stop".
  AA.kinematicStopWords = function (stop, units) {
    var t = Number(stop.target);
    if (!isFinite(t)) return "at the " + (stop.label || stop.id) + " stop";
    var sign = t < 0 ? "−" : (t > 0 ? "+" : "");
    var number = String(Number(Math.abs(t).toPrecision(6)));
    var mark = Object.prototype.hasOwnProperty.call(AA.STOP_UNIT_MARKS, units)
      ? AA.STOP_UNIT_MARKS[units] : (units ? " " + units : "");
    return "at the " + sign + number + mark + " stop";
  };

  // One stop's rows, in the projection's own (ranked) order: the contributor's
  // name (the topology edge's), its magnitude with the study's unit at the
  // projection's stated precision, the gap reason for a row with no band, and
  // the feature it perturbs.
  AA.kinematicContributorRows = function (study, stop, topology, decimals) {
    var edges = (topology && topology.edges) || [];
    var dp = typeof decimals === "number" ? decimals : null;
    return ((stop && stop.rows) || []).map(function (row) {
      var edge = edges.filter(function (e) { return e.id === row.edge; })[0];
      var magnitude = null;
      if (typeof row.magnitude === "number" && isFinite(row.magnitude)) {
        magnitude = (dp === null ? String(row.magnitude) : row.magnitude.toFixed(dp)) +
          (study.units ? " " + study.units : "");
      }
      var f = row.feature || {};
      return {
        edge: row.edge,
        name: edge && edge.name ? edge.name : AA.measureLabel(row.edge),
        magnitude: magnitude,
        gap: typeof row.gap === "string" && row.gap ? row.gap : null,
        feature: f.node ? { kind: "node", id: f.node } : (f.edge ? { kind: "edge", id: f.edge } : null),
      };
    });
  };

  // Which faces a selected contributor tints: its feature's. A node is the
  // face at its end of the edge it is bound through; an edge -- a length
  // between two features -- is both of its ends. Returns the {edgeId,
  // direction} reads AA.planHighlightFaces takes, never a face: which faces
  // exist is the binding projection's to say. A node is read through the edge
  // its joint's own feature row uses (`tree`, AA.sweepMechanismTree), so the
  // contributor and the feature tint the same face.
  AA.contributorHighlightReads = function (topology, contributor, tree) {
    var f = contributor && contributor.feature;
    if (!f) return [];
    if (f.kind === "edge") return [{ edgeId: f.id, direction: null }];
    var joint = ((tree && tree.joints) || []).filter(function (j) {
      return j.features.some(function (x) { return x.kind === f.kind && x.id === f.id; });
    })[0];
    var via = AA.sweepFeatureEdge(topology, f, joint ? joint.features : []);
    return via.edgeId ? [via] : [];
  };

  // --- the rail and the scene point at each other (handoff the_rail_and_the_
  // scene_point_at_each_other) ------------------------------------------------
  //
  // One fact underneath all of it: WHICH DRAWN OCCURRENCE IS A RAIL SUBJECT.
  // A subject is a body (`bodies[]`) or a link (`links[]`, named by its
  // joint), and app.js's anchoring rows (anchorSweepBodies) already say, per
  // part, which recorded occurrence(s) the subject was placed at: a ground
  // body at every occurrence its own meshes record, a moving one at the
  // occurrence that earned the placement, plus everything carried inside it.
  // An occurrence is addressed by its recorded `key` (the instance path the
  // extraction wrote), never by its index in a drawn list -- the index of an
  // occurrence in a sweep's override is not its index at rest.

  // {subject: [{sha256, key}]}, in row order, each pair once.
  AA.sweepSubjectOccurrences = function (rows) {
    var out = {};
    (rows || []).forEach(function (row) {
      if (!row || !row.subject || !row.sha256) return;
      var list = out[row.subject] = out[row.subject] || [];
      (row.placements || []).forEach(function (p) {
        if (!p || p.key == null) return;
        var known = list.some(function (o) { return o.sha256 === row.sha256 && o.key === p.key; });
        if (!known) list.push({ sha256: row.sha256, key: p.key });
      });
    });
    return out;
  };

  // The subject a drawn occurrence belongs to -- the pick's way back into the
  // rail -- or null for an occurrence no subject was placed at (the four
  // pitch arms the run leaves still). A part LISTED on a subject beats one
  // carried inside it.
  AA.sweepOccurrenceSubject = function (rows, sha256, key) {
    var carried = null;
    var list = rows || [];
    for (var i = 0; i < list.length; i++) {
      var row = list[i];
      if (!row || row.sha256 !== sha256) continue;
      var here = (row.placements || []).some(function (p) { return p && p.key === key; });
      if (!here) continue;
      if (row.state !== "carried") return row.subject;
      if (!carried) carried = row.subject;
    }
    return carried;
  };

  // The occurrences one tree part row stands for: that mesh's occurrences on
  // its subject -- or, with no subject, null, meaning every occurrence the
  // mesh has (the parts panel's rule).
  AA.sweepPartOccurrences = function (bySubject, subject, sha256) {
    if (!subject) return null;
    return ((bySubject || {})[subject] || []).filter(function (o) { return o.sha256 === sha256; });
  };

  // Every (edge, end) the binding projection binds THIS face to in one
  // topology -- the reverse of AA.planHighlight, for a pick that has to find
  // its feature rows. [] for an unbound face, the ordinary answer.
  AA.bindingsOfFace = function (identityProjection, topologyId, sha256, faceId) {
    var out = [];
    ((identityProjection && identityProjection.stack_keys) || []).forEach(function (row) {
      var key = row && row.stack_key;
      if (!key || key.kind !== "topology_edge" || key.topology_id !== topologyId) return;
      (row.bindings || []).forEach(function (b) {
        var g = (b && b.geometry_key) || {};
        if (g.source_step_sha256 === sha256 && g.face_id === faceId) {
          out.push({ edgeId: key.edge_id, direction: b.direction || null });
        }
      });
    });
    return out;
  };

  // Does a feature row's read ({edgeId, direction}, AA.sweepFeatureEdge) name
  // one of a face's bindings? An edge feature (direction null) is either end.
  AA.featureReadMatches = function (via, bindings) {
    if (!via || !via.edgeId) return false;
    return (bindings || []).some(function (b) {
      return b.edgeId === via.edgeId &&
        (!via.direction || !b.direction || b.direction === via.direction);
    });
  };

  //: A feature row's bound face, in words a reader can check against the
  //: model: the face id and the part's drawing number. `none` is the row's
  //: line when nothing is bound at its end.
  AA.BOUND_FACE_WORDS = Object.freeze({
    face: "face {face} of {part}",
    none: "no face bound",
  });

  // The faces a feature's read names, each with the words for it: [{sha256,
  // faceId, text}]. The part is named by its number (AA.partNumberOf, the
  // parts panel's own reading of a mesh label); a mesh this store does not
  // carry is named by the start of its sha, which is all there is to say.
  AA.boundFaceRows = function (identityProjection, topologyId, via, meshList) {
    if (!via || !via.edgeId) return [];
    var record = AA.findBindingRecord(identityProjection, AA.topologyEdgeKey(topologyId, via.edgeId));
    var out = [];
    ((record && record.bindings) || []).forEach(function (b) {
      if (via.direction && (!b || b.direction !== via.direction)) return;
      var g = (b && b.geometry_key) || {};
      if (!g.source_step_sha256 || typeof g.face_id !== "number") return;
      var mesh = (meshList || []).filter(function (m) { return m.sha256 === g.source_step_sha256; })[0];
      var part = (mesh && (AA.partNumberOf(mesh.label) || AA.meshShortName(mesh.label))) ||
        String(g.source_step_sha256).slice(0, 12);
      out.push({ sha256: g.source_step_sha256, faceId: g.face_id,
        text: AA.BOUND_FACE_WORDS.face.replace("{face}", String(g.face_id)).replace("{part}", part) });
    });
    return out;
  };

  // The topology part ids on an edge and at its two ends, each once, edge
  // first: what a contributor's alert names the drawings of, and what its
  // hover lights when no face is bound at either end.
  AA.edgePartIds = function (topology, edgeId) {
    var edges = (topology && topology.edges) || [];
    var nodes = (topology && topology.nodes) || [];
    var edge = edges.filter(function (e) { return e.id === edgeId; })[0];
    if (!edge) return [];
    var ids = [];
    function add(id) { if (id && ids.indexOf(id) === -1) ids.push(id); }
    add(edge.part);
    (edge.parts || []).forEach(add);
    [edge.from, edge.to].forEach(function (nodeId) {
      var node = nodes.filter(function (n) { return n.id === nodeId; })[0];
      if (!node) return;
      add(node.part);
      (node.parts || []).forEach(add);
    });
    return ids;
  };

  //: What a contributor's alert adds to its gap sentence: the drawing(s) to
  //: read to close it, and what the row's Pick does.
  AA.CONTRIBUTOR_ALERT_WORDS = Object.freeze({
    drawing: "Drawing to read: {list}.",
    drawings: "Drawings to read: {list}.",
    pick: "Pick binds its faces at the as-modelled pose.",
  });

  // A contributor row's alerts, in the {state, text} shape every badge in
  // this app is handed (AA.elementAlerts). One alert: the gap sentence, the
  // drawings of the edge's parts (number and everyday name, from the
  // topology's own `parts[]`), and what Pick does. [] for a row with no gap.
  AA.contributorAlerts = function (row, topology) {
    if (!row || !row.gap) return [];
    var parts = (topology && topology.parts) || [];
    var drawings = [];
    AA.edgePartIds(topology, row.edge).forEach(function (id) {
      var part = parts.filter(function (p) { return p.id === id; })[0];
      if (!part || !part.drawing) return;
      // A name that already carries its number ("212956-005 pitch anti-
      // rotation link assembly") is the whole label; otherwise number first.
      var words = !part.name ? part.drawing
        : (part.name.indexOf(part.drawing) === -1 ? part.drawing + " " + part.name : part.name);
      if (drawings.indexOf(words) === -1) drawings.push(words);
    });
    var text = row.gap;
    if (drawings.length) {
      text += " " + (drawings.length === 1 ? AA.CONTRIBUTOR_ALERT_WORDS.drawing
        : AA.CONTRIBUTOR_ALERT_WORDS.drawings).replace("{list}", drawings.join("; "));
    }
    text += " " + AA.CONTRIBUTOR_ALERT_WORDS.pick;
    return [{ state: AA.CONTRIBUTOR_ALERT_STATE, text: text }];
  };

  //: The one state a contributor's alert is in: its row has no cited band.
  AA.CONTRIBUTOR_ALERT_STATE = "gap";

  //: The rail's row kinds, in the tree's own order, and the word each one's
  //: filter chip wears. The kinds ARE the tree's: three are its groups'
  //: `data-group`, and `features` is the joint group's feature rows.
  AA.SWEEP_ROW_KINDS = Object.freeze(["bodies", "joints", "features", "contributors"]);
  AA.SWEEP_ROW_KIND_WORDS = Object.freeze({
    bodies: AA.SWEEP_RAIL_WORDS.bodies,
    joints: AA.SWEEP_RAIL_WORDS.joints,
    features: "surfaces",
    contributors: AA.SWEEP_RAIL_WORDS.contributors,
  });

  // The chips' remembered state: the kinds a reader has hidden, in
  // AA.SWEEP_ROW_KINDS' order. Anything unreadable -- nothing stored, a
  // broken value, a kind this build does not have -- reads as nothing hidden.
  AA.readHiddenRowKinds = function (store) {
    var raw = null;
    try { raw = store ? store.getItem(AA.PREF_KEYS.sweepRowKinds) : null; } catch (err) { raw = null; }
    var list = null;
    try { list = JSON.parse(raw); } catch (err) { list = null; }
    if (!Array.isArray(list)) return [];
    return AA.SWEEP_ROW_KINDS.filter(function (k) { return list.indexOf(k) !== -1; });
  };

  AA.writeHiddenRowKinds = function (store, hidden) {
    try {
      if (store) {
        store.setItem(AA.PREF_KEYS.sweepRowKinds, JSON.stringify(
          AA.SWEEP_ROW_KINDS.filter(function (k) { return (hidden || []).indexOf(k) !== -1; })));
      }
    } catch (err) {
      // A browser that refuses to store it still honours the chips now.
    }
  };

  // One chip pressed: that kind hidden if it was shown, shown if hidden.
  AA.toggleRowKind = function (hidden, kind) {
    if (AA.SWEEP_ROW_KINDS.indexOf(kind) === -1) {
      throw new Error("the rail lists " + AA.SWEEP_ROW_KINDS.join(", ") + ", got " + JSON.stringify(kind));
    }
    var on = (hidden || []).indexOf(kind) !== -1;
    return AA.SWEEP_ROW_KINDS.filter(function (k) {
      return k === kind ? !on : (hidden || []).indexOf(k) !== -1;
    });
  };

  // --- an armed pick (handoff a_face_is_picked_the_way_cad_picks_it) ---------
  //
  // Jeff, 2026-10-29: "When you go to pick a surface, it needs to filter the
  // view to only show the body that the surface is attached to … and have a
  // selection filter so that you can only select surfaces from the actual
  // part containing the interface. Also a hover over pre-selection." A joint
  // end's Pick ARMS the pick in place, in sweep mode: the sweep goes to the
  // as-modelled pose, the end's part is drawn opaque and every other part
  // ghosted (or hidden), the raycast hits only that part, a hover pre-selects
  // and the click binds. The pure half is below; app.js wires it.

  //: Every word an armed pick shows -- on the row's state line, its two
  //: buttons, the toast and the bar's way back.
  AA.ARMED_PICK_WORDS = Object.freeze({
    armed: "at the as-modelled pose for picking",
    notOn: "not on {part}",
    sameFace: "already bound to face {face}",
    bound: "bound · face {face}",
    toast: "Bound {end} to face {face} of {part}",
    noPart: "no installed 3D part to pick on",
    noPose: "no frame of this run is at the as-modelled pose",
    cancel: "Cancel",
    cancelTitle: "stop picking and put the scene back (Esc)",
    pickTitle: "pick this feature's face in the 3D view",
    back: "back to the sweep",
    others: { ghost: "ghost others", hide: "hide others" },
    othersTitle: "how the parts you are not picking on are drawn",
  });

  //: How the parts an armed pick is NOT on are drawn: ghosted (very low
  //: opacity, no depth write) or hidden. Ghost first: it is the default.
  AA.ARM_OTHERS_MODES = Object.freeze(["ghost", "hide"]);

  AA.readArmOthers = function (store) {
    var raw = null;
    try { raw = store ? store.getItem(AA.PREF_KEYS.armOthers) : null; } catch (err) { raw = null; }
    return AA.ARM_OTHERS_MODES.indexOf(raw) !== -1 ? raw : AA.ARM_OTHERS_MODES[0];
  };

  AA.writeArmOthers = function (store, mode) {
    if (AA.ARM_OTHERS_MODES.indexOf(mode) === -1) {
      throw new Error("others are drawn " + AA.ARM_OTHERS_MODES.join(" or ") + ", got " + JSON.stringify(mode));
    }
    try { if (store) store.setItem(AA.PREF_KEYS.armOthers, mode); } catch (err) { /* honoured now anyway */ }
  };

  // The topology part ids a face for one END of an edge can be on, best
  // first: the end node's own parts IN THE ORDER IT NAMES THEM, else the
  // edge's. The order is taken as the topology's convention that the face is
  // on the first-named part ("hub blade-1 root bearing bore" is [hub,
  // blade_root]; "pitch arm root clamp face against the blade root" is
  // [pitch_arm, blade_root]), whichever edge the end is bound through. Only
  // the "X against Y" names state it; for the other two-part nodes the order
  // is unverified -- "gas-spring bushing in the pitch plate" lists
  // [pitch_plate, gas_spring] (review 2026-10-29; ISSUE_20261029_an_armed_
  // pick_assumes_the_face_is_on_the_nodes_first_named_part). The
  // caller arms on the first one with an installed mesh. [] when nothing
  // names a part -- an end there is nothing to pick on.
  AA.pickEndPartIds = function (topology, edgeId, direction) {
    var edges = (topology && topology.edges) || [];
    var nodes = (topology && topology.nodes) || [];
    var edge = edges.filter(function (e) { return e.id === edgeId; })[0];
    if (!edge) return [];
    var nodeId = direction === AA.DIRECTIONS[1] ? edge.to : edge.from;
    var node = nodes.filter(function (n) { return n.id === nodeId; })[0];
    var own = [];
    function add(list, id) { if (id && list.indexOf(id) === -1) list.push(id); }
    if (node) { add(own, node.part); (node.parts || []).forEach(function (id) { add(own, id); }); }
    var edgeParts = [];
    add(edgeParts, edge.part);
    (edge.parts || []).forEach(function (id) { add(edgeParts, id); });
    return own.length ? own : edgeParts;
  };

  // What the state line says while the pointer pre-selects a face: its
  // number, its surface class in the suggestion engine's everyday words, and
  // the radius that engine fitted, where it fitted one. `cls` is the face's
  // AA.classifyPartFaces entry, or null while the part is unclassified.
  AA.preselectWords = function (faceId, cls) {
    var words = ["face " + faceId];
    if (cls && cls.surface && cls.surface !== "other" && AA.SURFACE_WORDS) {
      words.push(AA.SURFACE_WORDS[cls.surface]);
      if (cls.radius > 0) words.push("r " + AA.formatSweepNumber(cls.radius, "mm") + " mm");
    }
    return words.join(" · ");
  };

  // One word in an ARMED_PICK_WORDS template, by name.
  AA.armedWords = function (key, fields) {
    var text = AA.ARMED_PICK_WORDS[key];
    Object.keys(fields || {}).forEach(function (k) {
      text = text.split("{" + k + "}").join(String(fields[k]));
    });
    return text;
  };

  //: What one click does while a pick is armed (AA.planArmedClick).
  AA.ARMED_CLICK_ACTIONS = Object.freeze(["bind", "refuse", "same", "stay"]);

  // A click while armed. `pick` is the filtered raycast's answer (a face on
  // the armed part, or null); `other` is what an unfiltered ray hit when the
  // filtered one did not (a face on another part, or null). `standing` is the
  // end's standing bindings ([{event_id, geometry_key}]).
  //
  //   empty space        -> stay   (the arm is kept; nothing is said)
  //   another part only  -> refuse (the state line says which part it is on)
  //   the face already bound at this end -> same (no second event; unbinding
  //                         needs a retraction the event schema does not have)
  //   any other face     -> bind, superseding the end's one standing binding
  //                         when there is exactly one (a re-pick replaces)
  AA.planArmedClick = function (pick, other, standing) {
    var acts = AA.ARMED_CLICK_ACTIONS;
    if (!pick) return { action: other ? acts[1] : acts[3], other: other || null };
    var list = standing || [];
    var same = list.some(function (b) {
      var g = b && b.geometry_key;
      return g && g.source_step_sha256 === pick.sha256 && g.face_id === pick.faceId;
    });
    if (same) return { action: acts[2], faceId: pick.faceId };
    return { action: acts[0], pick: pick,
      supersedes: list.length === 1 ? list[0].event_id : null };
  };

  // An end's standing bindings, out of its edge's record.
  AA.endBindings = function (record, direction) {
    return ((record && record.bindings) || []).filter(function (b) {
      return b && b.direction === direction;
    });
  };
})(window.AnnotateApp = window.AnnotateApp || {});
