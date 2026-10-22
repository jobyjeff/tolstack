---
type: bug
priority: med
status: open
area: viewer/kinematic
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261021_the_kinematic_study_checks_its_run_its_units_and_shows_its_limit.md
---

# The kinematic page's citation-card wiring can be deleted and every tier stays green

`apps/viewer/topology_app.js` passes `onCardShow: showCard` into the kinematic
view's ctx (added 2026-10-21 by handoff
`the_kinematic_study_checks_its_run_its_units_and_shows_its_limit`). That one
line is the only reason a stop's verdict on
`topology.html?kinematic=vpa_pitch_linkage_blade_pitch_at_the_stops` opens the
citation card with S461-607's **adoption note**.

Delete it and `citationTrigger` (`apps/viewer/views/kinematic.js`) quietly falls
back to a native `title` tooltip holding only the card's where-line
(`S461_equipmentrequirements_….json · cell S461-607`). The adoption note, which
says the limit is borrowed, is then unreachable on the live page. No tier
notices:

- both fast-tier checks (`a kinematic verdict leads to its limit's citation…`,
  `[real] each live stop's verdict leads to S461-607…`) pass their own
  `onCardShow` into `kinematicPage`/`VA.renderKinematic`, so they never read
  `topology_app.js`;
- no browser-tier block hovers or focuses `span.kmverdict__limit`
  (`grep -n kmverdict scripts/run_viewer_browser_tests.mjs` finds only
  `waitForSelector`/count/text reads).

Found by reading, at review (the overlay's "Mutate the plumbing lines too"
entry), not by running the mutation.

## Fix

One browser-tier check in the kinematic study page block: hover (or focus)
the first `span.kmverdict__limit`, assert the hover card opens, its title
names `S461-607` and its body contains "closest available numeric acceptance
criterion". Enroll it with a mutation spec that deletes the
`onCardShow: showCard,` line.
