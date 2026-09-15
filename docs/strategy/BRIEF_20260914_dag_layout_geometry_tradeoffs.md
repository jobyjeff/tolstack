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
