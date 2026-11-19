---
type: chore
priority: low
status: deferred
area: spec_library
reporter: agent
found_by: docs/sessions/HANDOFF_20261118_the_pitch_plate_is_an_assembly_with_its_bushings.md
defer_until: 2026-12-19
class: citation_authoring_gap
resolution: deferred 2026-11-19 (triage): low, deferred by default
---

# The pitch plate's four bushing fits wait on the NAS77 sheet and the 214820-002 drawing

Model v2's four new fits (`pitch_link_flanged_bushing_press_fit`,
`pitch_link_straight_bushing_transition_fit` and the two `tan_link_` twins) and
the two bushings' wall edges cite the plate's bore bands (215735-A sheet 2,
SECTION A-A: Ø7.950 +0.015/0.000 and Ø8.520 ±0.008) and record the bushings'
side as a gap:

- **NAS77A3-015A outside diameter / bore bands.** `data/inbox/specs/` already
  holds `JB_NAS77.pdf` and `RBC - Plain bearings (NAS77 p92).pdf`, and neither
  is read into the spec library (no NAS77 event under `docs/spec_library/events/`).
  A parse event for the -015A row closes the flanged side.
- **214820-002 outside diameter / bore / length.** Its drawing is not in
  `data/inbox/drawings/` (v1's part notes say the same). Acquiring it closes
  the straight side, and v1's untraced 4.76 length with it.

The meshes read 7.965 in 7.950 (an interference) and 8.506 in 8.520 (a
clearance at nominal, which a transition fit permits): evidence, never values.
