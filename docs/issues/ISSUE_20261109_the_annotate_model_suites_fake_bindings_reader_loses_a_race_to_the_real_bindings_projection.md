---
type: bug
priority: med
status: deferred
area: tests/browser-tier
reporter: agent
class: flaky_check
found_by: docs/sessions/active/HANDOFF_20261108_the_scene_draws_the_model_alone_and_every_node_it_places_has_a_leader.md
defer_until: 2026-11-23
resolution: triage 2026-11-09 -- med beyond budget; 14-day date
---

# The "annotate model in the scene" suite's fake bindings reader can lose a race to the real bindings projection

`scripts/run_viewer_browser_tests.mjs`, suite "annotate model in the scene
(anchors, lines, the sweep, the anchors message)". It calls
`installRealAnnotatorReads(page, { …, binding: "window" })`, which swaps the
pane's `readFeatureIdentityProjection` for a stub **from a 1 ms
`setInterval`** (`const timer = setInterval(() => { if (install())
clearInterval(timer); }, 1)`). If the pane reads the projection before the
interval fires, it gets the real `data/projections/feature-identity/bindings.json`.

Until 2026-11-08 that was harmless, because the file held proposals only. It
was rebuilt at 2026-11-08 18:43 with Jeff's accepted events folded, so a lost
race now puts real `bound` anchors into a check that says "no binding in the
inbox".

Measured during the review of
`the_scene_draws_the_model_alone_and_every_node_it_places_has_a_leader`
(2026-11-09), with the same tree and `--repo C:/workspace/tolstack` both times:

- The first run went **17/22**, while a 105 s pytest subset was running
  alongside it. The log reads `anchors by source: bound 4, section 58, joint 4,
  origin 13` and `the shell's lit set: - edges`. Five sub-checks fail: "with no
  binding in the inbox, no anchor is a bound face's…", both "embedded on the
  kinematic page…" checks, "a synthetic binding moves exactly one node…" and
  "bind mode draws the whole model at the as-modelled pose…".
- The same suite run alone straight after went **22/22** (`section 62, joint 4,
  origin 13`, `lit set: 22 edges`). Pristine `integration` (via `git archive`)
  also went 22/22.

The race is the likely cause, not a proven one. Nothing else in the suite's
setup puts four `bound` anchors in before the synthetic-binding check runs.
The real projection's accepted v1 bindings (the two link lengths, the plate
slide and the spindle coaxiality) are the obvious source. No run has caught
the read order directly.

Suggested fix: install the stub before the pane's code can read, for example
with an `addInitScript` that defines the reader up front or a route that serves
the stubbed projection, rather than polling for the API object. Then the
check's premise ("no binding in the inbox") holds by construction, not by
winning the race.
