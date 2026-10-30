---
type: feature
priority: low
status: open
area: viewer/topology
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261029_the_rearrange_animates_and_centres_the_active_study.md
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
