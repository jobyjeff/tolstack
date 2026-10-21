---
type: feature
priority: med
status: open
area: viewer/layout
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261020_the_3d_pane_opens_in_the_mode_the_study_wants.md
---

# With the 3D pane open, a chain study page leaves the DAG a narrow strip

The 3D pane now stays open and follows the nav, so the nav rail can no longer
stand down while the pane is open (it did until 2026-10-20, on Jeff's "you
shouldn't need both at the same time"). On a chain study page that makes four
columns share the window: pane, nav rail (300px), DAG + grid, preview pane.

Measured at the TRUTH tier's two viewports, pane at its 560px floor and the
preview pane at its default:

| window | left for the DAG + grid |
|---|---|
| 1600px | about 170px |
| 1920px | about 490px |

The width clamp still keeps the DAG drawing itself clear of the pane, but the
grid beside it scrolls in a slot narrower than its first column. The kinematic
page is unaffected (it has no preview pane).

## Options

1. **The preview pane stands down while the 3D pane is open, in topology
   mode** — the annotator's own element detail covers the selected edge, which
   is the argument the right-docked flyout used to make. Costs the crop and
   citation detail while the pane is open.
2. **The nav rail collapses to a narrow strip while the pane is open** (study
   names on hover), expanding on hover or focus. Keeps everything, costs a
   new rail state.
3. **Leave it; the reader drags.** Both dividers exist and both widths are
   remembered.

Recommendation: 1. It is one CSS rule beside the existing `body.flyout-open`
rules, and the pane and the preview pane answer the same question about the
same edge.

The decision is a layout call for a strategy session. The handoff that
introduced it kept the rail visible because its definition of done selects
studies in the nav while the pane is open.
