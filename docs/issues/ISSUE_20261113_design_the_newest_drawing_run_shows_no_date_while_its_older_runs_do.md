---
type: chore
priority: low
status: open
area: design
reporter: agent
found_by: docs/sessions/HANDOFF_20261112_a_part_links_to_its_drawing_before_it_has_a_tolerance.md
---

# Design: the newest drawing run shows no date, while its older runs do

Since `a_part_links_to_its_drawing_before_it_has_a_tolerance`, a part's number in the
Preview links to its newest drawing-checker run with the revision beside it
(`VA.renderPartName`, `apps/viewer/views/topology.js`), and the older runs fold
behind "N older", each written `rev A · 2026-08-13` (`VA.renderOlderRuns`).

Two judgement-call rough edges, seen in the handoff's own shot
`docs/sessions/lessons/shots/a_part_links_to_its_drawing_before_it_has_a_tolerance/01_own_run_preview.png`:

- The newest run's date is only in the link's hover title, so a reader who opens the
  fold sees dates for every run except the one the number links to.
- When every run has the same revision (the gas-spring mount: five runs, all rev A),
  the open fold reads `rev A · <date>` four times; nothing says why there are several
  runs of one revision (re-exports, re-runs).

Neither is wrong; both are cheap to settle in the next pass over the Preview.
