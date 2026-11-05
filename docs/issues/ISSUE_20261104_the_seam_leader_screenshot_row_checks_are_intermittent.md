---
type: bug
priority: med
status: open
area: tests/browser
reporter: agent
class: flaky_browser_check
found_by: docs/sessions/HANDOFF_20261103_the_joint_is_the_node_and_an_edge_says_only_lit_or_unlit.md
---

# The seam leaders' screenshot-row checks are intermittent

Measured 2026-11-04 during the review of
`the_joint_is_the_node_and_an_edge_says_only_lit_or_unlit`. The projection was
built from the review tree, with inputs bridged.

The suite is `leaders across the seam (synthetic anchors, the lit set, the
selection triple, P2)` in `scripts/run_viewer_browser_tests.mjs`. It is red in
different `[real]` sub-checks from one run to the next, on both trees:

| tree | run | result | red sub-check |
| --- | --- | --- | --- |
| review HEAD `52fe7439` | full tier | 25/26 | `[real] at 1600x1000, both screenshot rows' leaders -- hovered and selected -- run from the row to exactly its two ends' dots and on to those dots' anchors in the scene` |
| review HEAD `52fe7439` | `--only "leaders across the seam"` | 26/26 | none |
| base `integration` (`apps/viewer` + runner checked out) | `--only` | 25/26 | `[real] ...and at 1920x1080, after the window grew under them` |

So a red in this suite proves nothing about the diff under review. It can also
blind a mutation witness whose clean run lands on a red. Next step: run
`--only` about five times on `integration` alone and record which sub-check is
red each time. Then look for a settle predicate (a resize or a pane-load wait)
that those two checks share.

Related, and not the same thing:
`ISSUE_20261030_both_of_jeffs_leader_screenshot_rows_still_have_one_end_with_no_leg_into_the_scene.md`
is about the rows' geometry, not about the check flaking.
