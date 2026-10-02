---
type: feature
priority: low
status: deferred
area: linkage/artifact
reporter: agent
found_by: docs/sessions/HANDOFF_20261001_kinematic_sweep_animation.md
class: sweep_artifact_body_part_grain
defer_until: class:sweep_artifact_body_part_grain
resolution: deferred 2026-10-01 (triage, second sweep) -- low, and the budget rule defers low by default. Grouped on its class so the set is judged together.
---

# `linkage-sweep/v1` says which parts a body carries, but not which joint ends ride on it

**For the `linkage` repo**, filed here because an issue written into another
repo's checkout lands as uncommitted dirt in somebody else's `git status`.
`found_by` points at the tolstack handoff that found it; triage routes it.

## What the consumer needed and did not have

`apps/annotate/`'s sweep mode (handoff `kinematic_sweep_animation`) draws a
frame on each rigid body, and has to put it somewhere that means something. The
artifact gives it:

* `bodies[]` — `name`, `ground`, and the **tolstack part ids** the body carries;
* `points[i].poses[<body>]` — the body's pose;
* `points[i].joints[<joint>]` — `point_a_world`, `point_b_world`, `axis_world`.

What it does **not** give is the edge between those last two: which joint end
belongs to which body. So the consumer measures it —
`AA.sweepBodyJoints` tries each body's pose against each joint end's
as-modelled point at three sampled instants and keeps the body whose pose
reproduces it. That works, is pinned value-level over both published runs
(worst disagreement 4e-11 mm across all 80 points of each), and is arguably
better than a declaration because it is checked rather than trusted.

## Two things that cost real time, and are the actual ask

1. **Both ends have to be tried separately, and nothing says so.** A joint
   between ground and a body has a stationary ground-side end. A body rotating
   about the assembly origin reproduces the origin. So an `a`-end-only reading
   handed run P1's `plate_slide` and `actuator` — the pitch plate's two joints
   — to the **blade**, silently and plausibly. Nothing in the artifact or its
   `frame` statement warns a consumer that `point_a_world` is not "the body
   side".

2. **The joint's own KIND is not in the file.** `links[]` says which joints
   are distance constraints and `axis_world` is present or null, and a consumer
   can derive three classes from that pair — which is what this one does. But
   `plate_slide` and `actuator` are a prismatic joint and a driver and read
   identically from outside; they are drawn with the same bead and the tooltip
   can only say "turns or slides about one axis" for both.

## What would help, in order of cheapness

* **A sentence in the `frame` statement** saying that a joint's `a` and `b`
  ends belong to the two bodies the joint connects, in the order the mechanism
  declares them, and that either may be ground. That costs nothing and removes
  the trap in (1).
* **`joints[<joint>].bodies: [<name>, <name>]`** — the pair, per joint,
  matching the `a`/`b` order. Additive, and it turns a measurement into a
  cross-check (the consumer can keep measuring and compare).
* **`joints[<joint>].kind`** — the solver already knows; the consumer can only
  guess at it.

None of this is urgent: the consumer works today and its derivation is pinned.
It is filed because the next consumer will re-derive all of it, and because the
`a`-end trap cost one real debugging pass on real data.

## Done when

`linkage`'s `ARCHITECTURE.md` artifact paragraph says what the `a` and `b` ends
of a joint mean with respect to bodies and ground — or the two additive fields
exist and `linkage-sweep` documents them.
