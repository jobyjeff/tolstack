---
priority: high
depends_on: [dispatch/browser_runs_take_one_machine_slot]
model: opus
---

# HANDOFF 2026-10-21 — browser_runners_take_the_slot_and_free_the_box: tolstack's browser runners queue on the machine's browser slot, close their Chrome on every exit, and stop spinning thirteen cores

Source: the 2026-10-21 triage sweep (second pass), from three issues of one
class (`unbounded_load_on_the_shared_workstation`):
`docs/issues/ISSUE_20261021_a_browser_diagnostic_held_thirteen_cores_for_twenty_minutes_and_a_cpu_burner_ran_on_the_shared_workstation.md`
(high), `docs/issues/ISSUE_20261021_tactical_sessions_run_the_full_mutation_witness_registry_on_their_own_branch.md`
(med), and tolstack's row of dispatch's
`dispatch/docs/issues/ISSUE_20261021_browser_runners_in_other_repos_do_not_run_under_a_slot.md`.
Baseline: tolstack trunk plus dispatch's merged
`browser_runs_take_one_machine_slot`, which ships
`dispatch slot run --class browser -- <cmd>` and the `DISPATCH_SLOT_HELD`
nesting variable. Scope: tolstack's browser entry points
(`scripts/run_viewer_browser_tests.mjs`, `scripts/run_mutation_witness_tests.mjs`,
`scripts/guard_enumeration.mjs`, `apps/annotate/run_browser_check.mjs`,
`tests/debug_nav_tooltip_and_rail_hover.mjs`), the pytest browser tests that
start Chrome (`tests/test_tolerance_stack.py`, `tests/test_mutation_witnesses.py`,
`tests/test_projection_freshness.py` — whichever of them actually launch one),
their conftest, and `CLAUDE.md`'s browser-tier bullets. Do NOT touch dispatch
(the slot is dispatch's contract; if it is missing something, file an issue
there). Do NOT rework the *failure reporting* inside
`run_viewer_browser_tests.mjs` — that belongs to the handoff in `active/`,
`browser_tiers_name_their_failure_instead_of_aborting`; you change how the
runner launches, waits and cleans up, not what it says when a check fails.
If that handoff has landed by the time you start, rebase onto it.

**This workstation is shared with Jeff's live work and every other agent.**
Never write or run a load generator to reproduce contention (the incident this
handoff fixes began with one). Every browser you start in this session runs
under the slot, using the line in item 1, from the first run onwards.

## Deliverables

1. **Every browser runner takes the slot by itself.** Decision (made here, not
   deferred to a brief — the alternatives are recorded so review can check
   it): **the runner re-execs itself** under
   `C:/workspace/dispatch/.venv/Scripts/python.exe -m dispatch.cli slot run --class browser -- node <the same argv>`
   unless `process.env.DISPATCH_SLOT_HELD` already names `browser`, in which
   case it runs at once (a nested call is free — dispatch's lesson
   `LESSONS_20261021_browser_runs_take_one_machine_slot.md` says the child
   carries the variable). Rejected: spelling the wrapper only in `CLAUDE.md`
   or the prompts, because that covers agents who read it and not a human or
   an agent who forgets. **If the dispatch interpreter does not exist** (a
   checkout on a machine without dispatch), fall through to running unqueued
   with one stderr line saying so — never fail the run for it. Put the
   re-exec in one shared helper the five entry points import, not five
   copies. Exit codes pass through; 75 means `--max-wait` ran out and should
   read as that, not as a test failure.
2. **Pytest browser tests take the slot only when one is selected.** Decision:
   a session-scoped fixture in the conftest the browser tests use, which takes
   the slot (through the same `dispatch slot run` line, or dispatch's
   in-process `dispatch.slot` acquire if importable — investigate which is
   cleaner and say in the lesson) the first time a browser test is set up, and
   holds it to session end. Rejected: wrapping the whole `pytest` command,
   which holds the one slot for minutes of non-browser tests. A run that
   selects no browser test never touches the slot — assert that.
3. **A runner that exits closes its Chrome — on every path.** Chrome 37192
   outlived its node runner by 20+ minutes. Every `chromium.launch` gets a
   `try/finally` that closes the browser, plus `SIGINT`/`SIGTERM`/`exit`
   handlers that do the same. The slot's job object kills the tree at slot
   end, and dispatch's session job does at session end, but the runner must
   not rely on either. Witness it: a test that starts a runner on a tiny page,
   kills the node process, and asserts no `chrome.exe` with that runner's
   profile dir survives a few seconds later (read the profile dir off the
   process command line — the runners use installed Chrome, `channel:
   'chrome'`, so path alone cannot tell an agent's Chrome from Jeff's).
4. **Find out why the annotate check spins ~13 cores, and bound it.**
   `apps/annotate/run_browser_check.mjs` waits on
   `page.waitForFunction(() => window.__sweep && window.__sweep.bodies.length > 0, null, { timeout: 600000 })`,
   and during that wait the renderer ran at ~1,280 % CPU (10:46 PDT,
   18,506 CPU-s). Diagnose what the page computes while waiting — software
   WebGL with no GPU, a sweep solve, a polling loop — by reading the code and
   by one short, slot-held, single run with the renderer's CPU sampled, never
   by loading the box. Then bound it: a smaller fixture, a launch flag, or a
   much shorter cap that fails with a named reason. A ten-minute wait that
   takes the box with it is wrong whichever it is. The lesson records the
   cause and the measured CPU before and after.
5. **A tactical branch runs only the witnesses it touched.** Two sessions on
   2026-10-20 ran the full mutation-witness registry on their own branches
   (237/237, 3916 s each). Make `scripts/run_mutation_witness_tests.mjs`
   refuse a full-registry run outside the main checkout unless `--full` is
   passed, printing the `--only <guard>` names it would have needed (the
   specs added or changed against `integration`, if that is derivable — say in
   the lesson if it is not). The batch merge's full run passes `--full`;
   check whether anything in tolstack (tests, scripts, `CLAUDE.md`) invokes a
   full run and update each such caller.
6. **`CLAUDE.md` says it where the browser-tier bullets are.** Next to the
   existing mutation-witness and browser-tier bullets (around lines 130–195):
   per-branch = `--only` for the guards you added or changed; never the full
   registry; every browser run is slot-held (the runners do it themselves now
   — say so, so nobody double-wraps by hand, though a double wrap is
   harmless); never generate synthetic load on this workstation.

Sites this reaches, and the ones left alone on purpose: all five node entry
points and the pytest browser tests above. `scripts/debug_*` scratch scripts
that are not tracked are not reachable and are out of scope; a tracked debug
script that launches Chrome uses the same helper.

## Definition of done

- Two runners started at once from two shells: the second waits (its stderr
  wait line names the first), then runs; quote both outputs in the lesson.
  Running a runner from inside `dispatch slot run --class browser` does not
  wait (nested).
- The kill-the-runner witness from item 3 passes, and fails if the `finally`
  close is removed (say you checked).
- The annotate check's cause is named in the lesson, with renderer CPU before
  and after the bound.
- `node scripts/run_mutation_witness_tests.mjs` in a worktree refuses with the
  `--only` names; `--only <one guard>` runs; `--full` runs (you need not run
  the whole registry — show the refusal and the acceptance).
- tolstack's suite as `CLAUDE.md` spells it is green, run under the slot.
- Lesson (`docs/sessions/lessons/LESSONS_20261021_browser_runners_take_the_slot_and_free_the_box.md`):
  the cause of the 13-core spin, the in-process vs CLI slot choice for pytest
  and why, wall-clock cost of queueing observed, and anything the drawing-checker
  and forge ports of this (same dispatch issue, their own handoffs) should copy.
