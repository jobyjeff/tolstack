---
type: review
handoff: viewer_consolidation
reviewer: agent
date: 2026-09-04
verdict: APPROVE
blockers: 0
---

# Review — viewer_consolidation

Handoff: `docs/sessions/active/HANDOFF_20260904_viewer_consolidation.md`
(read from the main checkout; see the filed issue below about why that file
is not reachable from this review branch's own lineage). Not a tolerance
stack — the stack-provenance mandatory checks (1–7) do not apply. This is a
viewer HTML/CSS/JS consolidation, so the relevant checklist is the overlay's
"Recurring bugs"/"Architectural errors" entries plus the universal checks.

## What I verified

- Read the handoff and the tactical lesson
  (`docs/sessions/lessons/LESSONS_20260904_viewer_consolidation.md`) before
  merging.
- Confirmed the pre-merge baseline: `node apps/viewer/run_tests.cjs` on
  `integration` (with `dag_viewer_vertical_budget` already in) was
  **143/143 passed** (1 skip: no real projection in the worktree, as
  expected).
- Fast-forward merged `handoff/viewer_consolidation` (`35c9579`) into this
  review branch — no conflict, three commits (grid table conversion, the page
  consolidation, the same-day stack-nav correction).
- **Full diff read**, every touched file: `apps/viewer/index.html` (redirect
  stub), `apps/viewer/app.js` (deleted), `apps/viewer/topology.html`,
  `apps/viewer/topology.js`, `apps/viewer/topology_app.js`,
  `apps/viewer/topology.css`, `apps/viewer/views/topology.js`,
  `apps/viewer/tests.js`, `scripts/run_viewer_browser_tests.mjs`,
  `apps/viewer/README.md`, root `README.md`. Confirmed by `diff --stat` that
  `views/stack.js`, `views/detail.js`, `views/crop.js`, `views/worksheet.js`
  and `vendor/markdown.js` were **not touched** — the lesson's "byte-for-byte
  reuse" claim holds; the retired stack viewer's rendering logic moved houses,
  it did not get rewritten.
- **Scope held.** No change to `scripts/build_topology_projection.py`,
  `scripts/build_viewer_projection.py`, any stack/topology JSON schema, or
  anything export-shaped that would step on the parallel
  `stack_export_tabular` handoff.
- **The escape valve, checked against the actual diff, not just the lesson's
  telling of it.** The three-commit history shows the covered-stack filtering
  bug (§1 of the lesson) really happened and really got corrected in the third
  commit (`793333b`) — `renderStackNav` lists every stack, `markCoveredStacks`
  only adds a chip. This is exactly the kind of silent-capability-loss trap
  the handoff's own escape valve exists to catch, and it's now also a
  standing entry in this repo's overlay (see below) since nothing in the test
  suite would have caught it — no test asserted the covered stack's `checks`
  block was reachable before the third commit; the author caught it by
  re-reading the handoff's own wording.
- **The Excel-paste claim, methodology checked, not just the conclusion.** The
  lesson's clipboard verification (Range API + `execCommand("copy")`, reading
  `text/plain` as tab-separated and `text/html` as a real `<table><td>`
  fragment) is what Excel's paste actually reads; Excel itself was not opened,
  and the lesson says so plainly rather than overclaiming. Table markup itself
  confirmed by reading `views/topology.js`'s `header()`/`grid()` — real
  `<table>`/`<thead>`/`<tbody>`/`<tr>`/`<th>`/`<td>`, not styled divs, with one
  `COLUMNS` array driving both tables' widths (checked: no second
  hand-aligned copy of the widths in the CSS — `topology.css`'s `.tvcol--*`
  rules are keyed off the same class names `colgroup()` emits).
- **The four-cause row-height regression, read against the code, not taken on
  faith.** Each of the lesson's four fixes has a corresponding, narrowly-scoped
  rule in the diff: `.tvcell__chipswrap .crop-trigger` (cause 1, not touching
  the shared `.crop-trigger` rule), `Math.max(1, M.rowHeight - 2)` inline
  line-height on every row (cause 2), `.tvcell__chipswrap { flex-wrap: nowrap
  }` (cause 3, reverted from a `wrap` the diff shows was tried), and
  `.tvheadtable, .tvtable { border-collapse: separate }` plus `.tvcell {
  border-bottom: none }` (cause 4). None of these leaked into a shared rule
  that any other table in the app uses (`grep` for `.tvcell`/`.tvcol`/
  `.tvheadtable`/`.tvtable` confirms they are all scoped to this page).
- **The "observed failing" universal check, done myself.** Broke
  `edgeCropTrigger`'s `if (!edge.crop_key) return null;` guard (changed to
  `if (false) return null;`) and re-ran the fast tier: it went from 150/150 to
  138/150, including the exact test named for this
  ("a thumbnail trigger sits on the row for every crop-key'd edge, and on no
  others") plus a cascade of others (an uncaught `TypeError` from
  `edge.crop_key.stack` on `undefined` aborts the rest of that test file's
  run — a real signal, if a noisier one than a single clean failure). Reverted
  (`git checkout --`) and confirmed 150/150 again, working tree clean.
- **Tests, re-run myself, both checkouts:**
  - Worktree, mock/fixture data: `node apps/viewer/run_tests.cjs` →
    **150/150 passed** (up from the pre-merge 143; 7 new tests, `[real]` tier
    skipped as expected).
  - Worktree, resolving real data via `--repo`:
    `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` →
    **191/191 passed**, `[real]` lines present (tier actually ran, not
    silently skipped — checked per this repo's own recurring-bug entry).
  - `venv-win/Scripts/python.exe -m pytest -q`, run from **this worktree**
    with the main checkout's interpreter by absolute path (not by `cd`-ing
    into the main checkout, which would test *that* checkout's own branch
    state instead of this one — caught myself doing this the wrong way once
    before redoing it correctly): **576 passed, 1 skipped** (the one skip is
    the same node-fs-tier-has-no-projection-in-a-worktree skip this repo's
    overlay already documents as benign).
  - `node scripts/run_viewer_browser_tests.mjs` (mock data,
    `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install` needed first, per the
    lesson's gotcha #7) → **9/9 browser checks passed** (149/149 + 149/149
    suite, 2/2 + 2/2 index-redirect, 29/29 + 29/29 app, 19/19 + 19/19
    topology, 5/5 height-budget).
  - `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`
    (real projection) → **9/9 browser checks passed**, topology mode's tier
    rising to **34/34** (the `[real]` sub-checks ran).
  - `data/` in the main checkout: no changes (`git status --short data/`
    clean before and after).
- Confirmed `ARCHITECTURE.md`'s module inventory does not name `app.js` (so
  its deletion needs no inventory row removed) and does not need a new row for
  anything here (no new module, only a rename/merge of existing ones).

## Findings

**Nits (no issue filed — see rationale):**

- The new real-data browser-tier run (`--repo`) never literally clicks a
  `button.crop-trigger` inside the *topology grid* (deliverable 1's own
  thumbnail) against real data via Playwright — that click is exercised only
  against the mock fixture (`testTheTopologyPage`'s `base_thickness` check,
  before the `if (!realProjection)` branch). The mechanism itself (`VA.cropFor`
  → `showCrop`) is proven against real data by the fast tier's `[real] an L1
  edge reaches the stack element's own crop`, and the code path is identical
  between mock and real data (only the JSON differs), so I'm not asking for
  this — recording it in case a future thumbnail-specific regression manages
  to hide behind that gap.

**Out of scope (filed as an issue, not fixed here):**

- `ISSUE_20260904_board_move_commit_unreachable_from_integration.md` — this
  handoff's `board: viewer_consolidation staged -> active` commit lives only
  on `master` and is not an ancestor of `integration`, so the customary
  reviewer courtesy of moving the handoff file `active/ -> completed/` isn't
  possible from this branch without either inventing the file's content or
  reaching across to `master` (not mine to move). Not a defect in this
  handoff's own work — a dispatch/board-sync question, filed for whoever owns
  that.

## Overall verdict: APPROVE

No blockers. Merged (fast-forward, done above as part of verification) and
will push `integration`.

## Overlay updates

Seeded two new entries in `docs/prompts/REVIEW_AGENT.md`'s "Architectural
errors to check" section:

1. Converting a div-flex grid to a real `<table>` breaks row height for (at
   least) four independent reasons — a genuinely new failure class, since
   nothing in the overlay previously discussed table markup at all.
2. Retiring a page by filtering the merged view to "only what's new" can make
   an old capability unreachable — generalising the covered-stack trap this
   handoff's own author caught before I ever saw the diff, so the next
   reviewer of a similar consolidation knows to ask the question even when
   the tests are all green.
