---
type: feature
priority: low
status: deferred
area: viewer/topology
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261029_the_rearrange_animates_and_centres_the_active_study.md
class: unmeasured_cost
defer_until: 2026-11-29
resolution: triage 2026-10-30: low, deferred by default to a date (class has no program)
---

# The respine tween rebuilds the whole pane on every frame

`VA.animateTopoPane` calls `renderTopoPane` per frame, which clears and redraws
the pane. Measured by the browser tier on the demo topology (a MutationObserver
over `#topopane` across one study change): every one of the 29 node/edge/leader
ids removed during the transition was also re-added. The handoff
`the_rearrange_animates_and_centres_the_active_study` asked for "no element
removed and re-added with the same id"; meeting it needs a keyed in-place patch
of the rails SVG and grid, a rewrite of the renderer, not a change to the
tween. Visually the transition tweens and fades (no blink), so this is about
cost and about a check the handoff wanted, not a visible defect.

Options: (a) keyed patch renderer; (b) drop the requirement. Recommend (b)
unless frame cost shows up on the large real topology.

## Addendum 2026-10-29 (review round 1)

Jeff chose option (b) for this handoff: the requirement is amended to "nothing
blinks". The browser tier now asserts that every animation frame of a study
change has the DAG drawn (dots and bars on screen, never an emptied pane), with
a mutation spec that reddens it. The per-frame rebuild itself (all churned ids)
stays; patching in place remains open here for strategy (it needs the hover
registries and handlers, which hold element refs, reworked).

## Addendum 2026-11-02 (review of `the_browser_tier_is_green_on_trunk_again`)

The condition the recommendation above names — "unless frame cost shows up on the
large real topology" — has now been measured. That handoff traced one study click
on the product graph (`vpa_pitch_linkage`, 106 walk rows) by wrapping
`VA.animateTopoPane` / `VA.renderTopoPane` in the page: each tween frame took
**0.1–1.2 s** on this workstation, against a 260 ms `VA.RESPINE.duration`. So in
the shipped transition a reader sees frame 1 (t ≈ 0) and then the settled frame —
the animation exists, but on the real graph it is close to a repaint with a
cross-fade start. Caveat: the box was loaded at the time (other agents' runs), so
treat the range as an upper envelope rather than a profile. The browser check that
witnesses "a study click animates" was made immune to this on that branch, so
nothing in the suite will now notice if frame cost grows further. Source:
`docs/sessions/lessons/LESSONS_20261102_the_browser_tier_is_green_on_trunk_again.md`.
