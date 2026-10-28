---
type: chore
priority: low
status: deferred
area: tests/browser
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261026_the_fastener_stacks_join_the_model.md
class: fold_left_stale_reference
defer_until: 2026-11-26
resolution: deferred 2026-10-27 (triage) -- low by default
---

# No real topology to switch to: three browser checks lost their live subject

`scripts/run_viewer_browser_tests.mjs` proved on live data that switching
topology keeps the jog-zone scale, the leader style and the density/length/
value-only preferences. Those needed a second real topology; the four fastener
topologies were the others and the product model is now the only one. The three
checks push a named SKIPPED row when the live projection has one topology.

Restoring them needs a second subject: an injected second topology with a
different natural width, or the same preference carried across a study switch
if that is the path a reader now takes. Not done here because it is a test
design, not a fold consequence.
