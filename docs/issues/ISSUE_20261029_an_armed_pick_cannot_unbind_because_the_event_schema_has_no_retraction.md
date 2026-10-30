---
type: feature
priority: low
status: open
area: annotate/feature-identity
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261029_a_face_is_picked_the_way_cad_picks_it.md
---

# An armed pick cannot unbind: the event schema has no retraction

Handoff `a_face_is_picked_the_way_cad_picks_it`, decision 7: "a second click
on the same bound face with the row armed offers 'unbind' (writes the existing
retraction)". There is no existing retraction. `feature-identity/v0`'s
verdicts are `bound`, `owner_not_in_set`, `proposed` and `rejected`
(`tolerance_stack/feature_identity.py`, `VERDICTS`), and `supersedes` only
lets a new `bound` event *replace* an earlier one. Nothing withdraws a binding
and leaves the end unbound.

What shipped instead: a click on the face already bound at the armed end
writes nothing, and the row's state line says "already bound to face N".
A click on any other face writes a `bound` event that supersedes the end's one
standing binding, so a wrong face can still be corrected. Only "this end has
no face" is unreachable.

## The decision this needs

A schema change, so a strategy call rather than a tactical fix:

1. **A `retracted` verdict** naming the event it withdraws (the `supersedes`
   rules — same key, earlier, a `bound` event — reused), folded so the end
   reads unbound and history keeps both. Then the annotator's second click
   offers "unbind" as decision 7 says. Recommended: it is the smallest thing
   that makes "I bound the wrong end and there is no right face" expressible.
2. **Leave it.** Correction by re-pick covers the wrong-face case, and a
   wrong-*end* binding already has Flip direction. An end that should have no
   face at all has not been seen in the inbox yet.

`docs/ANNOTATION_SURFACE.md`, "Picking a face — the gestures", names this gap.
