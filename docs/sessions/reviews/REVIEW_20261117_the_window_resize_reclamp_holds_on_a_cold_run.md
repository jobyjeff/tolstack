---
type: review
handoff: docs/sessions/active/HANDOFF_20261116_the_window_resize_reclamp_holds_on_a_cold_run.md
reviewer: agent
date: 2026-11-17
verdict: APPROVE
blockers: 0
---

# Review — the_window_resize_reclamp_holds_on_a_cold_run

Reviewed `handoff/the_window_resize_reclamp_holds_on_a_cold_run` at `d4b4a15b`
(two commits on `ad1f6b8d`; the handoff tip had not moved when this report was
written). Diff: `apps/viewer/topology_app.js` (the `resize` listener),
`scripts/run_viewer_browser_tests.mjs` (`testWindowResizeReclamps`), the witness
spec `…fa30ff82.json` (its `find` follows the de-indented line), and an added
lesson and shot. All files are `A` or `M` as expected, and no earlier lesson or
review was overwritten. Merged as a fast-forward onto the review branch, then
`integration` (`5c79aba0`, docs-only since the cut) merged in with no conflict.

## What the change does, and whether it is right

`applyPaneWidth()` and `refitPane()` now run in the `resize` event itself, and
only `render()` stays behind the 150 ms debounce. What the code decides is
unchanged: the same two calls, in the same order, still before `render()`. Only
*when* they run moved. Checked for side effects:

- Chrome coalesces `resize` to one per frame. So the new cost is one forced
  layout per frame during a window drag, a layout that frame does anyway.
- `graphNeed()` still reads the rails drawn for the previous window. That was
  true behind the timer as well (it ran before `render()` there too).
- The scene's `ResizeObserver` now fires on width changes during a drag.
  `scene.js`'s `resize()` only resizes the renderer and asks for one frame on
  demand. A vertical drag already fired that observer every frame before this
  change (the host's height tracks the window), so there is no new class of cost.
- The test now reads two `requestAnimationFrame`s after `setViewportSize`. By
  the HTML spec the resize steps run before the rAF callbacks in a rendering
  update, so the read is the first frame that could paint at 1920. A clamp
  behind the timer is red there unless a stall lets the timer win. The lesson
  measured 1 red in 2 runs on the pre-fix code, and the witness below confirms it.

The lesson's diagnostic claims were re-checked. `browser.newPage` on a
`Browser` is a fresh context per page. The runner reads only the first
`--only`, and an unknown flag runs the whole tier (`process.argv.indexOf`).
The tolstack venv has no `xdist` (`ModuleNotFoundError`). The class note is
correct: the deferred
`ISSUE_20260918_three_browser_tier_resizes_measure_through_the_apps_own_debounce.md`
is on integration, with `class: wall_clock_dependence`.

## Tests run (all on the merged tree, review worktree, data through `--repo C:/workspace/tolstack`)

The tactical record is partial. The ledger has its default-tier row (478 s)
and many `--only` rows, but no result counts are written anywhere tracked
(the lesson says "results are in the hand-back report"). There is also no
whole-tier row, although the DoD asks for "green inside a whole-tier run". So
I took no counts on trust. The handoff tip and the merged tree differ only in
integration's docs, so the runs below cover both.

| Run | Result |
| --- | --- |
| `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | 715/715 |
| `node apps/annotate/run_tests.cjs` | 323/323 |
| `pytest -q tests/test_mutation_witnesses.py tests/test_js_python_vocabulary.py tests/test_viewer_readme_doc_facts.py tests/test_viewer_deep_link_contract.py` | 64 passed |
| `--only "a window resize re-clamps"` × 3, back to back | 3/3, 3/3, 3/3. Every run printed `1841 (3D 1829) at 5120 -> 485 (3D 473)`, fresh load `485 (3D 473)` |
| `run_mutation_witness_tests.mjs --changed-since integration --budget-min 10` | exit 0. `browser__real-a-reload-reopens…__09a1cf0a` WITNESSED (5m28s). `…fa30ff82` was left to the sweep by the budget, so it was run alone: |
| `run_mutation_witness_tests.mjs --only browser__real-shrinking-the-window-to-1920-re-clamps-the-pane-the__fa30ff82` | **WITNESSED** (29 s), exit 0 |
| whole browser tier `node scripts/run_viewer_browser_tests.mjs --repo …` | **46/48**, 1123 checks, 2104 s (runner row `157ca1c6`/tree `0a583bac`, `over: true`). The resize suite was **3/3 inside the tier**. Reds: `popover mechanics` 21/22, `3D pane follows the selection` 30/31 |
| `--only "3D pane follows the selection"` | 31/31. That is the filed flake `ISSUE_20261105_a_nav_scene_row_rebuilt_under_a_resting_pointer_drops_the_scenes_hover_light.md` |
| `popover mechanics`, merge against a `git archive integration` export, alternated | merge 21/22, 22/22, 21/22. Integration 22/22, 21/22, 22/22. **The baseline flakes too, on the same sub-checks**, so this is not a regression. No open issue covered it, so it is now filed: `ISSUE_20261117_the_popover_hover_intent_corridor_checks_flake_alone_on_integration.md` |
| default tier `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -rfs` | `1 failed, 2027 passed, 1 skipped, 4 deselected` in 451 s (recorded, inside budget). The one red is `test_viewer_js_suite_is_green`, the documented worktree red (no `data/projections/` here). That tier is the 715/715 above, through `--repo`. This repo's conftest prints no contention header lines |

The whole tier ran over its budget, by 5m04s. The measurement is appended to the
open `ISSUE_20261106_the_viewer_browser_tier_ran_51_minutes_against_the_merge_budget.md`
rather than filed again. Nothing else of mine was running beside the tier. Not
exercised: the main-checkout default tier. The diff touches no path resolution
and reads no `data/`, so the worktree run is the one owed.

DoD: `--only` 3/3 three times in a row ✔. The suite is green inside a whole-tier
run ✔. The witness is WITNESSED ✔. The default tier is green apart from the
documented worktree red ✔. The lesson has the root cause with before/after
numbers ✔.

## Checklist items

- Tolerance-stack mandatory checks 1–7: **not applicable**. No stack, topology,
  hardware entry or spec event is in the diff, and no projection input changed
  (so no rebuild was needed, and the fast tier's freshness pairing passed).
- A new guard? No new guard. The re-anchored spec is witnessed (above).
- Tests pinned to the wall clock: the diff *removes* one (`settle(1200)`), which
  is the point.
- Fix at one of N sites: the lesson names the class and points at the deferred
  issue. It changed only this suite, as the handoff fenced it.
- Re-opened closed issues: the original fix's issue is the one this handoff
  completes. Nothing reverses it.
- Design: no visible change apart from the timing. No design finding.

## Findings

**No blockers. No should-fix.**

Nits:

1. *Fixed inline (correction blockquote in the lesson):* the lesson's table
   said the timer fired "736 ms late". 736 ms is the time from the event
   (4338 − 3602), so the timer was 586 ms late. Also, the `473px` row at 4832 is
   when the MutationObserver *recorded* the write. Its microtask runs only after
   the whole timer callback, `render()` included.
2. *Not fixed:* the new comment in `topology_app.js` says that on a cold page
   "the 3D scene's own re-render at the new size held the main thread for ~3 s".
   The lesson's first measured run had that long task start 42 ms after the
   shrink, 3.5 s *before* the `resize` was delivered, which is the lesson's own
   reading: work left over from `open()`. The causal clause is looser than the
   measurement. It is harmless to the code, so I left it rather than move a line
   the witnesses anchor near.

## Inline edits by the reviewer

- Lesson: the correction blockquote above (nit 1).
- Overlay `docs/prompts/REVIEW_AGENT.md`: one new Recurring-bugs entry, "Red
  alone, green in the whole tier: suspect the cold 3D load before leaked state".
- Issues: filed the popover flake. Appended a dated measurement to the
  browser-tier budget issue.
