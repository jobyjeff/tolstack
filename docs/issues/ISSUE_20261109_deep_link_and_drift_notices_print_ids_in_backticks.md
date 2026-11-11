---
type: chore
priority: low
status: deferred
area: viewer/copy
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261109_the_demo_path_reads_cleanly_on_a_projector.md
defer_until: 2026-12-10
class: internals_on_a_user_surface
resolution: deferred 2026-11-10 (triage) -- low defers by default
---

# The viewer's deep-link and drift notices print ids in literal backticks

`the_demo_path_reads_cleanly_on_a_projector` added the backtick to
`apps/viewer/reader_facing_bans.js` and rewrote every Preview and stack-page
string the scans reach. These strings still print a code span around an internal
id. No scan reaches them, because no fixture renders them:

| site | what it prints |
| --- | --- |
| `apps/viewer/topology.js`, `VA.valueSourceText` | `` value source `x`, which this viewer has no branch for — scripts/build_topology_projection.py's VALUE_SOURCES ... `` (drift diagnostic; also names a script) |
| `apps/viewer/topology.js`, `VA.unlabelledStudyErrorText` | `` the study raised `Type` ... `` |
| `apps/viewer/topology.js`, the deep-link resolver (`say(...)`, about ten branches) | `` This link asks for edge `id`, which topology `id` does not carry ... `` |
| `apps/viewer/topology.js`, the study/topology pairing message | `` study `id` (file) names topology `id`, which no document in docs/topologies/ declares `` |
| `apps/viewer/viewer.js`, the crop-key text (around line 1330) | `` from stack `id`, element `id` `` |

These need a design call rather than a find-and-replace. A deep link that names a
missing id has to say which thing is missing, and the id is the only name it has.
Options: (1) the everyday name where the projection has one, and the id on hover
only; (2) the id in plain text without backticks; (3) leave the drift diagnostics
alone (they are loud on purpose) and fix only the deep-link notices.
Recommendation: (1) for the deep-link notices and (2) for the drift diagnostics,
plus a fixture row that renders each branch so the ban scan reaches it.
