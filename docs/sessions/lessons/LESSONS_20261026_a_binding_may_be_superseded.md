# Lessons — a_binding_may_be_superseded (2026-10-26)

## Contract line for the solver repo

`fits.json` carries a fit only for a **standing** binding: an event that another
event names in `supersedes` (same `(topology, edge)` key) produces no row, in
`fits` or in `unresolved`, and is not counted in `summary.bindings`.
`built_from_events` still lists every event, superseded ones included, so it is
the log's membership, not the set of fitted features. Nothing in the fit row
changed shape.

## The field, for the spec library's later adoption

`supersedes: "<event_id>"` — optional, a single string, on a `bound`-equivalent
event, naming an **earlier** (lower `seq`) event on the **same key**. Projection
rule: hide the named event from the key's current list, keep it in a
`superseded` list and in `history`. A missing target, a target on another key, a
target that is not itself a value-bearing event, a self-reference, or a target
with a later-or-equal `seq` is a load error naming both ids
(`feature_identity.build_projection`). The spec library's keys and "value-bearing"
event kinds differ; the rule is the same, the names are its own.

## Surprises

- **`nextEventFilename` was always handed event ids, not filenames**, so its
  `^\d{4}_` regex never matched and a second write in one session was refused
  as a collision (`0001_…` again). Invisible while a session wrote one event;
  Flip direction is a second write by construction. Fixed with
  `state.sessionFilenames`. Filenames already on disk from earlier sessions are
  still unknown to the app — the append-only refusal at write time remains the
  guard, as before.
- A correction is aimed: arming **Correct this binding** plans against the record
  *without* the armed binding and starts on its end. That is the one place a
  direction is pre-selected, deliberately — it is the value being corrected, not
  an unaimed default.
- Flip direction is offered only while the other end has no face; flipping onto
  an occupied end would stack two faces on one, which is legal but never what a
  one-click control should do. Reach it through Correct this binding.

## Sites

Reached: the Python fold and `as_dict` (projection gains `superseded`), the
fitter (via the fold), the annotator's bar (bound list, flip, correct, history)
and its session-merge of events. Not reached: the rail row (no marker for a
corrected binding — the bar shows it), the viewer's own readers of
`bindings.json` (they read `bindings`, which is now the standing set), and the
spec library (adopts later, said in the inbox README).

## Mutation specs

Five new annotate guards, five specs, each WITNESSED with `--only`. The annotate
pin moved 220 -> 225. The browser pass (`correctionPass`) is not in the guard
census.
