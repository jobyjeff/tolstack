---
type: bug
priority: med
status: resolved
area: apps/viewer
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_viewer_component_names_and_reference_copy.md
handoff: docs/sessions/HANDOFF_20260916_topology_grid_scroll_and_grips.md
resolution: handoff completed 2026-09-16 -- closed automatically by dispatch when handoff `topology_grid_scroll_and_grips` moved to completed/; not independently verified.
---

# A wide preview pane can slide over the grid's own drag grips, and a pointer reaches the pane instead

`viewer_component_names_and_reference_copy` (2026-09-15) made the preview pane
draggable. That exposed a layout interaction that was always latent and is now
reachable by the reader's own hand.

**What happens.** `.tv__main` (toolbar + DAG + grid) is a flex item with
`min-width: 0` and **no horizontal scrollport** — full-page scroll is a landed
contract (`viewer_error_surface_and_layout`, 2026-09-09) and the grid's head
table carries a fixed inline width off `VA.TOPO_COLUMNS`. So the grid's content
routinely overflows that box horizontally, and `#detail` — a later flex sibling
with its own background — paints over the overflow. Anything in the
horizontally-overflowing region that is *interactive* becomes unreachable: the
pixels are painted by the pane, and a pointer hits the pane.

The two controls in that region are the grid's own drag grips: `.tvgrip--jog`
(the jog zone's, on the SVG/grid seam) and `.tvgrip--col` (the ELEMENT column's,
on its header cell's right edge).

**Measured.** Chrome at 1600×1000, `pitch_system`, the ELEMENT column dragged
+220px and the jog zone at 5.5× (all reachable in a few gestures):

| pane width | `.tv__main` | jog grip at x | `#detail` starts at x | grip reachable |
|---|---|---|---|---|
| 430px (shipped) | 863px | ~1090 | ~1170 | yes |
| 560px | 733px | ~1090 | ~1040 | **no** |

At 560 the browser tier's own `[real] pitch_system's jog zone drags open` check
went red with `scale 5.50 -> 5.50` and `svg 793 -> 793px`: the synthetic
pointer-down landed on the preview pane. (That check is now three named
sub-checks with the numbers in their names, which is what made this diagnosable
at all.)

**Why it is filed and not fixed.** The handoff put the default width back to
430px, which is where it shipped — Jeff asked for the pane to be *resizable*,
not for a wider default, and a wider default bought a reachability hazard for a
control another handoff had just shipped. But the drag means a reader can put
the pane at anything up to `VA.TOPO_PANE_WIDTH.max` (1000px) and reproduce it,
so the interaction is still live and still needs a decision:

1. **Give `.tv__main` a horizontal scrollport** (`overflow-x: auto`). Smallest
   change, and it makes the overflow navigable rather than hidden — but it is a
   deliberate reversal of the full-page-scroll contract for one axis, and that
   contract was argued for at length (the DAG pane owned a scrollport and it was
   taken away on purpose). Needs the argument re-made for the horizontal axis
   specifically.
2. **Move the grips out of the overflowing region** — e.g. pin them to the
   sticky column header's own visible edge rather than to the table's. Keeps the
   contract; more work, and the ELEMENT grip's position *is* the column boundary
   it resizes, so "visible edge" and "the thing it means" come apart.
3. **Clamp the pane's max against the space the grid needs.** Cheap, and the
   worst of the three: the reader asked for a wide pane and would silently not
   get one, which is the class of thing this repo's copy rules are against.

Repro: `apps/viewer/topology.html`, `pitch_system`, drag the ELEMENT column
right by ~200px, drag the jog zone open by ~200px, then drag the preview pane
open by ~130px. The jog grip's hairline is still visible at the seam; pressing
on it does nothing.
