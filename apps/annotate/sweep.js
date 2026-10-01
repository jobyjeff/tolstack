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
// THIS APP WRITES NOTHING IN SWEEP MODE. The artifact is a solver's output,
// read out of the inbox and rendered; the one write path this app has
// (storage.writeFeatureIdentityEvent) is not reachable from anything here.
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
  AA.SWEEP_LAYERS = Object.freeze(["stick", "bodies", "trail", "ghost"]);
  AA.SWEEP_DEFAULT_LAYERS = Object.freeze(
    { stick: true, bodies: true, trail: false, ghost: false });

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
  //: being fitted. The pitch arm is one solid; the hub is 286.
  AA.SWEEP_FIT_TRIANGLE_BUDGET = 60000;
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
      source: doc.source || null,
      frame: doc.frame || null,
      mechanismName: mechanism.name || null,
      driverLabel: (mechanism.driver && mechanism.driver.label) || null,
      driverUnit: (mechanism.driver && mechanism.driver.unit) || null,
      measureUnits: measures.units || {},
      bodies: Array.isArray(doc.bodies) ? doc.bodies : [],
      links: Array.isArray(doc.links) ? doc.links : [],
      reference: doc.reference || null,
      points: points,
      notConverged: points.filter(function (p) { return !p.converged; }).length,
    };
  };

  // What the hint bar's one line says about the loaded run. Returns the parts;
  // the bar joins them, because the separator is presentation.
  AA.sweepSummaryParts = function (artifact) {
    var parts = [];
    if (artifact.runId) parts.push(artifact.runId);
    if (artifact.source) parts.push(AA.sweepSourceWords(artifact.source));
    if (artifact.mechanismName) parts.push(artifact.mechanismName);
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

  // `candidates` are already-placed feature points, one entry per mesh
  // instance: {instance_name, points: [[x,y,z], ...]}. `target` is the
  // artifact's own joint point for that body at the as-modelled frame.
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
      (c.points || []).forEach(function (p) {
        var dx = p[0] - target[0], dy = p[1] - target[1], dz = p[2] - target[2];
        var d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < best) best = d;
      });
      return { instance_name: c.instance_name, residual: best };
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
    return { chosen: best.instance_name, refused: false,
      residual: best.residual, runnerUp: runnerUp };
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

  // Which joints ride on which body -- MEASURED, not declared. The artifact
  // says which parts a body carries and where every joint point is, but never
  // which joint belongs to which body, and a body's triad has to be drawn
  // somewhere that means something. So: a joint rides on a body when that
  // body's pose, applied to the joint's as-modelled point, reproduces the
  // joint's own point at every sampled instant. That is a fact about the
  // numbers in the file rather than a convention this app and linkage would
  // both have to remember.
  //
  // A joint that never moves matches GROUND and possibly nothing else, so a
  // non-ground body always wins a tie: ground's identity pose reproduces a
  // stationary point trivially, and "it is bolted to the thing that moves,
  // at the point where it does not" is the more useful reading.
  AA.SWEEP_RIDES_EPS = 1e-6; // mm

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
      var home = reference.joints[jointName].point_a_world;
      if (!home) return;
      var winner = null;
      (artifact.bodies || []).forEach(function (body) {
        var rides = samples.every(function (point) {
          var joint = point.joints[jointName];
          var pose = point.poses[body.name];
          if (!joint || !joint.point_a_world || !pose) return false;
          var moved = AA.applyPlacement(AA.poseToPlacement(pose), home);
          var p = joint.point_a_world;
          return Math.abs(moved[0] - p[0]) <= AA.SWEEP_RIDES_EPS &&
            Math.abs(moved[1] - p[1]) <= AA.SWEEP_RIDES_EPS &&
            Math.abs(moved[2] - p[2]) <= AA.SWEEP_RIDES_EPS;
        });
        if (!rides) return;
        if (!winner || (winner.ground && !body.ground)) winner = body;
      });
      if (winner) out[winner.name].push(jointName);
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
        // GROUND is the one body whose anchor is not measured: its frame IS
        // the assembly frame, so its triad belongs at the assembly origin and
        // is drawn there once, muted. It would otherwise often have no
        // anchor at all -- every joint it shares with a moving body goes to
        // the moving one under the tie-break above.
        if (b.ground) return { name: b.name, ground: true, joints: mine, anchor: [0, 0, 0] };
        var sum = [0, 0, 0], n = 0;
        mine.forEach(function (jointName) {
          var p = asModelled.joints[jointName] && asModelled.joints[jointName].point_a_world;
          if (!p) return;
          sum[0] += p[0]; sum[1] += p[1]; sum[2] += p[2]; n++;
        });
        return { name: b.name, ground: !!b.ground, joints: mine,
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

  // The one line the bar shows in place of the bind instruction while the
  // linkage is away from the pose everything else in this app is about.
  AA.SWEEP_PICKING_DISABLED =
    "Binding is off while the linkage is away from its as-modelled pose — " +
    "scrub back to the start to pick a face.";

})(window.AnnotateApp = window.AnnotateApp || {});
