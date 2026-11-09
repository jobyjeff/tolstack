---
type: bug
priority: high
status: resolved
handoff: docs/sessions/HANDOFF_20261109_the_two_red_browser_suites_on_trunk_go_green_against_a_fresh_projection.md
area: tiers/browser
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261108_the_dag_and_grid_nest_coloured_bodies_and_compact_means_denser_rows.md
resolution: an off-screen DAG dot, not a product defect -- the full skipped breakdown showed the two unled joint nodes (pitch_link_upper/lower_sphere_centre) offDag at y 1563/1615 in a 1500px window; the check now requires every on-screen joint node led and scrolls to each off-screen one and requires it led then (both are). 2/2 (handoff the_two_red_browser_suites_on_trunk_go_green_against_a_fresh_projection)
---

# "The model drawn alone and led" is red on integration when the projections are built from integration's tree

`scripts/run_viewer_browser_tests.mjs`, suite `the model drawn alone and led (the
end-stop model's parts only, a leader per placed node)`, sub-check `[real] with the
P2 run loaded and no study, every joint node the scene drew has its leader across
the seam` (line ~14571). It was added by
`the_scene_draws_the_model_alone_and_every_node_it_places_has_a_leader`, whose review
measured it against the main checkout's projections, which are built from `master`.

Measured 2026-11-09 in the review of
`the_dag_and_grid_nest_coloured_bodies_and_compact_means_denser_rows`, `--only "the
model drawn alone and led"`, `--repo C:/workspace/tolstack/data/scratch/nested_bodies/repo`
(all seven projections built from a committed tree whose projection inputs equal
integration's):

| tree | result | log line |
| --- | --- | --- |
| `git archive integration` (`e34401a0`) | **1/2, FAIL** | `P2 with no study: 19 leaders; joint nodes the scene drew 4 (pitch_link_lower_sphere_centre, pitch_link_upper_sphere_centre, tan_link_lower_sphere_centre, tan_link_upper_sphere_centre)` |
| integration + this review's merge | **1/2, FAIL** | the same line |

So the red is integration's own and not the merged handoff's. At least one of the
four scene-placed joint nodes gets no leader. The likeliest skip is `offDag` or
`offScene` in `VA.seamDots`/`drawSeamLeaders`. The check prints only `noAnchor`, so
the log cannot say which one, or why.

What to do: print `lastSeamDraw.skipped` in full in the log line (`offDag`,
`offScene` as well as `noAnchor`). Then decide whether the missing leader is a
product defect, or an off-screen DAG dot the check should exclude, as its own
comment ("on screen") says it means to. Until then, the browser tier is red on
integration in a second suite besides `annotate rail holds still`
(`ISSUE_20261108_the_rail_holds_still_browser_check_is_red_on_integration.md`).

## Resolution 2026-11-09

An off-screen DAG dot. The full log line, from main-checkout projections
rebuilt from `3d04f5cd`:

- `noAnchor`: `hub_blade1_root_bearing_bore`, `hub_spindle_bore_axis`.
- `offDag`: `pitch_arm_link_bore`, `pitch_arm_root_seat`,
  `pitch_link_lower_sphere_centre`, `pitch_link_upper_sphere_centre`.
- `offScene`: none.
- No dot: none.

The two unled joint nodes are `pitch_link_lower_sphere_centre`, whose dot is
at page (843, 1615), and `pitch_link_upper_sphere_centre`, at (843, 1563).
The window is 1700x1500 and the pane spans y 300 to 1824. Both dots are below
the window, so the product rightly draws no leader. The viewport comment
("tall enough that every one of the model's DAG dots is in the pane's view")
stopped being true once the DAG grew.

The check now measures "on screen" itself, as inside the pane, inside the
window and not under the pinned band, rather than reading the page's own skip
lists. Every joint node on screen must be led. Each off-screen one is then
scrolled to and must be led there too. Both pitch-link nodes are
(`scrolled to: {"pitch_link_lower_sphere_centre":true,"pitch_link_upper_sphere_centre":true}`),
so all four joint nodes are still covered. Result: 2/2.
