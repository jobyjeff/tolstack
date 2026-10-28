---
priority: high
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-10-28 — the_lit_set_closes_over_its_joints: a study's lit graph is connected, so "hidden" draws no islands and the joint symbols read on the active study

Source: Jeff's 2026-10-28 review ("some sections of the graph appear
floating/disconnected"; "joint styles … only visible on dimmed nodes").
Measured the same day against `data/projections/viewer/*` built 2026-10-28
00:40 (169 rows, 95 edges, 11 columns, 22 studies). Baseline: `master` after
the 2026-10-28 batch merge. Scope: `apps/viewer/topology.js`
(`litSetOfEdges` ~:1955, `hideUnlit` ~:2047, `bodySpans` ~:2099),
`apps/viewer/views/kinematic.js` (`VA.kinematicLitSet` ~:460), the chain-study
lit set, `apps/viewer/tests.js`, the fixtures under `apps/viewer/fixtures.js`,
the browser specs named below. Do NOT touch layout/positions
(`rowPositions`, `fitEdgeLength`, `spineRight`, `header()`, the SVG size) —
`the_dag_is_zoomable_and_a_length_mode_draws_to_scale` (staged, depends on
this) owns them — nor `apps/annotate/`.

## One cause, two symptoms

The kinematic lit set (`VA.kinematicLitSet` → `litSetOfEdges`) is the
contributor edges, their `dimension_ref` band edges, the `study_ref` leaf
edges, and the end nodes of all of those. **All 13 lit edges on "Blade pitch
at the end stops" are structural. Joints are gap edges and none is lit** —
including the four ball joints whose *both* end nodes are lit
(`pitch_arm_link_joint`, `pitch_plate_link_joint`, `tan_link_mount_joint`,
`tan_link_plate_joint`) and `travel_between_end_stops` (both ends lit).

- **Hidden mode:** `VA.hideUnlit` keeps an edge only if lit, so it drops
  exactly the joints that connect the lit bodies. Each body's lit edges
  become an island; the shared nodes sit with nothing joining them. The
  comment at `topology.js:2043` says so ("a run that a hidden edge used to
  join becomes two runs, and nothing is drawn joining them"). Body fields
  re-derived from the remaining rows (`bodySpans` ~:2099) fragment the same
  way.
- **Symbols:** glyphs exist only on gap edges with an `interface` (17 in the
  projection). On the kinematic page none is lit, so every glyph gets
  `rail__glyph--off` (opacity .28) and a faint bar between two solid lit
  dots — that is what reads as "obscured by the solid nodes". Draw order is
  fine (bar → break → hit line → `rail__glyphbg` disc → glyph `<use>`, 12 px
  at the bar midpoint, a full row from either dot). In hidden mode the 17
  glyphs are removed outright.

## Deliverables

1. **Closure rule.** A gap edge (joint) whose two end nodes are both in the
   lit set is lit. Apply it in `litSetOfEdges` so every consumer (dim, hide,
   leaders, grid) sees the same set; the grid keeps listing only
   contributors (a joint carries no row — say so in the test name). Apply
   the same closure to chain studies' lit sets.
2. **Hidden mode draws a connected lit graph.** After closure, assert on the
   real kinematic study that the hidden walk is one connected component
   (nodes ∪ edges) and that no body field is split by hiding alone. Where a
   lit path genuinely passes through an unlit *node* (prove whether it
   happens; the measurement is part of the lesson), that node is lit by
   closure too.
3. **Joint symbols on the active study.** With joints lit, the glyph draws
   at full opacity in the bar's confidence colour on the lit path. Check
   contrast of the `rail__glyphbg` disc against a lit bar at both themes;
   if the disc hides the bar, make the disc the bar's own colour at reduced
   alpha rather than `--bg`. Dimmed glyphs keep .28.
4. **Tests that pin the new facts**, replacing or extending (never
   contradicting silently): `tests.js` ~:9117 "selecting a study never hides
   a node or an edge", ~:11810 "hiding the unlit model keeps the lit rows…",
   ~:12220 "a kinematic page's lit set dims the rest…", ~:12160/16867 glyph
   pins; browser `testKinematicStudyPage` (~:9148, toggle ~:9247–9251) and
   the spec `browser__real-the-toolbar-s-unused-toggle-hides-the-unlit-model…`
   gain a connectivity assertion. Add a value-level test: lit joint count on
   the real study = 5 (the four ball joints + travel) — derive the number
   from the projection in the test, then pin it.

## Definition of done

- Real kinematic page, "Unused: hidden": one connected drawing, the five
  joints visible as symbols between their lit nodes, body fields whole.
- Real kinematic page, "Unused: dimmed": joint symbols at full opacity on
  the lit path.
- `node apps/viewer/run_tests.cjs`, `node scripts/run_viewer_browser_tests.mjs`,
  `node scripts/run_mutation_witness_tests.mjs --changed-since master`,
  `pytest -q` — main checkout, projections rebuilt first.
- Lesson (`docs/sessions/lessons/LESSONS_20261028_the_lit_set_closes_over_its_joints.md`):
  the closure's effect on every one of the 22 studies (lit-edge count
  before/after, in a table); whether any lit path crosses an unlit node.
