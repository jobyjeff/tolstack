# LESSONS 2026-10-26 — the_rail_and_the_scene_point_at_each_other

In sweep mode the rail and the 3D view now point at each other: hovering any
rail row lights its thing, a click in the scene selects in the rail, a body's
checkbox hides only that body's occurrences, feature rows name their bound
face, contributor rows carry Pick and an alert that says what resolves it, and
chips filter the row kinds. Deliverables 1–6 are built; 7 and 8 are not (below).
What follows is what the diff does not say.

## How an occurrence is addressed for visibility: by its recorded key

The scene keys every drawn node by the occurrence's **recorded key**: the
instance path the extraction wrote (`provenance.json`'s instance path, e.g.
`217755-001/…/215071-001.2`). It is never the node's index. The index of an
occurrence in a sweep's override list (`AA.sweepDrawPlan` entries) is not its
index in the rest list, because the plan appends occurrences the rest list
lacks. So the keys travel with the matrices:

- `scene.placementsFor` may now return `{placements, keys}` (app.js returns
  `AA.restPlacements`' own `keys`);
- `setPartMatrix(sha, placements, keys)` and `setRestPlacements(sha,
  placements, keys)` take them index for index;
- `_drawAt` writes `userData.key` on the mesh and on every repeat.

Visibility is two facts kept apart. The part's flag (`setVisible`, which
`applySweepFrame` re-applies every frame) is `userData.shown`. The occurrences
hidden on their own (`setOccurrencesVisible(sha, keys, visible)`) are the set
`userData.hiddenKeys`. A node is drawn when `shown && !hiddenKeys.has(key)`.
Before this, `mesh.visible` *was* the part flag, and `_setRepeats` copied it
onto every repeat on every frame. A per-occurrence hide written onto
`.visible` would have been undone by the next frame. `isVisible`, `pick`,
`frameSweepScene` and `_drawnCentroid` now read `shown` or the node's own
`.visible`, so a hidden occurrence is not pickable either.

Which keys a body *is* comes from the anchoring rows (`sweep.bodies`), through
`AA.sweepSubjectOccurrences`. One trap: a row of state `carried` with
`inside: false` names a **different mesh at exactly a matched path**. On P2
that is the instrumented blade `551438-001` at the design blade's
`211587-001.3`. app.js deliberately never opens it. So the subject's list is
filtered to open parts (`subjectOccurrences` in app.js) before any checkbox,
count or hover uses it. Without that filter, blade's checkbox was born
indeterminate (2 of 3 visible) and a click on it *showed*.

Measured on P2, at frame 40, by the new browser suite: the pitch arm
(`215071-001`) is drawn at 5 occurrences. `hide-body blade` hides exactly the
one keyed `…/prd-e-03262343.1/215071-001.2` plus blade 1's blade root. The
other four stay drawn, and the hide survives a seek. Screenshots are in
`docs/sessions/shots_20261026_rail_and_scene/` (`1_blade_shown.png`,
`2_blade_hidden.png`, taken by the suite when `RAIL_SCENE_SHOTS` names that
directory).

## What picking at a non-modelled frame had to change

Nothing in the frame rule. **Selection is not the write boundary**, so the
change is an early branch in `scene.onPick`. In sweep mode, at any frame, a
click runs `inspect part <sha> <face> [<subject>]` (a bead runs `inspect joint`,
and empty space or a re-click runs `inspect clear`). Then the old path runs
unchanged: away from the as-modelled pose the gate line pulses and nothing is
selected for binding, and at the pose `select-face` runs as before. Three
smaller changes came with it:

- `scene.pick` now returns the hit node's `key`, and the pointerup hands the
  bead under the pointer (`sweepHover`) to `onPick` as a second argument.
- The selection calls are **quiet** (`railExec(…, null)`). The existing check
  "a click away from the pose … raises no banner" hands `onPick` a fake sha,
  and a selection of a mesh this store does not list must not banner over the
  gate line.
- A pick resolves to its body by key (`AA.sweepOccurrenceSubject`). A part
  *listed* on a subject beats one *carried* inside another. An occurrence no
  subject was placed at (the four still pitch arms) selects no tree row.

## The frame-rate cost of hover

Hover is overlays, never the colour buffer. A part hover adds one child mesh
per lit occurrence; it shares the part's geometry and one shared translucent
material. A face hover adds a sub-geometry copy per occurrence, the same way
`markFace` does. So a hover costs draw calls, not buffer uploads, and it
cannot take a picked face's tint down when it leaves. That was the
`highlight clear` fight the pane lesson recorded; the `highlight` verb is
unchanged for the viewer's pane.

Measured headless (SwiftShader) on P2 by the suite, which prints the figures
and checks nothing about them, while playing:

| run | nothing hovered | `base` hovered (the 286-solid hub, 2 occurrences) |
|---|---:|---:|
| 1 | 39.8 drawn fps | 38.9 drawn fps |
| 2 | 43.5 drawn fps | 39.3 drawn fps |

That is a cost of 2–10%, on a box shared with other agents. Well above the
4 fps floor in `ISSUE_20261014_sweep_modes_frame_rate_figure…`. That figure
came from an older build that drew every tick; render-on-demand (10-22)
is what moved the base.

Scene → rail hover raycasts the **parts**, which the bead hover's comment
keeps off the pointer rate for good reason (1.4 M triangles). So it runs once
per settle: `AnnotateScene.PART_HOVER_SETTLE_MS = 120` after the last
pointermove, and never with a button down (a drag). It applies classes to the
existing rows (`applySceneHover`) and never rebuilds the tree.

## Decisions the handoff left open

- **A new `hover` verb, not more `highlight`.** `highlight` is the viewer
  pane's contract and tints the colour buffer. Rail hover needed occurrence
  scope and an overlay. One primitive, one tint (`HOVER_COLOR`, a pale wash
  at 0.45). Feature rows moved from `highlight` to `hover feature` so every
  rail row uses the same tint.
- **The hover tint is neutral, not the accent.** The accent is selection
  (`docs/DESIGN_TYPE_AND_COLOUR.md`). A hovered bead is drawn at 1.4×; a
  selected one stays at 1.8×.
- **Links get a checkbox too.** `pitch_link` and `tan_link` are subjects with
  their own occurrences, so their joint rows carry the same checkbox.
- **Pick is on the contributor row, not inside the popup.** The alert popup
  is hover-only, so it closes before a pointer reaches anything in it. Its
  text ends "Pick binds its faces at the as-modelled pose." and the row's Pick
  sits beside the badge. Pick runs `goto <topology> <edge>`, the same jump a
  feature row makes.
- **A drawing's label.** When the part's everyday name already contains the
  number (`212956-005 pitch anti-rotation link assembly`), the name is the
  whole label. Otherwise it is number then name (`215177-001 pitch plate`).
  On P2 each alert names exactly one drawing: 212956-005 for the tangential
  link, and 215177-001 for the attach radius. Each is its edge's own `part`;
  the end nodes list no parts. The handoff's "or 215735-001" does not appear,
  because nothing in the topology names it for that edge.
- **The chips' word for feature rows is "surfaces"** (`AA.SWEEP_ROW_KIND_WORDS`),
  the handoff's word. The kind key stays `features`, the tree's own name.
- **`INSPECT_TARGETS` was appended to (`part` at index 3)**, so the three
  older indices the app reads keep their words.

## The bind rail snapshot was regenerated, for one stated reason

A parts-panel row whose mesh is drawn at more than one position now says how
many (`×2` on the mock's demo part after the goto). That is deliverable 3's
"says so in its own row count", and it is the only difference. The `about`
field of `tests/fixtures/annotate/bind_rail_snapshot.json` records it. Every
other bind-mode node is unchanged, because the hover and `data-` attributes
are added only while `state.sweep` is set.

## Not built

- **Deliverable 7, sweep mode with no folder grant.** It needs a read
  transport, and the served origin does not publish the sweep run. Measured
  with `curl` on `127.0.0.1:8000`: topologies, the kinematic projection and
  mesh manifests answer 200, while `inbox/linkage-sweeps/<run>.json`, bindings
  and part names answer 404. Recorded as a dated addendum on
  `ISSUE_20260910_annotate_has_no_http_read_transport.md` (already triaged to
  `BRIEF_20260911_served_surface_capability_gaps.md`). It needs a
  drawing-checker mount as well as the annotator-side adapter.
- **Deliverable 8, the coefficient at the current frame.** Feasible and cheap:
  `sensitivity.by_measure` is `[parameter][point]`, and its point-0 entry
  equals the stop's `coefficient`. Filed with the shape of the fix as
  `ISSUE_20261026_the_sweep_rails_contributors_could_show_the_coefficient_at_the_current_frame.md`.
- **Bead hover → joint row emphasis.** Hovering a bead still shows its
  tooltip only. The handoff asked for meshes. It is one line in
  `showSweepTip`'s caller if wanted.

## Witnesses

28 new specs: 7 annotate (fast tier) and 21 browser, every browser one in
`annotate rail and scene (…)`. One new browser guard has no spec: the suite's
skip line, which is always true. The pins moved to annotate 220/220 and
browser 605 declared / 572 enrollable. Two existing specs' anchors were
re-pointed because this change rewrote the lines they named. The mutations are
unchanged:

- `browser__an-opened-part-is-drawn-at-every-occurrence…`: `placementsFor`'s
  return line;
- `browser__real-opening-a-joint-selects-it…`: the bead-scale line.

## Gotchas

- Heredocs through the Bash tool broke again on a large JS patch
  (`unexpected EOF`). Write patch scripts to the scratchpad with the Write
  tool and run them.
- `run_tests.cjs` is one flat module scope, so a `const` you add can collide
  with one 1,000 lines up (`RAIL_TOPOLOGY` did). Rename inside your own block
  only. A file-wide `sed` renames the earlier one too.
- A checkbox inside a `<summary>` does not toggle the `<details>` (an input is
  its own activation target), but its click still bubbles, so the handler
  stops propagation. Making the summary `display: flex` to lay the checkbox out
  removes the disclosure marker; it floats right instead.

## Verification, as recorded

All runs are from this worktree. `[real]` and browser runs read the main
checkout's data (`--repo C:\workspace\tolstack`, or the browser check's own
main-checkout reads). `node_modules` is a junction to the main checkout's
copy; it is gitignored and not committed.

- `node apps/annotate/run_tests.cjs`: **220/220** (213 + 7 new).
- `node apps/annotate/run_browser_check.mjs`: **67/67**. The first run on the
  final tree was 66/67 on "the speed control changes reduced-motion
  playback's rate", which compares two 500 ms wall-clock runs on the mock
  sweep. The rerun was 67/67. Nothing in this diff touches the sweep clock.
  This is a timing flake on a shared box, recorded here rather than counted as
  a pass.
- `node scripts/run_viewer_browser_tests.mjs --repo C:\workspace\tolstack --only "annotate"`:
  **9/9 suites**. The new `annotate rail and scene (…)` suite passes 22/22.
  The existing `annotate sweep rail` suite passes 15/15, with the bind
  snapshot regenerated as stated above.
- `… --only "3D pane"`: **13/13**. The viewer pane's `highlight` path is
  unchanged.
- `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --only <id>`,
  once for each of the **30 specs this branch added or changed** (the list
  the runner prints against `integration`): **30/30 witnessed**. That is the
  28 new specs plus the 2 re-pointed ones. They ran before the last commit
  (the rail rebuild clearing the hover), which changes no anchor. The full
  registry was not run; it belongs to the merge.
- `venv-win/Scripts/python.exe -m pytest -q`, single process, because xdist
  is not installed in `venv-win`: **1 failed, 1573 passed, 1 skipped,
  6:33**. Recorded with `suite-time record` (inside budget). The failure is
  the documented worktree-only `tests/test_viewer_js_suite.py` (no
  projection in a worktree). The skip is `test_fit_bound_features.py:422`
  (the pitch-link bearing re-extraction is not installed).
- Not run: `node apps/viewer/run_tests.cjs`, the viewer browser tier beyond
  the 3D-pane suite, and `scripts/rebuild_projections.ps1`. This diff touches
  no `apps/viewer/` file and no projection input.
