---
type: review
handoff: docs/sessions/active/HANDOFF_20261112_a_part_may_contain_parts.md
reviewer: agent
date: 2026-11-14
verdict: APPROVE
blockers: 0
---

# Review — a_part_may_contain_parts

**Verdict: APPROVE.** No blockers, nothing fixed inline. One design issue and
two overlay entries filed.

## What was reviewed

- Branch `handoff/a_part_may_contain_parts` @ `f7bab8b9` (9 commits). It
  contained `integration` @ `e83a01e9`, so the merge into
  `review/a_part_may_contain_parts` was a fast-forward with no conflicts.
  `integration` had not been landed on before this review.
- This is the first run of this handoff. There were no prior review commits on
  this branch, and the lesson arrives as `A`, not `M`.
- Diff: schema (`Part.parent`, plus validation in `Topology`), `children_of` /
  `subtree` / `tree_order`, `assembly_rollups`, the model view's
  `parent` / `children` / `depth` / `all_parts` / `counts.assemblies`, the
  topology projection's `result.assemblies`, the viewer (model, tree, DAG
  `topPartOf`, grid fold, toolbar, stored fold set), the v2 pilot, the
  `DAG_TOPOLOGY.md` "Bodies" bullet, 7 new fast witness specs and 5
  re-anchored ones, 3 issues and the lesson.

## Deliverables against the handoff

1. **Schema.** Done. A missing parent, a parent in another body, a cycle (with
   and without bodies) and a self-parent are each refused with the part named.
   Each refusal is pinned by a test that matches its message. Depth is
   unlimited (`_depth` and the JS walks all loop on `parent`).
2. **Model view.** Done. `parts` holds a body's top-level parts and
   `all_parts` holds the tree order. The order is pinned on a reordered,
   three-deep copy (`test_the_tree_order_is_an_assembly_then_its_children_depth_first`),
   so the order is the tree's, not the authored list's. `model.js` reads the
   same fields and falls back to leaves on an older projection.
3. **Tree.** Done. It renders recursively and indented, with a twisty on an
   assembly (`after_tree_pitch_link_open.png`: `213862-002 pitch link
   1 part · 2 features`, with the bearing nested). Selecting an assembly puts
   its subtree and the joints inside it in the assembly's own tier.
4. **Grid.** Done. Each assembly is one folded row (`VA.gridPlan`'s
   `collapsed`). Only the part column is indented
   (`GRID_BRACE.nest`). The toolbar has Collapse assemblies and Expand all.
   The fold set is stored per topology. **The roll-up goes through the one
   `fold()`.** `assembly_rollups` folds the chain contributions whose
   `edge.part` is in the subtree, and the browser prints
   `result.assemblies[part]` without adding anything up. Checked by hand on the
   demo: −4.76 − 4.06 − 1.5748 = **−10.3948**; min −4.76 − 4.16 − 1.5748 =
   **−10.4948**; max −4.63 − 3.96 − 1.4478 = **−10.0378**; half-width 0.2285.
   These match the folded row in `demo_grid_collapsed.png` and the pinned test.
   The totals (worst case 3.1662, 2.3296 … 4.3098, ± 0.9901; RSS 3.3197) are
   identical in the folded and expanded shots.
5. **DAG.** Unchanged on the real models. v2's bearings carry no nodes and no
   edges, so `VA.topPartOf` changes nothing there. That agrees with the
   lesson's byte-identical before and after shots (`e0feb3ca…`). The
   assembly-as-block reading is exercised only by fixtures, under a witnessed
   guard (`b13a9401`).
6. **Pilot.** Done as scoped. v2's pitch link holds its bearing, and
   212956-005 holds its two bearings. 215177 and 215175 stay single parts
   (pinned). v1 is untouched (`git diff integration -- docs/topologies/`
   touches v2 only).

**DoD on numbers.** v2 has no study and no values, so "the same total in
both" cannot be shown on v2. The lesson says so plainly and shows it on a
scratch copy of v1 instead. Those numbers are pinned in
`test_an_assemblys_roll_up_is_the_fold_of_its_subtrees_terms`, and the
committed v1 is unchanged. I accept that as the honest answer.

## Mandatory provenance checks (tolstack overlay)

This is not a tolerance stack. No element value, band, `source_ref` or
`confidence` changed, and the only data edit is `parent` fields plus two
`note`s in v2.
- **Check 1 (traced):** not applicable. No value was added.
- **Check 2 (signs):** `assembly_rollups` reuses each contribution's own
  `term`, so the sign is whatever the chain crossed. No new sign site, and no
  second combiner: it calls `stack.fold`.
- **Check 3 (LMC/MMC):** `fold()` was not touched.
- **Check 4 (RSS):** the folded row prints no RSS, and the totals' RSS is
  unchanged. Nothing new claims RSS.
- **Checks 5 and 6:** not applicable.
- **Check 7 (ratio):** unchanged, because no element changed.

## Lesson audit

I re-derived the lesson's counts and arithmetic. All of these hold:
- 7 new fast specs and 5 re-anchored (2 browser, 3 fast), per the diff's status
  letters.
- 0.9901 = (4.3098 − 2.3296) / 2.
- 0.2285 = (−10.0378 + 10.4948) / 2.
- The roll-up triple matches.

The one nit: the lesson calls the folded row's first column "centre", but it
prints the **nominal**. 3.1662 is not the midpoint 3.3197.

## Tests

**Pre-merge risky subset**, on the review branch, which is identical to the
handoff tip:
- `pytest -q tests/test_topology.py tests/test_model_view.py
  tests/test_architecture_inventory.py tests/test_tolerance_stack.py
  tests/test_topology_projection.py tests/test_viewer_projection.py
  tests/test_js_python_vocabulary.py tests/test_viewer_readme_doc_facts.py
  tests/test_viewer_deep_link_contract.py tests/test_mutation_witnesses.py
  tests/test_claims_registry.py tests/test_provenance.py
  tests/test_thermal_exception_list.py tests/test_app_type_scale.py
  tests/test_projection_provenance.py tests/test_js_vocabulary_is_generated.py`
  → **704 passed** (177 s).

**The tactical record** is complete: pytest 1986 passed + the worktree red,
the two fast tiers, and `--only` for every spec it added or re-anchored. It
openly left the `[real]` tiers to the review, because the main checkout's
projection predates the change. Benefit of the doubt given.

**Post-merge, merged tree `f7bab8b9`.** Every projection was built from this
worktree's builders into the scratch root
`C:\workspace\tolstack\data\scratch\apm_review` (`--data-root`), so the shared
projections were not touched. The freshness line pairs all four with
`f7bab8b908da`. Each tier ran against that root:
- `node apps/viewer/run_tests.cjs --repo <scratch>`: **699/699**, with
  `[real]` armed.
- `node apps/annotate/run_tests.cjs`: **316/316**, with no SKIP lines.
- `pytest -q` (review worktree): **1 failed, 1986 passed, 1 skipped,
  2 deselected, 475 s**. Recorded as default tier, inside budget. The one
  failure is `tests/test_viewer_js_suite.py`, the documented worktree red. The
  `--repo` run above is that tier, and it is green. This repo's conftest
  prints no `concurrent pytest processes` / `full-suite lock` header lines.
- `node scripts/run_viewer_browser_tests.mjs --repo <scratch>`: **44/44**, 1075
  checks, 1612 s. The runner recorded its own merge row.
- `node scripts/run_mutation_witness_tests.mjs --repo <scratch>
  --changed-since e83a01e9`: **38/38 witnessed**, 38 of 59 selected entries
  reached in 27m36s. The 30-minute budget left the other 21, all browser
  entries, to the sweep, which counts as a pass. The 7 new fast specs and the
  re-anchored ones were among those reached. Exit 0, 1693 s, recorded by hand.
  A leftover `tmp/mutation-witness-25200` shadow tree in the worktree was
  removed.

The suite left `data/` clean: `git status` is empty in both checkouts, and
every build went to the scratch root.

## Findings

**Blockers:** none.

**Should-fix:** none.

**Design (filed, non-blocking):**
- `ISSUE_20261114_design_a_folded_assembly_row_prints_a_signed_sum_in_the_dimension_columns.md`
  (`priority: low`). On a folded row, NOMINAL, MIN and MAX hold the
  assembly's signed share (−10.3948). On every other row those columns hold
  the element's own unsigned dimension, with the sign in SENSITIVITY and the
  signed range in CONTRIBUTION. The folded row copies the totals row's layout
  instead. The numbers are right; the column means two things.

**Nits:**
- `assembly_rollups` and `VA.gridPlan` select a subtree by `edge.part`. A gap
  edge (part null) between two parts of the *same* assembly would therefore
  stay as its own row and split the folded block. The total is unaffected and
  no model has such a gap today. Recorded as an overlay entry.
- In the tree, a nested bearing reads `pitch-link spherical bearing` with no
  part number. That is v2's data (the bearing has no number), not the
  rendering.
- The lesson's "centre" should say nominal (see "Lesson audit" above).

## Checks that came back clean

- **Universal checks.** No new operator-facing refusal and no hoop for Jeff.
  The fold set is stored under its own key with every read wrapped. No
  terminal command or internal id is shown to the user. The toolbar titles
  are in everyday words.
- **Issues.** The three filed issues carry valid frontmatter, with
  `found_by:` and no `handoff:`. The DAG outline issue is
  `audience: strategy` with no `needs: jeff`. The fenced-away work (the map's
  nested outline, decomposing 215177/215175, the pane's sweep rail) each has
  an issue.

## Overlay

Two entries were added under "Recurring bugs to check":
- per-part aggregates keyed on `edge.part` drop gap edges;
- a real-model DoD number the model cannot produce.
