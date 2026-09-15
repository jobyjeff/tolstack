---
type: review
handoff: docs/sessions/active/HANDOFF_20260915_respine_tween_fidelity.md
reviewer: agent
date: 2026-09-15
verdict: APPROVE
blockers: 0
---

# Review — respine_tween_fidelity

Both deliverables are met, both are pinned by guards I observed failing, and
the handoff's harder ask — *diagnose before fixing, and say whether the two
bugs share one cause* — was answered with measurement rather than argument.
One should-fix, filed; five nits; one inline fix.

## What I verified

**Merge.** `handoff/respine_tween_fidelity` was **not** contained in
`integration`, so my merge was real verification rather than a no-op.
`integration` had moved two commits underneath the branch
(`0a2851d` issues sync, `ab51504` master sync, carrying
`surfaces_that_state_something_false`) and touched **every file this handoff
touched** — `apps/viewer/topology.js`, `views/topology.js`, `tests.js`,
`README.md`, `run_viewer_browser_tests.mjs`, `docs/prompts/REVIEW_AGENT.md`.
Git merged all six with no conflict; the edits sit in disjoint regions
(`nodeSideIds` / `detail__where` at topology.js ~1769 and views ~1233, versus
the respine machinery at ~821–1480 and views ~216–380). **Nothing needed
resolving, so nothing about the green suite is a judgement call of mine.**
Per the overlay's "a textually clean merge can still kill a geometric
witness", I re-ran the browser tier *after* the merge, not just the fast tiers.

**All tiers, on the merged tree, run by me:**

| tier | result | (lesson claimed) |
|---|---|---|
| `node apps/viewer/run_tests.cjs` | 298/298 (mock only) | 296/296 |
| `... --repo C:/workspace/tolstack` | 360/360 (real tier ran) | 357/357 |
| `node apps/annotate/run_tests.cjs` | 63/63 | — |
| `node scripts/run_viewer_browser_tests.mjs --repo …` | 19/19 suites; respine 33/33 | 18/18, 33/33 |
| `venv-win/…/python.exe -m pytest -q` | 869 passed, 1 skipped | same |

The deltas from the lesson's counts are the integration-side work merging in
(+2/+3 JS tests, +1 browser suite `annotate hosted posture`), not drift.

**Projections untouched.** `C:\workspace\tolstack\data\projections\viewer\`
still stamps 2026-09-14 23:53 on all four entries — nothing was rebuilt, as
the DoD asked. No tier wrote into `data/`.

**Mutation sweep — 13 of mine, 12 caught.** Written from the diff's own new
conditionals rather than from the lesson's list, which is the overlay's rule
after `viewer_study_respine_animation`. Five of the author's eleven, re-run
independently, all fired. Caught: the `max(0, …)` clamp, `columnShift → 0`,
`respineX`'s width interpolation, its `t` clamp, `leaderGeometry`'s `zoneLeft`
read of the tween, its `width` read of the tween, the `naturalZone > 0`
stretch, both `from`-side carry-over loops restored one at a time,
`lastTopoRender.columns → layout.columns`, and the view dropping the
`respineX` call. Two survived — see nit 1.

**The browser tier's new x witnesses, observed failing.** I restored the
pre-fix behaviour (`xTween = null` plus the whole-block translate on
`.tv__head` / `.tv__body`) and re-ran: `[topology file:// respine]` went
**29/33**, naming the right four sub-checks, with the diagnostics printing
`at t = 0.0003 the SVG is 82, should be 315.93` and
`deselect leftmost drawn box: -176.38px`. That is the DoD's "assert the
first-frame x of a known row is inside the pane" claim, falsifiable and
measured off `getBoundingClientRect`, not off the store the render used. The
fast tier's two new geometry tests went red on the same revert.

**The diagnosis, re-measured off the real `pitch_system`.** Every number in
the lesson checks out exactly: walk width **316**, chain width **82**, diff
**234**; rails travel **180** (`railX(9) − railX(0)`), so the old anchor
over-shifted by **54**; **45** marks (= 45 layout rows: 21 nodes + 24 edges),
leftmost at **−219** under the old slide. Walk `columns: 10`, chain
`columns: 1`. The claim that the two bugs have **separate** causes is sound
and is the right call — `respineShift` read `leaderGeo.width`, a pure function
of `(columns, leaders, metrics)`, never of the store's key set.

**The brief gate.** `BRIEF_20260915_respine_scope_and_grid_motion` still has
no outcome section and no handoff staged against it, so the handoff's "stop
and report" condition did not fire. The lesson's "Left undone" says exactly
this.

**Housekeeping.** No stale `VA.respineShift` reference survives anywhere
(code, tests, README, browser tier). No new modules, so no `ARCHITECTURE.md`
inventory row is owed. Both filed issues carry correct frontmatter, with
`found_by:` and not `handoff:`. The two source issues are already
`status: triaged` with `handoff:` set, so dispatch resolves them on Complete.

## Findings

### should-fix (filed, not fixed)

**1. `apps/viewer/views/topology.js` (`railsSvg`'s comment 1) — "there is
nothing to appear from nowhere" is true from a settled frame only, and the
interrupt guard cannot see the difference.** The justification for rails and
links carrying no opacity of their own is that an added column is coincident
with one the outgoing frame drew. Measured off the shipped functions, with a
10-column walk and a 1-column chain:

```
frame A (select, e = 0.5):            rails [105]                              width 136
frame B (interrupt deselect, e = 0):  rails [15,15,15,15,15,25,45,65,85,105]   width 136
```

Frame B is the first frame of a respine started from frame A's own record. The
spine holds at 105 and the width is continuous — which is all the new *a
respine interrupting a respine continues from the picture on screen* test
compares, because its `spineAndWidth` reduces the frame to *max rail `x1`* and
the SVG width: the two numbers `VA.respineX` itself returns. Behind them, nine
rails appear at full opacity where frame A drew nothing, because added columns
collapse onto the **leftmost drawn** rail and from a fractional outgoing frame
that is not the spine.

Not a regression — the old block slide popped the same rails in, and further
off-pane. But the claim is stated unconditionally in that comment, in
`README.md`'s "a surviving rail starts exactly where the outgoing frame drew
it", and in `ISSUE_20260915_a_rail_or_link_a_respine_adds_on_a_surviving_
column_has_no_fade.md`'s "Why it is not observable today" — which is what
makes that issue `low`. Filed as
`ISSUE_20260915_an_interrupted_respine_pops_nine_rails_in_from_nowhere.md`
(`med`) with the repro and both fix shapes; it asks triage to re-check the
sibling issue's priority. Outside the three inline-fix prongs: widening the
guard is a new test, and fading a rail is designed behaviour.

### nits

1. **Two mutations survived all three tiers.** (a) `VA.respineX`'s second
   guard, `if (!(zone.columns > 0) || !(zone.width > 0)) return null;`, is
   **unreachable** — `zoneMetrics` floors `columns` at 1 and its `width` is
   `left + (c−1)·gutter + left + pad·2·scale`, always positive — so replacing
   it with `if (false)` leaves 298/298 and 360/360. (b) `leaderGeometry`'s
   returned `zoneScale: zone.scale`, the author's deliberate choice that the
   *reported* field stays the reader's preference rather than the mid-flight
   stretch (documented in a comment beside it): mutating it to `scale` changes
   nothing observable, because no production code reads `leaderGeo.zoneScale`
   at all and the tests only exercise it at rest. Both inert today; (b) is the
   overlay's "the guard the author added on their OWN initiative" shape with no
   consumer to bite, which is why it is a nit and not the should-fix.
2. **"22 study chains" is 21 — fixed inline.** Recounted off
   `data/projections/viewer/topologies.json`: five topologies, **21** studies
   (3 + 7 + 9 + 1 + 1), every one `columns: 1` with `links: []`; walks run
   2–10 columns and 2–18 links, as claimed. Corrected in the no-fade issue
   (line 31) and `LESSONS_20260915_respine_tween_fidelity.md` (line 159). The
   argument does not depend on the digit — this is the repo's most-repeated
   defect class surfacing in prose the doc-scan guards deliberately exempt.
3. **The settled "no slide" assertions are now unfalsifiable.** Nothing writes
   `style.transform` on `.tv__head` / `.tv__body` any more, so the two
   `eq(…style.transform || "", "")` lines in *the settled frame carries none of
   the animation: no ghost, no slide, …* and the `transforms === ","` third of
   the browser tier's `clean()` can no longer fail — while the test's name
   still advertises the claim. **Second sighting** of the overlay's *"a fix
   that makes the app more correct can make the guards already in that block
   vacuous"* entry (first: `viewer_popover_clamp_and_rebuild_terminal_state`,
   2026-09-14), so no overlay edit is owed; worth knowing they are now
   reintroduction guards rather than witnesses. The **in-flight**
   `bodyShift === "" && headShift === ""` check is genuinely falsifiable — my
   replay failed it.
4. **`apps/viewer/README.md`'s "all 45 of the walk's marks" is unguarded.** It
   is correct (45 rows) and the sentence is historical, but the real-tier test
   that computes the same list is one `eq(slid.length, 45)` from pairing it.
   Same for the pre-existing "**10 columns** … needs **1**" a few lines above.
5. **The tactical agent edited `docs/prompts/REVIEW_AGENT.md`**, which the
   overlay's own header assigns to the review agent. The edit is accurate — it
   historicizes the key-set entry, and I confirmed the fix it describes — and
   it is useful, but it is the author amending the checklist entry that
   indicts their own file. Kept as-is.

## Note for the next reviewer

Two things this diff makes newly checkable that nothing checks yet, both filed
by the author with honest "why it is not covered" sections:
`ISSUE_20260915_the_respine_is_unwitnessed_with_the_pane_scrolled_sideways.md`
(the pane's content width now changes mid-transition, so a clamped
`scrollLeft` is a new failure mode — the browser probe asserts
`scrollLeft === 0` as a precondition rather than covering it) and the no-fade
issue above. My should-fix shares the no-fade issue's mechanism; do them
together.

The lesson is unusually good on the *shape* of an in-flight assertion:
"strictly between the two endpoints" is the wrong shape, because the endpoints
are reachable and one of them is the continuity claim — pair against the
frame's own reported `t` instead. That generalises past this pane.

## Overlay

Added one entry to **Recurring bugs to check**: *a continuity guard that pairs
two SCALARS where the claim is about a PICTURE* — should-fix 1's general form.
Nothing pruned; no second-sighting edit owed (nit 3 is covered verbatim by the
existing entry).
