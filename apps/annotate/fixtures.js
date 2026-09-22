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
  meshProvenance[DEMO_SHA] = { label: "Demo part (synthetic, mock mode)", part_id: "demo_triangle" };

  var meshBuffers = {};
  meshBuffers[DEMO_SHA] = {
    "positions.f32": buf([
      0, 0, 0, 1, 0, 0, 0, 1, 0,   // face 0
      2, 0, 0, 3, 0, 0, 2, 1, 0,   // face 1, beside it and in the same plane
    ], Float32Array),
    "indices.u32": buf([0, 1, 2, 3, 4, 5], Uint32Array),
    "face_ids.u32": buf([0, 1], Uint32Array),
  };

  AA.FIXTURES = {
    demoSha: DEMO_SHA,
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
