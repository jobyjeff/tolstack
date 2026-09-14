---
priority: med
depends_on: [viewer_dag_spine_layout, viewer_leader_grid_legibility]
model: opus
---

# HANDOFF 2026-09-14 — viewer_study_respine_animation: selecting a study animates its chain onto the spine

Source: the viewer-arcs locked brief's decision 5 (dispatch
`docs/strategy/HANDOFF_20260910_tolstack_viewer_arcs_strategy.md` — "extra
credit / phase 2", deliberately staged LAST), now unblocked: the leader grid
and edge-length scaling have landed and `viewer_dag_spine_layout` makes the
right-justified spine the default layout. Jeff re-confirmed wanting this in
the 2026-09-14 session ("I asked for this before (including smooth animation
when the dag rearranges itself)"). Baseline: `integration` after BOTH
dependencies merge. Scope: `apps/viewer/` display code + tests. Do NOT
touch `scripts/build_*` or projection schemas.

## Deliverables

1. **Study selection re-spines the DAG, animated.** With the default layout
   already a right-justified spine (the walk's mainline), selecting a study
   whose chain is NOT the current spine rearranges: that study's chain
   becomes the right-justified linear run, the rest of the graph re-lays
   around it to the left, the grid rows re-order to the chain's own order
   (the existing "Showing: study chain" re-lay), and the leaders follow —
   as one smooth animated transition, not a repaint. Deselecting animates
   back to the default walk spine.
2. **Interpolate the position store; do not build a second layout path.**
   The seam was left deliberately: geometry is a pure function of
   `(layout, metrics, positions)` and `VA.rowPositions` returns a keyed
   store (node id → y, edge id → segment) — compute the target store, then
   interpolate old → new per frame and redraw both geometry passes from the
   interpolated store. If `viewer_dag_spine_layout` added x-keys to the
   store, interpolate those the same way. A node absent from one side
   (study re-lay drops non-chain rows in chain view) fades, never teleports.
3. **Honest states survive mid-animation and after.** Floored "not to scale"
   marks, provenance bar colors, the selected-study accent and the leader
   endpoint contract all hold at the animation's END state exactly as they
   do today (the correspondence checks run on settled geometry; don't try
   to assert mid-frame). Respect `prefers-reduced-motion`: reduced = jump
   to the end state, no tween.

## Definition of done

- Real `pitch_system`: selecting each study animates its chain onto the
  spine and back; no console errors; settled geometry passes the full
  correspondence matrix in both layouts and all edge-length modes.
- Fast + truth tiers green; the truth tier asserts the settled end-state
  geometry after a study select/deselect cycle equals a fresh render of the
  same selection (animation must be presentation-only, zero geometry
  drift).
- Lesson: measured animation cost on the 45-slot pitch system (frame
  budget), and anything the store interpolation could not express.
