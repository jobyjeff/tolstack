---
priority: med
depends_on: [crop_lightbox_zoom_viewer]
model: opus
---

# HANDOFF 2026-09-16 — design_pass_typography: one typography/visual-hierarchy pass over the viewer and annotator

Source: Jeff's 2026-09-16 forge note `20260916T175137_lj0lgi`: "different
emphasis, font/font size, line spacing, color, layout, etc. can play together
to make ui design look professional and easy on the eyes… Let's make a pass
over all these apps and apply some of those principles. I think it's worth an
initial pass (one tactical per app/service)." This is tolstack's pass — one of
five staged across the workspace; the durable prompt-side guidance is
dispatch's `prompt_design_guidelines`. Baseline: `master` after the staged
viewer chain (`viewer_hover_deslop_and_banner_purge` →
`flyout_resize_annotator_filter_and_deselect` → `crop_lightbox_zoom_viewer`)
merges — you are a **styling-only** pass over the settled surfaces. Scope:
`apps/viewer/` and `apps/annotate/` CSS + the class/markup touches styling
needs; NO behavior changes, NO copy changes (words live in `VA.*`/`AA.*`
constants with paired tests — if a word must change it is out of your scope,
file an issue), NO layout-mechanism rework (the DAG geometry questions are
`BRIEF_20260914_dag_layout_geometry_tradeoffs`'s, hover occlusion is
`BRIEF_20260914_hover_card_occlusion_and_a11y`'s).

## The principles (apply, don't restate per-surface)

- Hierarchy by type, not decoration: size/weight/spacing carry structure;
  secondary info muted, not smaller-and-bolder; ≤ ~2 type sizes per component
  beyond body.
- Emphasis is a budget: one accent per view; when everything is bold/colored/
  badged, nothing is; ALL-CAPS only for tiny labels.
- Semantic color only: red/amber/green = state, never decoration; metadata =
  muted gray; contrast holds in both themes.
- Alignment: one grid per view; numbers right-aligned, tabular numerals where
  available; no centered prose.
- Whitespace before chrome: spacing first, borders second; no
  boxes-inside-boxes.
- Measure and rhythm: prose ~45–90 chars, line-height ~1.4–1.6; data rows
  tighter, scannable.
- Monospace only for genuine code/id content.
- Quiet controls: affordances subdued until hover/focus; a row with no alerts
  shows nothing.

## Deliverables

1. Sweep every rendered surface of both apps (topology page: nav rail, DAG,
   grid, preview pane, hover cards, dialogs; stack/detail/worksheet views;
   annotator: rails, detail pane, canvas chrome) against the principles.
   Fix what CSS can fix. Jeff's named sore spot to hit first: the loud
   alert/source styling and how it drowns the menu structure (the
   consolidation itself lands in `flyout_resize_annotator_filter_and_deselect`
   — you tune the type: weight, size, color temperature of what remains).
2. A short `docs/` note (or an addendum in an existing style/README doc — one
   home, agent's choice) recording the type scale, spacing scale, and color
   roles the pass settled on, so the next surface copies instead of inventing.
3. Anything the principles condemn but CSS cannot fix (a layout that needs
   restructuring, copy that needs rewording) → `docs/issues/` entries, filed
   not fixed.

## Definition of done

- Before/after screenshots for each major surface, committed under
  `docs/sessions/lessons/` — both themes for at least the topology page.
- All three test tiers green (`pytest -q`, `run_tests.cjs`, browser runner,
  `--repo C:/workspace/tolstack`); no vocabulary constant or projection field
  changed.
- Lesson (`docs/sessions/lessons/LESSONS_20260916_design_pass_typography.md`):
  the scale/roles chosen; the issues filed; the surfaces deliberately left
  alone and why.
