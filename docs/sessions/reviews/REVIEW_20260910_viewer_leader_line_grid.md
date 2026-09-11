---
type: review
handoff: viewer_leader_line_grid
reviewer: agent (review/viewer_leader_line_grid)
date: 2026-09-10
verdict: APPROVE
blockers: 0
---

# Review — viewer_leader_line_grid

Two commits on `handoff/viewer_leader_line_grid` (`af6a0a9` + `e5a6981`),
fast-forwarded onto `review/viewer_leader_line_grid` (cut from `integration`
at `2e7b445`, which the handoff branch was also cut from — no conflict, no
concurrent `integration` movement during review; `HEAD..integration` empty at
verdict time). Scope holds: the diff touches only `apps/viewer/`,
`scripts/run_viewer_browser_tests.mjs`, one lesson and one issue — nothing in
the do-not-touch list (`views/banner.js`, `storage/`, `apps/annotate/`,
`scripts/build_*`, `docs/topologies/`).

## The seven mandatory checks

This is viewer plumbing, not a stack, so most exit — each stated with its
reason rather than skipped silently:

1. **Provenance of element values — N/A, verified no values moved.** No stack
   JSON, no topology document, no hardware entry changed. The projection
   builders are untouched; I rebuilt `data/projections/viewer/topologies.json`
   from the merged tree against the main checkout's data root and diffed —
   content identical to the prior build (only `built_at`/`provenance` moved),
   so the committed `[real]` test pins were made against the tree that ships.
2. **Signs on path terms — N/A.** No term list touched. The new JS arithmetic
   is layout geometry only (CSS pixels: `boundary × rowHeight`, lane x
   positions) — the documented false-positive class, not a second combiner.
   Grepped the diff for arithmetic on projection *value* fields: none.
3. **LMC/MMC direction — N/A.** No element fields read or written.
4. **RSS computed — N/A.** No check computation touched; the viewer still
   renders `results.json`/`topologies.json` numbers verbatim (`VA.fmt`
   unchanged).
5. **Nominal inside min/max — N/A.** No transcription touched.
6. **Quantised constraints — N/A.** No joint hardware in scope.
7. **Traced ratio — unchanged by construction** (no stack files in the diff);
   not restated anywhere in the new prose (checked the three new/edited docs).

## What was verified

- **Suites, re-run by me, not read from the report.** Fixture tier (worktree):
  193/193. Real tier (`--repo C:/workspace/tolstack`): 238/238 — the tier ran
  (45 `[real]` tests, not skipped). Browser truth tier
  (`node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`):
  13/13 check groups, both file:// and http modes, including the new
  `CORRESPONDENCE_IN_PAGE` measurements at both densities, both layout modes,
  after scrolling, over every real topology. `pytest -q` in this worktree:
  759 passed, 1 skipped (the documented data-dependent skip). Main checkout
  (`master`, post-merge): 750 passed, **1 failed** —
  `test_viewer_js_suite_is_green` on `crops (top level): the projection writes
  [by_topology, summary_topology, unresolved_topology]` fixture drift. That is
  the exact red the handoff's own header predicted ("the JS suite is red on
  master pins until [the batch-merge] lands"), and I verified the stated cause
  rather than copying it forward: master's `fixtures.js` lacks `by_topology`,
  integration's carries it, and the merged tree passes the same test against
  the same shared data (238/238 above). Master's lag, closed by the operator's
  due batch-merge; not this handoff's doing (it touches neither `crops.json`
  nor its builder). One more main-checkout observation for the record: an
  untracked `tests/debug_topology_real_render.mjs` sits there (another
  session's inspection scratch by its name; `tests/debug_*` are never run by
  pytest) — left alone.
- **The new guards observed failing, both tiers.** (a) Perturbed
  `leaderGeometry`'s grid-end y by 3px: the fixture-tier geometry test and the
  browser tier's correspondence check both went red, the browser tier naming
  each leader and the exact drift ("grid end off its seam by 3.00px"). (b)
  Replaced the internal-node predicate with `false`: seven fixture-tier tests
  red, all naming the omission rule. Both reverted; tree clean.
- **The internal-node predicate against the handoff's own spec.** "All
  adjacent edges carry the same part" — implemented as ≤1 distinct part over
  the *document's* adjacency (off-chain edges count), `null` (gap) a value,
  degree-1 internal, branch nodes eligible. Matches the handoff and Jeff's
  locked decision; no lasso or boundary overlay was built; the grouping gap
  that surfaced (split runs) was filed as an issue with valid frontmatter,
  exactly as the handoff pre-authorized.
- **The DoD's "one merged row per part" deviation is argued, filed and
  pinned.** The depth-first walk revisits parts, so the grid groups by
  contiguous run (18 runs / 12 parts on the real pitch system). Forcing one
  row per part would reorder the grid and cross the leaders — the deviation
  protects deliverable 3's correspondence contract, and
  `ISSUE_20260910_leader_grid_part_runs_repeat.md` routes the design question
  (`audience: strategy`).
- **Every structural count re-derived from live data by script**, not from
  the prose: 12 parts, 24 edge rows, 18 groups, 16 leaders, hub runs 3+4
  edges, jog zone exactly 106px, README's 45 layout slots × 16px = 720px. All
  reproduce. Also verified across all five topologies: no two leaders share a
  boundary seam and every leader rises (y2 < y1) — the structural claim the
  browser tier's bbox reading leans on.
- **No-crossing lanes argument checked**: lanes strictly monotone in walk
  order, both endpoint sequences monotone in y — sound, and asserted per
  leader in the fixture tier.
- **The `[real]` planMatch check is not vacuous**: it reads
  `VA.demoTopologyFixture()` *after* the tier swaps the real projection in
  over it (run_viewer_browser_tests.mjs:794), so it compares the rendered DOM
  against a plan over live data.
- **Thumbnails**: absent crop ⇒ no element at all (never a placeholder);
  resolved-but-unfetched ⇒ text trigger, never a broken `<img>`;
  `ensureThumbImages` cannot re-render-loop (cache + in-flight set checked
  before scheduling; failure caches `null`). All three states pinned in the
  fixture tier; the fetched-thumbnail upgrade exercised for real in the
  browser tier.
- **Row-height discipline**: the new crop cell reuses the clamp wrapper;
  group separators are inset box-shadows, not borders (the collapsed-border
  row-height trap, documented in place). The compact-density seam regression
  the lesson reports was caught by the browser tier the handoff itself
  extended — the tier does its job.
- **README**: layout-contract sections rewritten to match (row model,
  correspondence measurement, density figures, value-only toggle, module
  inventory row for topology.js). Heading diff against the pre-merge blob:
  only the two intentional renames, no silent section deletions. Legend no
  longer promises the removed `⑂` grid marker; no stale `⑂` reference
  survives in `apps/viewer/`.
- **Hygiene**: no whitespace re-emit (`git diff -w` ≈ `git diff`), no NUL
  bytes in tests.js, no `</invoke>`/`<parameter` harness residue in the two
  created files, `data/inbox/` untouched, nothing written to drawing-checker
  (no Python/pipeline surface in the diff; viewer JS only).
- **Sibling landings**: `HEAD..integration` empty; `HEAD..master` is board
  bookkeeping plus one strategy-brief edit, zero code — the ordinary
  trunk-lags shape.

## Findings

**Blockers: none.**

**Should-fix, fixed inline (disclosed):** the run-split enumeration was
incomplete in three places. Lesson, issue and README all explained "12 parts
but 18 contiguous runs" by naming hub (2 runs) and pitch_plate_215177_001 (3)
— every figure individually correct, but the residual doesn't close: 17
part-runs over 12 parts means five extra, and `gas_spring` and `blade_root`
also split (2 each; blade_root's two runs are *consecutive* — the
boundary-node-between-same-part-edges case the mini fixture pins, occurring
live). The issue file is the input to the very design decision it asks for,
so understating the split count there is the harmful copy. Fixed in all three
docs, and the two unstated splits pinned in the existing `[real]`
runs-per-part test (two `eq` lines — the same test already pins hub and
pitch_plate). Suites re-run green after the fix. New overlay entry appended
("an example list explaining a numeric excess reads as exhaustive").

**Nits: none worth carrying.**

## Note for the next reviewer

The staged `viewer_edge_length_scaling` handoff will reuse this keying — the
lesson's "what the scaling handoff has to change and what it must not" section
is accurate against the shipped code (node-side y from `VA.railY(layoutRow)`
inside `leaderGeometry`; grid-side y and `gridPlan` are functions of walk
order and parts only). Hold it to the lesson's own fence: the monotone-lane
no-crossing proof assumes node y preserves walk order; a scaling mode that
reorders nodes vertically needs the lanes rethought, not patched.
