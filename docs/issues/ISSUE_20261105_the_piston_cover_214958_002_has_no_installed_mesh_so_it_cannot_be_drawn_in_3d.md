---
type: chore
priority: med
status: resolved
area: meshes/extraction
reporter: agent
found_by: docs/sessions/HANDOFF_20261105_the_piston_heads_and_cover_ride_with_their_bodies_in_the_kinematic_model.md
defer_until: 2026-11-20
class: vpa_part_facts_missing
resolution: resolved 2026-11-08 -- rotorkit run assembly_extract_20261108T092425Z installed asm217755_214958_002 and handoff model_v2_is_the_end_stop_linkage_in_five_bodies_and_the_nav_switches_models added its alias row; it is drawn in both models. Earlier: deferred 2026-11-06 (triage) -- med beyond tolstack's budget of 3 (two highs and one class-scoped handoff staged); 14 days
---

# The piston cover (214958-002) has no installed mesh, so it cannot be drawn in 3D

The handoff says three mesh manifests name the two piston heads and the piston
cover. Measured 2026-11-05 over `data/meshes/` (48 meshes): two do —
`asm217755_214699_002` (lower head) and `asm217755_214698_002` (upper head),
both recorded under `217755-001 / prd-e-03478614.1 / P3-214700.3`. **Nothing
names 214958-002** (`grep -r 214958 data/meshes/` is empty), and the topology
projection says so: `piston_cover_214958_002` has `mesh.installed = false`.

So after `the_piston_heads_and_cover_ride_with_their_bodies_in_the_kinematic_model`
the cover is declared to ride the base body (`rides_with: base`) and the 3D pane's
scope names it, but there is nothing to draw: the pane says "no 3D model for
these parts yet" for it, and the stop stack's cover row (`piston_cover_flange_to_end_stop`)
resolves to no face.

What it needs: a rotorkit extraction of the 214958-002 product from the 217755-001
A.1 assembly (the same `xcaf_product_extraction` the heads came from), installed
into `data/meshes/`, and then one row in `docs/topologies/part_mesh_aliases.json`
(exact drawing-number match, as the heads' rows are). Nothing in tolstack needs to
change for the cover to start riding: the annotator's rider rule picks it up as
soon as the mesh and its recorded position exist.
