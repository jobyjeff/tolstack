---
type: review
handoff: viewer_dag_hover_cards
reviewer: agent (review/viewer_dag_hover_cards)
date: 2026-09-14
verdict: APPROVE
blockers: 0
---

# Review — viewer_dag_hover_cards

One commit (`c624f80`), merged here cleanly (no conflicts) on top of `3c0af96`,
which already carries `spec_crop_region_registry` — so the two fast-tier reds
the handoff's lesson reports as "pre-existing, not mine" are gone, and the
lesson's diagnosis is confirmed by their disappearance rather than taken on
faith. `integration` then moved again mid-review and brought both sibling viewer
handoffs with it; that second merge produced the one semantic conflict of this
review and is written up in its own section below, with the final numbers.

## What I verified

**Suites on the merged tree** — handoff + `integration@3c0af96`, the state
everything below was measured against (the post-sibling-merge re-run is in "The
integration merge" section):

| tier | result |
| --- | --- |
| `node apps/viewer/run_tests.cjs` | 267/267 (`[real]` tier SKIPPED — worktree) |
| `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | **323/323, tier ran** |
| `venv-win/Scripts/python.exe -m pytest -q` | 869 passed, 1 skipped |
| `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` | **17/17** — topology 128/128 both modes, served 15/15 |

The one pytest skip is `test_viewer_js_suite.py:55` — the node-fs tier with no
`data/` in a worktree, which is the run in row two above. `data/` in the main
checkout was untouched by every run (no file newer than the session start; the
main checkout's tracked tree is clean).

**Deliverables, against the DoD.** Real `pitch_system`: a bar with a croppable
citation opens the crop card (served-mode `[real]`, real PNG, and the card is
byte-identical to the same edge's grid-trigger card); a real boundary dot names
both its parts; an internal dot says it is internal. The truth tier gained the
DAG-side card-open measurement the DoD asked for *and* the value-level pin.

**Ten mutations, in a `git archive` scratch copy of the merged tree** — the
overlay's "one line from being silently reverted" check, applied to every
deliverable and to the plumbing:

| mutation | result |
| --- | --- |
| the bar never cards (`if (false && ctx.onCardShow)`) | fast 321/323; browser ERROR from `hoverRailBar` naming the element and the popover state |
| the dot never cards | fast 322/323 |
| `nodeCard` reads the declared `node.parts` instead of the derived adjacency | fast 320/323, including the `[real]` walk |
| the floored bar stops passing `renderNote` | fast 322/323 |
| the node card renders no side thumbnails | fast 322/323 |
| the edge card drops the render-note paragraph | fast 322/323 |
| `.croppop` back to `position: absolute` | browser 12/17 — **including** "a card opened from inside the DAG moves the DAG pane by nothing at all" |
| the DAG-side layout block returned to `TOPO_VIEWPORT` | browser 15/17 on its **own non-vacuity witness** |
| `cardPngs`' new `sides` prefetch deleted | **all three tiers 100% green** (see nit 1) |
| the served-mode boundary finder starved | 12/13 FAIL on the witness I added (was 12/12 PASS) |

The eighth of those is the third measurement the overlay demands of a
strengthened geometric guard (`ISSUE_20260911_card_layout_guard_passes_on_the_
absolute_popover`'s closing shape): the new DAG-side block both bites on the
in-flow popover and fails for being *unable to see* the defect if it is put back
at a viewport where the card fits inside the document. It is the correct reuse of
that pattern, not a new unguarded copy of it.

**Content.** No invented values anywhere: a side's thumbnail is literally that
part's own `VA.componentCard(...).thumbs[0]`, pinned equal across every live node
by the `[real]` test, and a part with no crop-bearing row gets `thumb: null` and
renders no slot (verified on the mock's `arm_tip` and on real data). The two new
vocabularies are module-level constants (`VA.FLOORED_RENDER_NOTE`,
`VA.CLEARANCE_SIDE_LABEL`), not inline literals, and `FLOORED_RENDER_NOTE` is
correctly the single source for both carriers of the not-to-scale fact — which is
the right answer to the one thing the absorbed `<title>` used to say that the card
had no field for. Both issues the handoff filed itself carry correct frontmatter.

## Findings

### should-fix (none fixed inline; all three filed)

1. **The dot's hover card and the dot's own preview pane print different side
   lists for the same node — 10 of 46 live nodes disagree.**
   `apps/viewer/views/topology.js`, `nodeDetail`: the `detail__where` line prints
   the authored `node.parts` while the card (and the same pane's own leader
   paragraph) print the derived adjacency. Measured over
   `data/projections/viewer/topologies.json`: on `pitch_system/vpa_end_stop_feature`
   the hover says `vpa_208510_007 ⇔ a clearance` and the click says
   `on vpa_208510_007`, and nine more like it. The card picked the defensible
   side — the derivation the picture is actually drawn from — so this is the
   *pane* being the odd one out, but the handoff was told to show "what the
   leader/preview pane already knows, card-form" and the result is two answers
   about one interface with nothing pairing them. The same three lines carry the
   second face: `nodeDetail` still spells `"a clearance"` as an inline literal
   beside the new `VA.CLEARANCE_SIDE_LABEL` that names it.
   → `ISSUE_20260914_node_preview_pane_prints_declared_parts_where_the_dot_card_prints_derived.md`.
   Not fixed here: the pane is outside this handoff, and the fix wants a pairing
   test.

2. **Three of the four `dismissCard` copies in `scripts/run_viewer_browser_tests.mjs`
   are never called** (`testTheApp` ~356, `testHeightBudget` ~1468,
   `testRenderCrash` ~1647 — none of those suites hovers a card trigger at all;
   their only `page.mouse.move` is the one inside the dead helper). ~33 lines,
   including three verbatim copies of the comment that carries the measurement.
   `hoverRailBar` from the same handoff *was* hoisted to module scope; this wants
   the same. → `ISSUE_20260914_three_dead_copies_of_dismisscard_in_the_browser_runner.md`.
   Not fixed here: deleting code is a refactor, not a typo.

3. **Absorbing the native `<title>` left a `tabindex="0"` mark with no accessible
   name.** `wire()` makes every rail mark focusable and the card branch appends no
   `<title>`; `grep -rn "aria-" apps/viewer` returns nothing, so the popover has no
   role and no `aria-describedby` relationship to its trigger. The card does open
   on `focus`, so a sighted keyboard reader is fine; a screen reader gets an
   unnamed graphic. Pre-existing pattern (`componentCell` did the same on
   2026-09-10) and now on four triggers, which is why it is a design call rather
   than an edit here. → `ISSUE_20260914_absorbing_the_native_title_leaves_a_focusable_mark_with_no_accessible_name.md`
   (`audience: strategy`, alongside the occlusion issue the handoff filed).

### Fixed inline (1)

**`scripts/run_viewer_browser_tests.mjs`** — the new served-mode `[real]`
boundary-dot block was `if (boundary) { push(…); push(…); }` with no witness
that `boundary` was found, so a projection that stopped emitting a multi-part
boundary in `pitch_system` would silently drop two sub-checks and still print
`PASS` (the runner reports `n/n`, never an expected count). Added the one-line
witness the `keyedRow` block eight lines above already carries:
`push("[real] pitch_system has a multi-part boundary dot to hover at all",
!!boundary)`. Observed failing by starving the finder — 12/13 FAIL naming that
sub-check, where the shipped state was 12/12 PASS. Served mode is 15/15 with it.

### nits

1. **The new `cardPngs` prefetch is unobservable.** Deleting
   `(card.sides || []).forEach(… add(side.thumb.entry))` from
   `topology_app.js` leaves fast (323/323), fast-`--repo` and all 17 browser
   checks green. Cause, as far as I can trace it: `ensureThumbImages(topoProj)`
   runs on every topology paint and fetches every resolved crop of every keyed
   edge in the open topology — a superset of the node card's side thumbs, since a
   side thumb *is* one of those crops — and the in-flight window is covered by
   `showCard`'s own `thumbFetches` guard, which returns without repainting either
   way. So the block is most likely redundant rather than untested. Harmless, but
   worth either a comment saying it is belt-and-braces or a deletion.
2. **"Four hover cards"** in `apps/viewer/README.md` is a hand-restated count
   against four `else if` branches in `renderHoverCard` with nothing pairing them
   (the handoff correctly updated `Three` → `Four`; the missing guard is
   inherited, not new). The standing fix shape here is a `VA.CARD_KINDS` tuple
   plus a prose pairing test, the same as every other vocabulary in this repo.
3. **`nodeCard`'s clearance branch is `partId === null`, not `!partId`.** A
   future `part: ""` would reach `VA.componentCard`, get `null` back, and throw on
   `part.title` inside a hover handler. The `[real]` walk would catch it the day
   such data appeared, so this is robustness, not a hole.

## The integration merge — and the one semantic conflict it produced

`integration` moved twice while this review ran: first to `3c0af96` (already in
the numbers above), then to `127fc75`, picking up **both** sibling viewer
handoffs — `viewer_popover_clamp_and_rebuild_terminal_state` and
`viewer_leader_grid_legibility`. Merged forward into this review branch; git
reported **no conflict at all**, and the fast tiers and pytest stayed green
(279/279, 338/338, 869+1 skip). The browser tier did not: **15/17**, on this
handoff's own DAG-side non-vacuity witness.

**Both sides.** This handoff's DAG-side card-layout block copied the grid-side
witness verbatim in form — "the card hangs past the document's own bottom" via
`cardLayout().cardDocBottom`. `viewer_popover_clamp_and_rebuild_terminal_state`
landed the room cap, which keeps every open card **wholly inside the window**,
so nothing reaches past the document any more; its own review measured exactly
that, re-expressed the grid-side witness as *the cap bit* (the card's box is
exactly the roomier side's room and its content still overflows it), deleted
`cardDocBottom` from `cardLayout()`, and filed
`ISSUE_20260914_card_layout_guard_cannot_see_the_absolute_popover_again.md`.
The two edits sit in different blocks of the same file, so git took both: the
rewritten helper, and a block reading a field it no longer returns.

**The resolution, and why.** `integration`'s side owns the *form* the witness
must take (the cap is the app's behaviour now, and it is more correct); the work
under review owns the *claim* (there is a DAG-side layout measurement, with a
witness that asserts its own stage). So the witness was re-expressed in the
cap-bit form against the **rail bar's own box** rather than retired or left
red — `cardLayout` now takes a trigger selector, defaulting to the grid trigger
so the grid-side block is untouched, and the DAG-side block passes
`BAR_TRIGGER`. Measured at 1600x700 on `?mock=1`: bar 418.5–444.5, room above
402.5 / below 239.5, card capped to 402.5 and scrolling inside itself.

Two things worth recording about doing it:

- The first attempt was wrong in a way that survives review-by-reading: the
  wrapper grew the parameter but the `page.evaluate(fn, CARD_TRIGGER)` **tail**
  still passed the constant, so the "bar" witness was reading the grid
  trigger's box (418.5–444.5 either way) and failed for the wrong reason.
  Printing the numbers, not re-reading the code, is what found it.
- Observed failing after the fix: returning that block to `TOPO_VIEWPORT` takes
  it to 156/157 on the witness itself — which is what proves it cannot be put
  back at a stage where the contracts under it are invisible.

**Re-verified on the fully merged tree:** fast 279/279, fast-`--repo`
**338/338**, pytest 869 passed / 1 skipped, browser **17/17** (topology 157/157
both modes, served 15/15). The three sub-checks the sibling's issue says are no
longer falsifiable are left exactly as that issue found them — retiring or
re-siting them is its call, not this review's.

## Note for the next reviewer

The overlay gained four entries from this review (end of "Recurring bugs to
check"): measure a new surface against the existing carriers of the same fact on
live data rather than reading the code; a `[real]` browser-tier block gated on a
projection-derived subject needs a witness that the subject was found; mutate
the *plumbing* lines too, with the discipline of asking whether a green mutation
means untested or redundant; and the merge lesson above — re-run the browser
tier after merging a *moved* `integration`, because a textually clean merge can
orphan a geometric witness, and the second copy of a measurement idiom is the
one nobody updates.

The handoff's own lesson is unusually good on the browser-tier traps — the four
`hoverRailBar`/`dismissCard` findings are each encoded in a helper with its
measurement in the comment, and `hoverRailBar` was verified here to fail loudly
and name what the pointer was actually over. Reuse it rather than re-deriving
how to hover a zero-width `<line>`.
