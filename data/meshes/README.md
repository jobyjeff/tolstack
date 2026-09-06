# data/meshes — tessellated part geometry for the annotation surface

Per-face triangle meshes, tessellated server-side from a STEP file by
rotorkit's `stepgeom.tessellate` (see
`C:\workspace\rotorkit\docs\sessions\lessons\LESSONS_20260904_step_tessellation_spike.md`
for the feasibility numbers and the face-identity finding this format is
built around). `apps/annotate/` is the one consumer.

```
data/meshes/<source_step_sha256>/
  positions.f32     float32 x,y,z per vertex, little-endian
  indices.u32       uint32 vertex index, 3 per triangle, little-endian
  face_ids.u32      uint32 face id, 1 per triangle, little-endian
  manifest.json     face table: face_id, solid_id, n_triangles, n_vertices,
                     area_native2, centroid_native -- the per-face fingerprint
                     used to re-validate a face_id after a re-tessellation
  provenance.json   source STEP path + sha256, tessellation tier, the
                     rotorkit command/commit that produced this directory
```

**Contents are gitignored** (forge data convention: the filesystem is
canonical; absence from git is not data loss). This README is the tracked
skeleton. Keyed by `source_step_sha256` rather than by part number because a
part number gets re-exported over — the hash is what the `feature-identity/v0`
event stream's geometry-side key actually names
(`tolerance_stack/feature_identity.py`; `docs/DAG_TOPOLOGY.md`'s companion
schema is the stack-side key).

## Regenerate

Run from **rotorkit's** main checkout, its own venv (OCP lives there, never in
tolstack), on its `integration` branch (the spike's tessellation code has not
yet reached rotorkit `master` — see this repo's
`docs/issues/ISSUE_20260906_rotorkit_master_missing_tessellation_spike.md`):

```powershell
C:\workspace\rotorkit\venv-win\Scripts\python.exe scripts\tessellate_parts.py
```

That script (unmodified — this repo does not patch rotorkit) writes its
medium-tier viewer assets to `spike/step_tessellation/assets/` under whatever
tree it's run from, named `<part_id>.<kind>`, not the layout above. Copy each
part's four files into `data/meshes/<source_step_sha256>/`, renamed to strip
the `<part_id>.` prefix (`positions.f32`, `indices.u32`, `face_ids.u32`,
`manifest.json` with its two file-name fields updated to match), and add a
`provenance.json` sidecar naming the source STEP path/sha256, the tier, and
the rotorkit run that produced it. There is no script for this copy step yet
(one-off for the two 2026-09-06 fixtures); a repeat run is exactly the shape
`scripts/build_feature_identity_projection.py`'s neighbourhood would want if
mesh installation becomes routine.

## What's here today (2026-09-06, handoff `annotation_surface_mvp`)

Two parts, medium deflection tier (0.1mm), from rotorkit `integration` @
`0bcbca0`, run `tessellate_20260906T204904Z`:

| part | source STEP | sha256 |
|---|---|---|
| M1 blade OML | `[2026-JUL-15]M1 Instro blade3D Shape03628907 C.1.stp` | `84c44119a6eb3388502f017613dd11c632a68c70b5d3d7d98499d1143d453ebe` |
| 213668-002 mount, gas spring | `213668-002_2026-07-23_Released.stp` | `6d5b1321446d54cd713da0739f7821c5266b3d6898ad047465e30003e7f549cf` |

Both single-solid parts (927 and 1083 faces respectively) — the spike's
large-assembly proxy (26-solid bonded assembly) was *not* installed here: the
brief's MVP scope is single parts side by side, with no assembly-placement
support (see the annotation_surface_mvp lesson, "placement-transform gap").
