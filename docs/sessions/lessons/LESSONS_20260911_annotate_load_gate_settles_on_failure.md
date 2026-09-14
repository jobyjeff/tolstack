# LESSONS 2026-09-11 — annotate_load_gate_settles_on_failure

## What changed, and why it needed a new file rather than a two-line diff

The fix itself is small: `loadAll()`'s body is now wrapped in `try {} catch
(err) {}`, and the `catch` settles the load gate with a wrapped error
(`"load failed: " + err.message`) instead of leaving it pending, then
rethrows so the two existing callers (the `?mock=1` boot and
`connectBtn.onclick`'s own `try/catch`) keep behaving exactly as before.

The gate itself (`markLoaded`/`whenLoaded`) and the `execChain` queuing logic
that used to live inline in `app.js` moved to a new file, `exec_queue.js`
(`AA.ExecQueue`), loaded as one more classic script before `app.js`. This
was **not** a drive-by refactor — deliverable 3 asks for a test that proves a
queued command gets a failure reply instead of hanging, using a bounded wait
so the hang itself is observable. `app.js` cannot be loaded in
`run_tests.cjs`'s vm sandbox at all (it's an ES module, touches `document`,
and imports `scene.js`'s three.js/WebGL at module-load time — the sandbox has
no DOM shim and no WebGL, see the file's own top-of-file comment). Every
other testable piece of `app.js`'s logic already lives in a DOM-free sibling
file for exactly this reason (`binding_state.js`, `commands.js` — see
README.md's "Layout" and "Why ES modules here" sections); the gate/queue is
the same shape of thing, so it got the same treatment rather than inventing a
one-off way to test it.

## The fix's shape

`ExecQueue` wraps its internal gate in `(resolve, reject)`, not just
`(resolve)`. `markLoaded()` calls `resolve()` (the loaded-but-empty path's
call — deliberate, unchanged in meaning); `markLoadFailed(err)` calls
`reject(err)`. `enqueue(run)` never itself rejects — it resolves to `{ok:
true, result}` or `{ok: false, error}` regardless of whether the gate or `run`
is what failed, so `app.js`'s message listener has one place (`outcome.ok`)
to build the `postMessage` reply and fire the banner, instead of a
try/catch per command.

One thing worth knowing if you touch this again: the gate promise gets an
unconditional `.catch(() => {})` in the constructor. Without it, a
`markLoadFailed()` call before anything is ever queued (nobody has attached a
`.then`/`.catch` to the gate yet) logs as an unhandled promise rejection in
the console even though the app's behavior is otherwise correct — commands
queued *later* still see the rejection independently, since each `.then` call
on a promise is its own independent subscription. The extra `.catch` doesn't
swallow the rejection for anyone else.

## Demonstrated red before green

Verified by hand (not committed): temporarily commented out the
`this._rejectGate(err);` line in `exec_queue.js`'s `markLoadFailed` and reran
`node apps/annotate/run_tests.cjs` — the two new tests that queue behind a
failed gate timed out (500ms bound) and failed loudly, all other tests still
passed. Restored the line; full 57/57 green again.

## The lesson's own ask: any other resolve-only-on-success gate in this app?

Grepped `apps/annotate/` for `new Promise(`. Besides the new `exec_queue.js`
gate itself: `storage/fsa.js` has three `new Promise(function (resolve,
reject) {...})` call sites, all already two-argument (both settle paths
wired) — no hazard there. That was the only instance of the bug's shape
(`new Promise((resolve) => {...})`, resolve-only, gating something that can
hang forever on the other path) in this app; the one deliberate second
instance mentioned in the handoff (the loaded-but-empty branch calling
`markLoaded()`) was never itself the hazard — it already settled correctly,
the point of this handoff was the *unsettled* paths around it.

`apps/viewer/run_tests.cjs` (out of scope for this handoff, owned by a
parallel one) also has several `new Promise((resolve) => {...})` sites, but
they're test-harness helpers (`startStaticServer`, `startHtmlCatchAllServer`,
`startRebuildOrigin`) waiting on `server.listen()`'s callback, not a
production gate a real command queue awaits — structurally a different thing
(a listen() bind failure on port 0 is not a realistic failure mode the way a
storage read rejecting is), so no issue filed for it.

## Left for the next session

Nothing. Deliverables 1–3 are done, the full pytest suite is green (768
passed, 1 skipped — the skip predates this session), and the new
`apps/annotate/run_tests.cjs` coverage is 57/57.
