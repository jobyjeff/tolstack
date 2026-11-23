---
type: bug
priority: low
status: open
area: viewer/map tooling
reporter: agent
found_by: docs/sessions/HANDOFF_20261122_the_lug_stacks_line_up_and_each_link_is_a_row_on_the_map.md
---

# The map arrangement scorer counts zero crossings on code that has no crossing rule

`tests/debug_map_arrangement.mjs` (hand-run, added 2026-11-22) says in its
header that `--code <older tree's apps/viewer>` scores an older layout "with
its own code; the counts it prints are this script's, so a before and an after
are counted the same way". The crossing count is not the script's: `score()`
calls `VA.mapRoutesCross` from the loaded code, and where that is missing it
counts `false` -- zero, with no line saying it could not count.

Measured in the review (2026-11-23): the 11-21 layout with the 11-21 code
(`--code` on a `git archive 04a21d1c` export) prints `crossings 0`. The same
geometry judged with the merged tree's `VA.mapRoutesCross` has 5 (one strict
crossing, four routes turning on another), and the merged tree's
`VA.mapRouteNotes` gives it 5 notes.

## Fix shape

Load the crossing test from the script's own tree (`loadMap(repo/apps/viewer)`)
and use it on the `--code` tree's geometry, or print `crossings: n/a (the code
has no VA.mapRoutesCross)` instead of a number.
