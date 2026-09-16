---
type: bug
priority: med
status: triaged
area: apps/viewer + scripts/build_viewer_crops
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20260915_viewer_reference_crops_in_context.md
handoff: docs/sessions/HANDOFF_20260916_viewer_unwitnessed_surface_guards.md
---

# Three load-bearing wires of the crop overlay revert silently: every tier stays green

`viewer_reference_crops_in_context` is pinned where it is a pure function and
where it is a renderer fed a hand-built entry. It is **not** pinned at the three
seams that carry the deliverable from the builder to the screen. Each of the
following is one edit, and each leaves pytest at its baseline (`1121 passed,
1 skipped`, the one pre-existing red), `run_tests.cjs --repo` at **407/407** and
`run_viewer_browser_tests.mjs` at **20/20**. All measured 2026-09-16 on the
merged review branch, against a projection set built from that tree.

## 1. The letterbox fix — the one the lesson says the browser tier caught

`apps/viewer/style.css`: put the pre-handoff rule back —

```css
/* replaces .hovercard .cropblock .cropfig { max-width: calc(260px * var(--crop-ratio, 1)); … } */
.hovercard .cropblock img.croppop__img { max-height: 260px; object-fit: contain; }
```

`object-fit: contain` insets the picture inside its element while the overlay is
positioned in percentages **of the element**, so every highlight on a hover card
points into the letterbox instead of at the cell. That is verbatim the defect
`LESSONS_20260915_viewer_reference_crops_in_context.md` §2 describes as "the
unforeseen cost" — and no tier can see it. The fast tier has no geometry; the
browser tier never opens a card that shows a crop with a highlight.

## 2. The builder stops emitting the companion

`scripts/build_viewer_crops.py::_crop_from_citation`: replace the
`parts_list_companion(...)` call with `companion = None`. Deliverable 1's second
image disappears from all four live balloon crops. `tests/test_viewer_crops.py`
is 73/73 green — `parts_list_row_rect` and `parts_list_row_for` are tested as
pure functions, and nothing asserts the builder calls them. The precedent for
the missing test is in the same file: `test_crop_element_crops_a_pile_citation_
to_its_declared_region` drives the whole render path under a `fitz` stand-in,
which works because `fitz` is imported lazily.

## 3. The builder stops emitting the drawing link's text

Same function: `"drawing_no": None`. `VA.drawingLinkText` then returns `null` on
every entry and the crop link falls back to *"open the drawing in
drawing-checker"* — the wording the handoff existed to replace. The JS side is
tested against a hand-built entry that carries the field; the Python side is not.

## 4. The viewer stops fetching the companion image

`apps/viewer/topology_app.js`, three sites: the two
`if (entry.companion && entry.companion.png) pngs.push(...)` lines and
`cardPngs`' `entry.companion && entry.companion.png` term. Every balloon crop
then renders *"This crop's image is not on disk — the crop index is out of
date."* under the heading *"Parts list, sheet 1"*. Fast tier 407/407, browser
20/20. (The fast-tier companion tests pass their own `images` map in, so they
cannot see the fetcher.)

## Suggested shape

- **1** needs a geometric assertion at a viewport where a card's crop is open:
  the highlight box's client rect is inside the `<img>`'s client rect, with a
  non-vacuity witness that the cap actually bit (the crop is taller than 260px
  unbounded). Same shape as `CARD_LAYOUT_VIEWPORT`'s own witness.
- **2** and **3** want one wiring test through `crop_element` with the existing
  `fitz` stand-in, asserting the emitted entry's `companion.find_no` /
  `drawing_no` — and the `FakePixmap` trick from `spec_crop_region_registry`
  round 2, whose size reports *which* rect rendered.
- **4** wants a fast-tier assertion that the pane's fetch list names the
  companion PNG.

Each of the four then earns a `scripts/mutation_witnesses.json` entry. One was
declared in review for the half that **does** redden
(`crop-carries-the-boxes-worth-looking-at`, witnessed 1/1); these four could not
be, because no check goes red on them.
