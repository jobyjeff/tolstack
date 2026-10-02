---
type: chore
priority: low
status: deferred
area: apps/annotate
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20261001_kinematic_sweep_animation.md
class: one_solid_drawn_twice
defer_until: class:one_solid_drawn_twice
resolution: deferred 2026-10-01 (triage, second sweep) -- low, and the budget rule defers low by default. Grouped on its class so the set is judged together.
---

# Sweep mode draws the pitch-link assembly and, on top of it, the two bearings that assembly already contains

Measured, not inferred — `node apps/annotate/run_browser_check.mjs --real
vpa-pitch-p1-20261001-203656` prints both placements:

```
pitch_link / pitch_link: matched -> 213862-002.1 @0.0001 mm
pitch_link / spherical_bearing_pitch_link:
  matched -> …/213862-002.1/MS14101-3.2 @0.0001 mm
          + …/213862-002.1/MS14101-3.1 @0.0007 mm
```

`asm217755_213862_002`'s own `provenance.json` records
`product_is_assembly: true`, `n_solids: 5`, `n_leaf_descendants: 3` — the body
`213861-002` plus the two `MS14101-3` bearings, which is what `213862-002 A`'s
parts list says it is. The `spherical_bearing_pitch_link` row then places the
same two bearings again, at their own occurrences *under* `213862-002.1` — so
the two draws are coincident by construction, not merely near each other. Two
costs: the bearing surfaces z-fight (both are translucent by default, so it
shows as a mottle rather than a flicker), and the bearings are drawn twice at
whatever tessellation the store holds.

Nothing here is wrong about the kinematics and no number on the bar is
affected. It falls out of two correct decisions meeting: Jeff's 2026-10-01
ruling named `asm217755_213862_002` (the **assembly**) for the `pitch_link`
alias row, while `docs/topologies/topology_vpa_pitch_linkage.json` separately
declares `spherical_bearing_pitch_link` as a part of the same body, and sweep
mode draws every part a body carries.
`ISSUE_20260930_four_pitch_linkage_alias_rows_wait_on_rotorkits_extraction.md`
anticipated exactly this question from the other direction ("`pitch_link` is
the *assembly* `213862-002` and the mesh will be the *body* `213861-002` …
Decide it explicitly in the evidence string") and the row's evidence does not
answer it.

## Done when

One of three, decided rather than defaulted: the alias row points at
`asm217755_213861_002` (the body, which **is** installed, four instances); or
sweep mode skips a part whose occurrence is a descendant of an occurrence it
is already drawing; or the row's evidence string says the overlap is accepted
and why. Whichever way it goes, the `pitch_link` row's evidence answers the
assembly-or-detail question in words, the way `pitch_plate_215177_001`'s row
already does.
