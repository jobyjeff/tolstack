---
priority: med
depends_on: [the_kinematic_page_keeps_the_dag_and_says_each_contributor_once]
model: sonnet
hitl: false
---

# HANDOFF 2026-10-26 — a_contributor_may_be_a_study: the travel between the stops enters the blade-pitch study by the chain rule, as terms, never as a folded interval

Source: the strategy decision of 2026-10-20 ("Sub-stacks compose by the chain
rule, never by folding a fold", `dispatch/docs/strategy/drafts/DRAFT_tolerance_analysis_over_the_kinematic_model.md`,
rung 2), re-confirmed by Jeff 2026-10-26 ("subsets (linear chains) were
selected for individual studies, and then sensitivities were derived from the
3d kinematic model as a function of pitch sweep angle"). Not yet staged
anywhere: `grep -rn study_ref tolerance_stack/ docs/` finds nothing.
Baseline: `master` with `pitch_system_folds_into_the_pitch_linkage_model` and
`the_kinematic_page_keeps_the_dag_and_says_each_contributor_once` merged.
Scope: `tolerance_stack/kinematic.py`, `scripts/build_kinematic_projection.py`,
`docs/topologies/kinematic_study_vpa_pitch_linkage_blade_pitch_at_the_stops.json`,
`docs/DAG_TOPOLOGY.md` (the kinematic study section), `apps/viewer/views/kinematic.js`
(the group row only), `tests/`, mutation specs. Do NOT touch `apps/annotate/`
or `tolerance_stack/topology.py`'s `fold()`.

## What is true today

- `kinematic_study/v0` contributor fields are `edge, parameters, zone,
  feature, dimension_ref | dimension, gap, note` (`tolerance_stack/kinematic.py:385–395`);
  `dimension_ref` accepts only `{topology, edge}` (543–558;
  `docs/DAG_TOPOLOGY.md:690–698`). Study fields: 440–451. The builder folds
  one `fold()` per sweep point (`project_stop`, `scripts/build_kinematic_projection.py:150–159`).
- The stop location enters the blade-pitch study **only as prose**: each
  check's `excluded_terms` (study JSON lines 115 and 151) says "the end-stop
  location itself — where the driver's zero sits is the parallel study
  the_travel_between_the_end_stops_is_a_study; its total enters here later as
  a band on actuator.value, whose Jacobian entry is the motion ratio". That
  is why both checks are `complete: false`.
- The travel study exists on the same topology:
  `docs/topologies/study_vpa_pitch_linkage_travel_between_end_stops.json`
  (4 edges; 64.440 mm nominal; worst case ±0.170, RSS ±0.0889 after the
  2026-10-20 re-cite; two of its four terms are still untraced ±0.05
  stand-ins — `piston_head_upper_thickness`, `gas_spring_mount_flange_to_end_stop`,
  per `LESSONS_20261020_the_travel_chain_cites_its_three_drawings.md`).
- Run P2 (`C:\workspace\tolstack\data\inbox\linkage-sweeps\vpa-pitch-p2-20261016-235852.json`)
  names its driver `mechanism.driver.parameter = actuator.value`, unit `mm`,
  label "actuator travel"; the Jacobian column for it exists at every point
  (`sensitivity.by_measure.blade_pitch`).

## The rule (binding, from 2026-10-20)

A contributor that is itself a study does not contribute its folded
interval; it contributes **its terms**, each with coefficient = (parent
Jacobian entry for the named parameter) × (the sub-study term's own
coefficient), sign multiplied through. Worst case stays Σ|c·h| over leaf
terms; RSS stays one quadrature over leaf terms. The one-`fold()` invariant
holds: nothing folds a fold. A term that is untraced in the sub-study is
untraced here, and a gap there is a gap here.

## Deliverables

1. **Contributor kind `study_ref`**: `{topology, study_id, parameter}`.
   Loading walks the referenced chain study (the existing study loader, same
   topology after the merge; cross-topology stays legal), takes its signed
   terms, and multiplies each by the Jacobian entry of `parameter` at every
   sweep point. `parameter` must be a label the sweep carries (the unit
   check from `the_kinematic_study_checks_its_run_its_units_and_shows_its_limit`
   applies: the sub-study's units must be the parameter's). A `study_ref`
   that names a study which itself holds a `study_ref` is refused in v0 (no
   nesting yet; say so in the error).
2. **First use**: the blade-pitch study gains the travel study as a
   `study_ref` on `actuator.value`; the two `excluded_terms` rows about the
   stop location are removed; whether each check becomes `complete` is
   decided by the study's own completeness rule (`a_study_says_it_is_incomplete_without_inventing_a_check`,
   2026-10-22) — the two untraced travel terms probably keep it incomplete,
   and that is the honest answer.
3. **The projection and the page**: the contributor table's group row — the
   sub-study as one collapsible row whose children are its terms (Jeff's
   LOD), each child a normal term row with the composed coefficient; the
   DAG's lit set includes the sub-study's chain (the hook the page handoff
   left). The envelope widens; the stops' summary lines move.
4. **Docs**: `docs/DAG_TOPOLOGY.md`'s kinematic section states the chain
   rule in one paragraph and names the no-nesting fence; `ARCHITECTURE.md`'s
   "Where computation may live" gains the sentence that `study_ref` adds
   terms, not a combiner.

## Definition of done

- `pytest -q` green with new value-level tests: a fixture sub-study of two
  terms under a parent coefficient k gives leaf coefficients k·c₁, k·c₂ with
  signs multiplied through; worst case equals Σ|c·h| over all leaves and
  differs from "parent ± sub-study interval" by the amount the test states;
  RSS is one quadrature; a nested `study_ref` is refused by name; a unit
  mismatch is refused with the existing wording.
- On run P2 the blade-pitch study's worst case and RSS at both stops are
  recorded before and after (today ±0.244 / ±0.242 worst, ±0.165 / ±0.159
  RSS), with the motion-ratio Jacobian entry at each stop stated.
- The viewer page shows the group row collapsed by default, expanding into
  the four travel terms with their composed coefficients; the `[real]` tier
  pins the new count and totals; mutation spec per guard.
- Lesson (`docs/sessions/lessons/LESSONS_20261026_a_contributor_may_be_a_study.md`):
  the numbers above, and whether the `sensitivity_source: chain | sweep`
  convergence (decided 2026-10-20 as "after the rule has been used once")
  now looks like one loader or two.
