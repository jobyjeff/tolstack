---
type: bug
priority: low
status: triaged
area: contact-suggestions
reporter: agent
found_by: docs/sessions/HANDOFF_20261028_an_agent_proposes_a_face_binding_and_a_human_ratifies_it.md
class: contact_engine_ignores_end_geometry
handoff: docs/sessions/HANDOFF_20261029_the_contact_engine_asks_the_ends_what_shape_they_are.md
---

# Contact occurrences borrow another part number's slot: the U11D bolt is measured where a U10D bolt sits

Seen 2026-10-29 while orienting the pitch-link bolted joint for the first
agent proposal pass. `interface_contact.edge_candidates`, fed by
`build_contact_suggestions.candidate_occurrences`, was run on interface node
`head_bearing_face_pitch_link` (parts `bolt_nas6403u11d`, `bushing_214820_002`).
Its best pair sat at occurrences
`…/prd-e-03481962.1/NAS6403U10D.3` and `…/prd-e-03481962.1/NAS76A3-006P.1`.

The bolt mesh is `asm217755_NAS6403U11D` (f9d87921…; the alias table says
product `NAS6403U11D`, 5 instances), and the bushing mesh is product
`214820-002`. Neither occurrence name is that part's own. Both must have come in
through the second arm of the occurrence rule: another mesh's slot sharing an
instance name, or `<product>.<n>`.

The face conclusion the pass drew does not depend on it: face 31 is the head's
bearing face whichever bolt slot it is placed at. But a measured clearance or
overlap at a borrowed slot is a number about a different part's position, and
the projection does not say the slot was borrowed. Suggested: carry `own:
false` (the builder already computes it) into each candidate's evidence, and
prefer own-slot pairs when both exist.
