# LESSONS 2026-09-16 — viewer_hover_deslop_and_banner_purge

Five deliverables off Jeff's "De-slopification" note. Everything below is
measured on the **live** projections at
`C:\workspace\tolstack\data\projections\viewer\`, through

```
node tests/debug_hover_deslop.mjs --repo C:/workspace/tolstack
node tests/debug_hover_deslop.mjs --repo C:/workspace/tolstack \
     --shots docs/sessions/lessons
```

a new hand-run probe (never a tier), committed for the same reason the previous
two sessions' were: the screenshots are worthless without a way to re-take them.
Seven PNGs beside this file.

**Counts**, after the review rework. `venv-win/Scripts/python.exe -m pytest -q`
→ **1192 passed, 1 failed, 1 skipped**.
`node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` → **431/431**
(422 at session start, 430 at the first hand-back).
`node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` →
**20/20** checks. Two different suites contribute the big sub-counts and they
are not the same thing: `test.html`'s in-page suite runs **332/332** under each
of `file://` and `http`, and the topology PAGE suite runs **201/201** under each
(193 before the rework). `node scripts/run_mutation_witness_tests.mjs --repo
C:/workspace/tolstack` → **43/43**, six of them added here.

> **Correction, 2026-09-16 (review, second pass).** The in-page number above
> read 331/331 — the count from *before* this rework, which added the
> `popoverShouldMove` test to the in-page set as well as to the `--repo` one.
> Re-measured on the merged branch: **332/332** under each of `file://` and
> `http`. The 431/431 and 201/201 beside it were re-derived and are right.

The one Python failure is `test_no_live_document_states_an_unguarded_hardware_
entry_count`, **red on `master` before this branch existed** — a strategy
brief's prose trips the hardware-entry-count regex, three open issues already
describe it, and nothing here touches it. The previous session's lesson says the
same thing about the same test.

---

## 1. What was already true on master, so you do not re-fix it

The handoff warned that Jeff's builds have hit stale-served-JS three times.
Checked each complaint against `master` first:

| complaint | state on master |
|---|---|
| five always-visible banner rows | **live**, `views/banner.js` READY branch, exactly the five named |
| a card printing its document three times | **live** — `hovercard__cited`, then `croppop__head`, then the `provfold` line |
| a card's long-form prose in the open | **live**, and unclamped on the citation card |
| "the pop-up disappears when you move the mouse onto it" | **live**, and the handoff's diagnosis is right — see §2 |
| "reserve image height up front from `--crop-ratio`" | **already done.** `VA.cropFigure` has set `img.style.aspectRatio` from `entry.width/height`, and `--crop-ratio` on the frame, since `viewer_reference_crops_in_context`. The box IS measured at final size before the decode. What was left was `position()` being re-run unconditionally — on `img.onload` **and** (found by the review) on every repaint as each PNG blob resolves, which is the path the FIRST hover of every card takes. Both go through `replace()` now |
| the preview pane has no drag divider | **already done** 2026-09-15. The live problems were the 430px default and that nothing announced the divider |
| `ISSUE_20260915_a_wide_preview_pane_can_cover_the_grids_own_drag_grips` | **already `status: resolved`**, closed by `topology_grid_scroll_and_grips` on 2026-09-16. That is what unblocked the wider default |

So one of the seven was a stale-build sighting, and it is the one the handoff
proposed as a fix.

---

## 2. The hover fix, and the failure mode it trades away

**The diagnosis is not what the complaint sounds like.** There is no
`mouseleave` handler and no hide timer anywhere in this app — closing on leave
was tried and rejected in 2026-08 (`views/stack.js`'s `cropTrigger` comment says
why: the pointer has to leave the trigger to reach the links inside the
popover). The card was never *disappearing*. It was being **replaced**: every
trigger the pointer crosses en route fires `mouseenter` → `showCard` re-points
the one shared `#croppop` node at itself, and on the DAG the corridor is crowded
because a rail bar's hit area is a 14px transparent stroke.

**What shipped: intent, not a timer.**

* `VA.pointerHeadsFor(from, to, box)` (viewer.js) — a ray/rectangle intersection
  by the slab method. A pointer already inside the box counts with no direction
  needed; a pointer that has not moved aims at nothing and never counts.
* `topology_app.js`'s `defer()` — while a popover is open and the pointer is on
  a course that reaches it, a competing trigger's open is **held**, not dropped.
  If the pointer arrives, the held trigger never opens. If it does not arrive
  within `VA.HOVER_INTENT_MS` (260), the held trigger opens after all.
* `replace()` — the image-settled re-place now runs only when the box's height
  actually changed, and **never while the pointer is on the card**.

**The two numbers, and why each is bounded.** A plain "ignore everything for N
ms" was the obvious alternative and is wrong in a way that is easy to miss:
`mouseenter` fires **once**. A suppressed one never arrives again while the
pointer sits still, so a blanket grace period silently swallows a deliberate
hover onto the next row. Deferring instead of dropping is what caps the cost of
a wrong guess at a quarter-second.

`VA.HOVER_INTENT_REACH` (240px) is the other bound and it is the one a reader of
the code will want explained: without it an infinite ray hits almost anything
eventually, so a pointer crossing the grid in a straight line would count as
"approaching" a card 900px away and every trigger on that line would go quiet.
An open card sits 8px from its trigger, so anything genuinely being reached for
is close.

**What is traded away.** A pointer that crosses a trigger *on a course that
reaches the open card* and then stops there gets its card up to 260ms late. That
is the whole cost and it is bounded — **now**. It was not, at the first
hand-back, and that was blocker 1 of the review: `held.run()` re-enters
`showCard`, which calls straight back into `defer()`, and `pointerWas`/
`pointerAt` are written **only** by `mousemove`. A reader who crossed the
trigger and then held still was still carrying the vector that aimed at the open
card, so the same trigger was held again, and again. Measured on the live
projections at **4.4 seconds and still going**, ending only when the pointer
twitched 3px sideways. The design document in `viewer.js` said "never one that
never arrives" and the code did exactly that.

The fix is an `expiring` token that `defer()` honours once and clears, so the
one re-entrant call an expiry makes bypasses the corridor. Re-measured through
the same path: card A holds at t+0, the crossed cell's own card is up by t+410.

**The lesson under the lesson: I had pinned the two halves either side of the
bug.** The browser tier checked that a crossed trigger is held (pointer still
moving) and that a trigger approached from a direction that misses the card
opens at once — and neither touches the expiry. A check that *looked* like it
did ("...and it still does not, once the grace period has run out") was measured
with the pointer already inside the card, which is the case where dropping the
held trigger is correct. Two true checks either side of an untested middle read
as coverage.

**The browser tier can see this and nothing else can, and it now does it with a
real pointer end to end.** Three details that cost red runs and are worth
knowing before touching that block:

* **`mouseenter` is dispatched BEFORE the `mousemove` at the new coordinates.**
  So a single-jump `page.mouse.move` fires the enter while the page still holds
  the position it jumped *from*, and the corridor is computed off a stale
  vector. A real mouse emits a move every few milliseconds, so in a reader's
  hand the positions either side of the enter are millimetres apart and on the
  approach line; `{ steps: 12 }` is how a synthetic pointer reproduces that.
* **The geometry is chosen, not incidental.** The citation card opens from a
  row's confidence chip and is placed below that row, wide enough to sit under
  the row's own crop trigger — so that trigger is ~20px directly above the open
  card. Approaching it from above aims into the card; approaching it from the
  right, level with the row, does not. One trigger, two approaches, no synthetic
  events. A tripwire asserts that layout before anything stands on it.
* **A probe that nudges the card to see whether it moved back can destroy its
  own precondition.** The first draft of the "a card under the pointer is never
  re-placed" check shoved `style.left` to 1px — which slid the box out from
  under the pointer, so the guard correctly declined to hold and the check
  reported a defect that was not there. It nudges `top` by 4px now.

---

## 3. Where the banner's five lines ended up, and why not simply deleted

One closed `<details>` on the bar, wearing `VA.DATA_SOURCE_SUMMARY`
("Data source") — the same word each hover card's fold wears, which is the point
of it being one constant in `views/dom.js` rather than two literals.

The handoff said deletion was the default and a collapsed home was permitted.
Folded, for one reason: `VA.provenanceLine` exists because a projection built
from a superseded branch sat in front of a reader for six hours looking current
(`ISSUE_20260806_concurrent_worktrees_clobber_the_shared_viewer_projection`).
Deleting the render site would have made `provenanceLine`, `builtLine`,
`cropRulesLine`, `shaCountsText` and `unlabelledCropRules` dead code and thrown
away a hard-won safety fact to save one muted summary line.

**What did NOT move into the fold, deliberately: the stale-pair alarm.** It
fires only when the two stamps provably disagree, and a fold is not where that
goes. This is visible in every screenshot — the live projections genuinely are a
mismatched pair right now (`topologies.json` was last built from
`review/python_value_and_schema_pins`), so shot 1 shows the quiet bar *and* the
alarm doing its job.

The bar's own children are pinned as an ordered list, not by the absence of five
strings: a sixth build stamp added later would pass a "does not contain 'built'"
check and fail this one.

---

## 4. The note split — the decision that is not in the handoff

The handoff listed `card.note` as a carrier to fold and then allowed "a short
always-visible description (the existing 3-line clamp is fine)". Those two pull
opposite ways on the live data, because a live note is **one string holding both
jobs**: a description sentence, then the sourcing narrative. The 3-line clamp on
the 214820-002 bushing shows three lines of gap essay.

So: **`VA.leadSentence(note)` in the open, the whole note in the fold.** The
function returns a *prefix of the input or the whole of the input* — never a
rewording, recasing or reordering, the same discipline `VA.fieldLabel` and
`VA.elementDisplayLabel` keep — and both nodes keep classes already enrolled in
`VERBATIM_PROSE_CLASSES`, so the schema-jargon scan still skips the record's own
words in both positions. No new exemption-selector entry was needed.

**The sentence-boundary regex is not a split on `"."`,** and the live notes are
why: "Plain bushing, aluminium bronze, .1900 in ID X .1875 in long" has two
periods in it and neither ends a sentence. The rule is `.`/`!`/`?` followed by
whitespace and a capital; a note with no such break is returned whole.

**Known cost, accepted:** with the fold open, the lead sentence appears twice —
once in the open, once at the head of the full note below it. The alternative
(put only the *remainder* in the fold) removes the repeat but leaves no single
node holding the complete record, and "one node has the record, whole" is worth
more here than one tidy screenshot. See shot 3.

**Where that design cannot help, and what was filed.** Five live notes *lead*
with the bookkeeping — "Added 2026-09-15 (handoff stack_fable_audit); the name
restyled…" — so the always-visible sentence is exactly what Jeff said the user
does not care about. Records were out of scope here;
`ISSUE_20260916_five_authored_notes_lead_with_handoff_bookkeeping_instead_of_the_fact.md`
lists all five with the sentence each one shows, and raises the question behind
them: should a topology document carry a short `description` distinct from
`note`, so the viewer has something *written* to be shown in the open instead of
`VA.leadSentence` guessing?

---

## 5. "One document statement" needed a second rule the handoff did not name

Suppressing the crop head fixed the "stated, then restated" half. Measuring the
live cards afterwards turned up the other half: **four live edges whose PART is
named after the document their dimension is cited from**, so the card read

```
a dimension of 214820-002 plain bushing
cited at: 214820-002 · sheet 4
```

`bushing_214820`, `pitch_plate_flange`, `gas_spring_mount_position`,
`pitch_flange_thickness`. `VA.citationWhere` takes an optional second argument
now — text the surface has already printed — and drops a document that appears
in it. Same rule as `VA.componentDrawingText`, and the same rule as
`VA.revisionText`'s "never prefix a label the value already carries": it is a
rule about labels, not about any one document.

**The `[real]` sweep that pins this counts over the card's own REFERENCE lines,
not over the card.** That distinction cost a red test to find: the bushing card
names `214820-002` three times in the open, and only one of those is the
viewer's doing. The other two are the record speaking — the edge is *authored*
"plain bushing length (214820-002)", and its unestablished-export `why` names the
drawing mid-paragraph. Trimming either would be the viewer editing the record.
The sweep reads `.hovercard__where`, `.hovercard__cited`, `.hovercard__cropkey`
and `.cropblock .croppop__head` and nothing else.

**Dropping the number dropped the noun with it.** `VA.componentDrawingText`
returned the bare revision where the heading already carried the part number, so
three live parts — `pitch_plate_215197`, `pitch_flange_215197`,
`gas_spring_mount_213668_002` — rendered a where-line whose entire content was
"rev A": a revision modifying nothing, on the surface this pass exists to
de-slop. It says "drawing rev A" now. The pin compares the rendered line against
`VA.revisionText(card.revision)` exactly, and counts the live parts that can
reach that branch so the check cannot go vacuous.

**A count in a comment that nothing pairs is a defect even in a comment.** The
`card.provenance` branch in `views/cards.js` carried "48 of the 48 live
citations are `established` or have no export block" as its reason for folding
the export block. Both halves were wrong — the review re-derived 55 rows on the
topology side (29/25/**1**) and 65 in `results.json` (42/22/**1**) — and the one
that is loud is `bushing_214820` — the card this section opens with. The code
was right and the fold is right; only the number was wrong. It says "nearly
every live citation" now, with no number, and names the loud case rather than
denying it.
This is CLAUDE.md's "a quantity written in prose that no test reads from the
tree is a defect", in a comment, which is where it is easiest to miss.

**Both preview panes still have the original defect** and were out of scope;
`ISSUE_20260916_both_preview_panes_still_restate_the_document_over_the_crop.md`
files it with the one-argument fix already built and the reason it is a decision
rather than a copy-paste (a pane's crop head is the only place the *export*
filename appears at all, and that is a different claim from the citation's
document).

---

## 6. The pane: 560 default, max unchanged, and a divider you can see

The default is **560px**. The 2026-09-15 revert of exactly that number is
recorded at length in `topology.css` and was not a matter of taste — at 560 a
widened jog zone put its own drag grip outside the pane's visible window. That
hazard is closed (`topology_grid_scroll_and_grips`), the browser tier now drags
both grips at a 560px pane and at the max, and the issue is `resolved`.

**The max stays at 1000, considered and declined.** At the tier's 1600px
viewport a 1000px pane already leaves the grid ~298px, which `.tvgrip`'s clamp
arithmetic is written against; 1200 would leave ~98px. A reader on a wider
screen reaches any width by dragging. The reasoning is in the CSS, where the
number is.

**The divider was `background: transparent` until hover** — the one control that
answers "it's too narrow" announced itself only to someone who already knew
where to point. It is a hairline in `--line` at rest now, plus a three-dot grip
mark.

**None of it was pinned by anything at the first hand-back, and that was blocker
2.** The whole deliverable is three CSS declarations; the reviewer put the width
back to 430, the hairline back to `transparent` and deleted the grip rule, and
every tier stayed green. `tests/debug_hover_deslop.mjs` does assert the width,
but no tier runs a hand-run probe, so it cannot be the pin. There are four
browser-tier checks now — the default width, the divider's hairline, the grip's
`background-image` and its `position: sticky` — with a tripwire in front of them
asserting nothing is remembered and nothing is inline, so the number they read
really is the stylesheet's. Two of them are declared in
`scripts/mutation_witnesses.json` (`pane-default-width`,
`pane-divider-visible-at-rest`).

**That grip mark is `position: sticky`, and it has to be.** This page scrolls as
one document (`viewer_error_surface_and_layout`), so the divider's own box is as
tall as the whole page: a mark at `top: 50%` sits halfway down the *document*,
off screen for most of a long study. `position: sticky; top: 50vh` on the
`::after` clamps it to the middle of the viewport at every scroll. Verified in
Chrome (shot 7 is a close-up, because at page scale a 5×23px mark is a smudge
and "is the affordance actually there" is the question).

---

## 7. Two tier-side traps worth knowing before you touch this area

**A `{ state: "visible" }` wait on a node you just folded away waits forever.**
The rebuild-affordance suite waited on `.banner__built` as its "a connected
banner has painted" marker. That node is now inside a closed `<details>`, so the
wait ran to its 15s timeout and aborted the suite nine sub-checks in. The marker
is `details.banner__source` now. Note that `textContent` is unaffected —
Playwright reads text inside a closed `<details>` fine — so only the *visibility*
waits broke, which made the failure look unrelated to the change.

**Folding prose out of a card makes the card shorter, and a card-height tripwire
is allowed to notice.** `[topology http]`'s "the DAG-side card wants more height
than there is room for on either side of its own rail bar" went red at its 700px
viewport under http and stayed green under `file://` — because a served origin
also drops the "open the PDF" link, and the two together took the card under the
threshold. That check exists to go red when it can no longer see the defect, so
it did its job. It measures at `CARD_CAP_VIEWPORT` (440px) now, the same window
the grid-side block already used.

**A guard you did not watch go red is not a guard, and I shipped one.** The
check added for should-fix 5 ("a where-line whose whole content is a revision
modifies nothing") read `ok(!/^rev/i.test(text), …)` — except the patch script
that wrote it was a non-raw Python string, so `` reached the file as a literal
**backspace** and the regex became `/^rev/i`. It matched nothing, on any
input, and `grep` renders the backspace as nothing at all, so the line looked
right in every reading of it. It passed on the clean tree and passed on the
mutated one. The mutation-witness runner is what caught it, and the assertion is
an exact comparison against `VA.revisionText(card.revision)` now — no pattern to
mis-escape, and it states the claim ("the line is NOTHING BUT the revision")
directly. Two habits come out of it: write a new guard's mutation *before*
believing the guard, and prefer an equality to a regex when the claim is an
equality.

**Six mutation-witness entries were added** (37 → 43): the two pane ones above,
`hover-deferral-expires`, `open-card-under-the-pointer-never-moves`,
`banner-shows-no-prose-at-rest` and `suppressed-drawing-line-keeps-its-noun`.
The table's own `issue` field has to name a path **in this tree**, and a review
file lives on the review branch — so these cite this lesson and name the review
in their `note`.

---

## 8. Still to do

* the three issues filed here:
  `both_preview_panes_still_restate_the_document_over_the_crop`,
  `five_authored_notes_lead_with_handoff_bookkeeping_instead_of_the_fact`, and
  — split out of the second on the review's nit, because it is a schema
  decision for a strategy agent rather than five prose reorders —
  `a_topology_note_does_two_jobs_and_the_viewer_guesses_where_one_ends`;
* the probe's shots render "This crop's image is not on disk" in place of each
  PNG. That is the `?mock=1` seam, not the page: `MemoryAdapter` is handed
  `images: {}`, so there are no blobs to read. The browser tier's served-mode
  suite renders the real PNGs and asserts on them; if a future shot needs real
  pictures, the probe needs a served projection dir rather than the mock seam.
* **the probe still boots the page twice**, which is how every real-data probe
  in `tests/` installs its fixtures. The review found that this registered a
  second copy of the document `mousemove` listener, whose run overwrote the
  first's reading and left `pointerWas === pointerAt` — a zero vector, so the
  hover corridor was dead inside that probe. The tracker drops a
  same-coordinates move now, which makes the duplicate harmless *for this
  listener*; the double boot is still real and still touches other module
  state, and the probe's header says so. The corridor's contracts live in the
  browser tier, which boots once.
