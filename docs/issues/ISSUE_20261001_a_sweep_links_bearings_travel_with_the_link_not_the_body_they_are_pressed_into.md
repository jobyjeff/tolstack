---
type: feature
priority: low
status: deferred
area: apps/annotate
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261001_kinematic_sweep_animation.md
class: sweep_artifact_body_part_grain
defer_until: class:sweep_artifact_body_part_grain
resolution: deferred 2026-10-01 (triage, second sweep) -- low, and the budget rule defers low by default. Grouped on its class so the set is judged together.
---

# In sweep mode a two-force member's bearings travel with the link, not with the body each is pressed into

Sweep mode (handoff `kinematic_sweep_animation`) anchors the pitch link's two
`MS14101-3` spherical bearings to the **link's** reconstructed pose, so both
balls travel with the link body. The handoff fenced this deliberately — *"the
bearings travel with the link for this handoff; whether a ball should instead
follow the body it is pressed into is noted in the lesson, not built"* — and
this is that note, filed so it survives the handoff reaching `completed/`.

## What is actually true of the hardware

A spherical bearing is a ball in a race. The **race** is pressed into the link
and travels with it; the **ball** is bolted to the part at the other end of the
joint and rotates relative to the race. The installed mesh
`asm217755_MS14101_3_9bfdb344` is both solids (2 solids, 2 instances under
`213862-002.1`), so today one rigid pose is applied to a thing that is two
rigid bodies with one degree of freedom between them.

## Why it does not matter yet, and when it would

Visually it is invisible at this scale: the ball's rotation inside its race is
a few degrees over the whole sweep and the two solids are concentric, so
nothing moves anywhere it should not be. It would start to matter if

- the surface ever drew the bearing *alone* at high zoom, where the ball
  visibly failing to stay square to its bolt would read as a solver error
  rather than a display simplification; or
- a reader used the animation to judge the bearing's **articulation angle**
  against its catalogue limit, which is a real question about this joint and
  the kind of thing an animated sweep invites.

## What it would take

The artifact does not carry a pose for the ball (it has no body for it —
`linkage` models the member as a distance constraint, by design:
`C:\workspace\linkage`'s `CLAUDE.md`). So either the producer grows a second
reconstructed pose per bearing, or the consumer derives the ball's pose from
the two bodies the joint connects. The second is cheaper and is a display
decision rather than a solver one, which is why this is `audience: strategy`
rather than a tactical fix: it is a question about what the surface is claiming,
not about a wrong number.

## Done when

`docs/ANNOTATION_SURFACE.md`'s "The two-force members" says which body each
solid of a spherical bearing follows and why, and the app does that — or the
simplification is stated there as a decision with its reason, and this issue
closes as `closed` rather than `resolved`.
