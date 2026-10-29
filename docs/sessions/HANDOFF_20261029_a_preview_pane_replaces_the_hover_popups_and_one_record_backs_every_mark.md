---
priority: high
depends_on: [the_contributor_table_lives_in_the_results_pane_and_groups_are_checkboxes, a_leader_starts_at_the_mark_it_names_on_every_tier]
model: opus
hitl: false
---

# HANDOFF 2026-10-29 — a_preview_pane_replaces_the_hover_popups_and_one_record_backs_every_mark: one element record behind 3D, DAG and grid; hover previews in the right pane, click freezes it, popups go

Source: Jeff's forge note `20261029T135845_jdy8k2` ("additional
features/changes"), consumed by the 2026-10-29 strategy session
(`dispatch/docs/strategy/HANDOFF_20261029_strategy.md`); it also consumes
`docs/strategy/BRIEF_20260914_hover_card_occlusion_and_a11y.md` and the
data-model half of `docs/strategy/BRIEF_20260911_viewer_3d_and_card_content_reach.md`.
Baseline: `master` with both `depends_on` landed. Scope: the element record
(a new module under `apps/viewer/` or `tolerance_stack/` + projection field,
your call, named in the lesson), `apps/viewer/topology_app.js` (`#detail`
composition), the hover-card code in `apps/viewer/views/topology.js` and
the grid, `apps/annotate/` hover/selection messaging, `apps/viewer/topology.css`,
tests. Do NOT touch zoom/Fit, the rearrange tween, or the leader anchors
beyond consuming the record they now share.

Jeff's words (the requirement):

> Let's move towards consolidating the underlying data associated with each
> element. The point of the leader lines is that they're tracing the same data
> from 3d to 2d to grid view, which means all of them should present the same
> additional data when hovered or clicked. The other thing: the hover previews
> are actually pretty jarring and obscure too much of what you're trying to
> look at or select. So if you go to hilight a specific node in the 2d dag, as
> you move the mouse across the dag any element you trace across causes the
> popup to appear, which in many cases obscures the node you're actually
> trying to select. Let's try to break this down and consider what to do for
> each tier (hover, click), in terms of what appears in the popup/tooltip vs
> the preview/details pane on the right. I'd consider adding one or more
> horizontal dividers to the right pane, so that it contains a preview pane
> that shows the details (especially the thumbnail crop for the source) for
> whatever element is hilighted. Clicking the item then freezes the pane. If
> you then drag over other elements it momentarily switches to the preview to
> the thing you're hovering over, but if you don't click, then it returns to
> the last frozen item when you move the mouse away. I think this gets a good
> combination of having a large, legible preview that doesn't obscure the rest
> of the view (the current popups are both too small to be legible and so large
> that they obscure everything else you're looking at)

## Decisions (made)

- **One element record.** Every mark on every tier — a 3D face/anchor, a DAG
  node or edge, a grid row — resolves to one record by one key (the topology
  node/edge id, or the stack element id), built once (projection-time, from
  the topology, the study results, the crops and the bindings), carrying:
  title, kind, part + drawing citation, nominal/min/max/band, confidence,
  the source crop thumbnail reference, the binding state, the contribution
  in the active study. The three tiers render **from the record**; no tier
  composes its own text.
- **Hover = preview; click = freeze.** The right pane gets a horizontal
  divider: results above (as today), **Preview** below. Hovering any mark on
  any tier shows its record in Preview (title, crop thumbnail large enough
  to read, the key numbers, the citation). Clicking freezes Preview on that
  element (a pin glyph and the element's name in the section header);
  hovering others previews them momentarily and the pane returns to the
  frozen element when the pointer leaves marks. Click on empty canvas or Esc
  unfreezes. Selection (what is lit) and freeze are the same action.
- **Popups go.** The DAG hover cards are removed. The only in-canvas hover
  affordance is the mark's own highlight plus a native-`title`-sized label
  (≤ 1 line, the element name) that never covers a neighbouring mark —
  position it at the mark's rail side. The brief's accessibility half: every
  focusable mark has an accessible name (the record's title) and keyboard
  focus previews exactly like hover.
- **Typography follows `docs/DESIGN_TYPE_AND_COLOUR.md`**; the Preview is
  the one place a crop may be large.

## Deliverables

1. The element record and its builder, with a value-level test that every
   lit mark on the product model resolves to a record (no orphan marks).
2. The Preview section, hover/freeze/return behaviour, keyboard parity.
3. Hover cards removed; the mutation witnesses and checks that enrolled them
   re-anchored to the Preview (never deleted silently — list them in the
   lesson).
4. Browser checks: hover over mark A previews A; click A; hover B shows B;
   leave → A again; Esc → nothing frozen; the same for a grid row and a 3D
   anchor; no element in the DAG canvas larger than the label is created on
   hover.

## Definition of done

- Tiers green: `node scripts/run_viewer_browser_tests.mjs`,
  `node apps/viewer/run_tests.cjs`, `node apps/annotate/run_tests.cjs`,
  `PYTHONIOENCODING=utf-8 venv-win/Scripts/python.exe -m pytest -q`;
  witnesses `--changed-since integration` clean.
- Screenshots at 1600×1000: hover state, frozen state, frozen + transient
  hover, on the kinematic study.
- Lesson: where the record lives and why; every check/witness re-anchored;
  what the three tiers used to compose independently (the drift this ends).
