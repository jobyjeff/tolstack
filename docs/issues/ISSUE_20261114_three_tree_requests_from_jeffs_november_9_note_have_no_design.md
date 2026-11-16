---
type: feature
priority: med
status: deferred
area: viewer/tree
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261112_the_walk_reads_the_merged_page_against_jeffs_november_notes.md
defer_until: 2026-11-29
resolution: deferred 2026-11-15 (triage) -- med beyond budget; the 11-12 chain rule allows one viewer handoff at a time, and most of these are inputs to the strategy session's map handoff (REVIEW_20261112_the_merged_page.md)
class: merged_page_walk_20261112
---

# Three tree requests from Jeff's 11-09 note have no design and no handoff

The merged-page walk (merged `integration`, v2, 3840×2160) read each sentence of
Jeff's 2026-11-09 note against the page. The tree now matches most of it. It is
bodies → parts and interfaces, with one dot per row and two-sided interfaces.
Three requests are not on the page. Each needs a decision before a tactical
handoff can be written.

| Jeff's request | What the page does now | Shot (`docs/sessions/lessons/shots/the_merged_page_20261112/`) | Decision needed |
|---|---|---|---|
| "At the top put a set of filters (bound, unbound, all), sort them by bound status (unbound at the top)" | No filter. Rows keep the model's order. | `13_select_pilot_bore_from_parts.png` | Where the filter sits now that interfaces live under each body and under "joints between bodies". Does it filter features, interface sides, or both? |
| "you can remove a part from the rigid body, or add one … you add parts to rigid bodies rather than adding them to the model" | Parts are listed per body. No control adds, removes or offers parts. | `00_landing_bare_3840.png` | Whether the viewer, which is read-only today ("renders the built projections"), may write model edits. Writing one is a new event kind, like the binding log. |
| "The 'Stacks' section … they shouldn't be displayed" | The section is gone, but both thermal-fit stacks ("Main spindle bearing seats, M1 as-built / M2/TC intent") are options in the model dropdown beside the two models. | `00_landing_bare_3840.png` | Hide them until they are ported into a model, or keep them as a third kind in the dropdown. |

Recommendation: the stacks row is small and reversible. Hide stack topologies
from the dropdown until they belong to a model. The first two rows belong with
the "single page per model / analyses list" question Jeff raised in the same
note.
