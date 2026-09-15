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

> **Correction, 2026-09-15 (handoff `surfaces_that_state_something_false`).**
> Two phrases below are now wrong, and one of them would reintroduce a defect
> that has since been fixed.
>
> **"fall back to FSA"** (in the paragraph above, describing what the viewer
> does) — the viewer stopped doing that on 2026-09-14
> (`viewer_transport_honest_hosted`): on an `http(s)` page whose served probe
> fails there is **no FSA fallback**, because a hosted visitor has no tolstack
> repo to grant and a picker they cannot satisfy reads as a page asking for
> access to their files. Implemented literally, that phrase lands a hosted
> annotate page back on **Connect folder** — exactly the defect the same
> handoff that wrote this correction removed from `apps/annotate/`.
>
> **The posture is already decided, so the transport work does not get to
> decide it.** `apps/annotate/` now boots through the *shared* decision
> (`apps/viewer/storage/adapter.js`'s `VA.chooseTransport`, reached via
> `AA.chooseTransport`): the folder grant is offered on a **local** page only
> — `file://`, or a loopback origin — and a hosted origin gets one sentence
> and no control. When the HTTP transport below lands it becomes the `http`
> candidate handed to that same function; it does not add a fallback after it.
> Note the rule that makes the picker legitimate is "local", not "file://":
> this app has no `file://` story at all, so a loopback server (drawing-
> checker's `127.0.0.1:8000` mount, or `ops.toml`'s serve verb) is its only
> legitimate local page.
>
> What is *unchanged* is this issue's actual value: a hosted annotate page
> still cannot **read**, which is why it can say nothing better than the
> sentence it says. That is what the transport below fixes.

Shape of a fix: an annotate `storage/http.js` sibling of the viewer's —
same two probe candidates, plus `data/meshes/<sha>/...` binary reads
(fetch → ArrayBuffer) — with `canWrite() === false`, so the bind forms hide
exactly as the existing read-only contract already specifies
(`storage/adapter.js`). FSA stays the write path. Note drawing-checker's
DATA_MOUNT serves `data/projections/` today; whether it also serves
`data/meshes/` needs checking on that side first — if it does not, that is
the real blocker and this issue becomes partly a drawing-checker mount
decision.
