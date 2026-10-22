---
type: bug
priority: med
status: resolved
area: viewer/kinematic
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261020_the_viewer_shows_a_kinematic_study.md
handoff: docs/sessions/HANDOFF_20261021_the_kinematic_study_checks_its_run_its_units_and_shows_its_limit.md
resolution: handoff completed 2026-10-22 -- closed automatically by dispatch when handoff `the_kinematic_study_checks_its_run_its_units_and_shows_its_limit` moved to completed/; not independently verified.
---

# The kinematic page shows a PASS against a limit whose citation it never shows

`apps/viewer/views/kinematic.js` — `verdictStrip()` and `provenance()`.

Each stop's verdict strip reads `PASS · margin +0.256 deg · limit ±0.500 deg ·
BUDGET`. The projection carries, beside that limit, its `source_ref`
(S461-607) and the stop's `context_ref` (S461-241). The page renders neither,
not even behind the "Where these numbers come from" fold. The chip's tooltip
is the check's `label`, and the fold lists the sweep, the study's authored
provenance, the excluded terms and the notes.

That matters more here than it would for most citations, because the limit is
a **proxy**. `limit.source_ref.note` says S461-607 is a blade-to-blade
variation limit, "adopted here as the closest available numeric acceptance
criterion" because S461-241 gives only the two stop angles and S461-805's
threshold is TBD. The overlay's "archetype's own caveat, next to the numbers"
rule covers this case. A reader who sees only the green PASS cannot tell that
the criterion was borrowed.

**Suggested fix:** in the verdict item's tooltip, or as one line per stop in
the provenance fold, show the limit's document, cell and callout, and the
adoption note. Show the stop's `context_ref` the same way. Everything comes
from the projection, so no new data is needed. Pin it with a fast-tier check
over the inline fixture and a `[real]` check that names S461-607.

Found in review; not a blocker for the handoff, which did not list the limit's
citation among the provenance fields to show.
