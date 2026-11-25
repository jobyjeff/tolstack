---
type: feature
priority: low
status: deferred
area: annotate/form
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261122_editing_a_feature_opens_its_form_where_the_tree_was.md
class: setting_without_surface
defer_until: 2026-12-25
resolution: deferred 2026-11-25 (triage) -- low, deferred by default
---

# No surface writes a binding's note, modifier or owner part since the bind bar retired

The bind bar's form (`buildBindForm`, deleted 2026-11-23 by
`editing_a_feature_opens_its_form_where_the_tree_was`, as its deliverable 9
asked) was the only place a person could write five optional fields on a
`bound` event: composition note, owner part, GD&T modifier, general tolerance
regime and note. The feature's form writes the faces only.
`AA.buildFeatureSetEvent` still carries those fields over from the binding it
supersedes, so nothing already recorded is lost by a tick (except in the case
in `ISSUE_20261124_a_tick_answering_two_proposals_leaves_a_binding_without_its_note_and_modifier.md`).
But there is no way left to add one. The handoff's lesson lists what the form
could not carry: Flip, the hidden rail's controls and the owner-not-in-set
form. It does not list these fields.

Nobody has used them: no binding in Jeff's log (116 events on 2026-11-24)
carries any of the five. Options:

1. A folded "Details" disclosure in the form, written with the tick.
2. Nothing until a stack needs a modifier on a binding. The schema keeps the
   fields, and an agent script can still write them.

Recommendation: 2, and write this down in `docs/ANNOTATION_SURFACE.md` so the
next reader does not look for the fields.
