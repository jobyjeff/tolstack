---
type: bug
priority: med
status: open
area: annotate/browser-check
reporter: agent
found_by: docs/sessions/HANDOFF_20261108_the_end_stop_model_names_its_datums_right_and_folds_its_riders.md
---

# The annotate `[real]` browser check still expects v1 as the default model

`node apps/annotate/run_browser_check.mjs --real vpa-pitch-p2-20261105-204957`
is red on the **baseline**, which is the main checkout's projections from
`integration` at `d9062b2d` (measured 2026-11-08). Its four `[real]` failures
all assume the page opens v1:

- `[real] opening P2 selects the topology the run names`
- `[real] after the run, the rail lists every edge … ` (expects
  `{"studied":false,"rows":99}`; v2 has 30 edges)
- `[real] out of sweep mode, every opened part is drawn at every occurrence the
  assembly records, at exactly its placement_world`
- `[real] the tangential link is drawn three times, once per occurrence`
  (v2 declares one occurrence per part)

It then throws in `pickSameFaceBothWays` (`run_browser_check.mjs:612`) before it
reaches the rider checks. Since 2026-11-08, v2 (`vpa_end_stop_v2`) is the nav's
default model, and a v1 run plays on it (`AA.sweepPlaysOn`). No gate runs this
check (`scripts/run_viewer_browser_tests.mjs` says so), so nothing went red.
The two mock-anchor failures in the same run are already filed as
`ISSUE_20261028_annotate_browser_check_mock_anchor_checks_are_red_on_integration.md`.

Fix: open v1 explicitly in the `[real]` pass, or re-target each expectation at
v2. Either way, the check's rider assertion (`both piston heads ride the pitch
plate…`) must follow `ISSUE_20261108_the_sweep_leaves_model_v2s_folded_piston_heads_standing_still.md`,
because v2 declares no riders now.
