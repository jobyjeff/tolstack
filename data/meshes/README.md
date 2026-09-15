# data/meshes — tessellated part geometry for the annotation surface

Per-face triangle meshes, tessellated server-side by rotorkit (see
`C:\workspace\rotorkit\docs\sessions\lessons\LESSONS_20260904_step_tessellation_spike.md`
for the feasibility numbers and the face-identity finding this format is
built around). `apps/annotate/` is the one consumer of the geometry itself;
since `annotate_affordances_flyout_and_mesh_gating` (2026-09-14)
`scripts/build_topology_projection.py` also reads each directory's
`provenance.json` `part_id`, so the viewer can offer a 3D affordance only where
a mesh is installed.

```
data/meshes/<source_step_sha256>/
  positions.f32     float32 x,y,z per vertex, little-endian
  indices.u32       uint32 vertex index, 3 per triangle, little-endian
  face_ids.u32      uint32 face id, 1 per triangle, little-endian
  manifest.json     face table: face_id, solid_id, n_triangles, n_vertices,
                     area_native2, centroid_native -- the per-face fingerprint
                     used to re-validate a face_id after a re-tessellation
  provenance.json   geometry source + sha256, part_id, tessellation tier, the
                     rotorkit command/commit/run that produced this directory
```

**Contents are gitignored** (forge data convention: the filesystem is
canonical; absence from git is not data loss). This README is the tracked
skeleton. Keyed by `source_step_sha256` rather than by part number because a
part number gets re-exported over — the hash is what the `feature-identity/v0`
event stream's geometry-side key actually names
(`tolerance_stack/feature_identity.py`; `docs/DAG_TOPOLOGY.md`'s companion
schema is the stack-side key).

## Two ways a mesh gets here, and what the key hashes in each

Both routes write the layout above; they differ in what `source_step_sha256`
is a hash *of*, and each directory says which it is in its own
`provenance.json`.

1. **A single-part STEP export, tessellated.** `source_step_sha256` is the
   sha256 of that STEP file, and `source_step_path` names it.
2. **A product extracted from an assembly STEP** (rotorkit's
   `stepgeom.assembly`, since 2026-09-14). There is **no per-part STEP
   upstream of these** — nothing to hash — so `source_step_sha256` is the
   sha256 of the extracted solid's canonical triangle-free ASCII BRep
   (`stepgeom.assembly.shape_signature`): deterministic, and a function of the
   geometry rather than of a file with a write timestamp in its header. It
   still lives in `source_step_sha256` because that field is this store's key
   and the annotate app's geometry key. Each such directory carries an
   `extraction` block saying exactly that, plus the **assembly** STEP's path
   and sha256, the product name, its XCAF label entry, and every instance's
   placement matrix — so a reader can re-derive which solid this was. Do not
   read one of these as evidence that a per-part STEP exists.

## Two part vocabularies, one sanctioned bridge

A mesh's `provenance.json` `part_id` (`machined_213668`, `blade_oml`,
`asm217755_214820_002` — the tessellation or extraction run's own naming) and
a topology edge's `part` (`gas_spring_mount_213668_002` —
`docs/DAG_TOPOLOGY.md`'s vocabulary, authored per-edge) are different
namespaces. The tracked alias table
**`docs/topologies/part_mesh_aliases.json` is the one sanctioned bridge
between them** (handoff `mesh_part_alias_table`, 2026-09-10). Installing a
mesh: keep the run's own `part_id` — do **not** rename the mesh or
re-tessellate it to match a topology's part id — and declare an alias entry
instead, citing the evidence (this directory's `provenance.json`, a drawing
number) that the two names denote the same physical part. An identity you
cannot evidence stays unmapped; the annotate app's "no installed mesh" empty
state is the honest answer, never a guessed match.
`tests/test_part_mesh_aliases.py` pairs the table against both vocabularies,
and `apps/annotate/run_tests.cjs`'s `[real]` tier resolves every alias
against this directory — a mesh removed or re-installed under a different
`part_id` turns them red rather than silently orphaning its aliases.

**A `part_id` must be unique across this store.** Both resolvers match it
exactly, so two directories claiming one `part_id` resolve every alias naming
it to whichever is listed first — a plausible-looking wrong solid, shown with
nothing raised. `MS14101-3` is three product labels in `217755-001 A.1`, two
of them a different solid, and both surviving geometries first installed under
one id; a spec or drawing number is not a geometry key, even for catalog
hardware. `tests/test_part_mesh_aliases.py::test_installed_mesh_part_ids_are_unique`
guards it here, whatever route installed the mesh.

## Regenerate

Run from **rotorkit's** main checkout, its own venv (OCP lives there, never in
tolstack).

**A product out of an assembly STEP** — `scripts/extract_assembly_parts.py`
writes the `data/meshes/<sha>/` layout above **directly and idempotently**
(re-running reports `already_installed` and writes nothing), so there is no
copy-and-rename step for this route:

```powershell
C:\workspace\rotorkit\venv-win\Scripts\python.exe scripts\extract_assembly_parts.py
```

Budget a *range* for it, not a number: the XCAF read of the 2 GB `217755-001`
export measured 54 min and 156 min on the same machine and file (rotorkit's
`LESSONS_20260914_assembly_step_part_extraction`, "Numbers" — a 2.9x spread
from ambient memory pressure alone), and the read is essentially the whole
cost. So never put this on a timeout you care about, and ask for every part you
might want in one invocation — a second run for one forgotten number pays the
read again.

**A single-part STEP export** — `scripts/tessellate_parts.py`, on rotorkit's
`integration` branch (the spike's tessellation code has not yet reached
rotorkit `master` — see this repo's
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
the rotorkit run that produced it.

## What's here today

Deliberately not listed here. This store is gitignored and grows whenever
rotorkit installs a part, so a count or a part-by-part table written in this
file is a quantity no test reads from the tree — this repo calls that a defect
regardless of whether it happens to be right today. The table that used to sit
here proved the point: written for the two 2026-09-06 fixtures, it was still
claiming two parts after an assembly extraction installed an order of
magnitude more (handoff `extracted_mesh_alias_rows`, 2026-09-15).

**Each directory is self-describing instead**: its `provenance.json` names the
part, the geometry source and sha, the tier, and the rotorkit run and commit
that produced it. The derived answers that consumers actually need are built
from the store rather than transcribed — `scripts/build_topology_projection.py`
stamps per-part mesh availability into the topology projection, and
`tests/test_part_mesh_aliases.py`'s `[real]` tier pairs every alias against the
live `part_id`s. To see what a part is, read its `provenance.json`; to see
which topology parts have geometry, read the projection.

What is worth writing down is the store's *shape*, which a count is not. Every
mesh installed so far is at the medium deflection tier (0.1 mm; each
directory's `provenance.json` carries its own `tessellation_tier` and
`linear_deflection_mm`, which is the authority). Two came from single-part
STEP exports — `blade_oml` and `machined_213668`, rotorkit `integration` @
`0bcbca0`, run `tessellate_20260906T204904Z`. The rest are products extracted
from
`217755-001 A.1 PROPULSION ASSEMBLY, PROPELLER, CW Released.stp` by runs
`assembly_extract_20260914T233035Z` and `assembly_extract_20260915T002725Z`,
and carry the `asm217755_` prefix. Note that an extracted mesh may be an
*installation* rather than a piece part (`asm217755_215177_001` is a plate plus
its nine bushings, 10 solids): `provenance.json`'s `n_solids` and
`product_is_assembly` say which, and `manifest.json`'s per-face `solid_id`
lets a consumer address one solid inside it. Assembly placements ship in
`provenance.json` but are **not** applied to the mesh — each is in its
product's own local frame, and nothing reads the placements yet
(`rotorkit/docs/issues/ISSUE_20260914_extracted_placements_have_no_consumer.md`).
