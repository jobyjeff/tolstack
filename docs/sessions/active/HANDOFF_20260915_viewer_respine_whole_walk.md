---
priority: med
depends_on: [respine_tween_fidelity_round2]
model: opus
---

# HANDOFF 2026-09-15 — viewer_respine_whole_walk: selecting a study never hides the topology

Source: Jeff's 2026-09-15 review (forge note `20260915T145908_fwc7qp`):
"When you click a study/stack, the entire dag/model should still be visible.
It should be fairly obvious that there are no leader lines pointing to
certain elements. We could also dim unused elements if it isn't clear
enough. Actually I'm not sure what's going on here. Cotter hole clearance
and shank out studies both have additional visible elements on the dag
outside of the ones included in the stack, but 'thread region T' doesn't."
This decides item 1 of
`docs/strategy/BRIEF_20260915_respine_scope_and_grid_motion.md` (marker
updated by the 2026-09-15 strategy session): **a respine is not a view
switch** — the whole walk stays on screen. Baseline: `master` @ `3141e51` +
`respine_tween_fidelity_round2` merged (it fixes the tween machinery this
handoff re-targets; check whether it merged before assuming its code shape).
Scope: this session owns the study-selection semantics in
`apps/viewer/topology_app.js` / `views/topology.js` and their tests. Do NOT
touch `apps/annotate/` or the verdict/gaps rendering (owned by
`viewer_study_verdicts_and_gaps`).

## The decided behavior

1. **The DAG always shows the whole topology walk.** Selecting a study no
   longer switches to a chain-only layout. The selected study's chain is
   emphasized in place: leader lines run only to chain rows, and non-member
   nodes/edges dim. Deselecting restores full emphasis. (The "Showing:
   whole topology / chain" toggle this obsoletes should go — one behavior.)
2. **The grid shows the chain's rows** when a study is selected (as the
   chain view does today) — the DAG keeps context, the table shows the sum.
3. **Consistency is the point.** Jeff read today's behavior as a bug because
   thread-region-T's chain covers ~every visible element (nothing visibly
   faded) while the other two studies dropped rows. After this change the
   rule is uniform: same layout always, emphasis varies. A test should pin
   the invariant that node/edge count on screen is identical before and
   after any study selection.
4. **No re-columning.** Column order and the rail layout are untouched — the
   open geometry questions
   (`docs/strategy/BRIEF_20260914_dag_layout_geometry_tradeoffs.md`) stay
   where they are. This handoff is emphasis + leaders + grid subset only.
5. The tween/position-store machinery from the respine work is reused where
   it helps (leaders retargeting, grid block movement); dimming transitions
   should be cheap CSS, not new tween code.

## Definition of done

- On the live pitch-link topology: selecting each of the three studies keeps
  all 7 nodes / 8 edges visible, dims non-members, draws leaders only to the
  chain, and the grid shows exactly the chain rows; deselecting restores the
  walk. Behavior identical in kind across all five topologies.
- Value-level tests pin the on-screen element count invariant and the
  leader-target set per pitch-link study; full suite green.
- Lesson: what survived from the chain-view implementation, and anything the
  grid-motion question (brief item 2, still open) needs to know about the
  new row-subset semantics.
