# LESSONS 2026-10-21: a_face_pick_survives_an_orbit_and_names_its_end

Handoff: `docs/sessions/HANDOFF_20261021_a_face_pick_survives_an_orbit_and_names_its_end.md`
(in `active/` while this ran). It covers Jeff's three reports from his first live
bind, plus the suggestion-line clause.

## What was decided, and why

- **Slop: `AA.PICK_CLICK_SLOP_PX = 4`.** This is the suggested value. It is
  wide enough for the tremor of a trackpad tap or a mouse click, and narrow
  enough that the smallest deliberate orbit is never taken for a click
  (OrbitControls visibly turns the view within a few px). The comparison is
  strict and Euclidean, so a release exactly at the slop counts as a drag.
  A second pointer down (a pinch) cancels the pick outright. A release off the
  canvas is never a pick: pointer capture delivers it to the canvas anyway, so
  the release point is checked against the canvas rect.
- **Interface choice:** buttons with `role="radio"`, one per end that can be
  chosen. Each button's label is the interface node's name, and its value is
  the stored word (`data-direction`). An end that is already bound is not a
  button. It is a muted dashed box: the name, then *"already bound · face N"*.
  The chosen end takes the pick colour (`#ff8c1a`), the same colour as the face
  and the leader, because the choice is a claim about that face. Long names
  wrap; nothing is truncated.
- **The choice is keyed to `(element, sha256, face id)`** (`state.bindChoice`,
  read through `bindContext`). Picking a new face, or selecting another element,
  starts with no choice again. A carried-over choice would be a default nobody
  aimed, which is the same defect as before in a new shape. This is one field on
  `state`, the one edit to `app.js` outside the functions the handoff scoped.
  It is needed because the choice must survive a re-render.
- **The choice does not re-render the form.** A re-render would wipe whatever
  the reader had typed into the optional fields. `renderDetail` builds a
  `refreshBindStep` closure. The closure recomposes the instruction and the
  leader, and the form calls it whenever a choice is made.
- **The leader** is drawn without a depth test, because the two faces of a
  thickness are on opposite sides of the part, so a depth-tested line between
  them would run inside it. Each label is a canvas-texture sprite with
  `sizeAttenuation: false`. Every frame, `_layoutLeader` re-sizes each label
  against the canvas's current CSS height and re-anchors it vertically: the
  higher end on screen has its label above its point, and the lower end has its
  label below. The first two rounds of screenshots showed both faults this
  fixes. In the first, two labels crossed when the picked end sat lower on
  screen. In the second, labels came out about 7px tall. That happened because
  the leader is drawn in the same render that opens the bind form, so a size
  read at creation was taken against a canvas the form then shrank.
- **No post-write flip.** Filed as
  `docs/issues/ISSUE_20261021_a_binding_written_at_the_wrong_end_has_no_correction.md`
  (`audience: strategy`). It recommends a `superseded_by` verdict, and it carries
  the 0001 event as the motivating case.
- **Cross-part end derivation was not built.** The node names make it
  unnecessary in the common case. The reader can read which end a face is
  straight off the two names, and with the leader drawn a wrong end is visible
  before it is written. The deferred issue
  (`ISSUE_20260921_cross_part_face_relations_need_assembly_placement.md`) is
  untouched.
- **`describeSuggestions` took the clause.** It needed one helper of about 10
  lines, `referenceClause`, in `suggestions.js`, plus a `names` argument. A
  reference at the **other end** of the element is named by that end. A
  reference at the other half of this interface is named by this end's own
  interface. The real-data run printed: *"11 likely faces -- the faces that
  line up with the one already bound (face 110, bound as upper piston head step
  face -- the extend stop's moving side)"*.

## The instruction's states, exactly

`<el>` is the element name, and `<A>`/`<B>` are interface names.

1. Both ends open, nothing picked: *"`<el>` needs two faces, bound one at a time. Click the first one in the 3D view."*
2. A face picked, both ends open, no end chosen: *"Choose which interface of `<el>` this face is, then press Bind. The other face comes next."*
   - The same, with `<A>` chosen: *"Bind the selected face to `<el>` as `<A>`. The other face comes next."*
3. One end bound, nothing picked: *"Select the remaining face that defines `<el>`: `<B>`."*
4. One end bound, a face picked (the remaining end is preselected): *"Bind the selected face to `<el>` as `<B>`, the last face it needs."*
5. Both bound, nothing picked (today's wording, unchanged): *"`<el>` already has the faces it needs. Click a face to bind another."*
   - Both bound, picked: *"Choose which interface of `<el>` this face is, then press Bind."* With an end chosen: *"Bind the selected face to `<el>` as `<A>`."*

States 3 and 4 keep the prefixes *"Select the remaining face that defines …"* and
*"Bind the selected face to …"*. Two existing browser blocks
(`testAnnotateRail` and `testAnnotateTopBar`) match those prefixes, and this
handoff could not touch those blocks. The prefixes also read well. With the
real element and real node names, state 4 is about 165 characters, so on a
narrow bar the line ellipsizes. The line now carries a `title` holding the whole
sentence, which satisfies the truncated-text rule. The template itself is well
inside the budget. The length comes from the topology's own names.

`AA.HELP_LINES` (*"Click a face in the 3D view to select it; click it again to let it
go."* and *"The rows on the left are this study's elements…"*) and
`AA.PICK_NEEDS_ELEMENT` are still true and unchanged. A click still selects,
and a click on the selected face still lets it go.

## Checked, not changed

- **The sweep-mode bead tooltip** uses `pointermove` against the beads only and
  is untouched. `apps/annotate/run_browser_check.mjs` exercises it (see
  Verification).
- **`autotestPick`** calls `pick()` directly and never goes near the pointer
  handlers (see Verification for the `?mock=1&autotest=1` run).

## The feature-identity inbox

At launch, and again when this lesson was written,
`C:\workspace\tolstack\data\inbox\feature-identity\` held only its tracked
`README.md`. Nothing was written there. Every write in this session went to a
`MemoryAdapter`.

## Real-data checks (by hand, not pinned)

The real transport needs a File System Access folder grant, which cannot be
given headless. So these ran in a scratch Playwright script that serves the
worktree's code and swaps `AA.FIXTURES` for the main checkout's real data: the
topology, viewer, part-names and aliases projections, plus mesh `8899ea5d…`.
The adapter was a `MemoryAdapter`, so nothing was written anywhere. Bind was not
pressed. Element: `?topology=vpa_pitch_linkage&edge=piston_head_upper_thickness`.

- The instruction with nothing picked read *"upper piston head height, lower
  face to step face needs two faces, bound one at a time. Click the first one in
  the 3D view."*
- With face 113 picked, the two choices read *"lower piston head upper face
  against the upper head lower face"* and *"upper piston head step face -- the
  extend stop's moving side"*. Neither was checked, and Bind was disabled. No
  leader was drawn.
- A second page added a **memory-only** binding of face 110 at the step face (a
  fixture, not an event). With face 113 picked, the seat was preselected and the
  step face showed *"already bound · face 110"*. The leader ran from face 113 to
  face 110 in `ff8c1a`, with both names on it. The page raised no errors.

## Screenshots

`docs/sessions/shots_20261021_a_face_pick_survives_an_orbit_and_names_its_end/`:

1. `1_mock_both_ends_open_no_default.png`: the form with both ends open, no default, Bind disabled.
2. `2_mock_one_end_bound_taken_and_preselected.png`: after one Bind, the taken end and the preselected one.
3. `3_mock_leader_before_the_second_bind.png`: the leader on the mock triangle.
4. `4_real_piston_head_both_ends_open.png`: the real element, nothing bound.
5. `5_real_piston_head_step_face_bound_in_memory_leader.png`: the real leader, face 113 to face 110.

## Gotchas

- **An orbit can turn the camera without moving it.** The browser block aims
  straight down the up axis, where an azimuth orbit only changes the camera's
  quaternion. "The camera moved" has to compare orientation as well as position.
  Read it half way through the drag, because a full turn brings the camera back.
- A scratch Playwright script needs `channel: "chrome"`. playwright-core's
  bundled headless shell is not installed on this machine.
- `--only` on the mutation runner takes **one** value. Pass several and only
  the first is used, without a warning. Run once per spec, chained with `;`.

## Verification, as recorded

The tree under test was commit `4724c86`. The only file changed after it is
this lesson.

Two of the commands below were not given: `scripts/rebuild_projections.ps1`
refuses to run from a worktree, and the mutation runner refuses its whole
registry outside the main checkout. Nothing this branch changes is an input to
a projection: the diff is `apps/annotate/`, the browser runner, the witness
specs, the guard pins and docs. Every `--repo` run below passed the
projection-freshness gate against the main checkout's projections. The main
checkout was not written to, and its `git status` was clean on arrival and at
the end.

- `node apps/annotate/run_tests.cjs` (worktree; its `[real]` checks read the
  main checkout's meshes and runs): **212/212**, no SKIP lines. That is
  205 + 7 new checks, with two existing `taskInstruction` checks rewritten for
  the new states.
- `node apps/viewer/run_tests.cjs --repo C:\workspace\tolstack`: **544/544**,
  no SKIP lines.
- `node scripts/run_viewer_browser_tests.mjs --repo C:\workspace\tolstack`,
  full run: **29/29 suites** in 159 s. That includes the new `annotate bind
  form (a drag keeps the pick, the ends by name, the leader)` at 15/15, and
  every existing annotate suite, unchanged and green: rail 34/34, top bar
  30/30, suggestions 25/25, sweep rail 13/13, 3D pane 13/13, flyout 46/46,
  hosted posture 18/18.
- `node apps/annotate/run_browser_check.mjs`: **67/67**, including *"moving
  off every bead hides the tooltip"*, which is the sweep-mode bead tooltip.
- `node scripts/run_mutation_witness_tests.mjs --repo C:\workspace\tolstack
  --only <id>`, one run for each of the **21** specs this branch adds: **21/21
  WITNESSED**. The 7 annotate specs passed first time. Of the 14 browser specs,
  two missed on the first pass and were repaired by fixing the guard, not the
  spec:
  - The first-bind leader check now runs after an end is chosen, because before
    that the leader is null for a different reason. That renamed it, and its
    spec moved with it.
  - The empty-space drag now uses a point that is confirmed to be on the canvas
    and to hit no part. The canvas corner was neither, reliably.
  The four leader specs were re-run after the last `scene.js` change.
  Enrollment: annotate 67/212, browser 104/544 enrollable (576 declared). The
  pins were raised to 212/212 and 576/544, with new name digests.
- `C:\workspace\tolstack\venv-win\Scripts\python.exe -m pytest -q`
  (worktree): **1 failed, 1519 passed, 1 skipped**, 17:11.
  - The failure is the documented worktree-only
    `tests/test_viewer_js_suite.py` (no `data/projections` in a worktree).
    The tier it gates ran green with `--repo` above.
  - The skip is `tests/test_fit_bound_features.py:422`: the 2026-10-01
    re-extraction of the pitch-link bearing is not installed.
- `?mock=1&autotest=1`: `autotestPick` still runs and publishes its results.
  All three mock parts report `hit: false`, and the main checkout's unchanged
  code reports the same. This is the known edge-on mock mesh
  (`ISSUE_20260916_the_mock_annotator_mesh_is_edge_on_to_its_own_default_camera.md`),
  not this change.

Scratch only: the screenshot and real-data scripts lived in the session
scratchpad. They served the worktree's code with the main checkout's data, read
only, to a `MemoryAdapter`. The temporary `node_modules` junction in the
worktree has been removed.
