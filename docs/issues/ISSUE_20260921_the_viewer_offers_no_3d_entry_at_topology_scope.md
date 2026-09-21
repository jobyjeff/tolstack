---
type: feature
priority: med
status: open
area: apps/viewer
reporter: agent
found_by: docs/sessions/HANDOFF_20260921_annotate_hint_bar_and_context_autofilter.md
---

# The viewer offers no way into 3D at TOPOLOGY scope — only per study

Jeff, 2026-09-21: *"when an entire study or topology is selected, there should
be a way to enter the 3d view, pre-filtered to just the parts included in that
study/topology (again transparent with the interface surfaces displayed in a
different color)."*

The annotator half of that shipped with
`annotate_hint_bar_and_context_autofilter`: `trace <topology>` with **no
study** is a topology-scope entry — every edge in the topology, only its parts,
see-through, every already-bound face marked — and the URL form
`?trace=1&topology=<id>` (no `study=`) boots it. Browser-tier covered
(`annotate top bar + entry context (auto-filter, see-through)`).

**What is missing is the launcher.** `VA.renderTopoToolbar`
(`apps/viewer/views/topology.js`) gates both 3D affordances on
`state.studyId`:

```js
if (state.studyId && VA.studyHasMesh(topoProj, VA.findStudy(topoProj, state.studyId))) {
```

so with a topology open and no study selected there is no **View in 3D →**
button and no **Annotate →** link. Topology scope is reachable only by editing
the URL by hand, which is not a surface.

## What it needs

- The same two forms the study affordance already has: the flyout button where
  `state.annotateMount` is true, the plain new-tab link where it is not.
- The same mesh gate, at topology scope: a topology none of whose parts has an
  installed mesh should be offered nothing, the way
  `annotate_affordances_flyout_and_mesh_gating` (2026-09-14) settled it for a
  study. `VA.studyHasMesh` has no topology-scope twin yet.
- `VA.annotateLink({topologyId, trace: true})` already produces the right URL
  (`study` is omitted when absent), and `VA.annotateExecCommands` would want
  `params.studyId || ""` so the postMessage launch mirrors it rather than
  sending `undefined` — both are one-line changes in
  `apps/viewer/viewer.js`, plus their pinned tests in `apps/viewer/tests.js`.

## Why it was not done here

The handoff fenced `apps/viewer/` off except for `VA.annotateLink` /
`VA.annotateExecCommands` "if the deep-link needs a new parameter" — it did
not, so the toolbar was out of scope. The capability exists and is tested; only
the way in is missing.
