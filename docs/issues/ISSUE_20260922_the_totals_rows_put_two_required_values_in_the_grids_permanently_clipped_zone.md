---
type: bug
priority: med
status: open
area: viewer/topology-grid
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20260922_viewer_summary_balance_sheet.md
---

# The totals rows put two required values in the grid's permanently clipped zone

## The pre-existing part

`COLUMNS` (`apps/viewer/views/topology.js`) sums to **1218 px**, and the grid
pane is never that wide. Measured on the live `pitch_link_to_pitch_plate` at a
1600 px viewport with the preview pane at its default 560 px: the table starts
at x≈417 and the pane ends at x≈1037, so **620 px of 1218 is visible** — the
`max` column is cut mid-number and `contribution`, `sourcing` and `crop` are
off-screen entirely. `apps/viewer/README.md` already names this ("a separate,
pre-existing axis"), and the relief is `.tv__hscroll`'s sideways scroll plus
dragging the preview pane narrower.

## What this handoff changed about it

`viewer_summary_balance_sheet` (2026-09-22) made the grid's footer rows the
place a study's rolled-up answer lives. Two values the handoff required are in
the clipped zone:

| value | column | visible at the default layout? |
|---|---|---|
| worst-case half-width (`± 0.9901 mm`) | `contribution` | no |
| RSS half-width (`± 0.488755 mm`) | `contribution` | no |
| the criterion (`must be >= 0`) | `contribution` | no |
| the `BUDGET` scope chip | `sourcing` | no |

The row layout was chosen to keep the two that matter most in the always-visible
zone — the verdict chip and the check's label are in the `element` column, and
the **margin** is right-aligned across `nominal`/`min`/`max`, landing at the
same edge the worst-case row's own last number does. So the bottom line reads
without scrolling. The half-widths and the criterion do not.

They are placed correctly (a half-width is a spread, in the column a member
row's own spread occupies; the criterion is the row's premise, quieter than its
answer), and they scroll exactly as every member row's contribution does. The
defect is the column budget, not the placement.

## What would close it

Something that makes the grid fit, and it is a design decision rather than a
tweak:

* the `crop` column (110 px) is a thumbnail nobody reads at a glance and the
  preview pane shows the same crop;
* `sourcing` (260 px) is the widest column on the page and holds chips that
  could fold to one mark (the nav rail's own 2026-09-22 move);
* or the pane could scroll to the right-hand end when a study is selected, so
  the answer is what is on screen rather than the left edge of the walk.

Do not solve it by moving a totals value into a column it does not belong to —
that trades a scroll for a mislabelled number.
