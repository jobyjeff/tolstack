---
type: chore
priority: med
status: resolved
area: viewer/topology grid
reporter: agent
resolution: resolved 2026-11-06 by the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what (review round 2, integration merged into the handoff branch) -- the grid's legend and rows kept; the legend-tints guard and its spec retired; --wash-untraced / --wash-nocite and the legend swatch rules deleted (nothing else read them); the --group-* fallbacks dropped
found_by: docs/sessions/HANDOFF_20261105_the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what.md
---

# The grid and DAG-colour branches both rewrite the sourcing legend and the grid's tokens

Two handoffs that ran on 2026-11-05 edit the same grid surfaces, and
whichever lands second will conflict:

- `handoff/the_dag_is_coloured_by_a_chosen_attribute_and_spaced_to_taste`
  rewrites `sourcingLegend` in `apps/viewer/views/topology.js` to list row
  tints and washes, adds `--wash-untraced` / `--wash-nocite` and the
  `--group-*` hues to `topology.css`'s `:root` (next to the `--tv-divide-*`
  and `--tv-stack-rule*` tokens), and enrolls a guard that the legend names
  every tint a grid row wears.
- `handoff/the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what`
  takes all row tints and washes out of the grid, deletes `--tv-divide-*` /
  `--tv-stack-rule*` and `VA.gridRowMarks`, and replaces the legend with one
  that lists the sourcing marks (`VA.SOURCING_MARKS`).

How to resolve it when both are merged:

1. Keep the grid branch's legend and row code. A grid row wears no tint now,
   so the DAG branch's "the legend names every tint the grid's rows wear"
   guard has nothing left to name on the grid side. Re-point it at the DAG's
   fills, or retire it and its spec.
2. Keep the DAG branch's `--group-kinematic / --group-chain / --group-body /
   --group-part`. The grid's `.tvbrace--*` rules read those names with a
   fallback ink (`var(--group-chain, var(--ink))` and so on), so once both
   land the brackets take the DAG's hues and the fallbacks stop mattering.
   Drop the fallbacks then, so there is one source.
3. `--wash-untraced` / `--wash-nocite` are unused on the grid after the merge.
   Delete them unless the DAG branch uses them elsewhere.
