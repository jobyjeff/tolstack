# The annotation surface — select geometry, tag it with identity, no measurement

Built 2026-09-06 by handoff `annotation_surface_mvp`, gated on rotorkit's
`step_tessellation_spike` lesson
(`C:\workspace\rotorkit\docs\sessions\lessons\LESSONS_20260904_step_tessellation_spike.md`)
and locked by the strategy brief
(`dispatch/docs/strategy/HANDOFF_20260904_3d_annotation_strategy.md`). Read
that brief for the evidence and the eight locked decisions; this document is
the schema, the formats, and the app that consumes them.

## Why this exists (one paragraph)

Of 43 endstop ground-truth rows, measurement blocked 0 and **identity blocked
15**: dimension values extract losslessly from a drawing's text layer, but
nothing in a 2D drawing states *which physical feature* a stack element or
topology edge means — the drawings carry ~90 callouts and not one statement
of the kinematic chain. So the surface built here does **not** measure
anything from geometry. It resolves identity, a human does the selecting, and
every binding is an immutable event, cited like everything else this repo
produces.

## The model

Two things are bound together, and neither is invented — both already exist
elsewhere in this repo and are reused, not forked:

- **A stack-side key** — *which dimension this is about* — is either a
  `topology_edge` (`topology_id` + `edge_id`, `tolerance_stack.topology`'s own
  ids; see `docs/DAG_TOPOLOGY.md`) or a `stack_element` (`stack_id` +
  `element_id`, `tolerance_stack.stack`'s own ids). One identity namespace
  with the DAG topology model, per the brief's decision 4 — there is no third
  vocabulary.
- **A geometry-side key** — *which face this is* — is `(source_step_sha256,
  face_id)` plus the face's own `area_native2`/`centroid_native` fingerprint,
  copied from `data/meshes/<sha>/manifest.json` at binding time. `face_id`
  alone is traversal-order and only proven stable across an *unedited*
  re-export (the step_tessellation spike's own finding); the fingerprint is
  what lets a later re-tessellation be checked rather than trusted blind.

A **binding** (`tolerance_stack.feature_identity.FeatureIdentityEvent`,
`verdict: "bound"`) connects the two, plus:

- **`direction`** (`"from"`/`"to"`, `topology.Edge`'s own words) — which end
  of the stack-side key's dimension this face plays. Many-to-many by design
  (decision 4): one callout can feed three stack rows in different
  directions, one row can sum two callouts — both observed in endstop rows
  that *succeeded* — so a 1:1 tag model was ruled out before this was
  written, and `composition_note` is where an author records how sibling
  bindings combine (prose, because that is a finding, not something this
  schema computes).
- **`owner_part` / `owner_path`** (decision 3) — per-part attribution. A
  binding names the part it believes owns the feature when known, and
  `owner_path.kind` says whether that was a **direct** hit (the part set's
  own BOM) or a **hypothesis** (a lateral hop through another
  configuration's assembly — the baseline's hub case) — a hypothesis about
  identity is carried as one, never printed like a fact.
- **`gdt_modifier` / `general_tol_regime`** (decision 5) — a drawing's Ⓛ
  against a workbook's "MMC", or a part whose general-tolerance block is
  ISO-2768-mK while three siblings print a decimal-place block instead — both
  change what a dimension *means*, so both are identity fields here, not left
  to be inferred later.

A binding attempt that finds no face at all because the owner part is not in
the loaded set is a **first-class result**, not a failure to record:
`verdict: "owner_not_in_set"`, carrying no geometry at all.

**A binding is identity, not a value source** (decision 6, the precedence
guard). Where a stack-side key already carries a real drawing citation, the
drawing wins — `apps/annotate/` says so in plain words in its detail pane,
and nothing here ever supplies a dimension.

## The formats

### The event stream — `joby.tolerance_stack/feature-identity/v0`

One immutable JSON file per event, append-only, in
`data/inbox/feature-identity/` — gitignored, unlike `docs/spec_library/events/`
(see that directory's `README.md` for why this stream gets the ordinary inbox
disposition rather than the spec library's committed one). Schema and every
vocabulary constant: `tolerance_stack/feature_identity.py`.

### The mesh format

`data/meshes/<source_step_sha256>/` — the spike's binary format verbatim:
`positions.f32` / `indices.u32` / `face_ids.u32` (raw little-endian typed
arrays) + `manifest.json` (the face table: `area_native2` +
`centroid_native` per face) + a `provenance.json` sidecar (source STEP path,
sha256, tessellation tier, the rotorkit command that produced it). See
`data/meshes/README.md`.

### The projection

`scripts/build_feature_identity_projection.py` folds
`data/inbox/feature-identity/` into
`data/projections/feature-identity/bindings.json`
(`tolerance_stack.feature_identity.build_projection`): per stack-side key,
every `bound` event (many-to-many) plus every `owner_not_in_set` event, plus
the full history. Gated exactly like every other shared projection in this
repo (`scripts/projection_provenance.py`).

### Staleness — three outcomes, not two

When a part's STEP file is replaced and re-tessellated, a stored `face_id`
is re-validated against the *new* mesh's manifest by fingerprint
(`tolerance_stack.feature_identity.revalidate`): a match is `"confirmed"`, a
mismatch (or a face_id that no longer exists) is `"needs_re_confirmation"` —
**never** a silent re-bind, **never** a drop. The same three-outcome posture
`docs/spec_library/README.md` uses for a value/absence/unreadable.

## The app — `apps/annotate/`

Static, build-free, three.js r169 via a native import map — but **not**
launchable by `file://` double-click, unlike `apps/viewer`: a `file://` page
can neither fetch a mesh binary nor write an event file. See
`apps/annotate/README.md` for how to run it, what it does and does not do
(no measurement, no assembly placement), and why it is ES modules where the
viewer is classic scripts.

## What this MVP does not build

- **Measurement from geometry.** Explicitly out of scope by the brief's
  decision 1 — 0 of 43 endstop rows were measurement-blocked, so this can
  wait.
- **Assembly placement transforms.** Every fixture the tessellation spike had
  was a single-part OML or a non-hierarchical bonded sub-assembly; nothing
  has exercised a real multi-part assembly's placement math. Parts render
  side by side at their own local origin. A real placement-handling
  validation is separate work — see the session lesson.
- **Automatic supersession / correction events**, the way
  `docs/spec_library/`'s `correction` mode works. v0's fold has no notion of
  "this binding replaces that one" — every `bound` event is a fact that
  stands, and many-to-many absorbs the cases a 1:1 correction model would
  otherwise need. If a real retraction need arrives, it is a schema
  extension, not a redesign.
