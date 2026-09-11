# LESSONS 2026-09-11 — hover_card_layout_guard_can_fail

Handoff: `docs/sessions/active/HANDOFF_20260911_hover_card_layout_guard_can_fail.md`
Source issue: `docs/issues/ISSUE_20260911_card_layout_guard_passes_on_the_absolute_popover.md`
Changed: `scripts/run_viewer_browser_tests.mjs` only. No `apps/viewer/` change —
the shipped `position: fixed` popover is correct and stayed untouched.

## The configuration that finally made the defect observable

**Same suite, same trigger, same scroll position — only the viewport height
changed.** The card block in `testTheTopologyPage` now drops to
`CARD_LAYOUT_VIEWPORT` (`1600x700`) for the measurement and restores
`TOPO_VIEWPORT` (`1600x1000`) after.

Why 700 and not "scroll near the fold":

- At `1600x1000` the mock fixture's whole document is **1000px — the viewport
  itself** (its content is shorter than the window, so `scrollHeight` bottoms
  out at the ICB). The edge card is 528px tall and `position()` puts it at
  `top: 361.5px`, bottom 889px: entirely inside a 1000px document. An
  absolutely-positioned popover there has nothing to lengthen. That is the
  whole of the original guard's vacuity — not the assertion, the *stage*.
- At `1600x700` the document is 700px and the same card still lands at
  `top: 361.5px`, bottom **889px** — 189px past the document's own bottom. In
  flow that grows the document; out of flow it cannot. Measured both ways
  (numbers below).
- **Scrolling to the fold does not help and is actively misleading.** Two
  traps: (1) `position()`'s `goAbove` branch flips near the bottom of the
  window, so a trigger scrolled to the bottom gets its card placed *above*,
  which never lengthens anything; (2) playwright's `hover()` scrolls the
  trigger into view on its own, so any measurement in *viewport* coordinates
  silently compares two different scroll positions. The new `cardLayout()`
  helper returns only scroll-invariant quantities (document height, the pane's
  box in DOCUMENT coordinates, the card's bottom in document coordinates) for
  exactly that reason.

## The pane-box assertion cannot catch this class at all, in headless

The original two assertions were the pane's bounding box and leader
correspondence. Under the reverted popover at `1600x700` the document goes
`700 -> 889` and **the pane box does not move by a single pixel** — headless
Chrome's scrollbar is an overlay, so summoning one reflows nothing. The lesson
from `viewer_hover_cards_and_deep_links` ("the scrollbar it summons reflows
every pane") is therefore not reproducible in this tier at all; the only thing
that *is* measurable here is the document's own height. That is now its own
assertion:

    an open card leaves the document's own height untouched

The pane-box and correspondence assertions are kept (they cost nothing and they
pin the horizontal story), but do not trust them as the tripwire for this
defect class.

## The guard now asserts it is not vacuous, before asserting the contract

The failure mode this handoff existed to fix is *silent vacuity*, and a
strengthened assertion at a hard-coded viewport can drift straight back into it
(a shorter card, a taller fixture, someone "tidying" the viewport back to
1000). So the block asserts its own stage first:

    the open card hangs past the document's own bottom — the one
    configuration where an in-flow popover would lengthen it

`cardDocBottom > docHeightBefore + 8`. If a future change makes the card fit
inside the document again, the suite goes **red for being unable to see the
defect**, rather than green for not finding it. That check is the durable part
of this session; the 700px number is just today's way of satisfying it.

## Replay evidence — how the next reviewer re-runs this

Three string replacements against trunk's `apps/viewer`, exactly the state the
issue's second paragraph names (all of it is reverting commit `5caafa1`'s
popover hunks):

1. `apps/viewer/style.css`, `.croppop` — `position: fixed` → `position:
   absolute`, and delete the whole `max-height: calc(100vh - 24px);
   overflow-y: auto;` line.
2. `apps/viewer/topology_app.js`, `position()` — `pop.style.left`'s
   `Math.min(box.left, window.innerWidth - …)` → `Math.min(window.scrollX +
   box.left, window.scrollX + window.innerWidth - …)`.
3. same function — `pop.style.top = Math.max(8, goAbove ? box.top - height - 8
   : box.bottom + 8)` → `(goAbove ? window.scrollY + box.top - height - 8 :
   window.scrollY + box.bottom + 8)` (the `Math.max(8, …)` floor goes away with
   it).

Then `node scripts/run_viewer_browser_tests.mjs --repo C:\workspace\tolstack`,
and `git checkout -- apps/viewer/style.css apps/viewer/topology_app.js` to
restore. Measured 2026-09-11, Chrome 152.0.7977.83 via `channel: 'chrome'`:

| state | `documentElement.scrollHeight`, card closed → open (1600x700) | browser tier |
|---|---|---|
| shipped (`position: fixed`) | 700 → 700 | 16/16, topology 118/118 both modes |
| reverted (`position: absolute`) | 700 → **889** | 14/16 — `topology file://` and `topology http` both 117/118 |

The failing sub-check text, verbatim, in both modes:

    FAIL sub-check: an open card leaves the document's own height untouched

**The third measurement is the one worth keeping.** Replay the reverted popover
*and* put `CARD_LAYOUT_VIEWPORT` back to `1600x1000` (the stage the old guard
used), and the document-height assertion goes green — vacuous, exactly as the
issue reported — while the only thing that fails is the non-vacuity witness:

    FAIL sub-check: the open card hangs past the document's own bottom — the
    one configuration where an in-flow popover would lengthen it

So the witness does its job: it is not possible to put this guard back on a
stage where the defect is invisible and still have the suite pass.

## Two issues filed, both found by this measurement and both out of scope

- `ISSUE_20260911_hover_card_bottom_unreachable_on_a_short_window.md` — the
  shipped card at `1600x700` sits 189px off the bottom of the window and
  `overflow-y: auto` cannot reach it, because `position()` clamps only the top
  edge and the card is shorter than the `max-height` cap. A real (pre-existing)
  UX defect in `apps/viewer`, which this handoff was explicitly told not to
  touch. Its fix has a natural home: the assertion belongs in the very block
  this session rewrote, at the very viewport it now uses.
- `ISSUE_20260911_served_mode_connect_folder_banner_check_is_flaky.md` — a
  1-in-4 flake in `testServedModeBoot`, unrelated to this change: its
  `waitForSelector('tr.tvrow, .banner--disconnected')` can resolve on the
  boot's own transient disconnected banner (`topology_app.js`'s initial state)
  and then assert that banner's absence. Hit once mid-session; do not read it
  as a regression from a card-layout change.

## Environment notes

- `node_modules/` is per-worktree and gitignored: `PLAYWRIGHT_SKIP_BROWSER_
  DOWNLOAD=1 npm install` in the worktree root first (one package, ~1s), or the
  runner dies with `ERR_MODULE_NOT_FOUND: playwright-core`. Already in several
  prior lessons; still the first thing that bit this session.
- Verified green after restoring shipped code: browser tier 16/16 (topology
  118/118 in both modes), `node apps/viewer/run_tests.cjs --repo
  C:\workspace\tolstack` 283/283, `venv-win/Scripts/python.exe -m pytest -q`
  759 passed / 1 skipped.
