---
type: feature
priority: low
status: deferred
area: apps/annotate (HTTP transport) / drawing-checker mounts
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261028_the_scene_pane_is_one_flyout_that_reads_over_http.md
class: pulled_and_unwired
defer_until: 2026-11-28
resolution: triage 2026-10-29: low, deferred by default (30 days)
---

# The served annotator reads no bindings: no mount serves the feature-identity projection

Since `the_scene_pane_is_one_flyout_that_reads_over_http`, the annotator reads
over HTTP. It reads everything it needs from
`data/projections/viewer/`, which drawing-checker serves as `/tolstack/data/`
and bakes for the hosted site, with one exception:
`data/projections/feature-identity/bindings.json`. No drawing-checker mount
reaches it, so the viewer's `HttpAdapter` candidate `sibling-data-mount` has
`identityFile: null`.

What that costs:

- **Loopback, before a grant**, and **hosted, always**: the scene shows no bound
  faces. Bound rows read as unbound, and the model layer's bound-node anchors
  fall back to their origins.
- **Loopback, after the first bind's grant**: the projection comes from the
  folder instead (`storage/http.js`'s `readFeatureIdentityProjection`). Event
  numbering is therefore still counted off the real log, so this gap is cosmetic
  before the grant and absent after it.

## Options

1. **The kinematic builder copies `bindings.json` into the read set**, as it
   already does with the part names. Cheap. It goes stale between rebuilds,
   because the feature-identity builder is not on `rebuild_projections.ps1`.
   It would need adding there, ahead of the kinematic step.
2. **Drawing-checker mounts `data/projections/feature-identity/`**, at
   `/tolstack/data/feature-identity/`, registered before `/tolstack/data/`
   like the meshes mount. The candidate's `identityFile` then becomes
   `../data/feature-identity/bindings.json`. Always live, and needs a
   drawing-checker change and its bake.

I recommend option 2: bindings are the one input here that changes between
rebuilds, and option 1 would show stale ones without saying so.
