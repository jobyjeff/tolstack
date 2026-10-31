---
type: feature
priority: low
status: deferred
area: annotate/sweep-rail
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261029_a_face_is_picked_the_way_cad_picks_it.md
class: armed_pick_reach
defer_until: 2026-11-29
resolution: triage 2026-10-30: low, deferred by default to a date (class has no program)
---

# An edge feature's and a contributor's Pick still leave sweep mode for bind mode

Since `a_face_is_picked_the_way_cad_picks_it` a joint **end**'s Pick arms a
pick in place (pose, isolate, filter, pre-select, click binds). Two other rows
in the same rail carry a Pick that still runs `goto` and leaves sweep mode for
the bind form: an **edge** feature (e.g. `pitch_link_length`) and every
**contributor** row. A reader two clicks apart meets two different Picks.

They were left on purpose: an edge has two ends, and the 2026-10-21 wrong-end
rule (`docs/ANNOTATION_SURFACE.md`, "Binding a face") forbids defaulting
between them while both are open. Arming needs an end.

Options for a strategy session:

1. **Arm the edge's open end when exactly one is open** (the rule already
   preselects the remaining end once one is bound), and keep the bind-mode
   jump only while both are open. Recommended: it covers the common re-pick
   and leaves the wrong-end rule intact.
2. **Expand an edge row into its two ends**, each with its own armed Pick, as
   the joint rows already do for node features.
3. Leave both as the jump to bind mode.

## Addendum 2026-10-29 — the same rows cannot answer a proposal in place

From `docs/sessions/HANDOFF_20261029_a_rail_row_with_a_proposal_says_so_and_accepts_it_in_place.md`.
A joint **end** with an agent's open proposal now reads "suggested · high",
lights the face when selected, and offers Accept / Pick a different face on
the row. The two row kinds above still cannot, for the same reason (two ends,
no default):

- an **edge** feature (`pitch_link_length`, `tan_link_length` on P2) reads
  "suggested · …" (either end's proposal) and its selection lights the face,
  but its only action is still the jump to bind mode, where the bar's Accept /
  Reject answer each end;
- a **contributor** row shows no suggestion line at all.

Whichever option above is chosen should carry the answer with it: option 2
(the row expands into its two ends) gets Accept / Pick a different face for
free, since each end would be the joint-end row that already has them.
