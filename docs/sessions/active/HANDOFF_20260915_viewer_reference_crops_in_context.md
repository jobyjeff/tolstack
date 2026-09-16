---
priority: high
depends_on: [viewer_component_names_and_reference_copy]
model: opus
---

# HANDOFF 2026-09-15 — viewer_reference_crops_in_context: crops that show where a value lives, not four floating numbers

Source: Jeff's 2026-09-15 review (forge note `20260915T145908_fwc7qp`).
Baseline: `master` @ `3141e51` + `viewer_component_names_and_reference_copy`
merged (it owns the surrounding copy; this handoff owns the images and their
highlight overlays). Scope: this session owns `scripts/build_viewer_crops.py`
and the crop-rendering paths in `apps/viewer/` (preview pane, hover cards,
detail view), plus their tests. Do NOT touch `apps/annotate/` or the
respine/tween code.

## What's wrong today (Jeff, verbatim where quoted)

- The NAS bolt's crop "is just four numbers with no context for what they
  mean" — a tight strip of the Grip Dash row with no column headers and no
  figure.
- The pitch-plate crop "just shows dimensions floating in space, the part
  itself is cropped out of the view, can't tell what they are attached to."
- The bushing's location-reference crop is the right idea (a real view of
  DETAIL B) but has no balloon highlight and no parts-list row.

## Deliverables

1. **Location reference = drawing-view crop + balloon glow + PL row + link.**
   For an element cited to an assembly-drawing balloon: crop the drawing
   *view* containing the balloon with the balloon highlighted — same glow
   treatment drawing-checker uses on its run page (reuse its crop/glow
   assets or replicate the style; investigate what drawing-checker already
   produces for these drawings before building new rendering — report the
   reuse verdict in the lesson). Beside it, the parts-list row crop for that
   item (so PN/description are visible), and a link to the drawing-checker
   page for that drawing, link text = part number + revision (e.g.
   "217755 rev A.1"), never "open run" or a URL.
2. **Datasheet values = whole table + figure, with a highlight box on the
   used cell.** For spec-sheet-sourced values (the NAS sheet): show enough
   of the page that the column headers and the associated figure are
   legible — "This is actually similar to the old style where most of the
   entire page is included" — with a selection box around the exact cell(s)
   each tolerance component uses. One image, N highlight boxes is fine when
   several components read from one table; each component's preview
   highlights its own cell.
3. **Crop regions include the geometry.** A dimension crop must contain the
   feature the dimension attaches to — widen regions (or anchor them on the
   view, not the dimension text) so no crop shows callouts floating in
   space. The pitch-plate 215197 zone-D10 crop is the named failing case.
4. **Declared-region honesty stays.** Where today's crop is "the citation,
   not a match" (callout text not found in the zone), the image treatment
   must still distinguish verified-match highlights from declared-region
   boxes — visually (e.g. solid vs dashed box), not with the jargon sentence
   the copy handoff removed.

## Definition of done

- On the live pitch-link topology, rebuilt crops show: bolt grip → NAS sheet
  table with headers + figure + highlighted Grip Dash No. 11 cell; bushing →
  DETAIL B view with balloon 8X glowing + PL row crop + "214820-002 …" link
  into drawing-checker; pitch plate → a crop where the lug geometry is
  visible under the 5X 4.06 callout.
- Crop-builder tests pin region selection for those three cases (value-level:
  the emitted region rectangles / included anchors), and a rendering test
  asserts highlight boxes are emitted for datasheet cells.
- Full suite green; lesson records the drawing-checker asset-reuse verdict
  and the region-sizing heuristics chosen.
