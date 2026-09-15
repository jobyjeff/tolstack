---
priority: high
depends_on: [viewer_dag_spine_layout]
model: opus
---

# HANDOFF 2026-09-14 — viewer_leader_grid_legibility: alternating leader bands, resizable jog zone + columns, angled-leader option

Source: Jeff's live review of the shipped viewer arcs (strategy session
2026-09-14): "The jogged leader lines between the dag and the grid view rows
are near impossible to follow because the vertical sections are so bunched
up." Baseline: `integration` after `viewer_dag_spine_layout` merges (that
handoff owns the geometry/normalization; this one owns leader presentation
and grid ergonomics — the split is deliberate, respect it). Scope:
`apps/viewer/` (`topology.js`, `views/topology.js`, `topology_app.js`,
`topology.css`, tests). Do NOT touch `scripts/build_*` or projection
schemas; do NOT touch the rail/bar hover surfaces (owned by the parallel
`viewer_dag_hover_cards`).

## Deliverables

1. **Alternating leader colors, shared with row backgrounds.** Jeff: "use
   alternating fill colors between the leader lines (these same colors can
   be the alternating row background colors)" — i.e. the band BETWEEN two
   adjacent leaders and the grid rows that band feeds share one alternating
   tint, so an eye can ride a band across the jog zone into its rows. HARD
   CONSTRAINT (README §"The colours"): saturated color is provenance-only on
   this page — the alternation must be neutral tints (two greys/surface
   shades, the existing column-parity precedent), never a categorical
   palette.
2. **Resizable jog zone.** Jeff: "Make the width of the area/column with the
   jogged leader lines resizable so that they can be spread out more." A
   drag handle on the jog-zone boundary; jog x-positions spread
   proportionally across the new width. Display preference like density:
   switching topologies never resets it (in-session state minimum; persisting
   further is the agent's call — note that the page also runs on `file://`).
3. **Angled-leader view option.** Jeff: "Have an option to use angled leader
   lines (rather than right angle jogs) this will likely make it easier to
   follow the lines (but make it a view option so I can try both)." A toolbar
   toggle exactly like the labelled/values-only precedent
   (`state.edgeValueOnly`), default = jogged. Angled = straight segment from
   the node-side end to the grid-side seam (the two endpoints are already
   the measured contract; only the path between them changes). The
   `CORRESPONDENCE_IN_PAGE` endpoint checks must pass in BOTH styles.
4. **Resizable ELEMENT (description) column.** Jeff: "Element column should
   be resizable, the descriptions get truncated and there's no way to see
   the entire text without clicking and expanding the preview." Column
   widths live on the shared `<colgroup>` (`views/topology.js` `COLUMNS`,
   one array driving head + body tables so they cannot disagree) — a drag
   affordance on the ELEMENT header updates that one array and re-renders.
   Keep the one-array invariant; a second width source is the defect the
   colgroup exists to prevent. Same persistence rule as (2). Cell content
   is clamped to the row pitch (a `<tr>` height is a floor, not a cap —
   README §"Row/leader correspondence"), so widening must not let a cell
   grow a row taller; wrapping stays clamped, width is the relief valve.

5. **ELEMENT cell drops the redundant component prefix.** Jeff (2026-09-14):
   "nearly every row in the 'element' column starts with the same phrase as
   the 'component' column to the left, which then robs a bunch of the
   limited space, and then the meaningful content gets truncated" — e.g.
   under component `blade_root`, three rows all render "blade-root clocking
   holes to th…". When an element label's leading words repeat its own
   merged-component cell's name (case/hyphen-insensitive match on the
   normalized prefix), drop the prefix from the DISPLAY (full label stays on
   the row hover/tooltip and in the detail pane — display-only, never a data
   change). A label that does not start with its component name renders
   unchanged.

## Definition of done

- Real `pitch_system`: bands readable across the jog zone, jog zone dragged
  wider spreads the verticals, angled mode toggles live and both styles pass
  the leader-endpoint correspondence checks, ELEMENT column drag reveals
  full descriptions without changing any row height, and the blade_root
  rows' ELEMENT cells no longer open with "blade-root".
- Fast + truth tiers green, correspondence matrix extended with (angled ×
  jogged) and a resized-jog-zone case; a value-level test pins that row-band
  parity matches leader-band parity on a committed topology.
- Lesson: the tint values chosen and why they can't collide with provenance
  colors; what persistence was implemented for the two resize preferences.
