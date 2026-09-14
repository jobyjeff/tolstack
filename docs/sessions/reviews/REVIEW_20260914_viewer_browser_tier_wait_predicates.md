---
type: review
handoff: docs/sessions/active/HANDOFF_20260911_viewer_browser_tier_wait_predicates.md
reviewer: agent
date: 2026-09-14
verdict: APPROVE
blockers: 0
---

# Review — viewer_browser_tier_wait_predicates

Branch `handoff/viewer_browser_tier_wait_predicates` (2 commits, `cca3312`
+ `40ef958`), merged into `review/viewer_browser_tier_wait_predicates` with no
conflict (`integration` had moved by one board commit, `a1c1513`, which touches
nothing this handoff does).

Diff: `scripts/run_viewer_browser_tests.mjs` (+51/−13), the overlay
`docs/prompts/REVIEW_AGENT.md`, and one new lesson. Scope fence honoured —
nothing under `apps/viewer/topology_app.js` or `apps/annotate/`, which the two
parallel handoffs own.

## The mandatory stack checks (1–7)

**Not applicable — this work is not a tolerance stack, a topology/study, or a
spec-library parse event.** It edits one browser-test runner and two documents.
No `source_ref`, no element, no `fold()` term, no `lmc`/`mmc`, no check verdict,
no traced/inferred/untraced value is created, moved or read by this diff
(`git diff integration...HEAD` touches three files, none of them under
`docs/tolerance_stacks/`, `docs/topologies/`, `docs/spec_library/` or
`data/`). Recorded explicitly rather than skipped silently. The
traced-ratio guard and every other doc scan ran as part of the suite below and
are green; the diff adds no count-shaped prose to a live document.

## What I verified

### The three fixes were observed failing — all three, both directions

The deliverable here *is* a check, so green proves nothing. I re-forced each
transient with throwaway harnesses (repo-root static server, same shape as the
runner's own `startRepoRootServer`), independently of the author's:

| fix | forcing condition | OLD predicate | NEW predicate |
|---|---|---|---|
| D1 `testServedModeBoot` | `/data/projections/viewer/*` delayed 1500 ms | resolves **t+106 ms** on `.banner--disconnected`, sub-check **FAIL on correct code** | resolves **t+3473 ms**, banner absent, **PASS** |
| D1, stuck boot | projection 404'd | resolves t+118 ms, FAILs as a *banner sighting* | **times out at 8 s** naming `tr.tvrow` — the honest failure |
| D2 `testAnnotateFlyout` | `page.route("**/apps/annotate/*.js", abort)` — banner never written | resolves **t+101 ms**, samples `""`, **FAIL** | **times out at 8 s** |
| D2, normal boot | — | t+245 ms, correct text | t+108 ms, same text, **PASS** |
| D3 `testRebuildAffordance` §3 | projection 404'd — no connected banner ever rendered | `#banner` + 200 ms sleep resolves t+286 ms, `.banner__stale` count 0 → **passes vacuously** | `.banner__built` **times out at 8 s** |

That last row is the one worth keeping: the third instance the sweep found was
an absence check that could only ever have failed *to* fail, and the replay
shows it did exactly that.

The author's harnesses were throwaway and uncommitted; mine were too (deleted
before commit). The reproduction recipe is now in the overlay so the next
reviewer does not rebuild it from scratch.

### The mechanism, from the code rather than from a run count

- **D1.** `topology_app.js` `init()` never calls `render()` directly; the
  `VA.probeAnnotateMount(...).then(...)` callback does, concurrently with
  `chooseAdapter`'s transport probe — confirmed at `topology_app.js:137–144`.
  So the connect-folder banner is a real early paint, not just first paint, and
  the lesson's correction of the issue's own diagnosis is right. `paint()`
  renders the banner and then the grid in **one synchronous call**
  (`topology_app.js:680–…`), and `state.connection` is set to `READY` before
  `load()` is awaited, so `tr.tvrow` present ⇒ the banner beside it is the
  settled one. The wait is now strictly stronger than the assertion.
- **D2.** `waitForFunction` makes the wait and the sample the same read, so no
  paint can slip between them. Same-origin access holds because
  `startRepoRootServer` serves both apps off one origin.
- **D3.** `.banner__built` is appended inside `renderBanner`'s READY branch
  (`views/banner.js:41`) *before* `provenance()` appends `.banner__stale`
  (`:106`), in the same synchronous function. `VA.builtLine` always returns
  non-empty text, so the span is always `visible` — which matters, because
  `waitForSelector` defaults to `state: "visible"`.
- The lesson's general rule ("wait on a render product, never on markup") holds
  mechanically: `views/banner.js`, `views/cards.js`, `views/crop.js` and
  `views/topology.js` contain **zero** `await` / `.then(` / `setTimeout`
  between them, and each render does `VA.clear(root)` → set className → fill.
  `#banner` is static markup in both `apps/viewer/topology.html:18` and
  `apps/annotate/index.html:16`. Both claims verified rather than read.

### Deliverable 3's sweep, re-derived by behaviour

I enumerated every wait in the runner independently (`grep -n "waitForSelector(|
waitFor({|waitForTimeout(|waitForFunction("`) rather than reading the lesson's
list. Results agree with the author's on every point but one:

- **Disjunctions:** exactly one left, `'[data-nav-kind], tr.tvrow'` at
  `testIndexRedirects`. Sound as the lesson says — both branches are settled
  renders and the assertions are on `page.url()`.
- **`waitFor({ state })`:** **zero** remain. The seven `waitForSelector(...,
  { state: "visible" })` calls the lesson lists (lines 476, 490, 769, 802, 811,
  1484, 1499) are exactly the seven that exist, and all wait on
  `.hovercard--*` / `.croppop--*` render products.
- **`waitForFunction` at line 1636** (`window.__lastTrace !== undefined`) is a
  fourth candidate for the shape and is **sound**: `apps/annotate/app.js` calls
  `setBanner(...)` at `:213` and assigns `window.__lastTrace` at `:224`,
  synchronously in that order, so the `#banner` text sampled after it is
  already written. Worth recording because it looks like the same trap.
- **The nine sleeps:** eight carry a positive anchor as claimed. The ninth does
  not — see the should-fix below.

### Suites

- `venv-win/Scripts/python.exe -m pytest -q` in the review worktree:
  **768 passed, 1 skipped** (the skip is `test_viewer_js_suite.py:55`'s node-fs
  tier, absent `data/`). Re-run green after my inline fixes.
- The skipped tier run explicitly against the main checkout:
  `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` → **283/283,
  `[real]` tier RAN** (not the skipped-tier green).
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`:
  **16/16**, twice — once on the merged branch as handed over, once after my
  inline fixes. The two named sub-checks pass (`served mode` 11/11,
  `annotate flyout` 14/14), as does `rebuild affordance` 7/7.
- `git log --oneline HEAD..master`: **empty** — nothing landed on trunk under
  this review.

### Hygiene

- **No `data/` pollution.** `data/projections/viewer/*` in the main checkout
  still stamped 2026-09-11 17:51 after all runs; no stray
  `workspacetolstackdata`-shaped directory; both checkouts clean apart from the
  long-known untracked `tests/debug_topology_real_render.mjs` (2026-09-09,
  already noted by three prior reviews — not re-filed).
- **No projection rebuild needed or done.** The diff writes no projection and
  the browser tier reads the shared one read-only.
- **drawing-checker untouched** — no path in the diff is under it, and no
  citation, run id or export is created or read.
- **Line endings / whole-file reformat:** `git diff -w --stat` equals
  `git diff --stat` (51/13), the blob is LF in the index with CRLF working
  copies as the rest of the tree, zero NUL bytes. The lesson's own CRLF warning
  was heeded.
- **No harness residue** (`</invoke>`, `</content>`, `<parameter`, `{{`) in any
  created or edited file.
- Both source issues correctly left at `status: triaged` — `resolved` is
  triage's to set.

## Findings

### Should-fix (1) — filed, not fixed

**The sweep's ninth sleep does not carry a positive anchor.**
`scripts/run_viewer_browser_tests.mjs`, `testHeightBudget`'s compact-density
block: `#density-toggle` click → `waitForTimeout(50)` → `push("leaders stay on
their dots and seams at compact density", (await correspondence()).drift.length
=== 0)`. `correspondence()` measures leader endpoints against row boxes from the
**live DOM**, so it re-derives whatever row height is on screen and holds at
comfortable density too. A density toggle that silently stopped working leaves
that sub-check green. Not one of the two shapes the handoff was scoped to (it is
a sleep, not a weak predicate), so correctly out of scope for the fix — but the
lesson's deliverable-3 finding 4 claimed all nine were anchored, which is the
"an example list reads as exhaustive" shape this overlay already tracks.

Filed as
`docs/issues/ISSUE_20260914_compact_density_correspondence_check_has_no_positive_anchor.md`
(type bug, priority low), with the suggested fix (read a `tr.tvrow` box height
before/after and require it to shrink, which also retires the sleep).

### Fixed inline (2) — stated, not silent

1. **`scripts/run_viewer_browser_tests.mjs`, the D2 comment.** It justified the
   `contentDocument` read with "the iframe is same-origin (what the check above
   it proves)". The check above reads the iframe's `src` **attribute**, which is
   readable cross-origin and proves nothing about origin. Rewritten to name the
   real reason: `startRepoRootServer` serves `apps/viewer` and `apps/annotate`
   off one origin. Comment only, no behaviour change.
2. **The lesson's deliverable-3 finding 4**, narrowed from "the nine sleeps" to
   "eight of the nine", with a dated correction blockquote naming the exception
   and pointing at the issue above. Matches this repo's standing practice for a
   measurably-false claim in a shipped document.

### Nits (2) — not fixed

1. **The sub-check name `[real] the connect-folder banner never appears` now
   overstates what it measures.** By design the check samples only the settled
   state, and the transient disconnected paint is legitimate — so "never" is no
   longer literally what is asserted. Deliberately left alone: that string is
   the title of
   `ISSUE_20260911_served_mode_connect_folder_banner_check_is_flaky.md` and
   renaming it costs the grep trace back to the issue. The comment directly
   above it states the scope correctly.
2. **The lesson's line-number references mix pre- and post-edit numbering** —
   the seven `{ state: "visible" }` lines are post-edit, the nine sleeps'
   `~919–1205, ~1621` are pre-edit. All are prefixed `~` and all resolve; worth
   knowing only if a reader tries to use them as exact addresses.

## Note for the next reviewer

`handoff/annotate_load_gate_settles_on_failure` is in flight against
`apps/annotate/app.js` and `index.html`. It reorders when the annotate boot
writes its banner but not the text (`/Connect folder|File System Access/` still
matches), so D2's `waitForFunction` — which resolves on the **first non-empty**
banner text — should be unaffected. Its reviewer merges after this one and will
re-run the browser tier on the combined tree; if that sub-check moves, this is
where to look. That handoff's own review will also edit
`docs/prompts/REVIEW_AGENT.md`, so expect a textual conflict in the overlay's
recurring-bugs list and merge it additively.

## Verdict

**APPROVE.** 0 blockers. Merged to `integration`.
