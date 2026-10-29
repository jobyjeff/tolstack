# data/inbox/feature-identity — feature-identity binding events

One immutable JSON file per `feature-identity/v0` event
(`tolerance_stack/feature_identity.py`), written by `apps/annotate/` when a
human binds a stack element or topology edge to a face of a tessellated part
(`data/meshes/`), or records that the element's owning part isn't in the
loaded set. This is the surface built by handoff `annotation_surface_mvp`
(2026-09-06) to close the identity gap the endstop baseline found: of 43
ground-truth rows, measurement blocked 0 and identity blocked 15 — the
drawings carry the callouts but nothing states which physical feature a stack
element means.

## The rules

1. **Append-only, like every other inbox stream.** A file here is never
   edited or deleted. A changed mind (an owner found after all, a binding
   made in error) is a new event, not an edit. A `bound` event may carry
   `supersedes: <event id>` naming an earlier event on the **same key**; the
   fold hides that event from the key's current `bindings`, lists it under
   `superseded`, and history keeps it. A dangling or cross-key `supersedes`
   fails the projection build naming both ids. Without `supersedes`, every
   `bound` event is a fact that stands, and the projection's "current
   bindings" for a key is every unsuperseded one (many-to-many by design,
   decision 4). The field is optional and additive: schema stays `v0`, no new
   verdict. The same rule is meant for every append-only stream here; the spec
   library adopts the field the first time a parse event needs correcting, not
   before.
2. **Contents are gitignored** (forge data convention). This README is the
   tracked skeleton. **Unlike** `docs/spec_library/events/`, these events are
   *not* additionally committed under `docs/` — they are generated
   continuously by an interactive app rather than hand-authored one at a
   time by an agent following a procedure, so they get the inbox stream's
   disposition (filesystem-canonical, main-checkout-only) rather than the
   spec library's (committed). See the handoff for this call; if losing an
   uncommitted binding turns out to be costly in practice, promoting this
   stream to a committed one the way `docs/spec_library/events/` is would be
   a small, backwards-compatible change (the schema doesn't change, only
   where the files live).
3. **One event per file**, named `<NNNN>_<slug>.json` in arrival order, the
   same convention `docs/spec_library/events/` uses.
4. **`scripts/build_feature_identity_projection.py`** folds this log into
   `data/projections/feature-identity/` (derived, disposable, rebuild any
   time — see that script and `tolerance_stack/feature_identity.py`).

## The kinds of file here

- **`<NNNN>_<slug>.json`, `verdict: "bound"` or `"owner_not_in_set"`.** A
  human's binding, or a human's finding that the owner is not in the set.
  Written by `apps/annotate/`.
- **`<NNNN>_<edge>_proposed.json`, `verdict: "proposed"`** (since 2026-10-28).
  An agent's proposed face, with `confidence`, a one-line `basis` and
  `recorded_by: "agent:<handoff-slug>"`. Written only by
  `scripts/propose_bindings.py`. The fold never lets one stand: nothing is
  bound until a human accepts it.
- **`<NNNN>_<edge>_accepted.json`** is a `bound` event naming the proposal in
  `ratifies`. **`<NNNN>_<edge>_rejected.json`** is `verdict: "rejected"`
  naming it in `rejects`. Both are written by the annotator's Accept/Reject,
  recorded as `annotate-app:<reviewer>`.

## What an event says

A binding names a **stack-side key** (a topology edge or a stack element —
one identity vocabulary with the DAG topology model, `docs/DAG_TOPOLOGY.md`)
and a **geometry-side key** (a mesh's `source_step_sha256` + `face_id`, plus
the face's own area/centroid fingerprint copied from
`data/meshes/<sha>/manifest.json` — `face_id` alone is traversal-order and
proven stable only across an *unedited* re-export, per the step_tessellation
spike). Many-to-many, with a `direction` and an optional `composition` note;
carries `owner_part` / `owner_not_in_set` / `path` for per-part attribution;
carries `gdt_modifier` / `general_tol_regime` as identity fields. Full schema
in `tolerance_stack/feature_identity.py`.

**A binding is identity, not a value source.** Where a drawing citation
already exists for the same stack element, the drawing wins — this stream
never supplies a dimension.
