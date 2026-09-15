---
priority: med
depends_on: []
model: opus
---

# HANDOFF 2026-09-15 — respine_tween_fidelity: the DAG slides in from off-pane, and a settled store is not the target store

Source: triage sweep 2026-09-14/15, dispositioning two defects in
`viewer_study_respine_animation`'s shipped tween machinery. Baseline: trunk after
the 2026-09-14 batch merge. Scope: the respine tween/position-store code in
`apps/viewer/` (`topology.js`'s position store and the respine path in
`topology_app.js`). Do NOT redesign what a respine shows or animate the grid's
rows — `BRIEF_20260915_respine_scope_and_grid_motion` owns both of those
questions and is unresolved; you are fixing the animation as built, not choosing
what it should be.

**Read that brief's closing section before starting.** It records that these two
bugs are deliberately being fixed independently of the design decision, and asks
you to check whether that decision has since landed. If it has and it replaces
the respine wholesale, stop and report rather than fixing code that is about to
be deleted.

## Deliverables

1. **A respine cannot interpolate x, so the whole block slides.** Observed
   symptom: **deselecting a study slides the DAG in from off the pane's left
   edge** — a whole-block translation where individual rows should be moving to
   their own new slots.

   Diagnose before fixing: the issue's title says the tween "cannot interpolate
   x", so establish whether the x coordinate is absent from the keyed position
   store, present but not interpolated, or interpolated against a wrong origin.
   Report which, because the three have different fixes and the issue asserts the
   first without showing it.

2. **A settled tween store is not "the target store exactly" — it keeps the
   outgoing side's own node/edge keys.** The invariant that should hold at the
   end of a tween is that the store equals the target store; it does not, because
   keys belonging only to the outgoing layout survive settling. That is a slow
   leak with a correctness face: a later tween can interpolate from a stale key
   that the current layout has no row for.

   Fix the settle step so the post-tween store is exactly the target's key set,
   and **pin the invariant** — a test asserting `keys(settled) == keys(target)`
   after a respine in both directions (select and deselect) is the deliverable
   that stops this recurring, not just the key deletion.

## Sequencing note

Both items touch the same position store, which is why they are one handoff
rather than two: item 2's key-set cleanup changes what item 1's interpolation
reads. Do item 1's diagnosis first, then item 2's fix, then re-check item 1's
symptom — it is possible the off-pane slide *is* a stale-key artifact, in which
case one fix closes both and you should say so explicitly instead of inventing a
second change.

## Definition of done

- Deselecting a study no longer slides the DAG in from off-pane: rows move from
  their old slots to their new ones. This is a visual claim, so demonstrate it —
  tolstack has a real browser tier (`scripts/run_viewer_browser_tests.mjs`) and
  the position store is readable in-page, so assert the first-frame x of a known
  row is inside the pane rather than left of it. Do not settle for "it looks
  right in a screenshot" as the only evidence.
- `keys(settled_store) == keys(target_store)` after a respine in both directions,
  pinned by a test.
- All tiers green: `node apps/viewer/run_tests.cjs` and `--repo
  C:\workspace\tolstack`, the browser tier, and
  `venv-win/Scripts/python.exe -m pytest -q` (869 passed / 1 skipped as of this
  staging).
- Projections live only in the main checkout
  (`C:\workspace\tolstack\data\projections\viewer\`) — read by absolute path,
  and prefer not to rebuild them (see
  `BRIEF_20260914_real_tier_shared_projection_coupling` for why rebuilding the
  shared dir from a worktree is contentious).
- Lesson (`docs/sessions/lessons/LESSONS_<YYYYMMDD>_respine_tween_fidelity.md`):
  which of the three x-interpolation diagnoses was actually true, and whether the
  two bugs turned out to share one cause.
