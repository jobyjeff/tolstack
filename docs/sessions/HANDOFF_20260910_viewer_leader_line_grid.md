---
priority: high
depends_on: [viewer_rebuild_affordance]
model: opus
---

# HANDOFF 2026-09-10 — viewer_leader_line_grid: jogged leader lines between the DAG and a merged-row grid; internal-node omission IS the component grouping

Source: locked strategy brief 2026-09-10 (Jeff live; folds his atomic note
`20260910T114735_gf00sl`, tolstack/dag items 1–3). This is the structural
centerpiece of the viewer arc and the biggest single change to the topology
page. Baseline: post-batch-merge master — the integration→master batch-merge
was due at staging time (it folds in `viewer_error_surface_and_layout`,
`viewer_http_transport`, `annotate_deep_link_and_part_filter` and four
2026-09-09 bugfix handoffs; the JS suite is red on master pins until it
lands). If master still lacks those at launch, branch from `integration` as
usual. Scope: `apps/viewer/` and its test tiers. Do NOT touch: the staleness
banner / transport plumbing (`views/banner.js`, `storage/`) — owned by
`viewer_rebuild_affordance`; `apps/annotate/` — owned by the parallel
`mesh_part_alias_table` handoff; the projection builders (`scripts/build_*`)
and `docs/topologies/`.

## Context you need before designing

- The viewer is hand-rolled SVG/DOM, classic scripts, no framework, no npm
  runtime deps (Playwright is a dev-only test dep). The reactflow "subflow"
  look mentioned in older notes is a rendering idea, never a dependency.
- Read `docs/sessions/lessons/LESSONS_20260909_viewer_error_surface_and_layout.md`
  (on integration until the batch-merge) before touching layout: the
  `.tv__scroll` / `.tv__hscroll` / full-page-scroll contract has a documented
  CSS trap (overflow-x/-y are not independent; a scroll container's flex
  minimum size is 0) that already cost one session a real regression. The
  landed decisions there are binding: full-page scroll (no inner DAG panel),
  whole-edge hover, the node/edge display toggle, themed scrollbars.
- Data: every edge in
  `C:\workspace\tolstack\data\projections\viewer\topologies.json` (main
  checkout — gitignored, absent from your worktree) carries `part`, `from`,
  `to`, `kind`, and a full `dimension` object; each topology carries a
  top-level `parts` list (pitch_system: 12 distinct parts). Group membership
  is derivable with no schema change.
- Crop thumbnails exist: 33 sha-verified crops,
  `C:\workspace\tolstack\data\projections\viewer\crops.json` +
  `...\viewer\crops\` (schema `joby.tolerance_stack/viewer_crops/v0`), already
  consumed by the viewer since `inline_edge_crops` (2026-09-08).

## Deliverables

1. **Jogged leader lines between the DAG and the stack table/grid** — GD&T
   ordinate-dimension style (orthogonal segments with jogs), so table rows
   stay compact and evenly spaced even when the graph isn't (the coming
   edge-length scaling modes guarantee it won't be).
   - Leaders attach to **nodes**, not edges (Jeff: node labels are being
     removed per the display toggle; leaders extend between the rows of the
     edges). Visually apt: a node is an interface, a line separating two
     components.
   - **Leaders are omitted for "internal" nodes** — a node whose adjacent
     edges all carry the same `part` (multiple tolerances on one feature,
     e.g. size + flatness on one linear distance). The result: leaders appear
     only at part boundaries, making component membership visually obvious.
     **That IS the component grouping** — Jeff explicitly ruled this
     supersedes the earlier boundary-lasso/grouping question. Do NOT build a
     lasso or boundary overlay; if the implementation finds leader lines
     genuinely leave a grouping gap, file an issue (`docs/issues/`, with
     frontmatter) rather than building one speculatively.
2. **The grid gets merged rows**: leftmost column = one merged row per
   component (spanning its tolerance sub-rows); sub-rows to the right = each
   tolerance contribution with its own thumbnail, ideally a crop of the
   actual tolerance annotation (from `crops.json`, where a crop exists for
   that edge — the existing crop-key machinery; absent crop = no thumbnail,
   never a placeholder image). Rich hover cards on these rows (component
   evidence/images, both-sides interface crops) are owned by the later
   `viewer_hover_cards_and_deep_links` handoff — build the structure here,
   keep hover behavior to what already exists.
3. **Row/leader correspondence is the contract**: a grid row and its
   node/edge stay visually connected across scroll, layout-mode and density
   toggles, and study selection. Extend the real-data browser test tier
   (`scripts/run_viewer_browser_tests.mjs`) to assert it — that tier's
   height-budget and alignment-drift checks are the precedent, and new
   features extend that tier, not just the synthetic fixtures.

## Definition of done

- Real `pitch_system` (12 parts, the largest topology) renders leaders +
  merged-row grid: internal nodes omitted, one merged row per part, crops
  showing where they exist. Demonstrated in the browser tier with `--repo
  C:\workspace\tolstack`, plus fixture-tier coverage in
  `apps/viewer/tests.js` / `run_tests.cjs`.
- Full suite green: `node apps/viewer/run_tests.cjs` (and `--repo
  C:\workspace\tolstack`), `node scripts/run_viewer_browser_tests.mjs` (both
  modes), `venv-win/Scripts/python.exe -m pytest -q` (from a worktree, the
  venv is main-checkout-only: `C:\workspace\tolstack\venv-win\Scripts\python.exe`).
  Browser tier needs `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install` in the
  worktree (may cost one permission prompt — a cost, not a denial).
- `apps/viewer/README.md` updated (it documents the layout contract; a stale
  sentence there is a wrong-fact bug, per this repo's doc-scan posture).
- Lesson (`docs/sessions/lessons/LESSONS_20260910_viewer_leader_line_grid.md`):
  the leader/jog geometry rules as shipped, the internal-node predicate as
  implemented, how row↔node correspondence is keyed — the
  `viewer_edge_length_scaling` handoff (staged, depends on this one) will
  reuse that keying for its layout work, and the future animated-rearrange
  feature needs keyed node positions + transition hooks, so record what you
  left behind for them.
