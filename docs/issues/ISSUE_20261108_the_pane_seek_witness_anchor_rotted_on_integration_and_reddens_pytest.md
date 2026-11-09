---
type: bug
priority: high
status: resolved
area: tests/mutation-witness
reporter: agent
class: decayed_witness
found_by: docs/sessions/HANDOFF_20261108_model_v2_is_the_end_stop_linkage_in_five_bodies_and_the_nav_switches_models.md
handoff: docs/sessions/HANDOFF_20261108_the_pane_seek_witness_points_at_the_comparison_the_page_now_makes.md
---

# The pane-seek witness's anchor rotted on integration, and `pytest -q` is red there

`tests/test_mutation_witnesses.py::test_every_anchor_resolves_to_exactly_one_place`
fails on the `integration` tip (`8d8d9f57`), independent of any handoff
in flight:

```
browser__real-and-a-seek-in-the-pane-lands-the-page-s-angle-on-th__f697d046.json:
a `find` matches 0 places in apps/viewer/topology_app.js (expected exactly 1).
Anchor:  Math.abs(state.kinematicPose - index) > 1e-6
```

`git show integration:apps/viewer/topology_app.js | grep -c 'Math.abs(state.kinematicPose - index) > 1e-6'`
gives `0`. The spec came in with
`the_linkage_play_control_is_the_only_one_and_it_moves_everything`. Its
round-1 rework (`665e4d34`, "a pane pose the page already holds writes no
URL") rewrote the pose-sync code the anchor names, and the review that
approved round 2 (`762d16bc`) landed it with the anchor dangling.

Found when the model_v2 review merged `integration` into its review branch.
The failure is the same with and without that handoff's changes
(`topology_app.js` hunks from model_v2 are in the boot and `selectTopology`,
nowhere near the pose sync).

Fix: re-point `find`/`replace` at the comparison the page now makes before it
follows a pane seek (around `syncPanePose`, `apps/viewer/topology_app.js`
~l. 1521 / 1760), then `--only` the entry to confirm it still witnesses. The
other way out is to retire the spec and say why.

## Resolved 2026-11-08

Anchor re-pointed at `heldPoseIs`'s `Math.abs(held - index) <= 1e-6`
(`<= 1e9` mutated). Verified:
`node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --only browser__real-and-a-seek-in-the-pane-lands-the-page-s-angle-on-th__f697d046`
-> `=> WITNESSED in 2m26s`, `1/1 witnessed`; `pytest -q` in the worktree
`1 failed, 1867 passed` (the one failure is the worktree-only viewer JS tier).
Cause and the review-prompt gap: the lesson of the same slug.
