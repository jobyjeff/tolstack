---
type: bug
priority: med
status: open
area: viewer shell / feature body candidate list
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261118_the_walk_reads_the_binding_flow_and_the_pitch_plate_on_the_merged_page.md
---

# A joint end's feature body in the tree shows none of the contact faces the pane holds for its edge

Seen on the merged page (`integration` `a7a05123`, scratch root
`data/scratch/walk1118`, model v2) during the walk
`REVIEW_20261118_the_binding_flow_and_the_pitch_plate.md`.

**What the page does.** When neither end of a gap edge is bound, the feature
body in the left tree reads `not bound` and `Pick a face`, and nothing else.
Measured on six ends with both sides unbound:

- `blade_root@blade_root_pitch_arm_locating_boss` and
  `pitch_arm@pitch_arm_blade_root_bore` (edge `blade_root_boss_in_pitch_arm_bore`)
- `piston_head_lower_214699_002@piston_head_lower_pilot_bore` and
  `gas_spring_piston_214700_002@piston_body_head_locating_boss`
  (edge `piston_body_boss_in_lower_head_pilot`)
- `flanged_bushing_nas77a3_015a@pitch_link_flanged_bushing_od` and
  `pitch_plate_215735_001@pitch_plate_link_flanged_bushing_bore`
  (edge `pitch_link_flanged_bushing_press_fit`)

Arming the pick adds nothing: the body reads "at the as-modelled pose for
picking" and Cancel (shot
`docs/sessions/lessons/shots/the_walk_reads_the_binding_flow_and_the_pitch_plate_on_the_merged_page/05a_arm_bore_armed.png`).

**What the data holds.** The rebuilt `contact_suggestions.json` has status
`ok` and at least one candidate for 20 of v2's 21 gap edges. For
`blade_root_boss_in_pitch_arm_bore` the candidate is exactly the right pair:
faces 1060, 1061, 6439, 6440, 6666, 6667 on the blade root and 253, 254 on the
pitch arm, axis offset 0.0001 mm, clearance 0.015 mm. The pane has these
rows: its published `__embedTree` element row for
`piston_body_boss_in_lower_head_pilot` carries `twisty: "show the suggested
faces"`. So `AA.endCandidates` (`apps/annotate/sweep.js`) reaches the pane's
element list, and the shell's feature body never shows it.

Ranked mates do reach the body, once one side is bound (the arm bore bound,
the boss's body listed eight "coaxial with pitch arm" rows). So today the
first end of every joint is a raw pick with nothing offered.

**Why it matters.** It is the main hunt in binding a joint from nothing. On
blade root ↔ pitch arm, the first end took an orbit to find, and the clamp
face took six missed drags, two zoom notches and a half turn. The contact
engine had both faces ready.

**Where to look first.** `CLAUDE.md` says that since 2026-11-03 "every end
with a proposal or contact faces opens to that list". Check whether that
holds for the shell's feature body under a part, or only for the pane's
element list and the interface rows. `featureRow` in `apps/annotate/app.js`
(about line 4171) builds a feature's rows from ONE edge end (`li.dataset.edge`).
The events this walk wrote show which edge that was. The clamp face's bind was
named `pitch_arm_bore_to_clamp_face` and the boss's
`blade_root_bearing_to_pitch_arm_boss`: both are structural dimensions, which
carry no contact candidates. But the arm bore's bind was named for the gap
edge itself (`blade_root_boss_in_pitch_arm_bore`), and its body showed nothing
either. So the edge choice is one lead, not the whole cause. Also check that
`state.contactSuggestions` is loaded in embed mode.
