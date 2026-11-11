# LESSONS 2026-11-10 — the_browser_tier_says_where_its_half_hour_goes

## What shipped
- `scripts/run_viewer_browser_tests.mjs`: per-suite `TIMING` table (slowest first, checks,
  seconds, total) at the end; a FULL run (no `--only`) also appends one row to
  `C:\workspace\dispatch\data\suite_times.jsonl` (tier `merge`, the run's seconds
  including the slot wait, plus `slot_wait_s`, `checks`, `suites[]`). `dispatch suite-time
  report` reads `seconds`/`command` and ignores the extra fields. The row IS the record of the
  run, so nobody also hand-records that command.
- `scripts/browser_runner.mjs`: the slot wrapper stamps the queue start in the env;
  `slotWaitMs()` reads it. The slot is held for the whole process, so the wait is one number
  before suite one, not a per-suite column (the handoff asked for per-suite).
- Wording: `CLAUDE.md` test section (one table), new `docs/prompts/TACTICAL_AGENT.md`,
  one sentence in `REVIEW_AGENT.md`'s Tests bullet.

## The table (full run, handoff worktree with node_modules junction, `--repo C:/workspace/tolstack`, 2026-11-10)
Box was not provably quiet (other agents' non-browser work; the browser slot was free, wait 1 s).
Total 2,722.6 s running, 1,162 checks counted (the handoff's 865 is distinct guard names; templated
names repeat per study/origin). 43/44 suites passed — see Follow-ups.

| s | checks | suite |
|---:|---:|---|
| 394.2 | 209 | topology file:// |
| 377.6 | 209 | topology http |
| 274.8 | 26 | kinematic study page (ABORTED, 15 s selector timeout) |
| 238.4 | 48 | the DAG zoom, Fit and the grid header |
| 104.5 | 32 | 3D pane follows the selection |
| 100.8 | 16 | no nav click wedges the page |
| 90.2 | 44 | topology file:// respine |
| 85.9 | 26 | leaders across the seam |
| 77.8 | 19 | topology height budget |
| 68.8 | 29 | annotate face suggestions |
| 64.8 / 63.0 / 59.1 / 57.1 / 52.1 | | rail holds still / every study opens in 3D / model in the scene / sweep rail / rail suggestion |
| 49.3 … 4.2 | | the other 29 suites, each under 50 s (full list in the run's output) |

Top 4 = 1,285 s = 47%; the two topology origins alone 28%.

## Where the half hour goes, and what was taken out
Nothing was taken out; the "before/after" are the same number (2,723 s) because nothing
unambiguous was left to remove:
- **Boots**: 44 `newPage` for 44 suites, one per suite — no per-check boot.
- **Fixed sleeps**: 102 `waitForTimeout` totalling 42 s across the whole file (largest 4 s,
  the fps measurement). Mostly "nothing happens within N ms" negatives. Not the cause.
- **Origin pairs**: the only real saving, ~250–300 s, and it removes executed assertions from one
  origin and re-aims six witness specs — filed for strategy, not done
  (`ISSUE_20261110_the_topology_http_suite_reruns_...`).
- A per-check gap profile of `topology file://` (temporary, reverted) shows the time is the
  per-study `[real]` loop: each study click plus its settled-tween wait costs ~5–12 s, plus two
  jog-grip drags at ~22–26 s each. That is page work under SwiftShader capped to 4 cores,
  not test waste. Reduced-motion emulation would shorten it but changes the thing under test.

## The 10-29 → 10-31 jump
The table cannot show it (no earlier per-suite data). Hypothesis only: between 10-29 and 10-31
the SUITES list went 37 → 40 and a study arrival gained a 300 ms centring tween
(`c6091f52`, `viewer_browser_checks_wait_on_settled_state` `e6119a2a`), so every study click in the
`[real]` loops of both topology origins now waits on a settled tween. With the ledger now carrying
per-suite rows, the next jump will be attributable.

## Verified
- Default tier, worktree, `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q
  -p no:cacheprovider -rfs` (no xdist in this venv): 1 failed, 1927 passed, 1 skipped in 477 s —
  the one red is `tests/test_viewer_js_suite.py` (no projection in a worktree; deliberate).
  Recorded to the ledger (inside budget).
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` 676/676; `apps/annotate`
  307/307.
- Browser tier run once for the table above, from the worktree. Not re-run after the docs edits
  (no runner change since). Witness gate not run (no spec changed).

## Follow-ups (filed)
- `ISSUE_20261110_the_kinematic_study_page_browser_suite_aborted_on_a_verdict_wait_at_baseline.md`
- `ISSUE_20261110_the_topology_http_suite_reruns_...` (strategy)
- Appended the measurement to `ISSUE_20261106_the_viewer_browser_tier_ran_51_minutes_...`.

## Gotchas
- A worktree has no `node_modules`; I made a junction (remove it from PowerShell, not `rm -rf`).
- pytest here has no `-n`/`--dist`; the "documented parallelism" is not available.
