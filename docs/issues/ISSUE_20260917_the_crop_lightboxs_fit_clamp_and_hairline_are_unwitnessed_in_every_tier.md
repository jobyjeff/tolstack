---
type: bug
priority: med
status: triaged
area: viewer/tests
reporter: agent
handoff: docs/sessions/HANDOFF_20260918_visual_rules_nothing_checks.md
found_by: docs/sessions/reviews/REVIEW_20260917_crop_lightbox_zoom_viewer.md
---

# Three of the crop lightbox's four geometric wiring lines can be deleted with every tier green

Measured 2026-09-17 in `review/crop_lightbox_zoom_viewer`, by planting each
edit in a `git archive HEAD` scratch tree inside the worktree and running all
three tiers (`node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`,
`node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack
--only "crop lightbox"`, `venv-win/Scripts/python.exe -m pytest -q`).

Eleven one-line reverts were tried against `views/lightbox.js`,
`views/crop.js`, `style.css` and `topology.html`. **Eight redden a tier and
name the right check.** Three do not:

| the edit | fast | browser | what the reader gets |
| --- | --- | --- | --- |
| drop `figure.style.width/height` from `apply()` (the fit-to-stage sizing) | 453/453 | 17/17 | the crop renders at its natural 1374×1566 in an 846px stage — the top half of the sheet, and **the drag is declined at fit**, so there is no way to see the rest |
| drop `view = VA.lightboxClamp(view, fit, stageBox())` from `apply()` | 453/453 | 17/17 | at fit the crop is hard against the stage's left edge (gap 0 / 776 rather than 388 / 388), and a drag runs unbounded until the picture is off-screen |
| delete the whole `.lightbox .crophl` rule (hairline border + `box-shadow: none`) | 453/453 | 17/17 | the highlight's 2px edge scales with the transform — a 16px amber frame at 8× across the cell the reader zoomed in to read, which is the defect the lesson records measuring at 7.59× |

The three witnessed geometry edits, for contrast:
`transform-origin: 0 0` → `50% 50%` (browser 16/17, on the anchor check),
the near-full-viewport `width: 96vw; height: 92vh` (browser aborts, 2 failed),
and dropping the post-`showModal()` `openHandle.apply()` (browser 16/17).

## Why the tiers cannot see these three

Two different causes, and only one of them is "no assertion exists".

1. **The check named for the claim reads the view store, not the page.** The
   sub-check *"it opens at FIT, the whole crop on screen, not at some
   remembered zoom"* asserts `fit.scale === 1`. `scale` is
   `handle.view().scale` — it is 1 in both the shipped and the unfitted
   states, because nothing about the frame's pixel size feeds it. The check
   whose *name* is the claim is therefore the reason nobody notices the claim
   is unpinned (`docs/prompts/REVIEW_AGENT.md`, "A `[real]` test that asks the
   view-model instead of the page").
2. **The `frac` checks are invariant to all three.** They compare the
   `.crophl`'s rect against the `<img>`'s rect, and the overlay is positioned
   in percentages *of that element* — so the fraction is right whatever size,
   position or border the frame ends up with. That invariance is the
   feature's central design claim and it is correct; it also means the frac
   checks cannot be the pin for anything about the frame itself.

## The fix, three assertions in the existing browser suite

All three are measurable at the sub-check the suite already stands in, and
none needs a new fixture:

* **fit** — after `measure()` at fit, assert the picture is inside the stage:
  `fit.image.width <= stage.width + 1 && fit.image.height <= stage.height + 1`,
  with the stage box read the same way the wheel's centre already is.
* **clamp** — at fit, assert the picture is centred on the slack axis
  (`|left gap − right gap| <= 1`); and after the existing hard drag, assert no
  gap opens (`image.left <= stage.left + 1`). The drag in step 6 already moves
  180px; a second, deliberately over-long drag is one line.
* **hairline** — read `getComputedStyle(box).borderTopWidth` at fit and again
  zoomed, and assert the *painted* width (`border × scale`) has not grown:
  the values measured here are `2px` at 1× and `1px` at 5.06× (0.395px,
  rounded by the engine), against a flat `2px` with the rule gone.

Each should then be declared in `scripts/mutation_witnesses.json` alongside
the two paste-ready entries in
`ISSUE_20260916_the_crop_lightboxs_new_guards_carry_no_mutation_witnesses.md`
— but the assertion has to exist before the witness can, which is why this is
filed separately from that one.

## Not a defect in the shipped behaviour

All three lines are present and correct on `integration`; the screenshots in
`docs/sessions/lessons/LESSONS_20260916_crop_lightbox_zoom_viewer_2…png` and
`…_3…png` show the fitted, centred picture and the hairline box. This is
coverage, not a bug a reader can hit today — filed `bug` rather than `chore`
because what is missing is an assertion about shipped behaviour, and the
`bug` route stages a fix rather than a design question.
