---
priority: high
depends_on: [the_kinematic_grid_is_a_stack_of_sub_stacks, the_dag_holds_still_and_the_filter_bar_stays_put]
model: opus
hitl: false
---

# HANDOFF 2026-11-03 — the_joint_is_the_node_and_an_edge_says_only_lit_or_unlit: the 2D DAG's joint glyphs become the nodes, edges carry weight only, bodies get one assigned tint each, and a body is one container

Source: Jeff picked mock-up **C** (2026-11-03) of the three in
`C:\workspace\dispatch\docs\strategy\drafts\mockups\dag_iconography\`
(`A_glyph_nodes_and_lean_edges.svg`, `B_grid_structure_marks.svg`,
`C_stack_of_substacks.svg`, with `README.md`): *"I like option C, and I think
that is what a kinematic study resolves to."* On 10-29: *"the joint icons seem
to just be icons dropped on top of the line elements, what I had in mind was
that they would be integrated into the dag vector art and replace the plain
circular nodes … it's trying to do too much which leads it to just look like a
jumbled mess of lines/hashes/etc."* The grid half of C is
`the_kinematic_grid_is_a_stack_of_sub_stacks`; this handoff is the DAG half
and the palette. Open the three SVGs in a browser before writing a line.

Baseline: `master` with `the_kinematic_grid_is_a_stack_of_sub_stacks` and
`the_dag_holds_still_and_the_filter_bar_stays_put` landed (the grid's
structure-mark tokens and the `--leader-ink` token exist). Scope:
`apps/viewer/views/topology.js` (the rails SVG: nodes, bars, glyph placement,
body containers), `apps/viewer/interface_glyphs.js`, `apps/viewer/topology.css`
(`.tv__bodyfield--t*`), `docs/DESIGN_TYPE_AND_COLOUR.md`, `docs/DAG_TOPOLOGY.md`
where it describes what a node/edge draws, tests and browser checks. Do NOT
touch the grid rows, the chart, the pane, or the landing/leader-path code.

## Facts the mock-up pass measured (2026-11-03)

- `interface_glyphs.js` has **6** interface kinds plus a form mark (the 10-29
  draft said 17). Today a glyph is drawn **on** a joint's gap edge; nodes are
  plain circles everywhere.
- No node carries an interface word; the joint kind lives on the edge
  (`cylindrical_slide`, `pin_in_bore`, spherical …). A node that is an end of
  a joint edge can take the edge's kind; a node with no joint stays plain.
- Edges today carry hashes for band, colour for confidence, dash for gap,
  weight for lit: four channels on one stroke.
- Six body tints (`.tv__bodyfield--t0…t5`) **cycle** over 13 bodies, so the
  lower piston head shares the ground's tint, the upper head the blade's, the
  cover the pitch plate's (mock-up B shows it).
- `BRIEF_20261030_topology_layout_questions_the_redesign_left_open.md` Q2: a
  body with parts in two components draws as two containers (`body:base`,
  `body:base#2`), pinned in tests.

## Deliverables

1. **The joint is the node.** A node that is an end of a joint edge is drawn
   as that joint's glyph — the kinds in `interface_glyphs.js` as mock-up C
   draws them (ball = ring with centre dot; pin in a bore = ring with axis
   tick; flat faces = solid bar; cylindrical slide = hollow bar with a double
   arrow; clearance = two bars) — sized to the row pitch, in the node's ink,
   centred on the rail. A node with no joint stays the plain circle. No glyph
   is drawn on an edge any more. One place derives "which glyph for this
   node" and a value-level test pins it for the live kinematic study (four
   balls, one slide, the two stops, the rest plain).
2. **An edge says only lit or unlit.** Stroke weight for lit vs unlit (two
   tokens), dashed for a gap edge, nothing else on the stroke: band hashes go
   (MIN/MAX say it in the grid), confidence colour goes (the SOURCING chip
   says it). The hover/selection emphasis stays as the one exception.
3. **One tint per body, assigned not cycled.** The palette gets enough
   distinct low-chroma tints for the topology's bodies (13 today; design for
   ~16) or a stated rule for which bodies may share (e.g. the piston-chain
   bodies take one hue family); the same tint is what the grid rows and the
   3D scene's body colour use — the grid handoff's tokens are the home, this
   handoff extends them. `docs/DESIGN_TYPE_AND_COLOUR.md` says where the
   assignment lives.
4. **A body is one container.** When a body's parts sit in two layout
   components, draw one pill that spans both, named once, with a thin bridge
   between the spans (not two pills with `#2`). Resolves brief Q2 and its
   issue `ISSUE_20261027_a_body_with_parts_in_two_components_is_two_containers.md`;
   update the pinned test.
5. **Leaders** use `--leader-ink` (dim at rest, full on hover) — already
   landed by the hold-still handoff; verify, do not re-introduce.

## Definition of done

- `http://127.0.0.1:8000/tolstack/viewer/` → Blade pitch at the end stops:
  the DAG reads as mock-up C's left column (glyph nodes, weight-only edges,
  one assigned tint per body, one container per body). Side-by-side
  screenshot with the mock-up in the lesson; a chain study page and the
  topology row too.
- `node apps/viewer/run_tests.cjs`, `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`,
  `node scripts/run_mutation_witness_tests.mjs --changed-since integration`
  green with the glyph-per-node pin, the stroke-channel check and the
  one-container pin; `venv-win/Scripts/python.exe -m pytest -q` green.
- Issues routed (`triaged` + `handoff:` first, `resolved` after):
  `ISSUE_20261027_a_body_with_parts_in_two_components_is_two_containers.md`.
  Mark brief Q2 consumed in the 10-30 brief's marker line.
- Lesson (`docs/sessions/lessons/LESSONS_20261103_the_joint_is_the_node_and_an_edge_says_only_lit_or_unlit.md`):
  the glyph-derivation rule; the tint assignment; what the click-around
  found; where C and the build differ and why.
