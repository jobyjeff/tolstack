---
type: chore
priority: low
status: deferred
area: tests/mutation-witnesses
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261029_the_annotator_has_no_front_door.md
class: guard_without_witness_spec
defer_until: 2026-11-29
resolution: triage 2026-10-30: low, deferred by default to a date (class has no program)
---

# Browser guards the front-door handoff added or renamed, with no mutation spec

`the_annotator_has_no_front_door` pinned `browser` at 765 declared / 732
enrollable (-8): six renamed guards carried their spec across, two specs retired
with their guard, and the new ones below were pinned rather than enrolled. Each
needs one spec (`node scripts/run_mutation_witness_tests.mjs --unenrolled`
prints the file names; suites are the registry keys named here).

| guard | suite |
|---|---|
| the notice line narrates the trace in plain words | annotate flyout (repo-root mount + file:// degradation) |
| under file:// the study offers no 3D affordance at all | annotate flyout (repo-root mount + file:// degradation) |
| the flyout head carries no link out to a page of its own | annotate flyout (repo-root mount + file:// degradation) |
| the arrival has one switch per step: topology, study and part | annotate top bar + entry context (auto-filter, see-through) |
| ...and disturbs neither of the others | annotate top bar + entry context (auto-filter, see-through) |
| ...and turning it back on re-applies the arrival it came from | annotate top bar + entry context (auto-filter, see-through) |
| a switched-off step survives a reload | annotate top bar + entry context (auto-filter, see-through) |

Exact names are in `scripts/run_viewer_browser_tests.mjs`.
