---
priority: high
depends_on: [a_map_pin_faces_each_partner_and_no_two_routes_share_a_run]
model: opus
hitl: false
---

# HANDOFF 2026-11-19 — an_assembly_is_an_outline_and_its_parts_may_sit_in_two_bodies: an assembly is a container whose parts may move with different bodies, and the map draws it as an outline

Source: Jeff's note `20261119T142516_ci28ci` (2026-11-19): "215177-001 IS the
pitch plate assembly, yet is shown as a child of the assembly collector,
parallel to the 215735-001 pitch plate part (which is actually a child of the
assembly)"; "the spherical bearing itself is two bodies joined by the
spherical joint"; "both link assemblies are flexible, and contain a single
rigid body plus part of two other rigid bodies (the inner races are actually
part of the mating parts' rigid bodies)"; "the boundaries of the bodies and
assemblies overlap each other (they're not perfectly nested) … The real PITA
are the spherical bearings: they are a single part number that contains two
bodies." Screenshot:
`C:\workspace\forge\data\inbox\atomic-notes\attachments\20261119T142516_ci28ci\paste-20261119T134821.png`.

Strategy's decision from that (2026-11-19): **assemblies and bodies are two
groupings of the same parts, and neither nests in the other.** The assembly
tree (`Part.parent`) says what is built into what; a body says what moves as
one. This handoff makes the schema and the map able to say it. It changes no
model: links 4 and 5 of the chain re-author v2 with it.

Baseline: tolstack `master` at `ccfe4926` plus the handoffs ahead in the
chain. Scope: `tolerance_stack/topology.py`, `tolerance_stack/model_view.py`
where the view must follow, `scripts/build_topology_projection.py`
(`load_topology_map`, `computed_map_places`), `apps/viewer/map.js`,
`apps/viewer/views/map.js`, their tests, `docs/DAG_TOPOLOGY.md` ("A part may
contain parts", "Bodies", "Models", "The map"). Do NOT touch the two topology
JSON files or the v2 map file, the grid (`VA.gridBraces`,
`apps/viewer/views/topology.js`) or the Groups control (link 3 owns both),
`apps/annotate/`, or `C:\workspace\linkage`.

## What the schema refuses today (`tolerance_stack/topology.py`, read 2026-11-19)

- Every part is in exactly one body (:1045–1055, :1069–1074), and a child is
  in its parent's body (:1080–1088: "An assembly's parts move with it, so
  they are in its body").
- A structural edge's `part` must be on both of its end nodes (:1141–1152).
- A model that reuses another's ids must state each shared node on the same
  parts and each shared edge with the same part
  (`tests/test_topology.py::test_a_model_that_reuses_anothers_ids_means_the_same_feature_by_each`,
  :1251). v2 reuses 24 node ids and 24 edge ids of v1, and v1 has no child
  parts.
- A part has no kind; an assembly is a part with children. The map draws a
  part with children as a box (for its own features) inside an unlabelled
  outline round that box and its children's boxes (`apps/viewer/map.js`
  :816–824). That box is what Jeff read as a second pitch plate.

## Deliverables

1. **A part's parent may be in another body, or in none.**
   - Every part with no children is in exactly one body (unchanged).
   - An assembly is listed in a body only when every part under it is in
     that body. An assembly whose parts sit in two or more bodies is listed
     in none, and that is not an error.
   - A part in no body carries no node. (A feature moves with one body.)
   - The error texts say the new rule in the same plain voice.
2. **An assembly may own a dimension between its parts' features.** A
   structural edge's `part` may be an assembly that is an ancestor of the
   part on each end, provided both ends' parts are in one body (example to
   come in link 4: a link's centre-to-centre length, called out on the link
   assembly's drawing, between the two outer races' centres).
3. **A finer model may state a shared feature on the member that carries
   it.** In the shared-id check, a node the other model puts on part P may
   sit, in this model, on a descendant of P; an edge's `part` likewise. All
   else the check holds stays held.
4. **The map draws an assembly as a labelled outline.** An assembly with no
   node of its own gets no box: its outline (round its parts' boxes, nested
   outlines for nested assemblies) carries its name, drawing number first
   and the everyday name beside it, placed like a district's label and
   distinct from it by type, not by a new colour. An outline may cross a
   district's border when its parts sit in two bodies; both stay legible.
   An assembly that still owns nodes keeps today's drawing (v2's 215177 and
   both links, until links 4 and 5 move their features), so v2's map is
   unchanged by this handoff.
5. **Children of a box-less assembly have places.** `places` may name any
   part; a part under a box-less assembly with no authored place gets a
   computed one inside the outline (say the rule in "The map"). The loader
   keeps refusing an unknown part.
6. **The docs say it once.** `docs/DAG_TOPOLOGY.md` states the two
   groupings, the three rules above and the outline, with the vocabularies
   untouched (no new word).

## Definition of done

- Python, value-level, on fixture models: an assembly with a child in each
  of two bodies loads, is in no body, and `children`/`part_depth` read as
  before; a node on a part in no body is refused by name; an assembly-level
  structural edge loads when both ends are under it and in one body, and is
  refused when the ends are in two; a finer model's shared node on a child
  passes the shared-id check and one on an unrelated part still fails.
- Fast and browser checks on a fixture: a box-less assembly draws one
  labelled outline and no box; a nested one draws two outlines; an outline
  crossing two districts has zero notes; every entity is still drawn once.
- `[real]`: v1 and v2 load and draw exactly as before this handoff (cite the
  counts and a before/after shot of v2's map).
- Tiers as `CLAUDE.md`'s table; witness specs for guards added or changed.
- Lesson (`docs/sessions/lessons/LESSONS_20261119_an_assembly_is_an_outline_and_its_parts_may_sit_in_two_bodies.md`):
  shots of the fixture outlines (one inside a district, one crossing two);
  every reader of `body_of` or `parent` you found that assumed nesting and
  what you did with it; what link 3 must know about the grid.
