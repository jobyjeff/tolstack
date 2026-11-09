---
type: bug
priority: high
status: triaged
handoff: docs/sessions/HANDOFF_20261109_the_two_red_browser_suites_on_trunk_go_green_against_a_fresh_projection.md
area: tiers/browser
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261108_the_dag_and_grid_nest_coloured_bodies_and_compact_means_denser_rows.md
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
