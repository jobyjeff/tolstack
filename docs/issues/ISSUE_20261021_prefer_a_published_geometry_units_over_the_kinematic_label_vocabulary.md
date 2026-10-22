---
type: feature
priority: low
status: deferred
area: tolerance_stack/kinematic
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261021_the_kinematic_study_checks_its_run_its_units_and_shows_its_limit.md
class: cross_repo_contract_not_published
defer_until: 2026-11-21
resolution: deferred 2026-10-22 triage: low, the default knob (below the brief bar until linkage is asked; mm-only topologies today)
---

# Prefer a published `geometry.units[]` over the kinematic label vocabulary, if linkage ever publishes one

Since 2026-10-21 a kinematic band's units are checked against the KIND of its
sweep label (`tolerance_stack/kinematic.py`: `PARAMETER_KINDS`,
`LENGTH_ATTRIBUTES`, `DIRECTION_ATTRIBUTES`, `LINKAGE_LENGTH_UNITS = "mm"`,
`DIRECTION_UNITS = "rad"`), read off the label's own spelling, because a
`linkage-sweep/v1` artifact declares units for its measures and its driver and
none for its geometry. That is a reading of linkage's naming convention, kept in
this repo.

The stronger source would be linkage publishing `geometry.units[]` beside the
`geometry.features[]` it added on 2026-10-16. That is linkage's change to make,
and this handoff was fenced off the linkage repo. If it lands, `parameter_unit`
should read it first and treat the label vocabulary as the fallback (and refuse
when the two disagree, the shape `_reconcile_feature` already has for features).

Needs a strategy call on whether to ask linkage for it at all: with mm-only
topologies today the vocabulary is enough, and the question only bites for a
non-length, non-direction parameter.
