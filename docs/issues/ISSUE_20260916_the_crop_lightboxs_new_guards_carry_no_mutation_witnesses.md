---
type: chore
priority: low
status: open
area: viewer/tests
reporter: agent
found_by: docs/sessions/HANDOFF_20260916_crop_lightbox_zoom_viewer.md
---

# The crop lightbox's guards are undeclared in the mutation-witness tier

`crop_lightbox_zoom_viewer` (2026-09-16) added 15 fast-tier checks and one
browser suite and declared **no** entries in `scripts/mutation_witnesses.json`.
The tier still reports 54/54, so nothing is red — the guards are simply outside
the set of claims that have been shown to bite. The handoff did not ask for
witnesses; this is the filing so the gap has an owner after it closes.

## The three worth a witness, and the mutation each should redden

1. **`transform-origin: 0 0` on `.lightbox__pan`** (`apps/viewer/style.css`).
   Change it to the CSS default (`50% 50%`) and the browser suite's anchor
   check should fail: the pure layer measures anchors from the stage's
   top-left, so a centred origin offsets every zoom by half the stage. This is
   the highest-value one — it is a **stylesheet** claim, which is exactly the
   class a class-name assertion passes straight through, and the fast tier
   cannot see it at all.

   Expected red (browser, `crop lightbox (launch, zoom, pan on the live
   crops)`): *what was under the pointer is still under the pointer after the
   zoom — zooming about the stage's corner walks whatever the reader is
   looking at off the edge*

2. **The launcher's position inside the frame** (`views/crop.js`'s
   `launchButton`): append it to the crop BLOCK rather than the figure, and the
   parity walks should fail — a balloon crop then shows two pictures and one
   launcher.

   Expected red (fast): *every surface that shows a crop carries a launcher,
   one per picture — because there is one crop builder and the button is on it*

3. **The frame's pixel sizing** (`views/lightbox.js`'s `apply()`): drop the
   `figure.style.width/height` writes and let the shared `.croppop__img
   { width: 100% }` rule size the picture instead. The browser suite's
   fraction-against-`frac` check should fail, because the frame then stops
   being the picture's own box.

   Expected red (browser, same suite): *at fit, the highlight box lands
   exactly on the rect the crop index wrote — measured off the laid-out
   picture, against `highlights[].frac` itself*

Each has to be planted, watched reddening and reverted before the entry is
declared — a declared witness that has never been seen red is worse than none,
because it reads as coverage.
