---
type: feature
priority: low
status: deferred
area: apps/annotate (scene occurrence visibility)
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261105_everything_in_3d_is_transparent_until_an_action_needs_a_face.md
defer_until: 2026-12-06
class: three_d_visibility_policy
resolution: deferred 2026-11-06 (triage) -- low defers by default; 30 days
---

# Hiding a detail hides its whole installation mesh

Since 2026-11-05 a hidden occurrence hides every occurrence on the same
assembly path (`AA.assemblyPathsOverlap`, `scene._occurrenceHidden`), because
the STEP extraction installs an installation and the details inside it as
separate meshes in one place — hiding the base body left the mount's machined
detail standing as a translucent copy. Going *up* the path is the costly
half: hiding `machined_213668` (a base part) hides the whole `215176-002`
installation mesh, with every other solid inside it. On the kinematic study
each of those is also installed as its own mesh or belongs to the same body,
so nothing visible is lost; on another study it might be.

What would make it exact: hide one solid inside a mesh. The manifest already
carries a per-face `solid_id`; the scene would need per-occurrence draw ranges
(or an index buffer per occurrence) over geometry the repeats share today.
Worth doing only when a study shows the loss — this file is the marker.
