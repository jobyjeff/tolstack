---
type: review
handoff: docs/sessions/active/HANDOFF_20261029_a_leader_starts_at_the_mark_it_names_on_every_tier.md
reviewer: agent
date: 2026-10-30
verdict: APPROVE
blockers: 0
---

# Review — a_leader_starts_at_the_mark_it_names_on_every_tier

The handoff branch is `handoff/a_leader_starts_at_the_mark_it_names_on_every_tier`
(tip `654ece75`, 9 commits). It was not already contained in `integration`
(`34ed27c4`). Merging it into `review/…` was a fast-forward, with no
conflicts. This is the first run of this review; the branch had no earlier
review commits.

## What was verified

**The mechanism.** I read it against the lesson's three-row table, and each
row is real in the code:

1. **Hover lit the wrong leaders.** A DAG↔grid leader used to lead for
   `leader.beforeEdge`, the edge whose row starts at its seam. It now leads for
   every edge that ends at its node. `VA.leaderEdgesAt` is the selection rule
   `VA.selectedLeaderNodes` read backwards, so hover and selection cannot
   disagree.
2. **The overlay clipped dots that were on screen.** It used the pinned
   header's whole box. It now clips by `.tvheadtable` only (`dotCover`).
3. **The page kept stale anchors.** `seamAnchors` was never dropped. It is now
   dropped (`forgetSeamAnchors`) on flyout close and on the iframe's `load`.
   On reopen and on `annotate:state` the page asks again with the new
   `model anchors` verb, which clears `postedText` and posts.

There is no loop. `annotate:state` is posted only after sweep, goto or trace
(`postEmbedState`), and `model anchors` does not trigger one.

**Deliverable 0 (the DAG zooms alone).** `.tv__zoom` carries no transform. The
DAG is drawn in two `g.tv__dag` layers. `leaderGeometry` and `seamDots` take
`{k, y0}`. The `--tv-shift` workaround is removed everywhere (grep: one
historical README mention). The wheel handler and Fit were edited even though
the handoff fenced them off. The edits are minimal, the deliverable needs them,
and the lesson says so.

**Deliverable 3 (one source).** The new trace checks measure from the DOM
circles and the scene's own `__lastAnchors`, never from `lastTopoRender.seam`.
The two older P2 checks are now also held to the DOM circles (`offDot`).

**DoD.**
- Both screenshot rows are green at 1600×1000 and 1920×1080, hovered and
  selected.
- The re-lay check (hide/dim with a row selected) holds both ways.
- Crossing (brief item 1) is asserted, not assumed.

**Lesson arithmetic.** The witness record holds: 48 reached = 29 witnessed +
15 fast entries that proved nothing + 4 re-aimed, and 61 − 48 = 13 left to the
sweep. Both census pins match the run's enrollment printout (fast 627/627,
browser 772 declared / 739 enrollable).

**Guards observed failing.** I mutated `fast__a-hovered-grid-row…__8478297f`
(the hover fix reverted to `beforeEdge`) by hand. Its own check went `FAIL`,
and the revert restored the file exactly.

## Tests

**Pre-merge subset.** The tactical lesson records witness and browser runs but
**no full-suite `pytest` count**. That voids the benefit of the doubt, so I
ran the full suite on the merged tree. Since the merge was a fast-forward,
that tree is the handoff tip, so one run covers both pre- and post-merge.

**Full suite, review worktree, merged tree:**
`PYTHONIOENCODING=utf-8 C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`
- Result: **1 failed, 1685 passed, 1 skipped, 2 deselected in 333.57 s**.
  Recorded as default tier, inside the budget.
- `xdist` is not installed in this venv, so the run was single-process.
- No contention header lines were printed; this repo's conftest does not emit
  them.
- The one failure is `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`.
  It is the worktree red the repo's `CLAUDE.md` predicts: the main checkout's
  projection is not paired with this tree (`[real] the projection this tier
  reads was built from this tree`). It is not this diff.

**Other tiers:**
- `node apps/annotate/run_tests.cjs`: **265/265**.
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: **512/513, one
  tier skipped**. This is the same projection-freshness check; the node-fs
  `[real]` checks did not run. Not exercised: those `[real]` fast checks. They
  are also red on integration for an unrelated reason
  (`ISSUE_20261029_display_name_reached_the_projections_but_not_the_viewer_fixtures_so_the_real_tier_is_red_on_integration.md`).
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`, with
  `node_modules` junctioned into the worktree: **37/37 suites, 363 s**. The
  seam suite was 22/22. The diff adds a `postToPane`, so every annotate suite
  needed to stay green, and all did (model-in-scene 16/16).
- `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --changed-since integration`:
  **31/46 witnessed, 46/61 reached, 15 left to the sweep (budget), 29 m 03 s**.
  - All 15 non-witnesses are fast entries reported "the tier was red before the
    mutation, so nothing was proved". That is the projection freshness gate
    above, and the same blind spot the tactical lesson reports.
  - Every browser and annotate entry the budget reached was witnessed.
  - The exit is non-zero only because of those 15.

I did not check `data/` writes beyond confirming `git status` stayed clean.
The suite writes no tracked paths. No projection was rebuilt.

## Findings

### Should-fix (filed, not blocking)

1. **A wheel zoom now repaints the whole pane on every `wheel` event.**
   `topology_app.js` `wireZoom` → `zoomDagAt` → `VA.applyTopoZoom` →
   `root.topoRezoom` → `VA.renderTopoPane`, synchronously, per event. No tier
   times this, and the review could not without loading the box. Filed as
   `docs/issues/ISSUE_20261030_a_wheel_zoom_repaints_the_whole_topology_pane_on_every_wheel_event.md`.
   Fix shape: one repaint per animation frame. There is a new overlay entry
   for this pattern.
2. **Jeff's "upper line missing entirely" still reads that way on both
   screenshot rows.** The browser log shows one 3D leg each.
   `piston_rod_end_bore` and `piston_cover_mount_flange_seat` have no installed
   mesh. That absence is honest and the DoD is met, but nothing on screen tells
   Jeff why the leg is missing. Filed for strategy as
   `docs/issues/ISSUE_20261030_both_of_jeffs_leader_screenshot_rows_still_have_one_end_with_no_leg_into_the_scene.md`.

### Nits

- The handoff names the edges `pitch_plate…hole_position` and
  `cover_flange_to_end_stop_surface`. The checks use the real ids
  `pitch_plate_flange_to_link_hole` and `gas_spring_mount_flange_to_end_stop`,
  which is correct; the handoff used shorthand.
- Appending a "seen again" section to a `resolved` issue
  (`ISSUE_20261028_crop_lightbox_…`) is fine, because a new open twin was also
  filed.

### Design check

The changes are pixel geometry only, with no new copy except a README and
ANNOTATION_SURFACE line. Nothing to file.

## Fixed inline

Nothing.

## Note for the next reviewer

A fast witness entry can be hand-checked from a worktree without `--repo`.
The `[real]` tier then skips instead of failing, so the entry's own `FAIL`
line is visible. That is a faster way through the 15-entry blind spot than
building a scratch root.
