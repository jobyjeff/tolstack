---
priority: low
depends_on: []
model: sonnet
---

# HANDOFF 2026-09-11 — annotate_load_gate_settles_on_failure: a load failure leaves queued commands hanging forever

Source: triage sweep 2026-09-11, from
`docs/issues/ISSUE_20260911_annotate_queued_commands_hang_if_loadall_throws.md`
(surfaced by `REVIEW_20260910_study_3d_flyout` and left unfiled; confirmed against the
code at the sweep). Baseline: trunk after the 2026-09-11 batch merge. Scope:
`apps/annotate/app.js` and its tests; do NOT touch `apps/viewer/` (owned by the
parallel `viewer_popover_clamp_and_rebuild_terminal_state` handoff) or
`scripts/run_viewer_browser_tests.mjs` (owned by
`viewer_browser_tier_wait_predicates`).

## The defect

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
```

`markLoaded()` is called from exactly two places in `loadAll()` — line 744, the
loaded-but-empty early return, which is deliberate and correctly commented ("queued
commands should fail loudly … not hang forever behind this gate"); and line 760, the
very end of the happy path. Every `await` in between is unprotected:
`readFeatureIdentityProjection()`, `listMeshes()`, `readPartMeshAliases()`,
`runPendingDeepLink()`. If any rejects, `markLoaded` is never called, `whenLoaded`
never settles, and each queued command hangs on `await whenLoaded` **inside the try
block** — so it never reaches the `catch`, never sets the banner, and never posts the
failure reply the embedder is waiting on.

The empty-projection branch shows the author already understood this failure mode and
handled the one case they had in mind; the rejection path is the same hazard one step
further out.

Harmless **today** only because the viewer's flyout sends commands fire-and-forget and
does not block on the reply. That is a property of today's only caller, not of the
contract: the message protocol explicitly promises a reply for every command (an
`annotate:result` message carrying `ok` and `result` or `error`, plus a banner on
failure), and this is the one path where that promise is broken silently.

## Deliverables

1. **Settle the gate on failure**, so a load error makes queued commands fail loudly
   with that error rather than hang — matching what the empty-projection branch
   already does deliberately. Suggested shapes, not binding: settle it in a `finally`,
   or reject it with the load error so the existing `catch` reports something useful.
   Prefer whichever makes the failing command's banner and reply name the *load*
   failure, since an `AA.exec` error would be a misleading thing to tell the embedder.

2. **Keep the two existing call sites' intent.** Line 744's early `markLoaded()` is
   correct and its comment explains why — do not collapse it into a generic path that
   loses the distinction between "loaded, but empty" and "failed to load".

3. **Pin it.** A test that makes one of the intermediate awaits reject and asserts the
   queued command gets a failure reply rather than hanging. A hang is awkward to
   assert — use a bounded wait and fail on timeout, so the test fails loudly today and
   passes after the fix.

## Definition of done

- An induced rejection in `loadAll()` produces a failure reply and a banner, with the
  load error named, instead of silence.
- The loaded-but-empty path still behaves exactly as before.
- New coverage per deliverable 3, demonstrated red before green.
- Full suite green (`venv-win/Scripts/python.exe -m pytest -q`).
- Lesson (`docs/sessions/lessons/LESSONS_20260911_annotate_load_gate_settles_on_failure.md`):
  whether any other promise gate in this app has the same resolve-only-on-success
  shape — one instance found by review is rarely the only one.
