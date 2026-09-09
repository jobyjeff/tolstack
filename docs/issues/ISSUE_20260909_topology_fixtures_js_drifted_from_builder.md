---
type: bug
priority: med
status: resolved
area: apps/viewer/topology_fixtures.js
reporter: agent
handoff: docs/sessions/HANDOFF_20260909_tolstack_viewer_js_suite_drift.md
resolution: handoff completed 2026-09-09 -- closed automatically by dispatch when handoff `tolstack_viewer_js_suite_drift` moved to completed/; not independently verified.
---

# `topology_fixtures.js` has drifted from `build_topology_projection.py`'s current output shape

`tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green` fails on the
`[real] every fixture shape still matches the builder's` (also seen worded
`the topology fixture's shapes still match the builder's`) assertion:

```
topology_fixtures.js has drifted from the builder: [
  "topologies[]: the projection writes [joint, worksheet_file, worksheet_source]
   and apps/viewer/topology_fixtures.js does not -- REGENERATE it (its header
   says how)",
  "topologies[].studies[]: the projection writes [configuration] and
   apps/viewer/topology_fixtures.js does not -- REGENERATE it (its header
   says how)"
] !== []
```

Confirmed **pre-existing on `master`** as of 2026-09-09, independent of
triage's session-start batch-merge (integration -> master): reproduces on
master alone, before any merge, with the same diff (`joint`,
`worksheet_file`, `worksheet_source`, `configuration` keys the live
projection now writes that the hand-maintained fixture mirror doesn't).

Fix is not a trivial find/replace: `apps/viewer/topology_fixtures.js`'s own
header (top of file) says every number in it "came out of the real builder"
via running `scripts/build_topology_projection.py`'s `project_topology()`
over the demo documents and **pasting** the result, then patching the three
`crop_key` values back in by hand afterward (the demo mechanism has no real
stack behind it, so those are deliberately not builder output). That
patch-after-paste step is exactly the kind of thing that should route through
a tactical handoff and review cycle rather than an inline triage fix.

Routed to `docs/sessions/HANDOFF_20260909_tolstack_viewer_js_suite_drift.md`.
