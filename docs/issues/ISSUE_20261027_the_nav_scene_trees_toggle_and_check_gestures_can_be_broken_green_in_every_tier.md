---
type: chore
priority: med
status: triaged
area: viewer/annotate embedded tree
reporter: agent
class: guard_cannot_fail
found_by: docs/sessions/active/HANDOFF_20261026_the_shell_seats_the_scene_beside_the_model.md
handoff: docs/sessions/HANDOFF_20261027_the_nav_scene_trees_six_gestures_are_named_once_and_each_witnessed.md
---

# The nav's scene tree: collapsing a row and its show/hide checkbox can be broken green in every tier

Found reviewing `the_shell_seats_the_scene_beside_the_model` (review report
`docs/sessions/reviews/REVIEW_20261027_the_shell_seats_the_scene_beside_the_model.md`).

The viewer's nav draws the annotator's rail under the study row, and every
gesture on a row goes back as `{type: "annotate:rail", key, act, index?}`.
`act` is one of six words, written as inline literals on both sides with
nothing pairing them:

- sender: `apps/viewer/views/nav.js` (`renderSceneTree` / `sceneItem` /
  `sceneControls`): `enter`, `leave`, `toggle`, `activate`, `check`, `button`;
- receiver: `apps/annotate/app.js` `railGesture`, an `if`/`else if` chain on
  the same six words that returns `false` for an unknown one, which the
  message handler ignores — no banner, no log.

The browser TRUTH tier exercises `enter`, `leave`, `activate` (click and
Enter) and `button` index 0 (the type chips). Nothing end-to-end exercises
`toggle` (collapsing or opening a body / joint from the nav, deliverable 3's
"collapsible"), `check` (the per-body / per-part show-hide checkbox from the
nav), or `button` with an index above 0 (Pick / Re-pick / Isolate / Remove).

**Measured (2026-10-27, review):** renaming the receiver's two branches to
`"toggleX"` / `"checkX"` in `app.js` leaves
`node scripts/run_viewer_browser_tests.mjs --repo <scratch> --only "3D pane follows"`
at **27/27**, and the fast tier pins only the sender's spelling
(`apps/viewer/tests.js`, "the scene's tree under the study row …"). So the
two gestures can be deleted, or drift apart by a rename on one side, with
every tier green. The behaviour works today (read through: the toggle flips
the mirrored `<details>`, the checkbox runs `show-body` / `hide-body`, which
re-renders the rail, and the `MutationObserver` re-posts the tree).

## Fix shape

1. Two `[real]` browser checks in the `3D pane follows …` suite: a click on a
   body's disclosure in the nav opens it (the nav's row and the annotator's
   `#sweep-tree` `<details>` both read open), and the body's checkbox in the
   nav hides that body in the scene (`__scene` visibility) and the nav's box
   reads unticked after the redraw. One for a row button at index > 0
   (Isolate) would close the third gap. Each gets its mutation spec.
2. Name the `act` words once. The viewer cannot import `AA`, so the cheap
   version is a frozen list on each side plus a fast check that pairs them
   (the shape `tests/test_js_python_vocabulary.py` uses), or a single
   vocabulary the annotator posts with its tree.
3. `railGesture`'s unknown-`act` arm should say so (a console warning naming
   the act), separately from the unknown-`key` arm, which is a legitimate
   race with a rebuild.
