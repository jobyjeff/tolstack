---
type: chore
priority: low
status: deferred
area: strategy/dag-layout
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20260930_columns_ordered_to_minimise_crossings.md
class: stale_prose_reference
defer_until: docs/strategy/BRIEF_20260914_dag_layout_geometry_tradeoffs.md
---

# `BRIEF_20260914_dag_layout_geometry_tradeoffs`'s consumption marker quotes an exact minimum of 7, and the shipped pass reaches 17 on purpose

Filed rather than fixed because the brief was being edited in the main checkout
(uncommitted) while this handoff ran, and because the number is a strategy
record's, not a tactical artifact's.

## What the marker says

The `PARTIALLY CONSUMED 2026-09-30` block records:

> as-allocated 32 link-over-rail crossings on `pitch_system`, shortest-leg-
> nearest 17, exact permutation minimum 7

All three figures reproduce exactly — but they are **links only** (branch-link
plus close-link crossings). The handoff that consumed the item specified a
three-term objective, *"branch + close + leader … count all three, equally
weighted"*, and under that objective:

| ordering of `pitch_system`'s nine non-trunk columns | branch | close | leader | total |
|---|---|---|---|---|
| as allocated | 20 | 12 | 52 | 84 |
| links-only exact minimum | 6 | 1 | 34 | **41** |
| three-term exact minimum (= shortest-leg-first) | 0 | 17 | 0 | **17** |

So the links-only "7" is reachable, and it costs 34 leader crossings — 30 of
them drawn on the page — which is the defect `viewer_dag_spine_layout` existed
to remove. The shipped pass takes the three-term minimum, which is the
shortest-leg-first order Jeff described in words, and `pitch_system`'s
branch+close therefore lands at 17, not 7.

Left as read, the marker says the work under-delivered against its own brief.

## What to change

* the marker's "exact permutation minimum 7" → say it is the **links-only**
  minimum and that it is not the one that shipped, with the leader cost beside
  it;
* item 2's own body still carries the 2026-09-14 measurements (`47 → 43`, the
  `spine leaders 43 / branch leaders 43` table). Those are historically
  accurate and arguably should stay, but the section's open question — *"what,
  if anything, removes the remaining 43"* — is now **answered: nothing
  remains**. On the shipped order the five committed topologies go `139 → 0`
  across the mirror, five of five to zero, and `pitch_system`'s own rendered
  leader-vs-rail crossings are 0 (from 43). A one-line answer under item 2
  closes the brief's sharpest row.

Numbers above are reproducible from
`build_topology_projection.layout_crossings` and are tabulated in
`docs/sessions/lessons/LESSONS_20260930_columns_ordered_to_minimise_crossings.md`.
