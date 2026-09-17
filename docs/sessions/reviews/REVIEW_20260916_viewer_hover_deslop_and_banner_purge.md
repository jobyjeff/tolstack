---
type: review
handoff: docs/sessions/active/HANDOFF_20260916_viewer_hover_deslop_and_banner_purge.md
reviewer: agent
date: 2026-09-16
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-16 — viewer_hover_deslop_and_banner_purge

> **Two passes.** The first pass (below) was **REQUEST CHANGES** on 2 blockers.
> The rework closed both; the **second pass at the end of this file is the
> APPROVE**, and the frontmatter carries that verdict. Read the first pass for
> what the findings were and the second for what was done and re-measured.

Merged `handoff/viewer_hover_deslop_and_banner_purge` into
`review/viewer_hover_deslop_and_banner_purge` (**fast-forward, no conflict**;
`integration` had not moved under the branch). **Not merged into
`integration`** — see the two blockers.

The stack-side mandatory checks (1–7: traced values, signs, LMC/MMC, RSS,
nominal-in-band, quantised constraints, the traced ratio) are **not
applicable**: this handoff touches no stack, no topology document, no
`values_source` and no element. `docs/topologies/*.json`, `docs/reference/`
and `data/inbox/specs/` are untouched — confirmed by `git diff --stat`. The
review below is the viewer half of the overlay plus the canonical universal
checks.

## What was verified

| tier | result | matches the lesson? |
|---|---|---|
| `pytest -q` | 1192 passed, **1 failed**, 1 skipped | yes |
| `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | 430/430 | yes (422 + 8 new `await test(` = 430) |
| `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` | 20/20 checks; suites 331/331 ×2, topology 193/193 ×2 | yes |

The one Python failure is
`test_no_live_document_states_an_unguarded_hardware_entry_count`, tripping on
`docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md:152`.
**Pre-existing, and pinned as such rather than taken on trust:**
`git diff integration...HEAD -- docs/strategy/ tests/test_tolerance_stack.py
docs/tolerance_stacks/hardware_entries.json` is empty, so neither the claim,
the regex nor the register moved on this branch.

Environment note for the next reviewer: the browser tier needs
`node_modules/playwright-core`, which is gitignored and therefore absent from a
fresh review worktree. A junction to the main checkout's `node_modules` is
enough (`New-Item -ItemType Junction`); the first run without it exits with
`ERR_MODULE_NOT_FOUND` and a `| tail` pipe reports exit code 0, so it is easy
to mistake for a pass.

### Live-data claims, re-derived

Every count in the lesson and in the two filed issues was recomputed against
`C:\workspace\tolstack\data\projections\viewer\topologies.json`:

- **"four live edges whose part is named after the document their dimension is
  cited from"** — 4 of 46 cited edges, and the same four ids:
  `bushing_214820`, `pitch_plate_flange`, `gas_spring_mount_position`,
  `pitch_flange_thickness`. ✅
- **"five live notes lead with the bookkeeping"** — 5, once you restrict to
  notes a card actually renders. A broad `^(Added|Replaced|…)` sweep finds 7;
  the three extra are *edge* notes, and `VA.edgeCard` carries no `note` at all,
  so they never reach a card. The issue's five (2 parts + 3 nodes) is the right
  set. ✅
- **9 live parts are named after their own drawing**, which is the non-vacuity
  witness the new `[real]` sweep asserts (`namedAfterDrawing > 0`). ✅
- **`ISSUE_20260915_a_wide_preview_pane_can_cover_the_grids_own_drag_grips`** is
  indeed `status: resolved`, so the 560px default is unblocked as the lesson
  says. ✅

### Deliverables

1. **Banner** — the five rows are in one closed `details.banner__source`, the
   stale-pair alarm stays outside it. Pinned by *shape* (the bar's ordered child
   list) rather than by the absence of five strings, which is the stronger
   check and the lesson says why. Screenshot 1 shows the quiet bar with the
   alarm genuinely firing. Folding rather than deleting is within what the
   handoff allowed ("collapsed-by-default is the requirement"). ✅
2. **One document statement per card** — `omitHead`, `VA.citationWhere`'s
   second argument and `VA.componentDrawingText`, swept over every live edge
   card by a new `[real]` test that counts occurrences over the card's *own
   reference lines* and carries its own non-vacuity witness. The scoping
   decision (reference lines, not the whole card) is argued correctly: the
   bushing's `name` and its `why` are the record speaking. ✅ (one copy nit
   below)
3. **One fold per card** — `sourceFold()` collects and attaches once; absences
   and a *loud* export stay in the open. Counted, not string-matched, in both
   tiers. ✅ (one wrong number in a comment, below)
4. **Reaching the popup** — implemented, and the "a crossed trigger does not
   steal the card" half works. **Blocker 1**: the other half of the promise
   does not. **Should-fix 2**: the re-place guard is unwitnessed and a second
   re-place path is still unguarded.
5. **Preview pane** — 560px default, max declined with arithmetic, divider
   visible with a sticky grip mark. The reasoning lives in the CSS beside the
   number, which is right. **Blocker 2**: none of it is pinned by any tier.

## Blockers

### 1. A deferred trigger re-arms forever, so its card never opens — `apps/viewer/topology_app.js`, `defer()` / the `setTimeout` body (≈ lines 100–122 of the new block)

`viewer.js` promises, and the lesson repeats: *"the worst case of a WRONG guess
is a card that arrives a quarter-second late, **never one that never
arrives**"* — and the lesson argues at length that this is what makes intent
better than a blanket grace period, because *"`mouseenter` fires once, so a
suppressed one never arrives again while the pointer sits still"*.

That is exactly what happens. `held.run()` re-enters `showCard`/`showCrop`,
which calls `defer()` again — and `pointerWas`/`pointerAt` are **only written
by `mousemove`**, so a pointer that has stopped still carries the vector it had
when it crossed the trigger. That vector still aims at the open card, so the
trigger is deferred a second time, and a third, with no bound.

Measured on the live projections in a real Chrome, **with a real Playwright
mouse and no synthetic events**: card A (`214820-002 plain bushing`) open, its
box `top 443.5 / bottom 574`; the `NAS6403U11D hex-head bolt` component cell
below it (`top 565.5 / bottom 669.5`, 44px clear of the card); four real moves
up the column, the last crossing into the cell, then the mouse stops:

```
t+0         : {"title":"214820-002 plain bushing"}
t+ 410ms    : {"title":"214820-002 plain bushing"}
t+1410ms    : {"title":"214820-002 plain bushing"}
t+4410ms    : {"title":"214820-002 plain bushing"}

real 3px nudge sideways (the vector no longer aims at card A):
after nudge : {"title":"NAS6403U11D hex-head bolt"}
```

4.4 seconds, not 260ms, and it only ends because the vector changed. Before
this branch the bolt's card opened immediately. So the deliverable closes one
way of losing a card and opens another: **a deliberate hover, held indefinitely
as long as the reader keeps still** — the precise failure the design document
says it was chosen to avoid.

The browser tier cannot see this because it pins the two halves either side of
it: the crossed trigger is held (pointer still moving), and a trigger hovered
while the pointer moves *away* opens at once. Neither reaches the expiry path.
The `push("...and it still does not, once the pointer has arrived and the grace
period has run out")` check looks like it does, but by then the pointer has
been moved *into the card*, which is the case where the held trigger is
*supposed* to be dropped.

**Suggested fix:** the expiry must not re-consult the same stale input it was
armed from. Either have `held.run()` bypass the corridor for one call (a flag
`defer()` honours and clears), or clear `pointerWas` when the timer fires so
the next `pointerHeadsFor` sees a zero vector and stands down. **And add a
browser-tier check for the expiry path** — pointer crosses the trigger toward
the card and stops there; its card is open within `HOVER_INTENT_MS + ε`. That
check is what makes the "never one that never arrives" sentence an assertion
instead of a claim.

### 2. Deliverable 5 is one CSS edit from being silently reverted — `apps/viewer/topology.css` (`.tv .detail` width, `.tv__divider::before/::after`)

The overlay's *"the whole deliverable is one line from being silently reverted
— mutate the wiring, not just the pure function"* entry, second sighting. I did
the mutation it prescribes: `git archive HEAD` into a scratch tree, then

- `.tv .detail { width: 560px }` → `430px`,
- `.tv__divider::before { background: var(--line) }` → `transparent`,
- delete the `.tv__divider::after` grip-mark rule entirely.

That is deliverable 5 undone in full — the pane back to the width Jeff called
too narrow, and the divider back to announcing itself only to someone who
already knew where to point. Result: **430/430 fast, 20/20 browser**, and
`pytest` does not read CSS. Nothing anywhere goes red.

The only thing that would have noticed is `tests/debug_hover_deslop.mjs:288`
(`pane.width >= 560`), and that file is a hand-run probe that no tier ever
executes — so it cannot be the pin. The existing browser-tier drag loop
(`for (const target of [560, PANE_MAX])`) drags *to* 560; it says nothing about
the default.

**Suggested fix:** two browser-tier assertions in the topology suite — the
pane's default `offsetWidth` on a page with nothing in `localStorage`, and the
divider's computed `::before` background (or the presence of the `::after`
grip) being not-transparent at rest. Then declare both in
`scripts/mutation_witnesses.json` so a future revert is a MISS rather than a
green run. No new witnesses were added for this handoff at all — the table is
still 37 entries.

## Should-fix

3. **`apps/viewer/views/cards.js`, the `card.provenance` comment: "48 of the 48
   live citations are `established` or have no export block".** Both halves are
   wrong, and it is the classic restated-count-with-nothing-pairing-it shape.
   Re-derived with the app's own `VA.citationCard`/`VA.exportProvenance` over
   the live projections: the topology side has **55** rows with a `source_ref`
   (29 `established`, 25 `none`, **1 `unestablished`**), and `results.json` has
   **65** (42 / 22 / **1**). Neither set is 48, and in both, one card *is*
   loud — `pitch_link_to_pitch_plate/bushing_214820`, which is the very card
   the lesson uses as its worked example in §5. The code is right (loud stays
   in the open); only the number and the "all of them" claim are wrong. Either
   drop the count or write it as "all but one, and that one is
   `bushing_214820`".

4. **`replace()`'s guards are witnessed by nothing, and the other re-place path
   is still unguarded** — `apps/viewer/topology_app.js`.
   - Mutation: delete both guards so `replace()` calls `position()`
     unconditionally (i.e. restore the pre-branch behaviour). **430/430 fast,
     20/20 browser.** Half of deliverable 4 has no pin at all.
   - Substantively: `img.onload` is not the only thing that re-places an open
     card. Both `showCrop` and `showCard` call their `paint()` again as each
     PNG blob resolves, and that `paint()` runs `position(nodes.crop, trigger)`
     **unconditionally** — including when the pointer is already on the card.
     That path runs on the *first* hover of every card (the png is not in
     `imageCache` yet), which is the common case. So "a card under the reader's
     pointer is a card in use and never moves" is not true as written; it is
     true only of the `onload` re-place. Route the async `paint()`'s re-place
     through `replace()` too, or say in the comment which path it does not
     cover.

5. **A `hovercard__where` line that reads only "rev A"** —
   `apps/viewer/views/cards.js` `componentCard` via
   `VA.componentDrawingText`. When the title already carries the number the
   function returns the bare revision, and three live parts hit it:
   `pitch_link_to_pitch_plate/pitch_plate_215197` and
   `vpa_output_to_pitch_plate/pitch_flange_215197` (`rev A`), and
   `pitch_system/gas_spring_mount_213668_002` (`rev A.1`). The card then shows
   "215735 pitch plate" and beneath it a line whose whole content is "rev A" —
   a revision with no noun, on the surface this handoff exists to de-slop.
   (The node card is fine: it composes `"<side> · rev A"`.) Give it something
   to modify — "drawing rev A" — or fold the revision into the heading line.

## Nits

- **`tests/debug_hover_deslop.mjs` cannot observe deliverable 4, and the reason
  is worth knowing.** It re-calls `VA.bootTopology()` after installing the
  fixtures, which registers a **second** `document` `mousemove` listener. Both
  listeners write the same module state, so for every move the second one sets
  `pointerWas = pointerAt`, leaving `pointerWas === pointerAt` — a zero vector,
  and `VA.pointerHeadsFor` correctly refuses to guess a direction from one. The
  hover-intent corridor is therefore dead in that probe's environment (measured:
  the app's own call comes back `from={x:497,y:617} to={x:497,y:617} -> false`),
  and a card is replaced immediately. Not a product defect — the app boots once
  — but a future session that reaches for this probe to check hover behaviour
  will measure the probe. Say so in the probe's header. (My own probes served a
  patched `topology_fixtures.js` instead, so the page boots once with real data.)
- `apps/viewer/topology_fixtures.js`, the new `base` note's comment: "the hover
  card shows a note **is** lead sentence in the open" → "a note's lead
  sentence".
- `apps/viewer/README.md` line 12: the edit merged two sentences onto one long
  unwrapped line ("…already says so. Neither transport offers a control it
  cannot service").
- `ISSUE_20260916_five_authored_notes_…` is `type: chore`, which fits the
  five-note reorder; but its closing paragraph asks a schema question (should a
  topology document carry a `description` distinct from `note`?). That half
  wants `audience: strategy` or a second issue, or it will be fixed five times
  and never answered once.
- Lesson §7's two tier-side traps are both real and well told, and the
  `.banner__built`-inside-a-closed-`<details>` one invalidates the worked
  example in this overlay's own wait-predicate entry and in
  `LESSONS_20260911_viewer_browser_tier_wait_predicates.md`. I updated the
  overlay; the older lesson is history and stays as written.
- Lesson "Counts" paragraph: "the two topology suites at 331/331 in-page and
  193/193 sub-checks each" conflates two different suites — 331/331 is
  `test.html`'s in-page suite (file:// and http), 193/193 is the topology
  *page*. Both numbers are right; the sentence attributes them to one thing.

## Verdict

**REQUEST CHANGES** — 2 blockers.

Nothing was fixed inline. The work is good and the reasoning in it is unusually
good: the diagnosis in §2 is correct and was measured rather than assumed, the
`leadSentence` discipline (a prefix of the record or the whole of it) is exactly
the right instinct for this repo, and the decision to fold the banner rather
than delete it is better than what the handoff asked for and says why. Both
blockers are of the same family — **the deliverable's own promise is the thing
nothing checks**: one is a promise the code does not keep, the other a promise
nothing would notice being broken.

Overlay updated with three new entries (the stale-input re-arm, the
CSS-only-deliverable pin, the double-boot probe). No issues filed: on REQUEST
CHANGES the handoff still owns every finding above.

---

# Second pass — 2026-09-16, after rework

**Verdict: APPROVE.** Both blockers closed, all three should-fix items and all
five nits taken. Rework merged (fast-forward, no conflict — `integration` had
still not moved); `7121f29` → `c4e89e8` in three commits.

## Tiers, re-run on the merged branch

| tier | result |
|---|---|
| `pytest -q` | 1192 passed, **1 failed** (the same pre-existing brief-prose regex), 1 skipped |
| `run_tests.cjs --repo` | **431/431** (430 at the first hand-back; +1 is `popoverShouldMove`) |
| `run_viewer_browser_tests.mjs --repo` | **20/20**; in-page suite 332/332 ×2, topology page 201/201 ×2 (193 before) |
| `run_mutation_witness_tests.mjs --repo` | **43/43 declared mutations witnessed** (37 before) |

## Blocker 1 — closed, verified independently

Re-ran **my own probe, unchanged** — the same all-real-mouse gesture that
measured 4.4 s and counting at the first hand-back. Card A open, four real moves
up the column onto the `NAS6403U11D` cell 44px below its box, then the mouse
stops:

```
t+0         : {"title":"214820-002 plain bushing"}    <- still held, correctly
t+ 410ms    : {"title":"NAS6403U11D hex-head bolt"}   <- the held trigger opened
t+1410ms    : {"title":"NAS6403U11D hex-head bolt"}
```

A quarter-second late, exactly as the design says. The `expiring` token is
sound on every path I traced: it is set only *after* all three of the timer's
early returns, cleared on the way through `defer()`, and cleared again in a
`finally` for the `if (!card) return` path that never reaches `defer()` — so it
cannot outlive its one call and wave a later hover past the corridor.

And the mutation tier settles it as a contract rather than as today's
behaviour: `hover-deferral-expires` deletes the token and reddens *"a held
trigger the pointer STOPS on opens after the grace period"* by name.

The author found the defect **underneath** the one I reported: the original
check dispatched the competing `mouseenter` synthetically while the pointer sat
elsewhere, and the expiry only honours a trigger the pointer is still *on* — so
that check could never have reached the expiry path at all. The block is real
moves end to end now, with a layout tripwire in front of it, and the reason
`{ steps: 12 }` is load-bearing (`mouseenter` is dispatched *before* the
`mousemove` at the new coordinates, so a single-jump move computes the corridor
off the position it jumped from) is written down where the next person will hit
it.

## Blocker 2 — closed, and I checked the half nothing declares

Four browser-tier checks now: the default width, the divider's hairline, the
grip's `background-image`, and its `position: sticky`. In front of them, a
tripwire asserting `localStorage` holds nothing and no inline width is set, so
the number they read really is the stylesheet's rather than a leftover drag —
which is the right shape, since the same suite drags this pane later.

Two are declared witnesses (`pane-default-width`,
`pane-divider-visible-at-rest`) and both came back WITNESSED. The other two are
not declared, so I mutated them myself: deleted the `.tv__divider::after` rule
in a scratch tree and re-ran the tier. **200/201 in both topology suites,
failing exactly one named sub-check** — *"...and carries a grip mark, held in
the viewport by sticky so a long study does not scroll it away"* — and nothing
collateral. The checks bite and they name the right thing.

## Should-fix, all three taken

3. The "48 of the 48" count is **deleted** rather than corrected, which is the
   better answer — "how many is a question for the live data, not for a
   comment" — and the loud case (`bushing_214820`) is now named in the comment
   instead of denied by it.
4. Every repaint after the first paint routes through `replace()` in both
   `showCrop` and `showCard`, so the async `paint()` path — the one the first
   hover of every card takes — is covered, not just `img.onload`. The decision
   moved into a pure `VA.popoverShouldMove` with its own fast-tier test over
   both guards, and `open-card-under-the-pointer-never-moves` witnesses the
   wiring. A later commit (`c4e89e8`) walked back two comments that still said
   the repaint re-places rather than *offers* a re-place.
5. `componentDrawingText` keeps the noun (`"drawing rev A"`), pinned by an
   exact comparison against `VA.revisionText(card.revision)` plus a
   `revisionOnly > 0` counter, so the check goes red rather than vacuous if the
   live data stops carrying a part that can reach the branch.

All five nits taken, including the one that mattered most: the schema question
is its own `ISSUE_20260916_a_topology_note_does_two_jobs_and_the_viewer_guesses_
where_one_ends.md`, `type: feature` with `audience: strategy`, and the
five-notes issue now points at it and says why the two do not block each other.

## Fixed inline (stated, per the boundary)

The reworked **Counts** paragraph still read *"the in-page suite runs 331/331"*
— the count from before the rework, which added `popoverShouldMove` to the
in-page set as well as the `--repo` one. Measured 332/332 twice, on two
independent runs. Added a dated correction blockquote rather than editing the
number away; the 431/431, 201/201 and 43/43 beside it were each re-derived and
are right. Doc-scan guards re-run clean.

## One thing worth saying about the rework itself

The lesson's new *"I had pinned the two halves either side of the bug"*
paragraph is the most useful thing in this handoff, and it generalises past the
viewer: two true checks flanking an untested middle read as coverage, and
nothing in a green run distinguishes them from three. It is now an overlay
entry, along with the `mouseenter`-before-`mousemove` ordering and the
probe-destroys-its-own-precondition trap. The author also self-reported a guard
they had shipped that could not fail — a `\b` eaten into a literal backspace by
a non-raw Python patch string, caught by the mutation runner, not by reading —
which is exactly the posture this checklist exists to produce.
