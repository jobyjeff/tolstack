---
priority: med
depends_on: []
model: sonnet
---

# HANDOFF 2026-10-01 — the_sweep_frame_loop_does_only_per_frame_work: decouple playback rate from the frame clock, and stop re-applying unchanged state every frame

Source: two issues filed 2026-10-01, merged to trunk in that day's triage batch
merge —
`ISSUE_20261001_reduced_motion_playback_advances_one_point_per_animation_frame_so_it_ignores_the_speed_control.md`
and
`ISSUE_20261001_sweep_mode_reapplies_every_anchored_parts_material_state_on_every_animation_frame.md`.
Baseline: tolstack trunk at `61ee193`. Scope: `apps/annotate/app.js`,
`apps/annotate/scene.js` and `apps/annotate/run_tests.cjs`; do NOT touch
`data/meshes/` or `docs/topologies/part_mesh_aliases.json` (owned by the
parallel staged handoff `mesh_store_reconciled_to_the_pure_signature`).

**These are staged as one handoff because they are the same loop.** Both defects
live in `apps/annotate/app.js`'s per-`requestAnimationFrame` sweep path —
`tickSweep` and `applySweepFrame` — and two sessions editing that loop in
parallel would conflict on every hunk. They are two distinct defects, not one;
the shared surface is the reason for the pairing, and the deliverables stay
separate.

## Defect 1 — playback rate is bound to the frame clock

Under `prefers-reduced-motion`, `tickSweep` advances **one point per animation
frame**, so playback runs at whatever rate the display happens to give — 60 Hz,
120 Hz, or a throttled background tab — and **the speed control does nothing**.
A rate that is correct only on the machine it was written on is the class here.

The fix direction to investigate: drive the advance from elapsed wall-clock
time against the declared speed, so the same playback takes the same real time
on any display. Note this is a behaviour change for the reduced-motion path
specifically — say in the lesson what reduced motion *should* mean here, since
"advance discretely" and "advance slowly" are different accommodations and the
issue's own framing does not settle which was intended.

## Defect 2 — unchanged state is re-applied every frame

`applySweepFrame` re-applies **every anchored part's material and ghost state on
every frame**, and with the ghost layer on it **reallocates a mesh and a
material per part per frame**. In three.js that bumps the material version and
forces re-upload, so the cost is not merely redundant assignment.

The fix direction: track what each part's state currently is and apply only
transitions. The allocation half is the sharper edge — a per-frame `new` per
part is a garbage-collection load that grows with assembly size, so a fixed set
of reused materials (or a cache keyed on the state) is likely the shape, but
measure before and after rather than asserting the improvement.

## Deliverables

1. **Decouple the advance from the frame rate** (defect 1), including the
   reduced-motion path, and make the speed control actually govern it.
2. **Apply only state transitions, and stop per-frame allocation** (defect 2),
   with the ghost layer on and off.
3. **Guard both at the level they failed.** The issue notes the primitives are
   tested in `apps/annotate/run_tests.cjs` but their **composition lives in
   `app.js`** and is not — which is precisely why both defects survived. A test
   that only re-proves the primitives would not have caught either one. Name in
   the lesson what you made testable and how, and if the composition genuinely
   cannot be driven from `run_tests.cjs` today, say that plainly rather than
   adding a test that passes for the wrong reason.

## Definition of done

- Playback of the same sweep takes the same wall-clock time at two different
  frame rates (a throttled tab is the cheap way to demonstrate it), and the
  speed control changes it — measured, quoted in the lesson.
- No per-frame allocation per part in `applySweepFrame` with the ghost layer
  on; before/after numbers in the lesson.
- A test fails if either regression is reintroduced, or an explicit written
  statement of why the composition is not reachable from the harness.
- Full suite green with the `[real]` tier armed (`1445 passed` was the
  2026-10-01 armed baseline). **A `[real]` failure in an unarmed candidate is
  not a real red** — see
  `dispatch/docs/issues/ISSUE_20261001_bridge_test_inputs_cannot_arm_a_directory_that_carries_a_tracked_placeholder.md`.
- Lesson (`docs/sessions/lessons/LESSONS_<YYYYMMDD>_the_sweep_frame_loop_does_only_per_frame_work.md`):
  what reduced motion was decided to mean here, and whether any other
  `requestAnimationFrame` path in `apps/annotate` has either shape — the two
  classes (`a_rate_bound_to_the_frame_clock`, `per_frame_work_that_is_not_per_frame`)
  are both likely to have more members than the two filed.
