---
type: review
handoff: docs/sessions/active/HANDOFF_20261121_a_body_row_in_the_nav_takes_a_resting_hover_every_time.md
reviewer: agent
date: 2026-11-22
verdict: APPROVE
blockers: 0
---

# Review 2026-11-22: a_body_row_in_the_nav_takes_a_resting_hover_every_time

Branch `handoff/a_body_row_in_the_nav_takes_a_resting_hover_every_time` (4
commits). It merged cleanly into `review/…` cut from `integration` `8ba9e509`.
The diff is one test harness, `scripts/run_viewer_browser_tests.mjs`
(`testThreeDPane`, +54/-8), plus a lesson and three issue addenda. No product
code changed.

## What I verified

- **Diagnosis (deliverable 1).** The lesson rules out the issue's suspect with
  a measurement: a MutationObserver on `#navtree` saw no removal of the body row
  across the 20 s window. It then puts the stall in the shared renderer thread,
  using the untruncated Playwright call log ("performing hover action"), a 15 s
  return on a 1.5 s poll, a CPU profile and a 14.9 s queue round-trip. That
  settles which side was wrong. The product half (the pane's opening work
  starving the page) was already filed in `ISSUE_20261119_…`. The new fact, that
  the lag reaches the page's own input, was appended there as a sighting. That
  is the right owner.
- **Fix (deliverable 2), checked against "never by loosening what it asserts".**
  The light predicate is byte-identical. The only change before it is a wait:
  post `scene-view` through `annotate:exec` and await its `annotate:result`.
  That is the same barrier the map suite uses (line ~3649), and the overlay's
  entry "A part is open is not the pane is settled" asks for it. A timed-out
  barrier (180 s) does not pass anything. It proceeds, and the DIAG prints
  `pane settled first: false`. The leave check's assertion is unchanged too. It
  only gained a DIAG, and both DIAGs now keep an error's tail with colour codes
  stripped. `scene-view` is a registered read-only command
  (`apps/annotate/app.js:5665`). `__heardLight`, used by the leave DIAG, is
  installed earlier in the same suite.
- **Guard names are unchanged**, so `DECLARED_GUARDS` and the two witness specs
  still pair. Both specs mutate `apps/viewer/topology_app.js`, not the harness.
- **The tactical test record** names its full-suite run: worktree, 2585
  passed, 2 failed (the documented worktree red and an export-run red already
  fixed on integration), 1 skipped, 602 s. The benefit of the doubt applies.

## Tests

Projections: the main checkout's `data/projections/viewer/` was built from
`c3928f9a` and its `topology_vpa_pitch_linkage.json` differs from integration,
so the fast tier refused it. I built a scratch root at
`data/scratch/rv_bodyrow_1122` (data copied from `rv_nodesuite_1122`, the merged
tree's `docs/`, `venv-win` and `node_modules` junctions) and ran all eight
builders from the review worktree with `--data-root …/data
--allow-older-tree`. The override only replaced my own scratch copy, which
another review's tree had stamped. The shared projections were not touched.

Pre-merge risky subset (harness change → the changed suite, fast tiers,
witness pytest), on the merged review branch:

- `node apps/viewer/run_tests.cjs --repo <scratch>`: **623/623**, with `[real]`
  checks running and paired.
- `node apps/annotate/run_tests.cjs`: **333/333**.
- `pytest -q tests/test_mutation_witnesses.py`: **49 passed**.

Post-merge:

- `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q` (review
  worktree, serial): **1 failed, 2590 passed, 1 skipped, 4 deselected in
  480 s**. The one failure is `test_viewer_js_suite_is_green`, the documented
  worktree red (no projection under the worktree's `data/`). The `--repo` run
  above covers it. Recorded at 482 s, `inside budget`. This conftest prints no
  contention header lines.
- **The DoD's "`--only "3D pane follows"` once beside a default `pytest -q`"**,
  which the tactical session could not run (classifier refusal): I ran it
  concurrently with the pytest above, as a separate background command. Result
  **31/31**, 117 s.
- Whole browser tier,
  `node scripts/run_viewer_browser_tests.mjs --repo <scratch>`: **47/49**,
  2447 s, with its own ledger row at 2026-11-23T07:35:06Z. `3D pane follows`
  passed 31/31. The two reds are not this diff's:
  - `a suggestion names its face …`: 3/5.
  - `a pattern is bound as its like faces …`: 8/11.
  - Baseline: a `git archive integration` export with a `node_modules`
    junction, against the same scratch root, gave **3/5** and **5/11**. On the
    merged tree, run straight after, they gave **3/5** and **8/11**. Both were
    red before this diff, and the diff touches neither suite. Likely cause: Jeff
    bound the features these checks drive during his session on 2026-11-22
    (events 0101–0115, including `tan_link_mount_hub_face`). Filed as
    `ISSUE_20261122_the_suggestion_and_pattern_real_checks_go_red_once_jeff_binds_the_features_they_drive.md`.
- Witness gate,
  `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack
  --changed-since integration --budget-min 10`: exit 0, **1/1 witnessed**
  (`…resting-on-a-body-row…07c48b28`, 5m27s). One selected entry was `left to
  the sweep (budget)`. The leave spec `…3c44a05c` is the tactical session's
  `--only` run (2/2 witnessed, 6m59s).

## Findings

None blocking. No should-fix.

- **nit:** the barrier's `page.evaluate` promise is near-verbatim the map
  suite's (line ~3636). A third copy should become a shared helper in the
  harness. Not worth a loop-back for two copies.

## Overlay

Second sighting of "A part is open is not the pane is settled". I appended one
line to that entry: `__sweep.bodies` is not settled either, and a
`locator.hover` stalled at "performing hover action" is the shared-thread
cause, not a rebuilt row. The two red suites above settle on `__sweep.bodies`
too, which the issue notes.
