# LESSONS 2026-10-29 — a_face_is_picked_the_way_cad_picks_it

Handoff: `docs/sessions/HANDOFF_20261029_a_face_is_picked_the_way_cad_picks_it.md`.
A joint end's Pick in sweep mode now arms a CAD-style pick (pose, isolate,
filter, pre-select, click binds, Esc); the shell's nav resizes.

## Why there were two row templates

Not two code paths drawing rows — one row, with a branch appended *after* its
button. `featureRow` (apps/annotate/app.js) built `[name + "no face bound"]
[Pick]`. When Pick's `goto` was refused (`AA.planGotoRefusal`: the edge names
no part with an installed mesh), `appendPickNote` appended the reason AND one
link button per end of the edge, labelled with the interface's full name
("hub spindle bore axis -- the gas-spring b…"). The shell's mirror
(`views/nav.js` `sceneControls`) puts every button after the text in one flex
line, so two long-named buttons took the line and squeezed the row's own name
to nothing: what Jeff read as "Pick jumped to the left of the text" was
`[Pick][long link][long link]` with an invisible name. The blade-hinge row
had no refusal note, so it kept the first shape. Contributor rows had the same
note-after-button shape. Now: the reason IS the state line (inside
`.tree-row__text`), the link buttons are gone, and every row is
`[name / state line][actions]`.

Jeff's "it gave a warning about the mechanism being in the wrong location" was
the frame-rule gate line, not Pick; arming now goes to the as-modelled frame
itself so that path never asks.

## Decisions not in the handoff

- **Which part an end is picked on.** First version: the node's parts that the
  bound-through edge also names. On P2 that armed the *blade root* for "hub
  blade-1 root bearing bore", because the end is bound through
  `blade_root_bearing_to_pitch_arm_seat` (part `blade_root`). The topology's
  own convention settles it: all 35 two-part nodes are named "<first part's
  face> against <second part>", so the face is on the node's first-named part
  with an installed mesh (`AA.pickEndPartIds`), edge's part only when the node
  names none. A `[real]` check pins Jeff's bore.
- **Edge features and contributors keep the bind-mode jump.** An edge has two
  ends and the 2026-10-21 wrong-end rule forbids a default between them, so
  arming needs an end; only node features (rows with `data-direction`) arm.
  Filed: `docs/issues/ISSUE_20261029_an_edge_feature_and_a_contributor_pick_still_leave_sweep_mode_for_bind_mode.md`.
- **Unbind is not built** — there is no retraction verdict
  (`docs/issues/ISSUE_20261029_an_armed_pick_cannot_unbind_because_the_event_schema_has_no_retraction.md`).
  A click on the already-bound face writes nothing and says so; any other face
  supersedes the end's one standing binding.
- **Surface class words are the suggestion engine's** (`AA.SURFACE_WORDS`:
  "ball-shaped", not the handoff's "spherical") — one vocabulary per surface.
- **Esc from the shell.** Jeff presses Pick on a *mirrored* row, so focus is in
  the parent page and the iframe never sees the key. The shell posts
  `arm off` on Esc whenever a mirrored row carries a pressed button
  (`VA.sceneRowsPressed`); `arm off` is safe outside sweep mode.
- **The armed row wraps.** With Cancel + the ghost/hide toggle, a 260px rail
  left the name a few pixels (screenshot-checked); the armed row now wraps its
  controls onto their own line, in the annotator and in the shell's mirror.
- The shell's nav divider is the preview pane's `.tv__divider` control, not the
  annotator's `.an__resize` the handoff named: the rail Jeff sees embedded is
  the shell's nav, whose width the shell owns.

## The ghost opacity

`ARMED_GHOST_OPACITY = 0.07` (scene.js), against the ordinary see-through
`GHOST_OPACITY = 0.22`, applied with depth write off. On P2 at the as-modelled
frame, armed on the hub bore: the hub is the one solid body, its root bearing
bore ring reads clearly, the pitch plate and linkage read as faint outlines,
and the blade — the biggest body, nearest the camera — is still a visible blue
wash because its translucent layers stack, but it no longer hides the hub.
Lower would lose the where-am-I context; at 0.22 the blade hid the bore.

## Gesture table as shipped

`docs/ANNOTATION_SURFACE.md`, "Picking a face — the gestures" is the one
statement. In brief: Pick arms (pose, isolate, frame); hover pre-selects
(yellow wash + outline, crosshair, state line "face N · <class> · r X mm");
click on it binds (toast, "bound · face N", disarms, bound tint); click on
another part flashes "not on <part>"; empty space and orbit do nothing; Esc /
Cancel / `arm off` / any transport verb end it and restore scene and camera;
the bar's "back to the sweep" returns to the frame the arm left.

## Gotchas for the next agent

- The mock demo triangle is flat in its own XY plane and `_frameBox` looks
  along +Y, so it is framed **edge-on**: a hover aimed at its centroid hits
  nothing. The browser check tilts the camera before hovering.
- The mock bracket/plate share the triangle's *manifest* but not its buffers,
  so a manifest centroid is not on their geometry — aim at buffer vertices.
- Arming captures the scene *after* seeking to the as-modelled frame, so sweep
  mode's own see-through ghost (0.22) on still parts is what gets restored, not
  the pre-sweep solid state. A restore check must compare against "not faint".
- The gap-edge refusal check (`[real] Pick on a gap edge that names no part…`)
  now drives `goto` through the verb: every rail row on that edge is a joint
  end and arms on the hub.
- The browser tier needs `node_modules`: a junction to the main checkout's,
  made and removed in this session (`LESSONS_..._annotate_affordances_...`).
