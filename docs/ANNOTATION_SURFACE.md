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
drawing wins — `apps/annotate/` says so in plain words in the bar above its
3D view, and nothing here ever supplies a dimension.

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
`centroid_native` per face) + a `provenance.json` sidecar naming the
geometry source and hash, the tessellation tier, and the rotorkit run that
produced it. See `data/meshes/README.md` for what the sidecar carries on
each of the two routes a mesh can arrive by.

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

Every scene/navigation operation is a named, text-addressable verb behind one
dispatch point (`commands.js`'s `AA.CommandLayer` — handoff
`annotate_deep_link_and_part_filter`, 2026-09-08): the UI is a thin shell over
this command layer, on purpose, because the intended follow-on is a
vision-agent driver operating the surface the same way (zoom/pan/rotate/
filter/select as text commands over a screenshot). A deep link
(`?topology=&edge=&study=&isolate=`) and a parts panel (per-mesh show/hide/
isolate) are its first two consumers — and so is every switch on the page:
the arrival settings and the see-through toggle added on 2026-09-21
(`annotate_hint_bar_and_context_autofilter`) are `auto-filter` and
`transparency`, and the face-suggestion switch beside them is `auto-suggest`
over the `suggest` verb — not state a checkbox pokes. `apps/viewer/`'s topology-mode detail
pane emits the deep link on an untraced/uncited edge ("annotate this →"),
naming the edge's own `part` as `isolate` — a different vocabulary than a
mesh's `provenance.json` `part_id`, bridged by the declared alias table
(`docs/topologies/part_mesh_aliases.json`, handoff `mesh_part_alias_table`).

A link the viewer emits now always resolves to an installed mesh: since
`annotate_affordances_flyout_and_mesh_gating` (2026-09-14) the viewer offers a
3D affordance **only** where `scripts/build_topology_projection.py` has already
resolved that part to one (through the same alias table, in the same
precedence, stamped into the topology projection as a per-part `mesh` block),
and shows nothing at all where it has not. A link typed by hand still lands on
the honest empty-state ("no installed mesh for X") — that state is the
annotator's answer to an unresolvable identifier, never something the viewer
may hand a reader.

## Face suggestions — proposals in the UI, never bindings

Added 2026-09-21 by handoff `annotate_face_suggestions`, promoting arc 3 of
`dispatch/docs/strategy/drafts/DRAFT_annotation_roadmap.md`. Jeff: *"you can
greatly narrow it down (diameters require cylindrical surfaces, flanges require
planar surfaces, etc), so we could display the body as transparent and then use
a different color for suggested surfaces."*

**This does not change decision 1.** The surface still measures nothing from
geometry, and a suggestion is not a candidate *value* — it is a shortlist of
faces to look at. Concretely, the fence is three statements:

- **The engine colours; the human selects.** It never picks a candidate, not
  even when the narrowing gets down to one, and it never writes an event. A
  binding is still a human-ratified `feature-identity/v0` event through the same
  write path (`scripts/mutation_witnesses.json`'s
  `a-suggestion-never-selects-a-face` is the mutation that has to redden).
- **It reads a shape, never a dimension.** `apps/annotate/face_geometry.js`
  extracts a face's plane or its axis and radius, because a *relation* between
  two faces (parallel, coaxial, matching radius) cannot be tested without them.
  Those numbers are compared and discarded: none of them reaches a binding
  event, a stack value, or the screen.
- **A face it cannot read is `other`**, which is a first-class answer in the
  same sense a spec library's *unreadable* is — a cone, a sphere, a torus and a
  swept blade surface all land there, and a face there is suggested for nothing.

The rules are two declared tables in `apps/annotate/suggestions.js`: which kind
of surface an element's own words ask for, and how much further a face already
bound nearby narrows it (every flat face on the part → the ones parallel to a
face bound on that same part → for round faces only, the ones whose radius
matches a face bound on the *adjacent* part).

**The narrowing this surface cannot do, and why it matters here.** Two flat
faces on *different* parts cannot be compared at all, because this app applies
no assembly placement transforms (below) — every part is drawn at its own local
origin, so one mesh's plane normal means nothing against another's. Exactly one
relation survives having no shared frame: two mating cylinders have the same
radius, because a radius belongs to one face rather than to a pair of frames.
The table declares the gap with its reason rather than computing a coplanarity
it cannot support, and the surface says so in plain words. Whether to apply the
placements that `provenance.json` already records is design work, filed as
`docs/issues/ISSUE_20260921_cross_part_face_relations_need_assembly_placement.md`.

Full detail — the thresholds, the measured hit rates over the installed meshes,
the rule table and the display states — is in `apps/annotate/README.md`'s "Face
suggestions" and in
`docs/sessions/lessons/LESSONS_20260921_annotate_face_suggestions.md`.

## What this MVP does not build

- **Measurement from geometry.** Explicitly out of scope by the brief's
  decision 1 — 0 of 43 endstop rows were measurement-blocked, so this can
  wait.
- **Assembly placement transforms.** Every fixture the tessellation spike had
  was a single-part OML or a non-hierarchical bonded sub-assembly; nothing
  has exercised a real multi-part assembly's placement math. Parts render
  side by side at their own local origin. A real placement-handling
  validation is separate work — see the session lesson. Since 2026-09-21 this
  is load-bearing rather than merely absent: it is what stops the face
  suggestions comparing two flat faces across two parts (above), so the
  decision now has a consumer that would visibly do more if it were revisited
  (`ISSUE_20260921_cross_part_face_relations_need_assembly_placement.md`).
- **Automatic supersession / correction events**, the way
  `docs/spec_library/`'s `correction` mode works. v0's fold has no notion of
  "this binding replaces that one" — every `bound` event is a fact that
  stands, and many-to-many absorbs the cases a 1:1 correction model would
  otherwise need. If a real retraction need arrives, it is a schema
  extension, not a redesign.
