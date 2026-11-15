---
type: review
handoff: docs/sessions/active/HANDOFF_20261112_the_walk_reads_the_merged_page_against_jeffs_november_notes.md
reviewer: agent
date: 2026-11-15
verdict: APPROVE
blockers: 0
---

# Review — the_walk_reads_the_merged_page_against_jeffs_november_notes

The deliverable is a walk, not a stack. The overlay's seven mandatory stack
checks do not apply: no stack, topology, hardware or spec data changed. What
changed: two CSS lines (`apps/viewer/topology.css`), the review page and 34
shots, four issues, a lesson, and a hand-run driver
(`tests/debug_walk_merged_page_20261114.mjs`). All arrived as `A`, except the
CSS file, so nothing overwrote an earlier record. This is the first run of this
handoff, and the branch was not merged before this review.

## What I verified

- **DoD: every behavioural sentence has a row, and every row has a shot.** I
  read both notes in full (`20261112T114449_f3anmp`, `20261109T222516_f7jdsi`)
  against the 48 rows. Each behavioural sentence has a row. The rest are
  questions, plans or design musings: "next steps?", the per-model page,
  merging the tree into the grid, decomposing 215177/215175 later. Every shot
  the page, the lesson and the four issues cite exists in the shots folder.
- **Verdict counts re-derived: 31 does it · 11 partly · 6 does not.** Counted
  from the table: does not = rows 1, 4, 28, 34, 40, 48. Partly = rows 2, 3, 5,
  13, 15, 20, 21, 26, 38, 41, 47.
- **Shots read against their claims.** Shot `01_grid_landing_v2`: the hub
  214373-002 is two brackets in `ground`. The mount, gas-spring mount and pitch
  plate are one bracket each, so H names only the hub, and that is right.
  `07b`: the DAG has no fold control. `19`: the toast says 215175-001 and the
  tree says 215175-002. `27`: a middle-click gives "Pick an element on the left
  to bind this face to." `12b`→`12c`: the black chord fill becomes the body
  tint.
- **Which server the shots came from** (the overlay's 8000-is-trunk entry).
  The page says so at the top: a private server over `integration` `273177f2`.
  The claim "121 commits behind" re-derives: `git rev-list --count
  master..273177f2` = 121, and the main checkout is on `master`.
- **The fix.** `.rail__bar` and `.rail__barhit` take `fill: none`. The base
  rule now says what `.rail__bar--chord` (line 871) already said for tagged
  chords. Hits stay `pointer-events: stroke` on the hit line. Two lines, within
  the handoff's one- or two-line allowance, and listed with its commit.
- **The driver.** It takes the browser slot (`takeTheBrowserSlot`), binds
  127.0.0.1, and writes only under `<root>/data/inbox/feature-identity` and
  `<root>/data/projections`. The default root is the main checkout's gitignored
  `data/scratch/walk1114`. No `chromium.launch` outside the helper.
- **Issues.** All four carry valid frontmatter, with `found_by:` and no
  `handoff:`. `audience: strategy` is set only on the tree-requests issue,
  which needs decisions. The lesson also cites
  `ISSUE_20261114_the_dag_draws_no_nested_outline…`, and that file is on
  integration.
- **Lesson.** The test record matches what I measured on the merged tree: 1
  failed (the worktree red), 1986 passed, 1 skipped.

## Tests

- **Tactical record:** default pytest, the two fast node tiers and doc scans
  were recorded, with counts, in the worktree. Benefit of the doubt given.
- **Pre-merge risky subset** (`apps/viewer/` CSS row): `pytest
  tests/test_app_type_scale.py tests/test_js_python_vocabulary.py
  tests/test_viewer_readme_doc_facts.py tests/test_viewer_deep_link_contract.py`
  gave 23 passed. `node apps/viewer/run_tests.cjs --repo
  C:/workspace/tolstack/data/scratch/walk1114` gave 699/699, with `[real]`
  armed. `node apps/annotate/run_tests.cjs` gave 316/316.
- **Post-merge, review worktree, merged tree (`01295429`):**
  - Default pytest, `C:/workspace/tolstack/venv-win/Scripts/python.exe -m
    pytest -q -p no:cacheprovider`: 1 failed, 1986 passed, 1 skipped, 2
    deselected in 480 s (ledger: inside budget). The one failure is
    `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`, the
    documented worktree red; the `--repo` run above covers it. This repo's
    conftest prints no contention header lines. xdist is not installed, so the
    run is single-process.
  - Browser tier, `node scripts/run_viewer_browser_tests.mjs --repo <scratch
    root>`: 44/44 suites green, 1586 s. It recorded its own merge ledger row,
    inside budget. One SKIP (the live study has no gap row) predates this
    change.
  - Witness gate, `--changed-since integration`: 1/1 witnessed,
    `browser__every-dag-bar-is-one-ink-and-two-weights-and-only-a-gap`, in
    397 s, recorded by hand. 31 topology.css entries are outside the hunk
    window and left to the sweep.
- The main checkout's `git status` was clean before and after. The walk's
  binds went to the scratch log only.

## Findings

No blockers, no should-fix.

**Nits** (not fixed, need no issue):

1. `ISSUE_20261114_small_findings_of_the_merged_page_walk.md` lists row 10
   before row 9, and the review page cites the rows by number (S10). Harmless.
2. In the driver, the `/fs/` write gate is a prefix test on the raw `p`
   parameter. A `data/inbox/feature-identity/../..` path would pass. The
   server is hand-run, bound to localhost, and called only by the page under
   test.
3. `topology.css:871` (`.rail__bar--chord, .rail__barhit--chord { fill:
   none; }`) is now redundant with the base rule. Left as is.
4. Row 23 walked the grid at 3840 and 5120 only, as the handoff asked. The
   half of Jeff's sentence about where the scrollbar sits on a smaller monitor
   was not exercised.

## Overlay

Added a **Recurring bugs** entry: an SVG `<path>` with no `fill` rule fills
black. The new failure class this walk found was invisible to every tier
because it shows only when lit.

## Inline fixes

None.
