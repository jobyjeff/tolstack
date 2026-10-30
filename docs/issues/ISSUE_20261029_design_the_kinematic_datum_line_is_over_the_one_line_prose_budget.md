---
type: chore
priority: med
status: open
area: design
reporter: agent
found_by: docs/sessions/HANDOFF_20261029_the_plus72_stop_is_the_travel_datum.md
---

# Design: the kinematic chart's datum line is over the one-line prose budget

The line `datumNote` (`apps/viewer/views/kinematic.js`, fed by
`VA.kinematicDatumNote`) writes under the blade-pitch chart is three
sentences, about 210 characters on the live study: which stop is the datum
and why, which stop carries the travel band and how wide, and the declared
hub-anchor gap. The always-visible prose budget is one line (~160
characters); anything longer folds behind a disclosure, becomes a table, or
goes.

The handoff (`the_plus72_stop_is_the_travel_datum`) dictated the three
sentences, and its author flagged the overrun in the lesson rather than
cutting them. That makes the length a choice to revisit, not an authoring
slip.

Likely shape: keep the first sentence (the datum and its basis) visible, and
move the band width and the gap sentence elsewhere. The gap already has a row
and a chip in the contributor table, and the band width is on the chart's own
label, so those two sentences say again what the page already shows.
