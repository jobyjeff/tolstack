---
type: feature
priority: low
status: deferred
area: annotate/parts-panel
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261014_a_context_filter_and_a_view_filter.md
class: context_membership_semantics
defer_until: 2026-11-14
resolution: deferred 2026-10-15 (triage) -- low, deferred by default
---

# `trace` draws meshes a binding points at that the model's part list missed

`planStudyTrace` adds to its ghosts any mesh a feature-identity binding points
at that the study's part list did not name. Since the parts panel separated
**context** (what is in the model) from **view** (what is drawn), such a mesh is
drawn but listed under "Other parts", because the context is derived from the
topology/study's own part list (`AA.planScopeFilter`).

Question for design: does the model include a mesh a binding says the feature
lives on? If yes, `cmdTrace` should `context add` the plan's extra ghosts (a
one-line change); if no, the panel's current answer is right and this closes.
Not changed in the handoff because it decides what "in this model" means.
