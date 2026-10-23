# Lessons: the_kill_witness_fix_is_ported_from_drawing_checker (2026-10-22)

## Divergences from drawing-checker's runner (diffed first)

| Area | drawing-checker | tolstack | Port |
|---|---|---|---|
| Roots | `browserRoots` from a `child_process.spawn` hook | none; pid from `browser_cpu_cap.py` kept in `open` (Map) | hook added; roots = hook pids ∪ cap pids |
| Close | `browser.close()` + grace | same | Windows `closeEveryBrowser` now kill-and-wait, as ported |
| Parent-scan fallback | `killByParentScan` | none | not added (roots are never empty if anything is open) |
| Trace env | `DRAWING_CHECKER_BROWSER_RUNNER_TRACE` | `TOLSTACK_BROWSER_RUNNER_TRACE` | renamed |
| Navigation retry, `open` as Set | present | absent / Map | not ported (out of scope) |
| Witness | modes hold/throw/exit/close, tree walk by parent pid | modes signal/throw/exit, Chrome found by profile dir on the command line | verdict ported; tree-walk fix **not needed** (profile match cannot adopt a stranger through a recycled parent pid) |

Ported as-is: first-pid-per-taskkill-line parse and `process.pid` removal, PowerShell
`WaitForExit` signalled wait with recycled-pid skip, `KILL_WAIT_BOUND_MS = 60000`,
`LEFT_RUNNING` line, run-once `killed` flag (reset in `launchBrowser`),
`unexplained_survivors` verdict (killed AND named) + browser-free pins.
Adapted: the verdict also covers pids still listed after tolstack's 5 s settle wait
(must be named); `STOP_S` 30 -> 150 (must outlast the 60 s bound; pinned by a test).
Not ported: `tests/debug_kill_witness_under_load.py` (optional per handoff).

## Consequences in tolstack

- Signal path no longer closes gracefully, so Chrome exits 1: `signal` is `graceful=False`.
  The old mutation "drop the signal handler's close" is now an equivalent mutant (the exit
  handler does the same kill), so it was **retired** from the spec; the exit-handler and
  finally-close mutations remain. The exit-handler mutation's find string changed with the line.
- Throw path keeps its `finally: browser.close()` (graceful, exit 0 asserted).

## Evidence

- Mutation: `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --only python__test-a-runner-that-ends-leaves-no-chrome__b36c164d`
  -> 2/2 WITNESSED (exit handler removed reddens `test_a_runner_that_ends_leaves_no_chrome`).
  (`--repo` is needed from a worktree: the venv is main-checkout-only.)
- Loaded runs (real load: drawing-checker and atp-post suites plus other browser-slot runners were live; no synthetic load):
  `venv-win/Scripts/python.exe -X utf8 -m pytest -q -rsfE -p no:cacheprovider` (tolstack has no xdist, so no `-n`), worktree, back to back:
  run 1 **1 failed, 1571 passed, 1 skipped, 408.95 s**; run 2 **1 failed, 1571 passed, 1 skipped, 488.29 s**.
  The one failure both times is `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`, the documented worktree-red
  (needs main-checkout projections/node_modules). The three `leaves_no_chrome` parametrizations passed in both; no `BROWSER LEFT RUNNING` printed.
- Not run: the viewer/annotate/browser-TRUTH tiers and full mutation registry (main checkout / batch merge).
- Beware: the browser slot queue can add minutes to a witness test's setup (one run waited 342 s); that is wait, not runtime.
