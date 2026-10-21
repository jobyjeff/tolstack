---
type: bug
priority: med
status: triaged
area: tolerance_stack/kinematic
reporter: agent
found_by: docs/sessions/HANDOFF_20261016_a_kinematic_study_folds_the_sweeps_jacobian.md
handoff: docs/sessions/HANDOFF_20261021_the_kinematic_study_checks_its_run_its_units_and_shows_its_limit.md
---

# A kinematic study never checks a band's units against the Jacobian column it scales

`tolerance_stack/kinematic.py` records each contributor's `band_units`. For a
`dimension_ref` that is the source topology's `units`; for an inline dimension
it is the `units` the study gives. Nothing compares `band_units` with the unit
of the sensitivity column the band multiplies. The `linkage-sweep/v1` artifact
declares no per-parameter units: P2 has `measures.units` and no
`geometry.units`. The handoff described the entries as "deg per mm for every
length-like parameter".

Today this is right by coincidence. Both `pitch_system` and `vpa_pitch_linkage`
are `mm`, so every band in the first study is in mm. It goes wrong silently in
two foreseeable cases:

- **A band borrowed from an inch topology**, or an inline band written in
  inches. The worst case would be off by 25.4×, every test would still be green,
  and every verdict would look plausible.
- **The `disk` zone that `docs/DAG_TOPOLOGY.md` names as the way to express
  bushing tipping.** It goes "on the plate slide's axis components". Those are
  direction-cosine components (`plate_slide.axis_a[*]`) and have no unit, while
  a cited clearance band is in mm. Turning a clearance into a tilt needs a
  bushing length, which is a second cited value. The doc's sentence "it waits
  only for a cited clearance band" understates that. A study author who follows
  it literally gets a dimensionally wrong `Term`, and the load does not refuse
  it.

Suggested shape: a parameter-unit vocabulary per label kind (length vs.
direction component vs. driver), with a refusal at load when `band_units` does
not match. Better still, have linkage publish `geometry.units[]` next to the
`geometry.features[]` its sibling handoff adds. Then correct the DAG_TOPOLOGY
sentence about item 2 to name the second value it needs.
