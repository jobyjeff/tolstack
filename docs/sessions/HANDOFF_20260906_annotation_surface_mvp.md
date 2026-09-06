---
priority: high
depends_on: []
---

# HANDOFF 2026-09-06 — annotation_surface_mvp: select geometry, tag it with a stack element's identity — no measurement

Source: the locked 3D-annotation brief
`C:\workspace\dispatch\docs\strategy\HANDOFF_20260904_3d_annotation_strategy.md`
(read it — its 8 locked decisions bind this session) + the gating spike's
lesson, now landed:
`C:\workspace\rotorkit\docs\sessions\lessons\LESSONS_20260904_step_tessellation_spike.md`
(on rotorkit's `integration`; read it in full — its "Inputs
annotation_surface_mvp needs" section is this handoff's technical baseline).
Baseline: tolstack `integration` with `viewer_consolidation` merged; rotorkit
`integration` with the spike merged (`rotorkit/stepgeom/tessellate.py` +
`scripts/tessellate_parts.py` + the three.js r169 vendor under
`spike/step_tessellation/vendor/`). Scope: new `apps/annotate/` app, a new
`data/inbox/feature-identity/` event stream + its projection builder, mesh
assets under `data/meshes/`; do NOT touch `tolerance_stack/stack.py`'s fold,
the `study/v0`/`topology/v0` schemas (additive sidecar only), the topology
page beyond adding a link, or anything in rotorkit (needs there go in the
lesson, not in cross-repo edits).

## Why this exists (one paragraph, from the brief's evidence)

Of 43 endstop ground-truth rows, measurement blocked 0 and **identity blocked
15**: dimension values extract losslessly from drawings, but nothing states
*which physical feature a stack element means*. So the MVP is select + tag,
**no measurement-from-geometry** — the surface resolves feature identity, and
a human does the selecting. Deterministic, append-only, tolstack's
cite-or-gap discipline throughout.

## Deliverables

1. **Mesh assets with provenance.** `data/meshes/<source_step_sha256>/` in the
   **main checkout** (`C:\workspace\tolstack\data\...` — worktrees have no
   `data/`), holding the spike's binary format verbatim: `positions.f32` /
   `indices.u32` / `face_ids.u32` + `manifest.json` (face table with
   `area_native2` + `centroid_native`), plus a provenance sidecar (source STEP
   path, sha256, tessellation tier, produced-by command). Produce fixtures by
   running rotorkit's tessellation from its main checkout
   (`C:\workspace\rotorkit`, its venv — OCP lives there, never here; see
   `scripts/tessellate_parts.py --help`), against at least the spike's two
   proven parts (M1 blade OML, 213668-002 mount). If the script can't target
   an output dir, copy the run's outputs with provenance noted — do not patch
   rotorkit.
2. **The `feature-identity/v0` event stream.** One immutable JSON per event in
   `data/inbox/feature-identity/` (append-only, inbox conventions; schema id
   `joby.tolerance_stack/feature-identity/v0`). An event binds a **stack-side
   key** — `{topology_id, edge_id}` or `{stack_id, element_index}`; these ARE
   the DAG vocabulary, one identity namespace (brief decision 4) — to a
   **geometry-side key**: `{source_step_sha256, face_id}` **plus the face's
   `area_native2` + `centroid_native` fingerprint copied from the manifest**
   (the spike's identity contract: `face_id` is traversal-order, proven stable
   across an unedited re-export, untested across a real edit — never trust it
   blind). The schema must carry, per the brief's locked decisions:
   - **many-to-many with direction** (dec. 4): multiple events per element and
     per face; each carries `direction` and an optional `composition` note
     (one callout feeding three rows, one row summing two callouts — both
     observed in rows that succeeded).
   - **per-part attribution + owner-not-in-set + path provenance** (dec. 3):
     `owner_part` when found; a first-class `owner_not_in_set` verdict when
     the loaded set doesn't contain it; and `path` recording *how* the owner
     was reached — a lateral hop through another configuration's assembly is
     a **hypothesis, carried as such**, distinguishable from a direct hit.
   - **GD&T modifier + the owner's general-tolerance regime** (dec. 5) as
     optional identity fields (`gdt_modifier`, `general_tol_regime`) — they
     are identity, not decoration.
   - Field vocabularies as module-level named constants, never inline
     literals (this repo's most-repeated defect; a scan test exists).
3. **Fold + projection.** A builder (via the `scripts/projection_provenance.py`
   gate like every shared-projection writer) folds the stream into
   `data/projections/feature-identity/…`: per stack-side key, current
   bindings + full event history; per geometry key, a **staleness check** —
   when a mesh set is re-tessellated from a replaced STEP, re-validate each
   stored `face_id` against the new manifest by area+centroid within a
   tolerance and mark non-matches "needs re-confirmation", never silently
   re-bound and never dropped (same posture as the spec library's three
   outcomes).
4. **The annotate app.** New static, build-free `apps/annotate/` (three.js
   r169 as ES module via native import map — copy the vendor from the spike;
   no bundler, no npm). Loads a study from `docs/topologies/` (fixture:
   the L2 pitch-system studies), lists its elements with their current
   binding state (bound / unbound / owner-not-in-set / needs
   re-confirmation), opens the part **set**, click-selects a face (the
   spike's raycast + contiguous-vertex-run highlight is proven — reuse its
   approach), and writes a `feature-identity/v0` event file. Static-transport
   reality: a `file://` page can't `fetch()` binaries and can't write events —
   serve via a trivial static server + the File System Access write pattern
   forge's apps use, or an explicit documented equivalent; a transport that
   can't write must hide the write controls, never show a dead button.
   Lazy-load per part (spike lever #1): geometry loads when a part is opened,
   not the whole set eagerly. Link the topology page's study rows here (one
   `<a>`, nothing more). MVP explicitly does NOT: measure, sum, propose
   bindings, or render assemblies with placement transforms (untested in the
   spike — single parts side by side is the MVP posture; note the placement
   gap in the lesson).
5. **Precedence guard (dec. 6, display-level for now):** a binding is
   identity, not a value source — the app's copy must not imply the 3D model
   supplies dimensions. Where a binding coexists with a drawing citation, the
   drawing face wins and the UI says so in plain words (UI-copy convention:
   short, no jargon, no internal names).

## Definition of done

- End to end on real data: open a pitch-system study, bind at least one
  element to a face of 213668-002, event file lands in the inbox, fold shows
  the binding with provenance; one element recorded `owner_not_in_set`; one
  binding flagged "needs re-confirmation" by re-validating against a
  perturbed-fingerprint manifest fixture (synthetic is fine).
- Tests: value-level pytest for the event schema, fold, and staleness
  re-validation (fixture event files + manifests, no OCP, no network);
  browser-side checks in the repo's existing node harness style
  (`apps/viewer/run_tests.cjs` precedent) or a `?autotest=1` programmatic
  path like the spike's if headless browsing is unavailable — the spike
  lesson documents why real browser automation is off-limits on this machine
  (it hijacks Jeff's live session; don't repeat that).
- Full suite green.
- Lesson (`docs/sessions/lessons/LESSONS_20260906_annotation_surface_mvp.md`):
  the event schema as shipped, what the endstop/stroke **stack-build
  handoffs** should consume from it (they are staged next and will bind
  their unresolved rows through this surface), the placement-transform gap,
  and anything rotorkit's tessellation seam needs (issue-shaped, for a
  rotorkit handoff — not edited cross-repo).
