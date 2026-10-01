---
type: bug
priority: high
status: open
area: data/meshes
reporter: agent
found_by: docs/sessions/HANDOFF_20260930_vpa_pitch_linkage_topology_and_feature_fits.md
---

# One solid, two geometry signatures, two installed meshes — across two rotorkit runs

## What happened

`data/meshes/` now holds two directories for what is, by every field either of
them records, the **same extracted solid**:

| | `asm217755_MS14101_3_9bfdb344` | `asm217755_MS14101_3_1ec77e91` |
|---|---|---|
| assembly STEP sha256 | `5553d3cf5e680607…` | `5553d3cf5e680607…` |
| XCAF label | `0:1:1:249` | `0:1:1:249` |
| product name | `MS14101-3` | `MS14101-3` |
| solids | 2 | 2 |
| instances | `213862-002.1/MS14101-3.1`, `.2` | the same two |
| `placement_world` | identical to 7 decimals | identical to 7 decimals |
| tier / deflection | medium / 0.1 mm | medium / 0.1 mm |
| run | `assembly_extract_20260915T002725Z` (commit `1dedcbd`) | `assembly_extract_20261001T022446Z` (commit `3db188f`) |

Everything that identifies the solid agrees. The **geometry signature** does
not, so the store keyed them to two directories and
`rotorkit/stepgeom/assembly.part_id` suffixed each with its own first 8 hex.

## Why that is a defect and not a curiosity

`data/meshes/README.md` states the contract this breaks, in as many words:

> `source_step_sha256` is the sha256 of the extracted solid's canonical
> triangle-free ASCII BRep (`stepgeom.assembly.shape_signature`): deterministic,
> and **a function of the geometry rather than of a file with a write timestamp
> in its header**.

If the signature is a function of the geometry, re-extracting the same solid
from the same assembly must reproduce it. It did not, between two commits of the
producer. So either the canonicalisation changed (in which case every id in the
store is a function of the producer's version as well as of the shape, and the
README is wrong about what the key means), or it is non-deterministic.

Three consequences here, in order of cost:

1. **An alias silently names one of two identical meshes.**
   `docs/topologies/part_mesh_aliases.json` resolves
   `spherical_bearing_pitch_link` to `asm217755_MS14101_3_9bfdb344` — the
   2026-09-15 copy. Nothing is wrong with it, and nothing says the 2026-10-01
   copy exists. `tests/test_part_mesh_aliases.py` stays green either way: the
   `part_id`s are distinct, so the uniqueness guard sees no collision, and the
   row resolves.
2. **A product number that named two solids now names three**, two of which are
   the same solid. That is what the suffix mechanism exists for, but it is now
   also firing on a case it was not built for, which makes "how many distinct
   solids is `MS14101-3`?" unanswerable from the store.
   `scripts/fit_bound_features.py` has to answer exactly that question to decide
   whether rotorkit's `placements.json` is addressable for a given mesh (it is
   keyed by product number), and today it counts **two** `MS14101-3` solids
   where there is one — so it refuses the full expansion for a mesh it could
   safely have used it for. Conservative, and wrong for a reason nobody can see.
3. **The store grows a duplicate per re-extraction.** Each is a full
   positions/indices/face_ids triple.

## A second instance of the same shape, which may or may not be the same bug

The 2026-10-01 run also installed `216332-001` **twice**, as
`asm217755_216332_001_1ed2bfd5` (20 solids) and `…_1ff0bced` (15 solids), one
instance each, on blade positions `prd-e-03372837.2` and `.3` of a five-blade
propeller. Unlike the `MS14101-3` pair these differ in *solid count*, so they
are genuinely different shapes under one drawing number — a different
situation, and quite possibly a correct one (two blades at different
instrumentation states). It is noted here because a reader comparing suffixed
ids will meet both cases in the same store and the two need telling apart:
**identical in every recorded field** is the defect; **different solid counts**
is the mechanism working.

## What would settle it

A rotorkit-side answer to: *is `shape_signature` stable across producer
versions, and is it meant to be?* If yes, this is a regression between `1dedcbd`
and `3db188f`. If no, `data/meshes/README.md`'s claim needs correcting and this
repo needs a rule for which of two copies an alias should name — which is a real
decision, because "the newest" and "the one the alias already names" differ.

Filed here rather than in rotorkit because the observable is in this store and
the consumers are this repo's; rotorkit's
`ISSUE_20260915_mesh_install_path_two_silent_failure_modes.md` is the
producer-side sibling.

## Repro

```
venv-win/Scripts/python.exe -c "import json,pathlib; [print(json.loads((d/'provenance.json').read_text(encoding='utf-8'))['part_id']) for d in pathlib.Path('data/meshes').iterdir() if (d/'provenance.json').is_file()]"
```

Two ids beginning `asm217755_MS14101_3_`, plus `asm217755_MS14101_3_84a75703`
(product name `MS14101-3_2`, a genuinely different solid — the tangential
link's).
