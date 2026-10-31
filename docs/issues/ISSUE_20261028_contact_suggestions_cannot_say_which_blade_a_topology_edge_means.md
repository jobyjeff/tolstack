---
type: feature
priority: med
status: deferred
area: contact-suggestions
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261028_an_interface_suggests_the_faces_that_touch.md
class: contact_engine_ignores_end_geometry
defer_until: 2026-11-13
resolution: triage 2026-10-29: med beyond the budget; deferred onto the_contact_engine_asks_the_ends_what_shape_they_are, whose engine changes this issue's premise -- woke 2026-10-29 -- the_contact_engine_asks_the_ends_what_shape_they_are completed; re-triage; triage 2026-10-30: med beyond the per-repo budget, deferred 14 days to a date (the class's program the_contact_engine_asks_the_ends_what_shape_they_are has landed, so a date)
---

# Contact suggestions cannot say which blade a topology edge means, and on a part shared by every blade the faces differ per blade

## What happens

`scripts/build_contact_suggestions.py` compares every pair of occurrences in
reach and keeps the best-ranked; ties go to the pair the annotator draws, then
to key order (`tolerance_stack/interface_contact.py`, `edge_candidates`). For a
joint between two parts that each sit once per blade (a pitch arm and a pitch
link) that is harmless: every blade touches at the same face ids, and a binding
names face ids, not occurrences.

It is not harmless when one side is a part **every blade shares** — the pitch
plate, the tangential link mount. The plate has one occurrence and a lug per
blade, so `pitch_plate_link_joint` touches a *different plate face* at each
blade. The projection keeps whichever blade's pair ranks best — on 2026-10-28
that was the pitch link occurrence `213862-002.4`, by a score margin that
reflects how each lug was modelled, not which blade anybody meant — and lists
the other blades under `ambiguous_with`. Measured 2026-10-28:
`pitch_plate_link_joint`, `tan_link_mount_joint` and `tan_link_plate_joint` are
all reported ambiguous for this reason (the two `..._centre_is_this_bearing`
edges are ambiguous for a different one: a link with a bearing at each end).

## Why it needs a decision rather than a fix

Nothing in `docs/topologies/topology_vpa_pitch_linkage.json` says which blade
its edges are about. Sweep mode answers "which occurrence is this body" by
geometry against a solver's joint points (`docs/ANNOTATION_SURFACE.md`, "Which
occurrence a body is"), and every published sweep is blade 1 — so blade 1 is
probably the answer, but it is a convention nobody has written down, and a
contact suggestion that silently preferred blade 1 would be this repo
inventing a fact.

## Options

1. **Declare it on the topology** — a `blade` (or occurrence-path prefix) the
   document is about; the builder prefers occurrence pairs under it. Small, and
   the decision is visible where it is made. Recommended.
2. **Borrow the sweep's answer** — use the latest run's body-to-occurrence
   choice. Couples contact suggestions to a gitignored artifact.
3. **Leave it ambiguous** and let the proposing agent
   (`HANDOFF_20261028_an_agent_proposes_a_face_binding_and_a_human_ratifies_it`)
   and the human ratifying settle it per edge. What happens today.
