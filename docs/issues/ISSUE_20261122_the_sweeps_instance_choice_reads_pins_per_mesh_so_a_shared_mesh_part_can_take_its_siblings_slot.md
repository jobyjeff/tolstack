---
type: bug
priority: low
status: open
area: annotate/sweep
reporter: agent
found_by: docs/sessions/HANDOFF_20261121_a_take_on_a_lug_feature_binds_that_lugs_own_face.md
---

# The sweep's instance choice reads pins per mesh, so a shared-mesh part can take its sibling's slot

`apps/annotate/app.js`'s sweep subject rows filter a part's candidate
occurrences by `occurrences.pinned[mesh.sha256]` (`AA.occurrencePins`), which
is every occurrence any part on that mesh declares. Where two parts of one
model share a mesh and each declares its own occurrence -- v2's
`spherical_bearing_pitch_link` (`MS14101-3.1`) and
`spherical_bearing_pitch_link_upper` (`MS14101-3.2`), both
`asm217755_MS14101_3_815597cb` -- each part's candidates include the other's
slot, and `AA.chooseSweepInstance` picks by distance to the joint target.

The contact engine and the mate ranking got the per-PART rule on 2026-11-21
(`AA.partOccurrence` / `AA.partPlacements`, handoff
`a_take_on_a_lug_feature_binds_that_lugs_own_face`); this site did not,
because it decides what the sweep DRAWS where, and the drawing is per mesh
anyway (both slots are drawn). No write reaches it. The fix shape: filter by
`AA.partOccurrence(topology, partId, ...)` when it answers, else by the mesh's
pins as now.
