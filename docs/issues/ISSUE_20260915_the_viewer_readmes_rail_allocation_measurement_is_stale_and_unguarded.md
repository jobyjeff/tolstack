---
type: chore
priority: low
status: triaged
area: viewer/docs
reporter: agent
handoff: docs/sessions/HANDOFF_20260915_viewer_hygiene_pass.md
---

# The viewer README's rail-allocation measurement is stale, and now contradicts a guarded count in the same file

`apps/viewer/README.md`, in the column-reuse bullet (pre-existing, measured in
`review/dag_viewer_poc`):

> Measured in `review/dag_viewer_poc`: on the two committed topologies reuse does
> not currently fire at all — **nine allocations over nine columns for the pitch
> system, two over two for L1**, and disabling reuse entirely leaves both numbers
> unchanged.

The live projection (`data/projections/viewer/topologies.json`) disagrees, and so
does the rest of the sentence:

| topology | `layout.columns` | `layout.rails` |
|---|---|---|
| `pitch_system` | 10 | 10 |
| `pitch_link_to_pitch_plate` | 3 | 3 |
| `rotor_fastener_length` | 10 | 10 |
| `tan_link_to_pitch_plate_take2` | 2 | 2 |
| `vpa_output_to_pitch_plate` | 2 | 2 |

"the two committed topologies" is also stale — there are five.

`viewer_study_respine_animation` then added, ~350 lines below it in the same
file, a **guarded** statement of the same quantity — *"`pitch_system`'s walk
needs **10 columns**, while every one of its study chains is linear and needs
**1**"*, paired against `livePitch.layout.columns` by a fast-tier `[real]` test.
So the README now states 9 and 10 for one number, and only the second one breaks
loudly when the projection moves.

This is the overlay's *"the handoff fixed the one guarded copy of a count and
missed every other"* shape, except the other copy predates the handoff by five
weeks and is out of its scope, which is why it is filed rather than fixed.

## What would close it

Re-measure the bullet against the current projection (or restate it as a dated
historical measurement, which is what it is — the claim it is making is about the
*mechanism*, not about today's widths) and pair whatever number survives against
the tree, the way the respine section's sentence is paired.

Found by the `viewer_study_respine_animation` review (2026-09-15).
