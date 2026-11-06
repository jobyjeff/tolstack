---
type: bug
priority: high
status: open
area: tests
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20261105_the_dag_is_coloured_by_a_chosen_attribute_and_spaced_to_taste.md
---

# Two kinematic-page browser checks still match the edge names `2e97a77a` renamed

`2e97a77a` (stack_wording_drops_filler_and_the_hover_says_the_same_thing)
shortened every element and edge name in
`docs/topologies/topology_vpa_pitch_linkage.json`, including:

| edge | before | after |
| --- | --- | --- |
| `pitch_plate_attach_height` | pitch plate spindle axis to pitch-link attachment bore, height | spindle axis to pitch-link bore height |
| `tan_link_mount_height` | tangential link mount base face to attachment bore | base face to attachment bore |

Two checks in `scripts/run_viewer_browser_tests.mjs`'s "kinematic study page"
suite still match the old phrases, so both are red on `integration`:

- `[real] hovering a sensitivity shows its curve across the sweep, both signs of
  the mount height's on its axis` matches `/tangential link mount/` on the card.
- `[real] clicking a term row selects pitch_plate_attach_height in place: …`
  matches `/pitch-link attachment bore, height/` on `#detail`.

**Measured:** red on a detached worktree at integration `5f9a95bf`, with
projections rebuilt from that tree and inputs bridged: `--only "kinematic
study page"` gave 22/24, and these two were the reds. They are red in the same
way on the review branch of
`the_dag_is_coloured_by_a_chosen_attribute_and_spaced_to_taste`. The
stack-wording review did not run the browser tier. The
everything-in-3d-is-transparent review's 41/41 ran on a tree without
`2e97a77a`. I have not checked which suites made up the rail review's 40/42.

**Fix:** match each check on the edge's new name, or better, on
`data-id` plus the name read from the projection, so a later rename cannot
redden it again. Each check's mutation spec should still witness it after the
change.
