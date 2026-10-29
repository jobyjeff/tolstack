---
type: chore
priority: low
status: deferred
area: viewer/topology-projection
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261028_the_active_study_is_a_compact_band_and_the_rest_of_the_model_hangs_above_and_below.md
class: dead_code_after_refactor
defer_until: 2026-11-28
resolution: triage 2026-10-29: low, deferred by default (30 days)
---

# The per-study layout the builder emits has no reader, and the band makes it obsolete

`scripts/build_topology_projection.py` still writes each study's own one-rail
layout (`row["layout"]`, ~:1383, `serialize_chain`). No viewer code has read it
since 2026-09-15, and since 2026-10-28 the page lays a study out itself — the
band (`VA.bandLayout`, `apps/viewer/topology.js`), re-ordered from the whole
walk, which the per-study chain layout cannot express (a band can branch; the
chain is linear by construction).

Proposed: delete `serialize_chain` and the `layout` key on studies, with the
pytest pins that read them, and the README paragraph that says "`study.layout`
is still in the projection". Two readers to check first: `apps/annotate/` (did not
read it as of 2026-10-28, by grep) and the `smallest_chain` claim metric in
`tests/claims_registry.py` (re-derives from chains, not from `layout` — verify).
The browser respine suite picks its study with `s.layout` as a filter
(`testRespine`), which would need the filter dropped.
