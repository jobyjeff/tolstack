---
type: chore
priority: med
status: open
area: scripts/mutation-witnesses
reporter: agent
found_by: docs/sessions/HANDOFF_20260916_crop_lightbox_zoom_viewer.md
---

# The crop lightbox's guards are undeclared in the mutation-witness tier

`crop_lightbox_zoom_viewer` (2026-09-16) added 16 fast-tier checks and one
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

---

## Review addendum, 2026-09-17 (`review/crop_lightbox_zoom_viewer`)

Three changes, all measured on the merged tree.

**`priority` low → med and `area` → `scripts/mutation-witnesses`, to group
with its two same-day siblings**, which state the same gap for two other
handoffs at `med`:
`ISSUE_20260916_three_new_guards_have_no_mutation_witness_entry.md` and
`ISSUE_20260916_the_reader_facing_copy_guards_have_no_mutation_witness_entry.md`.
Both were already in this handoff's own merge-base tree (`a3e8b4f`), so this
is a third filing of one shape rather than a discovery — not a duplicate (each
names different guards), but triage should stage them as one enrolment pass.

**Prediction 3 above does not reproduce.** Dropping the `figure.style.width` /
`figure.style.height` writes from `apply()` leaves the browser suite
**17/17 PASS** and the fast tier **453/453** — the `frac` check compares the
box against the *picture's own* box, and both are still the frame, so it
cannot see a frame that is no longer fitted. What actually happens is worse
than the prediction: at `scale: 1` the crop renders at its natural
1374×1566 in an 846px-tall stage, so the reader sees the top half of the
sheet and cannot pan out of it (the drag is declined at fit). That is now
filed on its own, with the other two unwitnessed lines, as
`ISSUE_20260917_the_crop_lightboxs_fit_clamp_and_hairline_are_unwitnessed_in_every_tier.md`
— those three need an **assertion written first**, which is a different job
from declaring a witness for a guard that already bites.

**Predictions 1 and 2 do reproduce**, verified by planting each in a
`git archive` scratch tree:

* `transform-origin: 0 0` → `50% 50%`: browser 16/17, red on exactly the named
  sub-check (*what was under the pointer is still under the pointer after the
  zoom*).
* the launcher's `frame.appendChild(launchButton(...))` deleted: fast tier
  450/453, red on the two parity walks and on the no-op click check.

So two of the three are paste-ready as written; the third's `expect_red` would
have been declared against a check that cannot fail on it.
