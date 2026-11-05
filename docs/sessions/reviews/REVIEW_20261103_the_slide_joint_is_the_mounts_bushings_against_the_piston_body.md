---
type: review
handoff: docs/sessions/active/HANDOFF_20261103_the_slide_joint_is_the_mounts_bushings_against_the_piston_body.md
reviewer: agent
date: 2026-11-03
verdict: APPROVE
blockers: 0
---

# Review — the_slide_joint_is_the_mounts_bushings_against_the_piston_body

Branch `handoff/the_slide_joint_is_the_mounts_bushings_against_the_piston_body`
(4 commits, `b4b641db`..`2041072e`) was merged into
`review/the_slide_joint_is_the_mounts_bushings_against_the_piston_body` cut from
`integration` `7231a4af`. It was not already contained in `integration`. The
merge had no conflicts, and the marker grep found nothing. Every lesson, issue
and shot arrives as `A`. The only `M` under `docs/issues/` is the routed
10-29 issue that the DoD says to resolve.

## What was verified

**Deliverables.**
1. The slide edge `pitch_plate_slide_bushings_to_piston_body`
   (`gas_spring_mount_bushing_bore` → `gas_spring_piston_body_od`,
   `cylindrical_slide`):
   - the bushing node carries `hardware_ref: GR04WB328AT11`;
   - the piston is already in the `pitch_plate` body;
   - the old edge is gone;
   - no study had selected it (`git grep` on `integration` hits only the
     topology itself);
   - the "bushing tipping" study notes were left untouched and are still
     true.

   `test_the_pitch_plate_slide_is_the_mounts_bushings_on_the_piston_body` pins
   the ends, kind, parts and hardware ref.
2. The hub node is named "hub spindle bore axis". Its four edges are pinned by
   name. The dropped half of the old name is gone, and the lesson says so.
3. The mount's placement is from source, not from mates (see provenance
   below). The `needs: jeff` ask was correctly not filed.
4. `Node.face {part, surface}` (`NODE_FACE_FIELDS`) is the smallest word the
   handoff asked for. It is checked in `__post_init__`, documented in
   `docs/DAG_TOPOLOGY.md` ("Which face an end is"), read by
   `build_contact_suggestions._end`, `propose_bindings.check` and
   `fg.end_surface_class`, and projected.
5. Proposals 0056/0057 were added for the new edge only. No event named the
   deleted edge, so nothing was orphaned. The hub-to-plate coaxiality was
   rightly not re-proposed, with the two follow-up issues filed.

**Provenance audit (re-derived, not copied):**
- **Placement.** rotorkit `assembly_extract_20261001T022446Z/report.json`
  `coverage['213668-002']` is `validation_only`, instance `213668-001.1`,
  `placement_world` identity, `identical_face_table: true` against
  `6d5b1321…`. The sidecar's `extraction.instances` is a verbatim copy.
- **Frame check.** I re-ran it myself, parsing the run's
  `parts/asm217755_213668_002.stp` against `positions.f32`. All **1927**
  `VERTEX_POINT`s are within **8.5e-6 mm** of a mesh vertex (median 4.3e-6),
  which bears out the lesson's "within 9e-6". The face-table match alone
  would not have proved this, because areas do not depend on the frame.
- **GR04WB328AT11.** drawing-checker run
  `20260723_163810_217755_A.1_PROPULSION_ASSEMBLY,_PROPELLER`
  `217755_A_p01.json` `parts_list[44]` has find 45, "TRELLEBORG SLYDRING,
  SIZE -328, TURCON T11", qty 2. `217755_A_balloons.json` places it at
  `p6:DETAIL W`. All four match the hardware entry.
- **Hardware entry hygiene:**
  - `not_transcribed`, `values_source: null`, `library_ref: null`;
  - `gaps` is non-empty;
  - claims moved total 29→30, not_transcribed 4→5, not_library 28→29;
  - the witness anchor moved with them;
  - `PROVENANCE.md` was amended.
- **No invented values.** Jeff's Ø41.04 / Ø41.072 / Ø47.574 and the mesh radii
  appear only in `note`s. No edge carries a value or a band. Every new edge
  says "No value recorded" and names what would close it.

**Mandatory stack checks 1–7.** No stack element changed: `git diff
integration -- docs/tolerance_stacks/stack_*.json` is empty.
- Checks 2–6 (signs, LMC/MMC, RSS, nominal in band, castellation) have no new
  subject.
- Check 1 applies to the new hardware entry, above.
- Check 7, computed with `tests/debug_report_tolerance_stacks.py --ratio`:
  **5 of 26** instances `traced` across the three seeded stacks (12 inferred,
  9 untraced). All stacks: **30 traced / 16 inferred / 15 untraced, out of 61
  element instances**. Neither changed.

**Lesson audit:**
- The before-side contact counts reproduce from the live projection (built
  2026-11-03T00:15 from `03880aca`): 17 gap edges; 10 ok, 1 `no_occurrence`
  (`gas_spring_bushing_coaxiality`), 2 `no_contact`, 4 `no_mesh`.
- The proposal log has 57 events, and none names the old edge.
- 74→76 interfaces and 95→96 edges match the diff: +2 nodes, −1+2 edges.
  Branch points and loops are paired by
  `test_the_doc_states_this_graphs_whole_shape…`, which is green.
- The after-side contact table was **not** re-derived. That would be a
  6-minute rebuild into a scratch root, and the new edge's single candidate
  is consistent with the proposals on disk.

**Screenshots.** `3_mount_isolated.png` shows 213668-002 drawn at the hub seat,
as the DoD asks. The rail's ends can't be shown yet. That depends on linkage's
`JOINT_FEATURES` and on the post-batch-merge projection rebuild, which the
lesson states plainly. The linkage half is filed:
`ISSUE_20261103_linkages_plate_slide_still_joins_the_hub_and_the_plate.md`
(`audience: strategy`, inside the workspace, so no `needs:`).

## Tests

- **Tactical record:** a full suite in the worktree, `4 failed, 1697 passed`.
  Two of the reds were fixed and re-run, and the other two are explained.
  Accepted.
- **Pre-landing risky subset**, 17 files: `test_tolerance_stack`,
  `test_topology`, `test_topology_projection`, `test_viewer_projection`,
  `test_architecture_inventory`, `test_provenance`,
  `test_thermal_exception_list`, `test_claims_registry`,
  `test_mutation_witnesses`, `test_contact_suggestions`,
  `test_propose_bindings`, `test_feature_geometry`, `test_fit_bound_features`,
  `test_end_stop_travel_study`, `test_kinematic`, `test_interface_contact`,
  `test_projection_provenance`. Result: **1 failed, 725 passed, 1 skipped**.
  The one red is below.
- **Post-merge full suite**, review worktree, single process (no xdist in the
  venv): `C:/workspace/tolstack/venv-win/Scripts/python.exe -X utf8 -m pytest -q -p no:cacheprovider`
  gave **2 failed, 1699 passed, 1 skipped, 2 deselected** in 1289 s. That is
  OVER BUDGET by 11m29s; the tactical run took 6m14s on the same tree, and
  about 14 python processes were live. I appended the measurement to the open
  `ISSUE_20261022_the_default_test_tier_runs_past_its_ten_minute_budget.md`.
  This repo's conftest printed no contention header lines in the tail I
  captured. The two reds:
  - `test_viewer_js_suite`: the deliberate worktree red.
  - `test_contact_suggestions.py::test_real_the_live_projection_has_the_schema_and_a_row_per_gap_edge`:
    it pairs this tree's gap edges with the main checkout's trunk-built
    projection, and the assertion's only diff is the renamed edge at index 3.
    It stays red on `integration` until the batch-merge rebuild. Filed as a
    missing freshness gate, not charged to this branch.
- **After the inline fixes:** 7 topology/doc files, **441 passed**.
- **Not run here:** the viewer/annotate `[real]` tiers and the browser TRUTH
  tier against a projection rebuilt from this tree. They need the shared
  projections, which are rebuilt at the batch merge (`scripts/rebuild_projections.ps1`
  first). The `[real]` pin this change moves (169→172 layout rows) is
  unverified by any tier until then.
- **Mutation witness** `--changed-since integration` (capped): result in the
  addendum below. The one spec whose anchor moved ("the projection this tier
  reads was built from this tree") is red-before-mutation until the rebuild,
  as the lesson measured.

## Findings

**Should-fix, fixed inline (stale comment-class text, few lines, no behaviour):**
1. The topology note on edge `tan_link_mount_…` / the mount's base-face-to-bore
   structural edge (`docs/topologies/topology_vpa_pitch_linkage.json`) still
   said the mount's mesh "records no placement and a fit of it stands in its
   own frame". It now names the recorded occurrence.
2. `docs/ANNOTATION_SURFACE.md`, "Where a part is drawn": "a part with no
   recorded occurrence (the standalone `213668-002` STEP, the blade OML)" now
   names only the blade OML, with the date the mount left that list.

   `apps/annotate/README.md`'s "What it measured, 2026-10-01" table row is a
   dated measurement and was left alone.

**Should-fix, filed (unfixed):**
3. `ISSUE_20261103_the_proposers_declared_face_refusals_are_pinned_by_a_source_grep.md`
   (low). The `propose_bindings` half of
   `test_the_contact_builder_and_the_proposer_read_a_declared_face` is a
   substring match over the script, so the declared-face `wrong_part` /
   `wrong_shape` refusals have no behavioural test.

**Out of scope, filed:**
4. `ISSUE_20261103_the_contact_suggestions_real_test_pairs_this_tree_with_a_projection_built_from_another.md`
   (med). See Tests.

**Observations, no action:**
- The sidecar edit and proposals 0056/0057 are already in the shared `data/`.
  Trunk's server draws the mount now (intended), and trunk's fold carries two
  proposals for an edge trunk's topology does not have yet. No trunk reader
  fails on that (grepped the `[real]` readers of the inbox). The window closes
  at the batch merge.
- `Node` is frozen with a `dict` field (`face`), so it is unhashable. Nothing
  hashes nodes today.

No design findings: the diff touches no surface beyond a test pin and a
README claim.

Verdict: **APPROVE**.

## Addendum — mutation witness gate

`node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --changed-since integration`
(exit 0): **1/4 witnessed, 4/4 reached, 0 left to the sweep.**

- `python__test-every-declared-claim-agrees-with-its-source#1`: WITNESSED.
- `fast__real-the-projection-this-tier-reads-was-built-from-this#1/#2` and
  `fast__real-every-live-walk-s-rails-and-links-re-derive-from-it`: NOT
  WITNESSED, all with "the tier was red before the mutation". This is the
  viewer `[real]` freshness check refusing the main checkout's projection,
  which predates this tree's `hardware_entries.json` and topology. It is the
  guard working, not decay.

**For the batch merge:** these three can only be witnessed after
`scripts/rebuild_projections.ps1`. Re-run them with `--only` after the rebuild,
before trusting them.
