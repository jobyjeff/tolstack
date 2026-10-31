---
type: feature
priority: low
status: deferred
area: contact-suggestions
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261029_the_contact_engine_asks_the_ends_what_shape_they_are.md
class: contact_engine_ignores_end_geometry
defer_until: 2026-11-29
resolution: triage 2026-10-30: low, deferred by default to a date (the class's program has landed)
---

# Contact suggestions run on gap edges only, and the contact that orients a washer's two flats lives in an agent's scratch script

Refiled from the "feature gap" paragraph of
`ISSUE_20261029_contact_exists_and_the_engine_finds_none.md`. That handoff
fixed the engine half and fenced this part out.

`scripts/build_contact_suggestions.py` writes rows for **gap edges**
(`topology.edges` with an `interface`). The first proposal pass (2026-10-29)
ran `interface_contact.edge_candidates` by hand on the **16 interface nodes
that name two parts**. On seven of them it found the contact that decides
which flat face of a washer, bushing or bolt head is which end: bolt face 31
on bushing face 13 at 99% overlap, washer face 5 on lug face 1432, and mount
face 134 on hub face 526. Those are the ends the gap list left open as "both
flat faces fit the thickness, and nothing orients them".

**Options.** (a) Add a second row kind to the projection, one per two-part
interface node, paired by that node's own shape (`end_surface_class` on its
name) with `plane_on_plane` as the default. The annotator would list it
beside the gap edges at that node. (b) Leave it to the proposal pass, and
track the scratch script instead. **Recommendation: (a).** The engine already
does the work; only the row source is missing. It also gives the annotator's
"faces that touch" bar something to say at a structural element.
