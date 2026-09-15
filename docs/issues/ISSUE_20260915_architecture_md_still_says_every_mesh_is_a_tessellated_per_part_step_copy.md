---
type: chore
priority: med
status: open
area: ARCHITECTURE.md, docs/ANNOTATION_SURFACE.md
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_extracted_mesh_alias_rows.md
---

# `ARCHITECTURE.md` still says every mesh is `stepgeom.tessellate` output hand-copied from a per-part STEP — true for 2 of 24

Handoff `extracted_mesh_alias_rows` (2026-09-15) corrected exactly this fact in
`data/meshes/README.md`, which was in its scope. The same sentence lives, nearly
verbatim, in at least two tracked documents that were not — and both are now
wrong for the great majority of the store.

**`ARCHITECTURE.md`, "rotorkit" bullet (~line 546):**

> `data/meshes/<sha>/` is tessellated from a STEP file by rotorkit's
> `stepgeom.tessellate` (`scripts/tessellate_parts.py`, run from rotorkit's own
> checkout and venv — OCP lives there, never here). This repo never patches
> rotorkit or imports its code; it **copies the binary mesh output, unmodified**,
> plus a provenance sidecar (`data/meshes/README.md`).

Both halves are stale since 2026-09-14:

- **Two of the 24 installed meshes** came that way (`blade_oml`,
  `machined_213668`, run `tessellate_20260906T204904Z`). The other 22 are
  products extracted from `217755-001 A.1 PROPULSION ASSEMBLY, PROPELLER, CW
  Released.stp` by rotorkit's `stepgeom.assembly` /
  `scripts/extract_assembly_parts.py` (runs `assembly_extract_20260914T233035Z`
  and `assembly_extract_20260915T002725Z`). Measured from each directory's
  `provenance.json` `produced_by`.
- **There is no copy step on that route.** `extract_assembly_parts.py` writes
  the `data/meshes/<sha>/` layout into this repo directly and idempotently; the
  copy-and-rename recipe now survives only under the single-part heading in
  `data/meshes/README.md`.
- Relatedly, `source_step_sha256` on an extracted mesh is **not** the hash of a
  STEP file — there is no per-part STEP upstream of it; it is the sha256 of the
  extracted solid's canonical BRep (`stepgeom.assembly.shape_signature`). A
  document implying a per-part STEP exists sends a reader looking for a file
  that was never produced.

**`docs/ANNOTATION_SURFACE.md`, "The mesh format" (~line 87)** has the weaker
form of the same thing — it describes the sidecar as "(source STEP path,
sha256, tessellation tier, the rotorkit command that produced it)", which reads
as a per-part STEP. It does point at `data/meshes/README.md`, so the cheapest
fix there may be to let the pointer carry the detail rather than restate it.

Nothing pairs either sentence against the store, which is why the corrected
README did not force them: `ARCHITECTURE.md`'s guarded surface is its module
inventory (`test_architecture_inventory.py`), and this prose sits outside every
quantifier guard the repo owns — the shape the review overlay's *"the handoff
fixed the one guarded copy and missed every unguarded one"* entry already
records, here in its fact-rather-than-count variant.

## Suggested fix

One sentence in each, written the way the README now is: two routes, each
directory's own `provenance.json` as the authority for which one it took, and no
count. Do not add a count of routes-per-mesh to either file.
