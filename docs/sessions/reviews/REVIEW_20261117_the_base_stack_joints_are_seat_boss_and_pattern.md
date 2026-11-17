---
type: review
handoff: docs/sessions/active/HANDOFF_20261117_the_base_stack_joints_are_seat_boss_and_pattern.md
reviewer: agent
date: 2026-11-17
verdict: APPROVE (round 2)
blockers: 0
---

# Review — the_base_stack_joints_are_seat_boss_and_pattern (round 1)

**REQUEST CHANGES, one blocker.** The model change is right, and its mesh
evidence reproduces exactly. But the merged tree turns a `[real]` browser check
red **deterministically**, in a suite the branch never ran. Integration was
green on that suite at the last review, and its code has not changed since.
Not merged into `integration`. The review branch holds a fast-forward of the
handoff branch plus this report, one issue and an overlay entry.

## Which run, and the merge

- `docs/sessions/active/` holds this handoff. The branch is 9 commits, all `A`/`M` with
  no lesson or review overwritten. The lesson is `A`.
- The handoff's merge base is the current `integration` tip (`3472d6db`), so
  `git merge` was a fast-forward. The merged tree is the handoff tree,
  `b5588d69`, tree `0fc451d6`.

## Blocker

**B1 — `[real] with the P2 run loaded and no study, every joint node the scene
drew has its leader across the seam` is red 3/3 on the merge**
(suite `the model drawn alone and led`, `scripts/run_viewer_browser_tests.mjs`
around line 16110).

- **What happens.** With 40 edges, v2's Classic DAG is taller than the tier's
  1700×1500 window. Two joint nodes the scene draws,
  `pitch_link_lower_sphere_centre` and `pitch_link_upper_sphere_centre`, have
  their DAG dots at y 1731 and 1679. The pane is `[701,0,1139,1500]`. The check's
  recovery step scrolls `document.scrollingElement` by `y − 750`, but the page
  does not scroll (`scroll [0,0]`), so neither dot reaches the screen and
  `scrolled to` is `false` for both.
- **Evidence it is this diff.** The whole tier on the merge, then two `--only`
  runs: the same sub-check, the same two dots and the same coordinates each
  time. `REVIEW_20261117_a_joint_says_what_kind_it_is.md` ran the whole tier
  on `integration` at `df13a375`, and this suite was not among its two reds.
  `git diff df13a375 3472d6db` touches only `docs/`.
- **Why it is the same cause as a fix the branch already made.** The lesson's
  "The browser check that assumed a short model" found exactly this for the
  map suite's Fit check, and fixed that one site. The branch ran the browser
  tier `--only` for the map and pattern suites. That follows `CLAUDE.md`'s table
  for suites it *changed*, but a data change that makes the model taller than
  the window reaches every v2 suite.
- **Fix: the author's call, not an inline one.** Either the check has to reach a
  dot below the pane the way the page actually scrolls (the pane's own scroll
  container, or a taller window for this suite), or the page should keep v2's
  joint dots on screen at rest. Deciding which one is right is designed
  behaviour. Then run the suite `--only` twice, and the whole tier once
  (`node scripts/run_viewer_browser_tests.mjs --repo <root>`), and record both.

## What was verified (all passed unless stated)

**Mesh evidence, re-fitted independently** with `feature_geometry.fit_face_set`
on the three cited meshes (main checkout `data/meshes/`), face ids exactly as
the notes cite them:

| constraint | lesson / note | re-fit |
| --- | --- | --- |
| gas-spring mount boss, faces 73/622/81/624 | Ø220.370 | Ø220.370, axis +Z |
| tan link mount upper bore, 687/909 | Ø220.421 | Ø220.421 |
| gas-spring mount cover boss, 1061/1063/1074/1075 | Ø58.458 | Ø58.458 |
| piston cover pilot bore, 92/93 | Ø58.572 | Ø58.572 |
| gas-spring mount flange ring, 303–312 + 800–809 | 10 × Ø5.000 on Ø240.000 | 10 × Ø5.000, circle Ø240.000 |
| tan link mount ring (20 faces) | 10 × Ø5.000 on Ø240.000 | 10 × Ø5.000, circle Ø240.000 |
| angles of both rings | 29.2 … 330.8 (10) | identical, both rings |
| piston cover ring, 43–52 + 127–136 | 5 × Ø5.000 on Ø81.572 | 5 × Ø5.000, circle Ø81.572 |
| gas-spring mount top ring (12 faces) | 5 × Ø4.750 on Ø81.572 | 5 × Ø4.750, circle Ø81.572 |
| angles of both 5-rings | 36.7, 107.6, 180.0, 252.4, 323.3 | identical |
| seats 62/83 and 3/126 | z 134.000 / 202.193 | z 134.000 / 202.193, opposed normals |

Which part carries the boss was read off the meshes, as the handoff asked. No
edge gained a dimension: `test_topology.py` asserts `dimension is None` and a
"Value to come"/"What would close it" note on every v2 edge. The new
structural notes cite the same drawings as their part's existing edges
(215175-002, 213668-002, 214958-002).

**The mandatory stack checks.** This is a topology change with no stack
element, band or value, so checks 1–7 have nothing to bind to: no tolerance was
written, no sign, LMC/MMC, RSS or nominal changed, and no cotter hardware was
added. **Ratio:** 0 element instances changed. v2 carries no values. Check 1's
spirit, *nothing invented*, is the mesh table above: every number in a note is
a measurement that reproduces, and each note says it is not a value.

**Counts.** These were recounted from the JSON: nodes 25 → 31 (+2 bosses, +2
bores, +2 patterns), edges 30 → 40 (+8 structural, +2 gap), features 42 = 31 +
11 shared, dimensions 30, interfaces 21 (11 + 10), cycles 40 − 31 + 1 = 10, and
the per-part pairs (7,6) / (8,7) / (4,3). They match the lesson, the DAG doc and
the pins. The README and `views/topology.js` digits are paired by the `[real]`
fast tier, which is green.

**The map change** (`apps/viewer/map.js`): height growth is capped at the cell,
then width grows, bounded by the cell. The loop always terminates. The new
strip wrap takes the name whole or not at all. **The new guard was observed
failing:** with the declared mutation applied by hand to an export, the fast
tier went red on exactly that test (597/598). The browser-check edit swaps a
first-paint-width comparison for "Fit fits the pane, on the drawn shapes". Its
declared mutation (Fit dead) is still caught by `railsRefit < railsGrown*0.8`.
`map_vpa_end_stop_v2.json` is untouched, as fenced.

**Feature-identity log:** 84 files before and after my runs (the lesson also
says 84). Main checkout `git status` is clean, on `master`.

## Test record

The scratch root is `data/scratch/rv_bsj_1117`, built with the seven builders
from the review worktree using `--data-root`. Every stamp is
`b5588d6952dc`, clean.

| command | result |
| --- | --- |
| risky subset, before the landing: `pytest -q` on `test_topology`, `test_model_view`, `test_topology_projection`, `test_topology_map`, `test_viewer_projection`, `test_mutation_witnesses`, `test_architecture_inventory`, `test_contact_suggestions`, `test_claims_registry`, `test_tolerance_stack`, `test_provenance`, `test_feature_geometry`, `test_part_mesh_aliases` | 652 passed, 294 s |
| full `pytest -q`, review worktree, after the merge | 1 failed, 2064 passed, 1 skipped, 4 deselected, 462 s, recorded `default` (inside budget). The failure is the documented worktree red `test_viewer_js_suite_is_green`; its tier ran armed on the next row. This repo's conftest prints no contention header lines. |
| `node apps/viewer/run_tests.cjs --repo <root>` | **721/721**, paired with all four projections at `b5588d6952dc` |
| `node apps/annotate/run_tests.cjs` | 324/324, no SKIP lines |
| `node scripts/run_viewer_browser_tests.mjs --repo <root>` (whole tier) | **46/48**, 2217 s (self-recorded `merge` row). Red: **the model drawn alone and led (B1)**, and *a suggestion names its face …*, which is the filed flake `ISSUE_20261117_the_suggestion_names_its_face_suite_flakes_with_the_mount_line_never_appearing.md` (same `face NaN` signature) |
| `… --only "the model drawn alone and led"` ×2 | red, red: the same sub-check and the same dots |
| `node scripts/run_mutation_witness_tests.mjs --repo <root> --changed-since master --budget-min 10` | **21/21 witnessed**, 21/54 reached, 9 m 45 s, 33 left to the sweep (budget), exit 0. The handoff's new fast entry `__4939ea28` was reached and witnessed. Its browser entry (the Fit check) was left to the budget. The author's lesson records it witnessed `--only`. |

## Nits (none blocking)

- The lesson says "a layout that placed its names before is unchanged". That
  holds for a box that placed its name at the first size. A box that used to
  grow taller can now place earlier through the strip, or widen instead of
  outgrowing its cell, which is the point of the change. No live layout moved
  (the map suite reports zero defect notes).
- The tactical scratch root `data/scratch/bsj` (1.7 GB, nested `.git`) cannot
  be deleted by an agent. Filed as
  `ISSUE_20261117_a_scratch_root_with_its_own_git_init_cannot_be_deleted_by_any_agent.md`
  (`needs: jeff`). The overlay's scratch-root recipe now warns against
  `git init`.

## For round 2

- Re-run the whole browser tier on the merge. Expect only the filed
  suggestion flake to remain. Then run the witness gate. Rebuild the scratch
  root first, because the tree will have moved.
- Overlay updated: a new Recurring-bugs entry (a model grown past the window
  reddens untouched suites), and the `git init` warning beside the scratch-root
  recipe.

## Re-run 2026-11-17 (round 2) — APPROVE

Round 1 was REQUEST CHANGES with one blocker (B1). B1 is closed.

**The fix** (`f7b7c453`, plus the lesson at `5c38ff49`): the leader check's
recovery step now scrolls the DAG's own scroller, `#topopane .tv__hscroll`,
putting the dot mid-pane, and resets that scroller afterwards. The document
is no longer scrolled. That is the one site B1 named and nothing else, and
the check can still fail: a dot left unled after scrolling keeps
`scrolledTo[id]` false. The lesson's round-2 account matches the code and my
runs. Its "the page was right" also agrees with the check's own comment (a dot
below the window has nothing to lead from). I asked for that either-or, and
the author settled it.

**Merge.** `integration` is still `3472d6db`. The handoff tip was merged into
`review/…` (`65339f5d`). The scratch root is the author's `data/scratch/bsj2`
(no `.git`, feature-identity inbox at 84). Every projection was rebuilt from the
review worktree with `--data-root`, and every stamp is `65339f5d9350`.

| command | result |
| --- | --- |
| `node apps/viewer/run_tests.cjs --repo <bsj2>` | **721/721**, paired at `65339f5d9350` |
| `node apps/annotate/run_tests.cjs` | 324/324 |
| `pytest -q tests/test_mutation_witnesses.py tests/test_app_type_scale.py tests/test_architecture_inventory.py` | 67 passed |
| full `pytest -q`, review worktree | 1 failed, 2064 passed, 1 skipped, 4 deselected, 445 s, recorded `default` (inside budget). The failure is the documented worktree red; its tier ran armed on the viewer row. |
| `--only "the model drawn alone and led"` | **23/23**; `scrolled to` both `true` |
| whole browser tier | **46/48**, 1906 s (self-recorded `merge` row, over by 106 s, appended to `ISSUE_20261106_the_viewer_browser_tier_ran_51_minutes_against_the_merge_budget.md`). Red: `topology file://` 134/135 and `annotate rail holds still` 14/17. Both passed `--only` straight after on the same root (135/135 + 44/44, 17/17), passed in round 1's whole tier, and passed in the author's whole tier (48/48). The round-2 diff touches neither. Filed as `ISSUE_20261117_topology_file_reload_restore_of_column_width_flakes_in_the_whole_browser_tier.md` and `ISSUE_20261117_the_annotate_rail_holds_still_take_checks_flake_in_the_whole_browser_tier.md`. Round 1's suggestion-suite flake passed this time. |
| witness gate `--changed-since master --budget-min 10` | **20/20 witnessed**, 20/55 reached, 9 m 44 s, 35 left to the sweep (budget), exit 0. The new fast entry `__4939ea28` was witnessed again. |
| witness `--only __efee81d8 --only __fdb6eaa8` (the Fit check, left to the budget; the leader check) | **2/2 witnessed**, 9 m 49 s |

Note for the witness gate: `__fdb6eaa8` (the leader check) was **not
selected** by `--changed-since`, although its own scroll step changed. The
hunk sits in the check's set-up, above the `push`, and is not near its anchor.
By design, what a hunk leaves unselected is the sweep's, so this is not a
finding; running it `--only` covered it.

**Verdict: APPROVE**, 0 blockers. Round 1's nit and its two filed issues stand
as written. Landed into `integration` by fast-forward.
