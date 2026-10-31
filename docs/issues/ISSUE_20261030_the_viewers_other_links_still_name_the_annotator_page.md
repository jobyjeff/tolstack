---
type: chore
priority: low
status: deferred
area: viewer/annotate
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261029_the_annotator_has_no_front_door.md
class: dead_code_after_retirement
defer_until: 2026-11-29
resolution: triage 2026-10-30: low, deferred by default to a date (class has no program)
---

# The viewer's other out-links still name `../annotate/index.html`

`the_annotator_has_no_front_door` removed the toolbar's "Annotate →" link and
the pane header's "open the whole annotator" link, because the page behind them
is now a redirect to the shell. Three more routes still build the old URL with
`VA.annotateLink` and open it in a new tab where the annotate mount is not
probed (file://, or a server without the sibling mount):

- the topology edge detail's `annotate this →` (`views/topology.js`,
  `a.detail__annotate-link`, pinned by `run_viewer_browser_tests.mjs` under
  file://),
- the citation card's annotate link (`views/cards.js`),
- the kinematic contributor row's link (`views/kinematic.js`).

Where the mount is present each one launches the pane and never follows the
href. Where it is not, the new tab loads the redirect, which lands on the shell
(`topology.html?...&pane=1`) — a second copy of the page the reader is already
on, with no pane to open (no mount). They should show nothing in that case, like
the toolbar's does now. Left alone because the handoff scoped the removal to the
toolbar link and the pane's own header, and each of the three has a test that
pins the link.

Sites: `apps/viewer/views/topology.js` (~2933), `views/cards.js` (~466),
`views/kinematic.js` (~1611); `VA.annotateLink` and `VA.ANNOTATE_PAGE` in
`viewer.js`; `topology_app.js`'s `onNavKinematicModel` `window.open` fallback.
