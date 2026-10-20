---
type: chore
priority: med
status: resolved
area: topologies/end-stop-travel
reporter: agent
found_by: docs/sessions/HANDOFF_20261016_the_travel_between_the_end_stops_is_a_study.md
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

## Resolved 2026-10-20 (handoff the_travel_chain_cites_its_three_drawings)

The three drawings landed and drawing-checker extracted them the same day: runs
`20261020_134240_214698-002-A` (214698-002 A), `20261020_134300_214699-002-A`
(214699-002 A) and `20261020_134315_214958-002-A` (214958-002 A). The lower head
(2.491 ±0.050) and the cover (82.154 ±0.020) are now `drawing`-cited; the upper head's
step height and the mount's thickness have no callout on their drawings and stay
placeholders, filed as
`ISSUE_20261020_two_end_stop_travel_terms_have_no_dimension_on_their_drawings.md`.
