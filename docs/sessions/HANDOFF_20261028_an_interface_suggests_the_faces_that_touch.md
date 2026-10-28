---
priority: high
depends_on: [the_scene_pane_is_one_flyout_that_reads_over_http]
model: opus
hitl: false
---

# HANDOFF 2026-10-28 — an_interface_suggests_the_faces_that_touch: a gap edge names two parts and an interface kind, so the candidate faces are the ones that are coplanar / coaxial / concentric and in contact in the assembly

Source: Jeff, 2026-10-28, end of the strategy session: *"If you know there's
an interface between two parts, it's very easy to narrow down by filtering
planar surfaces on each body that are coplanar, or even better contacting
each other (within some narrow margin). Same for cylindrical surfaces
(coaxial). Wonder if we should build this functionality out first, and then
have the agent trial/debug it when they make the proposals."* — the
coincident-face interface suggestion he named on 2026-10-14 as the reason
the annotator draws every part at its assembly placement. Baseline:
`master` with `the_scene_pane_is_one_flyout_that_reads_over_http` merged.
Scope: a new Python module beside `tolerance_stack/feature_geometry.py` (a
row in `ARCHITECTURE.md`'s inventory), a builder script under `scripts/`
registered with `scripts/projection_provenance.py` like every other
projection writer and called from `scripts/rebuild_projections.ps1`, the
annotator's suggestion display (`apps/annotate/app.js` `suggestionLine`
~:3499 and the face-colouring code it drives; the rail row for a feature),
`docs/ANNOTATION_SURFACE.md`, tests. Do NOT touch `apps/viewer/`, the
binding writers, or the fold in `tolerance_stack/feature_identity.py` — the
proposal handoff (`an_agent_proposes_a_face_binding_and_a_human_ratifies_it`,
which depends on this one) owns those.

## What exists to build on

- **Face fits, pure Python, no numpy:** `tolerance_stack/feature_geometry.py`
  — `read_mesh`, `face_vertices`, `fit_plane` (:759), `fit_cylinder` (:801),
  `fit_sphere` (:870), `fit_face` (:978, answers a shape word or refuses),
  `fit_part_faces` (:1103). A fit is in the **part's own frame**.
- **Meshes:** `C:\workspace\tolstack\data\meshes\<sha>\manifest.json` —
  `faces[]` = `{face_id, solid_id, n_triangles, n_vertices, area_native2,
  centroid_native[3]}` plus the positions/indices/face-id buffers;
  `provenance.json` — `source_step_sha256`, `part_id`, `label`,
  `extraction.instances[]` = `{instance_name, product_name, instance_path[],
  depth, placement_local[16], …}` (the assembly placement per occurrence,
  the same matrices `fit_bound_features.py` applies to produce a value and
  the annotator applies to draw since 2026-10-14).
- **The topology:** `docs/topologies/topology_vpa_pitch_linkage.json` — a
  gap edge's `interface` is one of `planar | pin_in_bore | spherical |
  cylindrical_slide | thread | clearance` (`docs/DAG_TOPOLOGY.md:154`); its
  two end nodes each name a part (the node's `parts[0]` is what the scene
  uses for anchors). 17 gap edges carry an interface today.
- **The suggestion engine (2026-09-21):** per-part, shape-class only — a
  diameter wants a round face, a thickness flat ones, a joint centre a
  ball — rendered as colour in the annotator, never a selection, never a
  write. It knows nothing about the *other* part.
- **Bindings written so far: zero** (the proposal handoff's measurement).

## Deliverables

1. **Contact candidates per gap edge, computed in the assembly frame.** For
   each gap edge with an `interface` whose two end nodes resolve to parts
   with meshes and occurrences: transform each part's fitted faces into the
   assembly frame through the occurrence's placement (when a part has
   several occurrences, the pair of occurrences nearest each other wins;
   record which), then pair faces by the interface kind:
   - `planar`: plane–plane, normals antiparallel within an angle tolerance,
     signed gap along the normal within a margin, projected footprint
     overlap above a floor (report the overlap area);
   - `pin_in_bore`, `cylindrical_slide`, `thread`, `clearance`:
     cylinder–cylinder, axes parallel within tolerance and coincident within
     a radial margin, radii ordered (bore ≥ pin) with the radial clearance
     reported, axial overlap above a floor;
   - `spherical`: sphere–sphere (or sphere–cylinder/plane seat), centres
     within a margin, radii reported.
   Every candidate pair carries its evidence (gap, angle, overlap, radii,
   clearance) and a rank; the tolerances are **module-level constants with
   the measured populations in their comments** (the repo's rule), chosen by
   measuring the real linkage — print the distribution of plane gaps and
   axis offsets over all candidate pairs first, then pick margins that
   separate contact from near-miss, and say in the lesson how clean the
   separation is. A face that fits as `other` never qualifies. An edge with
   no candidates says why (`no_mesh`, `no_occurrence`, `no_fit`,
   `no_contact`).
2. **A projection, rebuilt with the others.** `scripts/build_contact_suggestions.py`
   (name to taste; registered as a projection writer, provenance-stamped)
   writes `data/projections/feature-identity/contact_suggestions.json`:
   per topology, per gap edge, the ranked candidate pairs with evidence, the
   occurrence pair used, and the reason when empty. `rebuild_projections.ps1`
   calls it; it is read-only over meshes and the topology.
3. **The annotator shows the ranked candidates for the selected edge.**
   Selecting a gap edge (or a feature on either side of it) colours the
   top candidate pair distinctly from the shape-class colouring, lists the
   top three in the rail row with their evidence in everyday words ("flat
   on flat, gap 0.02 mm, overlap 340 mm²"), and a click on a listed
   candidate frames it in the scene. **Still never selects and never
   writes** — the pick remains the human's (or, next handoff, the agent's
   proposal). In the served pane this reads over HTTP like the rest.
4. **Docs.** `docs/ANNOTATION_SURFACE.md` gains a "Contact suggestions"
   section stating the kinds, the evidence fields and the never-writes
   rule; `ARCHITECTURE.md` the module row; `CLAUDE.md`'s annotator bullet
   one sentence.

## Definition of done

- Over `topology_vpa_pitch_linkage.json` in the main checkout: a table in
  the lesson — every gap edge with an interface, candidate count, the top
  pair's evidence, and the empty reason where empty. Target to report, not
  to force: how many of the 17 have exactly one clear top pair.
- Value-level tests on hand-built meshes (two plates in contact, a pin in a
  bore with 0.05 mm clearance, a ball in a socket, a near-miss plate 2 mm
  away) for each kind; a `[real]` test that the live projection has the
  schema and that the four ball joints each have ≥ 1 spherical candidate.
- Annotator browser check: select a gap edge → the top pair is coloured and
  listed; clicking a candidate frames it; no event file is written.
- All four main-checkout tiers green after a projection rebuild; `pytest -q`
  green; the new builder refuses an older tree like its siblings.
- Lesson (`docs/sessions/lessons/LESSONS_20261028_an_interface_suggests_the_faces_that_touch.md`):
  the measured gap/offset populations and the margins chosen; the table
  above; which edges the engine cannot decide and why — that list is the
  proposal handoff's input and the agent's trial/debug brief.
