---
type: review
handoff: docs/sessions/active/HANDOFF_20261115_the_hub_is_one_part_in_the_grid_and_the_dag.md
reviewer: agent
date: 2026-11-15
verdict: APPROVE
blockers: 0
---

# Review: the_hub_is_one_part_in_the_grid_and_the_dag

Branch `handoff/the_hub_is_one_part_in_the_grid_and_the_dag` (`098789fd`,
`86d3d3ad`), merged into `review/…`. `integration` then moved (the scene-suite
handoff landed) and I merged it into the review branch with no conflicts.

## What I verified

- **The fix, on real data.** I wrote a headless vm probe that runs the page's
  own pipeline: `gatherParts` → `spineRight` → `blockLayout`, then `gridPlan`
  and `partSpans`. I ran it against the main checkout's
  `topologies.json`.
  - **Before** (`integration`): on v2, `hub` is 2 grid brackets and 2 DAG
    runs. On v1, `pitch_arm`, `blade_root` and `piston_head_lower_214699_002`
    are each 2 and 2.
  - **After:** no part is drawn twice on either model. This matches the
    lesson's table.
- **Guards.** I swapped `topology.js` back to `integration`'s version. Both
  new fast cases went red (576/578) and nothing else did. Both carry specs, the
  pin moved 699 → 701, and two anchors were re-pointed at the new
  `gatheredOrder` line.
- **Shots.** In `before_v2_3840_landing.png` the grid has two `214373-002`
  brackets and the DAG has a stray `214371…` field at the foot of ground. In
  `after_v2_3840_landing.png` there is one 3-row hub bracket and one block.
- **Bisect, re-derived.** I built v2 from `docs/topologies/` at each data
  commit, using today's builder with a scratch `--data-root`, and rendered it
  with the pre-fix viewer. The hub is one run at `48274f9f` (11-08) and at
  `d08e647b` (11-10 01:20). It is two runs from **`9b716956`** (11-10 11:19,
  the gas-spring mount re-seated) onward. See finding 1.

## Tests

- **Tactical record:**
  - default pytest: 1 failed (the worktree red), 1986 passed, 509 s;
  - fast node tiers 701/701 and 316/316;
  - browser `--only "parts as blocks"`;
  - witness `--only` 4/4.
  It is consistent with the diff. Benefit of the doubt given.
- **Risky subset** (`apps/viewer/` row): `node apps/viewer/run_tests.cjs
  --repo C:/workspace/tolstack` 701/701 with `[real]` armed, and
  `node apps/annotate/run_tests.cjs` 316/316. I ran the subset again after
  merging the moved `integration` (701/701).
- **Post-merge, review worktree:**
  - **Default pytest:** `PYTHONIOENCODING=utf-8
    C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -p
    no:cacheprovider` gave 1 failed, 1986 passed, 1 skipped, 2 deselected in
    468 s. Recorded in the ledger, inside budget.
    - The failure is `test_viewer_js_suite_is_green`, the documented worktree
      red. The `--repo` run above covers it.
    - The conftest prints no contention lines, and xdist is not installed.
  - **Browser tier:** `node scripts/run_viewer_browser_tests.mjs --repo
    C:/workspace/tolstack` (with a `node_modules` junction) gave 43/44 suites
    in about 1750 s. The runner recorded its own row, inside budget.
    - The red suite is "the model drawn alone and led", 21/23. Its two
      hover-lighting sub-checks fail.
    - **The same two fail on the `integration` baseline** (a `git archive`
      export, same projection), so they are not from this diff.
    - The sibling review already filed it as
      `docs/issues/ISSUE_20261115_the_model_drawn_alone_and_led_two_hover_lighting_checks_red_on_integration.md`,
      so I filed nothing new.
  - **Witness gate:** `node scripts/run_mutation_witness_tests.mjs --repo
    C:/workspace/tolstack --changed-since integration`, run after merging the
    moved `integration`, gave 4/4 witnessed and 0 left to the sweep, in 222 s.
    Recorded by hand, inside budget.
- The main checkout's `git status` was clean before and after. The scratch
  exports under `data/scratch/` were removed.

## Findings

**Should-fix (fixed inline, lesson only):**

1. **The lesson names the wrong splitting commit.** It says the split dates
   from `5694df28`/`a8003c79` (11-08), "which matches Jeff's 11-09 note". The
   rebuilt projections put it at `9b716956` (11-10), and
   `ISSUE_20261110_v2s_whole_walk_draws_the_hub_twice_…` had already recorded
   this, mechanism included. The lesson did not cite that issue. I added a
   correction blockquote to the lesson, and a dated addendum to the 11-10
   issue: its item 1 is now fixed, and item 2 (the crossing guard holds only
   by edge order) is still open.
2. **The lesson's crossings column is mislabelled.** It reads "layoutCrossings
   of the gathered walk", but the numbers are
   `layoutCrossings(blockLayout(gathered))`. What the page draws after
   `spineRight` is v2 82 → 70 and v1 316 → 338. I added a correction
   blockquote.

**Should-fix (unfixed, filed):**

3. **A block part is not "held back, whole".** `gatheredOrder` lays a block's
   pins and chords at once, and only its other edges wait. A block's edge
   whose two ends are both faces another part owns still splits the block.
   The fixture probe gives `{H: 2}` in the grid. The code comment and
   `docs/DAG_TOPOLOGY.md` say it of every part. Neither model has this shape
   today, so this is not a blocker. Fixing it changes behavior, so it is not
   mine to make. Filed as
   `docs/issues/ISSUE_20261115_a_block_parts_edge_between_two_other_parts_faces_still_splits_it.md`.

**Nits:** none.

## Notes

- The kill-witness issue the tactical agent filed is not a duplicate. Its
  predecessor is `resolved`.
- Overlay: one new entry. A viewer bisect that holds the projection fixed can
  only clear code, so bisect the data as well.
