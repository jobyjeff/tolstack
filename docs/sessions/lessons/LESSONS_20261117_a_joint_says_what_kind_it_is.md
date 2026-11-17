# Lessons — a_joint_says_what_kind_it_is (2026-11-17)

Handoff: `docs/sessions/active/HANDOFF_20261117_a_joint_says_what_kind_it_is.md`.
A node two parts share may now state an `interface` word. `INTERFACE_KINDS`
gained `revolute` (a reader's "rotary") and `fastener_pattern`. The blade's
pitch bearing and the two clockings say what they are, and the solver's
joints are compared with the model's.

## The solver's four joints against the model's word

Read off the P2 sweep (`data/inbox/linkage-sweeps/vpa-pitch-p2-20261105-204957.json`)
by its own residual rows (type) and its own geometry features (which body
each end is on), against v1 (`vpa_pitch_linkage`, the sweep's topology).
"Mapped word" is `LINKAGE_JOINT_INTERFACES[type]`.

| solver joint | type | bodies | mapped word, before → after | model interface, before | model interface, after |
| --- | --- | --- | --- | --- | --- |
| `plate_slide` | cylindrical | base ↔ pitch plate | `cylindrical_slide` → same | `pitch_plate_slide_bushings_to_piston_body` (and the spindle coaxiality), `cylindrical_slide` | unchanged |
| `blade_hinge` | revolute | base ↔ blade | `pin_in_bore` → **`revolute`** | `hub_blade1_root_bearing_bore`, **`contact`** (a seat; there was no `pin_in_bore` between those bodies, and nothing checked) | `hub_blade1_root_bearing_bore`, **`revolute`** |
| `pitch_link` | distance, two ball ends | pitch link ↔ pitch plate, pitch link ↔ blade | `spherical` → same | `pitch_plate_link_joint`, `pitch_arm_link_joint`, both `spherical` | unchanged |
| `tan_link` | distance, two ball ends | tan link ↔ base, tan link ↔ pitch plate | `spherical` → same | `tan_link_mount_joint`, `tan_link_plate_joint`, both `spherical` | unchanged |
| `actuator` | axial_position | — | `None` (the driver's coordinate, not a contact) | — | — |

Before this change the hinge row was the gap: the pairing read gap edges
only, and the hinge is a shared node, so a seat between the base and the
blade was never compared with anything. The extended check
(`tests/test_topology.py::test_an_edge_at_a_swept_joint_says_what_the_joints_type_suggests`)
compares 6 contacts (the slide, the hinge, and two ball ends per link) and
pins that count, so a joint dropped from the sweep's features is a red test.

## Binding counts and the feature-identity log

Jeff's log (`data/inbox/feature-identity/`) is read-only here. It held
**84 files before and 84 after** (83 events plus the tracked README). Every
fold ran on a scratch copy of it, with this tree's models:

| model | folded features | bound | digest of the folded records |
| --- | ---: | ---: | --- |
| `vpa_pitch_linkage` (v1), before | 39 | 11 | `33870884581eda89` |
| `vpa_pitch_linkage` (v1), after | 39 | 11 | `33870884581eda89` |
| `vpa_end_stop_v2` (v2), before | 1 | 1 | `ba2afc5fa3bde39a` |
| `vpa_end_stop_v2` (v2), after | 1 | 1 | `ba2afc5fa3bde39a` |

The before fold ran with the topology files untouched, and the after fold
with all four nodes stating their words. They are identical, as they must
be: a binding is keyed `{topology_id, part, node}`, and no id moved. Three of
those records are on the four nodes: `hub@hub_blade1_root_bearing_bore` and
`blade_root@hub_blade1_root_bearing_bore` under v1, and
`hub@tan_link_mount_fastener_clocking` under v2.

Model sizes are unchanged: v2 has 15 parts, 25 nodes and 30 edges, and v1
has 35, 79 and 99.

## Every site that prints a joint's kind

| site | before | after |
| --- | --- | --- |
| The map's connector symbol (`VA.mapSymbolOf`, `apps/viewer/map.js`) | the layout file's `symbols` word, else the kind | the kind alone. `revolute` and `fastener_pattern` join the table and the map's own `pattern` is gone |
| A map connector's hover title (`apps/viewer/views/map.js`) | `<name> — <symbol label>` | the same, so the bearing now reads "blade 1 root bearing bore — a rotary joint" |
| The tree's interface row, inside a body and under "Joints between bodies" (`interfaceItem`, `apps/viewer/views/nav.js`; a joint with one constraint is drawn as that row) | the stored word, underscores spaced ("contact", "pin in bore") | `VA.interfaceKindWord`: "rotary", "fastener pattern", "contact" for a seat |
| The Preview for a node or a gap edge (`renderNodeDetail` / `renderEdgeDetail`, `apps/viewer/views/topology.js`) | never printed the joint kind, only `mating_surface` / `gap` | a chip with the everyday word. A shared node's record carries `jointKind` (its word, or `contact`), and a gap edge's carries its `interface` |
| Classic's node glyph (`VA.nodeJointKinds`, `apps/viewer/interface_glyphs.js`) | read off gap edges alone | also a shared node's own stated word, ranked by `VA.NODE_GLYPH_PRECEDENCE` (rotary after the slide, pattern after the thread) |
| Classic's "Interface type" colour legend (`apps/viewer/topology.js`) | `VA.INTERFACE_GLYPHS[kind].label` | unchanged code. The new kinds come with labels ("a rotary joint", "a fastener pattern") |
| "How to read the rails" (`apps/viewer/topology.html`) | listed five glyph pictures | adds "the same with a turning arrow over it a rotary joint, a ring of dots a fastener pattern" |

Sites left as they were, and why:

- **The gap list's "contact kind not stated" row** is about gap edges with
  no word. A shared node stating nothing is a seat, which is a legitimate
  answer and not a gap.
- **`apps/viewer/sweep_export.js`** prints the *solver's* joint names
  ("pitch link · upper end"), not a model kind.
- **The annotator's rail and candidate rows** (`apps/annotate/sweep.js`,
  `commands.js`) print relations and pairings ("touching face", "coaxial"),
  never the interface word, so there was nothing to change.

## What the annotator's shape rule asked for, before and after

`AA.endSurfaceClass` / `feature_geometry.end_surface_class` now read a
node's stated joint kind right after a declared face: `revolute` and
`fastener_pattern` (`CYLINDRICAL_INTERFACE_KINDS`) ask for a cylinder, and
`where` is `"joint"`. Measured per incident edge, since an end is asked with
its edge's name as the fallback:

- **The bearing** (`hub_blade1_root_bearing_bore`, both models) already
  asked for a cylinder, on the word "bore" in its own name. That is the same
  answer, now for a stated reason.
- **v1's clocking** (`pitch_arm_blade_root_clocking`, "pitch arm clocked to
  the blade root") has no shape word. Before, it asked for a cylinder only
  through its edge to the link hole ("hole"), and **asked nothing** through
  its other three edges ("clocking holes to ..."; "holes" is not "hole").
  Now it asks for a cylinder through all four.
- **v2's clocking** (`tan_link_mount_fastener_clocking`) **asked nothing**
  through `hub_boss_to_tan_link_mount_fasteners`. Through
  `tan_link_mount_fasteners_to_bore` it asked for a cylinder only by
  accident, from the far end's "bore" in the edge's name. Now it asks for a
  cylinder through both, so a click on one hole meets the existing "Take
  all N holes" offer (the offer itself was already there for any cylinder
  of a pattern).

The contact suggestions rebuilt from this tree are identical to the main
checkout's apart from the pairing table itself. `CONTACT_PAIRINGS` gained
`revolute` and `fastener_pattern`, both `cylinder_in_cylinder`, because no
gap edge states either word yet.

## Decisions the handoff left to me

- **Which words a shared node may state** (`SHARED_NODE_INTERFACES`): every
  word except `clearance` and `planar`. A clearance is free space, so it is
  a gap edge. `planar` on a gap edge is two flat faces *across a
  clearance*; two faces that touch are the seat a node already is when it
  states nothing, so allowing it would give the seat a second spelling. A
  one-part node may state no word.
- **The layout's `symbols` key is refused, not ignored**
  (`load_topology_map`). A stale override is then a loud error instead of a
  silent drop.
- **One tuple, not two**, for the shape rule. The generated vocabulary
  refuses a list with a repeated word, so `("cylindrical", "cylindrical")`
  could not ship as a parallel `CLASSES` tuple.
- **The rotary symbol** is the pin-in-bore picture plus a turning arrow. On
  the map that is the boss-in-hole circle and dot with an arc over the top
  and an arrowhead. In Classic it is the ring with its axis line, plus the
  same arc. It reads as the rotary sibling of the slide's straight double
  arrow.

## When the first tolerance study asks for a joint's play

Nothing here is a value. A `revolute` or `fastener_pattern` on a shared node
is a word, so nothing folds it, and a shared node is a point in the graph,
not an edge. A chain therefore walks *through* it with zero length and no
band. When a study first asks for a bearing's radial clearance or a bolt's
float in its hole, the play has to become an element with a band and a
source, and a node has nowhere to hold one. Something would have to change:

- **(a)** the joint is re-authored as a gap edge between the two parts'
  own features (bore and journal, hole and shank), carrying a `dimension`
  that cites the fit, with ids added beside the shared node rather than in
  place of it so the bindings on it survive;
- **(b)** or a node grows a way to name a dimension of the fit (a
  `dimension_ref` on a node), which a traversal then reads, and which
  `fold()` would see as a term like any other.

Either way the radial play is a 2D quantity, a diametral clearance that
becomes a positional float, so a linear chain would also need the thermal
archetype's diametral handling or the DAG's weighting (`Term.coefficient`).
A fastener pattern's float is per-hole, combined across a pattern, which is
a positional-tolerance question that a single band does not answer. That is
not a design, just where the pressure will show: the node-as-point
assumption in `tolerance_stack.topology.traverse` and the one-fold rule.

## The click-around (shots in `shots/a_joint_says_what_kind_it_is/`, log in `walk_log.txt`)

At 2400 × 1500 on the real projection, built from this branch into a
scratch root (below), with model "Propeller Pitch System" (v2) and then the
legacy v1. No page error came up at any point.

- On the map, every connector has a symbol (`01`). The hub ↔ blade joint has
  the rotary symbol (`02`). The hub ↔ tangential-link-mount bundle still
  shows the seat, the ring of dots and the boss in a bore, side by side
  (`06`). The layout file has no `symbols` key.
- Hovering the bearing: the Preview's chips read `mating_surface · rotary ·
  2 edge(s)` and the hover title reads "blade 1 root bearing bore — a rotary
  joint" (`07`). A click selects it on the map and lights both features in
  the tree (`08`). The clocking's hover reads "… — a fastener pattern", and
  its Preview chip reads "fastener pattern". A wheel zoom on it works
  (`11`).
- The tree's interface rows read rotary, contact, spherical ×4, cylindrical
  slide and clearance (`09`, `10`).
- The "How to read the rails" dialog has the new sentence (`12`).
- In Classic, the bearing node wears the rotary glyph and the mount's
  clocking the pattern glyph (`13`–`17`). On v1 the same is true for the
  bearing and for `pitch_arm_blade_root_clocking` (`18`).
- `19_three_round_symbols_side_by_side.png` shows the boss in a bore, the
  rotary joint and the slide, drawn from `VA.MAP_SYMBOLS` at the map's own
  40-unit box and at 3×. Read with vision, the three are plainly different
  at both sizes: a closed circle and dot, the same with an arrowed arc over
  it, and a bar under a straight double arrow.

What the page did that the handoff did not ask about: **Classic's glyphs are
small.** They are drawn at the row pitch, and on the hub's block a chord
runs across the rotary glyph's arc (`14`), so the arrow is hard to read
there. That is Classic's existing size rule (Jeff's "hard to make out" was
about these). The map is the drawing that carries the large symbols, and
Classic is slated to retire, so I left it.

## Test record

Scratch root: `C:/workspace/tolstack/data/scratch/joint_kind_20261117`.
It holds copies of the main checkout's `data/inbox`,
`data/meshes` and `data/projections`, plus this worktree's `docs`. Every
projection (topology, viewer, part names, feature identity, fits, contact
suggestions, kinematic, and crops with drawing-checker's venv) was rebuilt
in it from this branch's committed tree with `--data-root`. The main
checkout's `data/` was not written. The integration export used as a
baseline is `C:/workspace/tolstack/data/scratch/jk_base`. Both are safe to
delete after the review.

| command (in this worktree) | result |
| --- | --- |
| `node apps/viewer/run_tests.cjs` | 597/597 (node-fs tier skipped: no projection in a worktree) |
| `node apps/viewer/run_tests.cjs --repo <scratch root>` | **720/720**, `[real]` armed. The first armed run was red on the stops study's live glyph census, which correctly gained the v1 clocking's `fastener_pattern`; the census was updated |
| `node apps/annotate/run_tests.cjs` and `--repo <scratch root>` | 324/324 and 324/324 |
| `node scripts/run_viewer_browser_tests.mjs --repo <scratch root> --only "the map (Map"` | **34/34**, the new rotary check included |
| `... --only "kinematic study page"` (its Classic glyph census moved) | run 1: 25/27, the two reload checks of `ISSUE_20261109_the_kinematic_page_view_settings_survive_a_reload_check_is_intermittent` (sighting appended there); run 2: **27/27**; the integration baseline against the same root: 27/27 |
| `node scripts/run_mutation_witness_tests.mjs --repo <scratch root> --only __1d6d60df --only __86fafce7 --only __4d6c2975 --only __2f5e192a --only __6d321b6d --only __c2adf3c9 --only __b20f0661` | **14/14 witnessed** in 12m15s: the four new specs, the re-anchored connector-symbol spec, and the two glyph-precedence specs whose anchors moved into `wear()` |
| `C:/workspace/tolstack/venv-win/Scripts/python.exe -X utf8 -m pytest -q -p no:cacheprovider` | `1 failed, 2032 passed, 1 skipped, 4 deselected in 424.10s`. The one failure is `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`, the documented worktree red (no `data/projections/` here); that tier ran 720/720 against the scratch root above. The skip is `test_fit_bound_features.py:433` (the pitch-link bearing re-extraction is not installed). Recorded with `suite-time record --tier default --seconds 425`: inside budget |

**Not run**, because they are the review's after the merge: the whole browser
tier and the `--changed-since` witness gate.

## Found on arrival

Nothing. This is a worktree session.

## Blocked actions

None. A stale `index.lock` in this worktree's git directory, left while the
witness runner built its shadow tree, stopped one commit; it was removed once
no git process was running, as in the previous handoff's lesson.
