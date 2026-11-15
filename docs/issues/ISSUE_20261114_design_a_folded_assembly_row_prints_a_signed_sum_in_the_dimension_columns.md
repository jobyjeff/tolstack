---
type: chore
priority: low
status: open
area: design
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261112_a_part_may_contain_parts.md
---

# Design: a folded assembly row prints a signed sum in the columns where every other row prints a dimension

Seen in the review of `a_part_may_contain_parts` (2026-11-14), on the demo shot
`docs/sessions/lessons/shots/a_part_may_contain_parts/demo_grid_collapsed.png`.

In the grid, every edge row's NOMINAL / MIN / MAX is the **element's own
dimension** (unsigned: `4.76 | 4.63 | 4.76`), its SENSITIVITY is the sign
(`−1`), and its CONTRIBUTION is the **signed range** (`− -4.76 … -4.63 mm`).

The folded assembly row (`assemblyRow` in `apps/viewer/views/topology.js`)
copies the TOTALS row's layout instead: NOMINAL / MIN / MAX hold the
assembly's **signed folded share** (`-10.3948 | -10.4948 | -10.0378`),
SENSITIVITY is blank, and CONTRIBUTION is `± 0.2285 mm`, a half-width.

So the same column means two things in adjacent rows. A reader scanning
NOMINAL sees a negative "dimension" for one part, and cannot check the fold
against the expanded rows by eye, because the expanded rows hold the signed
range in CONTRIBUTION and the folded row does not.

The numbers are right: they are the study's own fold (`topology.assembly_rollups`),
and the total does not move. This is about how the row reads. The lesson
records the choice as deliberate ("prints the totals row's columns").

Options, for whoever picks it up:
1. Leave NOMINAL / MIN / MAX blank on a folded row, and print the signed range
   in CONTRIBUTION (`− -10.4948 … -10.0378 mm`), matching the edge rows.
   **Recommended**: one column, one meaning.
2. Keep the totals-row layout, but mute or italicise the folded row's
   numbers so they read as a subtotal.
