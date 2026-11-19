---
type: bug
priority: low
status: deferred
area: scripts/run_viewer_browser_tests.mjs (3D pane follows the selection suite)
reporter: agent
class: timing_assertion_under_load
found_by: docs/sessions/active/HANDOFF_20261029_viewer_browser_checks_wait_on_settled_state.md
defer_until: 2026-12-02
resolution: triage 2026-10-30: low, deferred onto the timing_assertion_under_load program (forge browser_runner_witness_holds_whatever_the_box_does, staged this sweep) -- woke 2026-10-30 -- browser_runner_witness_holds_whatever_the_box_does completed; re-triage | deferred 2026-11-02 (triage) -- low; class timing_assertion_under_load's program (forge browser_runner_witness_holds_whatever_the_box_does) has landed, so a class trigger can no longer wake this; budget 3/3 went to the trunk browser reds, the witness repair and a guard_cannot_fail med. 30-day date; the next tolstack port of the lever should take all four.
---

# "3D pane follows the selection" fails four nav-body sub-checks in a loaded full run

During `viewer_browser_checks_wait_on_settled_state`, run 2 of 5 of
`node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` (a full
default-tier `pytest -q` overlapping it) failed 28/32 in this suite; runs 1, 3 (and 4-5, see the lesson) passed 32/32:

- `[real] a click on a body's disclosure in the nav flips it, in the nav and in the annotator's own tree`
- `[real] a body's checkbox in the nav hides that body in the scene, and the box reads unticked after the redraw`
- `[real] ...and ticking it again shows the body`
- `[real] a part row's second button in the nav acts on that part, not on the row's first button`

Same class as the four fixed by that handoff (a read taken before the nav's redraw has
settled), but these are different sub-checks in a suite it did not scope. Fix shape:
poll for the nav row's state after each click with a deadline of seconds.

## 2026-10-30 — seen again (a_leader_starts_at_the_mark_it_names_on_every_tier)

One sub-check, "[real] ...and leaving it takes the light down", red in a full
`node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` run
from that handoff's worktree (33/37 suites; the other three reds were that
handoff's own and are fixed). The suite alone, twice right after: 32/32 both
times.

## Addendum 2026-11-05 (the_seam_and_rail_checks_wait_on_settled_state)

The four nav-body checks get the fix recorded on
`ISSUE_20261029_four_3d_pane_nav_gesture_checks_fail_together_when_the_bodies_resolve_late.md`
(the body row is waited for). The 10-30 sighting, `[real] ...and leaving it
takes the light down`, was reproduced and measured on that branch: `held
false` 1 in 4 and `chip null` 2 in 5 beside pytest, then 0 in 11 after its
precondition was held with a resting pointer. Its product half is filed as
`ISSUE_20261105_a_nav_scene_row_rebuilt_under_a_resting_pointer_drops_the_scenes_hover_light.md`.
Left `deferred` for triage to disposition.

## Sighting 2026-11-19 (review of the_pitch_plate_is_an_assembly_with_its_bushings)

`[real] ...and leaving it takes the light down` is red more often on that
branch's merged tree than on `integration` (`433619e5`). The branch adds no
code on this path, but its v2 alias row puts the NAS77A3 flanged bushing on
v1's eight instances, so the kinematic scene the suite loads draws more meshes.

| tree | runs | red on this sub-check | red on the body-lit sub-check |
|---|---|---|---|
| merged `009b7119` / `6108d27d` (two whole tiers, seven `--only`) | 9 | 5 | 1 |
| `integration` export, `--only` | 3 | 0 | 0 |

One more `--only` run failed at boot (the pane never opened) and is not
counted. The author ran it 4 of 4 green on their own scratch root. All runs
were on the same box and the same day, and nothing else was measured, so this
shows a higher rate, not a cause. A temporary diagnostic in the check never
printed, because the sub-check went green on every run that carried it.
Left `deferred`.
