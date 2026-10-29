---
priority: high
depends_on: [the_plus72_stop_is_the_travel_datum]
model: opus
hitl: false
---

# HANDOFF 2026-10-29 — a_face_is_picked_the_way_cad_picks_it: arming Pick isolates the part, filters selection to it, pre-highlights on hover, confirms on click; the rail is resizable and its rows never re-flow

Source: Jeff, live, 2026-10-29 strategy session
(`dispatch/docs/strategy/HANDOFF_20261029_strategy.md`), trying to bind a
joint end from the shell's KINEMATIC STUDIES rail (the embedded pane,
`apps/annotate/sweep.js` + `scene.js`):

> the left side menu needs to be draggable to resize, currently it clips off a
> bunch of text. Weirdly when I clicked pick, it gave a warning about the
> mechanism being in the wrong location, and when I clicked "go there" the
> left side menu changed, the "pick" button jumped to the left side of the
> text. When you go to pick a surface, it needs to filter the view to only
> show the body that the surface is attached to, currently you can't even
> select the surface you want because it's buried in the assembly. Or better,
> give an option to either hide all other bodies/parts, or show them with very
> low opacity with the body to pick from opaque, and have a selection filter
> so that you can only select surfaces from the actual part containing the
> interface. Also a hover over pre-selection so that you get some warning of
> whether clicking will actually do anything. Currently the entire system is
> extremely un-intuitive, because nothing gives any feedback before or after
> you clicked … The general gestures should be well understood from how most
> CAD programs work for surface selection, no need to re-invent the wheel.

Baseline: `master` with the datum handoff landed. Scope: `apps/annotate/sweep.js`
(the kinematic rail, Pick, the pose gate at ~line 1034 / `AA.SWEEP_GO_TO_POSE`),
`apps/annotate/scene.js` (hover, raycast, isolate/ghost, camera), `style.css`,
the pane-side rail width in `apps/viewer/topology_app.js` only if the rail's
width is owned there, `apps/annotate/tests.js`, `run_browser_check.mjs`,
`docs/ANNOTATION_SURFACE.md`. Do NOT touch the proposals read/write (the
next handoff builds on this one), the standalone page's chrome, or the
viewer's DAG/grid.

## What the screenshot shows (`images/3.png` in the session; reproduce it)

Kinematic study `vpa_pitch_linkage_blade_pitch_at_the_stops`, joints section.
The `plate slide` and `actuator` joints render their two ends as **Pick** at
the left and the truncated name at the right ("hub spindle bore axis -- the
gas-spring b…"), while `blade hinge` renders name first, then "no face
bound", then Pick at the right — two row templates in one list, after Jeff
clicked Pick, got "Face picking works at the as-modelled pose only — frame
80", clicked **Go there**, and the rail re-rendered in the other template.
The rail is ~330 px and clips every joint-end name.

## Decisions (made)

1. **One row template, in every mode, at every pose.** A joint end row is
   `[name — ellipsised with full text on hover] [state line] [action]`, with
   the action at the right, whether the sweep is at the as-modelled pose or
   not and whether the pane is in sweep or bind mode. The "Go there" prompt
   goes: **arming Pick moves the sweep to the as-modelled pose itself**
   (frame 80 on P2, the last frame), says so in the state line ("at the
   as-modelled pose for picking"), and offers "back to the sweep" when the
   pick ends. No modal, no re-flow.
2. **The rail resizes by dragging.** A `col-resize` handle on the rail's
   right edge (the shell's pane-divider pattern — `style.css` `.an__resize`
   and `app.js` ~line 3400 already do this for the standalone rail; make the
   embedded rail use the same handle), min 260 px, max half the pane, width
   remembered per viewer in `localStorage` (try/catch). Names still ellipsise
   past the width, never clip mid-glyph.
3. **Arming Pick isolates the part.** The end's part (the interface's part,
   from the topology edge's end) is drawn opaque at every occurrence; every
   other part is **ghosted** (very low opacity, no depth write) by default,
   with a one-click toggle on the armed row: **ghost others / hide others**
   (remembered). The camera frames the occurrence the node's body anchors.
   Ending the pick (bind, Esc, click the armed row again) restores what was
   shown before.
4. **The selection filter is the part.** While a pick is armed the raycast
   hits only that part's faces. A face on another part is not hoverable and a
   click on it does nothing but flash the state line ("not on
   <part name>"). Surface-class suggestion colours (planar / cylindrical /
   spherical) stay as today on the armed part.
5. **Hover pre-selects, exactly as CAD does.** Moving over a pickable face
   highlights it (a distinct pre-selection tint, the face's outline), the
   cursor changes to a crosshair, and the state line names it ("face 104 ·
   spherical · r 5.147 mm" — the fit the suggestion engine already computes
   for coloured faces, or the surface class alone). Moving over a face the
   filter rules out shows the default cursor and no tint. Nothing is
   pre-selected while orbiting (pick fires on release-not-press with slop, the
   10-21 rule, unchanged).
6. **The click confirms.** A successful pick: the face flips to the bound
   tint, the row's state line reads "bound · face 104" with the reviewer and
   time on hover, a brief toast names the write ("Bound hub spindle bore axis
   to face 104 of 215177-001"), and the pick disarms. A failed write: the face
   returns to pre-selection tint and the state line carries the reader-facing
   reason. A click on empty space while armed does nothing and keeps the arm.
7. **Standard gestures, named.** Left-click selects, Esc cancels, hover
   pre-selects, orbit never selects; a second click on the same bound face
   with the row armed offers "unbind" (writes the existing retraction). Record
   the gesture table in `docs/ANNOTATION_SURFACE.md` as the one statement.

## Deliverables

1–7 above, each with a browser check: one row template in both modes (DOM
shape equal), the resize handle changes width and persists, arming Pick
ghosts every other part and frames the end's part, a hover over the armed
part's face sets the pre-selection class and the state line, a hover over
another part does not, a click binds (scratch data root, never the real
inbox) and the row + toast read as specified, Esc restores the scene.

## Definition of done

- Jeff's reproduction: select the kinematic study, open the 3D pane, click
  Pick on `hub blade-1 root bearing bore`: the sweep goes to frame 80 without
  a prompt, the rail does not re-flow, the hub is opaque and everything else
  ghosted, hovering the bore pre-highlights it with its class and radius in
  the state line, clicking binds it and the row says so.
- `node apps/annotate/run_tests.cjs`, `node apps/viewer/run_tests.cjs`,
  `node scripts/run_viewer_browser_tests.mjs`, `PYTHONIOENCODING=utf-8
  venv-win/Scripts/python.exe -m pytest -q` green; witnesses
  `--changed-since integration` clean.
- Lesson: why the two row templates existed (which code path drew each), the
  ghost opacity chosen and how it reads on the 217755 assembly, and the full
  gesture table as shipped.
