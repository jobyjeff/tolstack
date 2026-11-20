---
priority: high
depends_on: [an_assembly_is_an_outline_and_its_parts_may_sit_in_two_bodies]
model: opus
hitl: false
---

# HANDOFF 2026-11-19 — the_groups_switches_reach_the_map_and_the_grid_brackets_an_assembly_in_two_bodies: the Groups switches show and hide containers on the map too, and the grid brackets an assembly whose parts sit in two bodies

Source: Jeff's note `20261119T142516_ci28ci` (2026-11-19): "The bodies and
parts groups under the view controls only affect the grid view. They should
also show/hide their respective containers in the 2d map. Things are going to
get a bit interesting in the grid view since the boundaries of the bodies and
assemblies overlap each other (they're not perfectly nested). I *think* this
should be doable but I'm not sure. The grid view might need to be either
assemblies or bodies, rather than both simultaneously."

Link 3 of the chain. Link 2
(`an_assembly_is_an_outline_and_its_parts_may_sit_in_two_bodies`) made an
assembly able to hold parts of two bodies and drew it on the map as a
labelled outline; link 4 authors the first such assemblies in v2 (each
spherical bearing: outer race in the link's body, inner race in its
neighbour's). This handoff gets the Groups control and the grid ready for
them, proven on a fixture.

Baseline: tolstack `master` at `ccfe4926` plus the handoffs ahead in the
chain. Scope: `apps/viewer/topology.js` (`VA.GROUP_KINDS` :1873, the reads
and writes after it, `VA.gridBraces` :2822, `VA.gridPlan`, `VA.partDepth`),
`apps/viewer/views/topology.js` (the Groups popover :129–161, the brace
drawing), `apps/viewer/views/map.js`, `apps/viewer/topology_app.js` only at
the group wiring (:3100–3104, :3212–3216), CSS, tests, `docs/DAG_TOPOLOGY.md`
and `apps/viewer/README.md` where they describe the control. Do NOT touch
`apps/viewer/map.js`'s layout, the topology JSON, `tolerance_stack/`,
`apps/annotate/`.

## What is there today (read 2026-11-19)

- Groups is two switches, Bodies and Parts, kept per model in `localStorage`
  (`tolstack.viewer.groupKinds`, a list of the kinds switched off).
- The grid reads them: `kinds.bodies` gates body brackets, `kinds.parts`
  gates part brackets, and an assembly is a part bracket with an indent and a
  fold caret (`VA.gridBraces`).
- The map receives the same `ctx.groupKinds` and reads none of it; districts,
  outlines and boxes are always drawn (`apps/viewer/views/map.js` :233–277).
  The page already repaints the map when a switch moves.
- The grid assumes body ⊃ assembly ⊃ part: a body bracket is a run of rows
  with one `row.body`, and a part bracket takes its body from its first row.

## Deliverables

1. **Three switches: Bodies, Assemblies, Parts.** A stored value written
   before this change reads as Assemblies on. The popover's count follows
   ("Groups (n of 3)").
2. **The map honours all three.** Bodies off hides every district's outline,
   fill and label. Assemblies off hides every assembly's outline and label.
   Parts off hides every part box's outline, fill and name. What is inside a
   hidden container stays where it was: pins, symbols and routes do not
   move. Hide by class, not by removing elements (the drawn-count checks need
   a district per body and a box per part in the DOM).
3. **The grid brackets an assembly in two bodies.** Bodies stay the outer
   bracket. An assembly whose rows fall in more than one body is bracketed
   once per run of its rows, each run inside its own body, each carrying the
   assembly's name; folding one folds them all. Assemblies off removes
   assembly brackets and leaves part brackets; Parts off removes part
   brackets.
   **If that reads badly when you look at it** (name repeated to the point
   of noise, brackets that suggest two assemblies), ship Jeff's fallback
   instead: in the grid, Bodies and Assemblies are one at a time (switching
   one on switches the other off there; the map still shows both). Say in
   the lesson which shipped and show the shots that decided it.
4. **No words added to the page** beyond the three labels. No sentence
   explains the control (Jeff, 2026-11-19: a page never describes itself).

## Definition of done

- A fixture model (in the test fixtures, not in `docs/topologies/`) with a
  bearing-like assembly: one child in a link body, one in a neighbour's.
- Fast checks, value-level: `VA.gridBraces` on the fixture gives one body
  bracket per body and the assembly's bracket once per run, same label; a
  fold flag folds every run; each switch removes exactly its own kind.
- Browser checks on the fixture and `[real]` on v2: with each switch off the
  map's matching containers are not visible and every pin's position is
  unchanged to the pixel; drawn counts unchanged; the stored state survives
  a reload; an old stored value (no `assemblies`) shows assemblies.
- Shots, read before the lesson is written: v2's map with each switch off in
  turn and all three off; the fixture's grid with all on, at 3840 Side by
  side and 1536 wide.
- Tiers as `CLAUDE.md`'s table; witness specs for guards added or changed.
- Lesson (`docs/sessions/lessons/LESSONS_20261119_the_groups_switches_reach_the_map_and_the_grid_brackets_an_assembly_in_two_bodies.md`):
  which grid behaviour shipped and why, with the shots; what a hidden
  container still leaves on the map; anything link 4 will trip on when the
  real bearings arrive.
