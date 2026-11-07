---
type: bug
priority: med
status: resolved
area: browser TRUTH tier / leaders across the seam
reporter: agent
class: timing_assertion_under_load
found_by: docs/sessions/reviews/REVIEW_20261103_coaxial_ends_share_one_3d_node.md
handoff: docs/sessions/HANDOFF_20261105_the_seam_and_rail_checks_wait_on_settled_state.md
resolution: handoff completed 2026-11-05 -- closed automatically by dispatch when handoff `the_seam_and_rail_checks_wait_on_settled_state` moved to completed/; not independently verified.
---

# The scene-tree pick check in "leaders across the seam" is flaky

The sub-check `a row the scene marks selected (a pick there) selects its
element here, lighting the same leaders a click on its grid row does`
(`scripts/run_viewer_browser_tests.mjs`, `testSeamLeaders`, the synthetic
section) goes red intermittently with no code change.

Measured 2026-11-04 during round 3 of the `coaxial_ends_share_one_3d_node`
review, `--only "leaders across the seam"`, projections built from the tree
under test:

| tree | runs | red |
| --- | --- | --- |
| `integration` alone (`0816cccf`, detached worktree) | 4 | 1 |
| `review/coaxial_ends_share_one_3d_node` merged onto it | 5 | 2 |

It predates that branch, which is on top of `integration`. One of the merged-tree
reds was the clean run of a mutation witness, which then reported its entry
as "the tier was red before the mutation", so this flake can also make a
witness look decayed.

## A likely mechanism (not verified)

The check posts `annotate:tree` with a selected row, waits for
`tr.tvrow--selected`, then calls `drawnAfter(beforePick)`, and only after
that measures the leaders. `drawnAfter` resolves on **any** seam draw after
`beforePick`. So a draw that some other trigger scheduled, landing between
the post and the selection reaching the seam states, satisfies it and the
measurement reads the pre-selection states. Under contention the window
widens. `coaxial_ends_share_one_3d_node` adds one more draw trigger (every
scene hover message calls `scheduleSeamDraw()`), which would make the race
more likely without causing it.

**Fix shape:** wait for the leaders' state itself (both ends carrying
`seam__leader--selected` in `VA.lastSeamDraw.states`), or for a draw whose
count is taken *after* `tr.tvrow--selected` is seen, rather than for any draw
after the post.

## Recurrence, 2026-11-06 (after the automatic close)

Status is left `resolved` because the handoff closed it. Re-open it if this
happens again. The same sub-check went red once more, in the round-2 review of
`a_part_with_many_interfaces_is_drawn_as_a_component_with_pins`. That was the
full browser tier on the merged review tree `0d197e0e`: 41/43, with this red
and the kinematic page's two filed reds. Then `--only "leaders across the
seam"` ran twice on the same tree with no change, and it was green both times
(1/1, 1/1). The close was automatic, and nobody verified it. The settled-state
handoff made the flake rarer. It did not remove it.
