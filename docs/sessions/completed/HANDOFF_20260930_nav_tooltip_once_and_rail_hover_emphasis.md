---
priority: med
depends_on: []
model: opus
---

# HANDOFF 2026-09-30 — nav_tooltip_once_and_rail_hover_emphasis: one hover surface on a nav row, a hovered rail lights up end to end, and the DAG and grid share the hover

Source: Jeff, live, 2026-09-30, reviewing the viewer: *"The alerts in the left
side select menu are significantly improved, but there is a duplicate
hover-over tooltip (unformatted and formatted versions) that sometimes block
each other. Keep just the formatted one."* And on the DAG: *"add an emphasis
(bold/glow etc) to the edges when you hover over them, again makes it easier
to trace them."*

Baseline: trunk `master` after the 2026-09-30 batch. Scope:
`apps/viewer/views/nav.js`, `apps/viewer/views/topology.js` (the rail
wiring only), `apps/viewer/topology.css`, `apps/viewer/style.css`,
`apps/viewer/tests.js` and the browser tier. Do NOT touch
`scripts/build_topology_projection.py`, `apps/viewer/topology.js` or
`tests/test_topology_projection.py` — owned by the parallel
`HANDOFF_20260930_columns_ordered_to_minimise_crossings` (it renumbers
columns; nothing here may depend on a column index).

## 1. The nav row's native tooltip duplicates the alert card

`views/nav.js` puts the artifact's `description` on the **row** as a native
`title=` (`setTooltip(srow, s.description, null)`), and the same row carries
the alert mark (`statusIcon` → `VA.alertBadge`) which opens the formatted
hover card. Hovering the mark therefore shows both: the browser's plain
tooltip for the row and the card — the "unformatted and formatted versions"
Jeff saw, and they overlap. The repo's own rule is already "one hover surface,
not two" (`views/topology.js`, 2026-09-14).

- Move the native `title` from the row onto the **label span**
  (`.navtree__label`) on all three row kinds (topology, study, stack), so the
  description is still one hover away on the name and the mark shows only its
  card. The topology row's click hint ("the whole topology, depth-first…")
  travels with it.
- Nothing else about the mark changes (one icon, no border — the 2026-09-22
  decisions stand). Do not fold the description into the card: a row with no
  alert has no card to carry it.
- Browser-tier check: hovering the study mark on a row that has a description
  yields a card and **no** `title` attribute on the element under the pointer
  or any ancestor up to the row; hovering the label yields the description.
  This is a sibling of the a11y question in
  `docs/strategy/BRIEF_20260914_hover_card_occlusion_and_a11y.md` (the mark's
  accessible name) — do not decide that here; note in the lesson whether the
  mark still has no accessible name after this change.

## 2. A hovered rail is emphasised along its whole length

Today only the edge **bars** react (`.rail__barhit` hit path, `.rail__bar--on`
on selection); the rails (`.rail`), branch curves (`.rail__link`) and close
curves (`.rail__link--close`) are 2 px lines with no hover state, so a reader
tracing a leg through a crossing has nothing to hold on to.

- On hover **or keyboard focus** of any part of a rail — the rail line, a
  bar on it, its opening branch curve, or a close curve leaving it — add a
  `--hot` state to **the whole connected line**: the rail span (one column,
  start row to end row), the branch link that opened it, every bar and dot on
  it, and any close link whose `from_column` is this rail. Emphasis =
  thicker stroke plus a soft glow (a wider, low-opacity underlay path or an
  SVG `filter: drop-shadow`, your call — measure which the browser tier can
  assert and which stays legible on the dim `--rail-dim` close curves);
  everything else stays as drawn (no dimming of the rest — a reader is
  tracing *one* line through the others).
- Hit area: rails and links need a transparent wide hit path the way bars
  have `.rail__barhit` (`stroke: transparent; stroke-width: 14; pointer-events:
  stroke`). Add the equivalent for rails and links; keep `pointer-events` off
  the glow underlay so it cannot steal the hover.
- Precedence: a selected edge's `.rail__bar--on` / `.rail__dot--on` styling
  stays visually distinct from the hover glow (selection = accent colour;
  hover = brightness/width), and hovering must not change which element is
  selected or open any card — the dot's and bar's existing hover cards keep
  their own triggers. Pure, keyed geometry: the connected-line membership is
  computed from `layout.rails` / `layout.links` by rail identity, never by
  column index (the sibling handoff renumbers columns).
- Browser-tier check on `pitch_system`: hovering a mid-rail point of a branch
  leg marks that rail's path, its branch curve and its bars `--hot` and
  nothing on another column; blur/leave clears it.

## 3. The DAG and the grid share one hover state

Jeff, same session, a few minutes later: *"there is some amount of hover-over
highlighting for the table with all the values (mouse over highlights the
row), it would be awesome if the DAG and the table/grid shared their
highlighted state, so everything lit up together."* Today the grid row hover
is CSS only (`.tvrow:hover`, `topology.css`) and knows nothing of the rails.

- One hover model, two surfaces. Hovering a grid row (an EDGE row) marks that
  edge's bar, its dots and its leader `--hot` on the DAG; hovering a bar, dot
  or leader marks the grid row(s) `--hot` (a node has no row — light the rows
  of the edges that meet at it). Combine with item 2: the hovered element's
  own edge pair (row ↔ bar + leader) gets the strong state; the rest of the
  connected rail from item 2 keeps its glow, and the grid rows of the other
  edges on that rail get a lighter tint, so a reader sees the whole leg in
  both places with the hovered edge loudest. If three tints read as noise on
  `pitch_system`, drop the lighter tint and say so — two states (hovered edge
  strong, rest of the rail glowing) is the floor.
- Replace the pure `:hover` rule with the same `--hot` class the DAG uses,
  set from one place (a `setHot(edgeId | railId | null)` in
  `views/topology.js`, mirroring drawing-checker's `setHot` pattern for
  hover thumbnails) so the two surfaces cannot disagree. Keyboard focus
  drives it too. Keyed by edge/rail identity, never column index.
- Must not fight selection (`--on`) or the hover cards: hovering changes
  tint only; cards keep their existing triggers.
- Browser-tier check: hover a grid row → its bar and leader are `--hot`;
  hover the bar → the row is `--hot`; leave → nothing is.

## Definition of done

- All three items demonstrated on `pitch_system` in the browser tier;
  screenshots (nav mark hovered showing one surface; a branch leg hovered and
  lit end to end on the DAG with its grid rows tinted; a grid row hovered
  with its bar lit) in `docs/sessions/lessons/shots_20260930_nav_tooltip_and_rail_hover/`.
- `node apps/viewer/run_tests.cjs`, `node scripts/run_viewer_browser_tests.mjs`,
  `node scripts/run_mutation_witness_tests.mjs` green in the main checkout
  (rebuild projections first); `pytest -q` green (the type-scale pairing test
  reads `style.css` `:root` — add no new numbers outside it).
- Lesson (`docs/sessions/lessons/LESSONS_20260930_nav_tooltip_once_and_rail_hover_emphasis.md`):
  which glow technique was chosen and why; whether the mark has an accessible
  name after item 1; any rail/link that could not be given a hit path and why.
