# LESSONS 2026-10-26 — the_model_is_drawn_in_the_scene

The annotator now draws the whole topology on its parts: a dot at every
node's anchor and a line along every edge. This is the `model` layer. It is on
by default in sweep mode and sits behind a **Display** box in bind mode. Embedded,
it posts `annotate:anchors` to the shell after every drawn frame whose anchors
moved. All four deliverables are built. This lesson covers what the diff does
not say. The rules themselves are in `docs/ANNOTATION_SURFACE.md`, "The model in
the scene".

## Which nodes fell to which source on P2

Measured by the TRUTH suite on run `vpa-pitch-p2-20261016-235852`, against a
projection root built from this branch:

| source | count | nodes |
|---|---:|---|
| joint (the solver's point) | 4 | `pitch_link_lower/upper_sphere_centre`, `tan_link_lower/upper_sphere_centre` |
| section (+X bias) | 36 | everything else that has a mesh |
| bound | 0 | the live inbox has no binding; the TRUTH check's synthetic binding moves exactly one (`pitch_plate_link_attach_bore`) |
| origin (no anchor geometry) | 7 | `piston_cover_mount_flange_seat`, `piston_cover_end_stop_shoulder`, `vpa_end_stop_feature`, `piston_end_stop_face`, `piston_rod_end_bore`, `ring_gear_hub_seat`, `brake_hub_mount` |

All seven origin nodes have the same cause. Their part has **no installed mesh**:
`piston_cover_214958_002`, `vpa_208510_007`, `vpa_piston`, `ring_gear` and
`hydraulic_brake` resolve to nothing in the mesh list or the alias table. They
draw at the assembly origin in the warn colour and are `null` in the anchors
message, so the shell draws no leader to the pile. They will move to a section
anchor as soon as those parts are installed and aliased.

## Decisions the handoff left open

- **A fourth source ahead of (a).** The handoff orders the sources (a) binding,
  (b) section, (c) origin. It also says the link lines must stay
  "byte-identical" to the stick figure. A sphere centre fitted from a binding
  agrees with the solver's point to microns, not to the bit. So a node that the
  run's own `geometry.features` name as a **two-force link's** end
  (`<link>.point_a[…]` / `point_b[…]`) reads that end off the frame unchanged.
  `AA.modelWorldPoints` returns the frame's own array, not a copy, and a fast
  check holds that identity. Only link joints get this treatment. A hinge's
  node (`hub_blade1_root_bearing_bore`, `hub_spindle_bore_axis`) sits at the
  solver's axis point, which is the assembly origin, and anchoring there is
  exactly the ring-centre line Jeff asked to avoid.
- **The section plane goes through the occurrence's own box, not the body's
  frame origin.** Every solver body's frame *is* the assembly frame, because a
  pose maps the as-modelled frame onto itself. So "the plane through the body's
  frame origin" would be y = 0 for every body. That plane misses the pitch
  link at y ≈ −17 to −44. The plane is therefore the XZ plane through the
  middle of the anchored occurrence's box along Y. On the hub and the
  tangential-link mount (the rings round the spindle) that middle is y ≈ 0
  anyway.
- **The plane is nudged by a millionth of the span.** A mesh that is
  symmetric about its mid-plane has a row of vertices exactly on it. A seam
  whose two copies of that row sit at +0 and −1e-16 then gets cut on neither
  side. The fast tier's ring check lost its +X wall this way before the nudge
  went in.
- **Cut connectivity is by quantised position (1 µm), not by vertex index.**
  A mesh's vertices are per face, so the cut through a ring's wall and the cut
  through its top face share no index.
- **The ladder's span is the whole cut's height, not the chosen region's.**
  The hub is 286 solids, and its +X-most region is a 12 mm boss at x = 176.
  A ladder squeezed into that boss says nothing about a 148 mm stack. The
  rungs therefore keep the chosen region's x and y and spread evenly over the
  cut's full z range, in the order the part's own structural edges run
  (`from` → `to`, Kahn's order, ties in node order).
- **"Lifted to the node's Z where the node's edge is a Z-dimension"** could
  not be taken literally. No edge in the topology says which axis it measures,
  and an unbound node has no Z of its own. **A rung's height is its place in
  the stack, not where its feature is.** Selecting the node says so in words
  (`AA.modelAnchorWords`).
- **The lit set before the shell posts one.** The viewer owns the lit-set
  rule (`VA.kinematicLitSet`) and I may not touch `apps/viewer/`. So the
  scene takes the set as a command (`model lit …`, `model unlit dim|hide`).
  Until a set is posted, it reads the page's own study: a chain study's
  `selection` in bind mode, or the edges a kinematic study's stops name in
  sweep mode. On P2 that lights 6 of the 59 lines. Nothing in the shell posts
  the command yet. That gap is filed as
  `ISSUE_20261027_the_shell_does_not_yet_post_its_lit_set_or_unlit_style_to_the_scene.md`,
  with the one place the two readings differ (a borrowed band's edge).
- **Node selection** is `model select node|body <id>`, or a click on a dot.
  The dots are raycast before anything else, so a click on a dot is the dot's.
  In sweep mode a scene pick that selects a body in the rail also selects it in
  the layer, which draws its name at its +X anchor.
- **Colours.** Lines are neutral. A dot's colour says its source: joint uses
  the distance-bead colour, bound uses the bound-mark green, section is pale,
  and origin uses the warn colour, because it is a gap. The accent is
  reserved for `highlight` and for selection.

## The section-plane choice per body (P2, the occurrence the run anchors)

| part (body) | plane y | regions | anchor x | rungs |
|---|---:|---:|---:|---:|
| hub (base) | 0.0 | 28 | 176.2 | 6 |
| tan_link_mount_215175_002 (base) | 0.0 | 7, across x −129…113 | 108.9 | 2 |
| gas_spring_mount_213668_002 (base) | 0.0 | 4 | 87.1 | 3 |
| pitch_plate_215177_001 (pitch_plate) | −4.6 | 5 | 69.3 | 6 |
| pitch_arm (blade, blade 1's occurrence) | −3.1 | 2 | 86.8 | 3 |
| blade_root (blade) | — | 6 | ≈1388 | 3 |
| spherical bearings, tan link (links) | at each | 1–4 | ≈80 | 2 each |

The blade is the one that reads oddly. Its +X region is the blade itself,
whose cut centroid lies mid-span at x ≈ 1388 mm. So the blade's three nodes
sit far outboard and are usually off-screen (null in the message). That is
the rule applied honestly, so I left it alone.

## The anchors message the leaders handoff reads

> ```
> {type: "annotate:anchors",
>  nodes: {<node id>: [x, y] | null, ...every node of the topology},
>  edges: {<edge id>: [[x, y], [x, y]], ...drawn edges with both ends on screen}}
> ```

- The coordinates are CSS pixels of the iframe's own viewport, rounded to
  0.1 px. They are **not** canvas pixels: embedded, the canvas sits under the
  annotator's own bars, so `modelScreenPoints` adds the canvas's
  `getBoundingClientRect()` offset. The first build forgot that offset, and
  its TRUTH check only tested that points fell inside the frame, so it passed
  anyway. I found the bug by reading the code. The check now compares one node
  against an independent projection to 0.1 px. The shell adds the iframe's
  rect.
- The message is posted after a drawn frame (`scene.onModelRendered`), at most
  once per animation frame. A message identical to the last one is dropped, so
  a still scene posts nothing.
- A node is `null` when it is off-screen, behind the camera, hidden, or has no
  anchor geometry.
- An edge is omitted when it is hidden (`model unlit hide`) or either end is
  null.
- Layer down: one message with both maps empty.
- On P2 at load: 47 nodes, 37 placed, 41 edges.
- `window.__lastAnchors` holds the last message in every mode, for a harness.

## The per-frame cost

The per-frame work is 47 points through their subjects' poses, one 3×4 matrix
per body group, and 47 projections for the message. That is nothing next to
the parts. Measured headless on P2 embedded at 1600×1000 while playing, the
suite printed **58.1 drawn fps with the layer, 60.3 without, and 56.9 with it
again**. Building the layer cuts every meshed part once: all 15 cut in 120 ms in
Node, and the hub's 363,681 triangles take 19 ms. The cuts are cached per
(mesh, occurrence, bias), and the full build lands about 4.6 s after boot,
almost all of it the run's own anchoring. The figures are added to
`ISSUE_20261014_sweep_modes_frame_rate_figure…` as a dated addendum.

## Gotchas

- **The main checkout's projections predate the merged topology.** At
  ceac363 its `vpa_pitch_linkage` has 29 nodes and no bodies, so the new TRUTH
  suite skips itself there with a named skip line. Every `[real]` figure here
  comes from `C:\workspace\tolstack\data\scratch\model_in_scene\`. That root
  holds a copy of `data/inbox`, `data/meshes` and `data/projections`, with the
  topology, viewer, part-names and kinematic projections rebuilt from this
  branch (`--data-root`, `--allow-older-tree`). Junctions were refused: the
  main-checkout guard reads `New-Item -Target <main>\data\inbox` as touching a
  tracked file, because that directory holds a tracked README. So the root is
  a 385 MB copy. Delete it after the review.
- Heredocs failed again on a large patch: a quote inside a Python string
  inside bash. Every patch here went through a script written to the
  scratchpad with the Write tool.
- `installRealAnnotatorReads` now takes `binding: "window"`. It reads the
  frame's `__truthStackKeys` lazily, so a check can bind a face it has just
  classified. The existing seeds are unchanged.

## Witnesses

There are 25 new specs: 10 annotate (fast tier) and 15 browser, all in the new
`annotate model in the scene (…)` suite. One more new browser guard, the
suite's skip line, has no spec, because it is always true. The pins moved to
annotate 235/235 and browser 639 declared / 606 enrollable. The mock checks
added to `apps/annotate/run_browser_check.mjs` (seven) are not a guard source.

## Verification, as recorded

Every run was from this worktree. `node_modules` is a junction to the main
checkout's copy; it is gitignored and not committed. "Scratch" means
`C:\workspace\tolstack\data\scratch\model_in_scene\`. Its projections were
rebuilt from this branch at `f773cf11` (clean), crops included, using
drawing-checker's venv, and its `docs` is a junction into this worktree.

- `node apps/annotate/run_tests.cjs`: **235/235** (225 + 10 new).
- `node apps/annotate/run_browser_check.mjs`: **79/79** (72 + 7 new mock
  checks), 31 s.
- `node scripts/run_viewer_browser_tests.mjs --repo <scratch> --only annotate`:
  **9/10 suites**, 93 s. The new suite passed **15/15**. The failure is
  `annotate rail and scene`, at 20/22: these are the two gap-badge checks
  already filed on integration
  (`ISSUE_20261026_the_rail_gap_badge_browser_checks_read_gap_rows_integration_no_longer_has.md`),
  and this diff does not touch them. `--only "3D pane"`: **27/27**. The full
  browser tier was not run, because it is the merge's job.
- `node apps/viewer/run_tests.cjs --repo <scratch>`: **570/571**. The one red is
  the topology fixture drift filed on integration
  (`ISSUE_20261026_topology_fixtures_lack_the_tags_fields_…`).
- `node scripts/run_mutation_witness_tests.mjs --repo <scratch> --changed-since integration`:
  39 entries selected, **37 witnessed**. The other two:
  - `browser__real-leaving-sweep-mode-puts-back-every-occurrence-a-bod__3d012dc4`
    was skipped as red-before, because its suite carries the same two filed
    gap-badge reds.
  - My lit-set spec aborted its suite rather than failing by name. The check
    read `.opacity` of a line that the mutation left undefined. I hardened the
    check, and it was then **witnessed with `--only`**. The anchors-message
    check, changed after the run by the offset fix, was also **witnessed with
    `--only`**.
  - Result: all 25 of this branch's specs are witnessed.
- `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -rfs`,
  single process: **1 failed, 1592 passed, 1 skipped, 6:06**. Recorded with
  `suite-time record`, inside budget. The failure is the documented
  worktree-only `tests/test_viewer_js_suite.py`, which finds no projection in a
  worktree. The skip is `test_fit_bound_features.py:424`, because the
  pitch-link bearing re-extraction is not installed. An earlier run took 30
  minutes because it shared the box with the witness run; that timing was not
  used.
- The browser tier's run on scratch was recorded as merge-tier, 93 s.
