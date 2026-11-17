---
priority: high
depends_on: [the_window_resize_reclamp_holds_on_a_cold_run]
model: opus
hitl: false
---

# HANDOFF 2026-11-17 — the_map_is_portrait_as_jeff_drew_it: the map is re-placed tall, so it fills the Side by side region

Source: Jeff, 2026-11-17, after using the map on `master`: "I really like the
new subway map style dag/graph … flip the map/dag to be portrait instead of
landscape so it fits in the side-by-side view mode more nicely." This answers
decision 81 of the map handoff (one arrangement, authored wide): there is
still **one** arrangement, and it is portrait. Baseline: tolstack `master`
with `the_window_resize_reclamp_holds_on_a_cold_run` merged. First of a chain
of six; the next link (`a_joint_says_what_kind_it_is`) edits the model and the
symbol table, so leave both alone here.

Scope: `docs/topologies/map_vpa_end_stop_v2.json` (`places` only),
`apps/viewer/map.js`, `apps/viewer/views/map.js`, `apps/viewer/map.css`, the
map's own browser suites and witness specs, the fixture's demo layout in
`apps/viewer/topology_fixtures.js` if it must follow, `docs/DAG_TOPOLOGY.md`
"The map", `apps/viewer/README.md` "The map". Do NOT touch
`docs/topologies/topology_*.json`, `tolerance_stack/`, the layout file's
`symbols` key, Classic (the rails drawing and its suites), the grid, or
`apps/annotate/`.

**Jeff's real binding log is read-only.** `C:\workspace\tolstack\data\inbox\feature-identity\`
— count its files before you start and when you finish and record both in the
lesson. Anything that binds goes to a scratch data root
(`--data-root C:\workspace\tolstack\data\scratch\<your slug>`).

## What is measured today (the walk of 2026-11-16, `docs/sessions/lessons/REVIEW_20261115_the_map_and_the_binding_flow.md`)

The wide arrangement is 5 columns × 3 rows of 420 × 340 cells. Fitted:

| Window · view | Region | Zoom | Smallest label | Reads? |
|---|---|---|---|---|
| 3840 · Side by side | 1201 × 2160 | 0.566 | 9 px | small; a strip across the middle third, top and bottom empty |
| 3840 · DAG view | 2390 × 2160 | — | — | yes |
| 1920 · Side by side | 485 × 1080 | 0.229 | 4 px | no |
| 1920 · DAG view | 958 × 1080 | — | — | borderline |

Side by side is the default view, and it is the one that reads worst.

## Deliverables

1. **v2's places are re-authored tall, after Jeff's own sketch.** The
   reference is his drawing,
   `C:\workspace\dispatch\docs\strategy\drafts\mockups\tolstack_tube_map_20261109\jeff_sketch_20261110.png`
   — read it with vision before placing anything. What it shows:
   - the **ground** body is one tall column on the left, read upward as the
     hardware stacks: hub at the bottom, tangential link mount on it,
     gas-spring mount on that, piston cover on top;
   - the **pitch plate** body is a column on the right, in the same sense:
     pitch plate at the bottom, piston body, lower head, upper head on top —
     so the cover ↔ upper head end-stop route runs across the top, and the
     feather stop and the slide cross the middle between the two columns;
   - the **tangential link** sits between the tangential link mount and the
     pitch plate; the **pitch link** hangs under the pitch plate; **blade 1**
     is at the bottom right with the pitch arm above the blade, and the hub ↔
     blade joint runs along the bottom.

   A starting point, as a suggestion (three columns, seven rows; the reference
   drawing decides): cover `[0,0]`, gas-spring mount `[0,1]`, tangential link
   mount `[0,3]`, hub `[0,6]`; upper head `[2,0]`, lower head `[2,1]`, piston
   body `[2,2]`, pitch plate `[2,3]`, pitch link `[2,4]`, pitch arm `[2,5]`,
   blade `[2,6]`; tangential link `[1,3]`. Iterate it the way the map handoff
   did: draw the real v2 model through the renderer into a 1201 × 2160 box,
   read the PNG with vision against the sketch, fix, redraw. Keep each
   iteration's PNG in `docs/sessions/lessons/shots/<slug>/reference_0N_1201x2160.png`
   with a one-line row in the lesson saying what changed.
   Requirements the arrangement must meet: no route drawn through a box it
   does not end on (the layout's defect notes stay at zero), every
   between-body symbol in the gap between districts, the hub ↔ tangential link
   mount bundle still three parallel routes with three symbols.
2. **Whatever in the layout code assumed a wide arrangement is made neutral.**
   Pin sides, the symbol's turn on a vertical route, a district's label, the
   child boxes of an assembly ("in a row under the parent"), label wrapping,
   the fit. Read the result; do not assume. If an assembly's children read
   better beside or below the parent in a tall column, change it and say so.
3. **A jumper never crosses a part's number or name** (the walk's S1: on
   214700-002, both piston heads and 212956-005 the jumper strikes through the
   text). With pins on the top and bottom of a box in a stacked column this
   gets worse unless it is fixed here. How is yours — a name band the jumpers
   keep out of, jumpers routed round the text, the text moved — but the check
   is by geometry (no jumper segment intersects a text box) on v2 and on the
   fixture, and by vision on the shots.
4. **A click inside a part's box selects the part.** Today only the border and
   the name are controls and the interior is pan space, so a click inside the
   box does nothing (the walk's shot `21_map_click_inside_hub_box_selects_nothing`).
   A press that moves is still a pan; a press that does not move selects the
   part, exactly as a click on its name does. Same for a district's interior
   and its body, if that reads right when you try it — say in the lesson what
   you chose and why.
5. **The six regions are measured again**, on the real page with Map selected
   (the map handoff's `tests/debug_map_shots_20261116.mjs` is the tool): region
   size, fitted zoom, smallest label in px, symbol size in px, and "reads?" by
   vision, for 3840 / 5120 / 1920 wide × Side by side / DAG view. Put the table
   in the lesson beside the old numbers. Expectation, not a pin: at 3840 Side
   by side the fitted zoom is near 0.9 and the smallest label 13 px or more.
   In DAG view the map is centred in the wider region; nothing stretches.
6. **Docs say the one arrangement is tall.** `docs/DAG_TOPOLOGY.md` "The map",
   the layout file's own `provenance.arrangement`, `apps/viewer/README.md`.
   `docs/issues/ISSUE_20261116_what_the_map_does_not_draw_yet.md`: strike the
   "second, portrait arrangement" row with a dated note (answered by Jeff
   2026-11-17: the one arrangement is portrait).

## Definition of done

- `/tolstack/viewer/topology.html` on your branch, model "Propeller Pitch
  System", Side by side at 3840 × 2160: the map fills the region's height,
  every part name reads without zooming, no jumper crosses a name, a click in
  the hub's box selects the hub on all four surfaces. Shots at the six
  regions in `docs/sessions/lessons/shots/<slug>/`, read with vision.
- The exploratory click-around `CLAUDE.md` asks for, on the real projection,
  before the checks: hover and click every kind of thing on the map, wheel,
  drag, Fit, resize the window with the pane open and closed.
- Tests per `CLAUDE.md`'s table for a tactical session; every guard you add
  has its witness spec.
- Lesson (`docs/sessions/lessons/LESSONS_20261117_the_map_is_portrait_as_jeff_drew_it.md`):
  the iteration table, the six-region table old vs new, what in the layout
  code was orientation-dependent, the feature-identity file count before and
  after, and anything in Jeff's sketch the tall map still does not do.
