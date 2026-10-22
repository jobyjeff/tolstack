---
type: review
handoff: docs/sessions/active/HANDOFF_20261021_a_face_pick_survives_an_orbit_and_names_its_end.md
reviewer: agent
date: 2026-10-22
verdict: APPROVE
blockers: 0
---

# Review: a_face_pick_survives_an_orbit_and_names_its_end

Branch `handoff/a_face_pick_survives_an_orbit_and_names_its_end`, 4 commits
(`7c16a94`..`b7d320d`). It was not yet contained in `integration` when this
review started. Merged into `review/<slug>` (`b8af515`), then the
`integration` tip `86ff740` merged on top (`9cc1676`).

## What was verified

**The four deliverables, read against the code.**

1. **A pick is a click.** In `scene.js` the `pointerdown` handler now only
   records the press. `pointerup` raycasts only when `AA.planPointerRelease`
   returns a point: strictly under `AA.PICK_CLICK_SLOP_PX = 4` px (Euclidean),
   and inside the canvas. A second pointer down cancels the pick. I confirmed
   that `vendor/OrbitControls.js` calls `setPointerCapture` on its first
   pointer down. Nothing in the app sets `controls.enabled = false`, so the
   release always reaches the canvas, and the stale-pointer-id worry (a
   release that lands outside) cannot arise. `planPickToggle` is unchanged.
   `autotestPick` calls `pick()` directly and is unaffected.
2. **The ends are chosen by interface name, with no default.**
   `AA.planBindChoices` and `buildEndChoice` replace the `from`/`to` dropdown.
   Bind is disabled while `selected` is null. With one end bound, the open end
   is preselected and the bound end is shown as a non-control row reading
   "already bound · face N". The stored word is still `AA.DIRECTIONS`, and a
   fast-tier check pins this through `AA.buildBoundEvent`.
   The choice is keyed to (edge, sha256, face). The leader only appears when
   `canWrite` is true, a face is picked, and the other end is already bound.
   Its centroid goes through `mesh.matrix`, which is the first-occurrence
   placement (`applyPlacement4`). The leader is cleared on entering sweep
   mode.
   The supersession issue is filed, with `audience: strategy` and the 0001
   case.
3. **The instruction states** match the handoff's five cases. All are pinned
   in `run_tests.cjs`, including a swap test showing that no state reads the
   stored word.
4. **The `describeSuggestions` clause** went into `suggestions.js` as a
   helper of about 10 lines. That is copy only and no plan logic, so it is
   within the handoff's carve-out, and a fast-tier check pins it.

**Fences.** Only one block was appended to
`scripts/run_viewer_browser_tests.mjs`, plus its registration line; no
existing block was touched. `feature_identity.py`, `DIRECTIONS`, `cmdSweep`,
`face_geometry.js` and the mutation runner are all untouched. The one
`app.js` edit outside the scoped functions besides `state.bindChoice` is
`suggestionLine()`, which item 4 needs (see the lesson correction below).
`scripts/guard_enumeration.mjs` changed only its pins, which the DoD forces.

**The tactical record.** It records a full pytest run (worktree:
`1 failed, 1519 passed, 1 skipped`; the failure is the documented worktree
viewer gate), plus every tier. It is consistent with the diff, so it gets the
benefit of the doubt. The DoD's `rebuild_projections.ps1` was not run, because
it refuses from a worktree. No projection input changed, so that does not
matter.

## The merge conflict, resolved by me

`scripts/guard_enumeration.mjs` `DECLARED_GUARDS` conflicted.

| Side | annotate | browser (declared / enrollable) |
|---|---|---|
| `integration` (after the kinematic handoff) | 206 | 565 / 533 |
| handoff (cut before it) | 212 | 576 / 544 |

The `fast` row did not conflict on the counts. Neither side's digests are
right for the merged tree, so I recomputed the pins from it with
`node scripts/guard_enumeration.mjs --json`:

- fast: 546
- annotate: 213
- browser: 579 declared, 547 enrollable

Each is the integration pin plus the handoff's +7 / +14 / +14, and the census
holds. I added this as a new overlay entry.

## Tests

**Pre-merge risky subset**, run on the merged review tree. Rows: `apps/annotate/`,
CSS, guards/witnesses, and the browser tier.

- `pytest -q tests/test_js_python_vocabulary.py tests/test_js_vocabulary_is_generated.py tests/test_feature_identity.py tests/test_part_mesh_aliases.py tests/test_app_type_scale.py tests/test_mutation_witnesses.py`:
  **129 passed**.
- `node apps/annotate/run_tests.cjs`: **213/213**, 0 SKIP lines.
- `node apps/annotate/run_browser_check.mjs`: **67/67**, which includes the
  sweep bead tooltip.
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`:
  **28/29**. The red was `annotate sweep rail` 10/15, all five failures
  `[real]` checks. Cause: the main checkout's projections are built from
  `master`, which does not have the kinematic handoff that is now on
  `integration`.
  Re-run with `--only annotate` against
  `data/scratch/kinematic_units`, the kinematic review's scratch root built
  from the kinematic tree (this diff changes no projection input): **7/7
  suites**. That covers sweep rail 15/15 and the new
  `annotate bind form` 15/15.
- Mutation witnesses, post-merge, `--only` for each of the 21 specs this
  branch adds, `--repo` set to the scratch root: **21/21 WITNESSED**
  (7 annotate, 14 browser). They ran on the merged tree concurrently with
  the full pytest run, so the new pointer checks held under load.

**Post-merge full suite**, in the review worktree, with `node_modules`
junctioned in: `1 failed, 1529 passed, 1 skipped` in 11:20. This repo's
conftest prints no `concurrent pytest processes` / `full-suite lock` header
lines. The run was concurrent with the witness runs.

- The one failure is `tests/test_viewer_js_suite.py`, the documented
  worktree-only gate.
- The tier it gates ran as
  `node apps/viewer/run_tests.cjs --repo data/scratch/kinematic_units`:
  **546/546**.
- Against the main checkout, that tier's freshness check correctly refuses
  (`446/447, 1 TIER SKIPPED`), because the projection is stale against this
  tree.
- The skip is `tests/test_fit_bound_features.py`, a known missing
  re-extraction.

The main checkout's `git status` was clean before and after, and
`data/inbox/feature-identity/` was not written.

## Findings

No blockers, and no should-fix.

**Nits and inline fixes**

- *Lesson (fixed inline, correction blockquote).* The lesson calls
  `state.bindChoice` "the one edit to `app.js` outside the functions the
  handoff scoped". `suggestionLine()` is a second one. It is needed and
  correct.
- *Design (filed, non-blocking).*
  `docs/issues/ISSUE_20261022_design_the_bind_forms_interface_choices_read_as_text_inputs.md`
  (`low`). The unchosen interface choices share the text inputs' border and
  alignment, so with both ends open they look like pre-filled fields.
- *Copy length (observation, no issue).* With the real piston-head names,
  instruction state 4 is 164–166 characters, just over the one-line budget.
  The names come from the topology. The line ellipsizes and carries a
  `title`, so the truncation rule is met.

**Lesson audit.** I re-derived these and they hold:

- 212 = 205 + 7
- 21 specs: 7 annotate + 14 browser
- pins 212 / 576 / 544 off 205 / 562 / 530
- 29 suites
- state 4 is "about 165" characters

## Overlay

Added one entry: *A `DECLARED_GUARDS` merge conflict has no right side.*
