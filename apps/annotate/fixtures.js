// The ?mock=1 demo dataset -- apps/viewer/fixtures.js's role, scaled down to
// what this app needs to exercise: one topology with THREE edges and FOUR named
// interfaces, one existing binding, and a two-face synthetic mesh so the 3D
// pane has something real to raycast against with no rotorkit dependency.
//
// Three, and each one earns its place:
//   * `demo_edge_traced`      already drawing-cited, and unbound -- the
//                             precedence-guard copy needs a cited edge to show
//                             up on, and the rail needs an `unbound` row
//   * `demo_edge_untraced`    uncited and BOUND, with a part that resolves to
//                             the mesh below, so
//                             `?topology=demo_system&edge=demo_edge_untraced&isolate=demo_triangle`
//                             is a real end-to-end deep-link demo
//   * `demo_edge_no_owner`    `owner_not_in_set`, naming a part with no mesh
//
// So the three cover all three binding states at once, which is what the rail's
// consolidated alert badge is exercised against
// (flyout_resize_annotator_filter_and_deselect, 2026-09-16) -- and it said "two
// edges" until then, one file over from where the same stale count was fixed.
//
// TWO things grew on 2026-09-21 (handoff annotate_face_suggestions), and both
// grew for the same reason -- the face-suggestion display is a claim about what
// is on SCREEN, so the browser tier has to be able to see it happen, and it
// could not against a one-face mesh in a topology with no interface names:
//
//   * the topology gained a `nodes` table with reader-facing names. The
//     suggestion rules ask the INTERFACE what kind of surface it is before they
//     ask the dimension (suggestions.js), and bare ids say nothing.
//   * the mesh gained a SECOND face -- a triangle beside the first, in the same
//     plane. Face 0 is the one the fixture's binding already claims, so with
//     one face there was never a candidate left to suggest. Side by side rather
//     than stacked on purpose: a second triangle in front of the first would
//     occlude it, and the deselect tier aims a real click at face 0's own
//     centroid.
(function (AA) {
  "use strict";

  var DEMO_SHA = "0000000000000000000000000000000000000000000000000000000000000".slice(1); // 64 zeros
  function buf(arr, TypedArray) { return new TypedArray(arr).buffer; }

  var meshManifests = {};
  meshManifests[DEMO_SHA] = {
    n_vertices: 6,
    n_triangles: 2,
    n_faces: 2,
    positions_file: "positions.f32",
    indices_file: "indices.u32",
    face_ids_file: "face_ids.u32",
    // Each face's triangulation nodes occupy a CONTIGUOUS run of the vertex
    // buffer, in face_id order -- the tessellation contract every consumer in
    // this app depends on (AA.faceVertexRanges, AA.faceSubGeometry). A fixture
    // that broke it would make the face-geometry tier pass against nothing.
    faces: [
      { face_id: 0, solid_id: 0, n_triangles: 1, n_vertices: 3, area_native2: 0.5, centroid_native: [0.33, 0.33, 0] },
      { face_id: 1, solid_id: 0, n_triangles: 1, n_vertices: 3, area_native2: 0.5, centroid_native: [2.33, 0.33, 0] },
    ],
  };

  var meshProvenance = {};
  // The label is what the parts panel shows a reader; `part_id` is what a
  // deep link's `isolate=` names, so it stays `demo_triangle` however many
  // triangles the mesh grows.
  // `extraction.instances[]` joined this fixture on 2026-10-01 (handoff
  // kinematic_sweep_animation): sweep mode anchors a part by composing a body
  // pose onto an occurrence's recorded `placement_world`, and it chooses
  // WHICH occurrence by geometry, so mock mode needs two -- one that agrees
  // with the demo run's crank-tip joint and one that plainly does not.
  //
  // The agreeing one places face 0's centroid exactly on the as-modelled
  // crank tip, (0, 60 cos 72°, 60 sin 72°); the other is the same placement
  // 200 mm away in +Y, which is further than the coarse acceptance radius and
  // is therefore a real distractor rather than decoration.
  var DEMO_TIP = [0, 60 * Math.cos(72 * Math.PI / 180), 60 * Math.sin(72 * Math.PI / 180)];
  var DEMO_FACE0_CENTROID = [0.33, 0.33, 0];
  function demoPlacement(offsetY) {
    return [
      1, 0, 0, DEMO_TIP[0] - DEMO_FACE0_CENTROID[0],
      0, 1, 0, DEMO_TIP[1] - DEMO_FACE0_CENTROID[1] + offsetY,
      0, 0, 1, DEMO_TIP[2] - DEMO_FACE0_CENTROID[2],
    ];
  }
  meshProvenance[DEMO_SHA] = {
    label: "Demo part (synthetic, mock mode)", part_id: "demo_triangle",
    extraction: {
      product_name: "demo_triangle", n_solids: 1,
      instances: [
        { instance_name: "demo-triangle.1", instance_path: ["demo_system", "demo-triangle.1"],
          placement_world: demoPlacement(0) },
        { instance_name: "demo-triangle.2", instance_path: ["demo_system", "demo-triangle.2"],
          placement_world: demoPlacement(200) },
      ],
    },
  };

  var meshBuffers = {};
  meshBuffers[DEMO_SHA] = {
    "positions.f32": buf([
      0, 0, 0, 1, 0, 0, 0, 1, 0,   // face 0
      2, 0, 0, 3, 0, 0, 2, 1, 0,   // face 1, beside it and in the same plane
    ], Float32Array),
    "indices.u32": buf([0, 1, 2, 3, 4, 5], Uint32Array),
    "face_ids.u32": buf([0, 1], Uint32Array),
  };

  // --- the ?mock=1 sweep run (handoff kinematic_sweep_animation) -----------
  //
  // A SYNTHETIC `linkage-sweep/v1` run, solved in closed form right here, so
  // sweep mode is exercisable -- and screenshot-able -- with no folder grant
  // and no dependency on a run the `linkage` repo has published. It is
  // labelled synthetic in its own `run_id` and `mechanism.name`: nothing
  // about this run is a measurement of anything, and a reader who finds it on
  // screen must be able to tell that in one glance.
  //
  // The mechanism is the shape of the real one and not its numbers: a crank
  // on a hinge at the origin, turning about +X; a slider running along +Z; a
  // rigid link of fixed length between the crank tip and the slider point.
  // Given the crank angle, the slider position is the one root that keeps the
  // link's length -- so `|A - B|` really does hold across the whole sweep,
  // which is the readout the whole surface exists to let a reader check.
  //
  //   A(t) = (0, Ra cos t, Ra sin t)                        the crank tip
  //   B(t) = (0, 0, Ra sin t - sqrt(L^2 - Ra^2 cos^2 t))    the slider point
  //
  // The crank's zero is at the slider axis rather than along it, which is
  // what makes the slider MONOTONE in the crank angle across the whole swept
  // range -- an inline crank is symmetric about its own top centre, so a
  // sweep straddling it would hand the scrubber a driver that goes up and
  // then down, and "which point is 20 mm of travel" would have two answers.
  //
  // Point 40 is deliberately marked NOT CONVERGED with a visible residual.
  // There is nothing wrong with its geometry -- it is there so the warning
  // treatment, and the mark the scrubber puts under an unconverged point,
  // have something to draw in a build nobody has to assemble data for.
  var DEMO_CRANK = 60;      // crank radius, mm
  var DEMO_LINK = 100;      // link length, mm -- the number the readout checks
  var DEMO_FIRST_DEG = -7;  // the sweep's two ends, in crank angle
  var DEMO_LAST_DEG = 72;   // ...and the as-modelled pose, where poses are identity
  var DEMO_POINTS = 80;
  var DEMO_UNCONVERGED = 40;

  function demoSlider(angleDeg) {
    var t = angleDeg * Math.PI / 180;
    var c = DEMO_CRANK * Math.cos(t);
    return DEMO_CRANK * Math.sin(t) - Math.sqrt(DEMO_LINK * DEMO_LINK - c * c);
  }
  function demoCrankTip(angleDeg) {
    var t = angleDeg * Math.PI / 180;
    return [0, DEMO_CRANK * Math.cos(t), DEMO_CRANK * Math.sin(t)];
  }
  function demoSliderPoint(angleDeg) {
    return [0, 0, demoSlider(angleDeg)];
  }
  // The spin-free link pose, by the artifact's own stated convention: the
  // minimal rotation carrying the as-modelled A->B direction onto the current
  // one, and the translation that lands as-modelled A on current A.
  function demoLinkPose(angleDeg) {
    var a0 = demoCrankTip(DEMO_LAST_DEG), b0 = demoSliderPoint(DEMO_LAST_DEG);
    var a = demoCrankTip(angleDeg), b = demoSliderPoint(angleDeg);
    function unit(p, q) {
      var v = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
      var n = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
      return [v[0] / n, v[1] / n, v[2] / n];
    }
    var d0 = unit(a0, b0), d = unit(a, b);
    var axis = [d0[1] * d[2] - d0[2] * d[1], d0[2] * d[0] - d0[0] * d[2],
      d0[0] * d[1] - d0[1] * d[0]];
    var sin = Math.sqrt(axis[0] * axis[0] + axis[1] * axis[1] + axis[2] * axis[2]);
    var cos = d0[0] * d[0] + d0[1] * d[1] + d0[2] * d[2];
    var angle = Math.atan2(sin, cos);
    var rotvec = sin < 1e-12 ? [0, 0, 0]
      : [axis[0] / sin * angle, axis[1] / sin * angle, axis[2] / sin * angle];
    // t = A - R a0, with R applied by Rodrigues so this file needs no matrix.
    var k = sin < 1e-12 ? [0, 0, 0] : [axis[0] / sin, axis[1] / sin, axis[2] / sin];
    var kxa = [k[1] * a0[2] - k[2] * a0[1], k[2] * a0[0] - k[0] * a0[2],
      k[0] * a0[1] - k[1] * a0[0]];
    var kda = k[0] * a0[0] + k[1] * a0[1] + k[2] * a0[2];
    var c = Math.cos(angle), s2 = Math.sin(angle);
    var ra0 = [
      a0[0] * c + kxa[0] * s2 + k[0] * kda * (1 - c),
      a0[1] * c + kxa[1] * s2 + k[1] * kda * (1 - c),
      a0[2] * c + kxa[2] * s2 + k[2] * kda * (1 - c),
    ];
    return { translation: [a[0] - ra0[0], a[1] - ra0[1], a[2] - ra0[2]], rotvec: rotvec };
  }

  // The sweep is driven on the ACTUATOR, in equal steps of travel, exactly as
  // the real run is -- so the crank angle this fixture reports is solved
  // (by bisection on a monotone travel) rather than handed out, and lands
  // nowhere near a whole degree.
  function demoAngleAtTravel(travel, zeroTravel) {
    var lo = DEMO_FIRST_DEG, hi = DEMO_LAST_DEG;
    for (var k = 0; k < 60; k++) {
      var mid = (lo + hi) / 2;
      if (zeroTravel - demoSlider(mid) > travel) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  function demoSweepRun() {
    var zeroTravel = demoSlider(DEMO_LAST_DEG);
    var maxTravel = zeroTravel - demoSlider(DEMO_FIRST_DEG);
    // The "sheet": a coarse whole-degree table of (travel, blade pitch), the
    // shape a measurement reference actually arrives in. Reading it at this
    // run's own driver values means interpolating it, and the chord-against-
    // curve error of that interpolation is what the solved-minus-reference
    // readout shows -- small, real, and nobody's fabrication.
    var sheet = [];
    for (var deg = DEMO_FIRST_DEG; deg <= DEMO_LAST_DEG; deg++) {
      sheet.push({ travel: zeroTravel - demoSlider(deg), pitch: deg });
    }
    function sheetPitchAt(travel) {
      for (var k = 0; k < sheet.length - 1; k++) {
        var lo = sheet[k], hi = sheet[k + 1];
        if (travel <= lo.travel && travel >= hi.travel) {
          var span = hi.travel - lo.travel;
          var u = Math.abs(span) < 1e-12 ? 0 : (travel - lo.travel) / span;
          return lo.pitch + (hi.pitch - lo.pitch) * u;
        }
      }
      return travel > sheet[0].travel ? sheet[0].pitch : sheet[sheet.length - 1].pitch;
    }

    var points = [];
    var referenceValues = [];
    for (var i = 0; i < DEMO_POINTS; i++) {
      var travel = maxTravel * (1 - i / (DEMO_POINTS - 1));
      var deg = demoAngleAtTravel(travel, zeroTravel);
      var a = demoCrankTip(deg), b = demoSliderPoint(deg);
      var turned = (deg - DEMO_LAST_DEG) * Math.PI / 180;
      var converged = i !== DEMO_UNCONVERGED;
      referenceValues.push(sheetPitchAt(travel));
      points.push({
        index: i,
        driver_value: travel,
        converged: converged,
        residual_norm: converged ? 1.2e-14 : 4.7e-3,
        measures: { blade_pitch: deg, actuator_travel: travel, motor_angle: travel * -32.2 },
        poses: {
          base: { translation: [0, 0, 0], rotvec: [0, 0, 0] },
          arm: { translation: [0, 0, 0], rotvec: [turned, 0, 0] },
          plate: { translation: [0, 0, demoSlider(deg) - zeroTravel], rotvec: [0, 0, 0] },
        },
        joints: {
          blade_hinge: { point_a_world: [0, 0, 0], point_b_world: [0, 0, 0], axis_world: [1, 0, 0] },
          pitch_link: { point_a_world: a, point_b_world: b, axis_world: null },
          plate_slide: { point_a_world: b, point_b_world: b, axis_world: [0, 0, 1] },
        },
        links: {
          pitch_link: Object.assign(demoLinkPose(deg), {
            length: DEMO_LINK,
            convention: "spin-free: minimal rotation from the as-modelled A->B direction to the current one",
          }),
        },
      });
    }
    return {
      schema: "linkage-sweep/v1",
      run_id: "synthetic-demo-sweep",
      source: "sheet",
      frame: "Poses are relative to each body's as-modelled configuration, which " +
        "is this run's last point. p_world = R(rotvec) @ p_as_modelled + translation.",
      mechanism: {
        name: "synthetic demo crank-slider (mock mode -- not a measurement of anything)",
        driver: { parameter: "actuator.value", label: "actuator travel", unit: "mm" },
      },
      measures: {
        names: ["blade_pitch", "actuator_travel", "motor_angle"],
        units: { blade_pitch: "deg", actuator_travel: "mm", motor_angle: "deg" },
      },
      bodies: [
        { name: "base", ground: true, parts: ["demo_ground_part"] },
        // The one body with an installed mesh behind it, so mock mode
        // exercises the anchored-bodies path and not only the stick figure.
        { name: "arm", ground: false, parts: ["demo_triangle"] },
        { name: "plate", ground: false, parts: ["demo_plate_part"] },
      ],
      links: [{ joint: "pitch_link", parts: ["demo_link_part"] }],
      reference: { measure: "blade_pitch", values: referenceValues,
        note: "synthetic: a whole-degree sheet table, read at this run's own " +
          "driver values -- the difference against the solved angle is that " +
          "table's interpolation error and nothing else" },
      points: points,
    };
  }

  AA.FIXTURES = {
    demoSha: DEMO_SHA,
    sweepRuns: { "synthetic-demo-sweep": demoSweepRun() },
    topologyProjection: {
      schema: "joby.tolerance_stack/topology_projection/v0",
      topologies: [
        {
          id: "demo_system",
          title: "Demo mechanism",
          // The interfaces the three edges run between, named the way a real
          // topology names them (docs/topologies/) -- "face" is what tells the
          // suggestion rules these are flat surfaces, and a bare id tells them
          // nothing. Node `d` is the far end of the third edge and names no
          // part, same as the real joints' own last clamped surface.
          nodes: [
            { id: "a", name: "demo bolt-head bearing face", kind: "mating_surface" },
            { id: "b", name: "demo bushing face against the plate", kind: "mating_surface" },
            { id: "c", name: "demo plate far face", kind: "mating_surface" },
            { id: "d", name: "demo washer far face", kind: "datum_feature" },
          ],
          edges: [
            { id: "demo_edge_traced", name: "Demo traced edge", confidence: "traced", from: "a", to: "b" },
            // `part: "demo_triangle"` matches meshProvenance's part_id below, so
            // `?mock=1&topology=demo_system&edge=demo_edge_untraced&isolate=demo_triangle`
            // is a real end-to-end deep-link demo with no folder grant needed.
            { id: "demo_edge_untraced", name: "Demo untraced edge", confidence: "untraced", from: "b", to: "c", part: "demo_triangle" },
            { id: "demo_edge_no_owner", name: "Demo owner-not-in-set edge", confidence: "untraced", from: "c", to: "d", part: "no_such_part" },
          ],
          studies: [
            {
              id: "demo_study", title: "Demo study",
              selection: ["demo_edge_traced", "demo_edge_untraced", "demo_edge_no_owner"],
            },
          ],
        },
      ],
    },
    featureIdentityProjection: {
      schema: "joby.tolerance_stack/feature-identity-projection/v0",
      stack_keys: [
        {
          stack_key: { kind: "topology_edge", topology_id: "demo_system", edge_id: "demo_edge_untraced" },
          state: "bound",
          bindings: [{
            event_id: "demo-bound-1",
            geometry_key: { source_step_sha256: DEMO_SHA, face_id: 0, area_native2: 0.5, centroid_native: [0.33, 0.33, 0] },
            direction: "to",
          }],
          owner_not_in_set: [],
          history: ["demo-bound-1"],
        },
        {
          stack_key: { kind: "topology_edge", topology_id: "demo_system", edge_id: "demo_edge_no_owner" },
          state: "owner_not_in_set",
          bindings: [],
          owner_not_in_set: [{ event_id: "demo-owner-not-in-set-1" }],
          history: ["demo-owner-not-in-set-1"],
        },
      ],
    },
    meshManifests: meshManifests,
    meshProvenance: meshProvenance,
    meshBuffers: meshBuffers,
  };
})(window.AnnotateApp = window.AnnotateApp || {});
