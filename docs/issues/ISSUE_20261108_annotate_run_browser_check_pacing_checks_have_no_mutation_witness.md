---
type: chore
priority: low
status: deferred
area: apps/annotate browser check, mutation witnesses
reporter: agent
found_by: docs/sessions/HANDOFF_20261106_the_annotate_pacing_checks_step_a_virtual_clock.md
resolution: triage 2026-11-08: low, default 30-day defer
---

# The annotate pacing checks have no mutation witness

The handoff asked that each reduced-motion check's mutation spec still witness it. Neither check has one:
`apps/annotate/run_browser_check.mjs` is not a gated file, and `--changed-since master` on this branch reported
"0 of 825 entries can be reached". Enrolling them (or moving them into the gated annotate suite) is a decision
for a later handoff; until then a regression in `tickSweep`'s reduced-motion pacing is seen only by a hand run.
