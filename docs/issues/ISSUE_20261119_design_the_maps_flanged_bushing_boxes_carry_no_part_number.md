---
type: chore
priority: low
status: deferred
area: design
reporter: agent
found_by: docs/sessions/HANDOFF_20261118_the_pitch_plate_is_an_assembly_with_its_bushings.md
defer_until: 2026-12-19
class: design_polish
resolution: deferred 2026-11-19 (triage): low, deferred by default
---

# Design: the map's two flanged bushing boxes carry no part number, and one bolt route cuts diagonally across the plate district

Seen in model v2's map after `the_pitch_plate_is_an_assembly_with_its_bushings`
(shots `docs/sessions/lessons/shots/the_pitch_plate_is_an_assembly_with_its_bushings/01_landing_3840_side_by_side_map.png`
and `02_pitch_plate_district.png`):

- **No number on the flanged bushings.** Every other box in the pitch plate
  district puts its number above its name: 215735-001, 214820-002 and so on.
  "flanged bushing, tangential link" and "flanged bushing, pitch link" show
  the name alone. These two parts have no `drawing` field, because NAS77A3-015A
  is a spec number. So the box cannot say which of the district's bushings is
  the NAS77 one. Show the spec number in the number slot.
- **One diagonal route.** The pitch link's straight-bushing-bore to
  flanged-bushing-bore route (`pitch_link_straight_bushing_bore_to_flanged_bushing_bore`)
  runs as one long diagonal. It goes from the pitch-link straight bushing at
  the top right to the bottom lane by the tiny pitch-link flanged bushing box,
  and crosses the assembly's dotted outline and the tangential link's routes.
  Every other route in the district is orthogonal or a short stub. It passes
  the map's notes, which check only routes through boxes, but it is the line
  the eye follows first.

These are judgement calls, not named-rule violations. Neither one blocks
anything.

## Addendum 2026-11-19 (walk `the_walk_reads_the_binding_flow_and_the_pitch_plate_on_the_merged_page`)

The tree has the same gap: under 215177-001 the two members read "flanged
bushing, pitch link" and "flanged bushing, tangential link", with no number.
Every sibling row leads with its number (215735-001, 214820-002). v2's
`display_name` does carry "NAS77A3-015A flanged bushing, pitch link". The
number is dropped because the part has no `drawing`, the same cause the map
has. One fix, two surfaces. Shot `02a_attach_bore_two_sets_disagree_crop` in
`docs/sessions/lessons/shots/the_walk_reads_the_binding_flow_and_the_pitch_plate_on_the_merged_page/`.
