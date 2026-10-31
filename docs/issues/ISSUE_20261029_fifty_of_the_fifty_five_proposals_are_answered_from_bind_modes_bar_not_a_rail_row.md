---
type: feature
priority: med
status: deferred
area: annotate/proposals
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261029_a_rail_row_with_a_proposal_says_so_and_accepts_it_in_place.md
class: proposal_answer_reach
defer_until: 2026-11-13
resolution: triage 2026-10-30: med beyond the per-repo budget, deferred 14 days to a date (class has no program); the armed-pick handoff staged this sweep owns the same annotate files
---

# 50 of the 55 proposals are answered from bind mode's bar, not from a rail row

`a_rail_row_with_a_proposal_says_so_and_accepts_it_in_place` put the answer
on the kinematic rail's **joint-end** rows: "suggested · high", select to
light the face solid and framed, Accept / Pick a different face in place.
Measured on the real projection (2026-10-29, 55 open proposals on 33 edges):

| entry in the shell | rows reading "suggested" | proposals reachable | how they are answered |
|---|---:|---:|---|
| the topology row (every edge) | 33 | 55 | bind mode: select the row, the bar's Accept / Reject per end; the face is a dashed outline, not filled or framed |
| the kinematic study (P2) | 6 joint ends + 2 edge features | 5 (3 edges) | the joint-end row, in place |
| a chain study | 0–4 per study | 0–8 | bind mode, as the topology row |

So Jeff can ratify every proposal from the shell, but only 5 the way the
handoff describes. The other 50 are bound through edges that are not a
joint's feature in any sweep run (washers, bolts, bushings, thickness and
offset edges), so no sweep rail lists them, and bind mode's element row is
one row per **edge** (two ends). "Pick a different face" has no bind-mode
twin: there a human picks a face and binds it with the bind form, and the
proposal stays open until it is rejected separately.

Options for a strategy session:

1. **Bind mode's selected element row gets the same answer** -- the selected
   row expands into its proposed ends, each lit solid and framed on
   selection, with Accept / Pick a different face (bind mode's own pick, then
   the reject-and-bind planner `AA.planAnswer("pick", …)` already writes).
   Recommended: it reuses the planner and the scene's `setSuggestionFocus`,
   and it reaches all 55.
2. A "suggestions" filter on the topology row's rail listing only the 33
   edges with an open proposal, so the 62 others are not in the way.
3. Leave bind mode on the bar; the ratifying pass happens from the topology
   row with Accept / Reject only.
