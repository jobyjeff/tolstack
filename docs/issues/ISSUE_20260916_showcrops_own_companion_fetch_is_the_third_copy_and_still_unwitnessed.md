---
type: chore
priority: low
status: open
area: viewer / tests
reporter: agent
found_by: docs/sessions/HANDOFF_20260916_viewer_unwitnessed_surface_guards.md
---

# `showCrop`'s companion term is the third copy of one line, and the only one still unwitnessed

`apps/viewer/topology_app.js` writes *"a balloon crop names a second image"*
three times, once per fetcher:

| # | site | fetcher | watched by |
| --- | --- | --- | --- |
| 1 | `loadDetailImage` | the detail pane | `pane-fetches-the-parts-list-companion` (2026-09-16) |
| 2 | `showCrop` | the plain crop popover | **nothing** |
| 3 | `cardPngs` | the hover cards | `card-fetches-the-parts-list-companion` (2026-09-16) |

`HANDOFF_20260916_viewer_unwitnessed_surface_guards.md` deliverable 1d named all
three as one edit and asked for one assertion — the pane's. Sites 1 and 3 got
witnesses; site 2 did not.

## Why it was left, and what it would cost

The three fetchers share `imageCache`, so whichever reaches a PNG first is the
only one that touches the adapter: a witness per site needs a **different live
balloon crop per site**. There are four live companions
(`rotor_fastener_length` ×2, `tan_link_to_pitch_plate`,
`vpa_output_to_pitch_plate`), so a third is available — that is not the
obstacle.

The obstacle is reaching `showCrop` at all. It is wired as `onCropShow` from two
places, and on the topology grid the crop trigger opens a **card**
(`onCardShow`) rather than the plain popover; the surviving live route is
`VA.renderStack`'s own crop trigger, i.e. stack mode, which the
`real render path (non-mock)` suite does not drive today. A witness therefore
costs a nav click into a loose stack plus an element selection, not the two
lines the other two cost.

## Impact if it reverts

The popover shows `VA.CROP_IMAGE_MISSING_TEXT` ("This crop's image is not on
disk — the crop index is out of date.") under the heading "Parts list, sheet 1",
which is a statement about the index that is not true. Low rather than med
because the same revert on either of the other two sites is now loud, so the
whole-line deletion the three copies invite is already caught — what is
uncovered is site 2 alone.
