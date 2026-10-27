---
type: bug
priority: high
status: open
area: tests/browser
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261026_pitch_system_folds_into_the_pitch_linkage_model.md
---

# Two rail gap-badge browser checks read gap rows that integration no longer has

`scripts/run_viewer_browser_tests.mjs`, suite `annotate rail and scene (hover,
pick, per-body visibility, type chips, gap alerts)`, section "6. a gap
contributor's alert says what resolves it" (added by
`the_rail_and_the_scene_point_at_each_other`):

- `[real] the tangential link's gap badge opens a popup naming 212956-005 and Pick`
- `[real] the attach radius's gap badge opens a popup naming 215177-001 and Pick`

Both hover the `.alertbadge` on the `tan_link_length` and
`pitch_plate_tan_link_attach_radius` contributor rows and expect a "No band"
popup. Those two rows **stopped being gap rows** when
`the_tangential_link_cites_its_drawing` banded them (the kinematic margins
moved 0.256/0.258 → 0.210/0.185 then). Any kinematic projection built from
`integration` has **0** gap rows. The main checkout's
`data/projections/viewer/kinematic/kinematic_studies.json` still has 10,
because it was built 2026-10-23T04:14Z, before that handoff. A run against
the main checkout's stale projection is the only kind that passes.

Measured 2026-10-26 by the `pitch_system_folds_into_the_pitch_linkage_model`
review, with a fresh scratch root per tree:

| tree | projection built from | suite result |
| --- | --- | --- |
| `integration` @ `e4a42d1` (no fold) | that tree | 20/22, these two FAIL |
| review merge @ `38b9599` | that tree | 20/22, these two FAIL (twice) |

So this is not caused by the fold. It will turn the browser tier red at the
next batch merge, which rebuilds the projections first.

Fix shape: point section 6 at a contributor that is still a gap in the
committed study, or derive the subject from the projection: pick the rows
whose `kind` is `gap`. If there are none, record a named SKIP that cites
this issue. Do not assert a hard-coded edge. Its mutation specs (enrolled in
`426a85a`) need re-checking against whichever subject replaces it.
