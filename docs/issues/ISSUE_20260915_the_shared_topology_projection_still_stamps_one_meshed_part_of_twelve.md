---
type: chore
priority: med
status: open
area: viewer / projections
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_extracted_mesh_alias_rows.md
---

# The shared topology projection still stamps one meshed part, and the alias table now resolves twelve

Handoff `extracted_mesh_alias_rows` (2026-09-15) added eleven rows to
`docs/topologies/part_mesh_aliases.json`, taking the number of live topology
parts that resolve to an installed mesh from **1 to 12** (verified through
`apps/annotate/commands.js`'s own `resolveMeshIdentifier` against
`C:\workspace\tolstack\data\meshes`). The annotate app reads the tracked table
at page load, so it picks the rows up the moment they merge.

**The viewer does not.** Since `annotate_affordances_flyout_and_mesh_gating`
(2026-09-14) the viewer gates its 3D affordances on a `parts[].mesh` block that
`scripts/build_topology_projection.py` **stamps at build time** via its own
`resolve_mesh`. The built projection in the main checkout
(`data/projections/viewer/topologies.json`, built 2026-09-15T18:55Z from
`master` @ `ed394ec`) carries 29 `mesh` blocks of which exactly **one** is
`installed: true` (`machined_213668`). Until it is rebuilt, the viewer
withholds "open this part in 3D" on eleven parts that now have geometry behind
them — the honest-withholding rule firing on stale data rather than on absent
data.

Nothing is wrong or silent: `mesh` is a derived field and this is exactly the
staleness the projection contract accepts. It just has no owner once this
handoff reaches `completed/`, which is why it is filed rather than left in a
lesson.

## Why the handoff did not just rebuild it

- The projection lives in the shared, gitignored `data/` of the main checkout,
  and the builders refuse to overwrite a projection built from a tree they do
  not contain (`scripts/projection_provenance.py`, exit 3). Building it from
  this handoff's branch would have written a `master`-facing artifact from a
  tree `master` does not have.
- Four other handoffs staged in the 2026-09-15 sweep own `apps/viewer/` and
  `apps/annotate/`, and this handoff was scoped out of both. Rebuilding a
  shared projection mid-flight is the coupling
  `ISSUE_20260914_two_active_handoffs_each_turn_the_others_real_tier_red.md`
  and `BRIEF_20260914_real_tier_shared_projection_coupling.md` are about.

## What to do

Once this handoff's branch is merged to `integration` and the operator has
batch-merged to trunk, rebuild from the main checkout —
`scripts\rebuild_projections.ps1` is the recipe (ops.toml records that there is
deliberately no fifth `rebuild` verb for it). Then `parts[].mesh.installed`
should be true for twelve parts, and `apps/viewer/tests.js`'s
`--- 3D affordances against the REAL mesh set ---` block exercises both halves
of the rule on a larger meshed set. Those three tests are written count-free
and name-free for precisely this reason, so no test edit should be needed — if
one is, that is a finding worth its own issue.

## Parts that should flip

`bolt_nas6403u11d`, `bolt_nas6403u13h`, `bolt_nas6404u13d`,
`bushing_214820_002`, `pitch_plate_215177_001`, `plain_bushing_214943_002`,
`straight_bushing_214820_002`, `washer_ms21299c3`, `washer_ms21299c4k`,
`washer_nas1149v0332_tt`, `washer_nas1149v0332h` — plus
`gas_spring_mount_213668_002`, which was already stamped. Re-derive rather than
trusting this list: the table is the authority and
`docs/sessions/lessons/LESSONS_20260915_extracted_mesh_alias_rows.md` records
how it was measured.
