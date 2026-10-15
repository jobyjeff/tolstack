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

```claim
metric: mesh_routes
value: scripts/extract_assembly_parts.py, scripts/tessellate_parts.py
```

### The projection

`scripts/build_feature_identity_projection.py` folds
`data/inbox/feature-identity/` into
`data/projections/feature-identity/bindings.json`
(`tolerance_stack.feature_identity.build_projection`): per stack-side key,
every `bound` event (many-to-many) plus every `owner_not_in_set` event, plus
the full history. Gated exactly like every other shared projection in this
repo (`scripts/projection_provenance.py`).

### The fit projection — where placement produces a value

`scripts/fit_bound_features.py` folds the same event stream a second way
(added 2026-09-30, handoff `vpa_pitch_linkage_topology_and_feature_fits`):
every `bound` event becomes a **fitted nominal** in
`data/projections/feature-geometry/fits.json` — the face's shape, read by
`tolerance_stack.feature_geometry`, reported in the part's own frame and then
**once per occurrence of that part in the assembly**, with the instance path and
the placement matrix it used. Its consumer is outside this repo:
`C:\workspace\linkage`, a pitch-linkage solver, which needs where the joints
are rather than what any chain of them totals.

**Placement is applied in two places, for two different purposes.** This
script applies it to *produce a value* — a fitted nominal, in the assembly
frame — and is the only place that does. `apps/annotate/` applies it to *draw*:
since 2026-10-14 (handoff `parts_sit_where_the_assembly_puts_them`) every part
the app opens is drawn at every occurrence the assembly records, in sweep mode
and out of it ("Where a part is drawn", below). Drawing a part somewhere
produces no number, and a pick on a placed part still binds the part-local
`(sha256, face id)` it always did. The
placements have always been recorded (each extracted mesh's `provenance.json`
carries `extraction.instances[].placement_world`); until this script nothing
read them. **Every placement comes from that sidecar**, because the sidecar
belongs to one extracted solid and is therefore attributable to it. rotorkit's
`placements.json` is read as a *check* on it rather than as a source: it is
keyed by product number, and a product number is not a geometry key — three
solids share `MS14101-3` — so its entry cannot say which instance is whose.
What it can do is confirm the sidecar is not a slice, matched by instance path,
and every installed mesh came back confirmed or honestly flagged.

**A fit is not a value.** It has no band, no min/max and no plus/minus; a
drawing callout wins over it wherever one exists (decision 6, above); and the
cite-or-gap rule is untouched by it. What a fit supplies is the thing drawings
do not state — *where in the assembly* a feature is. A binding that cannot be
fitted is reported with its reason (no mesh, no such face, a face no surface
fits, or a part nothing records a placement for), never silently dropped: an
omitted row reads as "nobody has bound this yet", which is a different and
wrong statement.

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
(no measurement), and why it is ES modules where the viewer is classic
scripts.

### Where a part is drawn

**One rule, for the whole app** (2026-10-14, handoff
`parts_sit_where_the_assembly_puts_them`). Jeff, on the side-by-side row it
replaced: *"they should be positioned exactly as they are in the assembly."*
An opened part with recorded occurrences is drawn at every one of them — each
extracted mesh's `provenance.json` `extraction.instances[].placement_world`,
the same 3×4 row-major layout `scripts/fit_bound_features.py` reads — in the
217755 frame, whether or not sweep mode is on. The tangential link is drawn
three times; the pitch arm five. A second occurrence shares the first one's
geometry and material, so it costs a draw call and a matrix, not a copy.

- **A part with no recorded occurrence** (the standalone `213668-002` STEP, the
  blade OML) is drawn at its own origin and **says so**, in its panel row and in
  the banner when it is opened: "no position in the assembly — shown at its own
  origin".
- **A part past the draw cap** (`AA.OCCURRENCE_DRAW_LIMIT`, `sweep.js`) is drawn
  at the first that-many and says how many it has. No installed part reaches
  it: the most-repeated is the NAS1149V0332H washer, and it is drawn in full.
- **Camera framing** (`camera reset`/`frame`, and opening a part) frames every
  drawn occurrence, in the assembly frame.
- **A pick on any occurrence resolves to the part's own `(sha256, face id)`**,
  read off the hit triangle, which is the same triangle in the part's own
  buffers whatever matrix drew it. `feature-identity/v0` is unchanged and so is
  every binding written before this: bindings are part-local, and the
  occurrence a pick landed on never reaches an event
  (`AA.geometryKeyOfPick`). Hidden parts are not pickable — three.js's
  raycaster ignores `.visible`, so the app filters on it, which matters now
  that a hidden part sits exactly where the visible one behind it is.

**What this does not change: the face suggestions.** The suggestion engine
still reads each part in its own frame, so two flat faces on two parts are
still not compared. Parts now *sit* in a shared frame, which is what the
coincident-face cross-part suggestions Jeff asked for need first — that is the
named next step, still open as
`ISSUE_20260921_cross_part_face_relations_need_assembly_placement.md`.

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
  write path; the mutation spec under `scripts/mutation_witnesses/` for the
  guard *"THE FENCE: the suggestion path colours faces and does nothing
  else"* is the one that has to redden).
- **It reads a shape, never a dimension.** `apps/annotate/face_geometry.js`
  extracts a face's plane, its axis and radius, or its centre and radius,
  because a *relation* between two faces (parallel, coaxial, matching radius)
  cannot be tested without them. Those numbers are compared and discarded: none
  of them reaches a binding event, a stack value, or the screen.
- **A face it cannot read is `other`**, which is a first-class answer in the
  same sense a spec library's *unreadable* is — a cone, a torus and a swept
  blade surface all land there, and a face there is suggested for nothing. A
  **sphere** did too until 2026-09-30; it is now a fourth class, because a
  spherical joint's location *is* its centre and a linkage topology's edges are
  centre-to-centre. The vocabulary is `tolerance_stack/feature_geometry.py`'s,
  generated into the module both apps read.

The rules are two declared tables in `apps/annotate/suggestions.js`: which kind
of surface an element's own words ask for, and how much further a face already
bound nearby narrows it (every flat face on the part → the ones parallel to a
face bound on that same part → for round faces only, the ones whose radius
matches a face bound on the *adjacent* part).

**The narrowing this surface cannot do, and why it matters here.** Two flat
faces on *different* parts are not compared, because the suggestion engine
reads each part in its own local frame, where one mesh's plane normal means
nothing against another's. Since 2026-10-14 the parts are *drawn* in the shared
assembly frame ("Where a part is drawn", above), but the engine's per-part
logic was deliberately left as it was. Exactly one relation survives having no
shared frame: two mating cylinders have the same radius, because a radius
belongs to one face rather than to a pair of frames. The table declares the gap
with its reason rather than computing a coplanarity it cannot support, and the
surface says so in plain words. Reading the placements the scene now applies
into the engine is the next step, filed as
`docs/issues/ISSUE_20260921_cross_part_face_relations_need_assembly_placement.md`.

Full detail — the thresholds, the measured hit rates over the installed meshes,
the rule table and the display states — is in `apps/annotate/README.md`'s "Face
suggestions" and in
`docs/sessions/lessons/LESSONS_20260921_annotate_face_suggestions.md`.

## Sweep mode — playing back a solver's answer

Added 2026-10-01 (handoff `kinematic_sweep_animation`). Jeff: *"I need a way
to review/verify the results, and an animated sweep would be the most ideal …
even better would be to anchor the 3d bodies to the kinematic rigid bodies and
animate those through the sweep."*

**It is a viewer of another repo's output and it writes nothing.** The one
write path this app has (`storage.writeFeatureIdentityEvent`) is not reachable
from any of it. Everything below is reading, arithmetic and drawing.

### What it reads

`data/inbox/linkage-sweeps/<run-id>.json` — a `linkage-sweep/v1` artifact
published by `C:\workspace\linkage`. The schema is checked **literally**: a
`v0` run (there are some on disk) carries measurements and no body poses, and
is refused with that as the reason rather than animated into a stick figure of
nothing. The inbox is read-only from here and append-only in the repo; nothing
in this app adds to it, renames it or tidies it.

From the artifact: `bodies[]` and `links[]` (which parts each rigid body and
each distance-constraint member carries, as topology part ids), and per point
the driver value, the measures, `converged`, `residual_norm`, each body's
`poses`, each joint's two world points and axis, and each distance joint's
reconstructed spin-free pose.

### The frame rule

The artifact's poses are relative to each body's **as-modelled** configuration
— the pose the model was built in, which the run writes as an exact identity at
one of its points. **Face picking and binding are off outright whenever any
body is away from that pose**, with the reason where the bind instruction would
otherwise be. A face swept somewhere else is still the right face, but every
reason a reader has to trust what they clicked is about where it was: a binding
is identity recorded against geometry sitting in the as-modelled frame. At that
frame sweep mode is transparent and picking behaves exactly as it always has.

### Which occurrence a body is

A topology part resolves to an installed mesh through the alias table, and that
mesh may occur many times in the assembly — five pitch arms, five pitch links,
three mounts. Which occurrence a body is, is decided in two steps, and the bar
names the answer and its residual for every body:

1. **What is even a candidate is exact**, from what the extraction recorded:
   the mesh's own occurrences, plus any occurrence sharing one of their
   `instance_name`s, plus any named `<this mesh's product>.<n>`. That last arm
   is what finds blade 1's pitch link, whose occurrence is recorded on the
   *instrumented* variant's provenance because a topology part names the
   design part (`DAG_TOPOLOGY.md`, "A `part`'s `drawing` names the design
   part"); the middle arm is what does the same for blade 1's blade, where all
   three installed geometries record one `instance_name` and differ only in
   path.
2. **Geometry decides between them**: the candidate whose own joint feature —
   a fitted ball centre, or the perpendicular distance to a fitted bore axis —
   lands nearest the joint point the solver reports at the as-modelled frame.
   Nearest wins; a nearest too far away, or one tied with its runner-up,
   **refuses** and the body keeps its stick figure with the reason stated.

A **ground** body is the one case with nothing to decide: it does not move, so
its parts sit where provenance says. A part may legitimately occupy more than
one occurrence on one body — the pitch link carries two spherical bearings, one
at each end — and both are drawn.

**A body also carries everything recorded inside its matched occurrence**
(2026-10-14). The pitch plate `215177-001` is, in Jeff's words, "the assembly
with the bushings pressed into it", and its nine bushings are separate meshes
whose instance paths lie under the plate's own occurrence. So an occurrence of
any mesh whose path is under a matched occurrence rides that body's pose
(`AA.sweepCarriedOccurrences`): the deepest enclosing match wins, a part the run
lists by name always beats an inherited claim, and a different mesh recorded at
exactly a matched path — the instrumented pitch link at the design link's slot
— is the same occurrence and moves too. Parts carried *inside* a moving
occurrence are opened by the sweep, like the listed ones; the bar lists them as
moving with their body.

**Everything else sits still where the assembly puts it.** An opened part no
body of the run anchors stays visible at its as-modelled occurrence — which is
the mechanism's context, not clutter — and the bar's body list names those
parts under "Not moved by this run". A mesh moved at one occurrence keeps its
other occurrences still: blade 1's pitch arm swings, the other four do not.
Leaving sweep mode clears the run's overrides, which puts every part back at
its rest placements, plus the visibility and see-through state it had.

The thresholds, and the two ways a feature can be read (fitted, or the
manifest's coarser face centroids for a part too big to fit), are named
constants in `apps/annotate/sweep.js`; the bar says which reading it used,
because they do not deserve the same trust.

### The two-force members

A distance constraint has no rigid body of its own, so the artifact
reconstructs one with **spin = 0 by convention** — the minimal rotation from
the as-modelled A→B direction to the current one — and sweep mode anchors the
link's mesh and both its bearings to that. The bearings travel with the link.
Whether a ball ought instead to follow the body it is pressed into is an open
question, filed rather than guessed.

### What is on screen, and the four numbers

A bead at every joint (coloured by a kind **derived** from whether linkage
listed the joint as a distance constraint and whether it carries an axis — not
a joint-type vocabulary this app would have to keep in step with a solver in
another repo), a line along every two-force member, a frame on every body at
the centroid of the joint ends measured to ride on it, an optional faint trail
of each joint's whole path, and the anchored bodies, translucent by default so
the linkage reads through them.

**Hovering a bead says what that joint is** — the kind in words, and for a
two-force member its length and the **convention its reconstructed pose was
built under, quoted from the artifact verbatim**. A tooltip rather than a
legend, by the handoff's own call: a legend is permanent chrome for a question
asked once. The convention is not re-worded here, because it is the producer's
claim about its own numbers and this app did not compute it.

The readouts are **the solver's own numbers at the point nearest the handle**,
never blended between two points: blade pitch solved, blade pitch from the
reference sheet, their difference, actuator travel, motor angle, each link's
measured `|A − B|` against its declared length, and the residual norm. Those
are the verification. A point the solver did not settle is drawn in the warning
colour and marked under the scrubber.

### The verbs

`sweep <run-id | latest | off>`, `play`, `pause`, `speed`, `seek`, `step`,
`loop`, `layer` — and `?sweep=<run-id>&t=<driver value>` as a deep link through
the same list. **`latest` is the newest run by the artifact's own `ts`**,
tie-broken by run id, on every adapter that lists runs (`AA.orderSweepRuns`).
Until 2026-10-14 it was the run id sorted descending, which is alphabetical —
`vpa-pitch-s-…` beat a P1 run published two seconds later, and Jeff watched
run S believing it was P1. The bar's first line names the run's mechanism in
words, and offers the other published runs in a picker when there are any. Every control in the bar, every key and the command box drive
one state machine through those verbs, which is this app's standing rule.
`apps/annotate/README.md`'s verb table is the reference.

## What this MVP does not build

- **Measurement from geometry.** Explicitly out of scope by the brief's
  decision 1 — 0 of 43 endstop rows were measurement-blocked, so this can
  wait.
- **Cross-part face relations from the shared frame.** Since 2026-10-14 every
  part is drawn where the assembly puts it ("Where a part is drawn", above),
  which retired this entry's earlier form ("parts render side by side at their
  own local origin"). What is still not built is the use of that frame by the
  face suggestions — coincident faces on two bodies suggesting an interface,
  which is what Jeff asked for the placement *for*
  (`ISSUE_20260921_cross_part_face_relations_need_assembly_placement.md`).
- **Automatic supersession / correction events**, the way
  `docs/spec_library/`'s `correction` mode works. v0's fold has no notion of
  "this binding replaces that one" — every `bound` event is a fact that
  stands, and many-to-many absorbs the cases a 1:1 correction model would
  otherwise need. If a real retraction need arrives, it is a schema
  extension, not a redesign.
