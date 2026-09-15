---
priority: med
depends_on: [viewer_dag_spine_layout]
model: opus
---

# HANDOFF 2026-09-14 — viewer_dag_hover_cards: crop-thumbnail hover cards on DAG bars and dots

Source: Jeff's live review (strategy session 2026-09-14): "Add thumbnail
previews for cross references to more places in the ui: dagview node/edges
in particular." Baseline: `integration` after `viewer_dag_spine_layout`
merges. Scope: `apps/viewer/` (`views/topology.js` rail hover surfaces,
`views/cards.js`, `topology_app.js`, tests). Do NOT touch the jog-zone /
leader presentation or grid columns (owned by the parallel
`viewer_leader_grid_legibility`); do NOT touch `scripts/build_*` or
projection schemas.

## Deliverables

1. **Edge card on the rail bar.** The hover cards shipped by
   `viewer_hover_cards_and_deep_links` (2026-09-10) live only grid-side (the
   row's crop trigger, the merged component cell, the sourcing chips).
   Extend the EDGE card — same card, same `VA.cropForKey` resolution, same
   single fixed-position popover node — to the DAG's own edge hover surface.
   The hit path already exists: `.rail__barhit` (the invisible whole-edge
   hover line) currently carries only a title tooltip; hovering/focusing it
   should open the edge card with the crop thumbnail, citation line and
   deep links, exactly what the grid trigger opens. One hover surface
   discipline: the card replaces/absorbs the plain title, not stacks on it.
2. **Node dot hover.** A node is an interface — usually between two parts.
   On dot hover, show what the leader/preview pane already knows, card-form:
   which two parts meet there (or that the node is internal to one part),
   with the adjacent parts' COMPONENT-card thumbnails where they resolve.
   Absent-is-absent (README, component card): a part with no crop-bearing
   row gets no thumbnail, never a placeholder.
3. **No invention, no layout disturbance.** Cards are hover-only chrome in
   the one `position: fixed` popover — an open card cannot move the DAG or
   the grid (the browser tier already measures the pane box with a card
   open; keep that check passing). An edge with no `crop_key` gets its
   honest no-document card content, never an empty image slot.

## Definition of done

- Real `pitch_system`: hovering any bar with a croppable citation shows the
  crop thumbnail card; hovering a boundary dot names both parts and shows
  their thumbnails where they exist; internal dots say they are internal.
- Fast + truth tiers green; the truth tier gains a DAG-side card-open
  measurement (pane box unchanged) and a value-level pin that bar-card
  content equals the same edge's grid-trigger card content.
- Lesson: which node-card content shape was chosen and why; any edge cases
  where a dot's two sides could not be derived from the projection.
