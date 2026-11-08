---
type: chore
priority: low
status: open
area: topology/interface
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261106_the_kinematic_study_reads_the_republished_sweep_and_its_checks_match_by_id.md
---

# Two edges still carry `cylindrical_slide`: the real slide and the hub coaxiality

Linkage asked that only `pitch_plate_slide_bushings_to_piston_body` claim to be the plate slide. `hub_to_pitch_plate_spindle_coaxiality` still has `interface: cylindrical_slide` because `AXIS_INTERFACES` in `tolerance_stack/interface_contact.py` judges an edge as axes by that word, and `test_real_the_hub_and_pitch_plate_coaxiality_is_judged_as_axes`, the annotate and browser suites depend on it.

Option: add a separate interface word for an axis-to-axis comparison, move `AXIS_INTERFACES` to it, and change the coaxiality edge. It touches the vocabulary (`INTERFACE_KINDS`, generated JS, glyphs). Recommendation: do it only if the hub edge reading as a slide confuses a reader; otherwise leave.
