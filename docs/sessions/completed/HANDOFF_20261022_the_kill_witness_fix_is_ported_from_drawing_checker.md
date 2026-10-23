---
priority: med
depends_on: []
model: sonnet
---

# HANDOFF 2026-10-22 — the_kill_witness_fix_is_ported_from_drawing_checker: Chrome is gone when the runner's node is, under load, here too

Source: `docs/issues/ISSUE_20261022_the_browser_runner_kill_witness_reddens_under_load_here_as_it_did_in_drawing_checker.md`
(the 2026-10-22 second batch merge's candidate red, merged past as a known
red). Baseline: trunk `ceac363` or later. Scope: `scripts/browser_runner.mjs`
(its signal/exit handlers and the recorded-pid kill path),
`tests/browser_runner_witness.mjs`, `tests/test_browser_runner.py`, a
`tests/debug_kill_witness_under_load.py` if you port it, and the CLAUDE.md
browser-slot bullet if a stated bound changes. Do NOT touch: `tests/browser_slot.py`
(slot hold/release, landed 2026-10-22), the viewer/annotate runners'
own test logic, anything in drawing-checker (read it, never write it).

## The defect

`tests/test_browser_runner.py::test_a_runner_that_ends_leaves_no_chrome[signal-True|throw-True|exit-False]`
reddened in a loaded full `pytest -q` (drawing-checker's candidate suite ran
concurrently): 2 and 6 Chrome pids alive at node's exit, and the `throw` case
timed out at 30 s. Alone, the file is `7 passed in 40.57s`.

## Deliverables

1. **Port drawing-checker's measured fix — the diagnosis is already done.**
   drawing-checker root-caused the identical red with a trace seam and fixed
   it at the cause in `HANDOFF_20261022_the_kill_witness_tells_a_slow_kill_from_a_slow_read`
   (now in its `docs/sessions/completed/`). Read its lesson
   (`C:\workspace\drawing-checker\docs\sessions\lessons\LESSONS_20261022_the_kill_witness_tells_a_slow_kill_from_a_slow_read.md`
   if present) and its four commits on drawing-checker master:
   `4d08f907` (every way out kills the recorded tree and waits until the
   handles are signalled; the exit path stopped parsing node's own pid out of
   taskkill's output; `process.kill(pid, 0)` reports gone seconds before the
   handle is signalled; the witness's tree walk adopted strangers through
   recycled parent pids), `e0bc2665` (kill wait bound 60 s), `20c0dee6` and
   `6febee30` (an un-signalled pid at node's exit passes only if killed AND
   named on the runner's `BROWSER LEFT RUNNING` line; one verdict function
   shared with the debug script). Apply the same changes to tolstack's
   runner and witness, adapting to whatever has diverged — diff the two
   `scripts/browser_runner.mjs` files first and list the divergences in the
   lesson.
2. **Keep the witness honest.** The test must still redden with the `exit`
   handler removed (run that mutation and record it). Never loosen it to
   "gone a few seconds later".
3. **Prove it under real load, never synthetic load.** Two consecutive
   loaded runs green: a full `venv-win/Scripts/python.exe -m pytest -q`
   with another real suite running is the load (CLAUDE.md forbids CPU
   burners on this workstation). Record the commands and counts.

## Definition of done

- The three parametrizations green in two consecutive loaded full runs; the
  removed-`exit`-handler mutation reddens the test.
- `node scripts/run_mutation_witness_tests.mjs --only <guard>` for any guard
  you changed; full `pytest -q` green.
- Lesson: the divergences from drawing-checker's runner, what was ported
  as-is vs adapted, and the loaded-run evidence.
