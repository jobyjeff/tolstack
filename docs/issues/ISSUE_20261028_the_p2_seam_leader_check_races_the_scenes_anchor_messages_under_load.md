---
type: bug
priority: low
status: triaged
area: tests/browser
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261028_the_active_study_is_a_compact_band_and_the_rest_of_the_model_hangs_above_and_below.md
class: timing_assertion_under_load
handoff: docs/sessions/HANDOFF_20261029_viewer_browser_checks_wait_on_settled_state.md
---

# The P2 seam-leader check races the scene's anchor messages under load

`scripts/run_viewer_browser_tests.mjs`, `testSeamLeaders`, "[real] on P2 every lit
node with an anchor and a dot in the DAG's view has its leader across the seam, and
nothing else has one" (and the two checks after it that use the same `liveMeasure`).
In a 10-minute `run_mutation_witness_tests.mjs --changed-since integration` run on
2026-10-28 the suite's CLEAN run was red on it three times in a row: the page had
drawn 9 leaders with 10 lit nodes reported "no anchor", while every direct run of the
suite (4 of 4) and the witness re-run alone (4/4 WITNESSED) saw 17 leaders and 3
without an anchor. `liveMeasure` compares the app's last draw against
`frame.contentWindow.__lastAnchors` read later, and the scene was evidently still
projecting anchors when the harness measured (it waits for one draw with any
leader, pauses, then 600ms). Probably wants to wait until two consecutive anchor
messages agree, or until the draw count stops moving, before measuring.
