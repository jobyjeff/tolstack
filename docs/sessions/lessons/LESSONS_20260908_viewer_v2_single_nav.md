# LESSONS 2026-09-08 — viewer_v2_single_nav

Handoff `docs/sessions/active/HANDOFF_20260908_viewer_v2_single_nav.md`, built on
`viewer_consolidation` + `dag_viewer_vertical_budget`. Retired the TOPOLOGY/STUDY
`<select>` pickers and the flat stack rail into one nav tree, demoted the totals
panel and the legend out of the DAG pane's flex column, and turned the
provenance-alarm block into a one-line badge. Scope held to `apps/viewer/` and
its two test tiers, per the handoff.

## 1. The new layout contract, in numbers

Measured with the shared screenshot rig described in §5, mock fixture, a study
selected, the strongest provenance alarm forced, 1400×900 viewport:

| | before (viewer_consolidation) | after |
|---|---|---|
| `.tv__scroll` (DAG pane) height | 260px (29% of viewport) | 554px (62% of viewport) |
| chrome above the pane | topbar + banner (alarm expanded) + picker row + always-open legend | topbar + banner (alarm collapsed to one line) + toolbar strip |
| totals | up to 260px panel, own scrollbar | slim strip, one line, `Details` for the rest |

`scripts/run_viewer_browser_tests.mjs`'s `testHeightBudget` now asserts the
pane's height is more than half the 900px viewport, both against the mock
fixture and (with `--repo`) against the real `pitch_system` with a study
selected — not a row-count floor. The 10-row `min-height` floor
(`dag_viewer_vertical_budget`, 2026-09-04) is **retired outright**, not
raised: with the picker, the flat rail and the always-open legend gone, and
the totals panel capped to one line, the remaining chrome (topbar, a
one-line banner, a toolbar strip) is small and roughly constant regardless of
how bad the provenance alarm or how long a study's `notes` are, so the pane
gets the majority of the viewport by construction rather than by a floor
fighting unbounded chrome for room.

## 2. The nav tree's contract for covered / loose / classic stacks

`VA.navTree` (`topology.js`) is a thin wrapper, not new logic: it reads
`VA.looseStacks` and a new `VA.topologyCoveredStackIds` (the per-topology
half of what `VA.stacksCoveredByTopology` already computed globally — I
refactored the global one to be built FROM the per-topology one, so the
`crop_key.stack` extraction rule lives in exactly one place, not two) and
produces `{ topologies: [{ id, title, studies, coveredStacks }],
looseStacks: [...] }`. `views/nav.js` renders that directly: **every
classic-only stack is a top-level leaf** (siblings of the topologies), and
**a stack a topology also re-expresses is nested as a child of that topology**,
alongside its studies — not a second top-level leaf, and not a chip bolted
onto a flat list the way `viewer_consolidation`'s `markCoveredStacks` did it.
The handoff's escape valve ("in whatever form fits the tree") explicitly left
this choice open; nesting was the one that needed no second index and reused
"children of a topology" for both studies and the covered stack alike. The
one committed case (`stack_vpa_output_to_pitch_plate.json` under
`vpa_output_to_pitch_plate`) is covered by both test tiers: the fast tier's
`VA.navTree` unit test and the browser tier's real-projection pass both
reach it, and its own authored `checks` block (the fact
`LESSONS_20260904_viewer_consolidation.md` §1 already found has no field in
the topology projection at all) stays one click away rather than a page away.

## 3. Every nav row carries `data-nav-kind` / `data-nav-id`, and that decision
paid for itself immediately

`views/nav.js` stamps `data-nav-kind="topology|study|stack"` and
`data-nav-id="<id>"` (plus `data-topology-id` on a study row) on every row.
Nothing in the fast tier needs it — those tests call `VA.renderNavTree`
directly and read text/class. But the browser tier does: the old dropdowns
had a native browser API (`page.selectOption("#study-select", id)`) that
never depended on the option's visible label; a nav tree's rows have no such
API, and matching on visible text would have meant matching against
`(status === "error" ? "⚠ " : "") + s.title` — prose the next handoff can
reword. Writing the attribute once in the source and using
`[data-nav-kind="study"][data-nav-id="..."]` everywhere in
`scripts/run_viewer_browser_tests.mjs` turned out to be less code than the
old `page.selectOption` calls it replaced, not more.

## 4. `onNavStudy` needed a topology id the old `<select>` never had to carry

The retired study `<select>` only ever listed the CURRENTLY-selected
topology's own studies, so its handler only ever needed a study id — the
topology was implicit. The nav tree can be clicked into a study belonging to
a DIFFERENT topology than the one on screen in one click (nested under that
other topology's own subtree), so `topology_app.js`'s `onNavStudy(topologyId,
studyId)` takes both and calls `selectTopology(topologyId)` first if it
differs from the one already open. Easy to miss if you copy the old
`onStudy(id)` signature verbatim — I caught it only because the fast-tier
test I wrote for "clicking a study row" asserted on BOTH ids reaching the
handler, not just the study's.

## 5. Dialogs, not `<details>`, for the legend and the worksheet

Both "How to read the rails" and the worksheet moved into `<dialog>`s
(`#legend-dialog`, `#worksheet-dialog`) rather than staying `<details>`
elements repositioned elsewhere. A `<dialog>` opened with `showModal()` sits
in the browser's own top layer, entirely outside `.tv`'s flex column, so
opening either is now STRUCTURALLY incapable of shrinking the DAG pane —
there is no CSS rule anywhere that could regress this back into a layout
fight, which a repositioned `<details>` could not have guaranteed. The two
follow the same tiny pattern: a topbar button calls `.showModal()`, the
dialog's own close button calls `.close()`, and (worksheet only)
`state.showWorksheet` is kept in sync via the dialog's native `close` event
so an Escape-key or backdrop-click close (both close a `<dialog>` without
going through the app's own code) doesn't leave the label stale. Switching
between topology and stack mode now also force-closes whichever dialog
belongs to the mode just left (`render()`), so a nav click while the legend
is open doesn't leave it sitting open over the elements table.

The `<dialog>` element needed nothing from the DOM shim (`run_tests.cjs`
never calls `showModal`/`close` — `topology_app.js` isn't loaded into the
fast-tier sandbox at all, same as before this handoff) so this cost zero
fast-tier plumbing; it is exercised only by the browser tier, which supports
it natively.

## 6. The banner badge keeps the alarm DETECTION unchanged and only touches
the rendering

`VA.provenanceAlarms` (`viewer.js`) is untouched — same four checks, same
returned sentences, still readable in full by anyone who expands the badge.
Only `views/banner.js`'s `provenance()` changed: the always-expanded
`<div class="banner__stale">` became a `<details class="banner__stale">`
with a plain-words `<summary>` ("Data is older than the latest code — needs
a rebuild") and the old headline / alarm list / `<code>` rebuild commands
moved into the `<details>` body. The class name `.banner__stale` and the
`.banner__stale-list`'s own height cap (`topology.css`, scoped there) both
survive unchanged, so this was a smaller diff than it might look.

## 7. Known pre-existing failure, NOT caused by this handoff

`node apps/viewer/run_tests.cjs --repo C:\workspace\tolstack` fails one
real-data test: `[real] the pitch system's four forks are marked` (expects 4
branch points, gets 5). This is the shared `data/projections/viewer/` being
rebuilt by another concurrent tree while this session ran (the handoff's own
baseline note: `linear_stack_conversions` runs in parallel and may touch
`docs/topologies/`) — `data/projections/viewer/topologies.json`'s own
provenance stamp shows `built_at: 2026-09-09T00:04:04Z`, branch `master`,
clean, which post-dates this session's start and is not a tree this branch
produced. Confirmed unrelated to this handoff's code: nothing in
`views/topology.js`'s branch-marking logic (`row.branch`, `dot--branch`,
`tvrow--branch`) changed this session, and `scripts/run_viewer_browser_tests.mjs`'s
own real-projection pass (43/43, `--repo`) does not hit this hardcoded count
at all and is fully green. Not filed as an issue — it is exactly the kind of
transient cross-worktree data race `ISSUE_20260806_concurrent_worktrees_
clobber_the_shared_viewer_projection` and this repo's own `CLAUDE.md` already
document, and will resolve itself once whichever tree's topology edit lands
and the shared projection is rebuilt from it.

## 8. Everything that moved, and where

| capability | before | after |
|---|---|---|
| pick a topology | `#topology-select` | click the topology's own nav row |
| pick a study | `#study-select` (current topology only) | click the study's nav row, anywhere in the tree |
| pick a stack | `#stacklist` rows (flat) | click the stack's nav row (top-level leaf if loose, nested under its topology if covered) |
| "also a topology" marker | an extra chip on the flat stack row | the covered stack is a CHILD of its topology in the tree; its own chip now reads "classic view" and points the other way (from the nested row toward "this is also a topology"'s check) |
| layout mode / row density / annotate link | `#picker` (shared row with the two selects) | `#toolbar` (topology mode only), same ids (`#layout-toggle`, `#density-toggle`) |
| "how to read the rails" | always-rendered `<details class="tv__legend">` | `#legend-dialog`, opened from a topbar button |
| worksheet | `<details id="worksheet-wrap">` below the elements table | `#worksheet-dialog`, opened from the same topbar button (stack mode only) |
| totals | up to 260px panel (`.tvtotals__grid` of boxes) | one-line strip of chips (`.tvtotals__strip`), rule + notes behind `.tvtotals__more`'s `Details` |
| provenance alarm | always-expanded block | one-line badge, `Details` on expand |

Nothing on this list lost a capability — every item above is still reachable,
just relocated. No escape valve was needed this session (unlike
`viewer_consolidation`, which nearly dropped the covered stack's own check —
see §2 for how this handoff kept that fixed rather than re-breaking it).

## 9. Verification

`node apps/viewer/run_tests.cjs` (158/158) and `[--repo C:\workspace\tolstack]`
(198/199, the one pre-existing failure in §7);
`venv-win\Scripts\python.exe -m pytest -q` (681 passed, 1 skipped);
`node scripts/run_viewer_browser_tests.mjs` (9/9 suites) and
`[--repo C:\workspace\tolstack]` (9/9 suites, including the real-projection
pass and the real-`pitch_system` height-budget check).

Before/after screenshots (1400×900, mock fixture, a study selected, the
disagreeing-tree provenance alarm forced — the same worst-case chrome
`testHeightBudget` exercises): rendered with a throwaway Playwright script
(not committed) serving the pre-handoff `apps/viewer/` — extracted read-only
via `git show HEAD:apps/viewer/...` into a scratch dir, nothing in the
worktree touched — beside this branch's own. Not committed (scratch
artifacts, per this repo's own convention for prior sessions' screenshots):
`%TEMP%\claude\...\scratchpad\before.png` (260px pane) and `...\after.png`
(554px pane), same session, same machine. Re-run the same recipe to
reproduce: swap `?legendOpen: true` for the before root only (the legend is a
`<details>` there) and select `demo_base_to_tip` either via `#study-select`
or a `[data-nav-kind="study"]` row depending on which tree is being shot.

## 10. Gotchas for the next agent

- **`npm install` in the worktree**, same as the two prior viewer handoffs:
  `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install` — `node_modules/` is
  gitignored per-worktree, `package.json` is tracked.
- **A path passed to the browser test tier's tiny static server must be
  `path.normalize`d before the containment check runs.** I hit this writing
  the before/after screenshot rig: passing a forward-slash root on Windows
  and comparing `full.startsWith(root + sep)` against a `path.join`-produced
  (backslash) `full` fails silently as a 403, which Chrome reports as the
  unhelpful `net::ERR_HTTP_RESPONSE_CODE_FAILURE` with no body to read.
  `scripts/run_viewer_browser_tests.mjs` itself already normalizes `APP_DIR`
  at the top of the file — the trap is only real if you write a second,
  throwaway server the way I did for the screenshots.
- **`CSS.escape` is a browser global, not a Node one.** The existing
  `alignmentDrift` helpers run inside `page.evaluate(() => ...)`, so they can
  use it; a helper that builds a selector STRING outside `page.evaluate` (my
  new `navRow(kind, id)`, which the test file calls from Node before ever
  reaching the browser) cannot, and fails with a bare "CSS is not defined" —
  no line number pointing at the real cause since it is a ReferenceError, not
  a Playwright error.
