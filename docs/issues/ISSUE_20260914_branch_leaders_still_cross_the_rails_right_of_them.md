---
type: feature
priority: med
status: triaged
area: viewer/topology-layout
audience: strategy
reporter: agent
strategy: docs/strategy/BRIEF_20260914_dag_layout_geometry_tradeoffs.md
---

# Right-justifying the spine moves the leader crossings onto the branch leaders instead of removing them

Measured while building `viewer_dag_spine_layout` (2026-09-14). The handoff
asked for the mainline on the rightmost rail so that "leader-vs-rail crossings
drop sharply", and on four of the five committed topologies they drop to
**zero**. On `pitch_system` — the one Jeff reviews — the total only moves
**47 → 43**, and the structure of why is worth a design decision rather than
another tactical patch.

## What the numbers actually say

A leader crosses every rail standing between its node's dot and its lane. With
the spine on the **left** (as the projection allocates it), the eight spine
leaders crossed 4–7 rails each (43 of the 47); the eight branch leaders crossed
4 between them. Mirrored, that inverts exactly: the spine's eight cross
**zero**, and the branch leaders now cross the rails to *their* right — the
spine itself plus the two long early-branch rails, which run nearly the whole
diagram — for 43.

```
              as projected   right-justified
  spine leaders      43            0
  branch leaders      4           43
```

A mirror is a bijection on column indices, so it cannot reduce the total: for
each leader it swaps "rails to my right" for "rails to my left". It picks the
better half, and the better half is a big win wherever one side is empty (the
four single-spine topologies) and a wash on a mechanism with five forks.

Qualitatively the mirror is still the right call and is shipped: the spine is
21 of `pitch_system`'s 45 rows, it is what a reviewer follows, and it now runs
straight into the grid.

## What would actually remove the rest

Each of these is a layout-policy change, not a display mirror, and
`DAG_TOPOLOGY.md`'s "not a solver" fence plus the standing "no heuristic root"
rule (`apps/viewer/README.md`, "The rails") mean none of them should be picked
up without Jeff:

- **Re-pack the columns** so that a branch's distance from the grid tracks how
  many leaders it carries, instead of its allocation order. Cheap to compute,
  but it makes column order a heuristic about leaders rather than a fact about
  the walk — which is exactly what the no-heuristic rule exists to prevent.
- **Route a leader around the rails** (a dogleg down into the gap below a
  rail's end before turning out) instead of straight across them. Keeps the
  layout honest, costs jog-zone width and the monotone-lane no-crossing proof
  needs redoing.
- **Break the rails visually where a leader crosses** (the drafting convention:
  the line that hops is the one that yields). Purely cosmetic, no layout claim
  at all, and probably the cheapest thing that makes the picture readable —
  `viewer_leader_grid_legibility` owns leader styling and could carry it.
- **Accept it**: a branch's leader crossing the spine is arguably readable
  because the spine is one continuous line a reader learns to see through.

## Repro

```
node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack
```

`[real] right-justifying pitch_system takes its spine leaders off every branch
rail they used to cross` pins the spine half of the table above (43 → 0) and
asserts only that the total improves, deliberately leaving the branch-side
number unpinned so a future policy change is free to move it.
