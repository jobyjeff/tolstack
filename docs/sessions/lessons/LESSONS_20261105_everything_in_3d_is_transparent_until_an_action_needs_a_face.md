# LESSONS 2026-11-05 — everything_in_3d_is_transparent_until_an_action_needs_a_face

Jeff's note `20261105T164140_sm8hkc`: parts came in opaque on the kinematic
study, hiding "base · 3 parts" left a transparent copy behind, and an action
should dim whatever it is not about. Shots in
`docs/sessions/lessons/shots/everything_in_3d_is_transparent_until_an_action_needs_a_face/`
(made by the hand-run probe `tests/debug_transparent_3d.mjs`, real projection):
`1_at_rest`, `2_base_hidden`, `3_armed_on_the_pitch_link_end`,
`4_after_the_pick`, `5_grid_row_pitch_link_length`.

## The regression: commit and cause

**`4c0b7c62`** (2026-11-03, `every_study_opens_in_3d_showing_only_its_parts`).
The viewer's open pane follows its page with `isolate parts <study parts>` —
for a kinematic study too, i.e. *in sweep mode*. `applyPartScope` drew those
parts **solid** (`AA.planPartScope` returned `solid: targets`). The sweep
frame loop also set every part's ghost state, but only when its per-mesh cache
said the wanted state had changed — and the cache still read "ghosted", so it
never undid the scope's solid. Which won was a race (parts stream in over
~25 s): one probe run settled with 9 cited parts opaque (the mount 213668,
the tangential-link mount 215175, the pitch plate, the gas-spring piston
parts…), another with everything ghost.

The rule the code followed: *a study's parts solid, the rest ghost*. The rule
it follows now: **at rest every drawn part is translucent** — the study's
parts ghost, the rest faint (or hidden under the unlit word `hide`); a part is
solid only while an action names it. One function decides (`app.js`
`applyLooks`, called from every path that used to set the material itself),
and `scene.setLook` is idempotent so the sweep frame can restate every look
every frame for nothing — the per-mesh ghost cache is gone.

## The duplicate copy: what it was

Neither of the handoff's two guesses. Not a repeat of the shared geometry and
not a null key: **the STEP extraction installs an installation and the
machined detail inside it as two separate meshes, drawn in the same place.**
`215175-001` (the tangential link mount *installation*, 40 solids, the base
body's part) and `215198-001` (its machined detail, its own mesh, cited by no
body) have identical world bounding boxes; the alias table's own note says so
("whose machined detail 215198-001 is installed separately"). The same shape
three times on this study: `machined_213668` (a base part) sits inside the
`215176-002` installation mesh; `215177-001` pitch plate installation holds
`215735-001`. The occurrence keys nest by whole path segments
(`…/215175-001.1` and `…/215175-001.1/213667-001.1`), so the fix is
structural: a hidden key hides every occurrence on the same assembly path —
the installation above it, the details below it — whichever part draws it
(`AA.assemblyPathsOverlap`, `scene._occurrenceHidden`). Hiding base now takes
down 6 drawn meshes that are another part's copy (the browser check's own
count; the hand probe, whose scene had finished loading the hub too, saw 9
meshes go in all). The sweep ghost layer's
as-modelled copies now carry their occurrence key and hide the same way (they
never did); a null key in a hide list now hides that part's unrecorded
occurrence (it was ignored).

Cost of the rule, stated: hiding a detail hides its whole installation mesh
(there is no per-solid hide inside a mesh), so the installation's *other*
solids go too. On this study every such solid is either in the same body or
also installed as its own mesh; a study where that is not true would lose a
little more than the body. Per-solid hiding would need draw ranges per
occurrence on shared geometry — not built
(`docs/issues/ISSUE_20261105_hiding_a_detail_hides_its_whole_installation_mesh.md`).

## The opacity table by state

| state | solid (1.0) | ghost (0.22) | faint (0.07) |
|---|---|---|---|
| rest, a study open | — | the study's parts | every other part (hidden under `hide`) |
| rest, no study | — | every part | — |
| armed pick | the end's part | the end's other part, the edge's other end | the rest (or hidden: the row's toggle) |
| candidate row hovered | the face's part | — | the rest |
| suggested end selected | the face's part | the edge's other parts | the rest |
| grid row hovered/selected (`highlight`) | the edge's parts (one end's with a direction; the other end then ghost) | — | the rest |

"See-through parts" unticked turns the rest state's ghost into solid; the
actions still dim. The pick and a selected suggestion frame the camera; the
two hovers and the grid row do not (the page sends one `highlight` for hover
and selection, and a camera that moves on hover moves under the pointer —
`docs/issues/ISSUE_20261105_a_selected_grid_row_isolates_its_parts_but_the_camera_does_not_frame_them.md`).
Precedence when several are live: armed > candidate hover > selected
suggestion > page highlight.

## Decisions the handoff did not make

- **Rest-state "uncited" is faint, not hidden.** Deliverable 4 says an uncited
  housing is hidden; the page already has the reader's "Unused: dimmed /
  hidden" word for exactly this, so `dim` draws uncited parts at the faint
  0.07 (which obscures nothing) and `hide` hides them. If Jeff wants hidden
  regardless of the word, it is one line in `restLook`.
- **The DoD's "link and plate solid"** for a pick on the pitch-link end read
  against deliverable 3's "near neighbours ghost": the plate is the edge's
  other end, so it is ghost. Shot 3 shows it.
- **Bind mode is unchanged** apart from `isolate parts` (a chain study): the
  parts panel's own Isolate/ghost verbs and `trace` keep their looks, and the
  resolver stands aside while one of them is in force at rest.

## Things that cost time

- **Shell heredocs with an odd number of apostrophes fail** under the Bash
  tool here (`unexpected EOF while looking for matching '`) — even quoted
  `<<'EOF'`. Write the edit script to the scratchpad and run it.
- These source files are CRLF in the worktree; a Python `str.replace` with
  `\n` anchors silently misses. Use the Edit tool or normalise.
- A probe that hovers a nav row before clicking leaves the pointer resting
  there, and the pane draws a hover wash (0.45) on a part — it read as an
  opaque blade in the first screenshots. Park the pointer before reading.

- **`open-part` in sweep mode now arrives at the rest look** (`applyLooks`
  after its solid reset). The browser tier's suggestion suite read a bracket
  `show`n in sweep mode as solid "at rest" and ghost after the action ended —
  the old per-frame cache had never ghosted it either. A part opened by hand
  in sweep mode is a part at rest.
- **The real check's `hide-body` races the rail**: the scene settles before
  the sweep rail lists the run's bodies, and the verb throws until it does.
  The check retries for up to 30 s and prints the error if it never lands.

## Verification

See the report's Verified paragraph for the suite record. The three
annotate-browser reds (`the mock's bound face moves its node…`, `the anchors
message is computed…`, `reduced-motion playback covers (nearly) the same
distance…`) are red on an `integration` baseline extracted with `git archive`
and run the same way — not this branch's. The first two are
`docs/issues/ISSUE_20261028_annotate_browser_check_mock_anchor_checks_are_red_on_integration.md`
(deferred); the third is filed by this handoff.

### The suite record (2026-11-05, this worktree, `node_modules` junctioned from the main checkout)

| tier | command | result | wall |
|---|---|---|---|
| annotate fast | `node apps/annotate/run_tests.cjs --repo C:/workspace/tolstack` | 287/287 | — |
| viewer fast | `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | 517/518, 1 tier skipped; the red is the worktree-expected "projection … built from this tree" | — |
| viewer browser | `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` | 39/41 suites; both reds fixed and re-run `--only`, 1/1 each | 23m10s (merge tier, in budget) |
| annotate browser | `node apps/annotate/run_browser_check.mjs --repo C:/workspace/tolstack` | 95–96/99; the reds are the anchors pair and the flaky reduced-motion pair, red on the integration baseline too | — |
| pytest | `venv-win/Scripts/python.exe -m pytest -q -rs` | 1 failed (worktree `test_viewer_js_suite`), 1727 passed, 1 skipped (`test_fit_bound_features.py`: no re-extraction), 2 deselected | 18m46s, over budget, filed |
| witnesses | `--changed-since integration` | 30/31 witnessed, 31/44 reached in 30m35s; the miss (`fdd87e25`) repaired, 1/1 | 30m35s |
| witnesses | `--only`, each of this handoff's new specs the cap left | 9/9 witnessed (`bcc9633c`, `46bc0a52`, `ec12317f`, `595a7935`, `a6150ca8`, `f4e238b2` ×2, `a602fb0f`, `b2c04d05`) | ~38 min |
