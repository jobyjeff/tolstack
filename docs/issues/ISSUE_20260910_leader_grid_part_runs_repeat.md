---
type: feature
priority: low
status: triaged
area: viewer
reporter: agent
audience: strategy
strategy: docs/strategy/BRIEF_20260911_viewer_3d_and_card_content_reach.md
---

# A part revisited by the walk gets one merged row per RUN — decide whether split runs need a visual tie

`viewer_leader_line_grid` (2026-09-10) shipped the merged-row grid with one
component cell per **contiguous same-part run** of the depth-first walk, not
literally one per part: the walk revisits a part on later branches, so the
real `pitch_system` renders 18 groups over 12 parts — four parts split, not
two: `hub` as 2 runs, `pitch_plate_215177_001` as 3, and `gas_spring` and
`blade_root` as 2 each (corrected in review 2026-09-10; the original filing
named only hub and pitch_plate, which understates the gap this issue asks
about). The handoff's DoD wording was "one merged row
per part"; forcing that literally would reorder the grid, crossing the leader
lines and breaking the walk-order row↔DAG correspondence that is the page's
contract — so the walk won, per that handoff's own instruction to file a
grouping gap rather than build speculatively.

The gap, stated narrowly: nothing beyond the repeated label says that two
`hub` runs are the same part. Possible directions (design call, not a fix):
a shared per-part hover highlight across runs, a subtle same-part tint pair,
or "N of M" wording in the component cell's hover title. Note the constraint
that killed a lane palette (topology.css header): the saturated colours are
provenance-reserved, and 12 parts exceed any categorical palette anyway.

Where to look: `VA.gridPlan` (apps/viewer/topology.js) builds the runs; the
run-per-visit behaviour is pinned by the fixture-tier test "a part revisited
on a later branch gets a merged row per visit" (apps/viewer/tests.js) and
discussed in `docs/sessions/lessons/LESSONS_20260910_viewer_leader_line_grid.md`.
The staged `viewer_hover_cards_and_deep_links` handoff already owns rich hover
on the component cell, so this may fold into it.
