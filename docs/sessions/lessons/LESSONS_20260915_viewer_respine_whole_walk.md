---
handoff: viewer_respine_whole_walk
date: 2026-09-15
---

# Lessons — viewer_respine_whole_walk

## The one decision the handoff left open, and why it went the way it did

The handoff says the grid "shows the chain's rows **(as the chain view does
today)**". The chain view did two things at once — it took a *subset* and it
put that subset in the **sum's order** — and the handoff's own item 4 ("no
re-columning ... emphasis + leaders + grid subset only") names only the first.
I took the subset and kept **walk order**, and this is the load-bearing call of
the session:

- the grid sits under a DAG that **did not move**. Re-order the table and every
  leader on the page crosses, because a leader's whole claim is "this interface
  is the seam between the row above and the row below";
- `VA.leaderBands` and `VA.rowBandParity` both assume `leaders[i].boundary` is
  non-decreasing. Sum order breaks that, and the alternating bands
  (`viewer_leader_grid_legibility`, the fix for Jeff's "near impossible to
  follow") go with it;
- **the sum's order is already on screen**, in the `#` column —
  `VA.chainIndex`'s ordinal. On `pitch_link_cotter_hole_clearance` the five
  kept rows read `3, 2, 1, 5, 4` top to bottom. Nothing was lost by not
  re-ordering; a second answer to "what order is this?" would have been gained.

`VA.gridPlan` already documented the identical rule one level down — *"the
depth-first walk can revisit a part on a later branch ... reordering the grid to
force one row per part would cross the leaders and break the walk-order
correspondence this page is built on"*. Same argument, same answer.

## The change is four lines of behaviour and a lot of vocabulary

The mechanism is smaller than it looks. `VA.gridPlan(layout, topoProj, focus)`
gained an optional third argument — `{ edges: VA.chainIndex(study), nodes:
VA.chainNodes(study) }` — and filters the walk's rows through it on the way in:
an edge outside the chain emits no grid row, a node outside it no leader.
Everything after the filter is the walk-order logic untouched. `layoutFor()` is
gone; `renderTopoPane` reads `topoProj.layout` and nothing else.

What cost the time was **vocabulary that quietly died**:

- `tvrow--on` / `tvrow--off` — with the table subset to the chain, every row in
  it is a member. `.tvrow--off` (opacity .35) can never render. Removed, with
  the CSS rule.
- `rail__leader--off` — same: a leader is drawn or it is not. That **absence**
  is the strongest of the three emphasis signals, and it is the one Jeff asked
  for first ("It should be fairly obvious that there are no leader lines
  pointing to certain elements"). Removed; `--on` stays and is now unconditional
  under `marking`.
- `state.layoutMode` — gone from state, from the ctx, from `serialisation()`,
  and from ~35 sites in `tests.js`. Strip it: a dead key on a ctx is a key the
  next reader will try to set.

## The four mutation-witness anchors that rot on a state-field removal

`scripts/mutation_witnesses.json` anchors are **literal source strings**, and
four of them straddled `state.layoutMode = "topology";` in `selectTopology()` —
three preference-persistence entries used it purely as a neighbouring line to
make their anchor unique, and one (`refusing-study-stays-on-the-walk`) *was*
that line. `tests/test_mutation_witnesses.py` catches this in under a second,
which is the whole reason that test exists; expect it, and budget for it
whenever you delete a line from a small function.

Re-pointing the fourth one is the interesting half. The contract survived the
change — a refusing study still has to leave the walk alone — but it moved from
`topology_app.js`'s `chainable()` to `views/topology.js`'s single

```js
var marking = !!(study && study.status === "ok");
```

which now gates the dimming, the leader subset and the grid subset together.
**The obvious mutation (`!!study`) aborted the suite instead of reddening the
check**: with a refusing study "emphasized", the grid renders zero rows, and
everything downstream in `topology file://` that reads a grid row null-derefs.
The runner can only attribute a *named* failure. The fix was to make the suite
deselect back to the walk after the refusal check — which the suite should have
been doing anyway, since every block after it describes a deselected page.
Re-measured: `1/1 declared mutations witnessed`.

## What a respine still animates, measured

Worth knowing before anyone reads the tween machinery and concludes it is now
dead. Both frames are the same walk, so:

- every column, rail and dot `y` is **identical** on the two sides —
  `VA.respineX` returns `columnShift: 0`, and `VA.drawnColumn`'s unfold is a
  no-op;
- the position store's **key set is identical**, so `VA.tweenPositions`'
  entering/leaving arms produce an empty `alpha` map and `VA.tweenAlpha` returns
  1 for everything;
- what *does* move: the **pane width** (the jog zone loses a lane per dropped
  leader) and **`gridOffset`** (a shorter table re-centres against a DAG of
  unchanged height). On `pitch_system` / `gas_spring_branch`: 316 → 250px and
  299 → 143px. Every one of the 21 committed studies moves at least one of the
  two, and the `[real]` tier now asserts that study by study — a quarter-second
  of nothing would read worse than no animation.

So the round-1 lesson's prediction was half right: *"if a respine ever becomes
a re-columning ... `respineX` returns `{columnShift: 0, width: toWidth}`"* — the
column half went to zero, the **width** half did not, because the leader count
still differs between the two sides.

## The synthetic pairing, and why four tests were kept rather than deleted

`respineStores()` in `tests.js` pairs the walk against one study's own
`study.layout`. The page no longer draws the second one, so four render-level
tests were re-based onto a **hand-built outgoing frame record** (`{positions,
columns, floor, width, links}` — `renderTopoPane` does not care where a `from`
came from) and labelled synthetic in place. Kept, not deleted, on the round-2
lesson's own reasoning for the shared-column link fade: the functions are pure,
the guarantee is about *any* two serialisations, `study.layout` is still in the
projection, and this is the only place the off-pane defect
`ISSUE_20260915_a_respine_cannot_interpolate_x_so_the_whole_block_slides`
describes can still be reproduced at all.

That is a judgement, not a rule, and it is the one a reviewer should push on
hardest. It is filed as
`ISSUE_20260915_the_per_element_respine_fade_is_no_longer_reachable_from_the_page.md`
(`audience: strategy`) rather than left in this file, because "keep a mechanism
against a layout change that may never come" is a decision with an owner, and a
lesson has no owner.

## Two things that fell out for free, and one that did not

**A deep link and a nav click now land in the same state.** `?study=<id>` set
`state.studyId` directly and never touched `layoutMode`, so a linked study
showed the *walk* with its chain marked while the identical click showed the
*chain*. Nobody had noticed; there is one state now, so the divergence cannot
come back.

**The three pitch-link studies now read alike**, which was the actual
complaint. Measured on the live projection, 1600×1000, all three: 7 dots, 8
bars, 3 rails, 0 links — identical — with 3 / 4 / 6 bars dimmed, 4 / 5 / 2
leaders drawn, and 5 / 4 / 2 grid rows (each exactly its chain's length).

> **Correction, 2026-09-15 (review).** The link count is **4**, not 0 —
> `pitch_link_to_pitch_plate`'s `layout.links` has four entries and the page
> draws all four under every one of the three studies. Re-derived off the
> rebuilt projection with a throwaway `[real]` probe: `7/8/3/4` dots / bars /
> rails / links for the deselected walk and for each study. Every other figure
> in the sentence reproduced exactly (3 / 4 / 6 dimmed, 4 / 5 / 2 leaders,
> 5 / 4 / 2 rows), which is what makes a wrong sixth one survive a read. The
> `[real]` sweep this session added asserts the rendered link count against
> `topoProj.layout.links.length`, so the *code* was never wrong here — only
> this sentence.

**What did not fall out:** `docs/prompts/REVIEW_AGENT.md` cites `chainable()`'s
false branch twice, as a dated example in two checklist items. Both are true
statements about code as it was on 2026-09-15 and both name the handoff that
made them, so I left them rather than rewriting a review prompt's own history.
A reader chasing `chainable()` will land on this handoff.

## For the grid-motion question (brief item 2, still open)

The brief's marker is updated, but the short version: the surviving-row set is
now a walk-order **subset of the same table** rather than a different table, so
a FLIP is at last arithmetically possible — every surviving row keeps its
relative order and only its index changes. The obstacle the brief names is
untouched, and is now slightly sharper: a leader's grid-side seam is
`gridOffset + boundary × rowHeight`, and `boundary` is an index **into the
subset**, so a FLIP that moves rows individually has to answer what a leader
points at mid-flight. Today nothing has to: the block moves, the pitch does not.

## Verified

- `node apps/viewer/run_tests.cjs`: 305/305 (worktree, mock tier only).
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: 376/376.
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`:
  19/19 suites; `topology` 165/165, `topology respine` 39/39.
- `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack`:
  17/18. The miss is `card-layout-out-of-flow`, **pre-existing** — reproduced
  at the branch base by extracting `apps/` and `scripts/` at `9517ce0~2` with
  `git archive` and running the runner from there. Filed as
  `ISSUE_20260915_card_layout_mutation_aborts_its_suite_before_the_check_it_declares.md`.
- `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`: 887 passed,
  1 skipped, 1 failed. The failure is
  `test_every_byte_identity_claim_in_a_live_file_names_its_verification` on
  `docs/strategy/BRIEF_20260915_origin_posture_and_absent_feature_rule.md`,
  which arrived with the branch and is already filed
  (`ISSUE_20260915_strategy_brief_byte_identity_claim_fails_the_provenance_guard.md`).
- Screenshots of all three `pitch_link_to_pitch_plate` studies taken at
  1600×1000 off the live projection and read by eye, which is how the counts
  above were confirmed to be a picture rather than a number.
- `node_modules` was junctioned from the main checkout for `playwright-core`
  and removed before finishing.
