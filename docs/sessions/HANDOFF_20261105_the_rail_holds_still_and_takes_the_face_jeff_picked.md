---
priority: high
depends_on: []
model: opus
hitl: false
---

# HANDOFF 2026-11-05 — the_rail_holds_still_and_takes_the_face_jeff_picked: the binding rail keeps its scroll, frames the instance the run moves, keeps the second face pickable after the first, and lists bodies only under Bodies

Source: Jeff's forge note `20261105T164140_sm8hkc` (2026-11-05), his second live walk of the rail,
quoted in full because it is the specification:

> Looking at the first joint: plate slide - slide base, the wrong part is selected (the hub). The
> gas spring bushings are mounted to the gas spring mount, not the hub. The next one: actuator
> driver base: what does this even mean? The joint binding is still extremely screwy/buggy. I
> tried to bind the pitch link, and the viewport snapped to the wrong pitch link. I was able to
> rotate the view around to the correct pitch link (the one that the skeleton linkage is actually
> bound to), and selected the upper link spherical face. As soon as I clicked "take", the whole
> menu jumped and the option to select the lower spherical surface (the one I was about to select)
> disappeared and was replaced with a "pitch link length between spherical centers", pre selected
> (re-pick). Not sure what happened, it seems like by selecting the first surface, the second one
> auto-selected by process of elimination, but why was it replaced with a length selection? There
> are also random lines for 213862-002 (the pitch link assembly body) and MS14101-3 (spherical
> bearing) under the pitch link length. Why is this body shown down here under the joint selector
> section while all the other bodies are shown up top (under "bodies" where they belong)? Then I
> selected/expanded the tan link joint, and the entire menu jumped to a random scroll location
> where the joint I just expanded wasn't even visible, so I had to scroll back down to it. OK, I
> think I figured it out and was able to get all four spherical joints selected. The second joint
> changed formatting (turned orange) and the menu jumps around whenever you interact/expand
> elements.

Baseline: master after the 11-03 batch plus linkage's `plate_slide_names_the_bushings_and_the_piston_body`
(completed 2026-11-05: `linkage/vpa.py` `JOINT_FEATURES` now names 213668-002's bushings against
214700-002; the rail reads joint ends from the sweep artifact's `geometry.features[]`, so the
"hub" Jeff saw is the pre-11-05 artifact until the sweep is regenerated into
`C:\workspace\tolstack\data\inbox\linkage-sweeps\`). What the code says today (measured
2026-11-05): nothing in `apps/annotate/*.js` saves or restores the rail's scroll — `repaint()`
rebuilds the rail, so a twisty, "show all" or `take` resets `scrollTop`; `AA.planBindChoices`
(`commands.js:924`) preselects the remaining end once one is bound (documented in
`docs/ANNOTATION_SURFACE.md:259`); an edge feature's Pick on `pitch_link_length` leaves sweep mode
for the bind form (`docs/issues/ISSUE_20261029_an_edge_feature_and_a_contributor_pick_still_leave_sweep_mode_for_bind_mode.md`),
which is the "length selection" Jeff met; joint rows are worded by `AA.sweepJointRowWords`
(`sweep.js:~1414`) from the two bodies a joint joins, which is where "actuator driver base" came
from (it appears in no document); MS14101-3 is two solids under `213862-002.1` and travels with
the link (`ISSUE_20261001_a_sweep_links_bearings_travel_with_the_link_not_the_body_they_are_pressed_into.md`);
`take` runs `cmdTake` (`app.js:3848`) → `answeredAtEnd` (`:3821`) → `renderSweepRail`. Scope:
`apps/annotate/sweep.js`, `app.js` rail rendering and commands, `commands.js` bind planning,
and the camera framing on a pick. Do NOT restyle the rail (owned by
`the_rail_reads_as_a_tree_of_bodies_joints_and_faces`, which depends on this), do not touch
opacity (`everything_in_3d_is_transparent_until_an_action_needs_a_face`), the grid, or linkage.

## Deliverables

1. **The rail holds still.** Expanding a joint, hovering, taking a face, "show all": the rail
   keeps its scroll position and the row the user acted on stays where it was on screen
   (patch the DOM or restore `scrollTop` after `repaint()`; measure which). A newly expanded
   joint is in view after the expand.
2. **The camera frames the instance the run moves.** A pick on the pitch-link end frames the
   pitch-link occurrence the sweep poses (blade 1's), not the first occurrence in the mesh. Same
   rule for every joint with repeated occurrences.
3. **After the first face, the second is still a face pick.** When one end of a two-end joint is
   bound, the rail shows the other end's candidate list preselected for picking; it never swaps
   in an edge-feature row (`pitch_link_length`) and never leaves sweep mode. The 10-29 issue
   above is resolved by this or re-filed with what remains.
4. **Bodies live under Bodies.** The pitch-link assembly (213862-002) and its bearing (MS14101-3)
   are rows under Bodies with the others; under a joint only its two ends and their candidate
   faces appear. If the pitch link is a body the run moves, it is a body row.
5. **A joint row names its two parts.** `AA.sweepJointRowWords` prints `<part number> <plain
   joint word> <part number>` (e.g. `213668-002 slide 214700-002`), never a body id or a
   composed phrase like "actuator driver base". The same words appear in the grid's joint row
   and the DAG's joint hover (the 11-03 "joint is the node" handoff put the glyph there; this
   puts the words).
6. **The plate slide reads bushings against the piston body** on the rail: regenerate the
   sweep artifact from linkage's completed handoff into the main checkout's
   `data/inbox/linkage-sweeps/` and show the row.

## Definition of done

- Filmstrip (`scripts/filmstrip.mjs`) of: expand tan-link joint → take upper pitch-link face →
  second face list shown → take → both bound, with the rail's scroll unchanged across the
  sequence; attached to the lesson.
- Browser checks: scroll position preserved across a `take`; after one end is bound the other
  end's list is rendered and no edge-feature row is; 213862-002 appears once, under Bodies.
- Annotate tests and browser tier green; the 11-05 `the_annotator_reads_a_nodes_declared_face`
  guards keep their values.
- Lesson (`docs/sessions/lessons/LESSONS_20261105_the_rail_holds_still_and_takes_the_face_jeff_picked.md`):
  what each of Jeff's six sentences turned out to be (bug, documented behaviour, stale
  artifact), with the commit or line that caused it; what "turned orange" was.
