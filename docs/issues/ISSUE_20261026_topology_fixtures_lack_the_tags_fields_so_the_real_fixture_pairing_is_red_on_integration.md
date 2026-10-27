---
type: bug
priority: high
status: open
area: apps/viewer/topology_fixtures.js
reporter: agent
class: fixture_drift
found_by: docs/sessions/active/HANDOFF_20261026_the_kinematic_page_keeps_the_dag_and_says_each_contributor_once.md
---

# The topology fixture lacks `variant_axis` and study `tags`, so the `[real]` fixture pairing is red on integration

`bodies_and_studies_carry_forge_tags` (landed on `integration` at `39f1843f`,
2026-10-26) made `scripts/build_topology_projection.py` write a top-level
`variant_axis` and a `tags` object on every study, and did not regenerate
`apps/viewer/topology_fixtures.js`. On any projection built from that tree the
viewer's fast tier reads:

> FAIL  [real] the topology fixture's shapes still match the builder's
>   topologies (top level): the projection writes [variant_axis] and
>   apps/viewer/topology_fixtures.js does not — REGENERATE it
>   topologies[].studies[]: the projection writes [tags] and ... does not

Measured by the review of `the_kinematic_page_keeps_the_dag_and_says_each_contributor_once`
on its merged tree (`node apps/viewer/run_tests.cjs --repo <scratch root>`,
projections rebuilt from the merge): 565/566. The same branch before
`integration` moved was 563/563, and no file that branch touched writes
either field; `integration`'s `topology_fixtures.js` has neither word. The
tags review ran `run_tests.cjs` with its `[real]` tier skipped (454/454, "no
projection in a worktree"), which is how it got through.

Fix: regenerate the fixture the way its header says (paste
`project_topology()` over the demo documents, re-patch the crop keys), so the
demo carries `variant_axis` and `tags: {}` per study. It will turn
`tests/test_viewer_js_suite.py` red in the main checkout at the next batch
merge's projection rebuild if it is not done first.

**It also blinds the mutation gate.** The same review's
`run_mutation_witness_tests.mjs --repo <scratch> --changed-since integration`
selected 258 entries, and **all 106 fast-tier entries** reported "the tier was
red before the mutation, so nothing was proved", because this one `[real]`
check is red before any mutation is applied. Until the fixture is regenerated,
no fast-tier witness can be proved on `integration` through `--repo`.
