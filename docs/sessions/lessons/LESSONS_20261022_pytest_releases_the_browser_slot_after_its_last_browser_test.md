# Lessons 2026-10-22 — pytest releases the browser slot after its last browser test

## What changed
`tests/browser_slot.py`: `browser_slot` is now **function-scoped**. The first browser test
takes the slot (via `holding_the_browser_slot`, unchanged); the test that finds no later item
in `session.items` using `browser_slot` closes the hold in its own teardown. `tests/conftest.py`
needed no edit (it still imports only `browser_slot`).

## Mechanism, and why
- Count from `session.items` at teardown (the final run order — so `-k`, `--lf`, reordering
  and xdist's per-worker selection are counted as selected), not a `pytest_collection_modifyitems`
  hook: a hook has to be imported by every conftest, and the inner-pytest tests import only
  the fixture. Fixture-only keeps one name as the whole contract.
- Not `scope="module"`: enough today, but it silently regresses when a second module uses it.
- The hold lives on `config` (an `ExitStack`, `config.add_cleanup(stack.close)`), so an
  early stop (`-x`, Ctrl-C) still releases it. A session-scoped helper fixture was tried first
  and broke the inner conftests (not visible from them).

## Measured
- Before (handoff / 2026-10-21 review): ~6 min hold for ~30 s of browser work in a full run.
- After, `pytest tests/test_browser_runner.py tests/test_app_type_scale.py ...` in this
  worktree, holder poll (500 ms): holder pair started 16:30:05.56 / 16:30:06.44, both
  exited 16:30:38.12 / 16:30:38.13 — ~33 s, ending as the browser tests ended, while pytest
  went on to the plain tests. (Later holder start/stop lines at 16:34 are other agents'
  holders — different parents — not this run.)
- New test `test_the_slot_is_released_before_a_plain_test_...`: the stand-in slot logs
  `released` when its holder exits; a plain test after the browser tests asserts exactly one
  `released` and no `DISPATCH_SLOT_HELD`. With the old session scope it reads 0 and fails.

## Full-suite record
`venv-win` (main checkout's), `pytest -q`, **in this worktree**: 1560 passed, 1 skipped,
**2 failed**, 11m59s. (1) `test_viewer_js_suite_is_green` — the known worktree-only red
(no `data/projections`), not run in the main checkout. (2)
`test_a_runner_that_ends_leaves_no_chrome[signal-True]` failed once in the full run
under load (output not captured past the tail) and passed in both isolated reruns of
the file (7 passed, ~60 s). Not reproduced; not attributed to this change.
The main-checkout node tiers (`run_tests.cjs`, browser TRUTH, mutation witness `--full`)
were **not run**: they need the main checkout, and this branch isn't checked out there.
The "holder exits within seconds in a full main-checkout run" DoD item was shown on the
browser-file subset above, not on a full main-checkout run.
