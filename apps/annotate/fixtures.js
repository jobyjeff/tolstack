// The ?mock=1 demo dataset -- apps/viewer/fixtures.js's role, scaled down to
// what this app needs to exercise: one topology with two edges (one already
// drawing-cited, one not -- the precedence-guard copy needs both to show
// up), one existing binding, and a single synthetic triangle mesh so the 3D
// pane has something real to raycast against with no rotorkit dependency.
(function (AA) {
  "use strict";

  var DEMO_SHA = "0000000000000000000000000000000000000000000000000000000000000".slice(1); // 64 zeros
  function buf(arr, TypedArray) { return new TypedArray(arr).buffer; }

  var meshManifests = {};
  meshManifests[DEMO_SHA] = {
    n_vertices: 3,
    n_triangles: 1,
    n_faces: 1,
    positions_file: "positions.f32",
    indices_file: "indices.u32",
    face_ids_file: "face_ids.u32",
    faces: [
      { face_id: 0, solid_id: 0, n_triangles: 1, n_vertices: 3, area_native2: 0.5, centroid_native: [0.33, 0.33, 0] },
    ],
  };

  var meshProvenance = {};
  meshProvenance[DEMO_SHA] = { label: "Demo triangle (synthetic, mock mode)", part_id: "demo_triangle" };

  var meshBuffers = {};
  meshBuffers[DEMO_SHA] = {
    "positions.f32": buf([0, 0, 0, 1, 0, 0, 0, 1, 0], Float32Array),
    "indices.u32": buf([0, 1, 2], Uint32Array),
    "face_ids.u32": buf([0], Uint32Array),
  };

  AA.FIXTURES = {
    demoSha: DEMO_SHA,
    topologyProjection: {
      schema: "joby.tolerance_stack/topology_projection/v0",
      topologies: [
        {
          id: "demo_system",
          title: "Demo mechanism",
          edges: [
            { id: "demo_edge_traced", name: "Demo traced edge", confidence: "traced", from: "a", to: "b" },
            { id: "demo_edge_untraced", name: "Demo untraced edge", confidence: "untraced", from: "b", to: "c" },
            { id: "demo_edge_no_owner", name: "Demo owner-not-in-set edge", confidence: "untraced", from: "c", to: "d" },
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
