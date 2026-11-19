# Tolerance topology — the model, the rule, and the formats

The repo's **third archetype**, added 2026-08-31 by handoff
`dag_topology_format`. The first two archetypes ask *"what does this joint stack
up to"* (`SOP_TOLERANCE_STACK.md`) and *"what does this fit do over
temperature"* (`ARCHETYPE_thermal_fit.md`). This one asks a different shape of
question: **"where in this mechanism does position error come from, and which
path did you mean?"**

Design reference: the locked brief
`dispatch/docs/strategy/HANDOFF_20260831_tolstack_dag_strategy.md`, which
carries Jeff's own statement of the model. Implementation:
`tolerance_stack/topology.py`. Tests: `tests/test_topology.py`.

> **If you are here to add a feature, read "Not a solver" first.** It is the
> locked decision this whole archetype is fenced by, and it rules out the most
> natural-looking next step.

---

## The model

- **A node is an interface** — a mating surface where two parts meet, or a
  located feature on one part.
- **An edge is a dimension.** Either a **structural dimension** (on one part,
  between two of that part's own interfaces) or a **gap** (between interfaces
  that share no part — a distance across a clearance).
- **An edge may carry a transform**: a constant sensitivity saying what one unit
  of that edge's value is worth in the quantity being measured. The default is
  the identity.
- **A study is a human-lassoed chain** through one topology: a set of edge ids
  plus the two locations the sum runs between. Summing a study means ordering
  that selection, applying the transforms, and folding.

One topology per system; many studies over it. A study is a separate document
that references node and edge ids — nothing is copied.

### What a hard contact is *not*

Two clamped members touching face to face are **one node**, not two nodes with a
zero-length gap edge between them. The interface *is* the shared surface, and it
carries both parts' ids. A `gap` edge is for a real distance across a clearance
— `shank_out` (how far a bolt's full shank protrudes past the clamped stack) and
`end_stop_clearance` (piston end to the stop feature) are the two committed
examples, and they are the two cases worth comparing: one is derived and one is
toleranced.

---

## Not a solver

Parallel load paths in a mechanism are **statically redundant**. Which path
carries the load — which one *binds* — is a mechanics question that depends on
stiffness, preload, fit and assembly sequence.

> **This tool does not answer it, and must not learn to.** A study is a
> *human*-lassoed subset. The code orders the selection, applies the declared
> transforms, sums, and reports. It never chooses a branch.

Concretely, in `tolerance_stack/topology.py`:

- a selection that reaches a node with two unconsumed selected edges raises
  `BranchAmbiguity`, naming the node and both candidates. It does not pick the
  shorter path, the first-listed one, or the stiffer one.
- a selection that is not a single chain between the study's endpoints raises
  `BrokenChain`. It does not path-find the gap closed.
- a selection that closes a ring raises `CycleDetected` before the walk starts.
- `Topology.branch_nodes()` *reports* where the choices are. That is navigation,
  not resolution.

The DAG is topology, bookkeeping and navigation. If a future layer wants to
*propose* which path binds, it sits above this module and writes a study
document a human then owns.

### The other half of the rule: it will not add unlike things

`summarize()` refuses to sum contributions whose transforms land in different
units (`UnitMismatch`). This is not pedantry about labels — it is the mechanised
form of a finding this repo already wrote down by hand. The end-stop workbook's
raw-millimetre total (`docs/tolerance_stacks/WORKSHEET_end_stop_graft.md`,
section 2f) sums vertical and tangential contributors in one column, and that
number is not physically meaningful. Converting every contributor into one
common output quantity before summing is the author's job; refusing to add
millimetres to degrees is the least the code can do about it.

---

## One `fold()`

A study's total goes through `tolerance_stack.stack.fold`, the same fold every
other archetype's totals go through — and, outside the exceptions ARCHITECTURE.md
declares in "Where computation may live", the only place element values are
combined (ARCHITECTURE.md, "Why one `fold()`"; this archetype adds no exception
of its own). The traversal produces exactly two things and both map onto
`Term`'s existing fields:

| the traversal produces | it becomes | why that is not a second combiner |
|---|---|---|
| direction | `Term.sign` | an edge crossed from its `from` to its `to` enters `+1`, against its orientation `-1` |
| transform | `Term.coefficient` | a positive per-term weight, exactly like the thermal archetype's `2`, `1 + ΔT·α` and `k` |

```claim
metric: one_fold_rule
exceptions: workbook_corner
```

**No sign is authored in any topology or study document.** They are read off the
graph. That is the one arithmetic thing this archetype makes *safer* than a
hand-written term list: a sign error now requires getting an edge's orientation
wrong, which a reader can check against the physical part, rather than getting a
`-1` wrong in a column of them.

`transform.ratio` must be `> 0`, for the same reason `Term.coefficient` must:
direction lives in the sign, and giving it a second home is how it gets to be
backwards in two places. An edge that "subtracts" is an edge oriented the other
way.

---

## The vocabularies

Each tuple in `tolerance_stack/topology.py` is **the definition**; the list below
is what an author reads, and `tests/test_topology.py` pairs them word for word,
in order. A word must reach both.

`kind` on a node is one of `mating_surface | datum_feature`.

- `mating_surface` — two parts meet here, and `parts` names both.
- `datum_feature` — a located feature on one part that nothing mates to: the end
  of a bolt's full cylindrical shank, a datum face, a gear pitch line. Without
  it a chain has nowhere to *end*, and "how far does the shank stick out" is
  inexpressible.

`kind` on an edge is one of `structural | gap`.

- `structural` — a dimension of one part. It names that `part`, and both its
  interfaces must list the part.
- `gap` — its two interfaces share no part. It names no part.

`kind` on a transform is one of `identity | ratio | linear_to_rotary`.

- `identity` — ratio `1.0`, units unchanged. The default.
- `ratio` — a constant scalar within one unit (a lever arm, a 2:1 wedge).
- `linear_to_rotary` — a constant sensitivity converting a length into an angle.
  Units must differ.

`kind` on a body is one of `body | link`.

- `body` — parts that move together: ground, the blade, the pitch plate. A part
  the mechanism does not place is a body of its own.
- `link` — a two-force member between two bodies, posed by its two joint
  centres: the pitch link, the tangential link.

`walk_order` on a topology is one of `nearest_fork | authored`.

Optional; absent reads as the first. It orders the DAG's walk ("Bodies on the
DAG"), never a fold.

- `nearest_fork` — a node's edges in document order, and the deferred edge
  whose fork is nearest walked next.
- `authored` — the document's `bodies[]` order, and each body's `parts` order
  inside it, is the order the page reads in.

`interface` on a gap edge is one of `planar | pin_in_bore | spherical | cylindrical_slide | thread | clearance | revolute | fastener_pattern | press_fit | transition_fit`.

Optional in v0 and refused on a structural edge. What each word draws is the
table in "Joint symbols" below; a joint that states none leaves its ends plain
dots and puts a "contact kind not stated" row on the gap list.

`interface` on a node two parts share is one of `pin_in_bore | spherical | cylindrical_slide | thread | revolute | fastener_pattern | press_fit | transition_fit`.

Since 2026-11-17 (handoff `a_joint_says_what_kind_it_is`). The two parts
touch at such a node, so the two words for free space between them are
refused: `clearance` is a gap edge, and `planar` — two flat faces across a
clearance — would be a second spelling of the seat a shared node already is
when it states nothing. A node of one part states no interface at all.
`tolerance_stack/model_view.py` gives the interface built from the node its
stated word as its kind, and `contact` when it states none.

`kind` on a form callout is one of `element | modifier`.

The rule is the SOP's ("A form callout", `docs/SOP_TOLERANCE_STACK.md`), stated
there once: an `element` is a structural edge of nominal 0 and plus or minus half
the callout's zone; a `modifier` sits on a size band it can only tighten.

Both node kinds and both edge kinds are **derivable** from the part membership,
and are therefore checked: a document whose label disagrees with its graph does
not load. The label is carried anyway rather than derived silently, because the
author writing down what they think an edge is turns a mis-assigned interface
into a message at load time instead of a wrong colour on a rail three handoffs
later.

`role` on a dimension is **optional**, and when present must be one of
`stack.py`'s `ELEMENT_ROLES` — the grip-stack vocabulary, shared and not forked.
A re-expressed stack element keeps its own word; a pitch link's length simply has
none, because which part a topology dimension belongs to is structural (read off
its edge's `part`) rather than a label.

## Bodies

Added 2026-10-26 (handoff `pitch_system_folds_into_the_pitch_linkage_model`).
A topology may say which of its parts move as one rigid body, which the
linkage solver's sweeps already name and the DAG had no way to know:

```json
"bodies": [
  { "id": "pitch_link", "name": "pitch link", "kind": "link",
    "parts": ["pitch_link", "spherical_bearing_pitch_link"] },
  { "id": "ring_gear", "name": "ring gear", "kind": "body",
    "parts": ["ring_gear"],
    "note": "One part on its own: the linkage mechanism does not place it, ..." }
]
```

- **All or nothing.** `bodies` is optional, and a document that declares one
  declares them all: every part in exactly one body, every body's parts
  declared, ids unique. `tolerance_stack/topology.py`'s `Body` and the
  `Topology` constructor refuse anything else, naming the part.
- **Honest grouping only.** A body groups parts the mechanism moves together.
  A part whose motion is not recorded is a body of its own, named after the
  part, rather than placed in a guessed one.
- **The five mechanism bodies are linkage's.** `topology_vpa_pitch_linkage.json`'s
  and `topology_vpa_end_stop_v2.json`'s
  `base`, `blade`, `pitch_plate`, `pitch_link` and `tan_link` carry the part
  lists `C:\workspace\linkage\linkage\vpa.py` names (`BODY_PARTS`,
  `LINK_PARTS`), paired by `tests/test_topology.py` when that repo is on disk.
  One difference is declared there rather than hidden: the tangential link's
  two bearings are in its body here, because they are pressed into the
  212956-005 assembly and move with it; linkage lists the assembly alone because
  its mesh already draws them.
- **Read by the projections, never by `fold()`.** The topology projection
  carries `bodies[]` per topology — `{id, name, kind, parts, note, tags, rides_with, joint_nodes}`, every key
  present — and the kinematic projection carries each contributor row's `body`:
  the body its edge's part moves with, `null` for a gap edge. The DAG draws
  each body as a container (next section).
- **A body may ride with another** (2026-11-05,
  `the_piston_heads_and_cover_ride_with_their_bodies_in_the_kinematic_model`).
  `"rides_with": "<body id>"` says a body moves with another that is posed and
  stays a body of its own: the container, the walk and the stack's rows are
  unchanged, and only the 3D model reads it, posing the rider's parts with the
  host's (`apps/annotate/app.js`, `anchorSweepBodies`). The host is a declared
  body that is not itself a rider and not a link. Prefer folding a part into
  the body it moves with; a rider is for the part whose fold would reshape the
  walk -- folding the piston heads and the cover into the pitch plate and the
  base widened the product model's walk by a column and raised every kind of
  crossing, so they ride instead. That was measured on v1's 40-part graph and
  does not bind model v2's 15 parts, which fold all three into their bodies
  and declare no rider; v1 keeps them. It is still a claim about motion, not a pose:
  the 3D model puts a rider at the one recorded occurrence it has, or the one
  recorded beside its host's own parts, and refuses a part it cannot place.
- **A folded part rides its own body** (2026-11-09,
  `a_folded_part_rides_its_own_body_in_the_sweep_and_the_bodies_list`). A part
  a body lists and the run's part list for that body does not (v2's piston
  heads in `pitch_plate`, its cover in `base`; v1's plate and base hardware)
  is posed exactly as a rider is, on the same occurrence rule; a link is
  never a host (`AA.sweepRidingParts`). The 3D pane's Bodies list in sweep
  mode lists each body's declared parts in `bodies[]` order, links among them,
  as the DAG does (`AA.sweepModelTree`).
- **A part may contain parts** (2026-11-14, `a_part_may_contain_parts`). A
  part may name a `"parent": "<part id>"`; a part with children is an
  assembly. The parent is declared, in the same body, and no part is its own
  ancestor (`Topology` refuses each, naming the part); depth is not limited.
  A body still lists every part it carries, children included. The model view
  gives each part `parent`, `children` and `depth`, a body's `parts` its
  top-level parts and `all_parts` every part in the one tree order — an
  assembly, then each child's subtree in authored order
  (`Topology.tree_order`). Selecting an assembly lights it and every part
  inside it as its own. The grid folds an assembly to one row whose numbers
  are the study's own fold of the assembly's and its parts' terms
  (`topology.assembly_rollups`, carried as a study's `result.assemblies`), so
  the total is the same folded or open; the DAG draws a part inside an
  assembly as the assembly's. Model v2's pitch link and 212956-005 assemblies
  hold their bearings, and 215177 (2026-11-18) its plate and the two flanged
  bushings the model reaches; 215175 stays a single part; v1 declares no
  parent.
- **Not a solver input.** Nothing here poses a body, and declaring two parts one
  body asserts only that they move together.

### Bodies in the walk and on the map

Since 2026-10-26 (handoff `the_dag_draws_bodies_as_containers_and_joints_as_symbols`).

- **Which body an element is in.** A structural edge is in its part's body. A
  node is in its parts' bodies — one, or two for a **joint node**, a mating
  surface between two bodies. A gap edge is in a body when both its ends are on
  that body alone (a bearing's ball centre and the link it is pressed into);
  otherwise it is a **joint** and in none. `Topology.edge_body`,
  `Topology.node_bodies`, `Topology.joint_nodes`.
- **The walk is body-major.** The layout walks one body to the end before it
  crosses a joint, so every body's rows are one block. A joint, or another
  body's edge at a joint node, is deferred and walked from its node once the
  body is done (`scripts/build_topology_projection.py`, `serialize_topology`).
  Each row carries `body`; `layout.bodies` lists each body's block as
  `{body, start, end, lo, hi}`. The walk is no longer drawn (the rails retired
  with Classic, 2026-11-17, below); it is the grid's row order.
- **A model may read in its authored order** (2026-11-08,
  `the_end_stop_model_names_its_datums_right_and_folds_its_riders`).
  `"walk_order": "authored"` starts the walk on the first body's first part,
  takes a node's edges by the `parts` order of the part each leads into, and
  after a body is done crosses into the earliest authored body not yet drawn
  -- so the author re-orders the grid by re-ordering `bodies[]` and `parts`.
  It only breaks ties the walk leaves open, and it is not the default.
- **On the map a body is a district** in its own ink, assigned one per body
  (`VA.bodyTint`; `docs/DESIGN_TYPE_AND_COLOUR.md` says where the inks live),
  and in the grid a bracket over its rows ("The map", below).
- **A sub-stack is a header row in the grid.** On a kinematic page, the chain
  a `study_ref` names is a header row over its terms, folded to one row with
  the study's title and its folded interval (shown, never reused — the chain
  rule enters the sub-study's terms one by one), opened and closed from that
  row (the_kinematic_grid_is_a_stack_of_sub_stacks).

### One part, one run in the grid

Since 2026-11-06 (handoff `a_part_with_many_interfaces_is_drawn_as_a_component_with_pins`),
when the rails drew such a part as a block with pins; since 2026-11-17 the
grid's order alone. The page gathers each part's rows to where the walk first
reaches the part and re-lays the walk (`VA.gatherParts`): a node on one part
is that part's pin, a contact face on two parts the pin of the one with more
faces (`VA.partPins`), and a part's edges between two of its own pins (its
chords) and its other edges -- a dimension on its drawing that ends on another
part's pin, like the hub's two to the tangential-link mount on v2 -- follow
its pins. So a part the depth-first walk visited three times is one run of
grid rows under one bracket. An edge moves only to where one of its nodes is
above it, so a part with an edge that cannot move up yet is held back, whole,
until all of them can. A study's lit rows are then made one band, with the
rest of the walk above and below it (`VA.bandLayout`); a kinematic page's band
keeps its stack order. The re-laid walk's columns are still searched for the
fewest crossings (`VA.layoutCrossings`), which breaks ties in the row order
the grid shows; nothing draws the columns.

### Joint symbols — what a joint is drawn as

Since 2026-11-04 (handoff `the_joint_is_the_node_and_an_edge_says_only_lit_or_unlit`,
Jeff's mock-up C) a joint is drawn as the contact it is; since 2026-11-17 that
drawing is the map's (the rails' glyphs, `apps/viewer/interface_glyphs.js`,
retired with them). Each `interface` word is one symbol on the map, drawn on
the connector between the joint's two pins (`VA.MAP_SYMBOLS`, "The map" below
has its table); a node two parts share that states its own word (since
2026-11-17) is drawn as that word, and one that states none is the seat. The
words are printed in everyday words wherever the page names one
(`VA.INTERFACE_KIND_WORDS` in `apps/viewer/topology.js`, enumerated against
`INTERFACE_KINDS` by `tests/test_topology_projection.py`).

| `interface` | one element that states it |
| --- | --- |
| `planar` | none on a committed topology yet: a face-to-face seat is one node, not a gap edge (see "What a hard contact is *not*") |
| `pin_in_bore` | `gas_spring_rod_to_pitch_plate` |
| `spherical` | `pitch_arm_link_joint` |
| `cylindrical_slide` | `hub_to_pitch_plate_spindle_coaxiality` |
| `thread` | none on a committed topology yet |
| `clearance` | `end_stop_clearance` |
| `revolute` (a reader's "rotary") | the node `hub_blade1_root_bearing_bore` |
| `fastener_pattern` | the nodes `pitch_arm_blade_root_clocking` (v1) and `tan_link_mount_fastener_clocking` (v2) |
| `press_fit` | `pitch_link_flanged_bushing_press_fit` (v2): a bushing held in its bore by interference |
| `transition_fit` | `pitch_link_straight_bushing_transition_fit` (v2): a bushing whose fit may close either way, so it is held by the fastener |

linkage's joint types suggest the word: `tolerance_stack/kinematic.py`'s
`LINKAGE_JOINT_INTERFACES` maps each one, and an authored edge at a swept joint
that disagrees with it fails `tests/test_topology.py`.

### The same graph in 3D: a joint is one node

Since 2026-11-03 (handoff `coaxial_ends_share_one_3d_node`, Jeff's ruling).
The scene draws this graph on its parts (`docs/ANNOTATION_SURFACE.md`, "The
model in the scene"), and there **a joint is one 3D node**: when the two ends
of an edge are concentric features — a spindle and the plate that slides on
it, a bore and the bushing in it, a ball and its seat — the scene draws one
dot for all of them, and the edges between them (a bushing's thickness, a
clearance to a fastener, a coaxiality) are **2D-only**: they have no length
to show, and the map and the grid keep them apart exactly as before. Edges
leaving the joint attach to its one dot, and every member's 2D node leads to
it. **A node with nothing to place it on is absent from the scene, never drawn
at the origin**; the scene's head line counts them. Which features count as
concentric, and the two thresholds that decide it, are
`apps/annotate/model_layer.js`'s (`AA.modelJointGroups`).

## Which face an end is

A node may declare `face`: `{"part": <one of its parts>, "surface": <a
fitted surface class>}` (`NODE_FACE_FIELDS`; the classes are
`feature_geometry.FITTED_SURFACE_CLASSES`). Added 2026-11-03 (handoff
`the_slide_joint_is_the_mounts_bushings_against_the_piston_body`). Without
it, an end is bound on the part its node names first, and its class is
guessed from the words in its name. Jeff's pick on the pitch plate's
"spindle bore" lit a plate with no bore on it: the feature is a broken
pilot *boss*.

- **Where it is declared, it answers first.** `scripts/build_contact_suggestions.py`
  takes the part and the class from it. `scripts/propose_bindings.py`
  refuses a face on any other part, or of any other class.
  `feature_geometry.end_surface_class(..., declared)` reports `where:
  "declared"`.
- **The part is one of the node's own.** A rigid body's other members are
  not candidates. A face that belongs to hardware the node's part only holds
  (a bushing in a groove) is bound on the holding part. The hardware is
  named in `hardware_ref`, an id in `docs/tolerance_stacks/hardware_entries.json`
  (the SOP's Step 4 convention). `tests/test_topology.py` resolves it.
- **Declared on the ends that needed it**: the slide's two ends, the plate's
  boss axis and the plate's pilot. Every other node still answers by its
  words.
- Both fields reach the topology projection's node rows. The annotator does
  not read them yet.

## Tags

A body and a study may carry `tags`: `{axis: value}`, one value per axis, on the
identity axes forge declares in its `identity.toml`. The point is one vocabulary
for grouping and filtering across the workspace -- the nav's chips here read as
drawing-checker's container tree does (OR within an axis, AND across).

* **The axes come from forge, and are read, never copied.** A tag on an axis
  that file does not declare is a load error naming the axis and the file. With
  the file not on disk nothing is checked, and the projection build says so
  once. Axis values are free strings, as forge has them.
* **The variant rule.** Selecting a value on the variant axis dims every body
  tagged with a *different* value of it -- the rows of their parts,
  stated on the surface as "other variant" -- and hides the studies tagged the
  other way. A body or study with no variant tag is shared and stays lit.
  This is the lit-set rule's second dimming reason; "off the study's path" is
  the first.
* **There is no schema slot for a variant.** A variant is still a tag and a
  note, not a structure: the gas-spring and brake branches are parallel
  branches of the one topology, and nothing swaps one for the other.
* **The variant axis is provisional.** forge declares `component`, `purpose`
  and `phase` and no variant axis; `VARIANT_AXIS` in `tolerance_stack/topology.py`
  is accepted beside them until forge answers
  `docs/issues/ISSUE_20261026_forge_has_no_variant_axis.md`.

### A `part`'s `drawing` names the design part, not the test article

**Ruled 2026-10-01 (Jeff), and it applies to every topology.** When a build
carries an instrumented variant of a part — a link with a proving ring in it, a
blade with strain gauges on it — the topology part names the **design,
non-instrumented** drawing, and `docs/topologies/part_mesh_aliases.json` points
its row at the design part's mesh. A topology describes the mechanism; an
instrumented article is one build of it, and the document would go stale the
day the instrumentation came off.

Two consequences the reader of a topology needs. The **geometry** behind a node
may still have been fitted on the instrumented article, because that is the
occurrence the mechanism's joint centres sit inside — the `part`'s `note` says
so where it is true. And a **design mesh drawn at the instrumented occurrence**
takes its placement from the instrumented mesh's provenance, since the design
mesh's own instances are the other occurrences; that substitution is only sound
when the two share a local frame, which is a measurement the alias row records
rather than an assumption anyone makes. `pitch_link` and `blade_root` in
`topology_vpa_pitch_linkage.json` are the worked instance of all three.

---

## The formats

Two schemas, both `/v0`, both filesystem JSON — no SQLite, by locked decision.

| schema | you write it? | what it is |
|---|---|---|
| `joby.tolerance_stack/topology/v0` | **yes** — one per model | `parts`, `nodes`, `edges`, named `transforms`, plus an optional `description`, `bodies`, `joint`, `ids_from`, `provenance` and `notes` |
| `joby.tolerance_stack/study/v0` | **yes** — one per question | a `selection` of edge ids, two endpoints, an optional per-study `transforms` map, an optional `closes`, an optional `checks` list (or a `no_checks_reason` saying why there is none), an optional `configuration` block, an optional `description` |

### Models — one topology per model (2026-11-08)

**One topology per model; the model is the top node of the nav.** Since
2026-11-08 (handoff `model_v2_is_the_end_stop_linkage_in_five_bodies_and_the_nav_switches_models`,
Jeff: *"trying to mash all of these studies … into one is just creating way
too much unnecessary complexity"*) a product may have more than one model, and
every study is a subset of exactly one of them. The viewer's nav lists the
models under one heading; the open one lists its studies and its kinematic
studies beneath it, so choosing a model switches everything below, and the
page reopens on the model the reader last chose.

- **v1**, `topology_vpa_pitch_linkage.json` — the whole pitch system: every
  joint, the fastener grip stacks and their hardware, the gas spring, the VPA,
  and the studies and the kinematic study over them.
- **v2**, `topology_vpa_end_stop_v2.json` — only the kinematic end stop: five
  bodies and no riders (the piston heads are the pitch plate's parts, the
  cover the base's), as one blade, one pitch link and one tangential link,
  the two stops, and no tolerances yet. It declares `"walk_order": "authored"`,
  so its DAG and grid read in its `bodies[]` and `parts` order. It leaves out the gas spring, the VPA
  and its piston, the ring gear, the hydraulic brake, every fastener and
  washer, every bushing but the four at the pitch link's and the tangential
  link's plate attachments, and blades 2 to 5.

**`ids_from` — a model that reuses another's ids.** v2 declares
`"ids_from": "vpa_pitch_linkage"`: every node and edge id it shares with v1
names the same feature there, so **a shared id has one `feature-identity/v0`
key, v1's.** Every event about it — an agent's proposal, a bind, a re-pick, an
accept, a reject, a correction — is written under v1's key whichever model is
open (`tolerance_stack.topology.identity_topology_id`; the annotator's
`AA.identityKey` and `scripts/propose_bindings.py` both apply it). The fold
refuses a `supersedes` that points across keys, so a v2-keyed re-pick of a
v1 binding would leave the log unrebuildable; the one key is what rules that
out (review of 2026-11-08). An edge id only v2 has keeps v2's key. On the
read side the 3D surface shows v1's record on a shared id as v2's, both ends
of it (`AA.identityReadThrough`), and a linkage sweep published against v1
plays on v2 when v2 is open (`AA.sweepPlaysOn`), so the P2 run binds without a
republish. The builder lists a model ahead of the model it reuses ids from
(`in_model_order`), which is why v2 is the nav's default.
`tests/test_topology.py` holds every shared id to the same kind, ends and
parts in both documents, and `tests/test_feature_identity.py` folds the events
every annotator answer path writes on a shared id through the Python rules.

### The model view — the entities, derived once (2026-11-10)

**A model is the set of entities in the workspace; a study scopes a subset of
it** (Jeff, 2026-11-09). Until 2026-11-10 the page had no object that *was*
the model: the viewer answered "which part is in which body, which rows are
one part, which part owns a face two parts share" with nine rules of its own,
each reading `nodes[].parts`, `edges[].part` and `bodies[].parts` again, and
the 3D pane with four more (the strategy session's read,
`dispatch/docs/strategy/drafts/DRAFT_tolerance_analysis_over_the_kinematic_model.md`,
"2026-11-09 — the fresh read"). Handoff
`the_model_is_derived_once_and_the_left_column_is_its_tree` derives the answer
once, in Python (`tolerance_stack/model_view.py`), from `Topology`'s own
`body_of` / `node_bodies` / `edge_body`, and the topology projection carries
it per topology as `model`, beside `bodies`. The browser builds one model
object from it (`apps/viewer/model.js`) and the left column is its first
reader; nothing written since reads the raw arrays to decide membership again.

The entities:

- **bodies** — the authored rigid bodies, in authored order, each listing its
  parts in authored order.
- **parts** — every part, with the body it moves with, its label (below), its
  features, its dimensions, and the mesh and occurrence facts the projection
  already resolves.
- **features** — a node *as seen on one part*: a node on two parts is two
  features, one per part, so a face two parts share is a pin on each. Its id
  is `<part>@<node>` — a view id, not a feature-identity key; bindings stay
  keyed by edge end.
- **dimensions** — the structural edges, each on one part between two of its
  features.
- **interfaces** — both authored shapes for "two parts meet" in one list: a
  node on two parts (`source: "node"`, kind = its `interface` word, or
  `contact` when it states none) and a gap edge
  (`source: "edge"`, kind = its `interface` word), each with its two ends as
  features, its two parts, the bodies they move with and `within` — the one
  body it sits inside, or `null` for a joint between two bodies.
- **joints** — interfaces between the same two parts, grouped: one joint with
  several constraints. The tangential link mount on the hub is a seat, a pilot
  and a clocking (Jeff, 2026-11-10: most joints in this mechanism are that
  compound style, and the map he wants draws them as parallel paths).

A gap edge's end is a feature on its node's first-listed part; neither
committed model has a gap edge ending on a node two parts share, so the view
states no rule for that case. `tests/test_model_view.py` pins v2's counts
value by value and re-derives every `body`, `bodies` and `within` the view
emits from `Topology`, so a second membership rule cannot creep in there.

**A part's label is one rule, on every surface** (`model_view.part_label`,
written on every projected part as `label`): its drawing number, then its
everyday name — `214698-002 upper piston head` — or the everyday name alone
for a part with no drawing. The everyday name is `display_name` where the
title block gave one, else `name`, with any number at its head or tail
stripped so the number is said once (Jeff, 2026-10-20: a label carries the
everyday name beside its number, because numbers get renumbered and nobody
memorises them).

### The map — the DAG region's drawing (2026-11-16; the only one since 2026-11-17)

Since handoff `the_map_draws_the_end_stop_model` (Jeff, 2026-11-10: *"Yes I
like your tube map"*, with his own sketch) the DAG's region draws the model as
a map, and since 2026-11-17 (handoff
`the_map_is_the_only_drawing_and_classic_retires`; Jeff: *"I really like the
new subway map style dag/graph, let's go ahead and make it permanent"*) it is
the region's only drawing, for every model: the rails drawing beside it
("Classic"), the switch between the two, the respine animation, the leaders
across the seam to the 3D pane and the view controls only the rails used are
gone. **The map is a drawing of the model and never a second model**: it
reads the model view above (`model`) and the model's layout -- an authored
file, `docs/topologies/map_<model id>.json`, or the places the builder
computes where there is none -- and nothing from the walk's
`layout {columns, rows, rails}`, which is the grid's row order and nothing
drawn.

**What is placed** is one thing: a part's place on a coarse grid —
`places: {<part>: [column, row]}`, one entry per top-level part. A child part
(a bearing in its link) has no entry and sits in its parent's cell. **A model
with no layout file has its places computed** (`computed_map_places`): each
body a column, in the order the model declares its bodies, its top-level
parts stacked down the column in tree order; a top-level part in no body
takes one more column, and a model that declares no bodies is that one
column. The projection marks such a layout `computed: true`. **An authored
file overrides the computed places and nothing else changes**: what a joint
is drawn as is never authored here: it is the interface's kind, from the
model (since 2026-11-17 a shared node states its own, so the `symbols`
override that named the clocking a pattern until then is gone, and the
builder refuses a file that still carries one). The builder ships an authored
file verbatim as the topology's `map` and refuses one that leaves a top-level
part unplaced or places a part the model has not
(`build_topology_projection.load_topology_map`): the map's whole claim is
that nothing in the model is left undrawn. v1 has no file: its parts sit one column
per body, and its routes are not yet arranged by hand (a route drawn through a box it does not end on is a defect note of the
layout's, `notes`). The file is not named `topology_<id>.map.json` because
every reader of the directory globs `topology_*.json` for the models.

**There is one arrangement per model, and v2's is tall** (Jeff, 2026-11-17: *"flip the
map/dag to be portrait instead of landscape so it fits in the side-by-side
view mode more nicely"*; handoff `the_map_is_portrait_as_jeff_drew_it`). v2's
places follow his sketch of 2026-11-10: three columns by seven rows (five since 2026-11-18, below), the base
body a column on the left read upward as the hardware stacks (hub, tangential
link mount, gas-spring mount, piston cover), the pitch plate body a column on
the right in the same sense (pitch plate, piston body, lower head, upper
head), so the end-stop route runs across the top and the feather stop and the
slide cross the middle; the tangential link between its mount and the pitch
plate; the pitch link, the pitch arm and the blade down the right below the
plate, the hub ↔ blade joint along the bottom. Side by side at 3840 × 2160 it
fits the region's height. Since 2026-11-18 the pitch plate assembly's members
run in a row to the plate's right (two more columns, rows 1 to 3, inside the
pitch plate's district): the tangential link's flanged bushing, then the
machined plate, with the pitch link's flanged bushing under the plate and the
two straight bushings above the row; the sketch's places are unchanged. Nothing in the layout code assumes either shape: a
pin's side is decided in cell units, a part's name takes whichever corner of
its box its jumpers leave clear, and a child's row moves aside for a route
out of its parent's bottom (below).

**What is computed** (`apps/viewer/map.js`, pure; drawn by
`apps/viewer/views/map.js`):

- **A box per part**, centred in its cell, sized by its pins: as wide as the
  pins on its top or bottom need, as tall as those on its left or right, never
  under a minimum; its number and everyday name inside, the name wrapped and
  cut with the whole label as its tooltip. **The name keeps clear of the
  part's jumpers, pins and marks**: it takes the first corner of the box
  (top-left, top-right, bottom-left, bottom-right, then mid-height), at the
  box's width or wrapped to half of it, that none of them reaches, and where
  no corner has room the box is drawn taller until one does
  (`placeName`; the walk of 2026-11-16 found a jumper struck through three
  parts' numbers). A child's small boxes sit in a row under the parent --
  centred, or beside the routes that leave the parent's bottom, so no route
  runs through a child it does not end on.
- **A pin per feature that ends an interface**, on the side of the box that
  faces the counterpart's cell; the pins of one side centred and evenly
  spaced, ordered by the counterpart's position and then by the constraint's
  place in its joint, so a joint's constraints leave **parallel pins in the
  same order at both ends** — that is the bundle. A feature that ends no
  interface (a dimension's end on the part alone) is an inner mark. A pin's
  short label shows on hover and when lit.
- **A jumper per dimension**, inside the box between the two ends it
  measures; two ends on one side bow into the box.
- **A connector per interface**, routed from pin to pin: out of each pin
  square to its side, then a 45° leg for the shorter axis and a straight leg
  for the rest, with the **joint's symbol drawn large** where the route passes
  nearest the midpoint between its pins — the gap between two districts, never
  a border. Heavier between two bodies than inside one. **Two parts of one
  column with another part between them** (2026-11-17: the upper piston head
  on the piston body, the lower head between) have no straight route that
  misses it, so a feature whose every interface is such a pair takes the
  column's outer flank, and its route runs out to a lane beside the boxes
  between and back. A joint's earlier constraints take the outer lanes, so its
  bundle nests (`detour`). **Two parts of one row with another part between
  them** are the same case on its side (2026-11-18: the pitch plate
  assembly's bushings in a row beside it): the row's outer flank, the bottom
  from the middle row down and the top above it, and a lane under or over the
  boxes between (`rowDetour`).
- **A district per body**: the body's parts' boxes, padded, held inside the
  union of its cells inset — so two adjacent bodies' districts never touch and
  a body with one small part has a small district; named at its corner. **An
  assembly's outline** round its own box and its children's small boxes
  (three nested outlines: body, assembly, part).
- **The view**: fitted to the region on the first paint, never past a cap,
  then the reader's wheel zooms about the pointer, a drag pans, Fit and the
  `0` key re-fit; a selection made elsewhere is panned into view when it is
  off the region, and only then -- a box wholly on screen at the fit's edge
  does not move the map it was clicked on (2026-11-19). The view outlives a
  repaint, not the page.
- **The pointer**: a whole box is its part's control -- border, interior and
  name -- and a district's field selects its body on a click but lights
  nothing as the pointer crosses it. A press on a box's interior, a
  district's field or the empty drawing that moves past a few pixels is a
  pan and its click is swallowed; one that does not move is a click.

**The symbol table** (`VA.MAP_SYMBOLS`; the `INTERFACE_KINDS` through the
generated vocabulary, plus the view's `contact`; `VA.mapSymbolOf` reads an
interface's kind and nothing else):

| word | drawn as |
| --- | --- |
| `contact` (a node two parts share) and `planar` | the capacitor mark — two plates across the route, the route broken between them |
| `pin_in_bore` | a closed circle and a dot: a boss in a hole |
| `spherical` | a cup and a ball, the cup open toward the far end |
| `revolute` (a rotary joint) | the boss-in-hole circle and dot with a turning arrow round it, the rotary sibling of the slide's straight double arrow |
| `fastener_pattern` | a ring of dots |
| `press_fit` | the boss-in-hole circle with the boss filling it |
| `transition_fit` | the boss-in-hole circle and dot with a faint ring between them |
| `cylindrical_slide` | a hollow bar with the double arrow along the slide |
| `clearance` | two stops with the travel arrow between them |
| `thread` | a hollow block crossed by the flanks |

A gap edge that states no interface word is drawn as a bare connector; the
gap list names it, as before.

**Every entity once, keyed by the model's ids.** Each drawn thing carries its
entity's kind and id (`data-map-kind`, `data-map-id`), and districts, boxes,
pins, jumpers and connectors are counted against `model.counts` -- the fast
tier on the fixture, the browser tier on the real model. Hover and select go through the page's
one store and the one resolver (`VA.focusLightOf`, read by `VA.mapLightKeys`),
by entity rather than by element key — a node two parts share is two pins,
one per feature — in the two strengths every surface wears, and nothing goes
opaque. Every curve takes `fill: none` in the markup and in the stylesheet.

**Not drawn yet**, each a later handoff: a fold control on an assembly's
outline (`ISSUE_20261114_assembly_folding_left_out_of_three_surfaces`); a
study lit as a route (`ISSUE_20261116_what_the_map_does_not_draw_yet`); a
hand arrangement of v1's routes; and the compound joints the model does not
author yet (the map draws each as it is authored).

### Naming a feature (2026-11-10)

Model v2's names were rewritten under one rule when the left column became
the model's tree (nested: body › part › feature), and a new model follows it:

- **A feature's name says the feature**, in GD&T's words — a bore, a face, a
  boss, a shoulder, a bearing centre — and never "axis" (Jeff: *"we aren't
  really selecting an axis, we're selecting a feature"*). It is nested under
  its part, so it carries no part name: `pilot bore`, `attachment bore`,
  `step face`.
- **A feature two parts share names the part that seats on it**
  (`tangential link mount base face`, `piston cover flange`,
  `pitch arm clamp face`): under the other part that is what tells two seats
  apart, and under its own part the redundancy is the price of one name per
  node.
- **A dimension is `<from> to <to>`** in exactly those feature words, so a
  dimension's name and the two features it joins agree by construction; a
  gap edge's name says the joint the same way (`locating boss in pilot bore`,
  `bushing bores on outer cylinder`).
- **One spelling of each term**: `locating boss`, `end stop`,
  `tangential link`, `pitch link`; `gas-spring` keeps its hyphen because the
  parts' drawing titles do.
- **Ids are frozen.** A rename moves no id; what the old name said beyond the
  feature is kept in the node's `note`.

The face-suggestion words (`tolerance_stack/feature_geometry.py`,
`SUGGESTION_RULE_WORDS`) still classify a node by its name where no `face`
block is declared, so a renamed feature keeps a classifying word (`bore`,
`face`, `shoulder`, `centre`, `diameter`) or declares its face.

### Naming a topology or a study

**One rule, and it lives in the SOP:** `docs/SOP_TOLERANCE_STACK.md`, "Titling
an artifact". A title is a short noun phrase naming the thing; what it sheds is
demoted to the optional one-line `description` beside it, which the viewer's
nav shows on hover. It applies to a topology and a study exactly as it does to
a stack — the rail lists all three side by side — so it is written once, there,
and this section does not restate it.

The two traps this archetype in particular walked into (2026-09-14, handoff
`stack_title_style_pass`, which retitled all five topologies and all twenty
studies): **"… as a topology"** in a topology's own name, which distinguishes
nothing now that every joint here is one; and a study's **output unit in
parentheses**, which the result already carries. The `id` is unaffected by any
retitle — a study id is a deep link (`?study=`), not a name.

### Versioning: additive fields stay `/v0` (2026-09-08, handoff `topology_schema_v1`)

Every field this handoff added — `Topology.joint`, `Study.configuration`,
`checks[].limit` becoming optional — is optional, defaults to an empty value,
and is read by nothing `fold()`/`traverse()`/`summarize()` touches. A topology
or study authored before any of them exist still loads and folds identically:
there is nothing for it to be missing. That is the same shape
`hardware_entry/v0` already used for `values_source` ("`hardware_entry` stays
`/v0` because the field is additive and no reader breaks on it",
`docs/SOP_TOLERANCE_STACK.md` Step 4) — additive-and-optional does not need a
version bump, only a mandatory field with no safe default would. Both existing
topologies and all eight studies load and fold to the identical numbers before
and after this handoff; `tests/test_topology.py` pins every one of them, so
this is a checked claim, not a promise.

`Topology.description` and `Study.description` (2026-09-14, handoff
`stack_title_style_pass`) are the same shape and stayed `/v0` for the same
reason: optional, defaulting to `null`, read by nothing `fold()`/`traverse()`/
`summarize()` touches.

### A topology, in outline

```json
{
  "schema": "joby.tolerance_stack/topology/v0",
  "id": "vpa_pitch_linkage",
  "title": "...",
  "description": "...",
  "units": "mm",
  "transforms": [
    { "id": "pitch_arm_linear_to_rotary", "kind": "linear_to_rotary",
      "ratio": 1.67, "units_in": "mm", "units_out": "deg",
      "properties": { "pitch_arm_radius_mm": 50, "blade_root_radius_mm": 32 },
      "source_ref": { "kind": "workbook", "cell": "D10",
                      "confidence": "untraced", "note": "PLACEHOLDER ..." } }
  ],
  "joint": {
    "assembly_drawing": "217755", "assembly_revision": "A.1",
    "sheet": 5, "view": "DETAIL X", "zone": "C10",
    "description": "...", "scope": "grip length only"
  },
  "bodies": [ { "id": "blade", "name": "...", "kind": "body",
                "parts": ["blade_root", "pitch_arm"] } ],
  "parts": [ { "id": "pitch_arm", "name": "pitch arm", "drawing": "215071-001" } ],
  "nodes": [
    { "id": "pitch_arm_blade_root_clocking", "name": "...",
      "parts": ["pitch_arm", "blade_root"], "kind": "mating_surface" }
  ],
  "edges": [
    { "id": "pitch_arm_link_hole_to_clocking_hole", "name": "...",
      "kind": "structural", "part": "pitch_arm",
      "from": "pitch_arm_link_bore", "to": "pitch_arm_blade_root_clocking",
      "transform": "blade_root_tangential_to_rotary",
      "properties": {},
      "dimension": {
        "id": "...", "name": "...",
        "nominal": 0.0, "min": -0.015, "max": 0.015,
        "source_ref": { "kind": "workbook", "confidence": "untraced" } } }
  ]
}
```

`units` is the unit **every** stored dimension is in; a topology does not mix
them.

A `part` may carry `"occurrence": "<instance path>"` — one of the assembly
occurrences its mesh sidecar records, the `instance_path` joined with `/`
(2026-11-08). The 3D surface then draws that part there and nowhere else, in
sweep mode and out of it; a part without one is drawn at every occurrence
(`docs/ANNOTATION_SURFACE.md`, "Where a part is drawn"). Additive, so `/v0`.
`fold()` never reads it. What a *study's* output unit is depends on the transforms it crosses.

`joint` is optional and free-form: the same assembly/context block a stack's
own `joint` carries (`assembly_drawing`, `assembly_revision`, `sheet`, `view`,
`zone`, `zone_note`, `description`, `scope`), added 2026-09-08 (handoff
`topology_schema_v1`) for a topology that re-expresses, or documents, one
physical joint. Before 2026-10-27 `topology_vpa_output_to_pitch_plate.json` carried one that
mirrored its stack's field for field, since both documents described the same
joint; `topology_vpa_pitch_linkage.json` carries none, because it is not one
joint — it is a whole product (the four stacks' blocks are in its
`provenance.grip_stack_joints`). Prose, not a toleranced value: nothing here is
`fold()`'s to read, and there is no `dimension_ref`-style resolution for it —
if the topology's and the stack's ever disagree, the stack's wins, the same
rule `provenance.structure`'s reading of element order already follows.

### Where an edge's value comes from

Three cases, and the difference matters:

1. **`dimension`, inline** — topology-first authoring, for a system with no
   stack behind it. This is what `topology_vpa_pitch_linkage.json` does.
2. **`dimension_ref`** — `{"stack": "<repo-relative path>", "element": "<id>"}`,
   resolved out of the stack file at load time, citation and `role` included.
   This is what the four fastener grip stacks do inside `topology_vpa_pitch_linkage.json`
   (and what `topology_vpa_output_to_pitch_plate.json` did before they folded in),
   and it is what makes the L1 proof mean something: those edges contain **no numbers at
   all**, so it cannot drift away from the stack it re-expresses.
3. **neither** — a **derived gap**: the quantity a study computes. It is a real
   edge (two real interfaces) and it is refused inside a study's `selection`,
   because a study cannot sum the answer it is being asked for. Name it in
   `closes` instead.

### A study, in outline

```json
{
  "schema": "joby.tolerance_stack/study/v0",
  "id": "vpa_output_shank_out",
  "topology": "vpa_pitch_linkage",
  "from": "bushing_far_face",
  "to": "shank_full_dia_end_vpa_out",
  "closes": "shank_out_vpa_out",
  "selection": ["straight_bushing_vpa_out", "...", "fastener_grip_vpa_out"],
  "transforms": { "<edge id>": "<transform id>" },
  "configuration": { "load_case": "..." }
}
```

- **`selection` is a lasso, not a path.** Its order is not trusted for anything.
  If it were, the branch check would be dead code — a fork would get resolved by
  accident of the order someone happened to tick rows off in. A test shuffles it.
- **`transforms` is an override map**, layered over each edge's own default. It
  exists because the same topology gets summed under different sensitivities:
  the end-stop workbook runs *two* parallel result columns over one set of rows
  (worst-case and full-sweep-average motion ratio), and that is one topology
  with two transform sets, not two topologies.
- **`closes` names the derived gap this study computes.** It is the bridge to the
  stack vocabulary: a stack's *check* ("fastener grip minus the clamped stack")
  is topologically the closure of a loop, and the residual is a gap edge.
- **`checks`, added 2026-09-06 by handoff `endstop_location_stack`, is the same
  bridge for a target that is not another edge of the study's own graph** — a
  requirement pulled from Polarion, most concretely. Each entry is the same raw
  spec shape a stack's `checks` list already uses (`check_id`, `label`,
  `configuration`, `criterion`, `workbook_cells`, `guidance`, `complete`,
  `excluded_terms`), plus an *optional* `limit` — `{"value": ..., "units": ...,
  "source_ref": {...}}` — the budget the study's own total is checked against,
  when there is one:
  - **With a `limit`** — `check_study()` folds exactly two terms through the
    one `fold()`: the limit (sign `+1`) and the study's own total (sign `-1`)
    — the L1 grip-check pattern, with a `StudyResult` standing in for the
    clamped stack.
  - **With no `limit`** (added 2026-09-08, handoff `topology_schema_v1`,
    deliverable 1's acid test) — the criterion applies directly to the study's
    own total, which is already the output of the one `fold()` inside
    `summarize()`. This is the shape for a study whose chain already sums to
    the exact quantity a check evaluates, as `vpa_output_shank_out`'s does:
    its `worst_case_shank_out` check has no `limit`, and `check_study()`
    reproduces `stack_vpa_output_to_pitch_plate.json`'s own published
    `worst_case_shank_out` — interval, verdict and criterion, exactly — which
    is the acid test deliverable 1 asked for. **This is what makes `checks`
    equivalent in power to `StackDefinition.checks`**: a stack's own check is
    just as often a pure combination of its elements/paths (no external
    number at all) as it is a budget, and now so is a study's.

  `complete`/`excluded_terms` are **authored**, never scanned for, for
  the same reason a stack check's are: an excluded term has no element to read
  a gap off of. See `study_pitch_system_end_stop_minus7.json` and
  `study_pitch_system_end_stop_plus72.json`, whose one check each cites S461-607
  (a blade-to-blade pitch-variation limit, `SourceRef.kind: "requirement"`) as
  the numeric budget and S461-241 (the two nominal stop angles) as the
  non-arithmetic `context_ref` naming which operating point the study is about.
  Both checks are `complete: false` — the chain still crosses two `assumed`
  placeholders and one unresolved-identity edge, and neither study's borrowed
  sensitivity (the source sheet's "-5 deg worst case" or "full-sweep average"
  columns) is characterised at the requirement's actual -7/+72 deg operating
  points — so both checks render as a *budget*, never a hardware verdict,
  exactly as `CheckResult`'s `complete` flag already requires everywhere else in
  this repo.
- **`configuration`, added 2026-09-08, closes "What v0 cannot do" gap 3** (load
  cases, below). Free-form and descriptive only — nothing in `traverse()` or
  `summarize()` reads it, the same as a stack check's own `configuration`.
  Today which load case a study represents (collective vs. cyclic, which
  branch a parallel path stands for) lives entirely in *which edges a human
  put in* `selection`, unlabelled; this gives that a place to be written down.
  See `study_pitch_system_gas_spring_branch.json`.
- **`no_checks_reason`, added 2026-09-15 by handoff `stack_fable_audit` — a
  study with no checks says why.** The full-pass audit found five studies with
  an empty `checks` and no recorded reason; each reason existed, scattered
  through `notes` or nowhere, which no scan can see. The field is one authored
  sentence-or-more naming why no criterion is citable — a reference dimension a
  check would dress as a requirement (`study_pitch_link_thread_region_t`), a
  criterion that lives on a byte-identical twin study
  (`study_pitch_system_blade_angle_*` vs the end-stop pair), or a quantity no
  in-repo document states a limit for (the two millimetre studies). Exactly one
  of `checks` / `no_checks_reason` may be present, enforced by
  `tests/test_topology.py::test_every_study_has_checks_or_says_why_not`.
  Additive and optional, read by nothing that folds (`Study.from_dict` drops
  it — the file is the contract), so the schema stays `/v0`.
- **`completeness`, added 2026-10-22 by handoff
  `a_study_says_it_is_incomplete_without_inventing_a_check` — derived, never
  authored.** A study's fold carries `completeness: {complete, reason,
  open_terms}`. `complete` is false when any selected edge is a `gap`, or its
  value's `source_ref` is `kind: assumed` or `confidence: untraced` (or absent);
  `open_terms` lists those edge ids in selection order and `reason` is a generated
  sentence naming the count and the first two. It is the fold of **all** the
  study's terms, with or without checks, so a study with a `no_checks_reason`
  can say it is incomplete without inventing a limitless check. A check's own
  `complete` / `excluded_terms` keep their meaning — that check's coverage of
  *its* terms — and are still authored. A study file that writes `completeness`
  by hand is refused (`Study.from_dict`): the derivation is the authority.

**A check whose terms combine several *named* term lists — the way a stack's
own `checks` mix an element with a `{"path": id, "sign": -1}` term
(`stack_tan_link_to_pitch_plate.json`'s `shank_out__13_thick` folds a `path`
plus two individually-signed elements) — has no topology equivalent, and
deliverable 4 fences that rather than building one (investigated, not shipped;
2026-09-08, handoff `topology_schema_v1`).** A stack's `path` is a name
resolved by a local dict lookup inside the *same file* (`StackDefinition.
paths`); a topology's nearest analogue is a `Study`, and by design each study
is its own document — nothing here indexes studies by id the way a stack
indexes its own paths. Building that lookup, and then combining two studies'
totals under independently authored signs, reopens exactly the question
`traverse()`'s branch/cycle guards exist to refuse: two chains over one
topology may share edges or nodes, and nothing would then check whether their
combination is two independent contributions or one physical quantity counted
twice — a guarantee `fold()` gets for free inside *one* chain (the cycle guard)
and would not get across two. **Path-referencing check terms stay stack-side.**
`linear_stack_conversions` should read this verdict before converting
`tan_link_to_pitch_plate`: a stack whose checks reference named paths this way
does not carry over to a topology's `checks` unchanged, and needs either a
flattened per-check term list or to keep its checks on the stack side of a
`dimension_ref` re-expression.

### Where a sensitivity belongs

A sensitivity is a property of the **study's output quantity**, not of an edge
alone — the same millimetre at the pitch plate is worth a different number of
degrees depending on which quantity is being rolled up, which is why the
end-stop workbook has three sensitivity columns over one set of rows. So:

- an edge's **default** transform stays `identity`, and a study declares the
  conversions;
- **unless the conversion is intrinsic to the part**, which in this repo is the
  pitch arm and nowhere else: a displacement across
  `pitch_arm_link_hole_to_clocking_hole` *is* an angle at the blade. That is the
  only edge in the repo carrying a non-identity default, and a test holds it to
  one so that a second one has to re-make the argument.

### A worksheet home (deliverable 3, 2026-09-08)

A stack locates its worksheet by two rules
(`scripts/build_viewer_projection.py`'s `worksheet_for()`): a declared
`provenance.worksheet` wins, else `stack_X.json` matches `WORKSHEET_X.md` by
name. A topology reuses the **same two rules**, read by
`scripts/build_topology_projection.py`'s own `worksheet_for()` — declared
first, then `topology_X.json` -> `WORKSHEET_X.md` by name — because a
topology's worksheet is usually named for the *source workbook*, not the
system: `topology_vpa_pitch_linkage.json` declares (its pitch-system half's, since
the 2026-10-26 fold)
`provenance.worksheet: "docs/tolerance_stacks/WORKSHEET_end_stop_graft.md"`,
which shares no stem with `vpa_pitch_linkage` at all, so only the declared rule
finds it. Emitted into the projection as `worksheet_file`/`worksheet_source`,
the same field names `results.json` already carries for a stack. The worksheet
lives on the **topology**, not the study: a source workbook documents the
whole system's rows, and several studies over one topology share one
worksheet, the same many-studies-one-topology relationship the format already
has everywhere else.
The one exception is a study whose chain is a grip stack folded into the
model: the projection carries that stack's own sheet and `joint` block on the
study row (`stack`, resolved by `build_topology_projection.py`'s
`study_stack` from the study's `dimension_ref` edges and
`provenance.grip_stack_joints`), and the viewer offers them while that study
is selected (2026-10-27).

---

## The committed examples

### L1 — `study_vpa_output_shank_out.json` (its own topology until 2026-10-27)

The proof. Its topology, `topology_vpa_output_to_pitch_plate.json`, folded into the product model on 2026-10-27; `tests/fixtures/topology_vpa_output_to_pitch_plate_before_the_fold.json` is the frozen copy the format tests read. A reviewed, committed grip stack
(`docs/tolerance_stacks/stack_vpa_output_to_pitch_plate.json`) re-expressed as a
graph: 6 parts, 7 interfaces, 7 edges, 0 branch points, 1 grounded loop and
1 gap edge. Five clamped members run in series between six of those interfaces;
the seventh is the end of the bolt's full shank, where the grip edge — the loop's
other arm — lands, and the derived residual is the gap between the two. Every
transform is the identity.

`tests/test_topology.py` asserts the study folds to the **identical** numbers
that stack's own `worst_case_shank_out` check publishes — every field, exactly,
no tolerance — and separately asserts that the topology copies no value, because
without that second check the first would be comparing a number against itself.

### L2 — the seven pitch-system studies

The structure: the pitch system's branch points and grounded loops (pitch
links, gas spring, ring gear, and the hydraulic-brake alternative to the gas
spring), the end-stop gap, and the linear↔rotary coupling at the pitch arm.
Authored 2026-08-31 as `topology_pitch_system.json`; since 2026-10-26 it is
the pitch-system half of `topology_vpa_pitch_linkage.json` (below), whose
`provenance.pitch_system_ids` names every id that came from it, and these
seven studies are studies of that one graph. File names and study ids are
unchanged; every total, band and check verdict is unchanged. The fold added
one thing to the four studies that cross the pitch link: the link's two
joints, which the old document drew as one interface each, are joint gaps
in the linkage half, and they now carry an `assumed` zero so a chain crosses
them and says it is incomplete there.

- `study_pitch_system_vertical_hub_to_pitch_arm.json` — the millimetre baseline,
  hub A datum to the pitch-arm link bore. Stops before the coupling on purpose.
- `study_pitch_system_blade_angle_worst.json` — crosses the coupling; totals in
  degrees at the worst-case sensitivity.
- `study_pitch_system_blade_angle_average.json` — same graph, same selection,
  the other sensitivity set.
- `study_pitch_system_gas_spring_branch.json` — the parallel path, summed on its
  own. Nothing compares it to the pitch-link path.
- `study_pitch_system_end_stop_minus7.json` / `study_pitch_system_end_stop_plus72.json`
  — added 2026-09-06 by handoff `endstop_location_stack`, one per S461-241's two
  named stop angles. Each is `study_pitch_system_blade_angle_worst.json` /
  `_average.json`'s exact selection and transform set, re-titled and given one
  requirement-cited `checks` entry — separate documents, not edits of the two
  above, because a study's numbers, once committed, are not touched by a later
  handoff without a reason of their own. Handoff `mechanical_stroke_stack`
  (2026-09-06) later **appended** a second `checks` entry to each of these two
  files (citing S461-617/639, not S461-607) — additive, not an edit of either
  study's `selection`/`transforms`/first `checks` entry, and the distinction
  those two handoffs draw is the one this bullet states: a study's *numbers* are
  fixed once committed; its `checks` list is reusable schema, and growing it is
  not touching them.
- `study_pitch_system_gas_spring_mechanical_stroke.json` — added 2026-09-06 by
  handoff `mechanical_stroke_stack`, over one new node and one new edge
  (`gas_spring_full_extension_stop`, `gas_spring_mechanical_stroke`) representing
  the gas spring's own internal mechanical stroke and stops
  (S461-610/636/516/637/616/617/638/639) — a quantity the pre-existing
  gas-spring edges (external body height, mounting position) did not represent.
  The stroke edge's `to` end reuses the existing `gas_spring_mount_flange` node
  as a stand-in for the piston's own full-retraction stop (see the edge's own
  `properties` note for why, and for why a second brand-new node was rejected —
  it would have disconnected the graph, which the viewer's projection builder
  assumes never happens); a millimetre study, one edge long.

**Its values are placeholders and its structure is the deliverable.** At
founding every dimensioned edge was a workbook cell that traces nothing (0 of
43, per `WORKSHEET_end_stop_graft.md`); handoff `endstop_location_stack`
(2026-09-06) re-cited six of those edges against drawings instead
(`provenance.retrace_update_20260906`), and handoff `mechanical_stroke_stack`
(same day) added one more, `kind: "assumed"` for want of any source at all
(`provenance.mechanical_stroke_extension_20260906`). The `kind: "assumed"` group alone says
`PLACEHOLDER` in their notes, which a test enforces. Every dimension in it is
**variation-only** — `nominal: 0.0`, band `±w/2` about an unstated nominal —
because the source holds tolerance widths, not dimensions. Do not quote a number
out of it without reading its own `source_ref.confidence` first.

### The four fastener grip stacks, inside the model

Handoff `linear_stack_conversions` (2026-09-08) re-expressed four reviewed
linear stacks as four topologies of their own, each `dimension_ref`-only, no
copied numbers. Handoff `the_fastener_stacks_join_the_model` (2026-10-27)
folded all four into `topology_vpa_pitch_linkage.json` the way
`pitch_system` was: parts, interfaces and edges kept their ids except where
one id named a different thing in each stack (`head_bearing_face`,
`shank_full_dia_end`, `washer_far_face`, `shank_out`, `fastener_grip` and a few
more), which took a joint suffix (`_pitch_link`, `_rotor`, `_tan_link`,
`_vpa_out`). Their fourteen studies are studies of the one graph; every total,
band and check verdict is unchanged. Each stack is its own component of that
graph, with no edge to the mechanism (an edge there would be a value nobody
sourced), but its hardware is declared in a body, so a grip study draws inside
the plate's container with the rest of the model dimmed, and the kinematic
study draws the grip chains dimmed.

- Pitch link to plate: `study_pitch_link_shank_out.json`,
  `study_pitch_link_cotter_hole_clearance.json`,
  `study_pitch_link_thread_region_t.json` (the stack's own "provenance
  cross-check", no `checks` entry).
- Rotor balance-mass bolt: nine studies, `study_rotor_fastener_grip_u2h.json`, `study_rotor_fastener_grip_u3h.json`, `study_rotor_fastener_grip_u4h.json`, `study_rotor_fastener_grip_u5h.json`, `study_rotor_fastener_grip_u6h.json`, `study_rotor_fastener_grip_u7h.json`, `study_rotor_fastener_grip_u8h.json`, `study_rotor_fastener_grip_u9h.json`, `study_rotor_fastener_grip_u10h.json`, one per as-drawn NAS6403 grip
  option, all naming one part (`fastener_family`); a study selecting two of
  the nine is refused by `BranchAmbiguity`, which is the model's mechanical
  form of "exactly one dash is ever installed". Nine studies, not one:
  `check_study`'s `limit` shape folds an external budget as a zero-width point
  value and would drop each fastener's own band.
- Tangential link to plate, take 2: `study_tan_link_take2_worst_case_protrusion.json`.
  The take-1 stack is not converted; its checks reference paths in a way "A
  study, in outline" fences (`docs/sessions/lessons/LESSONS_20260908_linear_stack_conversions.md`).
- VPA output to plate: `study_vpa_output_shank_out.json`, the L1 proof above.

The four stacks' `joint` blocks (assembly drawing, sheet, view, zone) live in
the model's `provenance.grip_stack_joints`, since the document is a whole
product and carries no `joint` of its own. Each study over one of them carries
its stack's block in the projection (`stack`), so the page shows it with
the study.

### `topology_vpa_pitch_linkage.json` + ten studies and a kinematic study

**One topology per model, and every study is a subset of it; the model is the
top node of the nav (2026-11-08, "Models" above).** This is model v1, the
propeller pitch system's (Jeff, 2026-10-26: "all of the studies are just
subsets of a single global model representing the actual product"). The
graph: 35 parts, 79 interfaces, 99 edges, 24 branch points, 25 grounded loops,
17 gap edges. Its studies are the seven pitch-system chains above, the
end-stop travel and the feather stop's axial position below, and the kinematic study ("A kinematic study reads its
sensitivity from a published sweep"); it declares its rigid bodies ("Bodies",
above).

Handoff `vpa_pitch_linkage_topology_and_feature_fits` (2026-09-30) founded it
as the first committed topology with **no study at all**: the propeller pitch
linkage's joints at 72 degrees blade pitch — the two pitch-link
spherical-bearing centres, the hub and plate spindle bores, the blade-1 root
bearing bore, the gas spring, and the tangential link as a declared phase 2.
Handoff `pitch_system_folds_into_the_pitch_linkage_model` (2026-10-26) folded
`topology_pitch_system.json` into it, ids preserved except where one physical
feature had two (the linkage half's id won) and where one id named two features
(`tan_link_mount_overall_height` is the pitch-system half's mount height); the
session lesson carries the collision table. The two halves still model some
joints at two granularities — "What v0 cannot do", the sixth item.

Two things about the linkage half are unlike every section above.

**Its joints hold almost no numbers, and that is the deliverable.** Of the
mechanism's joint edges only the two link lengths and the plate's tangential-link
radius carry a value, each cited; every other joint edge carries **no dimension
at all** and says, in its own `note`, what would close it — a named drawing, or a
fit of a named mesh. That is the repo's cite-or-gap rule applied to a document
whose numbers have not been acquired: an `untraced` band of `0.000` would put a
plausible number in front of a reader who cannot tell a placeholder zero from a
measured one. The cost is worth knowing before you read the DAG page: the gap
list reports an edge whose dimension is *unverified*, not one that has no
dimension, because a valueless edge there has always meant "the quantity a study
computes" — so this document's gaps show on its edges rather than in the gap
list (`ISSUE_20260930_a_valueless_structural_edge_is_invisible_to_the_gap_list.md`).

**Three of its parts are piece parts rather than links in the chain.** The
spherical bearings each carry their own small sub-graph — a ball centre against
its seat and against its bore — because they are the features that can actually
be selected today: the pitch-link bearing is the one part of this linkage with
an installed mesh. Each is tied into the mechanism by a `gap` edge saying *this
joint centre is that part's ball centre*, which is nominally zero and is the
only thing in the document that tells a reader which geometry to click for a
centre. They were a separate component until the viewer's `[real]` tier showed
what a disconnected topology does to the rail serialisation; `Topology.cycle_rank`
counts components rather than assuming one either way.

**The one piece that does carry numbers is the end-stop travel chain** (handoff `the_travel_between_the_end_stops_is_a_study`, 2026-10-16): the two piston heads, the piston cover and the gas-spring mount's stop face, summed by `study_vpa_pitch_linkage_travel_between_end_stops.json`. Its sibling `study_vpa_pitch_linkage_feather_stop_axial_position.json` (2026-11-03) places the feather contact itself, from the tangential link mount's hub face through both mounts and the piston body to its flange on the plate: the feather stop's axial stack in the kinematic study, and with the travel added, the low stop's. Since 2026-10-22 every band in it is a drawing's: two dimensions, and two general profile notes banding a mesh-fit nominal (the SOP's "What a term cites when its drawing does not band it"); a third mount edge, 213668-002's datum-A height, is recorded and selected by no study. And `docs/tolerance_stacks/WORKSHEET_gas_spring_end_stop_travel.md` carries the face order, the fits and the signs. It is modelled as a clearance at the second stop, not a contact, because a hard contact is one node and a walk that ended on one would close a ring.

### `topology_vpa_end_stop_v2.json` — model v2, the end stop in five bodies

Handoff `model_v2_is_the_end_stop_linkage_in_five_bodies_and_the_nav_switches_models`
(2026-11-08): the first rung of the reset in
`dispatch/docs/strategy/drafts/DRAFT_tolerance_analysis_over_the_kinematic_model.md`.
The graph: 20 parts, 52 interfaces, 70 edges, 23 branch points, 19 grounded
loops, 21 gap edges. Studyless; no edge carries a dimension, and each says what
would close it.

It is v1's mechanism cut down to the joints and the stops. The bodies are
linkage's five, in the loop's reading order (base, tangential link, pitch
plate, pitch link, blade), with the piston heads folded into the plate and the
cover into the base (2026-11-08,
`the_end_stop_model_names_its_datums_right_and_folds_its_riders`). The nodes are the ten the P2 sweep names, the faces that join each
body's parts, and the three stop faces: the feather contact (the lower head on
the mount, one node because they touch), the upper head's step face and the
cover's internal shoulder, with `travel_between_end_stops` the clearance
between those two. Every id is v1's except two edges inside the pitch-plate
body (the plate's pilot in the piston body's ID, and the piston body from that
ID to the head seat), which v1 never needed because it joins those parts only
through its bodies list, and the tan-link mount's compound datum (2026-11-08):
its pilot bore on the hub's locating boss (a `pin_in_bore` gap), the pilot to
its attachment bore, and its clocking by the perimeter fasteners, one node on
both parts like v1's `pitch_arm_blade_root_clocking`; and the gas-spring
mount's base-to-bushing dimension (2026-11-10, below). Its names say what each
datum locates and never "spindle": the hub's axis is its locating boss, the
plate's its pilot boss (the names were re-cut 2026-11-10, "Naming a feature"
above; its title is now "Propeller Pitch System", v1's the same with
"(legacy)"). v1's hub-to-plate coaxiality is not here --
the plate is located through the piston, the piston through the mount's
bushings, the mount through its seat on the tangential link mount.

**The base is a stack** (2026-11-10, handoff
`the_gas_spring_mount_sits_on_the_tan_link_mount_in_the_end_stop_model`): the
hub, the tangential link mount on it, the gas-spring mount on *that* and the
piston cover on top, and no contact between the gas-spring mount and the hub
(Jeff, asked whether the mount seats on the other mount only: *"Yes, mount on
mount."*). The seat is v1's `tan_link_mount_gas_spring_seat`, reached from the
hub face by v1's `tan_link_mount_overall_height`, so the tangential link
mount's height is on the path from the hub to both stops. From that seat, the
mount's base (datum A) reaches the feather stop by one edge, v1's
`gas_spring_mount_datum_a_to_end_stop`, because 213668-002 dimensions its top
face straight from datum A and the cover flange from nowhere but the model;
the cover flange is reached from the stop (`gas_spring_mount_flange_to_end_stop`).
So a study of the feather stop's position sums the datum-A edge, and the
travel study the flange-to-stop edge; neither sums both. The base-to-bushing
dimension starts at the same seat under a v2-only id,
`gas_spring_mount_seat_to_bushing_bore`, since v1's `gas_spring_mount_height`
still starts at v1's hub seat. One blade, one pitch link and one tangential link:
each of those parts, and the link's two bearings, declares its `occurrence`,
blade 1's and the tangential link the P2 sweep poses, with the placement
recorded in the part's note.

**Each joint up the base is a seat, a boss and a fastener pattern**
(2026-11-17, handoff `the_base_stack_joints_are_seat_boss_and_pattern`; Jeff,
2026-11-10: the three joints *"all have the same datum style with a flange,
central locating boss, and fastener pattern for clocking"*). The hub joint was
authored that way on 2026-11-08; the two above it now are too, each read off
the two parts' meshes before it was written: a datum feature on each part and
a `pin_in_bore` gap edge between them, one shared node with
`interface: fastener_pattern`, and structural edges tying the new features to
each part's own. The meshes decide which part carries the boss, and it is not
the hub joint's way round: the gas-spring mount carries both bosses, a spigot
under its base face into the tangential link mount's bore and one above its top
face that the piston cover's pilot bore sits on. Each new node's `note` records
the faces, the two diameters and the ring (hole count, hole diameter, circle);
those are evidence that the feature is there, never values, and no edge gains a
dimension. All the new ids are v2's own: v1 has neither joint's boss nor its
pattern.

**The joints inside the blade and the pitch plate are what their parts show**
(2026-11-17, handoff
`the_blade_and_piston_joints_are_authored_as_what_the_parts_show`; Jeff,
2026-11-10: they *"have variants of the same style"*). Each was read off its two
parts' meshes by the method above, and each variant is what the meshes have:

- **pitch plate ↔ piston body** is the ground stack's style whole: the piston
  body's flange face (its datum A) on the plate, the existing pilot boss in
  the body's bore, and a ring of five fasteners.
- **blade ↔ pitch arm** is a seat, the arm's bore on a boss of the blade
  root's fitting, and a clocking that is one radial hole through both parts
  (two holes on a diameter), under v1's `pitch_arm_blade_root_clocking`.
- **piston body ↔ each piston head**: one spigot on the piston body locates
  both heads by their pilot bores. The lower head is a plain ring with no hole,
  clamped between the body's shoulder and the upper head; the upper head's
  three fasteners pass inside it into the piston body. So the two heads'
  shared face stays a seat alone, and the upper head's boss-and-pattern joint
  is with the piston body: a joint v2 did not have before.

The piston body's flange seat is a new id although v1 has the face
(`piston_body_plate_flange`): v1 states it on the body alone, and a shared id
names the same parts in both models. What the meshes leave open is filed for
Jeff rather than authored
(`docs/issues/ISSUE_20261117_the_blade_and_piston_joints_leave_questions_for_jeff.md`).

**The pitch plate is an assembly with its bushings** (2026-11-18, handoff
`the_pitch_plate_is_an_assembly_with_its_bushings`; Jeff, 2026-11-17: the
flanged bushings *"are part of the 215177 assembly and the straight bushings
aren't assembled until the top level because they are a transition fit in the
bore"*). `pitch_plate_215177_001` keeps its id, its features and Jeff's
bindings, and holds the machined plate 215735-001 and the NAS77A3-015A flanged
bushing at each attachment the model reaches as children; the 214820-002
straight bushings are top-level parts of the pitch-plate body, under v1's ids.
At each of the two attachments (blade 1's pitch link and the drawn tangential
link) the plate has two lug bores, 215735 A's Ø7.950 for the flanged bushing
and Ø8.520 for the straight one; each bushing's outer cylinder sits in its
bore by a `press_fit` or a `transition_fit` gap, its wall joins its outer
cylinder to its bore, and the bolt, which is not in the model, is two
`pin_in_bore` gaps: the flanged bushing's bore to the attachment's own bore,
and the straight bushing's bore to the flanged one's. No edge gains a
dimension; each fit's note cites the bore's callout and names the bushing's
band as a gap. Six NAS77A3 occurrences, the NAS77A4 and six 214820-002
occurrences are at attachments the model does not draw and are left out.

---

## A topology with no studies is a document kind, not an unfinished one

The archetype's first three documents each existed to be *summed*, so "topology
plus studies" read like one thing. `topology_vpa_pitch_linkage.json` separates
them: its consumer is `C:\workspace\linkage`, a solver in another repo, and
what that consumer wants is **where the joints are**, not what any chain of them
totals. Joints as nodes, kinematic dimensions as edges, no `selection` anywhere.

A studyless topology earns the same schema for a reason worth stating. It is
what the 3D annotation surface binds to — `feature_identity.StackKey` names a
*topology edge*, so a feature a human must click needs an edge with that feature
at one end, and `scripts/fit_bound_features.py` turns those bindings into
nominal joint locations in the assembly frame. A document built to be bound is
therefore built edge-first, which is exactly the shape this schema already has.

**The fence is unchanged by any of it.** Nothing here computes a pose, resolves
a redundancy or chooses which of two parallel paths binds — see "Not a solver"
above, which this section does not soften. A fitted nominal is a measurement of
a mesh with its own provenance (mesh sha, face id, instance path, residual); it
is not a tolerance, it carries no band, and a drawing callout wins over it
wherever one exists (`docs/ANNOTATION_SURFACE.md`, decision 6). The solver that
consumes `fits.json` does its own solving, in its own repo, and that is the
point of handing it coordinates rather than an answer.

---

## A kinematic study reads its sensitivity from a published sweep

Added 2026-10-16 by handoff `a_kinematic_study_folds_the_sweeps_jacobian`.
Implementation: `tolerance_stack/kinematic.py`. Tests: `tests/test_kinematic.py`.
Projection: `scripts/build_kinematic_projection.py`.

A study above is a chain a human lassoed, and its sensitivities are constants
someone wrote into a transform. That is the right model for a clamped joint and
the wrong one for a mechanism, whose parallel paths are settled by kinematics.
The kinematics is solved elsewhere: `C:\workspace\linkage` publishes sweeps
(`linkage-sweep/v1`, under `data/inbox/linkage-sweeps/`) that carry, at every
sweep point, the derivative of every measure with respect to every geometry
parameter. A derivative of the output with respect to one input is exactly a
`Term.coefficient`.

**The model.**

- **The Jacobian is a cited coefficient source.** A kinematic study names a
  published run by `run_id`, one of its measures, and its *contributors*. Each
  contributor names a topology edge (which physical dimension), the sweep's
  parameter labels that dimension perturbs, a **zone** — `band` along one
  parameter, `sphere` about a point's three coordinates, `disk` over two tilt
  components — and where the zone's size comes from: a `dimension_ref` to a
  topology edge (resolved at load, citation carried unchanged — the L1 pattern,
  no number copied) or an inline `dimension` with its own `source_ref`. At each
  sweep point a contributor becomes **one** `Term` (a band: the entry's sign and
  magnitude; a sphere or disk: `+1` and the norm of its entries, the closed form
  for the worst direction), and the point's terms go through the one `fold()`.
  The module docstring carries the argument for why the norm is a coefficient
  and not a second combiner.
- **A kinematic study is not a chain.** No `selection`, no endpoints, no
  `traverse()`: how the contributors combine is the solver's answer, and the
  Jacobian row is that answer. The result is an **envelope** over the sweep —
  per point the driver value, the nominal measure, worst case and RSS — plus a
  ranked contributor table, and its `checks` apply at a **named stop**
  (`configuration.stop`, a point found by its measure value, never by index),
  folded against a `limit` exactly as a study's check is.
- **Cite or gap, unchanged.** A contributor with no band anywhere is a *gap
  row*: its sensitivity is shown and it enters no term. Every band is about a
  nominal of `0.0` — variation only — because the nominal geometry is the
  sweep's own.
- **Which feature a label is** is authored per contributor (`feature`), and
  checked against the artifact's own `geometry.features[]` when a run carries
  one; a disagreement refuses to load, naming the label.
- **A contributor may itself be a study** (2026-10-26, handoff
  `a_contributor_may_be_a_study`). A contributor written
  `{"study_ref": {"topology", "study_id", "parameter"}}` names a chain study
  whose total moves one sweep parameter — the travel between the end stops
  moves the driver — and **enters by the chain rule, as terms, never as its
  folded interval**: at every sweep point each of the sub-study's signed terms
  joins this study's fold with coefficient `|J| ×` the term's own ratio and
  sign `sign(J) ×` the term's own, `J` being the sweep's Jacobian entry for
  `parameter`. Worst case stays the sum over the leaf terms and RSS stays one
  quadrature over them: nothing folds a fold, and a sub-study's folded total
  would read its worst case as one RSS variate. Each leaf's band is the
  sub-study edge's own, read about its own nominal (the sweep holds the
  nominal), with its citation and confidence unchanged — so a term that is
  untraced in the sub-study is untraced here, and the check says so. The
  sub-study's output unit must be the parameter's (the same refusal a band
  gets), and **v0 refuses a `study_ref` that names a kinematic study** — no
  nesting yet. The page shows the group as one collapsed row over its terms.
- **Each stop is its own stack** (Jeff, 2026-11-03, handoff
  `each_stop_is_its_own_stack`). A stop is a contact pose, and where the
  mechanism sits when it touches is toleranced like any other dimension, so
  every stop names its own `axial_stack`: chain studies on the sweep's driver
  whose terms place the driven part along the driver's axis at that stop's
  contact, from the ground. The stop's band is one fold: the direct
  contributors at its sweep point (the **linkage terms at this pose**, the
  envelope's own fold there) plus each stack leaf at `|J| ×` its ratio, `J`
  the driver's entry at the stop's nominal (first order). The envelope along
  the sweep is the linkage terms only; nothing is swept along x. On the
  blade-pitch study the feather (+72°) stop's stack is
  `study_vpa_pitch_linkage_feather_stop_axial_position.json` (both mounts,
  then the piston body from the shoulder the lower head seats on to its flange
  on the plate) and the low (−7°) stop's is that study plus the travel between
  the stops, which is where the two piston heads enter (Jeff's ruling the same
  day: the head stack is referenced from the body's shoulder, so its
  thicknesses move only the far contact). A leaf both stacks hold is **shared**:
  the range between the stops (the high stop's measure less the low's) enters
  every shared term — those and the linkage — once, at the difference of its
  two weights, so they nearly cancel. A check at a stop with a `bound`
  (`at_least` / `at_most`) is a one-sided **reach** check on the stop's own
  measure (S461-261's +70° and −5°). **The datum** (`datum.stop`) keeps one
  meaning: the pose where the sweep's driver is 0 (refused at load
  otherwise) — the feather stops touching, by CAD and, since Jeff's note of
  2026-11-03, by procedure ("During rigging, the actuator's home (zero travel)
  is reset to the position with the feather direction end stops touching") —
  and it zeroes nothing. A stack entry may be a **declared gap** (`gap` and
  `title`, no study behind it): it contributes nothing, leaves every check at
  its stop incomplete, sits on the gap list, and is refused once the study it
  names exists — today the blade-root bores to the tangential link mount, at
  both stops. **Superseded 2026-11-03:** the 2026-10-29 rule
  (`the_plus72_stop_is_the_travel_datum`) that a driver `study_ref` among the
  contributors is an x-interval of the stops its `applies_to` names, with the
  datum stop's interval 0; that form is now refused, naming this handoff.

**The fence is unchanged.** Nothing here solves, perturbs or differentiates a
mechanism, picks a load path, or calls `traverse()`/`summarize()`/`check_study()`.
It reads a cited artifact, and a run, measure or label it cannot find is a
refusal, never an estimate. "Not a solver", above, is not softened by any of it.

**What it closes in "What v0 cannot do", below:** item 4 is the sweep itself —
a position-dependent sensitivity is now read point by point rather than authored
as one constant. Item 2 becomes *expressible*: gas-spring bushing tipping is a
`disk` on the plate slide's axis components, whose Jacobian the published run
already carries; it waits for two cited values, the bushing's radial clearance
and the bushing length that turns that clearance into a tilt, since an axis
component's band is a tilt in rad and a bare mm clearance on it is refused at
load. Items 1 and 3 are
untouched.

The first document is
`kinematic_study_vpa_pitch_linkage_blade_pitch_at_the_stops.json`: blade pitch
over the P2 sweep from the linkage's cited tolerances, checked against
S461-607 at both end stops, four of its bands borrowed from other edges of the
same topology (from `topology_pitch_system.json` until the 2026-10-26 fold) with
each pairing argued in the contributor's own `note`.

**What the viewer shows for one** (2026-10-20, handoff
`the_viewer_shows_a_kinematic_study`): a page of its own, reached from a
**Kinematic studies** section of the nav or `topology.html?kinematic=<study id>`
— the verdict per stop, the envelope drawn live as deviation from nominal over
the driver, and the provenance behind one fold. Since 2026-10-26
(`the_kinematic_page_keeps_the_dag_and_says_each_contributor_once`) the page
also draws the topology's model with the study's contributors and the edges
they borrow a band from lit, the rest dimmed or hidden, and since 2026-11-03
its grid is the study's stack at one stop: the linkage terms in chain order,
the stop position's sub-stacks folding under their headers, a sensitivity
column and its curve across the sweep on hover; a row selects its edge in
place. It reads the projection the
builder above writes into the viewer's own projection directory, and adds
nothing up. `apps/viewer/README.md`, "Kinematic studies — a section of their
own", is where the page is described; `apps/viewer/views/kinematic.js` is the
page.

---

## What v0 cannot do

Found by building L2 against Jeff's own end-stop workbook, and recorded here
rather than in a lesson because they are schema findings, not session notes.
Swept 2026-09-08 (handoff `topology_schema_v1`, deliverable 5) per that
handoff's instruction: none may be silently dropped, so each of the four is
either closed or re-fenced with a dated note below, rather than left as it was
written on 2026-08-31.

1. **A weight computed from `properties`.** The workbook applies a diameter-MMC
   weighting factor built from two blade-root radii to three of its rows. One
   ratio per edge cannot express it. This is what the next `TRANSFORM_KINDS`
   word probably is. **Still open, re-fenced 2026-09-08**: this schema pass adds
   no new `TRANSFORM_KINDS` word, because no committed study needs one yet —
   the three affected rows are still `kind: "assumed"` placeholders, so there is
   no real weighting formula in the tree to design the fourth word against.
2. **A contributor that is not a chain edge.** The workbook's *largest* single
   angular contributor is gas-spring bushing tipping backlash — a radial
   clearance acting over two lever arms. No axial chain carries it. **Still
   open, re-fenced 2026-09-08**: unchanged for the same reason as gap 1 — no
   edge/node shape for "a clearance acting over two lever arms, not along an
   axial chain" was designed this session, because doing so well needs a real
   sourced value to design against, not the placeholder that is there today.
   **Expressible since 2026-10-16** (a kinematic study, above): a `disk`
   contributor on the plate slide's axis components, read from the sweep's
   Jacobian. Still open in the sense that matters — no clearance band is cited.
3. **Load cases.** The ring-gear branch participates cyclically and follows
   along for pure collective. Today that distinction lives entirely in which
   edges a human puts in a `selection`, unlabelled. If it needs a name, a
   study-level `configuration` block (the stack schema already has one on
   checks) is the cheap shape. **Closed 2026-09-08**: `Study.configuration`, a
   free-form descriptive block nothing in `traverse()`/`summarize()` reads —
   see "A study, in outline", above. `study_pitch_system_gas_spring_branch.json`
   is the worked example, naming its own load case (`"collective"`) and stating
   in prose that which of it and the pitch-link path binds is still the
   mechanics question this tool does not answer.
4. **Position-dependent transforms**, named and deferred by the brief:
   pitch-link swing-angle change, tangential/anti-rotation link effects. The
   `properties` bag is where their inputs will go; nothing reads it yet, which is
   deliberate — the extension point exists so arriving at the real thing is an
   added reader rather than a schema break. **Still open, re-fenced 2026-09-08**:
   deferred by the brief on the same terms; this schema pass touches
   `Transform.properties` in no way, and the extension point remains exactly
   where it was. **Closed 2026-10-16 for a mechanism with a published sweep**:
   a kinematic study (above) reads the position-dependent sensitivity point by
   point from the solver's own Jacobian. `Transform.properties` is still read
   by nothing; the sensitivity arrived as a cited artifact instead.

Extensibility the brief names and this version does not build: edge
stiffness/strength/mass. Same bag, same rule.

**A fifth item, found by this schema pass rather than by building L2**: a check
whose terms combine several named term lists (a stack's `path`-referencing
checks) has no topology equivalent — see "A study, in outline"'s
path-referencing-checks paragraph, above, for the finding and why it is fenced
rather than closed.

**A sixth item, found by the 2026-10-26 fold**: one joint at two
granularities. The pitch-system half drew a joint as one mating interface; the
linkage half draws the same joint as an interface on each part and a `gap`
between them. A chain crosses a gap only if the gap carries a value, so the fold
gave the two pitch-link joints an `assumed` zero — the assumption the old
document made silently, now a listed term — and left the other joints where both
shapes stand side by side (the gas-spring joint at the plate, the blade root in
the hub, the gas-spring mount on the hub or on the tangential-link mount)
unreconciled: which shape is right for each is a modelling question, not an id
merge.
`ISSUE_20261026_the_pitch_system_half_and_the_linkage_half_model_joints_twice.md`.
