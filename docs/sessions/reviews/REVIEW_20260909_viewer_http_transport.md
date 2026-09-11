---
type: review
handoff: viewer_http_transport
reviewer: agent
date: 2026-09-09
verdict: APPROVE
blockers: 0
---

# Review — viewer_http_transport

Not a tolerance-stack handoff, so the seven mandatory provenance checks
(sections 1–7 of this repo's overlay) don't apply — this is viewer transport
plumbing (`apps/viewer/storage/http.js`, boot wiring, tests). No stack JSON,
no element values, no signs, nothing traced/inferred/untraced touched by this
diff.

## What I verified

- **Scope respected.** Diff touches only `apps/viewer/`,
  `scripts/run_viewer_browser_tests.mjs`, and `docs/` (issue + lesson). No
  edits to drawing-checker, no edits to `apps/annotate/`.
- **Pre-merge baseline confirmed red-by-absence**: `apps/viewer/storage/http.js`
  did not exist before the merge; the handoff branch (`handoff/
  viewer_http_transport`, one commit `7b736a4` ahead of `integration`)
  fast-forward merged cleanly, no conflict to resolve.
- **Node fast tier**, run myself against the main checkout's real projections
  (`node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`): **219/219
  passed**, real-data tier ran (not skipped), including all 5 new http-adapter
  tests (sibling-data-mount, repo-root-static, DISCONNECTED-not-error,
  HTML-catch-all rejected, mid-session-stop rejects).
- **pytest**: `751 passed, 1 skipped` — the skip is
  `test_viewer_js_suite_is_green`'s documented worktree behavior (no `--repo`
  passed, so its own node-fs tier has no projection to read; pre-existing,
  not a regression from this diff).
- **Browser truth tier** (`node scripts/run_viewer_browser_tests.mjs --repo
  C:/workspace/tolstack`, after `npm install` in this worktree): **12/12
  browser checks passed**, including the new `served mode (repo-root static
  server)` check (6/6 sub-checks: `?mock=1` boots under the new server, the
  connect-folder banner never appears, the banner states "Served over HTTP",
  the DAG renders with zero manual steps, a mid-session server stop surfaces
  the banner error on Reload, and the DAG pane keeps its last-good rows).
- **Independently reproduced the drawing-checker real-mount demonstration**
  (didn't just trust the lesson doc): started drawing-checker's own server
  (`webui.main:app`) with `DRAWING_CHECKER_TOLSTACK_ROOT` pointed at this
  worktree, a copy of the main checkout's `data/projections/viewer/` staged
  into this worktree's own gitignored `data/` (removed afterward; confirmed
  `git status --short data/` was empty both before staging and after
  cleanup — nothing tracked touched). Loaded
  `http://127.0.0.1:8123/tolstack/viewer/topology.html` (the real mount shape,
  different port to avoid colliding with any other running instance) with
  Playwright, cold, no query string:
  - `banner banner--ready`, text starts "Served over HTTP — no folder grant
    needed. Read-only."
  - 15 DAG rows rendered.
  - `#worksheet-toggle` **not visible** — matches the documented
    `capabilities().worksheets === false` gap under this exact mount shape
    (drawing-checker's mount cannot reach `docs/`).
  Confirms the handoff's central claim end to end, not just via its own test
  harness.
- **Read `storage/http.js` in full.** Probe order, content-type check (never
  status alone — the HTML-catch-all test proves it), 404-vs-throw distinction
  in `_readProjection` (a real transport failure must reach the caller — this
  is what makes deliverable 3's mid-session-stop requirement work), HEAD-only
  reads for crop images (matches `node_fs.js`'s existing convention), and the
  `fetch.bind(window)` fix already present (the lesson doc records this was
  caught by the browser truth tier during the tactical session and fixed
  before hand-off — verified the fix is actually in the shipped file, not
  just described in the lesson).
- **Read `topology_app.js`'s `chooseAdapter`.** Mock short-circuits first
  (unchanged precedence), then HTTP, then FSA; `capabilities()` gates the
  worksheet toggle with the documented "absent means capable" default
  (`!adapter || typeof adapter.capabilities !== "function" ||
  adapter.capabilities().worksheets !== false`) — read as a total function,
  not an `else if` chain, so a future adapter with no `capabilities()` degrades
  to "fully capable" rather than silently hiding a control it can service.
- **No second combiner.** Grepped `storage/http.js` for arithmetic/rounding —
  none; it is pure transport, same invariant the rest of `apps/viewer/`
  already holds.
- **Filed issue is properly scoped and formatted**:
  `ISSUE_20260909_served_via_drawing_checker_cannot_reach_worksheets.md`
  carries correct frontmatter (`type: feature`, `priority: low`, `status:
  open`, `area: viewer/storage`, `reporter: agent`) and correctly identifies
  the worksheet gap as a drawing-checker mount decision, out of this
  handoff's scope — not something to fix inline here.
- **Lesson doc** (`LESSONS_20260909_viewer_http_transport.md`) is thorough:
  records the real bug the truth tier caught (unbound `fetch`) and *why* the
  node tier structurally cannot catch that class of bug, the probe-candidate
  resolution table, the capability-difference matrix, and what hosting the
  viewer would still need (cache headers — already staged separately in
  drawing-checker, CORS, HTTPS/mixed content). I promoted the unbound-fetch
  lesson into this repo's overlay (below) since it's a new, generalizable
  failure class for any future transport/adapter work here.

## Findings

None. No blockers, no should-fixes left unfixed, no nits worth recording
beyond the overlay update below.

## Overlay maintenance

Added a new **Recurring bugs** entry: storing a bare (unbound) `fetch`
reference on `this` for later invocation throws "Illegal invocation" in a real
browser, is swallowed silently by a `.catch(() => null)` written for a
different purpose, and is invisible to any node-tier test that always injects
its own `fetchImpl` — this class of bug needs the browser truth tier (or an
explicit unbound-call test) to be caught at all. See
`docs/prompts/REVIEW_AGENT.md`, "Recurring bugs to check", new 2026-09-09
entry.

## Verdict

**APPROVE.** Merged (fast-forward) into `integration` and pushed.
