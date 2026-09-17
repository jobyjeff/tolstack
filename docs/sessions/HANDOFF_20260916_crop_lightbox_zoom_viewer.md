---
priority: med
depends_on: [flyout_resize_annotator_filter_and_deselect]
model: opus
---

# HANDOFF 2026-09-16 — crop_lightbox_zoom_viewer: launch any source thumbnail into a full-size zoom/pan viewer

Source: Jeff's 2026-09-16 forge note `20260916T175137_lj0lgi`: "selection box
style sources (hilighted cells in the datasheet tables etc) are moving in the
right direction, but thumbnail is too small to be legible… Maybe a button in
the thumbnail that lets you launch it into a separate, full size viewer
(either a popup or separate page) that allows you to zoom/pan?" (his
screenshot: `C:\workspace\forge\data\inbox\atomic-notes\attachments\20260916T175137_lj0lgi\paste-20260916T172223.png`).
Baseline: `master` after `flyout_resize_annotator_filter_and_deselect` (chain
over `apps/viewer/`). Scope: `apps/viewer/views/crop.js`, a new lightbox
module/dialog, CSS, tests. Do NOT touch `scripts/build_viewer_crops.py` or the
crop-region registry (`scripts/record_spec_crop_region.py`) — the images and
`highlights[].frac` data are already right; this is a presentation surface.

## Deliverables

1. **Every `cropFigure` surface gets a launch affordance.** One builder serves
   them all (`VA.cropFigure`, `views/crop.js:63-89`; highlight overlays are
   positioned DOM divs from `entry.highlights[].frac`, `crop.js:108-127`) — so
   one affordance covers hover cards, the standalone popover, the preview
   pane, and companion figures. A small button on the figure (shown on hover
   is fine; it must be reachable by keyboard too) opens the full-size viewer.
   The grid's inline `tvthumb` path (`views/topology.js:1207-1211`) bypasses
   `cropFigure` and carries no overlay — route it through the same launcher
   (clicking a grid thumbnail already opens the hover card today; the card's
   figure carrying the launch button is acceptable coverage — your call,
   record it).

2. **The lightbox: zoom + pan, highlights intact.** Host it in a `<dialog>` —
   the page already uses that pattern three times (`#legend-dialog`,
   `#worksheet-dialog`, `#annotate-flyout`, `topology.html:58,139,152`).
   Requirements: near-full-viewport; wheel/buttons zoom + drag pan (CSS
   transform on a wrapper keeps the `.crophl` percentage-positioned highlight
   boxes aligned for free — verify, don't assume); the highlight boxes render
   at full size; Escape and ✕ close; no page scroll bleed. Keep it
   build-free vanilla JS like everything else in `apps/viewer/` — no
   dependency.
3. **Caption discipline carries over.** The lightbox shows the one concise
   where-line (document · rev · sheet) and the open-PDF / drawing-checker
   links that the card already renders — nothing longer. No new prose.

## Definition of done

- Verified in a real browser on the live projections
  (`C:\workspace\tolstack\data\projections\viewer\`): screenshots under
  `docs/sessions/lessons/` of (a) a datasheet-table crop (a `spec_pile` /
  cell-highlight case, e.g. the NAS grip-table crop) open in the lightbox at
  full size with its highlight box aligned, (b) the same crop zoomed in on the
  highlighted cell.
- A test that the highlight box's position tracks the image under zoom
  (value-level on the transform arithmetic if the browser tier can't measure
  pixels), and that every `cropFigure` surface renders the launch affordance.
- All three tiers green (`pytest -q`, `run_tests.cjs`, browser runner,
  `--repo C:/workspace/tolstack`).
- Lesson (`docs/sessions/lessons/LESSONS_20260916_crop_lightbox_zoom_viewer.md`):
  the zoom/pan mechanism chosen and why; whether the grid thumbnail got its
  own launcher or rides the hover card; any surface that could not share the
  single affordance.
