---
type: review
handoff: docs/sessions/active/HANDOFF_20261109_a_folded_part_rides_its_own_body_in_the_sweep_and_the_bodies_list.md
reviewer: agent
date: 2026-11-09
verdict: APPROVE
blockers: 0
---

# Review: a folded part rides its own body in the sweep, and the Bodies list

**Branch reviewed:** `handoff/a_folded_part_rides_its_own_body_in_the_sweep_and_the_bodies_list`
(3 commits, `6e0058ca..d747fcab`). This was the first review of the handoff; the
review branch had no earlier attempt. Merged into `review/<slug>` as `c4dedf2d`.
`integration` was unchanged at `3d04f5cd` throughout, so the merge had no conflicts.

## Verdict

**APPROVE**, with one should-fix filed as a `high` issue.

The code-red fix is real. On the baseline, the new `[real]` browser assertion fails
and names `base/piston_cover_214958_002`, `pitch_plate/piston_head_lower_214699_002`
and `pitch_plate/piston_head_upper_214698_002`. On the merged tree it passes. I
reproduced both results myself. The Bodies list matches the DAG on v2, and the
shots show it.

## What I verified

- **Deliverable 1: the folded part rides its body.** I read `AA.sweepRidingParts`
  and the new rider loop in `anchorSweepBodies`.
  - Links stay excluded as hosts.
  - The skips for no mesh, listed parts and carried parts are kept.
  - The ground path now uses `AA.sweepRideChoice` instead of every occurrence. The
    handoff did not ask for this, but the lesson argues it, and the argument holds:
    v1's base would otherwise claim all 29 NAS1149V0332H washer occurrences that the
    plate shares.
  - A `refused` row has no placements, so it is never opened. It reads as "stick
    figure only" in the disclosure. That matches the rule's stated refusal, not a
    hidden regression.
  - The v1 change (plate hardware rides, plate and base ambiguous hardware refused)
    is argued in the lesson and is correct under the occurrence rule.
- **Deliverable 2: the Bodies list.** `AA.sweepModelTree` and the `order` sort.
  - `after_low.png` reads base 4 / tan link 3 / pitch plate 4 / pitch link 2 /
    blade 2, which is 15 parts in DAG order, and the bar says "15 of 15 parts
    placed".
  - `before_low.png` reads 3/2/2/2/1 in the run's order.
  - The lesson inventories every reader of the Bodies list (four on the model
    tree) and names the ones that deliberately stay on the run's subjects. That
    meets the handoff's "name it" requirement.
  - The bearing label is shortened through `AA.meshShortName` (one line), and its
    test keeps the full STEP name on the hover.
- **Deliverable 3: assert, don't log.** Both new sub-checks are in "the model drawn
  alone and led". The lesson says plainly that the drawn-count check is green on the
  baseline, and that it is the "posed with its own body" check that carries the
  red-on-baseline requirement.
- **Witnesses.**
  - 4 new specs plus 1 re-pointed.
  - `DECLARED_GUARDS` annotate 304→306, browser 864→866 / 831→833, each +2 with a
    spec.
  - The re-pointed `6067ff56` anchor still describes the same defect.
- **Lesson arithmetic.** The counts re-derive. One miscount ("the four this branch
  added or re-pointed" annotate specs; it is three) is corrected inline by a
  blockquote.
- **Not touched:** `apps/viewer/` and `storage/adapter.js`. That respects the fence.
  `tests/debug_folded_parts_ride.mjs` launches through `scripts/browser_runner.mjs`,
  and there is no stray `chromium.launch(`.
- The three source issues already carry `handoff:` and resolve at Complete.

## Tests

The tactical report records a full run: `pytest -q` gave 1 failed (the by-design
worktree `test_viewer_js_suite_is_green`), 1890 passed and 1 skipped. It also records
the viewer and annotate node suites green. I gave it the benefit of the doubt.

**Pre-merge risky subset**, run on the merged review branch before landing:

- `pytest -q tests/test_js_python_vocabulary.py tests/test_js_vocabulary_is_generated.py tests/test_feature_identity.py tests/test_part_mesh_aliases.py tests/test_mutation_witnesses.py tests/test_tolerance_stack.py tests/test_provenance.py tests/test_thermal_exception_list.py tests/test_claims_registry.py tests/test_topology.py tests/test_architecture_inventory.py`:
  **580 passed**.
- `node apps/annotate/run_tests.cjs`: **306/306**.
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack --only "the model drawn alone and led"`:
  **3/4**. Both new checks pass. The red sub-check is `every joint node the scene drew
  has its leader across the seam`. It is red on the baseline too, and the sibling
  `HANDOFF_20261109_the_two_red_browser_suites_on_trunk_go_green_against_a_fresh_projection`
  names it verbatim.
- **The same suite against baseline `app.js`/`sweep.js`:** 2/4, and the
  "posed with its own body" check is red, naming the cover and both heads.
- `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --changed-since integration`:
  **11/14 witnessed, 14/14 reached, exit 0, 7m31s.**
  - Every annotate entry is witnessed.
  - The 3 browser entries are NOT WITNESSED because "the tier was red before the
    mutation". That is the sibling's leader red, not this diff.
  - The baseline-swap run above stands in for `4707bf42`.

**Post-merge:** see the "Post-merge full suite" section at the end.

## Findings

### Should-fix (unfixed, filed)

1. **The Bodies-list wiring is one unpinned line.**
   - **Where:** `apps/annotate/app.js`, `cmdSweep`:
     `state.sweep.tree = AA.sweepModelTree(state.sweep.tree, sweepTopology());`.
   - **What I measured:** I replaced the line with a comment. Then:
     - the annotate fast tier stayed green (it cannot boot `app.js`);
     - "3D pane follows the selection" passed 32/32;
     - "the model drawn alone and led" stayed at its pre-existing 3/4.
   - **Why it matters:** deliverable 2 can be silently reverted. This is the fourth
     sighting of the overlay's "whole deliverable is one line from being silently
     reverted" class. The two pure helpers are pinned and witnessed, and the DoD
     asked only for the drawn-count assertion. I decided to approve rather than send
     it back: this is a code-red on the demo day, the behaviour is verified in the
     shots, and the gap is a missing guard, not a wrong behaviour.
   - **Filed:** `docs/issues/ISSUE_20261109_the_sweep_bodies_list_reading_the_models_bodies_is_one_unpinned_line_in_app_js.md`
     (`high`). It holds the fix shape: a derived `[real]` rail check plus a spec that
     deletes the line.

### Nits

- The lesson's "four" annotate specs are three. Corrected inline (see below).

## Fixed inline

- I appended a correction blockquote to the lesson (spec count, and a pointer to
  the new issue). I edited nothing else on the author's work.

## Overlay

- Added a "Fourth sighting" note to the "whole deliverable is one line from being
  silently reverted" entry in `docs/prompts/REVIEW_AGENT.md`, with the tell: a new
  `state.X = AA.helper(state.X, …)` and no browser check reading the rendered rail.

## Design

- The rail's body part rows truncate ("214699-002 gas spring piston h…"). This is
  pre-existing row chrome with the label on hover, so I filed nothing.

## Note for the next reviewer

- Once the sibling's leader fix lands on `integration`, re-run
  `--only "<guard>"` for `browser__real-with-the-p2-run-loaded-every-part-of-the-end-stop-m__4707bf42`
  and `…the-end-stop-model-still-dra__2b9afb2a`. They should then witness without
  help.

## Post-merge full suite (review worktree, merged tree `c4dedf2d`)

- `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`: **1 failed,
  1890 passed, 1 skipped, 2 deselected, 403 s** (recorded: inside budget).
  - The one failure is `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`.
    It is red in a worktree by design, because the projection is not there. That
    tier ran separately:
    `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` gave **671/671**,
    and `node apps/annotate/run_tests.cjs` gave **306/306**, with no SKIP lines.
  - The run printed no contention header lines. This repo's conftest does not emit
    them.
- `data/` in the main checkout had no files newer than the start of the run, so the
  suite did not pollute it.
- Not run: the full browser TRUTH tier. The two suites this diff touches ran, as
  listed above.
