# LESSONS 2026-08-31 — dag_topology_format

Handoff `docs/sessions/active/HANDOFF_20260831_dag_topology_format.md`, from the
locked brief `dispatch/docs/strategy/HANDOFF_20260831_tolstack_dag_strategy.md`.
Delivered: `tolerance_stack/topology.py`, `docs/topologies/` (two topologies,
five studies), `docs/DAG_TOPOLOGY.md`, `tests/test_topology.py`,
`ARCHITECTURE.md`/`README.md` rows, and the `CLAUDE.md` add-on.

Everything below is a decision that was **not** in the handoff, or a thing the
next agent cannot derive from the code.

---

## 1. Identity-key compatibility — how the brief's watch item was actually met

The brief's watch item: *"Keep node/edge identity keys compatible with tolstack's
existing element identity conventions so the two tools converge instead of
forking vocabularies."* Three things were done, and the third one is the
non-obvious one.

**a. `SourceRef` is imported, not re-declared.** A topology edge's value carries
the same `SourceRef` object a stack element does, with the same
`SOURCE_REF_KINDS` and `CONFIDENCES` tuples enforced by the same constructor. So
the citation vocabulary has one definition across all three archetypes, and the
`element_id`/`run_id` slot that has been held open for feature identity since
slice 1 is the slot a 3D-annotation surface will resolve — for topology edges
too, at no extra cost.

**b. An edge can *reference* a stack element rather than restating it.**
`dimension_ref: {"stack": "<repo-relative path>", "element": "<id>"}`, resolved
at load. `element_id` within a stack file is therefore the identity key a
topology cites, which is exactly the existing convention rather than a parallel
one.

**c. `role` had to become optional, and that is the one place the vocabularies
genuinely diverge.** `ELEMENT_ROLES` is the *grip-stack* vocabulary — `bushing`,
`washer`, `clamped_member`, `fastener` — and a pitch link's length or a gas-spring
body height is none of those words. Two exits were considered and refused:

- **adding words to `ELEMENT_ROLES`** — it pollutes a vocabulary the SOP teaches
  to grip-stack authors, and it would force an SOP edit, which this handoff was
  told not to make (`tests/test_sop_vocabulary.py` pairs the SOP's pipe-list
  against the tuple, so the two cannot move separately);
- **a second value shape with its own citation fields** — the exact vocabulary
  fork the watch item exists to prevent.

So `Dimension` is `StackElement` with `role` optional and everything else
identical, and a `role` that *is* one of `ELEMENT_ROLES` is still validated
against that tuple. What made this safe rather than sloppy: **which part a
dimension belongs to is now structural** — read off the edge's `part` — which is
most of what `role` was carrying. If a future handoff wants a topology-native
edge taxonomy, that is the argument to re-open, and it should be re-opened as a
question about `role`, not solved by adding a second field.

**Duck typing, and the guard that makes it honest.** `Dimension` is not a
`StackElement` and is handed to `Term` anyway (`Term.element`'s annotation is not
enforced at runtime). `test_dimension_exposes_every_attribute_fold_reads` parses
`fold`'s own source for every `element.<attr>` it touches and asserts `Dimension`
has each one, so widening `fold`'s view of an element fails there by name instead
of raising `AttributeError` in the middle of a projection build. That test is the
reason the duck typing is acceptable; do not delete it and keep the duck typing.

## 2. A node belongs to the parts that meet at it — the edge carries the part

The first cut had `Node.part: str` (one owner) and derived `structural` vs `gap`
from "are both nodes on the same part". It does not work, and the failure is
instructive: a mating surface is *one surface belonging to two parts*, so a
strict one-owner model forces every hard face-to-face contact to become two nodes
joined by a zero-length gap edge. That doubles a grip stack's node count for no
information and makes `gap` mean two different things.

Final shape:

- `Node.parts` — one or two ids (`mating_surface` ⇔ two, `datum_feature` ⇔ one).
- `Edge.part` — required on `structural`, forbidden on `gap`.
- Invariants, both checked at load: a structural edge's `part` must be on **both**
  its interfaces; a gap edge's interfaces must share **no** part.

Consequence worth knowing: **a hard contact is one node**, and a `gap` edge is a
real distance across a clearance. The two committed gap edges are the pair to
read — `shank_out` (derived: no dimension, the quantity a study computes) and
`end_stop_clearance` (toleranced: an ordinary term). Whether a gap is a term or
an answer depends only on whether anyone toleranced it, which is a nicer property
than it sounds: the L1 stack's *check* turns out to be the closure of a loop, and
the residual is a gap edge. `Study.closes` names it, and that is the bridge
between the topology vocabulary and the existing `checks` vocabulary.

Both `kind` fields are derivable from the part membership and are therefore
**checked** rather than derived silently. That was a deliberate call: carrying the
label costs a word in the JSON and buys a load-time message when an interface is
mis-assigned, instead of a wrong lane colour a reader has to notice.

## 3. A sensitivity belongs to a study, not to an edge — with one exception

This was the hardest design question and it is not obvious from the handoff,
which says only *"per-element contribution (value × transform)"*.

The tempting model is *cumulative*: a transform on an edge changes the coordinate
frame for everything beyond it, and contributions pick up the product of the
ratios between them and the output. It is elegant and it is wrong for this
mechanism — the output (blade angle) sits at the *blade root* end while the
sensitivities differ per contributor *group*, and Jeff's end-stop workbook proves
the per-contributor reading is the real one: it has **three** sensitivity columns
(D10 vertical, D11 = D10 × 50/32 blade-root tangential, D12 = D10 × K12
pitch-plate tangential) applied to different row groups of one sheet.

So: **a transform is one edge's sensitivity to the study's output quantity.**
Which means it depends on what is being measured, which means it belongs to the
*study* — hence `Study.transforms`, an override map layered over each edge's
default. The case that settled it: that same workbook runs **two** parallel
result columns (worst-case and full-sweep-average motion ratio) over one set of
rows. Two sensitivity sets over one graph is not two graphs, and a schema that
forced it to be would double every future structural edit.
`study_pitch_system_blade_angle_{worst,average}.json` are that pair.

**The one exception, and why it is one.** `pitch_arm_link_hole_to_clocking_hole`
carries a non-identity transform as its own default, because at the pitch arm the
linear↔rotary conversion is the *geometry of the part*: a displacement across
that edge is an angle at the blade, whatever you are measuring. Everything
upstream is millimetres and needs a study to say which sensitivity applies. A
test (`test_the_coupling_edge_is_the_only_declared_non_identity_default`) holds
the exceptions to that one, so a second one has to re-make the argument rather
than accumulate quietly.

Direct consequence a reader will hit: **a millimetre study that crosses the
coupling raises `UnitMismatch`**, and that is correct, not a bug —
`study_pitch_system_vertical_hub_to_pitch_arm.json` therefore stops at the
interface just before it. Pinned as a test.

## 4. Cycle detection runs before the walk, and the reason is the error message

With the "exactly one unconsumed edge per node" rule, a ring in a selection
**always** surfaces during the walk as `BranchAmbiguity`, at whichever of the
ring's nodes the chain reaches first — both of that node's ring edges are
unconsumed there. Which means the in-walk `visited`-set guard I wrote first was
unreachable dead code.

It would have been defensible to delete it and let a loop be reported as a fork.
It is not defensible to *report* it that way: "you are standing at a branch
point, choose one" tells someone whose selection closes a ring to do the wrong
thing. The fix is not to choose a branch, it is to stop selecting the closure.

So the loop is detected up front by union-find over the selection, reported as
`CycleDetected`, and named by **the edge whose addition closed the ring** — which
is not the only edge on the cycle and does not claim to be; it is the one a
reader can remove to make the selection a chain. The walk then needs no visited
set at all, which is noted in `traverse`'s docstring so nobody re-adds one.

## 5. The L2 topology is variation-only, and that was not in the handoff

Every dimension in `topology_pitch_system.json` has `nominal: 0.0` and a band of
`±w/2`. The handoff said *"use nominal/placeholder values where no sourced number
exists"*, and the honest reading of that turned out to be: **do not invent
nominal lengths at all.** The source sheet holds a column of total *tolerance
widths*, not dimensions (its own row 72 comment: "note this is total range
(divide by 2 for +/-)"), so a band about an unstated nominal is what the source
actually says.

The alternative — real nominals where known, zero elsewhere — was refused
because it produces the repo's characteristic failure: a `nominal` total that
reads as a position sum when most of its terms are variations, i.e. a
plausible-looking number with no meaning. A test enforces the property and the
document's `provenance.variation_only` explains it. **If real nominals arrive,
they arrive for every edge at once, or in a separate topology.**

Nominal geometry that *is* known (pitch arm radius 50, blade root radius 32,
pitch link length 109.4 at a 77° link angle, gas-spring bushing separation 34.7)
lives in `properties` on the edge or transform it belongs to. It is context for a
transform, not a term.

## 6. What the viewer handoff (`dag_viewer_poc`) needs to know

- **Read `docs/DAG_TOPOLOGY.md` first**, then `topology.py`'s module docstring.
  Do not re-derive the model from the JSON.
- **The lane grouping is derived, not authored.** `Topology.edges_on_part(part)`
  gives a part's structural edges (its rail) and `nodes_on_part(part)` gives the
  interfaces where that rail meets others. A `gap` edge is what crosses between
  lanes and has no `part` — decide deliberately how to draw it; it is the one
  edge kind with no rail of its own.
- **`Topology.branch_nodes()` is the fork marker** the git-graph look needs.
  L1 has none (it is a chain plus a closing gap); the pitch system has four
  (`hub_lower_bearing_flange`, `hub_top_deck`, `piston_rod_end_bore`,
  `pitch_arm_blade_root_clocking`). Mock the layout against the pitch system, per
  the brief's suggestion — L1 will not exercise anything.
- **Grid rows align to `StudyResult.chain`, which is ordered.** Each
  `Contribution` carries `entered_at`/`left_at` (so a row can be tied to the two
  nodes it spans, which is what makes rows line up with the DAG), `sign`,
  `transform`, `weight`, the raw `value_*` and the signed/scaled contribution.
  `Contribution.as_dict()` and `StudyResult.as_dict()` exist for exactly this and
  are the shape to project — **do not recompute anything in JS.** The viewer
  computes nothing, per `README.md`; a second arithmetic path is a second place a
  sign can be wrong.
- **Render the errors, do not swallow them.** `BranchAmbiguity`, `BrokenChain`,
  `CycleDetected` and `UnitMismatch` all carry messages written for a human
  author, naming the node and the candidate edges. A study that raises one is a
  real state the page should show — an author lassoing interactively will hit
  branch ambiguity constantly, and the message *is* the feature.
- **`source_ref` is the same object the stack viewer already renders**, crop
  pipeline included. An L1 edge's citation *is* the stack element's citation, so
  the preview pane should work with no new plumbing. `assumed`-kind refs (all
  over L2) have no document behind them — check how the existing viewer treats
  `kind: "assumed"` before assuming a crop exists.
- **Two topologies model the same physical joint at different levels.**
  `piston_rod_end_bore` in the pitch system is the joint
  `topology_vpa_output_to_pitch_plate.json` models axially. Joining them is a
  design decision nobody has made — do not silently splice them in the viewer.

## 7. Open modelling questions for Jeff

Ranked by how much they block. The first three are in the documents' own notes
too, so they surface where the numbers are.

1. **The motion ratio's operating condition (blocks any real number).** `D10`
   = 1.67 deg/mm sits in a column headed "pitch −5deg (worst)", its own comment
   reads "full sweep average", and row 9's comment says "at 40deg pitch". Three
   conditions named around one constant. `WORKSHEET_end_stop_graft.md` flagged
   this as F1 on 2026-08-25 and it is still open. Every degree this archetype
   produces depends on it.
2. **`blade_root_clocking_to_oml` has no linear precursor at all.** The source
   states 0.181° directly with Jeff's own comment "Probably closer to .03deg" — a
   factor of six, from the author. The committed band is a visible stand-in and
   the single value in the pitch-system document most in need of him.
3. **Is the bushing flange a feature of the same part as the straight bushing?**
   (L1.) Modelled as two parts because the referenced element names no part for
   the flange. Changes no total — a structural dimension and a gap fold
   identically — but it changes the rail rendering and what a 3D-annotation
   surface must resolve.
4. **Does the L1 clamped-member order match the real joint?** The axial order is
   taken from the source workbook's row order. The sum does not depend on it; a
   reader looking at a rail diagram will nonetheless read it as physical. One
   look at 217755 sheet 5 DETAIL X settles it.
5. **Two rows the source itself says are wrong**, carried forward unchanged
   because correcting them is not this handoff's call: row 26 ("need to correct —
   based on undersized hole for match drilling") and row 57 ("does not exist yet.
   Must roll up ring gear seat and tan link mount position", carrying a real 0.2
   mm value into every downstream sum).
6. **How should a load case be named?** The ring gear participates cyclically and
   follows along for pure collective. Today that lives entirely in which edges a
   human puts in a `selection`, unlabelled. A study-level `configuration` block
   is the cheap shape (the stack schema already has one on checks) — but only if
   the distinction needs a name.

### And three things v0 provably cannot express

Found by building L2 against the workbook, which is exactly the sanity check the
brief asked for. Recorded in `docs/DAG_TOPOLOGY.md`, "What v0 cannot do", because
they are schema findings rather than session notes:

1. **A weight computed from `properties`.** The workbook applies a diameter-MMC
   weighting factor built from two blade-root radii to three of its rows. One
   ratio per edge cannot express it, so a study over those edges does *not*
   reproduce the sheet's numbers — stated on the edges themselves so nobody
   assumes equivalence. This is probably what the next `TRANSFORM_KINDS` word is.
2. **A contributor that is not a chain edge.** The workbook's *largest* single
   angular contributor (row 68, gas-spring bushing tipping backlash, 0.72°) comes
   from a radial clearance acting over two lever arms. No axial chain carries it.
   It is also excluded from that sheet's own headline total (F3 in the worksheet),
   so the source has the same gap.
3. **The third sensitivity column.** `D12 = D10 × K12` where `K12` is a
   finite-difference linearisation of the pitch link's geometry at its nominal
   77°. Copying the resulting constant here would present a derivation as a
   datum, so it is deliberately not declared — which is why
   `study_pitch_system_gas_spring_branch.json` is a millimetre study.

So the brief's *"the pitch-system L2 case should be able to represent that
workbook's structure"* is **true of the structure and not yet true of the
arithmetic**, and that distinction is the most useful thing this handoff
learned.

---

## 8. Process notes

- **The `CLAUDE.md` add-on collided with a documented convention.** `CLAUDE.md`
  is gitignored in tolstack — with the rule stated in `README.md`, enforced as a
  `REVIEW_AGENT.md` checklist item, and encoded in
  `test_tolerance_stack._HISTORICAL_NAMES` — while drawing-checker and forge both
  track theirs. Filling the stub in the main checkout (a gitignored file's home,
  per the worktree rule) does the brief's job now; un-ignoring it would have been
  a repo-policy change three documents and a test constant wide, and not this
  handoff's to make. Filed as
  `ISSUE_20260901_tolstack_claude_md_is_gitignored_while_sibling_repos_track_theirs.md`,
  routed to strategy, with the filled file named as the content to commit if the
  answer is "track it". **Note for whoever picks that up:** the ignore rule's
  stated premise — "replaced per-session by dispatch" — looks false; the stub has
  not changed since 2026-08-20.
- **Adding a module to `tolerance_stack/` owes `ARCHITECTURE.md` a row**, and
  `tests/test_architecture_inventory.py` will tell you so. It also refuses any
  quantifier in that block it cannot read from the tree — including number
  *words* — so write the row's sentence without counting anything.
- **`tests/test_dc_snapshot.py::test_a_removed_entry_is_reported_as_removed` is
  flaky**, ~1 failure in 5 isolated runs, and it is pre-existing: the suite with
  this handoff's module excluded reproduces it, and it asserts a directory mtime
  moved. Filed as
  `ISSUE_20260901_dc_snapshot_removed_entry_test_is_flaky_on_directory_mtime.md`.
  If you see it red, it is not yours — that is most of why the issue exists.
- **Documents live in `docs/topologies/`, not `docs/tolerance_stacks/`**, and that
  is load-bearing: `tests/test_tolerance_stack.py` globs `stack_*.json` in the
  latter and applies grip-stack schema hygiene to every match. A topology dropped
  in beside the stacks would be picked up by tests that cannot read it.
