---
type: bug
priority: low
status: triaged
area: scripts/browser-tier
reporter: agent
class: guard_cannot_fail
found_by: docs/sessions/HANDOFF_20261021_browser_tiers_name_their_failure_instead_of_aborting.md
handoff: docs/sessions/HANDOFF_20261022_kinematic_citation_card_wiring_is_witnessed.md
---

# `hoverRailBar` throws, so a bar with no hit path aborts the topology suite instead of failing a check by name

Same shape as the five issues the handoff above fixed, at a site none of them
listed. `scripts/run_viewer_browser_tests.mjs`'s `hoverRailBar(page, id)` throws
`hovering the rail bar <id> never opened its card — <why>` when it cannot find
or hover `line.rail__barhit[data-id=…]`. That message is better than a bare
TypeError, but it is still an `ERROR`: the suite stops and the mutation tier
reads it as a MISS, not as a red.

Measured 2026-10-21 by planting a rename of the bar hit path's class in
`apps/viewer/views/topology.js` (`VA.svg("line", "rail__barhit",` and its
`base: "rail__barhit"`, both renamed together, since the hot machinery resets
`className` to `base`):

```
[topology file://] ABORTED after 44 sub-checks, 0 of them already FAILED
[topology file://] ERROR: hovering the rail bar base_thickness never opened its card — never found a point on the bar to aim at
```

Fix in the block's own idiom: have `hoverRailBar` return `false` (or a
reason string) and let each caller `push` that, stopping only the
sub-checks that need the open card. The hover block's `hitFor` guard (fixed
in that handoff) is unreachable through this plant until this is fixed: the
suite dies at sub-check 44 first.
