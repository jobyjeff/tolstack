---
priority: high
depends_on: []
model: opus
hitl: false
---

# HANDOFF 2026-11-15 — the_hub_is_one_part_in_the_grid_and_the_dag: the end-stop model draws the hub once on both surfaces

Source: the 2026-11-15 triage sweep, from
`docs/issues/ISSUE_20261114_the_hub_is_two_groups_in_the_grid_and_two_blocks_in_the_dag_on_v2.md`
(high), which the merged-page walk
(`the_walk_reads_the_merged_page_against_jeffs_november_notes`, review at
`docs/sessions/lessons/REVIEW_20261112_the_merged_page.md`) found.
Baseline: tolstack `master` at `f43d02ae`, which now carries the whole 11-12
chain, including `a_part_may_contain_parts` and
`the_page_is_a_fixed_layout_and_nothing_scrolls_the_document`.
Scope: the viewer's walk and part grouping (`VA.gatherParts` and the grid/DAG
code that consumes it) under `apps/viewer/`, plus their tests. Do NOT touch the
browser test runner's suite setup, which the staged
`the_scene_suite_opens_its_own_pane` owns.

**Chain rule (strategy, 2026-11-12):** one viewer handoff at a time, opus,
look at the merged page. This is the one viewer handoff on the board. The
strategy session's next step is the **map handoff**, which draws into the DAG
region, and it should `depends_on` this one. A split hub would otherwise be
drawn twice into the new map.

## The defect

- **Jeff on 11-09:** "214372-002 (hub) has two separate groups within the
  same rigid body, one with a single line and one with three lines".
- **Jeff on 11-12, on the trunk then served:** "part groupings in the grid
  view look correct now".
- **On the merged tree (walk, 11-14, v2, no study selected):** the hub
  `214373-002` is split on both surfaces.
  - **Grid**, body `ground`: one bracket with "locating boss to blade 1 root
    bearing bore" plus the "across a clearance" row. Then the mount, gas-spring
    mount and piston cover. Then a **second** `214373-002 propeller hub`
    bracket with the two "locating boss to tangential link mount …" rows.
  - **DAG:** a `214373-002` block at the top of the ground field and a second,
    truncated `214373…` block at its foot. Hovering the hub in the tree lights
    both.
  - Shots: `docs/sessions/lessons/shots/the_merged_page_20261112/01_grid_landing_v2.png`
    and `…/02b_hover_hub_dag.png`.

The likely origin is the 11-12 chain: `a_part_may_contain_parts` changed the
walk's part grouping. It is not the kinematic-band case of
`ISSUE_20261106_a_part_the_kinematic_stack_visits_twice_is_two_blocks`. This is
the whole walk with no study selected.

## Deliverables

1. **Bisect before fixing.**
   - Render v2 on `1fedd8df` (trunk before today's merge, which Jeff saw as
     correct) and on `f43d02ae`, against the same topology projection.
   - Name the commit that split the hub.
2. **The hub is one run in the grid and one block in the DAG**, on v2 with no
   study, and on every other model where a part is reached from two directions
   in the walk. Check the other fixtures for the same split and list them in
   the lesson.
3. **A guard that would have caught it**, at the cheapest tier that can: a
   `gatherParts` unit case in `apps/viewer/tests.js` where one part is reached
   twice, which asserts one run.

## Definition of done

- Before and after shots of the hub on v2, at the same size the walk used
  (3840×2160), with the grid and the DAG each showing one hub. Put them in
  `docs/sessions/lessons/shots/` and cite them from the lesson.
- Tests:
  - viewer node tests green;
  - default tier green: `PYTHONIOENCODING=utf-8 C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`
    from a worktree;
  - the browser and witness tiers for the specs you added or changed, per
    CLAUDE.md's table.
- The issue set to `status: resolved` with a one-line `resolution:`.
- Lesson (`docs/sessions/lessons/LESSONS_20261115_the_hub_is_one_part_in_the_grid_and_the_dag.md`):
  the splitting commit, the rule `gatherParts` now follows, and the other
  models it changed.
