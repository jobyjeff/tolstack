# LESSONS 2026-09-15 — respine_tween_fidelity_round2

## The two routes in deliverable 1, and why I took both halves of one

The handoff offered a choice: *give rails and links a real opacity story*, or
*make the fractional outgoing frame the thing the incoming transition starts
from so the unfold argument actually holds from any frame*. The answer turned
out to be that those are not alternatives — they answer different questions,
and only one of them answers each.

**Rails do not need opacity at all, and this is provable rather than a
judgement.** A rail belongs to a column, and *every column both serialisations
have has a rail on both sides.* So the only rails a respine can add are ones on
columns it adds — exactly the set the unfold covers. Giving a rail an opacity
would have been building a mechanism for an empty set. The fix is the second
route, and it is small.

**Links are the opposite, and the unfold can never reach them.** A link belongs
to a *pair* of columns, and two serialisations can differ by a link on columns
they share — a loop closure in one and not the other, which is exactly what
`BRIEF_20260915_respine_scope_and_grid_motion` item 1 introduces. That link
arrives on rails that never move. There is nothing to hide it behind at any
`e`, from any outgoing frame. So links got the first route.

Both are one sentence each in the code now, and the asymmetry between them is
the thing worth remembering: *before reaching for an opacity, ask whether the
thing you are fading can differ between the two sides at all.*

## The measurement, before and after

Synthetic 10-column walk, 1-column chain, `VA.RAIL_METRICS`, straight off the
shipped functions — the issue's own numbers, reproduced exactly:

```
before the fix
  frame A (select walk -> chain, e = 0.5): rails [105]                            width 136
  frame B (interrupt: deselect, e = 0):    rails [15,15,15,15,15,25,45,65,85,105] width 136

after the fix
  frame A (select walk -> chain, e = 0.5): rails [105]                            width 136
  frame B (interrupt: deselect, e = 0):    rails [105,105,105,105,105,105,105,105,105,105] width 136
```

All ten of frame B's rails now land on top of the one rail frame A drew.

## What I changed my mind about mid-implementation: the clamp had to go

My first cut kept the existing shape — one decaying `columnShift` and a clamp,
`max(floor, column − columnShift)` — and merely moved the clamp's floor from 0
to the outgoing frame's own leftmost drawn index, decaying to 0. It reproduced
the measurement above correctly and **the existing monotonicity check caught
it**: `rail 0 went backwards at e = 0.25`.

It was right to. With a moving floor, each rail is the max of a *decreasing*
term (the floor sliding back to 0) and an *increasing* one (its own unfold), so
a rail in the middle traces a **V** — it slides left with the collapsed stack,
then peels off and travels right. Over 260ms that is a visible reversal, and
"a rail only ever moves one way" is the property that keeps an unfold from
reading as a wobble.

So `VA.drawnColumn` interpolates **per column** instead:

```js
(1 - t) * Math.max(floor, column - columnShift) + t * column
```

i.e. lerp between *where the outgoing frame drew that column's depth* and
*where the target draws it* — which is precisely what `VA.tweenPositions` does
for a row's y, one level down from the element the store keys on. Monotone by
construction. `columnShift` stopped decaying (the decay moved into the lerp),
which is the one API change a reader of the old code will trip on.

If you are tempted back toward the clamp: the property to check is not "does
e = 0 look right" — both versions do — it is **is each drawn x monotone in t**.

## The exact wording the three claims ended up with

1. `apps/viewer/views/topology.js`, `railsSvg` comment 1 — *"a column the
   transition is adding is drawn collapsed onto the **outgoing frame's
   leftmost rail** at e = 0 and unfolds out of it (`VA.respineX`, whose
   `floor` is that rail), so there is nothing to appear from nowhere — from a
   settled outgoing frame or from a transition frame alike. Every column both
   serialisations have has a rail on both sides, so those are the only rails a
   respine can add."*
2. `apps/viewer/README.md` — *"A surviving rail starts exactly where the
   outgoing frame drew it; a column the respine adds unfolds out of **the
   outgoing frame's leftmost rail** rather than arriving from a place it never
   was"*, followed by a paragraph saying what the old clamp-at-0 got wrong and
   why the spine-and-width guard could not see it, and a new bullet for the
   link case.
3. The third site was
   `ISSUE_20260915_a_rail_or_link_a_respine_adds_on_a_surviving_column_has_no_
   fade.md`'s own "Why it is not observable today". That issue is now closed by
   this work rather than re-worded — the fade exists — and its `low` priority
   is moot.

None of the three carries a "from a settled frame" qualifier, because the fix
removed the need for one. What *is* qualified now, and stated as such, is the
link claim: it is covered by an opacity, not by the unfold.

## Deliverable 3 answered its own question, and then some

**Did the `scrollLeft` clamp produce a visible jump on the real topology? No —
because the scroll is gone before the clamp can act.** Measured on the real
`pitch_system` at 1600×1000:

```
scrolled respine: scrollLeft 605 -> 0 -> 0 (pane content 1474 -> 1240px)
```

`VA.renderTopoPane` opens with `VA.clear(root)` and builds a fresh
`.tv__hscroll`, whose `scrollLeft` starts at 0. So a reader parked at the right
end is at the left edge on the **first frame**, and by the time the DAG shrinks
316 → 82px there is no scroll for the browser to clamp. This is not the
respine's doing — every render of this pane does it, density and length-mode
toggles included — which is why it is filed rather than fixed here
(`ISSUE_20260915_every_topology_pane_render_throws_away_the_readers_sideways_
scroll.md`). Fixing it has two non-obvious decisions in it: which renders
should keep the scroll (a topology switch plausibly should not), and what to do
about the ghost, whose own `.tv__hscroll` is `overflow: hidden` and would show
a different horizontal window of the same table during the cross-fade.

**The sticky-rails invariant is false past a point, and that was the surprise.**
`.tv__rails { position: sticky; left: 0 }` holds the DAG against the pane's
visible left edge — for the first 553px of a possible 605px of scroll. Past
that it slides off, 41.5px at the far end. A sticky box is bounded by its
*containing block*, which here is `.tv__body`, and `.tv__body` is the **pane's**
width (869px), not its content's (1474px): the grid table overflows out of
`.tv__rows` rather than widening the flex row. So the SVG can be pushed right by
at most `paneWidth − dagWidth`. Filed
(`ISSUE_20260915_the_sticky_rails_stop_sticking_once_the_grid_is_scrolled_past_
the_dags_own_width.md`); `topology.css` is not on this handoff's file list and
the fix reshapes the whole pane's layout.

`testRespine` asserts **both halves** of each finding — that the DAG is pinned
within the room it leaves, *and* that it is not past that; that `scrollLeft` is
0 in flight *and* settled — so fixing either issue turns a sub-check red and
forces the claim to be rewritten, rather than leaving a stale one standing.

## Things that cost me time, for the next agent

- **The fixture tier's `[real]` checks were red on arrival and are not yours.**
  `data/projections/viewer/` is shared by every worktree, and a concurrent
  session rebuilt it mid-run: `topology_fixtures.js has drifted … the
  projection writes [gaps]`, and `fixtures.js … writes [margin]`. Those two
  belong to `viewer_study_verdicts_and_gaps` and its neighbour. Run
  `node apps/viewer/run_tests.cjs` with **no** `--repo` to get a clean fast
  tier while you work, and only add `--repo` when you need the `[real]` arm.
  The mutation-witness runner is the trap: it requires a *green clean run*
  before it will call anything witnessed, so with `--repo` it reported my
  perfectly good entry as `NOT WITNESSED`.
- **The browser tier cannot start from a worktree** — `playwright-core` lives
  only in the main checkout's `node_modules/`, and `NODE_PATH` does not apply
  to ESM. `cmd /c mklink /J <worktree>\node_modules C:\workspace\tolstack\
  node_modules` fixes it; `node_modules/` is gitignored, so the junction dies
  with the worktree.
- **`expect_red` for a browser entry includes the `[real] ` prefix**, because
  it is copied off what the tier *prints*. A missing prefix reports
  `NOT WITNESSED — the tier went red, but not on the declared check`, with the
  declared and actual strings printed one above the other and looking
  identical.
- **`slotKey` joins with `|`, not `:`.** Two minutes lost writing an expected
  link key by hand.

## Still to do

Nothing from this handoff. Three issues are now open downstream of it: the two
above, and `ISSUE_20260915_respine_shows_the_chain_rather_than_recolumning_the_
whole_walk` — whose re-columned walk is what makes the synthetic link-fade
check's subject reachable in real data. When that lands, the synthetic pair in
`apps/viewer/tests.js` should be joined by a real one, not replaced by it: the
synthetic one is the only place the guarantee is stated independent of whatever
the corpus happens to contain.
