---
type: bug
priority: med
status: open
area: tests/browser
reporter: agent
found_by: docs/sessions/HANDOFF_20261103_the_joint_is_the_node_and_an_edge_says_only_lit_or_unlit.md
---

# Three browser suites are red on the base commit with a projection built from it

Measured 2026-11-04. The base is integration `93893374`. Its `apps/viewer` and
`scripts/run_viewer_browser_tests.mjs` were checked out into a worktree, with a
projection built from that tree (`--data-root`, inputs bridged with
`dispatch bridge-test-inputs`). Each suite was run alone:
`node scripts/run_viewer_browser_tests.mjs --repo <worktree> --only "<suite>"`.
All three fail the same way on the handoff branch. Search found no issue for
any of them (`ISSUE_20261103_the_pitch_system_real_pins_are_one_leader_behind_the_merged_topology.md`
covers the topology suite's four, which is a separate set).

| suite | what fails |
| --- | --- |
| real render path (non-mock) | ABORTS. `locator.click` on `tr.tvrow[data-id="washer_ms21299c3"]` times out because `svg.tv__rails` "intercepts pointer events". The rails SVG lies over that grid row where the click lands. The lesson of `the_kinematic_grid_is_a_stack_of_sub_stacks` saw the same abort on its base and filed nothing. |
| 3D pane follows the selection | 30/32. Failing: "[real] resting on a bound contributor row tints its face in the annotator, in the colour buffer…" and "[real] clicking a contributor row with the pane open keeps the page on the study and the annotator in sweep mode, the edge highlighted". |
| the scene pane reads over HTTP | 8/9. Failing: "[real] with no folder grant, the pane reads the run and the meshes over HTTP and shows the mechanism…". |

The first row is the one most likely to be a real defect rather than test
drift. A grid row that a pointer cannot click, because the DAG's SVG covers
it, is something a reader would hit. Start by finding which part of the rails
SVG overlaps the row, using `document.elementFromPoint` at the click point.
