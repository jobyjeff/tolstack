---
type: review
handoff: docs/sessions/active/HANDOFF_20261016_a_kinematic_study_folds_the_sweeps_jacobian.md
reviewer: agent (review)
date: 2026-10-16
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-10-16 — a_kinematic_study_folds_the_sweeps_jacobian

Branch `handoff/a_kinematic_study_folds_the_sweeps_jacobian` (3 commits,
`7309291`..`e468f29`). It was not already contained in `integration`. I merged
it into `review/…` as `e42c32b` with no conflicts and no marker lines. All diff
entries are `A` except five `M`s (ARCHITECTURE.md, DAG_TOPOLOGY.md, the SOP,
two tests). No lesson or review was overwritten. The board shows a single run
of this handoff, in `active/`.

## What I verified

**I re-derived the numbers myself.** I wrote an independent script against
`data/inbox/linkage-sweeps/vpa-pitch-p2-20261015-013931.json` (main checkout).
It reads `sensitivity.by_measure["blade_pitch"]` directly, finds the stops by
value and takes |J| or ‖J‖ × half-band. Every figure in the lesson's tables
reproduced:

| stop | idx | nominal | worst case | RSS |
|---|---|---|---|---|
| −7° | 0 | −6.99169° | ±0.24362° | ±0.16517° |
| +72° | 79 | 72.00063° | ±0.24237° | ±0.15948° |

The contributor coefficients and the ranking matched as well. So did the sign
flip of `tan_link_mount_height`, and the sphere norm equalling the
link-length coefficient (1.5741 / 1.5420). The worst finite-difference
disagreement is 2.433e-7, and P2's `mechanism` has no per-joint body list,
which is the lesson's correction of the handoff and is right.

**The mandatory checks (the stack-shaped ones, read for a kinematic study):**

1. **Traceability.** All four bands come from `topology_pitch_system.json` by
   `dimension_ref`. Their `source_ref` is carried unchanged and no number is
   copied. `pitch_link_length` ±0.03 and `pitch_arm_link_hole_to_clocking_hole`
   ±0.015 are `workbook`/`untraced`. `pitch_plate_flange_to_link_hole` ±0.1 is
   `drawing`/`traced` (215735-A, ⌖Ø0.2). `tan_link_mount_height` ±0.1 is
   `drawing`/`traced` (215198-A, 79.00 ±0.10). Each matches the handoff's
   table. The two contributors with no cited band are gap rows with a stated
   `gap` reason, an issue is filed for them, and nothing is invented. The
   S461-607 `limit` and the S461-241 `context_ref` are byte-equal to
   `study_pitch_system_end_stop_{minus7,plus72}.json`, which I checked by
   dict comparison. **One zone-shape finding is below (S1).**
2. **Signs.** For a `band` the sign is sign(J). For a sphere it is `+1` with
   ‖J‖ as the coefficient. Both are pinned by
   `test_a_sphere_coefficient_is_the_norm_and_a_band_sign_follows_the_jacobian`,
   and the fixture's asymmetric band (−0.1/+0.3) makes a wrong sign visible in
   the interval. The check is `limit +1, stop_total −1`, the same shape as
   `topology.check_study`.
3. **LMC/MMC.** Not applicable: no material conditions are carried, and
   `fold()` is untouched.
4. **RSS.** RSS is computed per point and per stop, and no verdict reads it.
   `kinematic.py`'s docstring points at ARCHITECTURE.md's RSS caveat and says a
   sphere's worst azimuth is treated as one variate.
5. **Nominal inside min/max.** Every band is about 0.0 and symmetric, and a
   band that is not variation-only is refused at load (tested).
6. **Quantised hardware.** None in the contributors. The analogous caveat is
   present next to the numbers: `complete: false`, verdicts rendered as
   budgets, `excluded_terms` naming the end-stop location, bushing tipping,
   temperature, geometric callouts and the two gap rows, and the S461-607
   adoption note (blade-to-blade limit used as the nearest numeric criterion).
7. **Ratio, computed by me:** **2 traced / 0 inferred / 2 untraced, out of 4
   banded contributor instances, plus 2 gap rows with no band** (6
   contributors). The two non-element inputs are the S461-607 limit (traced,
   draft) and the Jacobian, which is cited by `run_id` and carries its own
   FD-agreement figure. Every untraced value and every gap is listed in
   `excluded_terms` or the gap rows.

**The one-fold rule.** `zone_coefficient` derives a coefficient from Jacobian
entries and never reads an element value. `fold_at` hands one `Term` per
contributor to `fold()`. `test_kinematic_py_combines_no_element_values_outside_fold`
runs `thermal.py`'s combining walker over the file, finds zero sites, and finds
a planted site. No `DECLARED_COMBINING_EXCEPTIONS` entry was needed, and I
agree with that.

**The fence.** `traverse`/`summarize`/`check_study` are not called, and
`topology.py`, `apps/`, `topology_vpa_pitch_linkage.json` and
`part_mesh_aliases.json` are untouched. `build_topology_projection.py` globs
only `topology_*.json` and `study_*.json`, so the new
`kinematic_study_*.json` does not leak into `topologies.json`.

**Title.** "Blade pitch at the end stops, kinematic", with the id unchanged
and a description present. The trailing ", kinematic" is a genre qualifier,
which the SOP's titling rule rejects. That is a nit (N1).

## Tests

- **The tactical record:** a full suite in its worktree, `1 failed, 1466
  passed, 1 skipped`. The failure is the documented worktree red. The record
  is consistent with the diff (`tests/test_kinematic.py` is new, and its
  `[real]` P2 test ran by absolute path), so I gave it the benefit of the
  doubt.
- **Pre-merge risky subset**, run on the merged tree: `tests/test_kinematic.py
  test_architecture_inventory.py test_title_style.py test_mutation_witnesses.py
  test_thermal_exception_list.py test_tolerance_stack.py test_provenance.py
  test_claims_registry.py test_projection_provenance.py test_topology.py`.
  Result: **479 passed**.
- **Mutation witnesses:** the 7 new specs, run through `--only` against
  `--repo C:/workspace/tolstack` on the merged tree. **9/9 mutations
  WITNESSED.** `--unenrolled` lists no kinematic guard.
- **Viewer fast tier through `--repo`:** 428/429, with the node-fs `[real]`
  tier refused. The shared projection was built from `03ed055` and the
  freshness gate lists `tolerance_stack/kinematic.py` and the new study file
  as inputs that differ. This is the gate working as designed. The topology
  builder's globs exclude the new file, so the projection *content* would not
  change. The tier still has to be re-run after the batch-merge rebuild, which
  is the documented order. **Unexercised here: the viewer `[real]` tier.**
- **Annotate fast tier:** 189/189, no SKIP lines.
- **Post-merge full suite** (review worktree, merged tree `e42c32b`): **1 failed, 1466 passed, 1 skipped** (305s) — the failure is the documented worktree-only `tests/test_viewer_js_suite.py` red; the skip is `test_fit_bound_features.py:422` (pre-existing). Identical to the tactical record. Main checkout `data/` unchanged across the run (`find -newer` marker: no files).

## Findings

**Blockers:** none.

**Should-fix (left unfixed; issues filed):**

- **S1. The ⌖Ø0.2 position zone is read as a Z-only band.**
  `pitch_plate_attach_height` applies 215735-A's ⌖Ø0.2 to
  `pitch_link.point_a[2]` alone. A diametral position zone covers two
  directions, and the band's own `source_ref.note` (F4) says the callout also
  serves the tangential row. P2 gives that point a real tangential entry
  (−0.24 / −0.40 deg/mm). Reading the zone as a disk would add about 0.002° and
  0.005° to the worst case. The verdicts are unchanged. The handoff staged the
  pairing, so this is a finding against the handoff as much as the author. It
  also ties into the still-open F4 question, so it routes to strategy:
  `docs/issues/ISSUE_20261016_a_kinematic_contributor_reads_a_diametral_position_zone_as_a_one_axis_band.md`.
- **S2. Band units are never paired with the Jacobian column.** `band_units`
  is recorded and never checked. A band from an inch topology would be off by
  25.4× and stay green. DAG_TOPOLOGY.md's "item 2 … waits only for a cited
  clearance band" also understates the case: a `disk` on the slide's
  direction-cosine components needs a bushing length to turn a clearance in mm
  into a tilt.
  `docs/issues/ISSUE_20261016_a_kinematic_study_never_checks_a_bands_units_against_the_jacobian_column.md`.

**Nits (recorded, not filed):**

- N1. The title's trailing ", kinematic" is a genre statement (SOP, "Titling
  an artifact"). It is not rendered anywhere yet, because no viewer reads
  kinematic studies.
- N2. `_reconcile_feature` returns `"artifact"` even when no label of a
  contributor appears in `geometry.features[]` (the `continue` branch). The
  list is parallel to `geometry.names`, so this cannot happen against
  well-formed linkage output.
- N3. The projection's provenance stamp covers `docs/topologies/` only, not the
  gitignored sweep it reads. A sweep is immutable by `run_id`, and the
  freshness wiring is already deferred to
  `ISSUE_20261016_the_kinematic_projection_has_no_reader_and_is_not_on_the_rebuild_rail.md`.
- N4. A check's `limit − total ≥ 0` tests only the upper side of the stop's
  interval. That is equivalent for the symmetric bands used here, and it is
  the existing `check_study` semantics, but an asymmetric inline band would
  get a one-sided check.

**Lesson audit.** The counts and arithmetic re-derive (margins
0.5 − 0.244 = 0.256 and 0.5 − 0.242 = 0.258, and the "two thirds" share is
0.156/0.244 and 0.149/0.242). One claim is too strong: "None of the handoff's
pairings was wrong on inspection". See S1. I added a dated correction
blockquote under that sentence and left the original text intact.

**Overlay:** a new Recurring-bugs entry covers zone versus callout and band
units versus label.

**Inline fixes:** only the lesson's correction blockquote, which is
review-artifact text. No code or data changed.

## Integration moved during the review

`integration` advanced to `62409ba` (the sibling `the_travel_between_the_end_stops_is_a_study`, which edits `topology_vpa_pitch_linkage.json` and `part_mesh_aliases.json`). Merged it into this branch with no conflicts. Re-ran the risky subset on the result — `test_kinematic` (incl. the `[real]` P2 pin), `test_topology`, `test_topology_projection`, `test_tolerance_stack`, `test_provenance`, `test_claims_registry`, `test_architecture_inventory`, `test_title_style`, `test_mutation_witnesses`, `test_part_mesh_aliases`: **523 passed**; viewer fast tier 428/428 (node-fs tier skipped, worktree). Every contributor edge still resolves against the sibling's extended topology.
