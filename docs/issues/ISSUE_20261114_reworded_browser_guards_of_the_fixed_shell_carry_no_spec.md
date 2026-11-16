---
type: chore
priority: low
status: deferred
area: tests/mutation-witnesses
reporter: agent
class: unenrolled_guard
found_by: docs/sessions/active/HANDOFF_20261112_the_page_is_a_fixed_layout_and_nothing_scrolls_the_document.md
defer_until: 2026-12-15
resolution: deferred 2026-11-15 (triage) -- low defers by default
---

# The fixed shell's reworded browser guards carry no mutation spec

The fixed shell (2026-11-14) rewrote `scripts/run_viewer_browser_tests.mjs`
for the region model. Every guard whose predecessor had a spec, and every
guard that pins the region contract itself, carries one (twelve renamed,
seven new; see the `browser` pin's comment in `scripts/guard_enumeration.mjs`).
The names below are new to the census but were declared without a spec. Most
are rewordings of a guard that never had one ("every leader lands on its dot
and its seam" read over zero leaders once the grid had its own region, so it
now says what it measures: "every row keeps its bar"); the rest are the
region-model halves of checks whose old halves were unenrolled.

Each is cheap to enrol with `node scripts/run_mutation_witness_tests.mjs
--unenrolled`, which prints the file name; the work is designing one edit
per guard that turns exactly it red, and a browser-suite run each to witness
it (about 2-4 minutes apiece under the one browser slot).

| Guard (browser tier) |
|---|
| the stack's region really scrolls at this viewport — the only configuration the out-of-flow contract below is falsifiable in |
| the card was opened with the stack's region still scrolled, and opening it moved the page by nothing |
| with no 3D pane open the leaders control says on hover that it draws only with the pane beside the DAG |
| every grid row has its bar on the DAG, and no leader runs across to the grid |
| nothing is remembered and nothing is inline, so the Preview's height here IS the stylesheet's default |
| ...and carries a grip mark, centred on the seam it sits on |
| the emphasized walk corresponds too — every row keeps its bar |
| tolerance mode: every row still has its bar |
| feature-size mode: every row still has its bar |
| every row keeps its bar beside a wider column |
| [real] tolerance width keeps every row on its bar |
| [real] feature-size keeps every row on its bar |
| [real] and the page is back on the column width it started at, so the divider block below measures what it thinks it does |
| the column right of the DAG carries a full-height drag divider, and the Preview a full-width one along the grid's foot |
| every row keeps its bar beside the moved seams |
| the arrow keys nudge both dividers without a pointer |
| [mock] at this window the DAG and the grid have more rows than room, so the checks below scroll something real |
| [mock] and the shorter window is still the whole page: nothing scrolls the document |
| every grid row keeps its bar on the DAG at compact density |
| [real] the product model's region check (skipped: not built) |
| [real] the product model's rows scroll inside the DAG's and the grid's regions, and the document stays the window |
| [real] its grid's rows start directly under their header in every mode too |
| [real] the header's own height is the stylesheet's, and it is the first thing in the grid's own scroller |
| [real] the header takes no padding: its columns are over the grid's own |
| [real] ...and past the grid's first screen it is held at the top of the grid's region |
| [real] every row keeps its bar after a Fit |
| [real] at zoom 1 the COMPONENT column starts right of the DAG's region |
| [real] a drag on the drawing's empty space pans the drawing with it |
| the arrow keys nudge the divider without a pointer |
| the elements table is wider than its scrollport at this viewport — the squeeze that makes a column floor load-bearing at all, and the reason this check reads it at 1100px, where the table has the room the 1600px page left it before the stack page took the whole middle |
| [real] the outgoing frame is held as an inert ghost, hidden from the a11y tree, still carrying the walk's own bars |
| [real] the ghost is the drawing alone: the header and the rows fade in place in the grid's own region, so no copy of either doubles them |
| [real] the drawing is drawn at the interpolated width, and the grid's header, in its own region, takes none of it |
| [real] and inside the drawing's own scroll extent, so nothing of it is drawn into the grid's region mid-flight |
| [real] the re-spun chain corresponds: every row keeps its bar |
| [real] and the frame in flight stays inside its own extent, scrolled as it is |
| [real] every row keeps its bar on the moved drawing, study by study |
