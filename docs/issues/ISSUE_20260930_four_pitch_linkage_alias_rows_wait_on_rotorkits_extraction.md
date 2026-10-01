---
type: chore
priority: med
status: open
area: topologies/aliases
reporter: agent
found_by: docs/sessions/HANDOFF_20260930_vpa_pitch_linkage_topology_and_feature_fits.md
class: blocked_on_an_upstream_repo
defer_until: rotorkit/docs/sessions/HANDOFF_20261001_shape_signature_is_pure.md
resolution: woke 2026-10-01 -- shape_signature_is_pure completed; re-triage
---

# Four parts of the pitch-linkage topology have no alias row

> **The wait is over and the rows are still not written.** rotorkit's
> `assembly_extract_20261001T022446Z` landed on 2026-10-01, about an hour after
> this issue was filed and while the handoff that filed it was still running.
> The four meshes are installed. What stopped the rows being written in that
> same session is that two of the four are no longer a transcription job — read
> "What the run actually installed" at the foot of this issue before writing
> any of them.

`docs/topologies/topology_vpa_pitch_linkage.json` (2026-09-30) declares twelve
parts. Eight of them had an installed mesh and got an alias row in the same
change; `hub` and `pitch_arm` became rows the next day, when the run below
landed, so it is ten and two now. The two that remain deliberately got **no
row** — the annotator's "no
installed mesh" empty state is the honest answer, never a guessed match
(`docs/topologies/part_mesh_aliases.json`'s own second note).

They are the four rotorkit's `HANDOFF_20260930_extract_pitch_linkage_parts`
installs. When that run lands, each needs a row here:

| topology part | drawing | expected mesh `part_id` | evidence to cite |
|---|---|---|---|
| `hub` | `214373-002` | `asm217755_214373_002` | 216231 B.1 find 1, `DUAL BEARING GEN5 HUB ASSEMBLY` |
| `pitch_arm` | `215071-001` | `asm217755_215071_001` | 216231 B.1 find 11, `PITCH ARM, PROPELLER, CLOCKWISE` |
| `pitch_link` (the body) | `213861-002` | `asm217755_213861_002` | 213862-002 A's own parts list, `213861-002 PITCH LINK, PROPELLER` qty 1 |
| `blade_root` | `216332-001` | `asm217755_216332_001` | 216231 B.1 find 19, `BLADE BONDED ASSEMBLY, PROPELLER` |

**Read the live `provenance.json` rather than this table.** The expected
`part_id`s above are derived from the store's naming convention
(`asm217755_` + the product number), not observed — and rotorkit's extractor
appends an 8-hex geometry signature whenever one requested number matches more
than one product label, which is exactly what happened to `MS14101-3`. The
2026-09-15 alias handoff's rule applies unchanged: read the id off the live
sidecar at merge time.

Two of the four carry a wrinkle worth knowing before writing the row:

- **`pitch_link`** is the *assembly* `213862-002` and the mesh will be the
  *body* `213861-002`. Those are different drawing numbers, which is the
  identity question `pitch_plate_215177_001`'s row already faced from the other
  direction (there the row points at the installation rather than the detail).
  Decide it explicitly in the evidence string.
- **`blade_root`** already has a near-miss in the store: `blade_oml` is a clean
  outer-mould-line export of the blade from a separate STEP and carries no root
  bearing geometry, so it must **not** be aliased to this part.

## Why this is an issue and not a line in a lesson

The handoff that authored the topology closes; rotorkit's run lands after it.
Nothing schedules anyone to read a lesson, so the work would have no owner the
moment that handoff reached `completed/` — the shape
`docs/strategy/BRIEF_20260921_fenced_work_has_no_later.md` is about, and the
same shape two earlier tolstack issues already took.

## Done when

Each of the four has a row in `docs/topologies/part_mesh_aliases.json` citing
the live `provenance.json` and a parts-list row, **or** an explicit note in that
file saying why it stays out. `tests/test_part_mesh_aliases.py` pairs both sides
and its `[real]` tier will catch a wrong `part_id`; since 2026-09-30 it also
pairs the sha256 an evidence string quotes against the mesh that row maps to.


## What the run actually installed (2026-10-01)

Read off the live `provenance.json`s, which is the rule this issue already
states. Two of the four are straightforward and two are not:

| topology part | installed `part_id` | straightforward? |
|---|---|---|
| `hub` | `asm217755_214373_002` | **Yes** — exact drawing number, one instance at `prd-e-03478612.1/214373-001.1`. Note it is 286 solids: the whole hub assembly, not a machined detail, the same installation-or-detail choice `pitch_plate_215177_001`'s row faced. |
| `pitch_arm` | `asm217755_215071_001` | **Yes** — exact drawing number, 5 instances, one per blade. |
| `pitch_link` (the body) | `asm217755_213861_002` | **No.** Four instances, at `213862-002.2` … `.5`. Blade 1's link is `546293-002`, the instrumented variant, and its body is inside `asm217755_546293_002` — see `ISSUE_20260930_blade_1s_pitch_link_is_the_instrumented_546293_002.md`, which has to be decided first. |
| `blade_root` | `asm217755_216332_001_1ed2bfd5` **or** `_1ff0bced` | **No.** Two geometries under one drawing number (20 solids and 15), one instance each, on different blades. Which one `blade_root` means — or whether it means both — is the same question one level out. |

So: the hub and the pitch arm can be written as rows today against the evidence
this issue already lists. The other two wait on the instrumented-variant
decision, and the uniqueness guard
(`tests/test_part_mesh_aliases.py::test_installed_mesh_part_ids_are_unique`)
will not help with either, because the ids are distinct — the ambiguity is in
what the topology part *means*, not in the store.
