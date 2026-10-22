# Lessons — mutation_tier_gates_on_every_pin_and_survives_a_board_move

## What changed, and the decisions the handoff left open

- **Cited handoff resolves across the board** (`tests/test_mutation_witnesses.py`,
  `cited_file_exists`): only a `HANDOFF_*.md` cited from one of the three board
  directories is resolved by file name; an issue or lesson still has to exist at the path written.
  README says to cite a lesson or an issue anyway (option 3).
- **Tier exit code** (`run_mutation_witness_tests.mjs`) filters on `pinsMoved`, prints each
  moved pin's own sentence and the `pinLine`.
- **Where the `ran ⊆ declared` check lives: the browser runner's tail**
  (`ranNotDeclared` in `guard_enumeration.mjs`, called from `run_viewer_browser_tests.mjs`).
  Reason: the runner already holds every name, the check costs nothing extra, and it fires on
  every browser run (including `--only`) rather than only at a batch merge. Collection seam: the
  runner printed only FAIL names, so a `RAN_NAMES` array is filled in `reportSuite` /
  `reportAbortedSuite` (pass and fail alike). Interpolated declarations are accounted for by
  turning the template into a regex.
- **The check found a real scanner defect on its first run**: 13 names read truncated, because
  a name continued with the OTHER quote kind (`"a " + \`b ${x}\``) was not closed by `SEAMS`.
  `declarationsIn` now consumes `+ <literal>` continuations. The browser pin moved:
  `enrollable 533 -> 532` (the "alert mark is DRAWN" name was always interpolated) and the names
  digest `db4f37549135 -> b923ff051dda`; declared stays 565. No spec was lost (all three
  names had `spec: null`).
- **Annotate gate**: `tests/test_annotate_js_suite.py` reuses the viewer wrapper's `_skipped_tiers`.
  It applies the same rule, but is **green in a worktree**, because the annotate runner falls
  back to the main checkout's `data/` itself and so never reports SKIP. Filed:
  `docs/issues/ISSUE_20261022_the_annotate_real_tier_reads_the_main_checkout_from_a_worktree_with_no_staleness_check.md`.
- `CENSUS_LIMITS` prose that said the annotate tier had no gate, and that the browser scan is
  never paired, was updated (it was a stale claim written in English).

## Planted cases (scratch copy of the tracked tree; the main checkout was never touched)

Baseline copy, `--only annotate__a-closed-band-of-quads...a273ff9c`: exit 0.

- **Swap** (rename one unenrolled annotate check, count unchanged): exit 1 —
  `the guard NAME SET is fad51a02cf4a, pinned at 69148e7e1641 -- the count did not move, so this is a guard swapped for another or a guard renamed`
  and `annotate: { declared: 206, enrollable: 206, names: "..." },` to paste back. (Before: exit 0.)
- **Duplicate** (second declaration of an existing unenrolled name): exit 1 —
  `205 enrollable, pinned at 206 -- a guard has moved into or out of the population no spec can name`.
- **Browser name outside the scan**: `test_a_browser_name_outside_the_scan_is_reported`
  (the function the runner tail calls); end-to-end the first real browser run printed
  `SCANNER MISS -- 13 sub-check(s) ran that the guard scan ... never found` and exit 1; after the
  scan fix a rerun printed none. I did not plant a miss in a live browser run.
- Board move: `test_a_cited_handoff_survives_the_board_move` (active/ citation, file in each of the
  three directories passes; in none fails).

## Verification record — and what could NOT be armed

Run from this **worktree** with `--repo C:/workspace/tolstack` (the main checkout is on another
branch, so my tree cannot be run there).

- `pytest -q` (worktree): `1 failed, 1532 passed, 1 skipped` in 6m06; the one failure is
  `test_viewer_js_suite` (no projection in a worktree, by design).
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`: `27/28`, 3m43 once it
  had the slot. The failed suite is `annotate sweep rail`, 5 `[real]` sub-checks
  (`the sweep rail boots P2 on the run its kinematic study folded` etc.). No browser/app file is
  touched by this diff; the main checkout has no kinematic projection and the fast tier reports
  `projection NOT paired with this tree -- the [real] tier is stale`. I believe it is the stale
  shared projection but did NOT verify it by rebuilding (shared state, other agents running).
- `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --full`: 68m02,
  `169/268 declared mutations witnessed`, exit 1. **All 99 misses are `fast` (viewer) entries
  SKIPPED because the clean run is red on that same stale projection**; none of the 169 that ran
  failed to redden. Census lines:

      apps/viewer/tests.js                        76 enrolled /      546 enrollable /      546 declared
      apps/annotate/run_tests.cjs                 61 enrolled /      206 enrollable /      206 declared
      scripts/run_viewer_browser_tests.mjs        92 enrolled /      532 enrollable /      565 declared

  No pin moved, no orphan.
- **The reviewer / merge run must rebuild the projections first**
  (`scripts/rebuild_projections.ps1`, main checkout) and rerun the browser tier and `--full`;
  expect the sweep-rail failure and the 99 skips to clear. If they do not, they are mine to look at.
- Not touched: CLAUDE.md's other Environment bullets (the kinematic handoff edits the inputs list).
  My one edit there is the must-run list, "those three" -> "those four".
