---
type: review
handoff: docs/sessions/active/HANDOFF_20261122_the_blade_pitch_study_folds_on_v2_and_names_what_v2_adds.md
reviewer: agent
date: 2026-11-23
verdict: APPROVE
blockers: 0
---

# Review — the_blade_pitch_study_folds_on_v2_and_names_what_v2_adds

Branch `handoff/the_blade_pitch_study_folds_on_v2_and_names_what_v2_adds`
(7 commits, `fdf3fbae`..`a1e5cae7`), cut from `integration` `eeb4fcc5`, which
had not moved. Merged `--no-ff` into `review/…` as `584e432d` (tree
`64160e1d`), with no conflicts. This was a fresh review: no earlier attempt on
the branch, and the containment check said "not merged".

## What was verified

**Deliverable 1: `ids_from` in `_reconcile_feature`.** The accepted set is
`(None, topology.id, topology.ids_from)`. The id itself is checked against the
study's own topology just above, so a v1-named feature has to exist on v2.
Tests pin both sides: the read-through with `ids_from`, and a refusal for any
other model, with and without `ids_from`. That covers DoD (c).

**Deliverable 2: the new edge.** `pitch_plate_link_flanged_bushing_height`
runs `piston_body_plate_flange_seat` → `pitch_plate_link_flanged_bushing_bore`
on `pitch_plate_215735_001`. It is structural, has no value, and its note names
the v1 edge it stands in for. v2 now has 105 edges, which I re-counted.
`MODEL_V2_COUNTS["dimensions"]` went 75 → 76, and the hard-coded `75` became a
read of that dict. The map's "[real] the map draws the model's counts" passed
in the full browser tier.

**Deliverable 3: the study.** `sweep`, `measure`, `datum`, `stops` and
`checks` are byte-equal to v1's, compared by JSON equality. All six owner
contributors match the handoff's table. Five use a cross-topology
`dimension_ref`. `tan_link_length` is an inline band equal to v1's (same
213863-004-A callout, ±0.05), carrying `borrowed_from` v1 `tan_link_length`.
`_check_borrowed_from` checks that pairing at load: same half-width, same
document. The stops' axial stacks are v1's three chain `study_ref`s, unchanged.

**Parity (DoD a).** I rebuilt the projection from the merged tree and re-read
it. Both studies give the same numbers. At +72: ±0.783695 worst, ±0.28294 RSS,
margin +1.216936, RSS margin +1.71769, pass. At −7: ±2.355055 worst, ±1.033947
RSS, margin −0.363364, marginal. Every number in the lesson's table
re-derives. The pytest parity test computes both studies and compares
intervals, per-edge terms, the range and the checks. It restates no digits.

**Deliverable 4: route rows.** There are 27 `route_of` rows, all `gap`, with no
band. `_check_routes` refuses a route row that names a non-owner or reads
different columns or zone. Test (b) asserts at every sweep point that each row
has the same Jacobian entries, sign and coefficient as its owner, shows its
sensitivity, and enters no term (`refused_count == 27`). A fixture test shows
two banded contributors sharing a column fold as two terms on one coefficient.
The left-out edges are listed in the lesson and filed in an issue (below).

**Deliverables 5 and 6: page and map.** `VALUE_FROM` is a module tuple. It is
generated into `vocab.gen.js` and the generation is paired. The borrowed badge
is muted metadata, not a state colour, and its hover names the model by title.
A gap row reads "no value" and shows its sensitivity. That reverses `5be7c85b`
on purpose: the lesson says so and the witness was re-pointed. The "Nothing is
recorded as missing" line is gone and ISSUE_20261120 is marked resolved.
`VA.mapRouteKeys` + `map__quiet` (opacity .35) light the route, with no new
control. I read shots 02, 03, 06, 09 and 10.

**Binding log.** 116 files, hash-of-hashes `fd4f2255…4044`. That is the
lesson's figure, so the log is unchanged.

## Tolstack mandatory checks (a kinematic study, not a stack)

1. **Traces.** No new number was authored. The 6 owner bands are v1's:
   4 `traced` (215735-A ×2, 215198-A, 213863-004-A) and 2 `untraced`
   (`pitch_link_length` and `pitch_arm_radius`, both on the workbook). Both
   untraced rows carry the "on the gap list" mark on the grid. The 27 route
   rows are honest gaps. The stop-stack leaves are v1's: 7 traced and
   2 inferred at −7. The borrowed `pitch_plate_flange_to_link_hole` still
   carries v1's known ⌖Ø-as-Z-band question
   (`ISSUE_20261016_a_kinematic_contributor_reads_a_diametral_position_zone_as_a_one_axis_band.md`).
   This diff inherits it and does not worsen it.
2. **Signs.** These come from the sweep's Jacobian, not authored. Parity
   compares every term's sign against v1.
3. **LMC/MMC.** Not applicable: no `lmc`/`mmc` in the diff, and `fold()` is
   untouched.
4. **RSS.** Computed and present at both stops. Verdicts read worst case.
5. **Nominal in band.** The inline band is 0 ∈ [−0.05, 0.05]. The cited
   nominal 61.40 rides from the lender and is displayed, not folded.
6. **Cotter/castellation.** Not applicable: no hardware values here.
7. **Ratio (owner rows):** 4 traced / 0 inferred / 2 untraced out of 6, plus
   27 gaps. Both untraced rows are on the gap list.

## Tests

- **Pre-merge risky subset.** The merge was a fast-forward of content, so the
  tree is identical to the handoff's. Ran `pytest -q` on `test_kinematic`,
  `test_topology`, `test_topology_projection`, `test_topology_map`,
  `test_model_view`, `test_viewer_projection`, `test_tolerance_stack`,
  `test_architecture_inventory`, `test_mutation_witnesses`,
  `test_js_vocabulary_is_generated`, `test_js_python_vocabulary`,
  `test_viewer_readme_doc_facts`, `test_claims_registry`, `test_provenance` and
  `test_projection_provenance`: **821 passed**.
- **Post-merge default tier, in the review worktree.** `1 failed, 2612 passed,
  1 skipped` in 518 s, recorded inside budget. The one failure is the
  deliberate worktree red, `test_viewer_js_suite_is_green`. No contention
  header lines were printed: this repo's conftest prints none.
- **Fast tiers.** Ran on a scratch root built from the merged tree
  (`data/scratch/rv_blade_v2`, all 8 builders, every stamp at `584e432d`).
  `node apps/viewer/run_tests.cjs --repo …` gave **628/628** with `[real]`
  paired. `node apps/annotate/run_tests.cjs` gave **334/334**.
- **Whole browser tier.** 3121 s, self-recorded as a `merge` row, over budget.
  The over-budget issue is already open, and I appended a measurement to
  `ISSUE_20261106_the_viewer_browser_tier_ran_51_minutes_against_the_merge_budget.md`.
  Result: **45/49 suites**. The four red suites:
  - **every study opens in 3D showing only its parts.** This diff caused it,
    and I fixed it inline (see below). After the fix, `--only` gave 11/11.
  - **annotate model in the scene.** Run alone with `--only`: 22/22. It was a
    whole-tier flake.
  - **a suggestion names its face… / a pattern is bound as its like faces…**
    Both are red on an `integration` export against the same scratch root,
    with the same sub-checks (3/5 and 8/11). They were already filed, still
    open: `ISSUE_20261122_two_annotate_browser_suites_assume_live_features_are_still_unbound.md`.
    The pattern suite moves between runs (2/11, 7/11, 8/11). Its one
    merged-only red ("Unbound lists no bound feature…") did not repeat on the
    next merged run, and this diff does not touch the nav tree or binding.
- **Witness gate.** `--changed-since integration --budget-min 10`: 27/27
  witnessed, 27 of 36 reached, 9 left to the sweep. All five of the handoff's
  specs were reached and witnessed. The gate was recorded inside budget.
  After my inline fix, `--changed-since 584e432d`: 1/1 witnessed.
- **Not pollution.** No file under the main checkout's `data/` outside
  `scratch/` changed during the runs, and the main checkout is clean.

## Findings

### Fixed inline

1. **should-fix: the browser tier went red because of this diff.**
   Location: `scripts/run_viewer_browser_tests.mjs:7812`,
   `testEveryStudyOpensIn3D`. The suite took `kinematic.studies[0]` as v1's
   study. v2's id now sorts first, so the suite hovered a nav row that exists
   only under model v2, timed out after 30 s and aborted. The tactical session
   ran `--only` on the map and kinematic suites but not on this one.
   Fix: pick the study by id (`SWEEP_RAIL_STUDY`), which restores what the
   suite's own comment says it does ("The studies below are v1's"). It is one
   line, changes no product behaviour, and needs no new test: the suite itself
   is the test. Committed in `b7e2bb2e`, with `--only` 11/11 and its witness
   1/1. I checked the other first-element reads in the runner: they pick by
   id, or read `sweep.run_id`, which both studies share.

### Should-fix, unfixed: already filed

2. **v2's grid folds two stop-stack leaves it never shows.**
   `piston_body_shoulder_to_top` and `piston_body_flange_to_top` are terms of
   v1's feather-stop chain, but v2 has no edges with those ids. The grid plans
   rows from v2's edges, so "Plate position at the feather stop · 5 terms"
   opens onto 3 rows. At +72 the two hidden terms are 0.0624 + 0.1249 deg of
   the stop position's ±0.468. The total is right; the rows that make it up
   are incomplete. The lesson discloses this, and it is filed as item 5 of
   `ISSUE_20261123_the_v2_blade_pitch_study_leaves_out_edges_that_need_a_ruling_before_they_carry_values.md`
   (closes when v2's own stop stacks are authored). Promoted to the overlay as
   a new class: an `ids_from` read-through that widens "this model" past this
   model's index.

### Nits

- `docs/DAG_TOPOLOGY.md` states v2's counts (105 edges, 36 branch points,
  28 loops) in prose. No claim is declared there, so nothing checks those
  figures. This matches the prose it edits, and I am leaving it.

## Notes for the next reviewer

- v2's verdicts read **incomplete** where v1's read pass/marginal. That is by
  design: 27 rows have no value. The margins are equal.
- When a diff adds a kinematic study, grep the browser runner for
  `studies[0]` / `studies || [])[0]`. A new study can change which one sorts
  first.
