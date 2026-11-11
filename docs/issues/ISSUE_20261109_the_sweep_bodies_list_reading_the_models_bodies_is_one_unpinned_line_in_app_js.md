---
type: bug
priority: high
status: resolved
area: annotate/sweep
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261109_a_folded_part_rides_its_own_body_in_the_sweep_and_the_bodies_list.md
handoff: docs/sessions/HANDOFF_20261110_the_sweep_rails_part_rows_carry_their_kind_and_the_bodies_call_is_pinned.md
resolution: handoff completed 2026-11-11 -- closed automatically by dispatch when handoff `the_sweep_rails_part_rows_carry_their_kind_and_the_bodies_call_is_pinned` moved to completed/; not independently verified.
---

# The sweep Bodies list reading the model's bodies is one unpinned line in `app.js`

The Bodies list now shows the model's bodies, so v2 reads `base · 4`, `tan link · 3`,
`pitch plate · 4`, `pitch link · 2`, `blade · 2` in DAG order. That fix rests on one
line in `cmdSweep` (`apps/annotate/app.js`):

    state.sweep.tree = AA.sweepModelTree(state.sweep.tree, sweepTopology());

Both pure helpers (`AA.sweepModelTree` and the `order` sort in `AA.sweepTreeSubjects`)
are pinned in `apps/annotate/run_tests.cjs`, and their mutation specs are witnessed.
**The call itself is pinned by nothing.** I measured this in the review of
`a_folded_part_rides_its_own_body_in_the_sweep_and_the_bodies_list` (2026-11-09) by
replacing that line with a comment and running:

- `node apps/annotate/run_tests.cjs`: green. The fast tier cannot boot `app.js`.
- `run_viewer_browser_tests.mjs --only "3D pane follows the selection"`: 32/32 PASS.
- `run_viewer_browser_tests.mjs --only "the model drawn alone and led"`: unchanged
  at 3/4. The one red is the sibling's pre-existing leader sub-check.

So the rail could silently go back to the run's part lists (`base · 3`,
`pitch plate · 2`, `tan link · 1`, in the run's order). That is the defect Jeff
reported on 2026-11-08 (S10, S13), and no tier would notice.

## Fix

Add a `[real]` sub-check to "the model drawn alone and led" in
`scripts/run_viewer_browser_tests.mjs`. With the P2 run loaded on `vpa_end_stop_v2`,
it should read the rail's `#sweep-tree/body=` rows and assert two things:

- each body's part count and the body order equal the projection topology's
  `bodies[]` (derived, not literals);
- `pitch_plate` lists both piston heads.

Enroll it with a spec that deletes the line above. This is the overlay's
"whole deliverable is one line from being silently reverted" class.
