# BRIEF 2026-10-22 — a feature-identity binding written at the wrong end cannot be corrected: what does a correction look like in an append-only event stream?

> **Routing note.** Filed by the 2026-10-22 triage sweep from
> `docs/issues/ISSUE_20261021_a_binding_written_at_the_wrong_end_has_no_correction.md`
> (feature, med, `audience: strategy`, found by
> `HANDOFF_20261021_a_face_pick_survives_an_orbit_and_names_its_end.md`). It
> is a brief rather than a tactical handoff because the answer is a rule for
> the repo's third load-bearing decision, "reading a document is an event,
> not an edit". That rule binds every later event kind. The events it
> produces are immutable, so a wrong first call cannot be undone the way a
> wrong review round can. No other open brief in this repo or in
> `dispatch/docs/strategy/` asks about correcting an immutable event.

## What happened

`feature-identity/v0` events are immutable, and the verdict set is
`("bound", "owner_not_in_set")` (`tolerance_stack/feature_identity.py`,
`VERDICTS`, generated into `apps/viewer/vocab.gen.js`). No event can say
"this earlier binding is wrong". On 2026-10-21 Jeff bound face 110 of the
upper piston head (mesh `8899ea5d…`) to `vpa_pitch_linkage` /
`piston_head_upper_thickness` with `direction: "from"`. The topology's node
notes put face 110 at the step face, which is the edge's `to` end. The form's
direction dropdown had defaulted to `from` without saying so. The only fix
available was deleting
`C:/workspace/tolstack/data/inbox/feature-identity/0001_piston_head_upper_thickness.json`
by hand, which Jeff did at 18:07. The stream is empty as of this brief.

`a_face_pick_survives_an_orbit_and_names_its_end` (merged 2026-10-22) removed
the cause: the form now names both interfaces and has no default. It
deliberately did not add the "flip direction" button Jeff asked for, because
a flip after the write is a schema decision. That decision is this brief.

## The options the filer laid out

1. **A `superseded_by` verdict, or a `supersedes:` field on a new event.**
   The new event names the one it replaces, and the projection folds the
   older one out. The audit trail is kept. It costs a new word in `VERDICTS`
   (generated into the JS) and a fold rule.
2. **A correcting-event convention with no new verdict.** A later `bound`
   event for the same `(stack_key, direction)` wins. It is cheaper, but it
   changes what "two bindings at one end" means. Today that is a legitimate
   state (the annotator says "Click a face to bind another").

The filer recommends (1), because it keeps "two faces at one end" meaningful
and makes a correction visible as a correction. Triage has not designed
either option.

## What a decision has to settle

- Which shape, and whether it is general to every event stream in this repo
  (the spec library's parse events are the other append-only log) or
  specific to feature identity.
- Whether a correction may change the face, the direction, or both.
- What the annotator offers on a bound end: Jeff's "flip" or a general
  "correct this binding", and what the reader sees for a superseded event.
- Whether `scripts/fit_bound_features.py` and the fitted nominals it feeds a
  solver in another repo must fold corrections the same way. If they must,
  that is a contract with the consumer.
