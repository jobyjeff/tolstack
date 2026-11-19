---
type: chore
priority: low
status: deferred
area: viewer
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261117_the_filmstrip_boots_on_the_map_and_the_rails_residue_goes.md
defer_until: 2026-12-19
class: dead_code_after_retirement
resolution: deferred 2026-11-19 (triage): low, deferred by default
---

# Rails-era names still sit in comments and unit-test fixtures

`the_filmstrip_boots_on_the_map_and_the_rails_residue_goes` removed what its
issue listed. A grep for the wider shape (`rail__`, `railY`) still finds sites
that name the retired drawing. None changes what the page draws.

| Where | What |
|---|---|
| `apps/viewer/viewer.js:1764` | comment explains a hit path through `.rail__barhit`, a class nothing draws |
| `apps/viewer/views/dom.js:30` | the `VA.svg` doc example uses `"rail__dot"` |
| `apps/viewer/tests.js` (24 lines match `rail__\|railY\|RAIL_METRICS`) | some are live (`VA.RAIL_METRICS.rowHeight` is the grid row height), the rest assert on or describe rail marks; the live ones should be told apart from the retired ones |
| `VA.RAIL_METRICS` itself | live, but its name says rails; a rename to the grid row height is a design call |

The `--rail-even/odd/dim` colour tokens had no reader and went in the sweep;
`--rail-hot` is read (`topology.css`) and stays.
