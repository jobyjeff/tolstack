---
type: feature
priority: med
status: open
area: annotate/feature-identity
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261021_a_face_pick_survives_an_orbit_and_names_its_end.md
---

# A binding written at the wrong end has no correction

A `feature-identity/v0` event is immutable, and the verdict set is
`("bound", "owner_not_in_set")`. Nothing can say "this earlier binding is
wrong". So a face bound at the wrong end of an edge, or to the wrong face, can
only be fixed by deleting the event file by hand. That is what happened to the
first event in the stream.

## The motivating case

On 2026-10-21 Jeff wrote
`data/inbox/feature-identity/0001_piston_head_upper_thickness.json`. It bound
face 110 of the upper piston head (mesh `8899ea5d…`) to
`vpa_pitch_linkage` / `piston_head_upper_thickness` with `direction: "from"`.
The topology's own node notes place face 110 (part Z 243.216) at the **step
face**, which is the edge's `to` end. The `from` end, the seat against the lower
head, is face 113. The form's direction dropdown had defaulted silently to
`from`. Jeff deleted the file at 18:07 the same day. At the time of filing, the
stream holds no events.

Handoff `a_face_pick_survives_an_orbit_and_names_its_end` removed the cause:
the form now offers the two interfaces by name, with no default. It
deliberately did **not** add the "flip direction" button Jeff asked for,
because a flip after the write is a schema decision.

## The question for strategy

How should a reader correct a binding? Two shapes, roughly:

1. **A `superseded_by` verdict.** A new event names the event it replaces, and
   the projection folds the older one out. This keeps the audit trail. It costs
   a new word in `feature_identity.VERDICTS`, which is generated into the JS,
   plus a fold rule.
2. **A correcting-event convention with no new verdict.** A later `bound` event
   for the same `(stack_key, direction)` wins. This is cheaper, but it changes
   what "two bindings at one end" means. Today two bindings at one end are a
   legitimate state ("Click a face to bind another").

My recommendation is (1). It keeps "two faces at one end" meaningful, and it
makes a correction visible as a correction rather than as a silent overwrite.
Whichever shape is chosen, the annotator then needs a "correct this binding"
action on a bound end.
