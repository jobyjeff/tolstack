---
priority: high
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-10-27 — the_checks_and_claims_the_folds_left_naming_what_they_removed: re-aim the tests, the README claim and the study row that still name a gap row or a topology the 10-26/10-27 folds removed

Source: triage sweep 2026-10-27. Two `high` issues and three smaller ones share
one failure shape: a fold (`pitch_system_folds_into_the_pitch_linkage_model`,
`the_fastener_stacks_join_the_model`) or a banding
(`the_tangential_link_cites_its_drawing`) removed a subject, and a check, a
claim or a prose row still names it. Each one passes only against a
**projection built before** the change, so it got past its own gate and goes
red (or silently vacuous) at the next rebuilt-projection run.
Baseline: `master` = `integration` at `1a006b63` (batch merge 2026-10-27).
Scope: `scripts/run_viewer_browser_tests.mjs` (the `annotate rail and scene`
suite, section 6 only), `scripts/mutation_witnesses/*.json` entries for the
specs that section owns, `apps/viewer/README.md` (the `smallest_chain` claim
near line 972–985 only), `tests/test_viewer_readme_doc_facts.py`,
`docs/topologies/kinematic_study_vpa_pitch_linkage_blade_pitch_at_the_stops.json`
(the two `excluded_terms` rows only), `apps/viewer/topology_fixtures.js` and
`apps/viewer/tests.js` (the per-document qualifier check only), the five
issues below. Do NOT touch `scripts/run_mutation_witness_tests.mjs` (owned by
the staged `a_witness_run_stops_at_its_budget_and_leaves_the_rest_to_the_sweep`),
the `3D pane follows the selection` suite's checks (owned by the staged
`the_nav_scene_trees_six_gestures_are_named_once_and_each_witnessed`, which
depends on this one), or the worksheet/joint-block page work (staged as
`a_study_shows_the_worksheet_and_joint_of_the_stack_it_folds`).

**Always build the projections from your own tree before judging any of
these** (`scripts/rebuild_projections.ps1 -RepoRoot <worktree>`). The main
checkout's `data/projections/viewer/kinematic/kinematic_studies.json` was built
2026-10-23T04:14Z, before the banding, and still has 10 gap rows; a run against
it is the only kind on which the stale checks pass.

## Deliverables

1. **The rail's gap-badge checks pick their subject from the projection.**
   `scripts/run_viewer_browser_tests.mjs` ~line 6855, section "6. a gap
   contributor's alert says what resolves it": the two `[real]` checks hover the
   `.alertbadge` of `tan_link_length` and `pitch_plate_tan_link_attach_radius`
   and expect a "No band" popup naming 212956-005 / 215177-001. Those rows are
   banded since `the_tangential_link_cites_its_drawing`; a projection built
   from this tree has **0** gap rows (`tests/test_kinematic.py`, `REAL`, pins
   `gap_count == 0`). Choose the subject from the projection's rows whose
   `kind` is `gap`; when there are none, push a **named SKIP** citing
   `ISSUE_20261026_the_rail_gap_badge_browser_checks_read_gap_rows_integration_no_longer_has.md`
   (not a pass). Never hard-code an edge. Suggestion to investigate: also keep a
   `[mock]` version of the check on the fixture's gap row so the badge's
   behaviour keeps a witness that does not wait on a live gap. Re-check the two
   specs' mutation entries (enrolled in `426a85a`) against the new subject.
   (The issue's round-2 half, the 3D-pane suite skipping itself on a missing
   gap row, is already fixed on master — ~line 5947 now picks `bound`/`unbound`
   rows — confirm it and say so in the lesson.)
2. **The README's `smallest_chain` claim names a topology that exists.**
   `apps/viewer/README.md` ~981 declares `metric: smallest_chain`,
   `topology: pitch_link_to_pitch_plate`, `value: pitch_link_thread_region_t`;
   `tests/test_viewer_readme_doc_facts.py:66` sets
   `SUBJECT_TOPOLOGY = "pitch_link_to_pitch_plate"`. That topology file was
   removed by `b3ae1bb6`. On a rebuilt projection
   `tests/test_claims_registry.py::test_every_declared_claim_agrees_with_its_source`
   and `tests/test_viewer_readme_doc_facts.py::test_thread_region_t_is_the_smallest_chain_not_the_largest`
   (StopIteration) are red. Decision made here: **re-point** the claim and
   `SUBJECT_TOPOLOGY` at the three `pitch_link_*` studies now on
   `vpa_pitch_linkage`, and re-derive which is smallest from the projection
   (if the claim no longer reads true, retire it with a dated note — never
   delete the declaration silently; `tests/claims_registry.py`'s message says
   why). Rejected alternative: retiring first — the paragraph still describes
   a live comparison. Also check the README's ~1427 mention of the topology.
3. **The blade-pitch checks stop listing gap rows they do not have.**
   Both checks in `kinematic_study_vpa_pitch_linkage_blade_pitch_at_the_stops.json`
   (lines ~159 and ~194) carry an `excluded_terms` row "tan_link_length and
   pitch_plate_tan_link_attach_radius -- contributors with a sensitivity and no
   cited band (the gap rows)". Remove it from both; it shows under **Not in
   these numbers** on the kinematic page. Add a test that an `excluded_terms`
   row never names a contributor whose projected row is a `term`.
4. **The per-document "unverified" qualifier gets a fixture witness.**
   `apps/viewer/tests.js` ~16237, `[real] a part sourced to both a drawing and
   a workbook qualifies the workbook and leaves the drawing alone`, is a named
   SKIP since the hub moved into `vpa_pitch_linkage` (which declares 214373-002).
   Give `apps/viewer/topology_fixtures.js`'s demo mechanism one part with no
   drawing whose two edges cite a traced drawing and an untraced workbook, and
   move the assertion to the fixture tier; the `[real]` check may stay as an
   opportunistic second witness.
5. **Re-verify the 36 unwitnessed mutations.**
   `ISSUE_20261026_a_full_witness_run_on_integration_left_36_mutations_unwitnessed.md`
   lists them (21 `annotate rail and scene`, 14 `3D pane follows the
   selection`, 1 python). After 1–2, run
   `node scripts/run_mutation_witness_tests.mjs --repo <scratch root> --only <id>`
   for the 35 browser ids (group by suite) against projections built from your
   tree; record the witnessed count in the lesson. Known residue: `…09a1cf0a#2`
   needs a page whose room differs from the boot layout's (issue's 10-26
   addendum) — if you do not fix it, say so. For
   `python__test-a-runner-that-ends-leaves-no-chrome__b36c164d#1` (a timing-
   dependent guard over `scripts/browser_runner.mjs`'s `process.on("exit")`
   handler), investigate whether the guard can tell "named on a BROWSER LEFT
   RUNNING line" from "gone on its own"; fix it if the fix is crisp, else
   record findings in the lesson and file a fresh issue with
   `class: wall_clock_dependence`.

## Definition of done

- With projections rebuilt from the worktree: `pytest -q` green (in
  particular the two tests in item 2), `node scripts/run_viewer_browser_tests.mjs --repo <worktree> --only "annotate rail and scene"`
  green with the section-6 checks either running on a live gap row or a named
  SKIP, node tier green with item 4's fixture check passing.
- The kinematic page (`topology.html`, kinematic study
  `vpa_pitch_linkage_blade_pitch_at_the_stops`) shows no "gap rows" line under
  **Not in these numbers**.
- The five issues set `status: resolved` (pointing here), with the
  witnessed/35 count on the witness issue.
- Lesson (`docs/sessions/lessons/LESSONS_20261027_the_checks_and_claims_the_folds_left_naming_what_they_removed.md`):
  the smallest `pitch_link_*` study and its value, the 35-mutation re-run
  result, the python guard's finding, and one paragraph on how a fold's own
  gate could catch a stale subject (it ran against the pre-fold projection).
