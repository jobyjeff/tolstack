---
type: bug
priority: low
status: deferred
area: tests/browser-tier
reporter: agent
audience: tactical
class: flaky_check
found_by: docs/sessions/active/HANDOFF_20261108_the_scene_draws_the_model_alone_and_every_node_it_places_has_a_leader.md
defer_until: 2026-12-09
resolution: triage 2026-11-09 -- low, deferred by default; 30-day date
---

# The kinematic page's "View settings survive a reload" checks are intermittent

`scripts/run_viewer_browser_tests.mjs`, suite "kinematic study page (deep link,
chart hover, contributors, no projection)". Two sub-checks:

- `[real] picking a graph width in View widens the drawn DAG at once, and the width survives a reload`
- `[real] colouring by body puts the overlay's ink on the DAG's bars, and the choice survives a reload`

On 2026-11-08/09 they failed together on 3 of 9 `--only "kinematic study page"`
runs (plus one full-tier run). When they fail the log reads `DAG width narrow
420, wide 706, after a reload 420`: the reload draws the default width. On the
other runs the same tree passed 27/27, with the reload at 706.

Why it's not that handoff's change: the failing runs carried that branch's
`apps/annotate/` files. But the suite's page never loads the 3D pane (no child
frame navigates, per a `framenavigated` log), `topology.html` includes no
annotate script, and the branch's one viewer file (`apps/viewer/topology.js`)
passed by itself. Two instrumented runs showed the store holding
`graphWidth: "wide"` before and after the reboot, and only the viewer's
`onDagView` writing it. Both of those runs passed, so a failing run has not
been observed with the instrumentation in. The likely cause, unconfirmed, is
an early read rather than a lost write: `reboot()` waits for
`svg.tv__rails` plus 600 ms, and the page's own `load`-time boot draws once
before the test's `VA.bootTopology()` re-boot with the fake adapter.

Suggested fix: after `reboot()`, wait for the drawn width to match
`readDagView`'s value (or for `lastTopoRender` from the second boot), rather
than a fixed delay.
