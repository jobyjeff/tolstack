# Lessons 2026-11-05 — the_seam_and_rail_checks_wait_on_settled_state

Every change is in `scripts/run_viewer_browser_tests.mjs`, plus one mutation
spec re-anchored. No test hook in `apps/viewer/` was needed. No assertion was
loosened; only *when* each one reads changed. Every sub-check touched now prints a
`DIAG` line naming its conjuncts when it goes red, so the next red reports its
own cause.

## Per sub-check: cause, and the signal it now waits on

| sub-check | cause (race vs real) | waits on |
|---|---|---|
| seam, scene-tree pick (+ the hover and click siblings, same shape) | **race.** `drawnAfter(before)` accepts *any* seam draw after the gesture. The overlay draws a frame after the page state changes, and other triggers draw in between, so the read could be of a draw that predated the selection. Measured by the issue at 1/4 and 2/5. I did not reproduce it in 6 loaded runs, so the cause comes from reading the code. | `seamShows(ends, state)`: both ends' drawn paths carry `seam__leader--<state>` (15 s), after `settled()` |
| seam `[real]` screenshot rows (1600 and 1920) | **race.** `liveSettle` compared anchors and leader ids only. A hover or click reaches the overlay's *states* a frame after the row, and a scroll moves the rails and frame rects; neither changed what it compared. I did not reproduce it under load either. `traceCase` now names the clause that broke (`traceFaults`). | `liveSettle` signature = anchors + leader ids + `lastSeamDraw.states` + rails rect + iframe rect, three equal reads 150 ms apart (30 s). Suite alone: 90 s, was 109 s. |
| rail filter "a real click on the face tints it" | **race, probably**: the aim is a projection through camera + canvas rect, confirmed by the scene's raycaster in NDC, and that confirmation cannot see a rect or aspect that moves between the aim and the click. Not reproduced: green in every loaded run, before and after. | `sceneStill()` before aiming: canvas rect, drawing buffer, camera aspect agree with the host and across two `raf` polls, and `!scene.dirty` (15 s) |
| 3D pane "resting on a contributor row with no binding" | **race, measured by reasoning and then by the witness.** Leaving the bound row (the scroll that brings the next row into view) posts `highlight clear`, which nulls `__lastHighlight` and writes no note. So `cleared` could be true before the unbound row's own command ran, and `said` read `""`. | the note is reset first, then waited for: `__lastHighlight === null` and `__lastHighlightNote` naming *this* edge (20 s) |

### Two more in the same suite, found on the way

The definition of done needs the whole suite green. These went red during this
session's own runs:

| sub-check | cause | waits on |
|---|---|---|
| "...and leaving it takes the light down" | **race in the precondition, plus a product finding.** `held false` in 1 of 4 `--only` runs beside pytest: the light went out with the pointer still resting on the row (a rebuild replaces the row, and the new row hears `enter` only on the next move). After that was fixed, `chip null` in 2 of 5: the chip bar the test leaves onto was mid-rebuild. Filed the product half: `ISSUE_20261105_a_nav_scene_row_rebuilt_under_a_resting_pointer_drops_the_scenes_hover_light.md`. | `holdLight()`: the pointer stays on the row and steps 1 px while the light is out, until 3 reads 150 ms apart find it on. The chip box is read until two reads agree. 5/5 beside pytest after. |
| the four nav gesture checks (`ISSUE_20261029_four_3d_pane_nav_gesture_checks_fail_together_when_the_bodies_resolve_late.md`, deferred) | **race**: the one `bodyRow` lookup ran before the bodies resolved | `waitForFunction` for a body row with an enabled checkbox (60 s), the fix shape that issue names |

## A witness that had decayed before this change

`browser__real-resting-on-a-contributor-row-with-no-binding-tints__b1a6d21a#2`
was **NOT WITNESSED** in this branch's first `--changed-since master` run. I
applied the mutation by hand with a log line. The pane still received
`highlight … pitch_link_length`, because the guard hovers the DAG grid's row
(`#topopane tr.tvrow`). That row reaches `paneHoverTarget` through its `data-id`
branch, and the mutation edited the `data-edge` branch (the kinematic contributor
table), which this hover never runs. The old wait would have stayed green under
it too, so the decay predates this branch. I re-anchored it onto the `data-id`
line. By hand it then reddens, and the diagnostics show the bound face tinted
with no note.

The hunk selection also left out three seam-leader witnesses whose mutations
anchor in `apps/viewer/` (hover `c0ebdc1b`, 1600 `47704003`, 1920 `7e1e49f0`).
I ran each one with `--only`: all WITNESSED.

The face-tint guard has no witness spec. That predates this change and is left
to the enrollment census.

## Blocked actions

- `bash loaded.sh` — a helper that re-ran `pytest -q` back to back for the whole
  of each ~25 min browser run, to keep the box loaded throughout. Refused by
  auto mode as **[Interfere With Workloads]**. It was a load generator by
  another name, and CLAUDE.md forbids that. Not retried. The loaded runs below
  use the definition of done's literal shape instead: one default-tier pytest
  started together with each full run. That pytest (~6.5 min) overlaps only the
  first quarter or so of a run, and the four target suites run later in the
  order. So "under load" here means the box's ordinary concurrent load during
  those suites, which is weaker than the 11-05 batch merge's.

## Loaded runs

Each was a full `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`
from the worktree, with `node_modules` as a junction to the main checkout's.
Each was started together with one `pytest -q` from the worktree (`1 failed,
1723 passed, 1 skipped`; the one failure is the expected worktree red in
`test_viewer_js_suite`).

| run | tree | result | wall | the four target suites |
|---|---|---|---:|---|
| baseline | `de7b12c7` + diagnostics only | 41/41 | 1477 s | all green (no target red reproduced) |
| 1 | `b726612c` | **41/41** | 1338 s | 3D pane 32/32, rail filter 34/34, seam 26/26 |
| 2 | `b726612c` | 40/41 | 1529 s | 3D pane 32/32, rail filter 34/34, seam 26/26; the red was `suite file://` (`page.goto` 30 s timeout as pytest started), filed as `ISSUE_20261105_the_suite_file_unit_page_times_out_loading_at_the_start_of_a_loaded_run.md` |
| 3 | `a6f15d94`+ (issue-only commits after `b726612c`) | **41/41** | 1426 s | 3D pane 32/32, rail filter 34/34, seam 26/26 |

Zero reds in the four target suites across three loaded runs. The baseline was
green as well, though. These flakes ran at 1 in 4 to 1 in 34 in their own
issues, so three greens do not prove a negative. What does show a race was
closed is the two the session reproduced: the 3D pane's leave check, red 3 in
9 beside pytest before and 0 in 11 after. Every target sub-check now prints
its conjuncts on a red, so the next sighting names its cause.

`--only` alone after the change: seam 26/26 (90 s), rail filter 34/34 (23 s),
3D pane 32/32 (89 s, and 5/5 more beside pytest).

## Other

- Wall times recorded: default 396 s, browser tier 1426 s, both inside budget.
- Watch out: when one function has two `const` blocks for the same body row, a
  name reused across the two (`bodyRow`) is a module-level SyntaxError. The
  whole tier then exits before any suite runs, and a `grep` on its output
  prints nothing.

## Mutation witnesses (final tree)

- `node scripts/run_mutation_witness_tests.mjs --changed-since master --repo C:/workspace/tolstack`:
  **10/10 witnessed**, 17m35s, exit 0. The 10 include the re-anchored
  `b1a6d21a#2`. The earlier run on this branch, before the 3D pane's leave fix,
  was 5/8: its clean run was red on `...and leaving it takes the light down`,
  which is how that flake was found.
- `--only`, for the guards this diff reaches that the hunk selection did not:
  hover `c0ebdc1b`, 1600 `47704003`, 1920 `7e1e49f0`, leave `3c44a05c`, and the
  nav gestures `f978b14a`, `5db2d567`, `889565d3`, `7f496d4b`. **All
  WITNESSED.**
