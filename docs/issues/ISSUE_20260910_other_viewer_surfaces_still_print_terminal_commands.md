---
type: chore
priority: med
status: open
area: apps/viewer, apps/annotate
reporter: agent
audience: strategy
---

# Other viewer(+annotate) surfaces still print terminal commands into the UI

`HANDOFF_20260910_viewer_rebuild_affordance.md` removed the rebuild command(s)
from the viewer's stale-pair alarm box (`views/banner.js`'s `provenance()`)
specifically — that was its scope, and the handoff's own text names that one
box. Jeff's binding rule is broader than that one box, though: "putting
terminal commands in a webui for the user to copy/paste is not acceptable UI
design ... exceptions ... need to be approved by user on a case by case
basis." A sweep of `apps/viewer/` + `apps/annotate/` after this handoff still
finds several more places that show one:

- `apps/viewer/views/banner.js`'s `missing()` (the "no projection built at
  all" / "no crop projection" states) — both still render a `<code>` command
  via `VA.CONFIG.rebuild[...]`.
- `apps/viewer/views/crop.js:26` — a "not-built" crop popover offers
  `VA.CONFIG.rebuild.crops` as a `<code>` block.
- `apps/viewer/views/topology.js:124` — a missing-topology-projection message
  appends `VA.CONFIG.rebuild.topologies` inline.
- `apps/annotate/app.js:586` — `setBanner("No topology projection found.
  Build it: " + AA.CONFIG.rebuild.topologies, "warn")`.

None of these are the box this handoff was asked to fix, and none of them
currently have a rebuild endpoint to drive a button from (they all fire on
"nothing built yet", not "stale" — a state `tolstack_mount_rebuild_endpoint`'s
single rebuild action also covers, since it reruns the whole
`rebuild_projections.ps1` recipe regardless of which projection is missing).
A follow-up could give all four the same button-or-sentence treatment this
handoff gave the stale-pair box, once the server-side endpoint
(`tolstack_mount_rebuild_endpoint`) has actually shipped — reusing this
handoff's `capabilities().rebuild` probe and `requestRebuild()`/
`readRebuildStatus()` adapter methods rather than adding a second copy of
either.

Routed to strategy since it spans two apps (`viewer`, `annotate`) and is a
design call (does EVERY missing-projection message get a button, or does the
"nothing built yet" case stay a command for now, since the rebuild endpoint
handoff only applies to the server it's mounted on) rather than a mechanical
fix.
