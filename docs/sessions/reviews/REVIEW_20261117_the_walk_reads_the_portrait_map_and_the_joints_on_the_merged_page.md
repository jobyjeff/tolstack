---
type: review
handoff: docs/sessions/active/HANDOFF_20261117_the_walk_reads_the_portrait_map_and_the_joints_on_the_merged_page.md
reviewer: agent
date: 2026-11-17
verdict: APPROVE
blockers: 0
---

# Review — the_walk_reads_the_portrait_map_and_the_joints_on_the_merged_page

**APPROVE.** A docs-only walk (review page, lesson, 44 shots, one new issue,
one addendum). Every structural number on the page re-derives; the shots I
read say what their rows say. One should-fix (an issue filed at the wrong
priority) is handled by a split-out issue I filed; no code or deliverable
text was changed.

## What was reviewed

- Branch `handoff/…` = `037c1204` (walk) + `e50923a5` (lesson) on
  `integration` `b9475a88`. Not already merged (containment checked).
  `integration` did not move during the review.
- `git diff --name-status`: four docs `A`, one issue `M` (an appended
  addendum, earlier text intact), 44 PNGs `A`. No lesson or review overwritten.
  Nothing outside `docs/`.

## The seven mandatory checks

Not a stack: no element, path, check or band is added or changed, so checks
1–7 (citations, signs, LMC/MMC, RSS, nominal-in-band, quantised hardware,
traced ratio) have no subject here. Every mesh number the page repeats (Q1,
Q2) is labelled a measurement, never a value, and is copied from the prior
handoff's issue, whose review re-fitted them.

## Re-derived

| Claim | Where | Re-derived | Result |
|---|---|---|---|
| 16 joints, 28 constraints, 56 feature ends | page, "Every joint in v2" | grouped v2's 15 shared `mating_surface` nodes + 13 `gap` edges by part pair | match, row by row (kinds too) |
| 12 of 56 ends bound, per-row 2/3/0/0/0/0/1/0/0/0/1/1/1/1/2/0 | same table | `fold_with_models` over Jeff's real log (read-only), bound features under either model id | match on every row |
| 43 dimensions | regions section | 43 `structural` edges in v2 | match |
| `master` 52 commits behind | page head, lesson | `git rev-list --count master..integration` | 52 |
| real log 84 files (83 events + README) | page, lesson | `ls data/inbox/feature-identity` | 84 now — nothing written |
| 44 PNGs | lesson | `git ls-tree` | 44 |
| 28 rows: 9 / 16 / 3 | page, lesson | recounted K, open-row and region tables | 3+2+4 / 1+13+2 / 0+3+0 = 9/16/3 |
| solver ↔ model words | solver table | `LINKAGE_JOINT_INTERFACES` (revolute→revolute, cylindrical→cylindrical_slide, distance→spherical, axial_position→None); the named test exists | consistent |
| product-structure page exists | "Only you can decide" 3 | file present on integration | linked, not repeated, as the handoff asked |
| Q1/Q2 cited shots exist | needs-jeff table | `…authored_as_what_the_parts_show/09_…`, `10_…` | present |

## Shots read (vision)

- `k6_rotary_joint_selected_3840`: rotary symbol between hub and blade bonded
  assembly; tree row "rotary"; Preview chips `mating_surface · rotary · 3
  edge(s)`; note carries the rename history and a handoff slug. K6 and F2 hold.
- `r_13_hub_part_selected`: hub orange in 3D; the lit pin labels under
  215175-002 and over 214373-002 overprint ("tan¢tangential link mou…pilot
  bore attern"); Preview empty for a part. F1, rows 13 and 15 hold.
- `r_21_port_8000_serves_master`: 8000 draws the wide map, and the joints
  list reads hub ↔ blade "contact" with a seat ‖ on the map. K2/K6 "8000
  still …" and the "flange joint" explanation hold.

## Tests (docs-only diff → the two fast tiers, per the repo's table)

- `node apps/viewer/run_tests.cjs`: 599/599, node-fs `[real]` tier
  **skipped** (no projection in a worktree). Not re-armed: the merged code
  tree is byte-identical to `integration` `b9475a88` outside `docs/`, and the
  tactical record's armed run on that tree was 722/722 (scratch root
  `walk1117` with a `docs` junction).
- `node apps/annotate/run_tests.cjs`: 324/324.
- Prose corpus (my overlay edit and issues): `pytest -q
  tests/test_claims_registry.py tests/test_tolerance_stack.py
  tests/test_provenance.py` → 211 passed.
- Browser tier and witness gate not run: nothing outside `docs/` changed.
- Tactical record: default tier `1 failed, 2114 passed, 1 skipped` single
  process, the one failure the documented worktree red
  (`test_viewer_js_suite_is_green`). Consistent with a docs-only diff.

## Findings

**Should-fix (handled by filing, not inline).**

1. `docs/issues/ISSUE_20261117_small_findings_of_the_portrait_map_and_joints_walk.md`
   F2 — a handoff slug, rename history and a raw kind word in a joint's
   Preview break two named rules (prose budget "no history"; "no internal
   names"), which the canonical rule files `med`, `area: design`. It sat in a
   `low` bundle and would auto-defer. Filed
   `ISSUE_20261117_design_a_joints_preview_prints_a_handoff_name_and_a_raw_kind_word.md`
   (`med`, design), cross-linking the older deferred
   `ISSUE_20261110_topology_notes_still_say_what_would_close_it_and_open_with_history.md`,
   and appended a pointer addendum to the walk's issue.

**Nits.**

- M4 is "does it" while its own cell names a defect (F1). The jumper claim it
  answers does hold, and F1 is filed, so the verdict is defensible; noted only.
- The lesson's default-tier time (494 s) is single-process; the budget is
  stated at `-n 16`. Inside budget either way.
- The tactical scratch root `data/scratch/walk1117` (≈400 MB, no `.git`) is
  left in place; the lesson says it is safe to delete after review. Not
  deleted here (not mine to remove mid-batch; a later sweep can).

## Overlay

Added a Recurring-bugs entry: a walk's "small findings" bundle can hide a
named-rule design violation at `low`.
