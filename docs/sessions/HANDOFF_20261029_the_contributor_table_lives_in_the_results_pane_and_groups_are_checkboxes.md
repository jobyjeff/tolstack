---
priority: med
depends_on: [the_rearrange_animates_and_centres_the_active_study, the_plus72_stop_is_the_travel_datum]
model: sonnet
hitl: false
---

# HANDOFF 2026-10-29 — the_contributor_table_lives_in_the_results_pane_and_groups_are_checkboxes: the orphaned contributors table joins the plot in the right pane, the unlit button stops toggling it, and Groups is a set of checkboxes

Source: Jeff's forge note `20261029T135845_jdy8k2` ("bugs"), consumed by the
2026-10-29 strategy session (`dispatch/docs/strategy/HANDOFF_20261029_strategy.md`).
Baseline: `master` with the two `depends_on` landed. Scope:
`apps/viewer/views/kinematic.js` (`VA.renderKinematic`, the contributor table),
`apps/viewer/topology_app.js` (`#detail` / `.tv__main` composition),
`apps/viewer/views/topology.js` (the toolbar's Unused/Groups controls only,
~lines 123–160), `apps/viewer/topology.css`, tests. Do NOT touch zoom/Fit,
leaders, or the preview mechanism (sibling handoffs).

Jeff's words:

> clicking the Unused:hidden button causes part of the old kinematic summary
> pane underneath the 2d dag/gridview (the one that was supposed to be moved
> to the right side pane) to appear/disappear. Part of it (the graph of angle
> error vs nominal pitch) got moved, but the other portion of the table
> (contributors at -7 and 72 deg) didn't get moved, it just disappeared and
> gets revealed by that random hidden nodes button. This implies sloppy code
> architecture (why would these two things be wired together), please
> consider whether some refactor/consolidation is in order.
> - groups should just be individual checkboxes (hide/show sub-stacks,
>   studies, etc) rather than one button that cycles through all combinations

What the code says: the 10-28 plot handoff moved the results (verdict strip,
plot, per-stop readout) into `#detail` via `VA.renderKinematicResults` and
left `VA.renderKinematic` — the contributor table — in `.tv__main` under the
DAG; the unlit-style control re-renders `.tv__main`, which is why toggling
it shows/hides the table. One component split across two containers with a
shared re-render is the architecture defect Jeff names.

## Decisions (made)

- **The contributor table is part of the results** and renders inside
  `#detail` under the per-stop readout, as one component with the plot (one
  render function, one container). Nothing kinematic remains in `.tv__main`;
  `.tv__main` under the DAG holds the grid only.
- **The unlit-style control re-renders the DAG's unlit marks only.** It must
  not re-render `.tv__main` wholesale; name in the lesson what else that
  wholesale re-render was doing and whether anything depended on it.
- **Groups are checkboxes.** The cycling "Groups: …" button becomes a small
  popover of independent checkboxes — one per group kind the layout knows
  (sub-stacks, studies, bodies, … read from the code's own group kinds, never
  a hand list) — each toggling that kind's translucent group independently;
  state persisted per viewer in `localStorage` (try/catch), default all on.
  The toolbar button reads "Groups (n of m)".

## Deliverables

1. The consolidation above (one component), with the dead `.tv__main`
   kinematic path removed, and the orphan reproduction (Unused toggle shows
   the table) turned into a regression check.
2. The checkbox popover and its persistence.
3. Browser checks: toggling Unused leaves `#detail`'s content identical
   (DOM diff empty); each checkbox hides exactly its kind's group elements.

## Definition of done

- `node scripts/run_viewer_browser_tests.mjs`, `node apps/viewer/run_tests.cjs`,
  `PYTHONIOENCODING=utf-8 venv-win/Scripts/python.exe -m pytest -q` green;
  witnesses `--changed-since integration` clean (the kinematic-page witnesses
  will move; re-anchor them).
- Screenshot of the results pane with plot + stops table + contributors in
  one column at 1600×1000.
- Lesson: what the shared re-render was coupling and what was removed.
