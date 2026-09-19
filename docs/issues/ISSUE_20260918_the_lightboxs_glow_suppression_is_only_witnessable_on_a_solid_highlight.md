---
type: chore
priority: low
status: open
area: viewer/tests
reporter: agent
found_by: docs/sessions/HANDOFF_20260918_visual_rules_nothing_checks.md
---

# `.lightbox .crophl`'s glow suppression cannot be witnessed on the crop the lightbox suite drives, because that crop's box is dashed and zeroes the glow itself

Left behind by `visual_rules_nothing_checks` (2026-09-18), which witnessed the
other half of the same CSS rule.

`.lightbox .crophl` makes two claims:

```css
.lightbox .crophl {
  border-width: calc(2px / var(--lightbox-scale, 1)); box-shadow: none;
}
```

The **border** half is now pinned — `crop lightbox (launch, zoom, pan on the
live crops)`, sub-check *"the highlight's edge is declared THINNER the further
the reader zooms in"*. Deleting the rule reddens it (verified by planting the
edit in a scratch tree: `2px at 1x and 2px at 5.06x`).

The **glow** half is not, and on the suite's current subject it cannot be. The
subject is derived as the first live edge whose crop is a `declared_region`
(the highlighted-cell case Jeff's note was about). `declared_region` is
`solid: false` in `VA.CROP_HIGHLIGHT_KINDS`, so `views/crop.js` classes its box
`.crophl--dashed` — and that rule carries `box-shadow: none` of its own:

```css
.crophl--dashed {
  border-style: dashed; background: rgba(255, 196, 0, .07); box-shadow: none;
}
```

So a `boxShadow === "none"` assertion on that picture is green whether or not
the lightbox rule exists. A sub-check was written, measured to be green with
the rule deleted, and removed rather than shipped — a check that passes for a
reason other than the one it is named for is the exact defect this handoff
existed to close, and adding one while closing three others would have been a
poor trade.

## Why the claim is still real

The glow is live on **29 of the 46** highlights in the current index — every
`verified_match` one, which is `solid: true` and so never gets the dashed
rule's suppression:

| `located_by` | highlight `kind` | n | dashed? |
| --- | --- | --- | --- |
| `zone_cell` | `verified_match` | 16 | no — glow on |
| `callout_text` | `verified_match` | 10 | no — glow on |
| `balloon_view` | `verified_match` | 3 | no — glow on |
| `declared_region` | `declared_region` | 16 | yes |
| `zone_cell` | `declared_region` | 1 | yes |

On any of those 29 the glow is `0 0 0 1px rgba(0,0,0,.35), 0 0 10px 2px
rgba(255,196,0,.45)` from `.crophl`, it rides the transform like everything
else, and at 8× it is a blurred amber wash across the cell the reader zoomed in
to read — the same defect as the 16px border, in a softer form.

## The route to closing it

Derive a **second** subject alongside the existing one: the first live edge
whose crop resolves with a `verified_match` highlight. Open the lightbox on it,
assert `getComputedStyle(box).boxShadow === "none"` at fit, and assert the
non-vacuity witness that the box is `.crophl--solid` (so the base rule's glow
was the thing being suppressed). That is one extra open/close cycle in a suite
that already runs 21 sub-checks, which is the only reason it was not folded in.
