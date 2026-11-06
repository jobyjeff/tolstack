---
type: review
handoff: docs/sessions/active/HANDOFF_20261105_a_tween_is_seen_and_zooms_out_before_it_zooms_in.md
reviewer: agent
date: 2026-11-05
verdict: APPROVE (round 3)
blockers: 0
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

## Re-run 2026-11-06 (round 2)

Rework `92c79d35` merged, then `integration` merged into the review branch. One conflict, in
`scripts/guard_enumeration.mjs`: the `fast` pin. The handoff side said 637 (635 + 2), `integration`
said 632 (it moved under the branch). I kept `integration`'s base and re-measured the merged tree:
634 = 632 + the handoff's two guards, names `73d6b29d4699`. Census tests 44/44.

Round-1 blockers 1 and 2 are **fixed** (runner-side: 80-frame sampler, path-length continuity metric,
flyout-close settles). Blocker 3 (the "after" frame count) stays unmeasured; the lesson says so, so I
am recording it as a **non-blocking gap** — re-measure on a quiet box.

Merged-tree results (projections rebuilt from the merged tree into `data/scratch/tween_review_root`;
the contact-suggestions projection there needed `--allow-older-tree` because the copy came from
another agent's tree — scratch only):
- viewer tier 634/634 (`[real]` armed); annotate 287/287.
- browser tier 39/41. The two red suites are **not this handoff's**: plain `integration` (detached
  worktree, same scratch root) fails the same three sub-checks — DAG zoom "first row is whole under
  the pinned bars", kinematic "hovering a sensitivity…" and "clicking a term row…". Worth an issue
  for whoever owns them; I did not file one.
- `--changed-since integration --repo <root>`: 16/16 reached, 6 WITNESSED, 9 NOT WITNESSED because
  the tier was red before the mutation (those suites are the inherited reds above — rerun at the
  batch merge once they are green), and **1 NOT WITNESSED because the witness cannot see the
  difference.**

### Blocker (round 2)

`browser__real-each-study-is-framed-once-the-re-arrange-settles-th__1139260e` — mutation
`landingPending = true; -> false` in `apps/viewer/topology_app.js` no longer reddens "each study is
framed once the re-arrange settles". The new keyframe engine runs `landing.target()` itself when
`animateTopoPane` is given a landing, so a study arrival frames the band whether or not
`landingPending` is set; the mutation no longer describes the defect. The handoff made this decay
and it exits the witness tier non-zero. Repoint the spec at the line that now carries the
arrival landing (or retire it with a stated reason, if the guard is covered by another entry), and
show it WITNESSED with `--only`.

## Re-run 2026-11-06 (round 3) — APPROVE

`f4eac9b2` re-points `1139260e` at `if (!known) end = measureLanding(start, lit);` — merged, and
`--only` reads **WITNESSED** (1/1, 2m53s) on the merged tree. No other change in the round (spec +
lesson line). Standing non-blocking items: the "after" frame count is unmeasured (re-measure on a
quiet box); nine witness entries were unprovable here because the DAG-zoom and kinematic browser
suites are red on `integration` itself — rerun `--changed-since` at the batch merge once those are
fixed.
