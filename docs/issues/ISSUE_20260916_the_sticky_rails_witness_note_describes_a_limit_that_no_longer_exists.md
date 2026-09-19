---
type: chore
priority: low
status: triaged
area: tests/mutation-witnesses
reporter: agent
handoff: docs/sessions/HANDOFF_20260918_mutation_witness_enrollment_gaps.md
found_by: docs/sessions/HANDOFF_20260916_topology_grid_scroll_and_grips.md
---

# `sticky-rails-hold-a-scrolled-dag`'s note still describes the limit that handoff removed

`scripts/mutation_witnesses.json`, witness `sticky-rails-hold-a-scrolled-dag`,
ends its `note` with:

> The arm also pins the LIMIT (the sticky runs out of containing block past
> paneWidth - dagWidth) in a second sub-check, which the issue above tracks.

`topology_grid_scroll_and_grips` (2026-09-16) removed that limit:
`.tv__body { width: max-content }` makes the sticky's containing block the
content's width, so the rails hold for the whole horizontal scroll. The second
sub-check in `testRespine`'s scrolled arm was rewritten in the same change and
now reads "and it holds PAST the room the DAG leaves beside it, all the way to
the far end". The note's "the issue above tracks" is also spent — the issue it
points at is the one that change closes.

**Everything mechanical about the witness is still correct and still green.**
`find` matches `apps/viewer/topology.css` byte-for-byte (`.tv__rails`'s
declaration line was not touched), and the run is witnessed:

```
node scripts/run_mutation_witness_tests.mjs --only sticky-rails-hold-a-scrolled-dag --repo C:\workspace\tolstack
  1/1 declared mutations witnessed
```

So this is prose drift in a file the 2026-09-16 handoff was explicitly told not
to edit (`mutation_witness_tier_reaches_its_checks` owns it, staged in
parallel), not a broken guard. Fix: drop or rewrite the last sentence of the
`note`.
