---
type: chore
priority: med
status: triaged
area: tests/browser
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261110_the_browser_tier_says_where_its_half_hour_goes.md
class: suite_over_budget
handoff: docs/sessions/HANDOFF_20261111_the_topology_real_loop_runs_on_one_origin.md
resolution: triage 2026-11-11 -- the origin call made in the handoff (loop stays on http), below the brief bar; the tier is over its 30-minute merge budget
---

# `topology http` re-runs the per-study `[real]` loop `topology file://` already ran

Measured 2026-11-10 (per-suite timing, lesson
`LESSONS_20261110_the_browser_tier_says_where_its_half_hour_goes.md`): `topology
file://` 394 s and `topology http` 378 s, 209 checks each — 28% of a 2,723 s tier.
A per-check gap profile of the file:// run shows most of it is the `[real]`
per-study loop (about 8 s per study click, no fixed sleep in it), which reads the
projection through `demoTopologyFixture` and so does not depend on the origin.
Running it on one origin would buy roughly 250-300 s per full run.

Not done in the handoff because it removes assertions from one origin's run, and
six witness specs name the suite `topology http` (they would need re-aiming to
`topology file://` in the same change). Same shape likely for the other pairs
(`deep links`, `app`, `index redirect`, `suite`), which are cheap (under 45 s
each pair) — the topology pair is the only one worth it. Decision for strategy:
split the origin-specific checks (script-tag load order, transport) from the
origin-independent ones and run the latter once.
