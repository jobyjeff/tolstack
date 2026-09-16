# LESSONS 2026-09-15 — viewer_reference_crops_in_context

Handoff: `docs/sessions/HANDOFF_20260915_viewer_reference_crops_in_context.md`.
Branch `handoff/viewer_reference_crops_in_context`, cut from `integration`.
(Session ran past midnight; the issue it filed is dated 2026-09-16.)

What the diff shows: a crop carries the boxes worth looking at, a datasheet
crop is the whole table, a parts-list crop is framed on its own balloon and
brings the row with it, and a dimension crop contains the feature. What it does
not show is below.

## 1. The drawing-checker reuse verdict — the handoff's explicit ask

Investigated before writing any rendering. Two separate things over there, and
the answer is different for each:

**Balloon GEOMETRY: reuse, and it is the single most valuable thing in this
handoff.** `<run>/<drawing>_balloons.json` already carries, per page, every
balloon's `item_no` and `bbox_pt`, plus the run's `parts_list` rows with their
`find_no`, `part_number` and `nomenclature`. That is **native-PDF extraction,
not vision output** — the same class of fact as the printed zone grid this
repo's crop builder already reads off a page — so consuming it needs no new
rendering, no new dependency and no write. `scripts/build_viewer_crops.py` reads
it through three small functions and nothing else changed about the
read-only-DATA posture.

What it does **not** give you, and I expected it to:

* **`pages[].views[].region_bbox` is unusable for cropping a named view.** On
  217755 sheet 4 the extractor merged four views into one entry titled
  `p4:DETAIL B / SECTION A-A / SECTION AD-AD / SECTION K-K`, with a
  `region_bbox` of `[108, 36, 2220, 1548]` — very nearly the whole sheet. The
  *balloons*, though, carry a clean per-view `view_id` (`p4:DETAIL B`), so the
  view's extent is recoverable as the union of the balloons assigned to it.
  That is what `balloon_answer`'s `view_rects` is, and it is only used to frame
  a crop whose citation named no printed zone.
* **Parts-list rows have no bbox anywhere.** `parts_list` is values only, and
  the page JSON's `zones.parts_list` gives the table's bbox and nothing finer.
  So the row is located by searching the page text for the part number *inside
  that table bbox*, and the band's left and right edges come from the printed
  `FIND` column headers — a Joby parts list prints as several side-by-side
  blocks, and a band across the whole table carries two unrelated rows'
  columns. **One part number can be two rows**, which I did not expect: the
  2026-AUG-19 export lists `NAS1149V0332H` as *both* find 13 and find 32, and
  `MS21299C3` appears in two column blocks. Requiring a unique hit therefore
  left two of the four live balloon crops with no companion at all, silently.
  The tie is broken the way a reader breaks it — by the number printed in the
  `FIND` column to the left of the part number, on the same row — and a tie
  that survives *that* is still refused rather than guessed at.
* **215197 has no `*_balloons.json` at all** (it is a part drawing). Its newest
  run does have `regions_page_2.json` with a `drawing_view` region labelled
  `SECTION A-A` — but it is **vision output** with a `confidence` field, in zone
  coordinates, and it exists only in run `20260730_133912` while the citation
  resolves through `20260409_170546`. Cropping one run's geometry onto another
  run's export is exactly the substitution this repo's sha-verification exists
  to prevent, so it is not used. That is why the pitch-plate case needed a rule
  of its own (§3).

**Glow ASSETS: replicate the treatment, not the mechanism.** drawing-checker's
"glow" is `body[data-glow]` CSS over an `svg.overlay` sitting on a pdf.js
canvas (`webui/static/app.css`, the `.ov-gdt` rules) — a live overlay over a
live render, with four switchable treatments. There is no rendered asset to
reuse and no way to reuse the mechanism: tolstack's crops are pre-rendered PNGs
on a static page with no PDF renderer. What travels is the *reading* — a light
wash inside, a firmer edge around it — and it is written as four CSS
declarations in `apps/viewer/style.css` with a comment saying where it came
from. Structurally the two surfaces now match (geometry + a switchable
treatment), which is the part that matters for a reader moving between them.

## 2. Highlights are DOM boxes, not pixels — and that decision paid twice

The handoff says "balloon highlighted", "a selection box around the exact
cell(s)", "solid vs dashed". The obvious reading is to draw them into the PNG.
I emitted them as geometry instead — `crops.json`'s `highlights[]`, each box in
PDF points **and** as a fraction of the crop — and the viewer positions a
`div` per box in percentages.

Three reasons, and the first is the one that decided it: **the same PNG is laid
out at four different widths** on that page (the popover, the hover cards, the
stack preview pane, the topology preview pane), so a box burnt in at render
time is right at one of them. Second, solid-vs-dashed becomes one CSS rule
rather than two render paths in the builder. Third, the rects stay *readable*
in `crops.json` — a reviewer can check a box against the sheet, which is not
true of a pixel.

The unforeseen cost, and it is worth knowing about: **`.hovercard .cropblock
img.croppop__img` had `max-height: 260px; object-fit: contain`**, which insets
the picture inside its element. A percentage overlay on that element points
into the letterbox, not at the cell. The fix is to cap the **width** instead,
which needs the crop's aspect ratio in CSS — so `VA.cropFigure` sets
`--crop-ratio` inline and the card rule is
`max-width: calc(260px * var(--crop-ratio, 1))`. Any future surface that wants
to bound a crop has to bound its width for the same reason; there is a comment
on the rule saying so.

## 3. The three region-sizing heuristics, and why each is shaped the way it is

**Datasheet (deliverable 2) — a declared PAGE CONTEXT, not a bigger region.**
The registry already had twelve row bands. Widening each of them would have put
the same table rect in twelve entries, and the second thing Jeff asked for — a
box on the used cell — needs the row band to *survive* as its own rect. So
`tolerance_stack/spec_crop_regions.py` gained a second entry kind: one
`CropContext` per `(document, sheet)`, recorded by the same verb with
`--context`. The crop is the context; the matched region is a highlight inside
it. Two are recorded, both read off 3x renders and previewed before committing:
NAS sheet 3 `[82, 76, 540, 598]` (the whole grip/length table, its two header
bands, all 96 rows and the closing note that defines the columns) and sheet 1
`[82, 76, 548, 469]` (the bolt figure **above** its dimension table — sheet 3
has no figure; the figure the lettered columns refer to is on sheet 1). A test
asserts every region on a sheet falls inside that sheet's context, because a
region outside it would be highlighted off the edge of the crop.

**Parts list (deliverable 1) — the balloon beats the cited zone.** This is the
one precedence rule the handoff changed, and the argument is in
`locate()`'s docstring: a parts-list citation's `zone` is the zone of the
view's *caption*, which is not where the item is (the bushing's old crop showed
DETAIL B with balloon 34 off the top edge), and this repo has already watched
such a zone move between two exports of one revision — the pitch_link
worksheet's finding F4, `I6 → H3`. The crop is the item's balloon padded by
60pt, **unioned with** the padded cited zone when there is one: the zone is
still what the citation said, and on the live case it is what carries the
caption, so a reader sees the balloon *and* the name of the view it is in. When
the citation names no zone (two of the four live parts-list citations), the
frame comes from the view's own balloons instead — without that, the crop is a
144pt box around one balloon, which is a number in a circle with none of the
geometry it labels. `test_a_balloon_beats_the_cited_zone_...` asserts that the
old zone rect did *not* contain the balloon, and says in the message that if
that assertion ever passes the fixture moved and the case is measuring nothing.

**Dimension (deliverable 3) — follow the leader, two hops, refuse scenery.**
No view data exists for 215197 (§1), so the crop is widened along the drawing's
own vector geometry: the paths within 24pt of the callout text (its leader — a
leader does not start flush against the last character; at 8pt the real one was
missed by 18pt), then the paths touching the far ends of those within 6pt (the
arrowhead and the edge it lands on), unioned and padded by 60pt. **Two hops and
no further**, and any path larger than 400pt in either direction is not
followed: without both stops, one connected outline walks the crop out to the
whole sheet one edge at a time. On the named failing case this takes the
pitch-plate crop from `[140.31, 446.46, 561.26, 892.92]` to
`[140.31, 446.46, 693.26, 892.92]` and the lug — with its bores, and the
extension lines the `4.06` actually lands on — comes into frame.

**Declared-region honesty (deliverable 4)** falls out of the two highlight
kinds rather than needing a rule of its own: `verified_match` where the
citation's own text or balloon was *found* (solid), `declared_region` where a
human declared the rect or the citation merely named the zone (dashed). The
zone-cell branch already computed `callout_text_in_zone`; it now also decides
which kind of box to draw. So "the crop is the citation, not a match" is a
property of the picture, which is what the copy handoff's removal of the jargon
sentence left unsaid.

## 4. The handoff's named bushing case has MOVED — read this before checking it

The definition of done says to verify on "the live pitch-link topology". It
cannot be verified there, and not because anything here is broken:
`viewer_reference_crops_in_context` was written against `master`, and
`integration` has since merged `pitch_link_known_bands`, which **re-cited the
pitch-link stack's `bushing_214820` to the 214820-002 part drawing with an
`unestablished` export** and turned `washer_nas1149v0332` into a `workbook`
citation. Both are now legitimately uncroppable — there is no PDF of 214820-002
in this workspace to hash — so neither can carry a balloon crop, correctly.

The same citation still exists, unchanged, on **`stack_tan_link_to_pitch_plate`**
(`straight_bushing`: 217755 sheet 4, DETAIL B, find 34, `214820-002`), and that
is where I verified deliverable 1 end to end in a real browser: DETAIL B with
balloon 34 glowing, the parts-list row beneath it with `214820-002` boxed, and
the link reading `[2026-JUL-23 POST] 217755 A.1 …` → `217755 rev A`. Four live
parts-list citations get balloon crops now (tan-link and VPA bushings/washers on
sheet 4 and 5, both rotor-fastener washers on sheet 8); the two on the pitch-link
stack do not, because their citations no longer name a drawing.

Deliverables 2 and 3 *are* on the pitch-link stack and were verified there.

## 5. Two ambiguities in the handoff, and what I did

* **Link text.** Deliverable 1 says *"link text = part number + revision (e.g.
  `217755 rev A.1`)"* while the definition of done says the bushing gets a
  `"214820-002 …"` link. Those are different numbers — `217755` is the
  assembly **drawing**, `214820-002` is the **part**. I followed the
  deliverable and its worked example: the link names the drawing the crop is of,
  taken from the citation's own `document` and `revision`. That also means the
  revision printed is the one the **citation claims**, so the tan-link bushing's
  link says `rev A` (its `source_ref.revision` is `"A"`) while the pitch-plate
  lug's says `rev A.1`. Printing the `A.1` from the filename instead would have
  been the viewer inventing a revision the citation does not assert.
* **"balloon 8X glowing".** `8X` is the balloon's *quantity prefix*, not its
  number; the balloon is `34` and `8X` is printed beside it. The highlight is
  the balloon's own bbox, which is what the geometry gives.

## 6. The browser tier earned its keep — twice, on the same test

`node apps/viewer/run_tests.cjs` was green and `node
scripts/run_viewer_browser_tests.mjs` was not: **`childNodes` is a NodeList in
a real browser and an Array in the node shim**, so `childNodes.filter(...)` and
`childNodes.indexOf(...)` passed the fast tier and threw in Chrome. Same story
one line down: `style["--crop-ratio"]` works on the shim's plain bag and returns
`undefined` from a real `CSSStyleDeclaration` (it needs `getPropertyValue`).
Both are now written the browser's way, which the shim also honours — and the
shim's `style` grew `setProperty`/`getPropertyValue`, because a `style` object
without them *throws* rather than silently dropping the property.

Running the truth tier from a worktree needs two things nobody has written down:
`node_modules/` exists only in the main checkout (I junctioned it in, ran, and
removed it), and the viewer's projections live in the main checkout's gitignored
`data/` (junctioned `data/projections/viewer` the same way). Both junctions are
gone; `data/projections/` is back to its tracked `.gitkeep` and the main
checkout's `node_modules` and `crops/` are untouched. **If you do this, remove
the junctions before you finish** — `data/projections/` is *not* gitignored, so
a leftover junction shows up as untracked dirt on the branch.

## 7. `pytest -q` was already red when this session started

`tests/test_provenance.py::test_every_byte_identity_claim_in_a_live_file_names_its_verification`
fails on a clean `integration`, on a sentence in
`docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md` written
by the 2026-09-15 triage sweep. Filed as
`docs/issues/ISSUE_20260916_byte_identity_guard_red_on_a_strategy_brief.md`
rather than fixed here — it is one sentence in someone else's brief. Everything
else is green: 1115 passed, 1 skipped, plus 318/318 in the JS fast tier and
19/19 browser checks (304/304 in the suite on **both** `file://` and `http`).

## 8. Decisions made that the handoff did not ask about

* **Grid thumbnails get no overlay.** The topology grid's crop-trigger
  thumbnail and the hover cards' component thumbnails are 16–40px tall; a
  2px-bordered box on one is noise, not information. The overlay renders on the
  four surfaces that show a crop at a readable size. `VA.cropFigure` is where
  that would change if the call goes the other way.
* **`located_by` gained two values**, `balloon_view` and `page_context`, and
  both have a branch in `VA.CROP_PLACEMENTS` — that table exists precisely
  because a fifth value with no branch drops the whole "where on the sheet"
  clause in silence. `HIGHLIGHT_KINDS` joined `tests/test_js_python_vocabulary.py`'s
  `PAIRINGS` for the same reason, and it is the first row there that reads an
  importable constant rather than scraping literals out of an AST.
* **`rect_pt` is now the CLAMPED rect.** `render` has always intersected the
  crop rect with the page, so a rect hanging off the sheet was reported as
  something wider than the image actually written. That mattered the moment
  highlight fractions began being measured against it — a fraction computed
  against an unclamped rect is wrong by the overhang. Two live crops clamp
  today (a balloon+zone union at the top edge of 217755 sheet 8).
* **Tracked fixtures, not live reads.** `tests/fixtures/viewer_crops/` holds the
  geometry the three cases are pinned against, recorded off the real export and
  the real run, each file carrying where it came from and why it is a copy:
  `data/` **and** drawing-checker's `data/runs/` are both gitignored, so a test
  that opened them would be green in the main checkout and red in every
  worktree — which is the habit `test_viewer_js_suite.py` refuses to teach.

## 9. Left to do

* The parts-list companion is a wide, short strip (≈8:1), so in the ~430px
  preview pane the row renders about 50px tall. Legible, but only just. If
  anyone complains, the cheap fix is to end the band at the right edge of the
  block's last printed column header rather than at the next block's `FIND`
  header — the live band carries ~110pt of empty margin, about 17% of its
  width. Not filed: it is a legibility preference on a brand-new surface, not
  deferred work, and the numbers to act on are here.
* The crops projection in the main checkout was rebuilt from this branch, so it
  carries this branch's stamp. After the merge someone should rebuild it from
  `integration` — the provenance gate will say so out loud if they don't
  (`scripts/projection_provenance.py`).
