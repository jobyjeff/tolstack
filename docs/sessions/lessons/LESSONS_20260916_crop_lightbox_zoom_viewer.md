# LESSONS 2026-09-16 — crop_lightbox_zoom_viewer

Three deliverables off Jeff's 2026-09-16 note ("thumbnail is too small to be
legible… Maybe a button in the thumbnail that lets you launch it into a
separate, full size viewer … that allows you to zoom/pan?"). Everything below
is measured, and the screenshots beside this file are re-takeable:

```
node tests/debug_crop_lightbox.mjs --repo C:/workspace/tolstack
node tests/debug_crop_lightbox.mjs --repo C:/workspace/tolstack \
     --shots docs/sessions/lessons
```

a hand-run probe (never a tier), committed for the same reason the previous
four sessions' were.

> **`npm install` in the worktree root first**, or the browser tier will not
> start: Node resolves bare specifiers from the running script's own ancestors,
> so `scripts/run_viewer_browser_tests.mjs` needs *this* tree's
> `node_modules/`. It is written down in four previous lessons and it is still
> the first thing that stops a session.

## 0. The numbers

| | at my base `a3e8b4f` | after |
| --- | --- | --- |
| `venv-win/Scripts/python.exe -m pytest -q` | 1192 passed, **1 failed**, 1 skipped | 1192 passed, **1 failed**, 1 skipped |
| `node apps/viewer/run_tests.cjs --repo …` | 437/437 | **453/453** |
| `node scripts/run_viewer_browser_tests.mjs --repo …` | 21/21 suites | **22/22 suites** |
| the new browser suite | — | **17/17 sub-checks** |
| `node scripts/run_mutation_witness_tests.mjs --repo …` | (54/54, per the previous lesson) | **54/54, none unwitnessed** |

The pytest red is **not mine and not new**:
`test_no_live_document_states_an_unguarded_hardware_entry_count`, on a strategy
brief's prose. Three open issues describe it and the previous three lessons say
the same thing about the same test. I did not re-run pytest at the branch point
before starting, so here is the stronger form of the same claim: the test's two
inputs are `docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md`
and `docs/tolerance_stacks/hardware_entries.json`, and
`git diff a3e8b4f --name-only` on this branch names **neither**: nine viewer
files, the browser tier, one hand-run probe, three issues, and this lesson with
its six screenshots.

The two `suite file://` / `suite http` passes read **352/352** each after this
work. I did not re-measure that particular number at the branch point, so do
not read a delta off the previous lesson's 315 — the browser total and the node
total differ anyway (the `[real]` node-fs tests are not registered at all in a
browser), and the fast tier's 437 → 453 is the number I measured both ends of.

The mutation tier I measured only at the end, and the "before" column is the
previous lesson's figure rather than mine. It is nevertheless the same set:
`scripts/mutation_witnesses.json` is not in this branch's diff, because this
handoff declares no new witnesses (filed — §5).

---

## 1. The decision the whole surface turns on, and why it needed no arithmetic

The handoff said "CSS transform on a wrapper keeps the `.crophl`
percentage-positioned highlight boxes aligned for free — verify, don't assume."
**It does, exactly, and the verification is worth keeping** because it is the
argument against every alternative:

* a `.crophl` is `left/top/width/height` in **percentages of `.cropfig`**;
* `.cropfig` is the element the `<img>` fills;
* so transforming any ancestor scales the picture and the boxes **in one
  step**, and nothing anywhere converts a `frac` into a pixel.

Measured in a real browser on the live NAS6403-NAS6420 grip table (1374×1566,
`spec_pile` / `declared_region`): the box's rect, read as a fraction of the
laid-out picture, **drifted by 0** across a 7.59× wheel zoom and again across a
drag. The browser suite pins that fraction against `crops.json`'s own
`highlights[].frac` at fit, zoomed and panned.

Two things I nearly got wrong here, both of which would have been a green fast
tier and a wrong picture:

1. **`transform-origin` must be `0 0`.** The pure layer's anchors are measured
   from the stage's top-left; a centred origin (the CSS default) silently
   offsets every zoom by half the stage.
2. **Do not cap the crop's HEIGHT in CSS.** That means `object-fit: contain`,
   which insets the picture inside its element, and a percentage overlay then
   points into the letterbox. `style.css` already recorded this trap for the
   hover card (`--crop-ratio`). Instead the *frame* is sized in pixels to the
   fitted box (`VA.lightboxFitSize`) and the picture fills it exactly — so the
   element **is** the picture, which is the one arrangement in which the
   overlay is right at every zoom level.

### The one place the transform is wrong, and the fix

Transforming the subtree scales the highlight's **border** too. At 7.59× the
2px amber edge was a 15px frame lying across the digits of the very cell the
reader had zoomed in to read — visible in the first take of shot 3. So
`apply()` publishes `--lightbox-scale` and `style.css` divides it back out of
`border-width`; `box-sizing: border-box` means that cannot move the rect. The
glow (`box-shadow`) is dropped in the lightbox outright: it exists so a small
box is findable on a thumbnail, and at full size the box is the most obvious
thing on the picture.

---

## 2. One launcher, because there is one crop builder

The affordance is a `<button>` inside `VA.cropFigure`. That is the whole of
deliverable 1: the popover, the hover cards, both preview panes and a balloon
crop's parts-list companion are all that one builder, so five surfaces got it
in one change, **one per PICTURE rather than one per surface** (a balloon crop
offers two, each opening its own), and a sixth cannot be added without one.

`VA.openCropLightbox` reaches for the page's `<dialog>` itself rather than
being handed one. Threading a launcher through `cropBlock` → `cropFigure` →
`companionFigure` and four calling surfaces would be five parameters carrying
one page-level fact. The cost is that the builder has to tolerate the dialog's
absence — it does, as a no-op, and there is a test that clicks the button in
the DOM shim (which has no `document.getElementById` at all) and requires the
click to land.

### The grid thumbnail rides the hover card — and that is now pinned, not remembered

The handoff left this as a call. The grid's inline `tvthumb` is the one crop
image on the page that is **not** a `cropFigure`, and it keeps no launcher of
its own: clicking a grid thumbnail already opens the edge card, and that card's
figure carries the button. Two clicks to full size, no new affordance in a
16px-pitch table cell, and no second copy of the launch wiring. Both halves are
asserted — the grid has zero `.cropfig__launch`, the card it opens has one, and
the lightbox it opens lands on the same rect.

### The keyboard half is not decoration

`opacity: 0` leaves a button in the tab order. Without the `:focus` rule a
reader tabbing to it would be operating an invisible control, so the reveal is
`.cropfig:hover .cropfig__launch, .cropfig__launch:focus`. Measured: the pane's
launcher takes focus, fades to opacity 1 **while focused**, and `Enter` opens
the lightbox.

*(Probe gotcha, twice: the button fades in over 120ms, and `getComputedStyle`
mid-transition returns the frame it is on. The first takes of shots 1 and 5
showed no button at all, and the first focus reading said `opacity 0` on a
button that was about to be fully visible. Poll for the value, don't read it
once.)*

---

## 3. Decisions I made that the handoff did not name

* **The companion is not shown in the lightbox.** A balloon crop is two
  pictures; the lightbox holds the one that was launched. Each figure has its
  own launcher, so the parts-list row opens itself — which is simpler than
  zooming two images in one stage and keeps "one lightbox, one crop" true.
* **No provenance fold in the caption.** The handoff said the where-line and
  the links, "nothing longer", so `VA.cropReference` is passed
  `omitProvenance`. The fold is one hover away on the card this was launched
  from.
* **The caption's class prefix is `lightbox__cap-`, not `lightbox__`.**
  `VA.cropReference`'s prefix carries its own separator, so `lightbox__` would
  have named the where-line `.lightbox__head` — which is the head *row's*
  class, and its flex rule. Caught while writing the CSS, not by a test; the
  test that would have caught it now exists.
* **A clamp, so the picture cannot be dragged out of the window.** An axis on
  which the scaled crop is smaller than the stage is centred; an axis on which
  it is larger is held so no gap appears. Centring falls out of the same
  expression, which is what lets the fit view be a plain `{1, 0, 0}` — and it
  removes the failure where a reader drags the crop away and has to find the
  Fit button before the surface works again.
* **Escape closes the lightbox AND the hover card behind it.** Deliberate, and
  I looked at preventing it. `topology_app.js` listens for Escape on
  `document`; stopping propagation inside the dialog would preserve the card —
  but any *click* inside the lightbox already dismisses the card through the
  same app-level handler, and reading a zoomed crop means clicking. So
  preserving the card for the Escape-only path buys almost nothing and adds a
  second dismissal rule. Any interaction with the lightbox dismisses hover
  chrome; that is consistent.

---

## 4. Three things I believed and the machine did not

The first two were sub-checks I wrote as the *assumption* rather than the
measurement; the third was a fact I inherited from a comment.

1. **"the picture is ≥1.5× wider than the thumbnail" is false, and the feature
   is still right.** A tall datasheet crop fits by its **height**: at
   1600×1000 the preview pane's thumbnail is 520×593 and the lightbox's picture
   is 742×846 — 1.43× on width, 2.03× in area. The check now demands growth on
   both axes and 1.8× in area, and prints both boxes when it fails.
2. **The zoom anchor is honoured only where the clamp is not binding.** I
   wheeled over the highlight box's own centre — and that box is 0.005 of the
   way across the sheet, so the clamp legitimately pins the content to the left
   edge and the anchor moves. The clamp *must* win; a reader cannot be shown
   blank stage. The check now wheels over the **stage's centre** and reads the
   content point under the pointer off the laid-out boxes. The anchor's exact
   arithmetic is pinned value-by-value in the fast tier, where there is no
   clamp to argue with.

### A third thing I believed without measuring, and it was in the repo already

**A backdrop click does not close a modal `<dialog>`.** I wrote "Escape and a
backdrop click are then the browser's own dismiss" into three places —
`views/lightbox.js`, `topology.html`, the README — on the strength of
`topology_app.js`'s existing comment about this page's other two dialogs
("*an Esc or a backdrop click (either closes a `<dialog>`)*"). Measured on the
installed Chrome (152.0.7977.83), a bare `showModal()`ed dialog clicked at
(2, 2):

```
open after a backdrop click at (2,2): true
open after Escape: false
```

Only the `closedby="any"` attribute changes that, and it is newer than the
browsers this page is written for. So the ✕ is the **only** dismissal a
pointer-only reader has, which makes it load-bearing rather than decorative —
the browser suite now clicks it and requires the page's scroll back. The older
comment that misled me is filed
(`ISSUE_20260916_the_legend_and_worksheet_dialog_comments_claim_a_backdrop_click_closes_them.md`),
not fixed here.

The transferable bit is not the browser fact. It is that **a comment in this
repo is read as a measurement**, and one that is not gets propagated by the
next author in good faith — which is the whole argument for the tracked
`CLAUDE.md` and for pairing prose against the tree.

### And one piece of test-infrastructure knowledge

**The new suite starts its own repo-root server.** `served mode (repo-root
static server)` closes the shared `repoRootBaseUrl` mid-run on purpose — that
is its mid-session-stop fixture — so every suite registered after it that
points at the shared URL gets `ERR_CONNECTION_REFUSED` and a 0-sub-check abort
that has nothing to do with the feature. `testAnnotateRail` already did this;
now it is written down.

**Escape drops a `<dialog>`'s `open` attribute synchronously, but the `close`
event is a queued task.** The body class that suppresses the page's scroll is
reversed in that listener, so a probe that reads the class the instant `open`
goes false reads it one task early and reports a leak that is not there.
Measured here; both the probe and the suite wait on the class, not on `open`.

---

## 5. What is left, and where it is filed

* `ISSUE_20260916_the_crop_lightbox_has_no_file_origin_coverage_in_any_tier.md`
  — `?mock=1` carries no crop PNGs, so no launcher exists in mock mode and the
  `file://` suites never open the lightbox. The module itself IS loaded and
  exercised over `file://` (`test.html` runs all sixteen of the new fast-tier
  checks there); what is uncovered is the `showModal` path on that origin.
* `ISSUE_20260916_the_crop_lightboxs_new_guards_carry_no_mutation_witnesses.md`
  — the handoff did not ask for witnesses and none were declared. The three
  guards worth a witness are named in the issue.
* `ISSUE_20260916_the_legend_and_worksheet_dialog_comments_claim_a_backdrop_click_closes_them.md`
  — §4's wrong comment, about dialogs this handoff does not own.

Nothing else was deferred.
