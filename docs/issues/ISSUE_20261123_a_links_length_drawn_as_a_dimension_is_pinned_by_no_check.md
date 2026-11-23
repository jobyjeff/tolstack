---
type: bug
priority: med
status: open
area: viewer/map
reporter: agent
found_by: docs/sessions/HANDOFF_20261122_the_lug_stacks_line_up_and_each_link_is_a_row_on_the_map.md
---

# A link's length drawn as a dimension is pinned by no check

Handoff `the_lug_stacks_line_up_and_each_link_is_a_row_on_the_map`
(deliverable 3, Jeff's 11-19 walk: "each link's length is a long lane that
reads as another box") draws an assembly's own dimension as a drawing does:
`apps/viewer/map.js` builds `j.dimension = { ext, line }` for a jumper with a
lane, and `apps/viewer/views/map.js` draws it as `map__jumperext` extension
lines and a `dimensionLine()` path with two arrowheads, the group classed
`map__jumper--dimension`.

Nothing checks any of it. Measured in the review (2026-11-23): on a
`git archive` export of the merged tree, renaming `j.dimension = {` to
`j.nodimension = {` -- so every link length falls back to the old three-sided
lane -- left the viewer fixture tier green (529 fixture checks passed; the
`[real]` tier was not paired on that export). `git grep` finds no test naming
`map__jumper--dimension`, `map__jumperext` or `.dimension.` in
`apps/viewer/tests.js` or `scripts/run_viewer_browser_tests.mjs`. The
handoff's walk probe (`tests/debug_lug_stacks_20261122.mjs`) checks only that
the length lights on hover, and it is run by hand.

So the one thing Jeff asked of that drawing can be reverted with every tier
green.

## Fix shape

A fast-tier check on the real v2 model, or a fixture: each assembly dimension
with a lane renders one `g.map__jumper--dimension` holding one
`path.map__jumperext` (two legs) and a `map__jumperline` whose `d` has three
subpaths (the line and two heads), its ends at `via[1]`/`via[2]`. Enrol it with
a witness spec in the same change.
