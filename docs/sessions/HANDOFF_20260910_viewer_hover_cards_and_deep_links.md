---
priority: med
depends_on: [study_3d_flyout]
model: opus
---

# HANDOFF 2026-09-10 — viewer_hover_cards_and_deep_links: hover reference cards + the viewer's inbound deep-link contract

Source: locked strategy brief 2026-09-10 (carried from the 09-09 draft; its
conditions — `viewer_http_transport` and the integration batch-merge — are met
by your baseline). Baseline: post-batch-merge master + merged
`study_3d_flyout` (this is the last link in the serialized `apps/viewer/`
chain: leader grid → scaling → flyout → this). Scope: `apps/viewer/`, its test
tiers, and any new thumbnail-generator script + its output under
`data/projections/viewer/`. Do NOT touch: `apps/annotate/` beyond consuming
what the flyout handoff shipped; the projection builders other than adding a
new generator per the rules below; drawing-checker's repo (its reciprocal
deep-link handoff `analyses_viewer_deep_link` is staged there and depends on
this one's contract).

## Deliverables

1. **Hover reference cards** (drawing-checker-style) on:
   - **Edges**: crop thumbnails of the actual tolerance annotation
     (`C:\workspace\tolstack\data\projections\viewer\crops.json` + `crops\`,
     33 sha-verified crops at staging). An interface's two half-sides are
     usually different parts/drawings BY DEFINITION, so an edge hover should
     eventually show BOTH sides' crops — ship both where both exist, one
     where one exists, nothing invented where none.
   - **Parts/components** (the merged rows from `viewer_leader_line_grid`):
     a component thumbnail — a mesh/annotator render or a drawing crop,
     whichever is derivable; absent = no thumbnail.
   - **Citations**: spec-sheet cards (the spec library projection is the
     source of citation identity — reuse what the stack view already renders,
     as a card).
   Cards are hover-only chrome: they must not disturb the layout contracts
   (full-page scroll, whole-edge hover, leader alignment) — browser-tier
   assertions, not just fixture-tier.
2. **Outbound deep links** from cards/rows: to drawing-checker runs
   (`/container/<id>` is the stable shape), to the spec pile, to the
   annotator (the existing `VA.annotateLink` relative shape).
3. **The viewer's inbound deep-link contract** — URL params that open the
   viewer with a topology/study/stack selected (today only `?mock=1` exists).
   Define it, implement it, and **document it in `apps/viewer/README.md` as a
   contract** — drawing-checker's analyses panel will link into it
   (`analyses_viewer_deep_link`, staged in that repo, consumes exactly what
   you document; the surfaces finally cross-link both ways). Keep it stable
   under the d-c mount (`/tolstack/viewer/topology.html?...`) and under
   static serving.
4. **Any new thumbnail generator obeys the everything-CLI rule**: a
   rerunnable script writing into `data/projections/viewer/` (main checkout,
   `--data-root` convention), going through the projection-provenance gate
   like every shared-projection writer (`scripts/projection_provenance.py`
   owns the writer list; builders refuse to overwrite from a tree they don't
   contain, exit 3; `ARCHITECTURE.md`'s inventory needs a row for a new
   module).

## Definition of done

- Real-data demonstration (browser tier, `--repo C:\workspace\tolstack`):
  edge hover on a pitch_system edge with crops shows the crop card(s); a
  citation card renders from a real spec citation; a deep link
  `topology.html?<contract>` opens with the named study selected.
- Full suite green: `node apps/viewer/run_tests.cjs` (both modes), browser
  tier (both modes), `C:\workspace\tolstack\venv-win\Scripts\python.exe -m
  pytest -q`.
- `apps/viewer/README.md` documents the inbound contract precisely enough for
  a sibling repo to consume without reading the code.
- Lesson (`docs/sessions/lessons/LESSONS_20260910_viewer_hover_cards_and_deep_links.md`):
  the contract as shipped (param names, selection semantics), which card
  sources exist vs. remain gaps (e.g. second-side crops not yet cropped),
  and any generator script added.
