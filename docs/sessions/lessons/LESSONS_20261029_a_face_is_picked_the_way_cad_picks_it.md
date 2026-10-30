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

  > **Correction, 2026-10-29 (review).** The count does not re-derive. The
  > topology has **34** two-part nodes, and only **20** are named "X against
  > Y". Jeff's bore ("hub blade-1 root bearing bore") is one of the 14 that
  > aren't, so the convention as stated covers neither it nor them. For those
  > 14 the first-part order is unverified:
  > `docs/issues/ISSUE_20261029_an_armed_pick_assumes_the_face_is_on_the_nodes_first_named_part.md`.
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

## Verification record

All from the handoff worktree, reading the main checkout's data (`--repo`),
with `node_modules` junctioned in and removed before hand-back.

- `node apps/annotate/run_tests.cjs`: 258/258.
- `node apps/viewer/run_tests.cjs`: 510/510, node-fs `[real]` tier skipped
  (no projection in a worktree — the documented worktree red).
- `PYTHONIOENCODING=utf-8 C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`:
  `2 failed, 1682 passed, 1 skipped, 2 deselected` in 602 s (serial; no xdist
  in the venv). Failures: `test_viewer_js_suite` (the worktree skip above) and
  `test_browser_runner[throw-True]`, which passed on a rerun and is
  `ISSUE_20261022_the_browser_runner_kill_witness_reddens_under_load_...`.
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`:
  35/36 suites in 1123 s. The one red, "3D pane follows the selection", was 32/32
  run alone before and after; its four failures share one un-waited lookup
  (`ISSUE_20261029_four_3d_pane_nav_gesture_checks_fail_together_when_the_bodies_resolve_late.md`).
  After the run, "annotate armed pick" (17/17) and "topology http" (216/216)
  were re-run on the fixed checks.
- `node scripts/run_mutation_witness_tests.mjs --changed-since integration --repo C:/workspace/tolstack`:
  58/60 witnessed, 60/61 reached, 1 left to the sweep (budget). Both NOT
  WITNESSED were this handoff's own specs and both were test-side: orbit
  damping made "the camera moved" true with framing deleted, and a missing nav
  divider aborted the suite before its check reported. Fixed; those two, the
  two camera-restore specs and the one left to the sweep re-checked with
  `--only`: all WITNESSED.
- The witness gate measured 36m27s wall (over its 30-min merge budget,
  appended to `ISSUE_20261029_a_witness_gate_recorded_over_budget_counts_its_browser_slot_queue.md`);
  pytest 602 s (over the 10-min default budget by 2 s, appended to
  `ISSUE_20261022_the_default_test_tier_runs_past_its_ten_minute_budget.md`).

**Lesson from the gate:** a camera check that compares "before" against
"after" is not testing framing when the scene's own framing is still damping;
read the arm's saved camera, and assert the orbit target sits on the part.
