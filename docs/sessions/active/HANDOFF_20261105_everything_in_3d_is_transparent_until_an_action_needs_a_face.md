---
priority: high
depends_on: []
model: opus
hitl: false
---

# HANDOFF 2026-11-05 — everything_in_3d_is_transparent_until_an_action_needs_a_face: opaque parts are a regression, a hidden body leaves no copy behind, and an action dims whatever it is not about

Source: Jeff's forge note `20261105T164140_sm8hkc` (2026-11-05), "3d view": "After the latest
updates, a bunch of the parts came in opaque, including housing parts which obscure the rest of
the model. The 'base - 3 parts' rigid body is opaque for some reason, and then when I hide it
there is a second, transparent copy still visible. This is the opposite of the direction we're
trying to go. Everything should be transparent by default, and any time you try to perform an
action such as binding a face it should hide and/or dim anything in the view that is irrelevant
to what you're trying to do so that it is as easy as possible to see and select the desired
surfaces." Baseline: master after the 11-03 batch. Opacity is `scene.setGhost`
(`apps/annotate/scene.js:723`; `GHOST_OPACITY` 0.22, `ARMED_GHOST_OPACITY` 0.07,
`SWEEP_GHOST_OPACITY` 0.12); `AA.DEFAULT_TRANSPARENT_PARTS = true` (`commands.js:1073`); a
study's scope is `applyPartScope` (`app.js:371`) via `AA.planPartScope` (`commands.js:488`:
targets solid, the rest ghost or hidden); repeats share geometry and material (`_setRepeats`,
`scene.js:632–710`); a body checkbox hides occurrences by key (`setOccurrencesVisible`), and a
node whose key is null cannot be hidden by key (`_applyVisibility`, `:622`). "base · 3 parts" is
`AA.sweepBodyRowWords` (`sweep.js:1407`). Scope: `apps/annotate/scene.js` opacity and visibility,
`applyPartScope`/`planPartScope`, and the body rows' hide behaviour. Do NOT touch the rail's
candidate lists or scroll (owned by `the_rail_holds_still_and_takes_the_face_jeff_picked`), the
palette (`the_dag_is_coloured_by_a_chosen_attribute_and_spaced_to_taste` colours bodies; you
set opacity, it sets hue), or the topology.

## Deliverables

1. **Find the regression.** Reproduce on the live kinematic study from the viewer's topology
   page: which parts are solid at rest, and which code path made them so (`planPartScope`'s
   targets, `isolate parts` from `every_study_opens_in_3d_showing_only_its_parts`, or a sweep
   override). State the rule the code now follows and the one it should: **at rest every part is
   ghost**; a part is solid only while an action names it.
2. **Hiding a body hides every drawn copy of it.** Reproduce "hide base leaves a transparent
   copy": the likely causes are a repeat occurrence drawn from the shared geometry, or an
   occurrence whose key is null. Whatever it is, a hidden body draws nothing, and the lesson
   says which it was.
3. **An action isolates.** Arming a pick, taking a candidate, hovering a candidate row, or
   selecting a grid row: the parts the action is about are solid, their near neighbours (the
   other end of the edge, the contacting part) ghost, everything else hidden or at
   `ARMED_GHOST_OPACITY`, and the camera frames the solid set. Leaving the action restores rest.
   The gesture table in `docs/ANNOTATION_SURFACE.md` ("Picking a face — the gestures") is
   updated to say so, once.
4. **Housings never hide the mechanism at rest.** If a housing (the gas-spring mount, the
   piston cover) must be drawn, it is ghost; if a study does not cite it, it is hidden.

## Definition of done

- Screenshots on the kinematic study: at rest (all ghost), base hidden (nothing left of it),
  a pick armed on the pitch-link end (link and plate solid, the rest dimmed), after the pick.
- A browser check asserts the rest-state opacity of every drawn mesh on the kinematic study
  and that a hidden body contributes zero drawn occurrences.
- Annotate and viewer browser tiers green.
- Lesson (`docs/sessions/lessons/LESSONS_20261105_everything_in_3d_is_transparent_until_an_action_needs_a_face.md`):
  the regression's commit and cause, the duplicate-copy cause, the opacity table by state.
