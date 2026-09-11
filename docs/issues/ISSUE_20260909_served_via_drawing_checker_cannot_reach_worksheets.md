---
type: feature
priority: low
status: open
area: viewer/storage
reporter: agent
handoff: viewer_http_transport
---

# Served through drawing-checker's mount, the viewer cannot read a worksheet at all

`HANDOFF_20260909_viewer_http_transport` added `storage/http.js`, a served
transport probed at load time so the viewer needs no FSA folder grant when the
page is answered by an origin that also serves the projections. Two mount
shapes are known and both are probed:

1. **sibling-data-mount** — drawing-checker's own mounts
   (`webui/analyses.py::mount_tolstack`): `VIEWER_MOUNT=/tolstack/viewer`,
   `DATA_MOUNT=/tolstack/data`, the latter serving `data/projections/viewer/`
   directly. Neither mount reaches `docs/` at all — only the viewer app and
   its projection dir are exposed — so `readText()` (the WORKSHEET_*.md path)
   always resolves `null` under this candidate, by construction.
   `capabilities().worksheets` reports `false` here and the "Show worksheet"
   toggle hides accordingly (`topology_app.js`'s `canReadWorksheets` gate) —
   this is handled honestly, not a bug.
2. **repo-root-static** (`python -m http.server` from the repo root) — the
   whole repo is reachable, so `docs/` resolves fine and worksheets work.

The gap: **`http://127.0.0.1:8000/tolstack/viewer/topology.html` is the
surface Jeff actually uses day to day** (per the handoff's own baseline note),
and it is exactly the shape that cannot show a worksheet. `pitch_system`
already carries one (`WORKSHEET_end_stop_graft.md`) — so browsing the real
topology through drawing-checker today silently loses that affordance
compared to either FSA or a repo-root static server. It degrades honestly
(the toggle just isn't offered — no error, no broken link) but it is a real,
permanent capability loss under the surface Jeff reaches for most.

Two directions worth weighing, neither attempted here (this handoff's scope
was the transport, not drawing-checker's mounts, which it was explicitly told
not to touch):

- drawing-checker adds a third, narrow mount for `docs/tolerance_stacks/` and
  `docs/topologies/` (read-only, same pattern as its existing two) so
  `storage/http.js`'s sibling-data-mount candidate can reach worksheets too;
- or accept the gap permanently and make it more visible than a silently
  hidden button — e.g. the banner naming the specific missing capability,
  not just the transport.

Filed rather than fixed: a drawing-checker mount change is out of scope for a
tolstack-only handoff, and which direction is right is a design call, not a
one-line patch.
