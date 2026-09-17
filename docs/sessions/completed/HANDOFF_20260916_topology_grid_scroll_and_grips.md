---
priority: med
depends_on: [viewer_unwitnessed_surface_guards]
model: opus
---

# HANDOFF 2026-09-16 — topology_grid_scroll_and_grips: the grid's horizontal axis loses the reader's scroll, its sticky rails and its own grips

Source: the dispatch triage sweep of 2026-09-16, routing three issues filed by
2026-09-15 sessions —

- `docs/issues/ISSUE_20260915_a_wide_preview_pane_can_cover_the_grids_own_drag_grips.md`
  (bug, med; filed out of `viewer_component_names_and_reference_copy`)
- `docs/issues/ISSUE_20260915_every_topology_pane_render_throws_away_the_readers_sideways_scroll.md`
  (bug, med; filed out of `respine_tween_fidelity_round2`)
- `docs/issues/ISSUE_20260915_the_sticky_rails_stop_sticking_once_the_grid_is_scrolled_past_the_dags_own_width.md`
  (bug, med; filed out of `respine_tween_fidelity_round2`)

**Why these three are one session, verified from the code and not assumed.** All
three are defects of the *same box stack* on `apps/viewer/topology.html`, and the
whole stack is built in one function and styled in one ~70-line CSS block:

- `apps/viewer/views/topology.js`, `VA.renderTopoPane` (defined line 166, opens
  with `VA.clear(root)` at line 167) constructs `.tv__hscroll` (line 298),
  `.tv__body` (line 309) and the rails SVG inside it, and records
  `VA.lastTopoRender` (line 289). `ghostOf` (line ~433) re-parents that same
  `.tv__hscroll` into `.tv__ghost` (line 440).
- `apps/viewer/topology.css` carries `.tv__main` (line 143), `.tv__scroll`
  (line ~147, with the full-page-scroll contract comment), `.tv__hscroll`
  (line 183), `.tv__head` (line ~184), `.tv__body` (line 190), `.tv__rails`
  (line 194, the sticky), `.tv__rows` (line 198), `.tv__ghost` (line 208) and
  `.tv__ghost .tv__hscroll { overflow: hidden }` (line 212) — one contiguous
  region.
- `.tvgrip--col` (line 312) and `.tvgrip--jog` live inside the head table that
  `.tv__hscroll` wraps, so issue 1's unreachable controls are unreachable
  *because of* the same overflow geometry that issues 2 and 3 are about.

So a fix to any one of them re-measures the other two: issue 3's candidate shape
(`.tv__body { width: max-content }`) changes what `scrollWidth` the pane reports,
which is the number issue 2's scroll-restore reads and writes, which is the
scroll position at which issue 1's grips are or are not under the preview pane.
Splitting them across sessions means three agents measuring the same box against
three different baselines. **Measure the three together; land them in one diff.**

Baseline: `master` at the 2026-09-16 batch merge (the merge measured **1155
passed** on `venv-win/Scripts/python.exe -m pytest -q`). All three issues'
numbers were measured against that tree at a 1600×1000 Chrome viewport on the
real `pitch_system` projection.

Scope: `apps/viewer/topology.css`, `apps/viewer/views/topology.js`,
`apps/viewer/topology.js`, `apps/viewer/topology_app.js`, `apps/viewer/tests.js`,
and — in `scripts/run_viewer_browser_tests.mjs` — **only** the `testRespine`
scrolled arm (lines ~3960–4090) and the jog-zone drag block (lines ~2040–2075).

Do NOT touch:

- `scripts/run_mutation_witness_tests.mjs`, `scripts/mutation_witnesses.json`
  and `tests/test_mutation_witnesses.py` — owned by
  `HANDOFF_20260916_mutation_witness_tier_reaches_its_checks.md`, staged in
  parallel. **This is a live collision, read the paragraph after this list.**
- the crop and topology **value-guard test modules** —
  `tests/test_viewer_crops.py`, `scripts/build_viewer_crops.py`, and any module
  whose name carries `value_guard` / `guard_rows` or that pins crop-projection
  or topology values row by row. Owned by
  `HANDOFF_20260916_viewer_unwitnessed_surface_guards.md`, staged in parallel.
  Get what you need from the browser tier and the fast tier instead.
- `docs/strategy/` — two sibling issues from the same sweep went to briefs
  (see "What is deliberately not in scope", below).

**Three-way overlap on the viewer tree, and the seam is by function, not by
file.** Both parallel handoffs above also list `apps/viewer/` and
`scripts/run_viewer_browser_tests.mjs` in their own scopes — the guard handoff
claims `apps/viewer/views/` and `apps/viewer/tests.js` plus the `SUITES` run loop
and `testNavNeverWedges`; the mutation handoff claims `apps/viewer/` broadly.
Your claim is narrower and specific: in `apps/viewer/views/topology.js`, the pane
construction and `renderTopoPane`/`animateTopoPane`/`ghostOf` region (lines
~150–450) and the `.tv*` rules in `apps/viewer/topology.css`; in
`scripts/run_viewer_browser_tests.mjs`, the `testRespine` scrolled arm and the
jog-zone drag block **only** — never the `SUITES` loop, never
`testNavNeverWedges`, never `testAnnotateHostedPosture`. Keep your diff inside
those hunks so a merge is mechanical. If you find you must widen past them,
**stop, report it, and build the rest** — the operator sequences these three, and
a silently widened fence is how a batch merge loses a guard.

**The mutation-witness collision, precisely.** Witness
`sticky-rails-hold-a-scrolled-dag` in `scripts/mutation_witnesses.json` has
`"file": "apps/viewer/topology.css"` and

```
"find": "  flex: none; display: block; position: sticky; left: 0; z-index: 1;"
```

which is `.tv__rails`'s declaration line byte-for-byte. Its `expect_red` is the
browser-tier check named in deliverable 3. **Preserve that line exactly** if you
can — the containing-block fix plausibly lands in `.tv__body`/`.tv__rows`, not in
`.tv__rails`, so this is usually free. If your measurement says that line must
change, do **not** edit `mutation_witnesses.json`: record the exact replacement
`find` string in your lesson and file an issue naming the witness id, so the
parallel handoff that owns that file lands it. A witness whose `find` no longer
matches is a guard that silently witnesses nothing — the failure mode that file
exists to prevent.

**Sequencing (set by the 2026-09-16 triage sweep, check the reasoning rather than just obeying it).**
`depends_on: [viewer_unwitnessed_surface_guards]`, which itself waits on
`mutation_witness_tier_reaches_its_checks`, so you are third in a chain of three.
Why: that handoff owns `apps/viewer/tests.js`'s `VALUE_GUARDS` and
`TOPO_VALUE_GUARDS` registries and the `SUITES` loop, and you edit `testRespine`'s
scrolled arm in the same file. Worse, the `sticky-rails-hold-a-scrolled-dag`
witness's `find` string is `.tv__rails`'s declaration line and its `expect_red`
names the very check your deliverable 3 rewrites — so your change moves a witness
that handoff is adding siblings to. Going last means you re-measure against a
settled registry instead of racing it.

## Deliverables

1. **The grid's drag grips stay reachable at any preview-pane width.**
   `.tv__main` is `flex: 1 1 640px; min-width: 0` with **no horizontal
   scrollport** (`topology.css:143`; the full-page-scroll contract,
   `viewer_error_surface_and_layout` 2026-09-09, is why), while the grid's head
   table carries a fixed inline width off `VA.TOPO_COLUMNS`
   (`views/topology.js:537`). The content therefore overflows `.tv__main`
   horizontally and `#detail` — a later flex sibling with its own background —
   paints over the overflow, so a pointer aimed at anything interactive out
   there hits the pane instead. The two controls in that region are
   `.tvgrip--jog` (jog zone, on the SVG/grid seam) and `.tvgrip--col` (ELEMENT
   column, on its header cell's right edge, `topology.css:312`).

   Measured, Chrome 1600×1000, real `pitch_system`, ELEMENT column dragged
   +220px and the jog zone at 5.5× (a few gestures):

   | pane width | `.tv__main` | jog grip at x | `#detail` starts at x | grip reachable |
   |---|---|---|---|---|
   | 430px (shipped default) | 863px | ~1090 | ~1170 | yes |
   | 560px | 733px | ~1090 | ~1040 | **no** |

   At 560px the browser tier's own `[real] pitch_system's jog zone drags open`
   check went red reporting `scale 5.50 -> 5.50` and `svg 793 -> 793px`: the
   synthetic pointer-down landed on the preview pane. The reader can drag the
   pane to `VA.TOPO_PANE_WIDTH.max` = 1000px (`views/topology.js:552`), so the
   hazard is live at the shipped default too — the 430px default only hides it.

   Repro: `apps/viewer/topology.html`, `pitch_system`, drag ELEMENT right ~200px,
   drag the jog zone open ~200px, drag the preview pane open ~130px. The jog
   grip's hairline is still visible at the seam; pressing on it does nothing.

   The issue lists three candidate shapes and they are not equal.
   **Suggestion to investigate, not a requirement:** prefer *moving the grips
   out of the overflowing region* (pin them to the sticky column header's own
   visible edge) — it keeps the landed contract, and the cost it carries is that
   the ELEMENT grip's position *is* the boundary it resizes, so "visible edge"
   and "the thing it means" come apart; measure how far apart before deciding.
   **Giving `.tv__main` its own `overflow-x: auto` is NOT in this handoff's
   gift** — that is a deliberate reversal of the full-page-scroll contract on one
   axis, the DAG pane's own scrollport was taken away on purpose, and the
   horizontal-axis argument overlaps a strategy brief written in the same sweep
   (below). If measurement says the contract reversal is the only honest fix,
   **report that and build the rest** — do not reverse it unilaterally.
   Clamping the pane's max against the space the grid needs is the worst option
   on the list (the reader asks for a wide pane and silently does not get one);
   take it only with an argument.

2. **A pane render carries the reader's sideways scroll across the rebuild.**
   `VA.renderTopoPane` (`views/topology.js:166`) opens with `VA.clear(root)`
   (line 167) and builds a fresh `.tv__hscroll` (line 298) every call. A new
   element's `scrollLeft` is 0, so the reader's horizontal position is not
   clamped — it is **discarded**. Measured on the real `pitch_system` at
   1600×1000, `testRespine`'s scrolled arm:

   ```
   scrolled respine: scrollLeft 605 -> 0 -> 0 (pane content 1474 -> 1240px)
   ```

   The reader scrolls `.tv__hscroll` to its right-hand end (605 of a possible
   605), clicks a study, and is at the left edge on the **first frame** of the
   respine and still there when it settles.

   This is not the respine's doing — every render of this pane goes through the
   same function, so the density toggle, the length-mode toggle, the
   leader-style toggle and both drag widths all discard it too. The respine
   merely makes it conspicuous, rendering the pane sixteen times in 260ms.

   The shape: read `.tv__hscroll`'s `scrollLeft` off the outgoing pane *before*
   `VA.clear`, write it back after the new one is appended — the browser clamps
   it to the new content width for free, which is the behaviour the reader
   wants. Two decisions inside that are why this was filed rather than fixed in
   `respine_tween_fidelity_round2`, and they are yours:

   1. **Which renders keep it.** A render of a *different topology* is a
      different mechanism and plausibly starts at 0. `VA.lastTopoRender.topologyId`
      (`views/topology.js:289`) already carries what that test needs.
   2. **The ghost.** Mid-respine the outgoing paint is re-parented into
      `.tv__ghost`, whose own `.tv__hscroll` is `overflow: hidden`
      (`topology.css:212`). If the live pane is restored to a scrolled position
      and the ghost is not, the cross-fade shows two different horizontal
      windows of the same table stacked on each other. Decide it and say so in
      the lesson.

   Pinned meanwhile, and **it must go red and be rewritten** by this work:
   `testRespine`'s scrolled arm asserts `scrollLeft === 0` on the in-flight
   frame (`[real] a respine rebuilds the pane, so a scrolled reader is at the
   left edge from the first frame …`, ~line 4066) and on the settled one
   (`[real] and it settles at the left edge on a pane the respine made
   narrower …`, ~line 4078), each naming this issue in a comment. Rewrite both
   claims to state the new behaviour; do not delete them.

3. **The sticky rails hold for the whole horizontal scroll, not just the DAG's
   own width.** `topology.css:194` claims, in its own comment, that "the rails
   stay put when the grid is scrolled sideways … rails that scrolled off the
   left would leave the rows they align with pointing at nothing." Measured on
   the real `pitch_system` at 1600×1000:

   ```
   sticky holds to scrollLeft 553 of 605; at the far end the DAG is -41.5px
   from the pane's left edge
   ```

   The pane is 869px wide, the walk's DAG 316px. The rails hold against the
   pane's visible left edge for the first 553px of scroll, then slide off it —
   41.5px at the far end, where the leftmost rail and the grid rows it aligns
   with are exactly the two things that comment says must never come apart.

   Why: a sticky box is bounded by its **containing block**, which here is
   `.tv__body` (`topology.css:190`) — the pane's own width, not its content's.
   The grid table overflows out of `.tv__rows` (`flex: 1 1 auto; min-width: 0`,
   line 198) rather than widening the flex row, so `.tv__body` measures 869px
   while the pane's `scrollWidth` is 1474px. The SVG can be pushed right by at
   most `paneWidth − dagWidth` = 553px; the remaining 52px of scroll drags it
   away. The gap scales with how much wider the grid is than the pane, so it is
   worse on a narrow window and worse on a topology with more grid columns —
   and invisible in every check the repo had before 2026-09-15, all of which
   measured at `scrollLeft` 0.

   **Suggestion to investigate, not a requirement:** give the sticky a
   containing block as wide as the content it sticks across —
   `.tv__body { width: max-content }` with `.tv__rows` sized to the table
   rather than to the flex line. The issue is explicit that this "wants
   measuring, not a one-line patch": the grid's own overflow, the header's
   `padding-left` seam and the `.tv__ghost` overlay all read off that box.
   Measure each of those three after the change and report the numbers.

   Pinned meanwhile: `testRespine` asserts **both** halves — that the DAG is
   pinned at a scroll within `paneWidth − dagWidth` (~line 4031) and that it is
   *not* past that (`[real] but only as far as the room the DAG leaves beside
   it …`, ~line 4042). A fix turns the **second** sub-check red; rewrite that
   claim rather than letting it outlive the behaviour, and keep the first.

## Evidence: screenshots, committed

All three defects were found by looking at rendered output, and for all three
a passing assertion is a weaker claim than a picture — issue 1's grip is
*visible* and dead, issue 3's rail slides 41.5px, issue 2's reader lands at the
left edge. So a screenshot is the proof of record here.

Commit **before/after PNG pairs under `docs/sessions/lessons/`**, one pair per
deliverable, named
`LESSONS_20260916_topology_grid_scroll_and_grips_<n>_<before|after>_<what>.png`:

1. `_1_before_grip_under_pane.png` / `_1_after_grip_under_pane.png` — real
   `pitch_system`, 1600×1000, preview pane at **560px**, ELEMENT +220px, jog
   zone 5.5×, with the jog grip's seam in frame. The "after" must show a
   pointer-down on that grip taking effect.
2. `_2_before_scroll_discarded.png` / `_2_after_scroll_carried.png` — the pane
   scrolled to `scrollLeft` 605, then the settled frame after a study click.
3. `_3_before_rails_slide.png` / `_3_after_rails_hold.png` — the pane at its
   far scroll end (605), the leftmost rail against the pane's left edge.

Capture them with `page.screenshot({ path })` from a throwaway probe under
`tests/debug_*.py`-style hand-run tooling or a one-off `.mjs` beside it — do
**not** add screenshot writes to `scripts/run_viewer_browser_tests.mjs`'s normal
run. No PNG is tracked in this repo today and `.gitignore` does not exclude
images, so these will be the first; put the viewport, the projection id, the
pane width and the `scrollLeft` of each shot in the lesson beside the filename,
because a screenshot with no measurement beside it is a picture of an
unreproducible state.

## What is deliberately not in scope

Two sibling issues from the same 2026-09-16 sweep carry `audience: strategy`
and were routed to briefs in `docs/strategy/` — read neither as work:

- the topology page's **folded totals strip and `sourcing`/`crop` columns being
  off-screen at 1600px**. That is the same `.tv__hscroll` axis you are working
  on, and it is a *presentation-priority* decision (wrap the strip, collapse the
  detail aside, demote the `from → to` span) that trades against a recorded
  decision about the strip's height. Your deliverable 3 will change what
  `scrollWidth` that strip and grid live inside — **report the new number in
  your lesson** so the strategy session decides against the tree as it then is,
  and do not pre-empt the decision by re-laying the strip or re-widening a
  column.
- the **no-File-System-Access annotate page** showing the whole bind workspace
  under a banner saying it cannot annotate. `apps/annotate/` is not yours.

## Definition of done

- On the real projection in the main checkout
  (`C:\workspace\tolstack\data\projections\viewer\`, gitignored and present only
  there — the browser tier reaches it from a worktree with
  `node scripts/run_viewer_browser_tests.mjs --repo C:\workspace\tolstack`):
  real `pitch_system` at 1600×1000, (a) the jog grip and the ELEMENT grip both
  respond to a pointer-down with the preview pane at 560px **and** at
  `VA.TOPO_PANE_WIDTH.max` = 1000px; (b) a reader parked at `scrollLeft` 605 who
  clicks a study is still at their clamped horizontal position on the settled
  frame, with the ghost and the live pane showing the same window; (c) the
  leftmost rail is within 1px of the pane's visible left edge at **every**
  `scrollLeft` from 0 to the pane's maximum, 605 included.
- Both viewer tiers green: `node apps/viewer/run_tests.cjs` (fast) and
  `node scripts/run_viewer_browser_tests.mjs --repo C:\workspace\tolstack`
  (browser). The three stale claims named in deliverables 2 and 3 are
  **rewritten, not deleted**, and each rewritten check names this handoff.
- Python suite green: `venv-win/Scripts/python.exe -m pytest -q`, at or above
  the **1155 passed** the 2026-09-16 batch merge measured. A docs-only edit can
  legitimately move this number (the suite pairs documents against the code they
  describe) — if it does, say which test and why in the lesson rather than
  reporting a bare count.
- Six PNGs committed under `docs/sessions/lessons/` per "Evidence", each with
  its viewport / projection / pane width / `scrollLeft` recorded in the lesson.
- Lesson (`docs/sessions/lessons/LESSONS_20260916_topology_grid_scroll_and_grips.md`):
  which of issue 1's three candidate shapes you took **and the measurement that
  chose it**; whether the full-page-scroll contract survived untouched (state it
  explicitly either way); the ghost decision from deliverable 2.2 and what the
  cross-fade looks like under it; the three numbers deliverable 3 asks for
  (grid overflow, header `padding-left` seam, `.tv__ghost` box) before and
  after; the pane's new `scrollWidth` on real `pitch_system` at 1600×1000 for
  the strategy session; and whether the `sticky-rails-hold-a-scrolled-dag`
  witness's `find` string still matches `apps/viewer/topology.css` byte-for-byte
  — with the exact replacement string if it does not.
