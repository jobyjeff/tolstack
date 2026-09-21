---
type: chore
priority: low
status: open
area: apps/viewer
reporter: agent
found_by: docs/sessions/HANDOFF_20260921_annotate_hint_bar_and_context_autofilter.md
---

# The viewer flyout's minimum width still reserves the annotator's retired third column

`VA.FLYOUT_WIDTH.min` is 560 (`apps/viewer/views/topology.js`), and the comment
above it says where the number came from:

> `min` is the annotator's own three-column grid (260 + 320 of chrome either
> side of its canvas, apps/annotate/style.css) plus enough canvas to orbit in.

Since 2026-09-21 (`annotate_hint_bar_and_context_autofilter`) the annotator has
**two** columns: the 260px rail and the 3D scene. The 320px detail column is a
bar across the top of the canvas instead. So the floor reserves ~320px of
chrome that is no longer there, and the comment describes a layout that is
gone.

Nothing is broken — a floor that is too high only means the panel cannot be
dragged as narrow as it now could be, and 560 is still a perfectly usable
width. What IS wrong today is the comment: it is a derivation of a live number
from a layout that no longer exists, which is exactly the kind of stale
arithmetic this repo's prose guards exist to catch, and the next person to
tune the floor would re-derive it from the wrong premise.

## What to do

Re-derive `min` from the two-column annotator (260 + orbit room) or keep 560
and say *why* it stayed — either is fine, the point is that the comment and the
layout agree again. `scripts/run_viewer_browser_tests.mjs`'s flyout suites
measure the drag against this constant, so a change to it is covered.

## Why it was not fixed in place

The handoff's scope fenced `apps/viewer/` off except for `VA.annotateLink` /
`VA.annotateExecCommands` (the deep-link contract), and neither was needed:
`trace=1` already omits `study` when there is none, so no new URL parameter was
added. `VA.FLYOUT_WIDTH` is the viewer's own layout vocabulary and belongs to
whoever owns that page next.
