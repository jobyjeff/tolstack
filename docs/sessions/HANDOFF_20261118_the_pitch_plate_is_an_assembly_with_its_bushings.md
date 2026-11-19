---
priority: high
depends_on: [a_bound_pattern_offers_the_whole_pattern_on_the_other_part]
model: opus
hitl: false
---

# HANDOFF 2026-11-18 — the_pitch_plate_is_an_assembly_with_its_bushings: 215177 is authored as the plate and its pressed bushings, and the straight bushings are top-level parts

Source: Jeff's note `20261117T224550_onme22` (2026-11-17), quoted below;
`docs/sessions/lessons/REVIEW_20261117_the_models_parts_against_the_product_structure.md`;
strategy session 2026-11-18 (`dispatch/docs/strategy/HANDOFF_20261117_strategy.md`).
Baseline: master after `a_bound_pattern_offers_the_whole_pattern_on_the_other_part`.
Scope: `docs/topologies/topology_vpa_end_stop_v2.json`, its map layout file,
`docs/DAG_TOPOLOGY.md` where it describes the model, the mesh registry entries
this needs, and tests. Do NOT touch v1 (`topology_vpa_pitch_linkage.json`) or
its studies, the annotate bind/keep/suggestion code (the two handoffs before
this one own it), or any other part's structure — the hub, links and blade wait
on Jeff's answers.

**Jeff's real binding log is read-only here:**
`C:\workspace\tolstack\data\inbox\feature-identity\`. Count its files before
and after; anything you bind goes to a scratch data root holding a copy.

## What Jeff said

"The pitch plate assembly is one of them. It has bushings pressed into the
bores for the pitch link and tan link attachments. There is a flanged bushing
on one side, and a straight bushing on the other side. The flanged bushings
are part of the 215177 assembly and the straight bushings aren't assembled
until the top level because they are a transition fit in the bore and could
fall out if assembled before the fasteners are installed. This means that the
straight bushings are missing from the model, and also means the holes are all
different sizes … The legacy model has the grip length stacks for these joints,
also the propulsion assembly (217755) has individual section views of both
fastener stacks."

## What is there today (read 2026-11-18)

- v2 has one part, `pitch_plate_215177_001` ("215177-001 pitch plate"), with
  `pitch_plate_link_attach_bore` and `pitch_plate_tan_link_attach_bore` as
  datum features on it. v2 already nests parts with `parent` (the link
  bearings).
- Enovia, per the product-structure review: assembly 215177 = plate 215735-001
  + flanged bushing NAS77A3-015A ×8 + NAS77A4-015A ×1. The 215177 mesh
  (`37e9f606…`) is 10 solids. Plain bushing 214820-002 ×8 is a sibling under
  the pitch plate installation, not a child of 215177.
- Jeff's bind of `pitch_plate_link_attach_bore` took faces on two solids: 1380
  and 1381 on solid 0 (the plate), 1509 and 1510 on solid 4 (a bushing).
- v1 already names `bushing_214820_002`, `straight_bushing_214820_002` and
  `flanged_bushing_nas77a3_015a`, and carries the `study_pitch_link_*`
  grip-length studies. v2 reuses v1's ids where a thing is the same thing
  (`docs/DAG_TOPOLOGY.md`, "Models").
- A single-solid plate mesh (`asm217755_215735_001`) and meshes for
  NAS77A3, NAS77A4 and 214820 are installed under
  `C:\workspace\tolstack\data\meshes\`; check each against its
  `provenance.json` before you rely on it.

## Deliverables

1. **215177 is an assembly in v2.** Its members are the plate (215735-001) and
   the flanged bushings Enovia lists, as children. The straight bushings
   (214820-002) are parts of the model at the top level, seated in the plate's
   bores, not children of 215177. Author only the bushings at attachments the
   end-stop model actually reaches (the pitch link and tangential link
   attachments); say in the lesson how many that is and which Enovia
   occurrences were left out as outside the model.
2. **Each surface belongs to the part that owns it.** The plate's bore, the
   bushing's outside and the bushing's bore are features of their own parts,
   joined by constraints that say what the fit is (pressed, transition) in the
   model's existing interface words. If a needed word is missing, add it
   through the vocabulary constant and its generated JS, never as a literal.
3. **Nothing is invented.** A fit's value comes from a cited drawing callout
   (217755's section views, a part drawing in `data/inbox/drawings/`, the
   values v1's studies already cite) or it is a recorded gap. Do not transcribe
   a number from v1 without carrying its citation.
4. **No standing binding of Jeff's changes meaning.** Suggestion: keep
   `pitch_plate_215177_001` and both attach-bore node ids exactly as they are,
   and add the children and their features beside them, so no key is re-keyed;
   a child may name a solid of the assembly's mesh rather than a new mesh. If
   that cannot hold, do not migrate anything: write what would have to move as
   a table in the lesson (event, old key, new key) and put the question on the
   review page for Jeff. Which part `pitch_plate_link_attach_bore` itself
   should finally sit on (the plate's bore or the bushing's) is a question for
   that page too, with the faces of each shown.
5. **The map draws it.** The pitch plate reads as an assembly with its members
   inside it, the straight bushings as their own boxes, and every new
   constraint has a symbol. Place them in the layout file so nothing crosses a
   box; the portrait arrangement and Jeff's other placements stay where they
   are.
6. **Every site the structure reaches:** the tree, the map, the Preview, the
   3D pane's part list, and the solver pairing test
   (`tests/test_topology.py::test_an_edge_at_a_swept_joint_says_what_the_joints_type_suggests`)
   all read the new structure. The `pitch_link` and `tan_link` ball joints
   still pair with the solver's.

## Definition of done

- The v2 model validates; default tier green per `CLAUDE.md`; the two fast
  node tiers and the browser suites you changed green.
- **Look at the merged page with vision** (served from your branch, projections
  rebuilt into a scratch root): the map at 3840 Side by side with the pitch
  plate's district, each new joint hovered, and the pitch plate selected in
  the tree and the pane. Read each shot before the lesson is written.
- On a copy of Jeff's log, every binding that stood before still stands on the
  same feature, or is in the lesson's table as a question. The real log's file
  count is unchanged.
- Lesson (`docs/sessions/lessons/LESSONS_20261118_the_pitch_plate_is_an_assembly_with_its_bushings.md`):
  the parts and constraints added (a table), each fit's citation or gap, the
  bushings left out and why, the binding table, the shots, and what the same
  move would cost on the hub (six standing bindings) so the next structure
  handoff starts from a measured number.
