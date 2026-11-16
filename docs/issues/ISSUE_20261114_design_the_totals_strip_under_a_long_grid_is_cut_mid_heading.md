---
type: chore
priority: low
status: deferred
area: design
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261112_the_page_is_a_fixed_layout_and_nothing_scrolls_the_document.md
defer_until: 2026-12-15
resolution: deferred 2026-11-15 (triage) -- low defers by default
class: merged_page_walk_20261112
---

# Design: the totals strip under a long grid is cut mid-heading

Since the fixed shell (2026-11-14) the study summary under the grid
(`#totals`, `.tv__main > .tvtotals`: `flex: 0 1 auto; min-height: 0;
overflow-y: auto`) is the one box in the right-hand column that gives way
with no floor. Beside a grid long enough to fill its region it is squeezed
to about two lines, and the cut lands wherever it lands: in
`docs/sessions/lessons/shots/the_page_is_a_fixed_layout_and_nothing_scrolls_the_document/3840x2160_vpa_pitch_linkage_both.png`
(v1, nothing selected, 3840x2160) the "What's missing (99)" heading is
sliced through its middle by the Preview's divider, with no scrollbar showing
that more is below.

The content is reachable (the box scrolls), so this is a design faux pas, not
a defect: the strip reads as broken rather than as a region. Options: a
min-height of one whole line block for the strip, or the strip taking its
height before the grid's region (it is short, and the grid already scrolls).
