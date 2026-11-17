---
priority: high
depends_on: [the_map_is_portrait_as_jeff_drew_it]
model: opus
hitl: false
---

# HANDOFF 2026-11-17 — a_joint_says_what_kind_it_is: a face two parts share can say it is a bearing or a fastener pattern, and the solver's joints agree with the model's

Source: Jeff, 2026-11-17: "the joint between the hub body and the blade is a
flange joint, a bit surprised because that one would need to be a rotary joint
(isn't the 2d and 3d now unified?)". Also the walk's S9
(`docs/issues/ISSUE_20261116_small_findings_of_the_map_and_binding_flow_walk.md`)
and `docs/issues/ISSUE_20261116_the_model_has_no_interface_word_for_a_fastener_pattern.md`.
Baseline: `master` with `the_map_is_portrait_as_jeff_drew_it` merged. Second
of a chain of six; the next two links author more joints with the words this
one adds.

## Why the page draws a bearing as a flat seat (measured 2026-11-17)

The model has two authored shapes for "two parts meet":

- a **gap edge** with an `interface` word (`INTERFACE_KINDS`,
  `tolerance_stack/topology.py`): `planar`, `pin_in_bore`, `spherical`,
  `cylindrical_slide`, `thread`, `clearance`;
- a **node two parts share** (`kind: mating_surface`, two `parts`), which can
  state nothing. `tolerance_stack/model_view.py` gives every one of these the
  kind `contact` (`CONTACT_KIND`), and the map, the tree and Classic all draw
  a contact as the flat seat.

v2's `hub_blade1_root_bearing_bore` (parts `hub`, `blade_root`) is the second
shape, so the blade's pitch bearing is a seat on every surface, with both
sides bound to cylinders. The 3D solver has the same joint as a **revolute**
between `base` and `blade` (`C:\workspace\linkage\linkage\vpa.py`,
`build_mechanism_p2`). Nothing compares the two: the existing pairing
(`tests/test_topology.py`, near line 2537, `LINKAGE_JOINT_INTERFACES`) reads
gap edges only. The same hole is why the one fastener pattern in v2
(`tan_link_mount_fastener_clocking`) gets its ring of dots from the map's
layout file (`"symbols": {...: "pattern"}` in
`docs/topologies/map_vpa_end_stop_v2.json`) rather than from the model.

## The decision (strategy, 2026-11-17 — binding)

**A node two parts share may state an `interface` word; one that states none
is a seat, as today.** Two words are added to `INTERFACE_KINDS`:

- `revolute` — a journal that turns in a bore and does not slide: a bearing
  seat, a pivot. Jeff's word for it is a rotary joint.
- `fastener_pattern` — a ring of fasteners through matching holes; it fixes
  rotation about the joint's axis (the clocking).

This is the issue's option 2, chosen over a new node kind because one
mechanism covers both the pattern and the bearing, and because **no id
changes**: a binding is keyed by `{topology_id, part, node}`, and Jeff's log
holds bindings on both of these nodes. No node or edge is added, removed or
renamed by this handoff.

Scope: `tolerance_stack/topology.py`, `tolerance_stack/model_view.py`,
`tolerance_stack/kinematic.py`, the generated vocabulary
(`scripts/js_vocabulary.py` → `apps/viewer/vocab.gen.js`),
`apps/viewer/interface_glyphs.js`, `apps/viewer/map.js` (the symbol table and
`VA.mapSymbolOf` only), `scripts/build_topology_projection.py`
(`load_topology_map`), the two topology files (the `interface` field on the
nodes named below, nothing else), `docs/topologies/map_vpa_end_stop_v2.json`
(`symbols` removed), the places that print a joint's kind (item 5),
`apps/annotate/` only where a suggestion picks a shape from the interface
word (item 6), `docs/DAG_TOPOLOGY.md`, tests and witness specs. Do NOT move
the map's layout, add joints, or touch the grid.

**Jeff's real binding log is read-only**
(`C:\workspace\tolstack\data\inbox\feature-identity\`): count its files
before and after; work on a scratch data root.

## Deliverables

1. **The vocabulary.** `INTERFACE_KINDS` gains `revolute` and
   `fastener_pattern`, each with its line in the constant's comment and in
   `docs/DAG_TOPOLOGY.md` "Joint glyphs". Regenerate the JS vocabulary; never
   hand-edit `vocab.gen.js`.
2. **A shared node states its interface.** `Node` accepts an optional
   `interface` (one of `INTERFACE_KINDS`) when the node has two parts and
   refuses it on a node with one. Say in the docs which words make sense on a
   shared node (a `clearance` does not: two parts that share a node touch) and
   refuse the ones that do not. `model_view` gives the interface built from
   such a node the stated word as its kind, and `contact` when none is stated.
3. **The four nodes.** v2: `hub_blade1_root_bearing_bore` → `revolute`,
   `tan_link_mount_fastener_clocking` → `fastener_pattern`. v1
   (`topology_vpa_pitch_linkage.json`): `hub_blade1_root_bearing_bore` →
   `revolute`, `pitch_arm_blade_root_clocking` → `fastener_pattern`. Add a
   dated sentence to each node's `note`. Before and after, on a scratch copy
   of the log, the folded bindings are identical for both models — record the
   count.
4. **The symbols come from the model.** `revolute`: the boss-in-hole circle
   and dot with a turning arrow round it, the rotary sibling of the slide's
   straight double arrow (a suggestion — draw it at the map's size beside
   `pin_in_bore` and `cylindrical_slide` and read the three with vision at
   arm's length; they must tell apart, and Jeff found the old small glyphs
   "hard to make out"). `fastener_pattern`: the ring of dots the map draws
   today. Both exist in `apps/viewer/interface_glyphs.js` (Classic, legends)
   and in the map's table. `VA.mapSymbolOf` reads the interface's kind and
   nothing else; the layout file's `symbols` key is removed from v2's file,
   from `load_topology_map` and from `docs/DAG_TOPOLOGY.md`.
5. **Every place that prints a joint's kind prints the new ones.** At least:
   the tree's "Joints between bodies" list (today "contact" beside "blade 1
   root bearing bore"), an interface row inside a body in the tree, the
   Preview for an interface, a map connector's hover title, the "How to read
   this" panel if it lists symbols. The words a reader sees are everyday ones:
   "rotary" for `revolute`, "fastener pattern" for `fastener_pattern`. Grep
   for the others; list every site in the lesson and say which you left and
   why.
6. **A suggestion asks for the right shape.** Where `apps/annotate/` chooses
   what a feature's faces should look like from its interface (a flat face for
   a seat, a cylinder for a fit), a `revolute` feature asks for a cylinder
   coaxial with its mate and a `fastener_pattern` feature for a hole of a
   pattern (so the existing "Take all N holes" offer leads). Say in the lesson
   what each did before this change.
7. **The solver's joints are compared with the model's, for both shapes.**
   `LINKAGE_JOINT_INTERFACES["revolute"]` becomes `revolute`. The existing
   pairing in `tests/test_topology.py` reads a shared node's stated interface
   as well as a gap edge's, so that against the P2 sweep
   (`C:\workspace\tolstack\data\inbox\linkage-sweeps\vpa-pitch-p2-20261105-204957.json`,
   already bridged by `.dispatch.toml`'s `candidate_inputs`) each of the
   solver's four joints — cylindrical base ↔ pitch plate, revolute base ↔
   blade, the pitch link and the tangential link as two ball ends each — has a
   model interface of the mapped word between parts of those bodies. This is
   an extension of an existing check, not a new tier. **What it would have
   prevented:** 2026-11-16, the merged page drew the blade's bearing as a flat
   seat on three surfaces while the solver turned the blade about it (the
   walk's S9; Jeff's message of 2026-11-17). **Who pays for a misfire:** an
   agent in the default test tier, over four joints of one sweep.
8. **Close out.** Resolve
   `ISSUE_20261116_the_model_has_no_interface_word_for_a_fastener_pattern`
   (frontmatter `status`, and a line saying option 2 was taken and why); mark
   S9 answered in the small-findings issue; strike the pattern word from the
   "compound joints" row of `ISSUE_20261116_what_the_map_does_not_draw_yet`.

## Definition of done

- On your branch's page, model "Propeller Pitch System": the hub ↔ blade
  joint is drawn with the rotary symbol on the map and reads "rotary" in the
  tree; the hub ↔ tangential link mount bundle still shows seat, boss and ring
  of dots, with no `symbols` key anywhere. Classic draws both new glyphs.
  Shots in `docs/sessions/lessons/shots/<slug>/`, read with vision, including
  one crop with the three round symbols side by side.
- v2 still has 15 parts, 25 nodes, 30 edges; v1 35, 79, 99.
- The exploratory click-around on the real projection; tests per
  `CLAUDE.md`'s table; a witness spec for each guard added.
- Lesson (`docs/sessions/lessons/LESSONS_20261117_a_joint_says_what_kind_it_is.md`):
  the table of the solver's four joints against the model's word for each,
  before and after; the list of kind-printing sites; the binding counts; the
  feature-identity file count before and after; and one paragraph on what a
  `revolute` or a `fastener_pattern` on a shared node will need when the first
  tolerance study asks for its play (a bearing's radial clearance, a bolt's
  float in its hole) — what would have to change, not a design.
