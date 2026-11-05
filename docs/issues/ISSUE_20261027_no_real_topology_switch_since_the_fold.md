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

## Addendum 2026-11-02 (decayed_witnesses_are_repaired_or_retired)

The skip is not harmless: it blinds four mutation witnesses that the 2026-10-28
sweep listed as "the witness cannot see the difference" --
`browser__real-switching-topology-keeps-the-density-the-length-mod__24d58bf9#1`,
`#2`, `#3` and `browser__real-switching-topology-keeps-the-leader-style-too__d25818b3`.
Each plants a reset of a display preference in `selectTopology()`, and the tier
stays green because the SKIPPED row is the only thing the check pushes. The
guarded behaviour still exists, so the specs are kept, not retired: they come
back to life the moment a second subject exists. Whoever restores the subject
re-runs those four with `--only`.
