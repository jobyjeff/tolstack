---
type: review
handoff: docs/sessions/active/HANDOFF_20261022_the_kill_witness_fix_is_ported_from_drawing_checker.md
reviewer: agent
date: 2026-10-23
verdict: APPROVE
blockers: 0
---

# Review: the_kill_witness_fix_is_ported_from_drawing_checker

## Verified
- Diffed `scripts/browser_runner.mjs`, the witness verdict in `tests/test_browser_runner.py`, the mutation spec and the CLAUDE.md bullet against the handoff's list from drawing-checker (`4d08f907`, `e0bc2665`, `20c0dee6`, `6febee30`). All four elements are present: kill the recorded tree on every way out, first-pid-per-taskkill-line parse with node's own pid dropped, PowerShell `WaitForExit` signalled wait that skips recycled pids, 60 s bound with the `BROWSER LEFT RUNNING` line, and the killed-AND-named verdict. The witness shares one verdict function, with browser-free pins.
- Lesson lists the divergences from drawing-checker and says what was ported as-is, adapted or not ported. The tree-walk fix is "not needed" because tolstack's witness matches Chrome by profile dir. I agree.
- Merge of `handoff/...` into the review branch was clean (the handoff was already based on current integration).
- Pre-merge/risky subset: `tests/test_browser_runner.py` -> 17 passed (119 s). One case ran its full 60 s kill wait and printed `BROWSER LEFT RUNNING`; the witness accepted it as a killed-and-named pid with a warning. That is the designed path.
- Mutation witness (`--only python__test-a-runner-that-ends-leaves-no-chrome__b36c164d`, `--repo C:/workspace/tolstack`): 2/2 WITNESSED on the second run. The exit-handler-removed mutation reddens the test. The retired signal-close mutation is an equivalent mutant (the exit handler does the same kill), which the lesson explains.
- Post-merge full suite in the review worktree: `1 failed, 1573 passed, 1 skipped in 399.36s` (6m39s, inside the 10 min budget). The one failure is `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`, the documented worktree-only red (no `data/projections/`). The skip is the pitch-link re-extraction, unrelated. Left unexercised here: the viewer/annotate/browser-TRUTH tiers and the full mutation registry, which run in the main checkout at the batch merge.

## Notes (not blockers)
- The first mutation-witness run reported "tier was red before the mutation" for both mutations. The immediate rerun was 2/2 WITNESSED, so it looks like machine load, but I did not capture the clean-run failure. If this recurs, it may mean the witness test still flakes under load.
- Under load one witness case waited the whole 60 s bound; `STOP_S` = 150 covers it, and a test pins that relationship.
- The CLAUDE.md bullet has one overlong line (the date/slug parenthetical). Cosmetic.
- The handoff's loaded-run evidence (two consecutive loaded full runs, 1 worktree-red each, `leaves_no_chrome` x3 green both) comes from the lesson. I did not re-run it.

No inline fixes were made.
