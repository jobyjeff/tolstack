---
type: chore
priority: med
status: deferred
area: viewer/layout
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261109_the_demo_path_reads_cleanly_on_a_projector.md
defer_until: 2026-11-24
class: guard_cannot_fail
resolution: deferred 2026-11-10 (triage) -- med beyond BUDGET=3; viewer selection/layout files are the strategy thread's F1b/F1c sequence (dispatch/docs/strategy/HANDOFF_20261109_strategy.md)
---

# The grid beside the open 3D pane, and the new line weights, revert green in every tier

Found by the review of `the_demo_path_reads_cleanly_on_a_projector` (APPROVE,
`docs/sessions/reviews/REVIEW_20261109_the_demo_path_reads_cleanly_on_a_projector.md`).
Two of that handoff's five deliverables have no guard. The lesson and its shots
measured both, but no test reads either one.

## 1. The grid readable at 1920 with the pane open (deliverable 2, the high issue)

The fix is two lines:

- `apps/viewer/topology.css`:
  `body.flyout-open .tv .detail { width: clamp(200px, calc(100vw - 1706px), 560px); }`
- `apps/viewer/topology_app.js`, `graphNeed()`: `+ VA.gridKeptWidth()`

**Measured in review:** I deleted the CSS rule and the `+ VA.gridKeptWidth()`
term on the merged tree. `node scripts/run_viewer_browser_tests.mjs --repo
C:/workspace/tolstack --only "annotate flyout"` still passed 41/41. That suite
opens the pane at 1920 on a live study. Its checks ask whether the drawing is
clear of the panel, which holds in both layouts. No check reads whether the
grid's PART to ELEMENT columns are on screen. `git grep` finds no browser check
that reads `gridKeptWidth`, the `.detail` width under `flyout-open`, or
`td.tvcell--name`'s rect with the pane open.

**`1706` is a hand sum, paired with nothing.** It is nav 300, plus
`VA.FLYOUT_WIDTH.min` 400, plus about 1002 of drawing and grid, plus the
dividers. The 1002 is v2's leader fan (416px, set by that model's leader count)
plus `VA.gridKeptWidth()` (586). If the nav width, the scene floor, the column
widths or the model change, the Preview's clamp goes stale and nothing fails.

**What would close it:** add a `[real]` browser check at 1920×1200 on
`vpa_end_stop_v2`, with the pane open and the tan-link `length` row selected.
It asserts that `td.tvcell--part` and `td.tvcell--name` of the lit row both sit
inside the viewport and left of the Preview. Give it a mutation spec for each of
the two lines above. Then either derive the Preview's clamp in JS from the same
numbers `graphNeed` uses, or pair `1706` against them in a fast test.

## 2. The line weights (deliverable 4)

Rails 3, leaders 2, body containers 2, part containers 1.5. The only relevant
check is relational: "a hot rail is drawn thicker". Putting every weight back
to its 2026-11-08 value stays green. The only place the 1.5 → 2 change shows up
is a mutation spec's anchor text (`browser__the-leaders-across-the-seam-…`).

**What would close it:** add one browser check that reads computed
`stroke-width` and asserts the hierarchy the handoff fixed: bar > rail >
leader ≥ part container, with rail ≥ 2.5 at DPR 1. Give it a spec.

## 3. A smaller one, same handoff

The flyout suite's "a pane just opened wears no status chip …" check decides an
**absence** after a fixed `waitForTimeout(1500)`. It is witnessed today, but if
the annotator ever posted its first status more than 1.5 s after
`readyState === "complete"`, the check would pass vacuously. Since this
handoff, `renderPaneStatus` posts an empty word while the status is hidden. A
positive anchor (the shell counting that post, then reading the chip) would
remove the sleep.
