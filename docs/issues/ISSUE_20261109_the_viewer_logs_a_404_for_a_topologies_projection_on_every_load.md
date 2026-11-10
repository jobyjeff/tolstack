---
type: bug
priority: med
status: resolved
area: viewer/transport
reporter: agent
found_by: docs/sessions/HANDOFF_20261108_the_integration_walk_reads_the_merged_page_against_jeffs_sentences.md
handoff: docs/sessions/HANDOFF_20261109_the_demo_path_reads_cleanly_on_a_projector.md
resolution: handoff completed 2026-11-09 -- closed automatically by dispatch when handoff `the_demo_path_reads_cleanly_on_a_projector` moved to completed/; not independently verified.
---

# The viewer logs a 404 for a topologies projection on every load

Every load of `apps/viewer/topology.html?topology=vpa_end_stop_v2` makes one
request that 404s, and the browser logs it as a console error ("Failed to load
resource: the server responded with a status of 404"). When the page is served the
way `tests/debug_*.mjs` serve it (the tree at `/`, with `data/` from the main
checkout), the failing URL is `/apps/data/topologies.json`, a `data/` path resolved
next to `apps/`. On drawing-checker's mount at 8000, the same load logs one
404 console error too.

The page renders correctly after it, so the request looks like a candidate location
tried before the real one. Even so, the console error shows up on every page load,
and it would be the first line visible if devtools were ever opened during a demo.
Either try the locations without logging an error (a HEAD probe, or an order that
starts with the location this server actually has), or stop requesting the one no
transport serves.

Seen in every phase of `tests/debug_integration_walk_20261108.mjs` (its
`errors …` log lines).
