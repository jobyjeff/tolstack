---
type: bug
priority: low
status: triaged
area: apps/annotate
reporter: agent
handoff: docs/sessions/HANDOFF_20260911_annotate_load_gate_settles_on_failure.md
---

# If `loadAll()` throws after a successful connect, queued annotate commands wait forever

Surfaced by `docs/sessions/reviews/REVIEW_20260910_study_3d_flyout.md` and left
unfiled; confirmed against the code at the 2026-09-11 triage sweep.

`apps/annotate/app.js:711` gates every embedder-sent command behind a promise that
only ever resolves:

```js
let markLoaded;
const whenLoaded = new Promise((resolve) => { markLoaded = resolve; });
...
execChain = execChain.then(async () => {
  try {
    await whenLoaded;          // <- never settles if markLoaded is not called
    const result = await AA.exec(msg.command);
    ...
```

`markLoaded()` is called from exactly two places in `loadAll()` (lines 744 and
760): the loaded-but-empty early return — which is deliberate and correctly
commented ("queued commands should fail loudly … not hang forever behind this
gate") — and the very end of the happy path. Every `await` in between is
unprotected: `readFeatureIdentityProjection()`, `listMeshes()`,
`readPartMeshAliases()`, `runPendingDeepLink()`. If any of them rejects,
`markLoaded` is never called, `whenLoaded` never settles, and each queued command
hangs on `await whenLoaded` **inside the try block** — so it never reaches the
`catch`, never sets the banner, and never posts the
`{type: "annotate:result", ok: false}` reply the embedder is waiting on.

The empty-projection branch shows the author already understood this failure mode
and handled the one case they had in mind; the rejection path is the same hazard
one step further out.

Harmless today only because the viewer's flyout sends commands fire-and-forget and
does not block on the reply — so nothing user-visible waits on the promise that
never resolves. That is a property of today's only caller, not of the contract:
the message protocol explicitly promises a reply for every command ("reply
`{type: "annotate:result", id, ok, result|error}`; a failure also lands in this
app's own banner"), and this is the one path where that promise is broken silently.

Suggested fix, not binding: settle the gate in a `finally`, or reject it, so a load
failure makes queued commands fail loudly with the load error rather than hang —
matching what the empty-projection branch already does deliberately.
