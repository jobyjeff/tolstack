---
priority: med
depends_on: [viewer_leader_line_grid]
model: opus
---

# HANDOFF 2026-09-10 — viewer_edge_length_scaling: three edge-length modes (uniform / ∝ tolerance width / ∝ nominal), plus keyed-position groundwork

Source: locked strategy brief 2026-09-10 (Jeff's atomic note
`20260910T114735_gf00sl`, tolstack/dag item 1). Baseline: post-batch-merge
master + merged `viewer_leader_line_grid` (this handoff reuses its row↔node
keying and must not fight its leader geometry — read its lesson first). If
master still lags integration at launch, branch from `integration` as usual.
Scope: `apps/viewer/` and its test tiers. Do NOT touch: the staleness banner /
transport plumbing (`views/banner.js`, `storage/`); `apps/annotate/`; the
projection builders and `docs/topologies/`.

## Deliverables

1. **Edge-length scaling, three settings** — a display setting exactly like
   the node/edge label toggle that landed in `viewer_error_surface_and_layout`
   (same toolbar, same persistence behavior as the existing toggles):
   - **uniform** — today's equal-length rendering; the default.
   - **scale with tolerance** — edge length ∝ tolerance width (from the
     edge's `dimension`: `max − min`, or `2 × plus_minus` where min/max are
     absent — check what the projection actually carries per edge and say in
     the lesson which you read).
   - **scale with absolute** — edge length ∝ nominal feature size
     (`dimension.nominal`).
2. **Floor rules for degenerate edges** — verified against the real
   projection at lock time
   (`C:\workspace\tolstack\data\projections\viewer\topologies.json`, main
   checkout — gitignored, absent from your worktree): workbook-sourced edges
   can be *variation-only* (`nominal: 0.0`, `plus_minus: 0.1`, provenance
   note says the nominal is unstated). So:
   - "scale with absolute" needs a floor/fallback for nominal-0 edges;
   - "scale with tolerance" needs a min-length floor so a zero/tiny-width
     edge stays clickable (whole-edge hover is a landed contract).
   Suggested direction (investigate, not binding): a fixed minimum render
   length plus a visual mark distinguishing floored edges, so a floored edge
   is never read as a measured proportion — and the legend dialog ("How to
   read the rails") states that lengths are indicative. Whatever you ship,
   the honest-rendering rule of this repo applies: never let a fallback make
   an unstated value look stated.
3. **Keyed node positions + transition hooks** — the layout engine you touch
   here is the one the future study-selected animated rearrange (explicitly
   phase-2, NOT this handoff) will animate. Leave behind: node positions
   computed into a keyed structure (node id → position) rather than emitted
   inline, and a seam where a position change could transition rather than
   snap. Do not build any animation now — record the seam in the lesson.

## Definition of done

- All three modes demonstrated against real `pitch_system` in the browser
  tier (`scripts/run_viewer_browser_tests.mjs --repo C:\workspace\tolstack`),
  including at least one real variation-only (nominal-0) edge rendered under
  both scaling modes with its floor applied; fixture-tier unit coverage for
  the length computation including the floor rules.
- Leader lines from `viewer_leader_line_grid` remain correct under all three
  modes (that was their point: rows stay evenly spaced when the graph isn't)
  — asserted in the browser tier, not just eyeballed.
- Full suite green: `node apps/viewer/run_tests.cjs` (both modes),
  browser tier (both modes), `C:\workspace\tolstack\venv-win\Scripts\python.exe
  -m pytest -q`. `apps/viewer/README.md` updated where it documents toggles.
- Lesson (`docs/sessions/lessons/LESSONS_20260910_viewer_edge_length_scaling.md`):
  the length formula + floor values as shipped, which dimension fields the
  real projection actually populates, and the keyed-position/transition seam
  left for the rearrange feature.
