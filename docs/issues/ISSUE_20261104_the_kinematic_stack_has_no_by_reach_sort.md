---
type: feature
priority: low
status: open
area: viewer/kinematic grid
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261103_the_kinematic_grid_is_a_stack_of_sub_stacks.md
---

# The kinematic stack has no "by reach" sort

The handoff's deliverable 1 asked that ordering by reach (largest contribution
first, the retired results-pane table's default) become "a column sort the
reader can ask for, not the default". The chain order is the default now
(`VA.kinematicStackOrder`), but no reach sort was built.

**Why it needs a design call, not a fix.** The grid's rows are bound to the
DAG beside it by leaders, and the leader routing rests on the grid and the
DAG's band being in the same order (`VA.leaderGeometry`'s premise). The DAG's
band now reads in the stack's order (`VA.orderBand`). Re-sorting the grid
alone crosses every leader. Three options:

1. Sort only inside a sub-stack, and leave the sub-stacks in chain order. The
   band could follow the same order, but the chain adjacency inside a
   sub-stack is lost.
2. Re-lay the DAG band in reach order too. That is drawable, since
   `VA.orderBand` accepts any order, but the band stops reading as a chain.
3. Show reach as a ranking chip or a sparkline per row instead of moving
   rows.

Recommendation: 3, because it keeps the stack's geometry intact. Size: a
pure ranking plus one cell, about half a session.
