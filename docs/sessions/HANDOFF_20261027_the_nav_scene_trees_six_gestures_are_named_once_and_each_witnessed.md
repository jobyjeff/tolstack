---
priority: med
depends_on: [the_checks_and_claims_the_folds_left_naming_what_they_removed]
model: sonnet
hitl: false
---

# HANDOFF 2026-10-27 — the_nav_scene_trees_six_gestures_are_named_once_and_each_witnessed: the nav→annotator `act` words get one paired list, an unknown one says so, and toggle / check / row buttons get browser checks

Sequenced after `the_checks_and_claims_the_folds_left_naming_what_they_removed`: that one re-runs the 3D-pane suite's 14 mutation specs, and adding checks to the same suite first would move what it re-verifies.

Source: triage sweep 2026-10-27, from
`docs/issues/ISSUE_20261027_the_nav_scene_trees_toggle_and_check_gestures_can_be_broken_green_in_every_tier.md`
(review of `the_shell_seats_the_scene_beside_the_model`,
`docs/sessions/reviews/REVIEW_20261027_the_shell_seats_the_scene_beside_the_model.md`).
Class `guard_cannot_fail` (20 live members in this repo). Baseline: `master`
at `1a006b63` plus `the_checks_and_claims_the_folds_left_naming_what_they_removed`.
Scope: `apps/viewer/views/nav.js` (`renderSceneTree` / `sceneItem` /
`sceneControls`), `apps/annotate/app.js` (`railGesture`), `apps/viewer/tests.js`,
`apps/annotate` fast tests, `scripts/run_viewer_browser_tests.mjs` (the
`3D pane follows the selection` suite only), new entries in
`scripts/mutation_witnesses/`, a pairing test under `tests/`. Do NOT touch
`scripts/run_mutation_witness_tests.mjs` (staged
`a_witness_run_stops_at_its_budget_and_leaves_the_rest_to_the_sweep`) or the
nav row layout (design issue
`ISSUE_20261027_design_the_nav_scene_tree_clips_part_names_to_a_few_characters.md`,
deferred).

## The gap

The nav draws the annotator's rail under the study row; each gesture posts
`{type: "annotate:rail", key, act, index?}`. `act` is one of six words —
`enter`, `leave`, `toggle`, `activate`, `check`, `button` — written as inline
literals in both `nav.js` and `app.js`'s `railGesture` (an `if`/`else if`
chain that returns `false` on an unknown word, which the message handler
ignores silently). The browser TRUTH tier exercises `enter`, `leave`,
`activate` and `button` index 0 only. **Measured 2026-10-27:** renaming the
receiver's `toggle`/`check` branches to `toggleX`/`checkX` leaves
`--only "3D pane follows"` at 27/27, and the fast tier pins only the
sender's spelling.

## Deliverables

1. **Browser checks** in `3D pane follows the selection`, each `[real]` with
   its mutation spec: a click on a body's disclosure in the nav opens it (nav
   row and annotator `#sweep-tree` `<details>` both read open); the body's
   checkbox in the nav hides that body in the scene (`__scene` visibility) and
   reads unticked after the redraw; a row button at index > 0 (Isolate) acts.
2. **One vocabulary.** The viewer cannot import `AA`; suggested shape: a
   frozen list on each side plus a fast test that pairs them (the pattern in
   `tests/test_js_python_vocabulary.py`), or the annotator posts its own list
   with the tree. Pick one and say why in the lesson.
3. **An unknown `act` warns** (console warning naming the act), separately
   from the unknown-`key` arm, which is a legitimate race with a rebuild and
   stays quiet.
4. Resolve the issue (`status: resolved`, pointing here).

## Definition of done

- Re-apply the issue's rename mutation: the new checks go red; the
  vocabulary pairing test goes red on a one-sided rename.
- `node scripts/run_mutation_witness_tests.mjs --repo <worktree> --only <each new id>`
  witnesses every new spec; node tier, browser suite and `pytest -q` green on
  a projection built from the worktree.
- Lesson (`docs/sessions/lessons/LESSONS_20261027_the_nav_scene_trees_six_gestures_are_named_once_and_each_witnessed.md`):
  the vocabulary shape chosen and the rejected one.
