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

---

## The formats

Two schemas, both `/v0`, both filesystem JSON — no SQLite, by locked decision.

| schema | you write it? | what it is |
|---|---|---|
| `joby.tolerance_stack/topology/v0` | **yes** — one per system | `parts`, `nodes`, `edges`, named `transforms`, plus `provenance` and `notes` |
| `joby.tolerance_stack/study/v0` | **yes** — one per question | a `selection` of edge ids, two endpoints, an optional per-study `transforms` map, an optional `closes` |

### A topology, in outline

```json
{
  "schema": "joby.tolerance_stack/topology/v0",
  "id": "pitch_system",
  "title": "...",
  "units": "mm",
  "transforms": [
    { "id": "pitch_arm_linear_to_rotary", "kind": "linear_to_rotary",
      "ratio": 1.67, "units_in": "mm", "units_out": "deg",
      "properties": { "pitch_arm_radius_mm": 50, "blade_root_radius_mm": 32 },
      "source_ref": { "kind": "workbook", "cell": "D10",
                      "confidence": "untraced", "note": "PLACEHOLDER ..." } }
  ],
  "parts": [ { "id": "pitch_arm", "name": "pitch arm", "drawing": null } ],
  "nodes": [
    { "id": "pitch_link_arm_hole", "name": "...",
      "parts": ["pitch_link", "pitch_arm"], "kind": "mating_surface" }
  ],
  "edges": [
    { "id": "pitch_arm_link_hole_to_clocking_hole", "name": "...",
      "kind": "structural", "part": "pitch_arm",
      "from": "pitch_link_arm_hole", "to": "pitch_arm_blade_root_clocking",
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
them. What a *study's* output unit is depends on the transforms it crosses.

### Where an edge's value comes from

Three cases, and the difference matters:

1. **`dimension`, inline** — topology-first authoring, for a system with no
   stack behind it. This is what `topology_pitch_system.json` does.
2. **`dimension_ref`** — `{"stack": "<repo-relative path>", "element": "<id>"}`,
   resolved out of the stack file at load time, citation and `role` included.
   This is what `topology_vpa_output_to_pitch_plate.json` does, and it is what
   makes the L1 proof mean something: that document contains **no numbers at
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
  "topology": "vpa_output_to_pitch_plate",
  "from": "bushing_far_face",
  "to": "shank_full_dia_end",
  "closes": "shank_out",
  "selection": ["straight_bushing", "...", "fastener_grip"],
  "transforms": { "<edge id>": "<transform id>" }
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

---

## The two committed examples

### L1 — `topology_vpa_output_to_pitch_plate.json` + `study_vpa_output_shank_out.json`

The proof. A reviewed, committed grip stack
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

### L2 — `topology_pitch_system.json` + four studies

The structure. 12 parts, 20 interfaces, 23 edges, 4 branch points, 4 grounded
loops (pitch links, gas spring, ring gear, and the hydraulic-brake alternative to
the gas spring), 1 gap edge (the end stop), and the linear↔rotary coupling at the
pitch arm. Those counts are derived from the graph by `tests/test_topology.py`,
not maintained by hand.

- `study_pitch_system_vertical_hub_to_pitch_arm.json` — the millimetre baseline,
  hub A datum to the pitch-arm link hole. Stops before the coupling on purpose.
- `study_pitch_system_blade_angle_worst.json` — crosses the coupling; totals in
  degrees at the worst-case sensitivity.
- `study_pitch_system_blade_angle_average.json` — same graph, same selection,
  the other sensitivity set.
- `study_pitch_system_gas_spring_branch.json` — the parallel path, summed on its
  own. Nothing compares it to the pitch-link path.

**Its values are placeholders and its structure is the deliverable.** Two thirds
of the bands are cells of a workbook that traces nothing (0 of 43, per
`WORKSHEET_end_stop_graft.md`); the rest are `kind: "assumed"` and say
`PLACEHOLDER` in their notes, which a test enforces. Every dimension in it is
**variation-only** — `nominal: 0.0`, band `±w/2` about an unstated nominal —
because the source holds tolerance widths, not dimensions. Do not quote a number
out of it.

---

## What v0 cannot do

Found by building L2 against Jeff's own end-stop workbook, and recorded here
rather than in a lesson because they are schema findings, not session notes:

1. **A weight computed from `properties`.** The workbook applies a diameter-MMC
   weighting factor built from two blade-root radii to three of its rows. One
   ratio per edge cannot express it. This is what the next `TRANSFORM_KINDS`
   word probably is.
2. **A contributor that is not a chain edge.** The workbook's *largest* single
   angular contributor is gas-spring bushing tipping backlash — a radial
   clearance acting over two lever arms. No axial chain carries it.
3. **Load cases.** The ring-gear branch participates cyclically and follows
   along for pure collective. Today that distinction lives entirely in which
   edges a human puts in a `selection`, unlabelled. If it needs a name, a
   study-level `configuration` block (the stack schema already has one on
   checks) is the cheap shape.
4. **Position-dependent transforms**, named and deferred by the brief:
   pitch-link swing-angle change, tangential/anti-rotation link effects. The
   `properties` bag is where their inputs will go; nothing reads it yet, which is
   deliberate — the extension point exists so arriving at the real thing is an
   added reader rather than a schema break.

Extensibility the brief names and this version does not build: edge
stiffness/strength/mass. Same bag, same rule.
