---
type: chore
priority: low
status: open
area: docs/sessions
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20260918_visual_rules_nothing_checks.md
---

# 7 of the 13 committed `design_pass_typography` screenshots no longer match what the probe takes off `integration`, so the byte-identical property the pair leaned on is gone

Found 2026-09-18 by `visual_rules_nothing_checks` while verifying that fixing
`tests/debug_typography_pass.mjs`'s crash had not moved any committed shot.

`ISSUE_20260917_the_typography_probe_crashes_on_the_stack_table_shots_in_five_
runs_of_eight` recorded a strong and genuinely useful property, verified in
review on 2026-09-17 by re-taking both phases off both trees:

> the 26 committed shots are **byte-identical** across machines (verified in
> review — both phases re-taken from the two trees, 26 of 26 matched), so a
> diff of one byte in a re-take is a real difference and not noise.

**That is no longer true**, and it broke for a reason that has nothing to do
with the probe. Re-taking the `after` phase off `HEAD` today
(`node tests/debug_typography_pass.mjs --repo C:/workspace/tolstack --shots
<dir> --phase after`):

| shot | vs committed |
| --- | --- |
| 1 topology_page | **differs** (143653 vs 140041 bytes) |
| 2 nav_rail | **differs** (62881 vs 57410) |
| 3 grid_rows | **differs** (49458 vs 47003) |
| 4 preview_pane | **differs** (56585 vs 55946) |
| 5 totals_verdicts_and_gaps | **differs** (108458 vs 108459) |
| 6 hover_card | identical |
| 7 legend_dialog | **differs** (217228 vs 217224) |
| 8 stack_elements_table | **differs** (113914 vs 113906) |
| 9 stack_materials_table | identical |
| 10–12 annotator | identical |
| 13 worksheet_dialog | identical |

## It is not the probe, and it is not this handoff's change

Both were checked, because the obvious suspicion is the fix:

* **The pre-fix probe produces the same differences.** `git show
  HEAD:tests/debug_typography_pass.mjs` run against the same tree and data
  differs from the committed shots on 1, 2, 3, 4, 5 and 7 — every shot it
  reaches before it aborts. So the drift predates the change.
* **The fixed probe is deterministic.** Three independent `--shots` runs were
  byte-identical to each other on all 13. (One divergence on shot 3 was seen
  between the *pre-fix* probe's run and the fixed probe's — plausibly the
  grid's asynchronous `ensureThumbImages` thumbnails, which no shot waits for,
  but it did not reproduce in three runs of the fixed probe.)
* **The app moved under the screenshots.** The shots were committed in
  `2b82cfc` ("design pass: one measure, the worksheet's own headings, a
  declared h4"). Between that commit and `HEAD`, on the way through the
  2026-09-18 batch merge:

  ```
  apps/viewer/style.css      | 39 ++++++++++++++-
  apps/viewer/topology.css   |  9 +++-
  apps/viewer/views/stack.js | 44 ++++++++++++++-
  ```

  Three of those shots are of surfaces `views/stack.js` and `topology.css`
  render. That is a sufficient explanation, and it is nobody's defect: the
  merges that changed them were correct.

## The decision this needs, which is why it is routed to strategy

Re-taking is not mechanical, and the wrong repair makes the artifact worse:

* **Re-taking `after` alone is wrong.** The pair's whole evidentiary value is
  that the two runs differ *only where the stylesheet does*. A fresh `after`
  against a stale `before` is a diff of the typography pass plus two unrelated
  handoffs, presented as the typography pass.
* **Re-taking both phases is possible but is a new claim.** It means checking
  the pre-pass CSS onto today's tree, which produces a valid pair again — of
  the pass's effect *as it would land today*, which is not the same artifact
  as the one the handoff shipped.
* **Or the pair is dated evidence and allowed to go stale**, in which case the
  probe's byte-identical property should be stated as "byte-identical at the
  commit the shots were taken at" rather than as a standing invariant, and the
  lesson that cites it should say so.

The general question underneath: **this repo commits before/after screenshot
pairs as the evidence for CSS-only passes, and every such pair silently stops
matching its own probe as soon as anything else touches the surface.** There
are four such pairs in `docs/sessions/lessons/` today
(`design_pass_typography`, `topology_grid_scroll_and_grips`,
`flyout_resize_annotator_filter_and_deselect`, and the crop lightbox's
singles). Whatever is decided here should be decided for the convention, not
for these 26 files — and it is a convention question, not a fix.

## Not urgent

Nothing a reader of the app can hit, and the shipped CSS is correct — the
review that took the shots verified that independently. What has decayed is a
piece of committed evidence's ability to be re-verified, which is worth exactly
one decision and not a session.
