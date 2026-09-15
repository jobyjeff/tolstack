# BRIEF 2026-09-15 — what a respine should mean, and how much of the page moves through one

> Routed here by the triage sweep of 2026-09-14/15 from two issues about
> `viewer_study_respine_animation`. Both are "the shipped behaviour is one
> defensible reading of an ambiguous requirement" rather than defects — and the
> first one's ambiguity traces back to a strategy decision's own wording, so it
> has to be resolved at that level, not by a tactical agent picking again.

Source issues:
- `docs/issues/ISSUE_20260915_respine_shows_the_chain_rather_than_recolumning_the_whole_walk.md` (med, feature)
- `docs/issues/ISSUE_20260915_the_grid_cross_fades_through_a_respine_instead_of_moving_its_rows.md` (low, feature)

## 1. The requirement had two readings and the handoff carried both

What shipped: selecting a study switches the page to `StudyResult.chain` — one
rail, right-justified, in the order the sum runs — and the rows the chain does
not contain fade out. "Showing: whole topology" puts the walk back with the chain
marked on it.

The other reading is the strategy brief's own words (dispatch
`docs/strategy/HANDOFF_20260910_tolstack_viewer_arcs_strategy.md`, decision 5):

> Selecting a study rearranges that stack's components into a grid-aligned linear
> run on the right, **rest of graph rearranges around it**, table moves with it,
> animated.

and the tactical handoff repeats it — *"that study's chain becomes the
right-justified linear run, **the rest of the graph re-lays around it to the
left**"*. Under that reading the whole walk **stays on screen** and is
re-columned so the selected chain occupies the rightmost rail and everything else
forks away to its left.

**Why the shipped reading was chosen, in fairness to it:** the same handoff's
deliverable 2 says *"A node absent from one side (study re-lay drops non-chain
rows in chain view) fades, never teleports"* — which only describes the chain
layout, because the walk drops nothing. So the handoff's own deliverables
contained both readings and the agent picked the one its animation contract
described.

This is the decision to make: is a respine a **view switch** (today) or a
**re-columning** (the brief's words)? They are materially different features —
the second keeps the whole graph legible in context and is what decision 5
appears to have wanted; the first is simpler and is shipped and working. Note
that re-columning interacts directly with
`BRIEF_20260914_dag_layout_geometry_tradeoffs` item 2: if column order becomes
something a study selection rearranges, the no-heuristic-root rule and the
column-repacking question there are the same conversation. **Read that brief
before deciding this.**

## 2. The grid cross-fades; its rows do not move

`viewer_study_respine_animation` moves the **DAG** — every dot, bar, rail mark
and leader travels from its old slot to its new one, interpolated out of the
keyed position store. The **grid beside it does not**: the incoming table is
drawn in the target order at opacity `e` while the outgoing one fades from `1`
over it, so a reader sees one table resolve into another rather than rows sliding
into place.

That was deliberate and is recorded in `apps/viewer/README.md`, for two reasons
that are both still true:

- **the grid's rows are not positioned from the store at all.** The table's pitch
  is fixed at `rowHeight` and only the *block's* `gridOffset` tweens — which is
  the landed contract the leaders' grid-side seams are computed from
  (`viewer_dag_spine_layout`: "the block moves, the pitch does not");
- **the two tables cannot be lined up.** A chain's grid rows are a different
  subset of the edges, in a different order, at a different count; drawn solid
  over each other at `e = 0` they read as garbled text. This was **measured** —
  it was the first cut, and the screenshot is why the shipped version is a
  cross-fade.

What a better version needs, per the issue: a FLIP-style per-row transition —
measure each surviving `<tr>`'s box before and after, then `transform:
translateY()` each from its old position to zero while leaving rows fade in
place. The obstacle is the fixed-pitch contract above, which the leader seam
geometry depends on. So this is not "add FLIP"; it is "decide whether the
grid's pitch may become dynamic, and what that does to the leader seams."

Sequence this **after** item 1: if a respine becomes a re-columning rather than a
view switch, the surviving-row set changes completely and any FLIP work done
against today's chain-subset semantics is wasted.

## Deliberately out of scope for this brief

Two concrete defects in the shipped tween machinery are routed to
`HANDOFF_20260915_respine_tween_fidelity` and are being fixed now, independently
of this decision:

- `ISSUE_20260915_a_respine_cannot_interpolate_x_so_the_whole_block_slides` —
  deselecting a study slides the DAG in from off the pane's left edge.
- `ISSUE_20260915_a_settled_tween_store_is_not_the_target_store_it_keeps_the_outgoing_sides_keys.md`

They are bugs in the animation as built, not questions about what it should do,
so they should not wait on this brief. If a decision here replaces the respine
wholesale, say so in the brief's outcome and that handoff can be re-scoped or
dropped — check whether it has already merged before assuming its code survives.
