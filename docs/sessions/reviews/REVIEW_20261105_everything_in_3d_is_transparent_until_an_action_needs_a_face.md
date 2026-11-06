---
type: review
handoff: docs/sessions/active/HANDOFF_20261105_everything_in_3d_is_transparent_until_an_action_needs_a_face.md
reviewer: agent
date: 2026-11-05
verdict: APPROVE
blockers: 0
---

# Review — everything_in_3d_is_transparent_until_an_action_needs_a_face

Branch `handoff/everything_in_3d_is_transparent_until_an_action_needs_a_face`
(7 commits, `7128c243`..`3aed44fd`), merged cleanly into
`review/…` (`1279f5ea`); not previously contained in `integration`. First run
of this handoff; every lesson/issue/shot arrives as `A`, nothing overwritten.

## What I verified

**Deliverable 1 — the regression.** The lesson names `4c0b7c62` (2026-11-03,
`every_study_opens_in_3d_showing_only_its_parts`); its diff does add
`planPartScope` returning `solid: targets`. The cause given (the sweep frame's
per-mesh "already ghost" cache never undoing the scope's solid, so load order
decided) matches the removed `mine.ghost` code. The fix replaces four writers
with one resolver, `app.js` `applyLooks` (`looksOwned` / `restLook` /
`actionInView`), over an idempotent `scene.setLook` keyed on
`AA.PART_LOOKS`; `PART_LOOK_OPACITY` is the one opacity table. Read every
former `setGhost` site the diff touched (`applyPartScope`,
`applySweepFrame`, `applyArmDisplay`, `disarmPick`, `focusDim`/`undoFocusDim`,
`cmdTransparency`, `cmdOpenPart`) and the paths it did not (`leaveSweep`
restores from its own snapshot; the panel's Isolate clears `partScope`, so
`looksOwned` stands aside as the lesson says).

**Deliverable 2 — a hidden body leaves nothing.** Cause stated in the lesson
(installation + machined detail extracted as two meshes in one place) checked
against `docs/topologies/part_mesh_aliases.json`, whose 215175-001 row says
exactly that. `scene._occurrenceHidden` hides any occurrence whose key is on
the same assembly path (`AA.assemblyPathsOverlap`, whole-segment prefix,
sibling `.1`/`.12` excluded — fast-tier check plants both). The sweep ghost
copies now carry keys and follow. The browser check re-implements the overlap
test independently rather than calling the app's helper — good.
Live: `base hidden: 3 keys, 7 drawn meshes taken down, 6 of them another
part's copy` — matches the lesson's "6".

**Deliverable 3 — an action isolates.** Armed pick, candidate hover, selected
suggestion and grid-row highlight each set an `{about, near}` action; precedence
in `actionInView` matches the lesson's table. The gesture table in
`docs/ANNOTATION_SURFACE.md` is updated once, with a "How a part looks" table
under it. Camera framing for a selected grid row is **not** done — see
should-fix 2.

**Deliverable 4 — housings.** Cited housings are ghost at rest; uncited ones
are faint (not hidden) under the default Unused word — see should-fix 1.

**DoD.** Five shots present (rest, base hidden, armed, after pick, grid row).
Browser check on the real kinematic study asserts every drawn mesh's opacity at
rest (`235 drawn meshes, 0 opaque` this run) and zero drawn occurrences on a
hidden body's paths, plus re-tick restores. Lesson carries commit, cause,
duplicate cause and the opacity table. Guard counts: annotate +2 (285→287),
browser +3 (823→826) with 5 renames — each re-derived from the diff, each with
a spec.

**Lesson arithmetic** re-derived: guard deltas, the 6 copies, the 4c0b7c62
attribution, the alias-table quote. All hold.

## Tests

Tactical record: full pytest, both fast tiers, both browser tiers and the
witness gate, in its worktree with `node_modules` junctioned — consistent with
the diff, so benefit of the doubt stands.

- **Pre-merge risky subset** (merged tree, review worktree):
  `node apps/annotate/run_tests.cjs` **287/287**;
  `pytest -q tests/test_js_python_vocabulary.py tests/test_js_vocabulary_is_generated.py tests/test_feature_identity.py tests/test_part_mesh_aliases.py`
  **128 passed**; `pytest -q tests/test_mutation_witnesses.py` **44 passed**.
- **Annotate browser check (mock)**, `node apps/annotate/run_browser_check.mjs`:
  **97/99**; the two reds are the anchors pair
  (`ISSUE_20261028_annotate_browser_check_mock_anchor_checks_are_red_on_integration.md`,
  deferred, red on integration). The reduced-motion check passed this run.
- **Viewer browser tier**, `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`
  (node_modules junctioned in): **41/41**, 1880 s wall, ~7 min of it queued
  on the browser slot behind two tactical sessions. Recorded OVER BUDGET by
  1m20s (merge tier); appended to
  `ISSUE_20261029_a_witness_gate_recorded_over_budget_counts_its_browser_slot_queue.md`.
- **Post-merge full suite**, review worktree,
  `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -rs --durations=15`:
  **1 failed, 1727 passed, 1 skipped, 2 deselected in 1211.78s**. The failure
  is the worktree-expected `tests/test_viewer_js_suite.py` (its `[real]` tier
  skipped); the skip is `test_fit_bound_features.py:424` (re-extraction not
  installed). This repo's conftest prints no contention header lines. Recorded
  OVER BUDGET by 10m13s; 774 s of it is one fixture's browser-slot wait
  (`test_browser_runner.py::test_a_runner_that_ends_leaves_no_chrome[signal-False]`
  setup). Appended to the tactical's
  `ISSUE_20261105_the_default_test_tier_ran_18_minutes_on_a_worktree.md`
  rather than filing a twin.
- **Data pollution:** files under `data/` changed during the run were
  `data/projections/viewer/kinematic/*`, whose provenance names another
  worktree (`the_rail_holds_still_and_takes_the_face_jeff_picked`), not this
  run. Nothing attributable to this suite.
- **Witness gate**, `node scripts/run_mutation_witness_tests.mjs --changed-since integration --repo C:/workspace/tolstack`:
  **31/31 witnessed, 31/45 reached in 29m32s; 14 left to the sweep (budget)**,
  which counts as a pass under the cap rule. Of the 14, the nine this handoff added or
  renamed (`bcc9633c`, `46bc0a52`, `ec12317f`, `595a7935`, `a6150ca8`,
  `f4e238b2` ×2, `a602fb0f`, `b2c04d05`) are recorded `--only` WITNESSED in
  the tactical lesson; not re-run here. Wall 2155 s with slot queue (recorded
  OVER BUDGET by 5m55s; appended to the slot-queue issue).

## Findings

### Should-fix (left unfixed — each has an issue)

1. **Uncited parts at rest are faint, not hidden** (`app.js` `restLook`,
   `commands.js` `planPartScope`). Deliverable 4 says hidden; the default
   Unused word (`dim`) draws them at 0.07. The lesson states it as a
   deliberate choice; I think it is the right one, but it departs from the
   handoff's words, so it goes to strategy:
   `docs/issues/ISSUE_20261105_parts_a_study_does_not_cite_are_drawn_faint_at_rest_where_the_handoff_said_hidden.md`
   (filed by this review).
2. **A selected grid row does not frame the camera** — deliverable 3 asked
   for it. Already filed by the tactical:
   `ISSUE_20261105_a_selected_grid_row_isolates_its_parts_but_the_camera_does_not_frame_them.md`.
3. **Hiding a detail hides its whole installation mesh** — the cost of the
   path rule, stated in the lesson; filed by the tactical:
   `ISSUE_20261105_hiding_a_detail_hides_its_whole_installation_mesh.md`.

### Nits

- `apps/annotate/app.js` `scopeToParts` comment still said "the named parts
  solid … the solid set framed". **Fixed inline** (comment only).
- Shot 3 (armed on the pitch-link end) is taken with the 3D pane ~400 px
  wide; the solid link is hard to tell from its ghost neighbours by eye. The
  browser check carries the claim; a future shot could widen the pane.
- `setOccurrencesVisible` now re-applies every part, each recomputing
  `_hiddenPaths()` — quadratic in parts, harmless at today's ~100.

## Fixed inline / committed by the review

- `scopeToParts` comment (above).
- Issue filed (should-fix 1); two budget-issue addenda.
- Overlay: two new recurring-bug entries — a second writer beside a
  "what I last applied" cache; a hide path that bypasses
  `scene._occurrenceHidden`.

## Verdict

**APPROVE.** The regression is found and attributed, the fix is one resolver
rather than a fifth writer, the duplicate copy is explained by data and fixed
structurally, and the real browser check observes the scene itself. The two
departures from the handoff's letter are stated, reasoned and filed.
