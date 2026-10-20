---
type: chore
priority: med
status: open
area: topologies/end-stop-travel
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261020_the_travel_chain_cites_its_three_drawings.md
audience: strategy
---

# Two terms of the end-stop travel chain are model-defined and have no band to cite

After the three drawings were cited on 2026-10-20, two of the study's four edges still
carry `kind: assumed`, `confidence: untraced` and a ±0.05 stand-in band
(`study_vpa_pitch_linkage_travel_between_end_stops`, worksheet section 3):

| Edge | Value | Why no citation | Outcome (SOP) |
|---|---:|---|---|
| `piston_head_upper_thickness` (lower face to the step face, face 110) | 6.556 | 214698-002 A dimensions diameters, the recess floor (2.61 ±0.05), a flange feature (3.708 ±0.127) and an overall (13) reference; note 5 defers the rest to the model | absence |
| `gas_spring_mount_flange_to_end_stop` | 8.667 | 213668-002 A.1 sheets 1-2 hold no axial flange-to-stop length; drawing-checker's run `20260819_150314_213668-002_A.1_MOUNT,_GAS_SPRING,_PROPELLER` extracted no dimensions, so the read was by eye on the page renders | absence |

These together are 0.10 mm of the study's worst-case band (±0.170), so the interval
is mostly stand-in. Closing them needs a source that prints a tolerance for a
model-defined surface: a datum-referenced profile or position callout on the part
drawing, a model tolerance policy (the drawings' `⌓0.5 UNLESS OTHERWISE SPECIFIED`
profile note is the nearest thing, and it is a profile, not a length band), or the
assembly drawing's own dimension. Which of those counts as a band for this chain is a
tolerancing-policy question, hence `audience: strategy`.

drawing-checker's extraction of 213668-002 A.1 has no `dimensions` array at all
although the sheets print many; if the mount's thickness is dimensioned somewhere the
extractor skipped, that is an extraction gap to file there. Not established here.
