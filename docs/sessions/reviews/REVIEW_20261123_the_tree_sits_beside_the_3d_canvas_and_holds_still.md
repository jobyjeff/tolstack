---
type: review
handoff: docs/sessions/active/HANDOFF_20261122_the_tree_sits_beside_the_3d_canvas_and_holds_still.md
reviewer: agent
date: 2026-11-23
verdict: APPROVE
blockers: 0
---

# Review: the_tree_sits_beside_the_3d_canvas_and_holds_still

Branch `handoff/the_tree_sits_beside_the_3d_canvas_and_holds_still` at `2ae97443`,
cut from `integration` `fdeebeba`. It had not been merged before this review
(`merge-base --is-ancestor` false), and `integration` did not move during it, so the
merge into `review/…` was a fast-forward. Merged tree `4d2fe745`. Every run below
measured that tree.

## What was verified

**The deliverables, read against the code**

1. **Tree only with the pane.** `renderNavTree` draws the structure only when
   `handlers.structure`, which is `flyout.open`. With the pane closed the column is the
   picker and the studies (shot `a1`; the browser check counts 0 part rows and 1 studies
   section). The pane's `close` event is the only close path, and it saves
   `structScroll`. The first open starts at the top, and later opens restore the saved scroll.
2. **Holds still.** `takeNavAnchor` / `restoreNavAnchor` wrap `renderNav` and
   `renderSceneSlot`. The anchor is the row under the pointer, else the selected row on
   screen, else the top row. `revealLitRows` scrolls only an off-screen selected row, by
   the least that shows it. The `.focus()` now passes `preventScroll`. `VA.navPlan`
   is now the only place the tree's shape is decided: `navRowPath` and `navRevealPaths`
   are deleted, and the hover's `--holds` marks read the drawn plan.
3. **Ease.** A rAF tween over `--tree-ease`, set to 140 ms, skipped under
   `prefers-reduced-motion`. It is filmed (`f1`/`f2` and their JSON) and asserted by
   no test, which matches what the DoD asked for.
4. **Levels / 5. marks.** The tokens are in `style.css` `:root`. The shots `b2`/`b3`
   (Jeff's ground / 213668-002 case) show bands, semibold parts with "n of m", plain
   feature rows and guide lines. Features have one three-state ring.
6. **Lit face vs row.** `endFeatureKey` now reads `model.dimensions[].from/to`, the
   member, matching `model_view.end_feature` and the annotator. Ball-joint ends and
   features holding the same face carry "shares a face". I checked the shared-face case
   the lesson reports: events `0112` and `0114` both hold MS14101-3 `34f032f0…` faces
   0, 1, 20 and 21. It is filed `needs: jeff` with an ask that passes both halves of
   the task test.
7. **One grouping, each thing once.** By part / By joint is page state and is not stored.
   `listed` keeps a feature to one row, and "Across bodies" lists a no-body assembly once.

**DoD**
- The browser check "the tree holds still" is in the existing viewer suite. It measures
  row y for open, close, tree select, a pane write (re-posted identity message), a pane
  tree update, a scene pick and the pane closed and reopened: **4/4** in the whole tier.
- **Jeff's binding log is unchanged**: 116 files; listing sha256 `efe47ec6…` and contents
  `39e9abba…`, the same values the lesson recorded before and after.
- The lesson's numbers check out: v1 has 16 features at no joint and v2 none
  (recounted from the projection); the four spherical interfaces per model match; the
  fast tier is 631/631; the two browser reds have the counts the lesson gives.

## Mandatory checks (stack checklist)

No stack, topology, hardware or spec-library data changed (`git diff fdeebeba --
docs/tolerance_stacks docs/topologies tolerance_stack` is empty). So checks 1–6 have
nothing to audit, and each one passes vacuously: there are no new values, signs,
LMC/MMC mappings, RSS rows, nominals or cotter hardware.
Check 7, computed with `tests/debug_report_tolerance_stacks.py --ratio`:
**5 traced / 12 inferred / 9 untraced, of 26 element instances**. That is unchanged.
Deliverable 6 writes no event and changes no value: it fixes a display key only.

## Tests

| tier | command / where | result |
|---|---|---|
| default | `C:/workspace/tolstack/venv-win/Scripts/python.exe -X utf8 -m pytest -q`, review worktree, post-merge | **1 failed, 2619 passed, 3 skipped, 4 deselected, 514 s**, recorded inside budget. The one red is `test_viewer_js_suite_is_green`, because the worktree has no `data/projections`. That red is by design, and the same tier is green through `--repo` (next row). This repo's conftest prints no contention header lines. |
| viewer fast + `[real]` | `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack/data/scratch/tree1123` | **631/631**, "projection paired with this tree" (the tactical's root, built at `d64e3e00`; no projection input changed after that) |
| annotate fast | `node apps/annotate/run_tests.cjs` | **335/335**, 0 SKIP |
| browser, whole tier | `node scripts/run_viewer_browser_tests.mjs --repo …/tree1123` | **48/50 suites, 984 checks, 2206 s** (over the 1800 s budget; ledger row self-recorded; measurement appended to `ISSUE_20261106_the_viewer_browser_tier_ran_51_minutes_against_the_merge_budget.md`). Reds: *a pattern is bound…* 8/11 and *a suggestion names its face* 3/5. These are the same checks and counts the tactical agent baselined red on an `integration` export, already filed as `ISSUE_20261122_two_annotate_browser_suites_assume_live_features_are_still_unbound.md`. |
| witness gate | `node scripts/run_mutation_witness_tests.mjs --repo …/tree1123 --changed-since integration --budget-min 10` | **27/66 reached, 27/27 witnessed, 11m06s, 39 left to the sweep**, exit 0 (pass) |
| the handoff's own DoD witnesses (left to the sweep above) | same runner, `--only` 27d459dc, bcd453e9, 51ce40b7, 222294df | **4/4 WITNESSED**, 5m19s |
| doc corpus, after my edits | `pytest -q tests/test_tolerance_stack.py tests/test_provenance.py tests/test_thermal_exception_list.py tests/test_claims_registry.py tests/test_app_type_scale.py` | 230 passed |

The tactical report records its full-suite run: command, checkout and counts. Those
counts are consistent with the diff, so I gave it the benefit of the doubt. Because
the merge was a fast-forward, the pre-merge risky subset (the `apps/viewer/` row, the
CSS row and the guard row of the overlay's mapping) is covered by the runs above on
the identical tree. Not exercised: the main-checkout pytest. The diff touches no path
resolution and no `data/` reader.

## Findings

**Blockers:** none.

**Fixed inline**, in a doc only, all three prongs:
- `docs/DESIGN_TYPE_AND_COLOUR.md`: the new "structure tree's levels" row was added
  after a blank line that splits the "Where the numbers are" table, so it rendered as
  loose text. That blank line was already there and had also orphaned the two "scene
  tree" rows below it. I removed it, which joins all three rows to the table. I also
  corrected the new row's "keeps it true" cell, which claimed the suite pins "the ease's
  rows". The suite measures before and after a fold, and the ease itself is filmed, not
  asserted.

**Nits** (no issue needed):
- The pointer anchor and the selected-row anchor are not separated by any witness.
  The open/close mutation replaces the restore with `scrollTop = 0`, which also catches
  an anchor that is wrong in any way. A top-row anchor would pass the same checks today.
  That is harmless while a selection opens and closes nothing above the pointer.
- Closing a row while the column is scrolled to its end must move the rows above it,
  because the browser clamps `scrollTop`. Nothing short of a spacer avoids that. It is
  not covered, and probably acceptable.
- The ease tweens an element that a mid-ease rebuild can replace. I added this to the
  tactical's own `ISSUE_20261123_a_tree_rebuild_between_a_press_and_its_release_drops_the_click.md`,
  which has the same root cause and fix shape.

**Design**: I read shots `a1`, `b2`, `c2`, `d1` and `f2`. I found nothing to file:
the levels read as distinct, the copy is short, and the one accent is the selection.

## Checklist upkeep

I added a Recurring bugs entry to `docs/prompts/REVIEW_AGENT.md`. It says the tree
exists only with the pane open, lists interfaces only under By joint, and opens bodies
by their twisty, so a check that reads a row must arrange all three. It also names which
suite and witnesses keep the tree still.

## Found on arrival

The review worktree and the tactical worktree were both clean.
