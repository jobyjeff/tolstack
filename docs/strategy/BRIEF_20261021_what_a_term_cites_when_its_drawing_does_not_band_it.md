# BRIEF 2026-10-21 — what a stack or kinematic term cites when its drawing does not give it a one-axis band

> Routed here by the triage sweep of 2026-10-21 from four open issues filed
> between 2026-10-16 and 2026-10-20. All four ask the same thing: when the
> source document does not print a plain ± band on the one axis the term
> uses, what may the term carry, and what does the study then say about
> itself? Each issue says in its own words that this is a tolerancing-policy
> or domain call, not a patch. Triage has not designed the answer.

Source issues (all `status: triaged`, `strategy:` → this file):

- `docs/issues/ISSUE_20261016_a_kinematic_contributor_reads_a_diametral_position_zone_as_a_one_axis_band.md` (bug, med)
- `docs/issues/ISSUE_20261020_two_end_stop_travel_terms_have_no_dimension_on_their_drawings.md` (chore, med)
- `docs/issues/ISSUE_20261016_two_vpa_part_facts_the_pitch_stacks_wait_on.md` (chore, med; moved off Jeff's task list on 2026-10-16)
- `docs/issues/ISSUE_20261016_a_study_with_no_checks_has_nowhere_to_say_it_is_incomplete.md` (feature, low)

## The four instances

1. **A position zone read as a band.** In the blade-pitch kinematic study,
   `pitch_plate_attach_height` applies 215735-A's `⌖Ø0.2 A B C` as a `band`
   on `pitch_link.point_a[2]` alone. A diametral zone allows radius 0.1 in
   both directions perpendicular to the hole axis. Reading it as a `disk`
   would move the worst case by about +0.002° at −7° and +0.005° at +72°. The
   verdicts would not change. Open sub-questions: which axis is the hole's
   (the plate's link holes may be radial), and whether F4 of
   `WORKSHEET_endstop_vision_baseline.md` ("one callout serving the
   vertical and tangential rows, counted twice?") must be answered first.
2. **A model-defined surface with no dimension.** Two of the end-stop travel
   chain's four edges (`piston_head_upper_thickness` 6.556,
   `gas_spring_mount_flange_to_end_stop` 8.667) have no length on their
   drawings, and carry `kind: assumed` with a ±0.05 stand-in. Together that
   is 0.10 mm of the ±0.170 worst case, so the interval is mostly stand-in.
   Candidate sources are a datum-referenced profile or position callout, the
   drawings' `⌓0.5 UNLESS OTHERWISE SPECIFIED` profile note (a profile, not
   a length band), or the assembly drawing's own dimension. Which of those
   counts as a band for a chain is the policy question.
3. **A part identity nobody has confirmed.** The VPA rod-end bearing's part
   number (its 8.66/8.71 mm band equals MS14101-4's to the digit, in
   `docs/tolerance_stacks/stack_vpa_output_to_pitch_plate.json`). Also the
   VPA's real moving output member (rows 38/39 of
   `docs/topologies/topology_pitch_system.json`). These are facts only Jeff
   or a drawing can give. They came off his task list because an agent must
   act on the answer, so the strategy session should ask him and then stage
   the edit. This overlaps
   `rotorkit/docs/issues/ISSUE_20260914_vpa_body_has_no_extractable_drawing_number.md`.
4. **Nowhere to say "incomplete".** `complete` and `excluded_terms` are
   fields of a check, so a study with `no_checks_reason` (the end-stop
   travel study, which is wholly placeholder) cannot be marked incomplete
   without inventing a limitless check. This repo's no-inventing rule
   forbids that.

## Why one brief

Instances 1 and 2 are the same rule from two sides: how a callout that is
not a one-axis ± becomes a term. Instance 4 is what a study must say when the
rule leaves a term unbanded. Instance 3 is the same gap where the missing
thing is a part's identity, not a tolerance. Deciding 1 and 2 apart would set
two conventions for one question.

Dedupe: `BRIEF_20260916_drawing_arrival_gap_join.md` asks how a gap notices
that its drawing has **arrived**. This brief asks what a term may cite once
the drawing is in hand and still gives no band. `BRIEF_20260909_check_study_limit_ranged_value.md`
is about a check's **limit**, not its terms.

## What decomposition has to answer

- A zone-to-term rule: when is a geometric callout a `disk` or `sphere` over
  named components, and when is it one `band`? Who decides the hole axis?
- Whether a profile note, a model tolerance policy or an assembly dimension
  may stand as a band, and with which `kind`/`confidence`.
- A study-level `complete` or a criterion-less check shape. Pick one, and say
  what the viewer badges.
- Who asks Jeff the two VPA facts, and which handoff edits the stack and the
  topology once he answers.

## Out of scope

Unit checking between a band and the Jacobian column it scales. That is
staged as tactical work in
`docs/sessions/HANDOFF_20261021_the_kinematic_study_checks_its_run_its_units_and_shows_its_limit.md`.
