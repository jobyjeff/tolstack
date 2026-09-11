---
handoff: viewer_edge_length_scaling
date: 2026-09-10
---

# Lessons — viewer_edge_length_scaling

## The length formula and floor values, as shipped

`VA.rowPositions(layout, topoProj, mode, metrics)` (topology.js, pure) gives
every layout row a vertical slot:

- **node rows: always `rowHeight`** (26px comfortable / 16px compact). An
  interface is a point; the constant node slot is also what keeps the branch
  fan-out curves' half-row shape constants true.
- **edge rows under a scaled mode:** `(v / vmax) × maxRows × rowHeight`,
  floored at `floorRows × rowHeight`, where `v` is
  `VA.edgeLengthValue(edge, mode)` — tolerance mode reads `|max − min|`
  (falling back to `2 × |plus_minus|` where min/max are absent), absolute mode
  reads `|nominal|`; `null` (no dimension, or no stated nominal) scales as 0
  and floors. `vmax` is the largest value **in the serialisation being
  drawn** — so chain mode scales relative to the chain's own widest edge, not
  the whole topology's. `VA.EDGE_LENGTH_SCALE = { maxRows: 6, floorRows: 1 }`:
  6 rows caps the tallest edge at 156px comfortable, which puts the real
  pitch_system's tolerance-scaled walk at 3325px against 1170px uniform
  (measured, not estimated) — legible stretch without an absurd page; both
  constants are in row heights so compact density scales the whole picture
  down together.
- **`floored` is flagged wherever the drawn length is not the measured
  proportion** — clamped up to the floor, or nothing to scale by at all. The
  render marks it three ways: `.rail__bar--floored`, a drafting-style break
  glyph (`.rail__break`, two panel-coloured slashes across the bar,
  `pointer-events: none` so it never shadows the hit line), and
  `VA.flooredEdgeTitle`'s "not to scale" hover. Uniform mode flags nothing —
  it claims no proportion.

**Why floor = exactly one uniform row height, and why it matters twice:** it
preserves the whole-edge-hover clickability contract for free (no edge is ever
smaller than today), and it means scaled modes only ever *stretch* — every
node y sits at-or-below its uniform position while the grid-side seam ys don't
move at all, so leaders still rise left-to-right structurally in every mode.
That is what let the browser tier's `CORRESPONDENCE_IN_PAGE` (which reads a
leader's bbox bottom as the node end) survive unedited, exactly as the
leader_line_grid lesson predicted. If a future mode can *shrink* an edge below
uniform, that proof and that measurement both need rethinking.

## Which dimension fields the real projection actually populates

Read at lock time from the main checkout's
`data/projections/viewer/topologies.json` (the handoff asked for this
explicitly):

- Every edge that carries a `dimension` populates **`nominal`, `min` and
  `max`, always** — so tolerance mode's `max − min` is the path that actually
  runs; the `2 × plus_minus` fallback is dead code against today's builds and
  exists only because the handoff names it for min/max-absent edges.
  `plus_minus` itself is a mix (set on some edges, `null` on others).
- `dimension: null` occurs only on **derived gaps** (2 in
  pitch_link_to_pitch_plate, 1 each in rotor_fastener_length,
  tan_link_to_pitch_plate_take2, vpa_output_to_pitch_plate).
- **The entire `pitch_system` (all 24 dimensioned edges) is variation-only:
  `nominal: 0.0` with a real ± band (widths 0.03 … 0.2).** The handoff's
  "workbook-sourced edges *can* be variation-only" undersells it — for the DoD
  topology it is every single edge. So "feature size" over pitch_system floors
  everything (vmax = 0 → no yardstick → all floored at uniform height, all
  wearing break marks), which is the honest rendering, and the [real] fixture
  tier pins that shape so a future projection that starts stating nominals
  will flip the test and force a re-look. The other four topologies carry real
  non-zero nominals, so absolute mode does scale somewhere real.

## The keyed-position / transition seam (for the phase-2 animated rearrange)

- The store: `VA.rowPositions` returns `nodes: { nodeId → y }` and
  `edges: { edgeId → {y1, y2, y, length, floored} }` plus `byRow` and
  `height`. Both geometry passes — `VA.railGeometry(layout, metrics,
  positions)` and `VA.leaderGeometry(layout, plan, metrics, positions)` — take
  the store as an argument and are pure functions of it; called without one
  they compute uniform internally, so every pre-existing caller and test kept
  its signature.
- **The seam:** an animator computes two stores (old mode, new mode),
  interpolates them per frame (both are keyed by document id, so the
  correspondence is free), and re-calls the two geometry functions with the
  interpolated store — nothing in either function changes. Dots, bars and
  leaders are already DOM-addressable by `data-id`/`data-leader-id` if a
  CSS/FLIP approach is preferred instead. What still does not exist (and was
  explicitly not built): any position *store held across renders* —
  `renderTopoPane` computes the store fresh each paint and throws it away.
  The rearrange feature needs to lift that one `VA.rowPositions` call out of
  the paint into state it can tween.
- The grid side is deliberately not in the store: grid rows stay at
  `rowHeight` and leader grid-side seams stay `boundary × rowHeight` in every
  mode. Only the node-side leader ends follow the store. Rearranging that
  would break the "grid stays evenly spaced" contract, not implement it.

## Gotchas that cost time or would have

- **Float identity: the store carries `length` explicitly.** An edge slot's
  `y2 − y1` re-derives the height through float addition of the accumulated
  `top` and does not always equal the computed `(v/vmax)×maxLen` in the last
  bits — the first test run failed on `31.19999999999979 !==
  31.199999999999793`. Consumers comparing lengths (tests, the browser tier's
  bar measurement) read `slot.length`, stored as computed. The vmax edge is
  exact by construction (`v/v` is exactly 1), so `length === maxLen` is a safe
  equality there.
- **`.rail__barhit` is an SVG `<line>`, not a `<path>`** — a test selector
  `path.rail__barhit` matches nothing and fails as `undefined.textContent`,
  two lines away from the leader hits which *are* paths. The browser tier
  measures the hit line's rect height (butt caps → exactly `length − 2`, the
  1px insets).
- The mock browser flow leaves `state.edgeLengthMode` wherever the last click
  put it, and the real-projection re-boot **reuses the same closure state** —
  the new mock sub-checks cycle exactly three clicks (back to uniform) so the
  real section starts from a known mode. Same trap as any other sticky display
  preference in that test.
- `node apps/viewer/run_tests.cjs --repo C:\workspace\tolstack` with
  backslashes under the Bash tool mangles the path and the node-fs tier
  silently reports itself skipped with a "no projection" reason naming the
  *worktree* — spell it `C:/workspace/tolstack` (the standing forward-slash
  instruction applies to flag values too, not just the interpreter).

## Verified

- `node apps/viewer/run_tests.cjs`: 201/201 (worktree), 247/247 with
  `--repo C:/workspace/tolstack` (node-fs tier live, including the new [real]
  variation-only pin).
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`:
  13/13 suites, topology page 111/111 sub-checks over file:// and http —
  bars measured against the store and leader correspondence re-measured at
  every mode stop, mock and real pitch_system (all-floored absolute, scaled
  tolerance with real floored + real proportional edges).
- `venv-win/Scripts/python.exe -m pytest -q`: 759 passed, 1 skipped.
