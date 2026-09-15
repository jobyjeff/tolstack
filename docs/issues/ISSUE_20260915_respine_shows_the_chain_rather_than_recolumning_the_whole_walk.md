---
type: feature
priority: med
status: open
area: viewer/topology
reporter: agent
audience: strategy
---

# A respine shows the study's chain; it does not re-column the whole walk around it

`viewer_study_respine_animation` shipped the respine as **the existing chain
layout, animated**: selecting a study switches the page to
`StudyResult.chain` — one rail, right-justified, in the order the sum runs —
and the rows the chain does not contain fade out. "Showing: whole topology"
puts the walk back with the chain marked on it.

That is one of two readings of what was asked for, and the handoff carried
both. The other one is the strategy brief's own words (dispatch
`docs/strategy/HANDOFF_20260910_tolstack_viewer_arcs_strategy.md`, decision 5):

> Selecting a study rearranges that stack's components into a grid-aligned
> linear run on the right, **rest of graph rearranges around it**, table moves
> with it, animated.

and the tactical handoff repeats it — *"that study's chain becomes the
right-justified linear run, **the rest of the graph re-lays around it to the
left**"*. Under that reading the whole walk stays on screen and is
**re-columned** so the selected chain occupies the rightmost rail and
everything else forks away to its left.

## Why the shipped reading was chosen

The same handoff's deliverable 2 says, in as many words, *"A node absent from
one side (**study re-lay drops non-chain rows in chain view**) fades, never
teleports"* — which only describes the chain layout, because the walk drops
nothing. And the handoff's hard constraints rule the other reading out for a
tactical session:

- **"Interpolate the position store; do not build a second layout path."**
  Re-columning the walk around an arbitrary chain is a new layout computation
  over the graph: rail allocation, rail continuity, column reuse and the
  one-dashed-curve-per-cycle invariant all have to come out right for a root
  the walk did not pick.
- **"Do NOT touch `scripts/build_*` or projection schemas."** Column
  allocation is where the repo keeps claims about the graph — in Python, with a
  pytest pinning it (`apps/viewer/topology.js`'s own comment on `VA.spineRight`
  says why the right-justification is a *reflection* and not a layout engine:
  a bijection on column indices preserves every one of those invariants, and
  nothing weaker does).
- `docs/DAG_TOPOLOGY.md`'s **"not a solver"** fence, and
  `ISSUE_20260914_branch_leaders_still_cross_the_rails_right_of_them.md`, which
  already files the neighbouring layout-policy question and records that every
  way out of it is a policy change the "no heuristic root" rule fences off.

## What a strategy session has to decide

Whether "re-spine the walk itself" is wanted at all, now that the chain
re-spine exists and is one click from the marked walk. If it is:

1. **Where the re-columning lives.** A study-rooted serialisation is a claim
   about the graph, so by this repo's own rule it belongs in
   `scripts/build_topology_projection.py` — emitted per study alongside the
   chain layout it already emits, pinned by a pytest. That is a projection
   schema change and a rebuild, which is exactly what this handoff was told
   not to do, and it is the honest home for it.
2. **What "root the walk at a chain" even means** when the chain is not a
   suffix of any depth-first walk of the graph — `pitch_system`'s studies
   visit edges the walk emits on three different columns. There may be no
   walk with that chain as its mainline, in which case the feature needs a
   weaker definition (a walk that *prefers* the chain's edges?) and a
   statement of what it does when it cannot have one.
3. **Whether the animation carries over unchanged.** It would: the tween
   pairs the two stores by element id, so it does not care which
   serialisation either side is, and both would be right-justified. The one
   thing that would improve is the horizontal slide — with the column count
   equal on both sides, `VA.respineShift` would come out at zero and the page
   would move in y alone. See
   `ISSUE_20260915_a_respine_cannot_interpolate_x_so_the_whole_block_slides.md`.

Nothing is blocked on this: the shipped respine satisfies the deliverable's
own definition of done and Jeff's own re-confirmation ("smooth animation when
the dag rearranges itself"). This is the bigger feature behind it, with no
owner once `viewer_study_respine_animation` completes.
