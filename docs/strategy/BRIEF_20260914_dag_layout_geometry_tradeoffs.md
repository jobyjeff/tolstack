# BRIEF 2026-09-14 — the DAG spine layout's three unresolved geometry trade-offs

> Routed here by the triage sweep of 2026-09-14/15, which found three open issues
> that are one design conversation: every one is a direct consequence of
> `viewer_dag_spine_layout` (2026-09-14), every one is fenced off tactical work by
> `DAG_TOPOLOGY.md`'s "not a solver" rule and `apps/viewer/README.md`'s
> no-heuristic-root rule, and each issue says in its own words that it needs Jeff.
> Decompose into handoffs after the calls are made — do not let a tactical agent
> pick any of these three on its own.

Source issues:
- `docs/issues/ISSUE_20260914_leaders_cross_each_other_since_the_grid_was_centred.md` (**high**, bug)
- `docs/issues/ISSUE_20260914_branch_leaders_still_cross_the_rails_right_of_them.md` (med, feature)
- `docs/issues/ISSUE_20260914_scaled_length_modes_collapse_on_a_tall_dag.md` (med, feature)

## Why these are one brief

All three are the layout's competing constraints pulling against each other on
the same topology — `pitch_system`, the one Jeff reviews. Deciding any one in
isolation moves the others: re-packing columns to reduce rail crossings changes
which leaders descend, and changing the vertical fit changes the row pitch every
crossing count is measured against. Whoever decomposes this should produce
handoffs that are sequenced, not parallel.

## 1. Leaders now cross each other — 16 times on `pitch_system` (high)

This is the sharpest of the three because **a stated invariant in the code is now
false.** `apps/viewer/topology.js`'s `VA.leaderGeometry` allocates lanes strictly
monotonically in walk order, and the file states in as many words that leaders
therefore cannot cross:

> Lanes are strictly monotone in walk order. Leaders never cross under that rule
> (both endpoint sequences are monotone in y) …

That proof was sound when written and rested on a premise
`LESSONS_20260910_viewer_leader_line_grid.md` records explicitly: *"Leaders
always **rise** left-to-right (`y2 < y1` structurally)."* Since
`viewer_dag_spine_layout` centred the grid block against the DAG, **a leader
above the centre descends** — that handoff's own lesson says so, and the browser
tier was changed to stop reading a leader's ends off its bounding box because of
it.

Once a leader may descend, two leaders cross exactly when `y2[i] >= y1[i+1]`:
leader *i*'s vertical run passes through leader *i+1*'s horizontal run, because
every later leader's lane is to the right of lane *i* and every node's x is to
the left of the jog zone.

The issue carries a pure `node -e` repro (no browser) against the live
`topologies.json`. This is very probably a large part of what Jeff meant by the
leaders being "near impossible to follow".

**No-regrets item, independent of whichever policy wins:** the monotone-lane
proof comment in `topology.js` is currently false and will mislead the next
reader. Correcting the comment to state the premise it depended on, and that the
premise no longer holds, is safe to do in the first decomposed handoff regardless
of the design outcome. Do not let it wait on the policy decision.

## 2. Right-justifying the spine moved the crossings rather than removing them (med)

The mirror was asked for so that "leader-vs-rail crossings drop sharply", and on
four of the five committed topologies they drop to **zero**. On `pitch_system`
the total moves only **47 → 43**, and the reason is structural:

```
              as projected   right-justified
  spine leaders      43            0
  branch leaders      4           43
```

**A mirror is a bijection on column indices, so it cannot reduce the total** —
for each leader it swaps "rails to my right" for "rails to my left". It picks the
better half, which is a big win where one side is empty and a wash on a mechanism
with five forks.

The mirror is still the right call and is shipped: the spine is 21 of
`pitch_system`'s 45 rows and it is what a reviewer follows. The question is
what, if anything, removes the remaining 43. The issue's leading candidate:

- **Re-pack the columns** so a branch's distance from the grid tracks how many
  leaders it carries, rather than its allocation order. Cheap to compute — but
  it makes column order *a heuristic about leaders rather than a fact about the
  walk*, which is exactly what the no-heuristic rule exists to prevent. That
  tension is the decision, and it is Jeff's.

## 3. Fitting the DAG to the window makes the scaled length modes say nothing (med)

`pitch_system` serialises to 45 layout rows. At comfortable density every node
row is 26px and no edge may be drawn shorter than one row (the floor keeps
whole-edge hover clickable), so **the shortest this DAG can ever be drawn is
1170px** — past any ordinary window. The viewport fit hands `tolerance width` a
budget it cannot meet, gives up the proportion (never the floor), and every bar
comes out one row tall wearing its break mark. So `tolerance width` and `uniform`
render identically, and the tolerance bands the mode exists to show (0.03 … 0.2)
are invisible.

This is not a regression so much as the other end of the same trade: before the
fit, the same view was 3325px tall, which is what Jeff called "impossible to make
sense of".

**Compact density is an escape hatch that already exists and says nothing about
itself**: at 16px rows the floor minimum is 720px against the same 782px budget,
so the whole DAG fits one window and `tolerance width` lands on the budget with
**13 of its 24 edges in true proportion** (11 still on the floor).

Options from the issue, none obviously right:

- **Say nothing, let the reader find compact.** Cheapest; also the one thing
  Jeff's web-UI rules argue against — a feature that silently does nothing.
- **Auto-pick density from the fit.** One control doing two jobs, and it moves a
  deliberate preference behind the user's back.
- **Let the floor scale below one row when the alternative is a collapsed
  scale**, keeping the hit target clickable another way (a wider invisible hit
  line is already how the bars work). The only option that shows real proportions
  for a 24-edge DAG in one window — and it retires a landed contract ("nothing
  renders shorter than one row height") to do it.
- **Offer the fit as a choice** beside the length mode, off meaning today's 6-row
  cap and a page that scrolls.

## What is deliberately not in this brief

`ISSUE_20260915_a_respine_cannot_interpolate_x_so_the_whole_block_slides` and
`ISSUE_20260915_a_settled_tween_store_is_not_the_target_store...` are concrete
defects in the shipped tween machinery, routed to
`HANDOFF_20260915_respine_tween_fidelity` and being fixed independently of any
decision here. `BRIEF_20260915_respine_scope_and_grid_motion` owns what a respine
should *mean*. Coordinate with that brief if a column-repacking decision here
would change what a respine re-columns.

## 2026-09-16 triage sweep — item 2 also decides whether the per-element respine fade is live machinery or dead code

Source issue:
`docs/issues/ISSUE_20260915_the_per_element_respine_fade_is_no_longer_reachable_from_the_page.md`
(chore, low, `audience: strategy`), filed off
`docs/sessions/HANDOFF_20260915_viewer_respine_whole_walk.md`.

**Why it is here and not in `BRIEF_20260915_respine_scope_and_grid_motion`.**
That brief is partially consumed, and its marker leaves open only its item 2 —
whether the grid's fixed row pitch may become dynamic, and what a leader's
grid-side seam points at mid-flight. The fade question is not inside that
remainder: it is about **DAG-element alpha**, which respine item 1's landed
decision (the DAG is always the topology's own walk) is exactly what made
unreachable. The lever that decides it is **this** brief's item 2, column
re-packing. Recorded here so the re-packing call is made knowing its second
consequence — it adds no constraint to that call, and it is not a reason to
decide item 2 either way.

**The measurement.** `viewer_respine_whole_walk` made both sides of every
respine the same serialisation, so `VA.rowPositions` produces the same key set
on both sides, `VA.tweenPositions`' `leaving` / `out.alpha` maps come out empty
at every `e`, and `VA.tweenAlpha` (`apps/viewer/topology.js:1148`) answers `1`
for everything the view asks about. Measured in the issue across all five
committed topologies × 21 studies: node keys, edge keys and every node's `y` are
identical between the deselected walk and each study's emphasized frame; only
`gridOffset` and the pane width differ.

What that leaves in the tree, all of it retained by that session:

- `VA.tweenPositions`' entering/leaving arms and `out.alpha` — pure, unit
  tested, not reached by the app;
- `renderTopoPane`'s local `fade()` (`apps/viewer/views/topology.js:243`) and
  its **seven** call sites — leader path, leader hit-path, bar, break mark, bar
  hit-line, node dot, and the grid's edge row — reached every frame and always
  a no-op (the source issue describes these as "two call sites (rail marks,
  grid rows)", which is the two groups, not the site count);
- the render-level test "an element the transition ADDS fades in at its own
  settled position", re-based by that session onto a synthetic outgoing store
  (the study's own `study.layout`, which the page no longer draws) and labelled
  as such.

**The question item 2's decider inherits.** Column re-packing is precisely the
change that would make a respine add or drop a DAG element again, which is the
only thing that puts `out.alpha` back on screen. So:

- if re-packing (or anything else that re-columns on selection) is greenlit,
  the machinery is about to be needed and keeping it is cheap insurance;
- if item 2 settles on "column order stays a fact about the walk", full stop,
  then the fade is machinery whose comment describes a transition that cannot
  happen — the `LESSONS_20260915_surfaces_that_state_something_false` shape — and
  retiring it (`alpha` out of the store, `VA.tweenAlpha`, `fade()`, the
  synthetic test) is smaller and truer to what the page does, at the price of
  having to rebuild it correctly the day a layout change re-introduces the case.

Either answer is a one-line consequence of item 2; neither needs its own
session slot, and neither should be picked by a tactical agent ahead of item 2.

---

## 2026-09-18 triage sweep — item 4, absorbed from the respine brief: may the grid's row pitch become dynamic?

`BRIEF_20260915_respine_scope_and_grid_motion.md` is merged into this brief and
retired. Its item 1 was decided by Jeff on 2026-09-15 (a respine is
emphasis-in-place on the whole walk, **no re-columning**) and landed as
`HANDOFF_20260915_viewer_respine_whole_walk.md`. Its item 2 never was: that
brief's own marker sequences the remainder behind this one — *"re-decide it
against the new whole-walk-DAG + chain-subset-grid semantics, after the geometry
brief"* — and this brief's item 2 already absorbed the fade half of it. Two files
for one sequenced conversation was the filing, not the substance.

**The question, unchanged and undecided:** the grid's row pitch is fixed at
`rowHeight`; only the *block's* `gridOffset` tweens. That is the landed
`viewer_dag_spine_layout` contract — *"the block moves, the pitch does not"* —
and it is what the leaders' grid-side seams are computed from
(`gridOffset + boundary × rowHeight`). So a FLIP-style per-row transition is not
"add FLIP"; it is **may the pitch become dynamic, and what does a leader point
at mid-flight while its grid-side row is in motion?**

**What `viewer_respine_whole_walk` changed about the premise, and why it matters
here.** The surviving-row set is now a walk-order *subset of the same table*
rather than a different table, so every surviving row keeps its relative order
and only its index changes — a FLIP is at last arithmetically possible. But
`boundary` is now an index into the **subset**, which is exactly the seam
arithmetic this item has to answer for.

**Why it belongs to this brief rather than its own.** It moves the same two
variables items 2 and 3 move — vertical budget and leader-seam geometry — so
deciding it apart from them would be deciding one of this brief's own variables
twice. Item 2's re-packing call in particular changes what a row's post-transition
index even means.

**Measured, so nobody re-discovers it:** the cross-fade shipped *because* the
line-up was tried and failed. A chain's grid rows are a different subset of the
edges, in a different order, at a different count; drawn solid over each other at
`e = 0` they read as garbled text. That was the first cut, and the screenshot is
why the shipped version is a cross-fade. Recorded in `apps/viewer/README.md`.

Source issue, carried over: `docs/issues/ISSUE_20260915_the_grid_cross_fades_through_a_respine_instead_of_moving_its_rows.md` (low, feature).

Out of scope here, as it was there: the two shipped-tween defects routed to
`HANDOFF_20260915_respine_tween_fidelity` (x-interpolation, settled-store keys).
They are bugs in the animation as built, not questions about what it should do.
