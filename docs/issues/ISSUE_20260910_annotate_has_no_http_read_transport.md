---
type: feature
priority: med
status: triaged
area: apps/annotate
reporter: agent
strategy: docs/strategy/BRIEF_20260911_served_surface_capability_gaps.md
---

# The annotator has no HTTP read transport — every session needs a folder grant even to look

`apps/annotate/` has exactly two storage adapters: FSA (read/write) and
memory (`?mock=1`). Served under drawing-checker's mount
(`/tolstack/annotate/`, the canonical surface since the 2026-09-10
consolidation), the app can therefore show **nothing** — not the topology
list, not a mesh, not a per-study trace — until the user clicks
"Connect folder" and grants the repo root. The viewer solved exactly this
with `apps/viewer/storage/http.js` (handoff `viewer_http_transport`): probe
the served data mounts, read projections over fetch, fall back to FSA.

This got more visible with `study_3d_flyout`: the viewer's 3D flyout embeds
the annotator, and the very first thing a reviewer sees in the panel is a
connect prompt, even when they only want to LOOK at a study's chain (a pure
read). The deep-link/trace boot params queue behind the grant (by design),
so nothing is broken — it is one avoidable click per session, per browser
profile, for the read-only majority of visits.

Shape of a fix: an annotate `storage/http.js` sibling of the viewer's —
same two probe candidates, plus `data/meshes/<sha>/...` binary reads
(fetch → ArrayBuffer) — with `canWrite() === false`, so the bind forms hide
exactly as the existing read-only contract already specifies
(`storage/adapter.js`). FSA stays the write path. Note drawing-checker's
DATA_MOUNT serves `data/projections/` today; whether it also serves
`data/meshes/` needs checking on that side first — if it does not, that is
the real blocker and this issue becomes partly a drawing-checker mount
decision.
