---
type: bug
priority: med
status: resolved
area: apps/annotate
reporter: agent
found_by: docs/sessions/HANDOFF_20260914_surfaces_that_state_something_false.md
handoff: docs/sessions/HANDOFF_20260915_annotate_hosted_page_posture.md
resolution: handoff completed 2026-09-15 -- closed automatically by dispatch when handoff `annotate_hosted_page_posture` moved to completed/; not independently verified.
---

# The annotator's "no projection" banner renders a terminal command for the user to copy

`apps/annotate/app.js`, `loadAll()`:

```js
setBanner("No topology projection found. Build it: " + AA.CONFIG.rebuild.topologies, "warn");
```

which puts this on the page:

> No topology projection found. Build it: venv-win\Scripts\python.exe scripts\build_topology_projection.py

That is the exact shape Jeff ruled out for every repo's web surface: **never
render terminal commands in a web UI for the user to copy/paste** — wire the
action to a button/endpoint, or degrade to plain words. `apps/viewer/` already
went through this (`views/banner.js`'s docstring records the 2026-09-10
sighting, where two commands concatenated onto one line, and the decision that
followed); this app's banner was not part of that pass. `AA.CONFIG.rebuild`
holds two such strings (`topologies`, `bindings`) and the first is rendered.

## Repro

Serve the app (`ops.toml`'s serve verb), connect a folder whose
`data/projections/viewer/topologies.json` does not exist, read the banner.

## Fix shape

Plain words, no command: the projection has not been built in the connected
folder, and that is a thing done in the repo, not on this page. A **button**
would be better still but needs a rebuild endpoint this app has no transport
for (`ISSUE_20260910_annotate_has_no_http_read_transport`), so the honest
interim is the sentence alone. Whether `AA.CONFIG.rebuild` should keep holding
the command strings at all once nothing renders them is worth asking in the
same pass.

Found while applying `viewer_transport_honest_hosted`'s posture to this app's
boot path; out of that handoff's scope, so filed rather than fixed.
