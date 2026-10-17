---
type: chore
priority: med
status: open
area: topologies/end-stop-travel
reporter: agent
found_by: docs/sessions/HANDOFF_20261016_the_travel_between_the_end_stops_is_a_study.md
needs: jeff
ask: Export drawings 214958-002, 214699-002 and 214698-002 as PDFs into drawing-checker's drawings inbox
---

# The end-stop travel stack has no drawing behind any of its four terms

`study_vpa_pitch_linkage_travel_between_end_stops.json` folds to 58.4866 mm
nominal, but every term is `untraced`: the two piston-head thicknesses and the
mount thickness are fits of installed meshes, and the piston cover length is
Jeff's single figure (~82.154) with no mesh and no drawing at all. All four
carry the same ±0.05 mm placeholder band, which says nothing about the hardware.

None of 214958-002 (piston cover), 214699-002 (lower piston head) or
214698-002 (upper piston head) is in drawing-checker's or tolstack's drawings
inbox (checked 2026-10-16). Forge todo `20261016T165622_zy675c` asks for them;
this issue is the repo-side record so the todo's answer has somewhere to land.

When they arrive: run them through drawing-checker, re-cite the four edges in
`topology_vpa_pitch_linkage.json` as `kind: drawing`, replace the placeholder
bands, and check the cover length against the mesh-free 82.154. The lower head's
lower face carries a flatness callout (Jeff) that has no home but a node note
today.
