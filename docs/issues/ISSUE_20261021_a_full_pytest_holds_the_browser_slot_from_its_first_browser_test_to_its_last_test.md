---
type: bug
priority: med
status: open
area: tests/browser_slot.py
reporter: agent
class: unbounded_load_on_the_shared_workstation
found_by: docs/sessions/HANDOFF_20261021_browser_runners_take_the_slot_and_free_the_box.md
---

# A full pytest holds the machine's browser slot from its first browser test to its last test

`tests/browser_slot.py`'s `browser_slot` fixture is `scope="session"`. It takes
dispatch's browser slot the first time a browser test is set up and keeps it
until the pytest session ends. The handoff asked for exactly that.

The only consumer is `tests/test_browser_runner.py`. It sorts early, about 5%
of the way through `pytest -q`. So a full suite takes the slot about a minute
in and keeps it, idle, for the other ~95% of the run.

**Measured in review, 2026-10-21.** The review's post-merge `pytest -q` started
its holder (`dispatch slot run --class browser -- python -c "...sys.stdin.read()"`)
at 18:52:23. The three Chrome witnesses took about 30 s of work. After that the
slot stayed held while the rest of the suite ran, until it ended at 18:58:21
(`1 failed, 1519 passed, 1 skipped in 349 s`). That is about 6 minutes of hold
for about 30 s of browser work. For that whole time every other browser runner
on the machine waits in the queue. One of them was the review's own
`node scripts/run_viewer_browser_tests.mjs`, queued from 18:55:10 and printing
`waiting for browser slot held by tolstack/rev-tolstack-browser_runners_take_the_slot_and_free_the_box (pid 10404, 2:46)`
… `4:17`. The tactical's full run took 1267 s, and the idle hold grows with the
run.

The handoff turned down wrapping the whole `pytest` command because that "holds
the one slot for minutes of non-browser tests". With the browser tests sorted
early, the session-scoped fixture costs almost the same. Every tactical and
review session runs a full suite, so it happens on every full suite.

**Fix shape (small):** give the hold the lifetime of the browser tests, not of
the session. Today `scope="module"` does that, because every browser test lives
in one module. Done generally, it is a hold that is released once the last
selected browser test finishes: a `pytest_collection_modifyitems` count of the
items that use the fixture, plus a teardown that releases when the count
reaches zero. Keep the existing pair of tests (no browser test → 0 takes;
several → 1 take). Add one that a run selecting one browser test and one later
plain test has released the slot before the plain test runs.
