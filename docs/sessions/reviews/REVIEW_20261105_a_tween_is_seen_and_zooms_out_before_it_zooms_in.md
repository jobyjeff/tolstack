---
type: review
handoff: docs/sessions/active/HANDOFF_20261105_a_tween_is_seen_and_zooms_out_before_it_zooms_in.md
reviewer: agent
date: 2026-11-05
verdict: REQUEST CHANGES
blockers: 3
---

# Review — a_tween_is_seen_and_zooms_out_before_it_zooms_in

Merged `handoff/<slug>` into `review/<slug>` (clean, no conflicts). **Not landed on
`integration`.** No inline fixes made.

## What I ran (merged tree, projections built from it into
`data/scratch/tween_review_root`, `--repo` pointed there)

- `node apps/viewer/run_tests.cjs --repo <root>`: 637/637 (`[real]` armed).
- `node apps/annotate/run_tests.cjs --repo <root>`: 285/285.
- pytest subset `test_mutation_witnesses`, `test_app_type_scale`,
  `test_js_vocabulary_is_generated`: 113 passed.
- `node scripts/run_viewer_browser_tests.mjs --repo <root>`: **red** (below). I stopped it
  after the failing suite; later suites in the run were not seen.
- `run_mutation_witness_tests.mjs --changed-since integration --repo <root>`: stopped
  part-way (about 8 WITNESSED, 8 NOT WITNESSED because the tier was red).
- Full pytest suite not run, since the verdict is REQUEST CHANGES; the tactical record
  (5 failed, not re-run after fixes) is itself not a clean full run.

Tactical report ran neither the browser tier nor the witness run, so the benefit of the
doubt on the browser tier is void — it is exactly where this change lands.

## Blockers

1. **Browser tier red: `the DAG zoom, Fit and the grid header` 40/41.** Failing check:
   "[real] a study change moves the DAG as one continuous frame: the space before it and the
   scroll are part of the transition, with no snap at either end, both ways". Output:
   `scrolled respine: scrollLeft 1159 -> 1159 -> 817 (pane content 1896 -> 1554px)`. The
   handoff's DoD requires the browser tier green and this is the very property it changes.
   Not baselined against `integration` by me, but the diff rewrote this path and the guard's
   witness spec (`124b830a`) was re-pointed by the tactical agent.
2. **Browser tier red: `annotate flyout` 40/41.** Failing: "closing the flyout puts the page
   back exactly -- the nav rail, the DAG pane's box and the drawing's box all as they were".
   The handoff added a glide around pane open/close (`beginGlide`/`endGlide`,
   `dropBandPad(); fitDagTo(true,true)`), so this is its surface. This red also made witness
   entries `9f6ba52e` and `2014a8df` report NOT WITNESSED, so the re-pointed specs are
   unproven.
3. **Deliverable 1's measured target is missing.** Target "≥30 rendered frames per tween"
   and DoD "frame count measured before and after" — only "before" (3) was measured; the
   lesson says "after" is unproven (shared box). Filmstrips use 100 ms steps, so "no jump
   larger than the per-frame step" is not shown (lesson suggests `--interval 30`). The
   filmstrips I viewed (study switch) look continuous, but that is not the pinned evidence.

## Notes for the rework

- Re-run the browser tier and witness run in a scratch root as above; the witness specs
  `1dd72346`, `124b830a`, `9f6ba52e`, `2014a8df`, `fast__…291035c6`, `fast__…47ccfc6f` need to
  read WITNESSED once the tier is green.
- Re-measure frames with `scripts/filmstrip.mjs --real-time` on a quiet box (box was queued
  behind other agents' browsers for ~30 min during this review) and record the count.
- Out of scope, not blocking: the pane-open band still moving ~410 px in the first frame is
  filed by the tactical agent as an issue.
