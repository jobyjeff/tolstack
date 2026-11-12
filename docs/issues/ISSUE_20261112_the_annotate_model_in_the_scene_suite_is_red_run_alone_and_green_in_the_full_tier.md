---
type: bug
priority: high
status: open
area: tests/browser-tier
reporter: agent
class: flaky_check
found_by: docs/sessions/active/HANDOFF_20261111_the_pane_follows_the_one_selection_both_ways.md
---

# The "annotate model in the scene" suite is red when run alone and green in the full tier, so the witness gate can prove none of its entries

`scripts/run_viewer_browser_tests.mjs`, suite `annotate model in the scene (anchors,
lines, the sweep, the anchors message)` (`testAnnotateModelInTheScene`).

Measured 2026-11-12, during the review of `the_pane_follows_the_one_selection_both_ways`.
Every run used `--repo C:/workspace/tolstack`, and no file under the main checkout's
`data/projections`, `data/inbox/linkage-sweeps` or `data/inbox/feature-identity`
changed between the runs:

| run | tree | result |
| --- | --- | --- |
| whole browser tier, ~09:33–10:04Z | merged review tree `3a90d2be` | suite **22/22**, tier 44/44 |
| witness `--changed-since master`, clean (no-mutation) runs of the suite | the same tree, shadow copy | **0/9**, twice |
| `--only "annotate model in the scene …"` | the same tree, review worktree | **0/9** |
| `--only "annotate model in the scene …"` | pristine `integration` `9a17df0f` (`git archive` under `data/scratch/`) | **0/9** |

The red is identical every time. The log reads `joints: ; hidden inside them: -;
unplaced: 0`, all nine `[real]` sub-checks fail, and there is one page error:
`TypeError: Cannot read properties of null (reading 'getBoundingClientRect')`, from
`document.querySelector("#annotate-flyout iframe")` in the "anchors message" block. So
the pane's iframe is not there when the suite runs by itself. The suite opens the pane
with `page.locator("#pane-handle").click()`, inside a `.catch(() => {})`. The page
remembers open/closed in storage (`VA.writeStoredFlyoutOpen`), which suggests that
whether the click opens or closes the pane depends on what an earlier suite left
stored. That is a hypothesis; I did not confirm it.

**Why it is high:** the witness gate runs each browser entry's suite with `--only`. So
on this tree every entry enrolled in this suite reports `NOT WITNESSED (the tier was
red before the mutation)`. That was 7 of the 37 entries the review's gate reached,
which is exactly the drop the gate exists to catch, and it says nothing about the
diff. The scheduled sweep will see the same thing.

Fix shape: make the suite open the pane deterministically, for example by waiting for
`#annotate-flyout[open]` and clicking the handle only when it is closed, the way
`tests/debug_one_selection_both_ways_20261112.mjs`'s `openPane` does. Then re-run it
with `--only`, and run one of its witness specs with `--only`.
