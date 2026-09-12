---
type: bug
priority: low
status: triaged
area: viewer/rebuild
reporter: agent
handoff: docs/sessions/HANDOFF_20260911_viewer_popover_clamp_and_rebuild_terminal_state.md
---

# `pollRebuild()` treats a terminal `idle` status as a successful rebuild and reloads

Surfaced by `docs/sessions/reviews/REVIEW_20260910_viewer_rebuild_affordance.md` as a
nit and left unfiled; confirmed against the code at the 2026-09-11 triage sweep.

`apps/viewer/topology_app.js:855`:

```js
function pollRebuild(status) {
  if (status && status.busy) { /* re-poll after REBUILD_POLL_MS */ return; }
  if (!status || status.state === "failed") { rebuildFailed(); return; }
  state.rebuild = { busy: false, error: null };
  load().catch(...).then(render);
}
```

The function has exactly two terminal branches: `failed`, and everything else —
which is treated as success and triggers a reload. So any terminal state that is
neither `busy` nor `failed` — notably `idle` — is read as "the rebuild finished
fine". Reachable if the server restarts mid-poll: the new process has no memory of
the run, answers `idle`, and the viewer reloads and re-renders as though the
rebuild had completed, when in fact it was abandoned partway.

The consequence is a silently stale projection presented as a fresh one, which is
the same shape as the 2026-09-06/08 stale-projection incident this repo already
paid for once — except here the page actively asserts freshness.

Self-correcting in the ordinary case (the next real rebuild fixes it) and the
window is narrow, hence `low`. Suggested fix, not binding: make the success branch
require the state the server actually reports on completion rather than accepting
the complement of `failed`, and route an unexpected terminal state to
`rebuildFailed()` — an unknown status is not evidence of success. Worth checking
what terminal states the endpoint can actually emit before pinning a value; the
real endpoint has since also shipped in drawing-checker, so the vocabulary should
be read from the server, not guessed.
