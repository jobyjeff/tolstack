---
priority: high
depends_on: [v2s_standard_parts_cite_their_spec_sheets]
model: opus
hitl: false
---

# HANDOFF 2026-11-22 — a_seat_and_a_pattern_get_contact_suggestions_too: the contact engine offers faces for seats, fastener patterns, the race press fits and the inner-race ball centres

Source: Jeff's note `20261122T211136_iubdsx` (2026-11-22): "Got to the pitch
plate, and none of those (at least the first few that I checked) seem to have
any suggestions yet. Worth having the agents take another pass and giving
suggestions each so hopefully I can just rubber stamp most of the rest of
them." Strategy decision, same day
(`dispatch/docs/strategy/HANDOFF_20261122_strategy.md`): the engine learns the
kinds it cannot see, so every model gets them, instead of an agent writing
one-face proposals into Jeff's log. Baseline: trunk with the links ahead
merged, including `a_take_on_a_lug_feature_binds_that_lugs_own_face` (each
lug part is resolved at its own occurrence). Scope:
`scripts/build_contact_suggestions.py`, `tolerance_stack/interface_contact.py`,
their tests, `docs/ANNOTATION_SURFACE.md` ("Contact suggestions"), and the
smallest change in `apps/annotate/` needed for a new row to appear in the
list that already shows contact rows. Do NOT touch: how the tree, its marks
or its buttons look or behave (a redesign of the binding pane is with Jeff);
`apps/viewer/`; the topologies' ids; `scripts/propose_bindings.py`. Never
write to `C:\workspace\tolstack\data\inbox\feature-identity\`: a suggestion
is a list and a colour, never an event (`docs/ANNOTATION_SURFACE.md`).

## Measured 2026-11-22 (read-only, on the main checkout's projection built 11-21 from `53271c6c`; re-measure after the lug handoff merged)

v2 has 100 ends on 50 interfaces: 33 bound, 5 unbound with an open proposal,
25 unbound with a contact row only, **37 with nothing**. The 37, by cause:

| Ends | Cause | Where |
|---:|---|---|
| 24 | Seats and fastener patterns are shared nodes; the engine takes only edges with an `interface` | `scripts/build_contact_suggestions.py:283-284` |
| 4 | The pitch link's race press fits read `no_contact`, nearest 9.53 mm: the 213861-002 mesh records blades 2–5 and the MS14101-3 mesh blade 1, and the builder reads the sidecar's occurrences, not the topology's declared `occurrence` | `:159-161`, `:249` |
| 3 | Inner-race ball centres: both races are one mesh, so the engine compares it with itself, and the mate ranking skips balls | `interface_contact.py`; `AA.rankMatingFaces` |
| 6 | NAS6403U14D has no mesh: its 3 ends and its 3 partners' bores | not yours: a mesh request is Jeff's question D7 |

The engine's preconditions today: a gap edge, both meshes installed,
millimetres, an occurrence for each, a face pair within `reach_mm` 1.0
passing the margins (`build_contact_suggestions.py:241-267`,
`interface_contact.py:135`, `:142-149`). A contact row carries the whole face
set, which is what a seat split into segments or a pattern needs.

Also measured: 13 unbound ends of the plate and lug stack **do** have a
contact row in the served copy
(`C:\workspace\tolstack\data\projections\viewer\kinematic\annotate.json`),
yet Jeff saw none on the first few he opened. The rows reach the tree only
through the open 3D pane's posted tree (`apps/annotate/app.js:7663-7696`).

## Deliverables

1. **A seat gets its faces.** For a shared node that is a flat seat between
   two parts, offer on each side the faces of that part that touch the
   other's within the engine's reach, in the assembly frame, with the same
   evidence a gap edge's row carries.

2. **A fastener pattern gets its holes.** For a shared pattern node, offer on
   each side the set of like holes that line up with the other part's, as one
   row (the pattern rows of 2026-11-16 and 11-18 are the shape:
   `docs/ANNOTATION_SURFACE.md`, "A hole pattern").

3. **A part is compared at the occurrence the model declares.** The four
   race press fits compare the race with the link at the same blade. Build on
   what the lug handoff did for the lugs; if it already fixed these, say so
   and move on.

4. **A ball centre gets its sphere.** For an inner race's ball centre, offer
   the ball-shaped faces of that race at its occurrence, even where both
   races are one mesh (MS14103-3).

5. **Why Jeff saw none on rows that had one.** Reproduce on a scratch copy:
   open v2, open the pitch plate's features in the order a person would, and
   find which of the 13 ends with a row show no list, and why (pane not yet
   open, the row keyed to another id, the posted tree late). Fix what is in
   your scope; file the rest with the reproduction.

## Definition of done

- On the real v2 data (a scratch data root copied from
  `C:\workspace\tolstack\data\`, rebuilt from your tree), the count of ends
  with nothing drops from 37 to the 6 that wait on the bolt's mesh, or the
  lesson names each end still empty and why. No end that had a row loses it.
- Value-level tests on fixtures for each new kind (a seat, a pattern, a ball,
  a declared occurrence), and a `[real]` count for v2. A wrong offer costs
  Jeff a wrong bind, so each new kind also has a test that it offers
  **nothing** when the parts do not touch.
- Looked at with vision, from a scratch-root serve on a scratch port (never
  8000), at 1536 wide: one seat end, one pattern end and one ball centre
  opened, each showing its offered faces lit in the scene. Read each shot.
- Jeff's binding log unchanged by you (count and hash before and after).
- Lesson (`docs/sessions/lessons/LESSONS_20261122_a_seat_and_a_pattern_get_contact_suggestions_too.md`):
  the table above re-measured after your change; deliverable 5's cause; any
  end where the offered faces look wrong to you in the shot.
