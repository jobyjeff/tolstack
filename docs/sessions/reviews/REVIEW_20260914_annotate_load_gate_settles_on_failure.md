---
type: review
handoff: annotate_load_gate_settles_on_failure
reviewer: agent
date: 2026-09-14
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-14 — annotate_load_gate_settles_on_failure

## Scope note

This handoff touches `apps/annotate/app.js` (plus a new `exec_queue.js`, its
`run_tests.cjs` coverage, `README.md` and `index.html`) — architecture, not a
tolerance-stack authoring artifact. Per this overlay's own "second app now has
its own command layer" entry, none of the seven mandatory tolerance-stack
checks apply. This review is a correctness/test-quality review instead.

## What I verified

- **The defect as described.** Confirmed against `integration` before merge:
  `apps/annotate/app.js`'s `whenLoaded` promise was resolve-only
  (`new Promise((resolve) => {...})`), settled only by `markLoaded()` at two
  sites in `loadAll()`. Every `await` between those two call sites
  (`readFeatureIdentityProjection`, `listMeshes`, `readPartMeshAliases`,
  `runPendingDeepLink`) was unprotected — a rejection there left the gate
  permanently unsettled and any queued command hanging on `await whenLoaded`
  forever, exactly as the handoff and its source issue
  (`ISSUE_20260911_annotate_queued_commands_hang_if_loadall_throws.md`)
  describe.
- **The fix.** `loadAll()`'s body is now wrapped in `try { ... } catch (err) {
  execQueue.markLoadFailed(new Error("load failed: " + err.message)); throw
  err; }`. The gate + queue moved out of `app.js` into a new DOM-free
  `exec_queue.js` (`AA.ExecQueue`), with a real two-argument
  `(resolve, reject)` promise, `markLoaded()` calling resolve (unchanged
  semantics from the loaded-but-empty branch) and `markLoadFailed(err)`
  calling reject. `enqueue()` never itself rejects — it resolves to `{ok:
  true, result}` / `{ok: false, error}`, matching the message listener's new
  single `.then((outcome) => ...)` shape in `app.js`. Read `exec_queue.js` in
  full; the internal chaining (`this._chain = this._chain.then(() =>
  gate.then(onSettle, onGateReject))`) correctly prevents a gate rejection
  from poisoning the chain for commands queued afterward, and the
  constructor's `this._gate.catch(() => {})` correctly forestalls a spurious
  unhandled-rejection log without affecting real subscribers — both matter
  and both are right.
- **Deliverable 2 (line 744's early-return intent preserved).** Diffed: the
  loaded-but-empty branch still calls `execQueue.markLoaded()` with its
  original comment, unchanged in meaning; it is not folded into the generic
  failure path.
- **Rethrow behavior at loadAll()'s three call sites.** `loadAll()` had no
  try/catch of its own before this change, so an exception already
  propagated to whichever of the three call sites awaited it (unhandled at
  the `?mock=1` boot and the initial-`READY` boot, caught and banner'd at
  `connectBtn.onclick`). The new `catch { ...; throw err; }` preserves that
  external behavior exactly — the only change is that the queue is now
  settled with the load error *before* the exception continues on its
  existing path.
- **Load order.** `exec_queue.js` is registered as a classic script in
  `index.html`, before `app.js`'s module script and after `commands.js` —
  consistent with the file's own "loaded in order" contract comment, and
  `app.js`'s top-level `new AA.ExecQueue()` needs exactly that.
- **New tests are demonstrated to actually catch the regression.** I
  temporarily commented out `this._rejectGate(err);` in `markLoadFailed`
  (post-merge, on the review branch) and reran `node apps/annotate/run_tests.cjs`:
  the two gate-rejection tests failed loudly with their timeout messages
  (`55/57 passed`), and no other test was affected. Restored the line;
  `57/57 passed` again. This is the handoff's own "demonstrated red before
  green" claim, independently reproduced rather than taken on faith (per this
  repo's "a new guard has been observed failing" universal check).
- **Full suites, both green, in this worktree:**
  `node apps/annotate/run_tests.cjs` → 57/57 (up from 53/53 pre-merge; 4 new
  `ExecQueue` tests). `venv-win/Scripts/python.exe -m pytest -q` → 768 passed,
  1 skipped (unchanged from pre-merge baseline; the skip predates this
  session and is not JS-suite-related).
- **Scope respected.** Diff touches only `apps/annotate/*`, its own
  `run_tests.cjs`, and the lesson file. `apps/viewer/` and
  `scripts/run_viewer_browser_tests.mjs` are untouched, as the handoff
  required (both owned by parallel in-flight handoffs).
- **`data/` untouched** by the test run (`git status --porcelain -- data/`
  empty before and after).
- **Lesson file present and answers its own mandated question**
  (`docs/sessions/lessons/LESSONS_20260911_annotate_load_gate_settles_on_failure.md`):
  grepped `apps/annotate/` for `new Promise(` and found no second
  resolve-only gate (three sites in `storage/fsa.js` are already
  two-argument); noted `apps/viewer/`'s similar-looking `new Promise((resolve)
  => ...)` sites are test-harness `server.listen()` helpers, not a production
  gate, and are out of scope for this handoff anyway.

## Findings

None. No blockers, no should-fix, no nits worth recording.

## Overlay maintenance

`docs/prompts/REVIEW_AGENT.md` was already well populated (seeded 2026-08-04,
last touched 2026-09-11). Applied its existing "second app now has its own
command layer" entry (confirmed checks 1–7 don't apply, confirmed no
bypass-the-command-layer mutation was introduced — the fix still routes every
queued command through `AA.exec(msg.command)`). Added one new entry to
**Recurring bugs to check**: a `new Promise((resolve) => {...})` gate with no
reject path hangs forever on its unhappy path — this is a new failure class
(the first resolve-only-gate sighting in this repo), so per the overlay
maintenance rule it gets its own entry rather than being folded into an
existing one.

## Verdict

**APPROVE.** Merged `handoff/annotate_load_gate_settles_on_failure` into
`review/annotate_load_gate_settles_on_failure` as a fast-forward (no
conflict — the review branch was cut from the current `integration` tip and
the handoff branch carries exactly one commit on top of it). Both suites
green after merge. Proceeding to merge into `integration`.
