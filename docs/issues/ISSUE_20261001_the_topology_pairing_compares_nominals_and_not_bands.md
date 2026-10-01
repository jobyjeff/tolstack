---
type: chore
priority: low
status: open
area: topologies
reporter: agent
found_by: docs/sessions/HANDOFF_20261001_one_part_feature_one_value_across_topologies.md
class: one_fact_written_twice
---

# The topology value pairing compares nominals and not bands — write the band half when the corpus first holds a pair

`test_one_part_and_feature_states_one_nominal_in_every_topology_that_states_it`
(added 2026-10-01, `tests/test_tolerance_stack.py`) widens the SOP's
same-part-same-value rule to topology edges. The SOP words that rule as
*"the same part+feature carries the same **band** in every stack that uses
it"*; the new guard compares **nominals** only.

That is a corpus fact, not an oversight. Measured over every committed
topology on 2026-10-01, exactly two part+edge-id keys recur, and neither
offers two comparable bands:

| key | `topology_pitch_system` | `topology_vpa_pitch_linkage` |
|---|---|---|
| `pitch_link` / `pitch_link_length` | nominal 0.0, band ±0.03 (variation-only: a width about an *unstated* nominal) | nominal 105.9908, `min == max` — no tolerance recorded at all |
| `tan_link_mount_215175_002` / `tan_link_mount_height` | nominal 0.0, band ±0.1 | no `dimension` |

A variation width and an absolute `min == max` are not the same quantity, so
comparing them would report a defect that is not one; and the second row has
nothing on one side. A band comparison written today is asserted against
nothing, which this repo counts as worse than no guard at all.

## When to write it

The first time a part+feature the guard already pairs gains a real band in a
second topology — most likely when `213862-002`'s drawing is acquired and
`pitch_link_length` gets a tolerance from the drawing rather than from
`260825_End_Stop_JC.xlsx`. At that point extend `_edge_nominal_statements` (or
a sibling) to yield `(min, max)` as well, with the same degenerate skip the
table above describes, and add the non-vacuity assertion beside it that
`test_the_topology_nominal_pairing_reads_both_places_a_nominal_lives` already
models for the nominal half.
