---
priority: high
depends_on: [the_map_draws_the_end_stop_model]
model: opus
hitl: false
---

# HANDOFF 2026-11-15 — the_walk_reads_the_map_and_the_binding_flow_on_the_merged_page: one page for Jeff — his 11-15 sentences and the 11-12 review's open rows, each against what the merged page does now, with a shot

Source: the chain rule (Jeff, 2026-11-12: steps chain to a review point, and
the review is a page, not a strategy session) and
`dispatch/docs/strategy/HANDOFF_20261115_strategy.md`. Baseline: `master` or
`integration`, whichever carries all of: `the_hub_is_one_part_in_the_grid_and_the_dag`,
`a_suggestion_names_its_face_and_the_mating_side_ranks_the_candidates`,
`a_pattern_is_bound_as_its_like_faces_and_a_face_can_be_added`,
`the_map_draws_the_end_stop_model`. Scope: `docs/sessions/lessons/` (the
review page, the lesson, shots) and `docs/issues/`. No code, with one
exception: a defect that is one line and plainly wrong may be fixed as the
11-14 walk fixed the black chord fill, in its own commit, named at the top
of the review page. Anything larger is an issue.

**Bind nothing in Jeff's real log** (`C:\workspace\tolstack\data\inbox\feature-identity\`).
Walk the real projection for looking; use a scratch data root with a copy of
the log for every bind, unbind, take and add.

## Deliverables

1. **`docs/sessions/lessons/REVIEW_20261115_the_map_and_the_binding_flow.md`.**
   The same form as `REVIEW_20261112_the_merged_page.md`: one row per
   sentence — Jeff's words, what the page does now, does / partly / does not,
   a shot. Rows:
   - Every sentence of Jeff's 11-15 note that asks for or reports something
     (quoted in full below).
   - The 17 rows `REVIEW_20261112_the_merged_page.md` marked partly or does
     not, re-read on this page (rows 1/28, 2, 3, 4, 5, 13, 15, 20, 21, 26,
     34, 38, 40, 41, 47, 48).
   - The map against the reference: one row per element of the two tables in
     `the_map_draws_the_end_stop_model` (districts, part outlines, pins,
     jumpers, each joint symbol, bundles, routing), and one row per region
     size for whether it reads.
   Open the page with three lines: what Jeff can now do that he could not on
   11-15, what is still wrong, and the two or three things only he can
   decide (at least: is the wide arrangement right or does Side by side need
   its own; is the map ready for the present DAG to retire).

2. **The shots**, at 3840×2160 and 5120×2160, in
   `docs/sessions/lessons/shots/the_walk_reads_the_map_and_the_binding_flow_on_the_merged_page/`,
   each read with vision against the claim it sits beside before the row is
   written.

3. **Issues** for what the walk finds, with frontmatter; small findings may
   share one issue as the 11-14 walk's did.

Jeff's 11-15 note, tolstack part, in full:

> Large batch of updates finished, what are next steps? I did some quick spot
> checks, a few things: hub blade root bore was bound to the wrong blade bore.
> I unbound it, then went and selected the mating side (one of the bearing
> seats on the blade itself). Was hoping the hub would then recommend
> cylindrical surfaces that are coaxial with the blade's selected cylindrical
> seat. It didn't so I selected it manually. Is another pass at the
> selection/suggestion filtering still due? Also, under tangential link mount
> base face, there's a line that says 'suggested, high', but there is only a
> 'pick a face' button, no indication of what the suggested face is. Overall
> the binding, hilighting, selection etc. is greatly improved already (aside
> from issues pointed out above). I stopped there, didn't attempt to bind
> anymore faces, just wanted to try out the features and see if there were
> any obvious issues. Also noticed the hole pattern only allowed one surface
> selection (technically half of a cylinder). I don't think we've built that
> (multi-surface select) but it is on the todo list. For suggested surfaces,
> could pre-select/select all cylindrical features that are equal in size,
> and located axially on the same plane (or nearly the same plane). Dagview:
> new dag layout (subway map) is this coming up soon in the plan? DAG still
> looks like the old version (though I now see the Side by side/3d/DAG
> option). Assembly hierarchy is maybe implemented now- I see only the pitch
> link and tangential link as expandable assemblies in the grid view. Nothing
> happens when I expand them, likely because the actual model hasn't been
> built out with the structure (tan link mount, pitch plate etc).

On the last sentence: the three bearings under the two links carry no
features and no dimensions in `docs/topologies/topology_vpa_end_stop_v2.json`,
so open and folded show the same single row. Report it as it is; rows for
the bearings arrive with the first tolerance study, not here.

## Definition of done

- The review page exists, every row has a shot that was read, and the counts
  (does / partly / does not) are stated at the top.
- The real log's event count is the same before and after.
- Lesson (`docs/sessions/lessons/LESSONS_20261115_the_walk_reads_the_map_and_the_binding_flow_on_the_merged_page.md`):
  how long the walk took by part, which tree it walked (sha), and what the
  next viewer handoff should know that the review page does not say.
