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
| `joby.tolerance_stack/topology/v0` | **yes** — one per system | `parts`, `nodes`, `edges`, named `transforms`, plus an optional `joint`, `provenance` and `notes` |
| `joby.tolerance_stack/study/v0` | **yes** — one per question | a `selection` of edge ids, two endpoints, an optional per-study `transforms` map, an optional `closes`, an optional `checks` list, an optional `configuration` block |

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
  "joint": {
    "assembly_drawing": "217755", "assembly_revision": "A.1",
    "sheet": 5, "view": "DETAIL X", "zone": "C10",
    "description": "...", "scope": "grip length only"
  },
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

`joint` is optional and free-form: the same assembly/context block a stack's
own `joint` carries (`assembly_drawing`, `assembly_revision`, `sheet`, `view`,
`zone`, `zone_note`, `description`, `scope`), added 2026-09-08 (handoff
`topology_schema_v1`) for a topology that re-expresses, or documents, one
physical joint. `topology_vpa_output_to_pitch_plate.json` carries one that
mirrors its stack's field for field, since both documents describe the same
joint; `topology_pitch_system.json` carries none, because it is not one joint
— it is a whole mechanism. Prose, not a toleranced value: nothing here is
`fold()`'s to read, and there is no `dimension_ref`-style resolution for it —
if the topology's and the stack's ever disagree, the stack's wins, the same
rule `provenance.structure`'s reading of element order already follows.

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
system: `topology_pitch_system.json` declares
`provenance.worksheet: "docs/tolerance_stacks/WORKSHEET_end_stop_graft.md"`,
which shares no stem with `pitch_system` at all, so only the declared rule
finds it. Emitted into the projection as `worksheet_file`/`worksheet_source`,
the same field names `results.json` already carries for a stack. The worksheet
lives on the **topology**, not the study: a source workbook documents the
whole system's rows, and several studies over one topology share one
worksheet, the same many-studies-one-topology relationship the format already
has everywhere else.

---

## The committed examples

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

### L2 — `topology_pitch_system.json` + seven studies

The structure. 12 parts, 21 interfaces, 24 edges, 5 branch points, 4 grounded
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
founding every one of its 23 dimensioned edges was a workbook cell that traces
nothing (0 of 43, per `WORKSHEET_end_stop_graft.md`); handoff
`endstop_location_stack` (2026-09-06) re-cited six of those edges against
drawings instead (`provenance.retrace_update_20260906`), and handoff
`mechanical_stroke_stack` (same day) added a 24th, `kind: "assumed"` for want of
any source at all (`provenance.mechanical_stroke_extension_20260906`) — so the
current split is 9 `workbook` / 6 `drawing` / 9 `kind: "assumed"`, of 24
dimensioned edges. The `kind: "assumed"` group alone says
`PLACEHOLDER` in their notes, which a test enforces. Every dimension in it is
**variation-only** — `nominal: 0.0`, band `±w/2` about an unstated nominal —
because the source holds tolerance widths, not dimensions. Do not quote a number
out of it without reading its own `source_ref.confidence` first.

### `topology_pitch_link_to_pitch_plate.json` + three studies

Handoff `linear_stack_conversions` (2026-09-08), re-expressing the reviewed,
committed `docs/tolerance_stacks/stack_pitch_link_to_pitch_plate.json` (6
elements, 3 paths, 2 checks) as a graph, the same L1 pattern:
`dimension_ref`-only edges, no copied numbers. The graph: 4 parts, 7
interfaces, 8 edges, 3 branch points, 2 grounded loops, 1 gap edge. Unlike L1,
the bolt's own three fastener dimensions (grip, overall length, cotter-hole
location) share additional interfaces of their own (the bolt's point, the
cotter-hole centreline), which is what gives this graph two grounded loops
rather than L1's one. The pitch-link eye / spherical bearing — the joint's own
unsourced, missing member — is not modelled as a node or edge, exactly as the
stack's own checks record it in `excluded_terms`.

- `study_pitch_link_shank_out.json` — reproduces stack path
  `clamped_stack_sourced` extended with the fastener grip, and carries check
  `shank_out__11_sourced_only` with no `limit` (the study's own total already
  is the check's quantity).
- `study_pitch_link_cotter_hole_clearance.json` — combines path
  `head_to_cotter_hole` and path `clamped_stack_sourced` into ONE chain over
  the shared graph rather than composing two separate `StudyResult`s, and
  carries check `cotter_hole_clear_of_sourced_stack`.
- `study_pitch_link_thread_region_t.json` — reproduces path `thread_region_T`,
  the stack's own "provenance cross-check, not a design quantity" (it equals
  NAS6403's T (Ref)). No `checks` entry: the referenced stack has none over
  this path either.

### `topology_rotor_fastener_length.json` + nine studies

Handoff `linear_stack_conversions` (2026-09-08), re-expressing
`docs/tolerance_stacks/stack_rotor_fastener_length.json` (11 elements, 1 path,
9 checks — the repo's first genuine grip-**selection** joint, not one fixed
as-drawn dash). The graph: 3 parts, 4 interfaces, 12 edges, 2 branch points, 9
grounded loops, 1 gap edge. The nine as-drawn NAS6403 grip options are
parallel edges between shared interfaces, all naming a single part
(`fastener_family`, see its own note for why); a study selecting more than one
at once is refused by `BranchAmbiguity` at both of those interfaces, which is
this topology's own mechanical enforcement of "exactly one dash is ever
installed."

- `study_rotor_fastener_grip_u2h.json`, `study_rotor_fastener_grip_u3h.json`,
  `study_rotor_fastener_grip_u4h.json`, `study_rotor_fastener_grip_u5h.json`,
  `study_rotor_fastener_grip_u6h.json`, `study_rotor_fastener_grip_u7h.json`,
  `study_rotor_fastener_grip_u8h.json`, `study_rotor_fastener_grip_u9h.json`,
  `study_rotor_fastener_grip_u10h.json` — one study per grip option (U2H, U3H,
  U4H, U5H, U6H, U7H, U8H, U9H, U10H), each selecting its own
  `fastener_grip_uXh` edge plus the two washer edges,
  and each carrying its own `grip_budget__uXh` check with no `limit`. **Nine
  studies, not one**, despite the referenced stack's own single `path` — see
  this topology's own notes and the handoff's lesson: `check_study`'s `limit`
  shape folds an external budget as a zero-width point value, which would
  silently drop each fastener's own tolerance band, so only the no-`limit`
  branch (a study's own chain) reproduces all nine checks exactly, and a
  study's chain is fixed per selection.

### `topology_tan_link_to_pitch_plate_take2.json` + one study

Handoff `linear_stack_conversions` (2026-09-08), re-expressing
`docs/tolerance_stacks/stack_tan_link_to_pitch_plate_take2.json` (9 elements,
1 path, 1 check). The graph: 4 parts, 7 interfaces, 7 edges, 0 branch points,
1 grounded loop, 1 gap edge. The closest structural cousin to L1: a clamped
stack in series against a parallel fastener grip, with one genuine inverting
element (`bushing_chamfer`, authored running the opposite way so a forward
chain crossing subtracts it, matching the referenced stack's own `total` path
sign). The stack's own three `nut_geometry` elements (nut minor diameter,
counterbore diameter, chamfer depth) are diametral, unused by any path or
check in the referenced stack, and are not modelled here — see this
topology's own `provenance.structure`. `tan_link_to_pitch_plate` itself (the
take-1 stack) is NOT converted: its six checks reference paths in a way this
document's "A study, in outline" section fences — see
`docs/sessions/lessons/LESSONS_20260908_linear_stack_conversions.md`.

- `study_tan_link_take2_worst_case_protrusion.json` — reproduces check
  `worst_case_protrusion` with no `limit`.

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
   where it was.

Extensibility the brief names and this version does not build: edge
stiffness/strength/mass. Same bag, same rule.

**A fifth item, found by this schema pass rather than by building L2**: a check
whose terms combine several named term lists (a stack's `path`-referencing
checks) has no topology equivalent — see "A study, in outline"'s
path-referencing-checks paragraph, above, for the finding and why it is fenced
rather than closed.
