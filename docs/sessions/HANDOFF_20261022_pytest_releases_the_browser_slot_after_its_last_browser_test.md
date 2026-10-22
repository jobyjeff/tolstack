---
priority: med
depends_on: []
model: sonnet
---

# HANDOFF 2026-10-22 — pytest_releases_the_browser_slot_after_its_last_browser_test: a full pytest holds the machine's browser slot only while its browser tests run

Source: the 2026-10-22 triage sweep, from
`docs/issues/ISSUE_20261021_a_full_pytest_holds_the_browser_slot_from_its_first_browser_test_to_its_last_test.md`
(bug, med, class `unbounded_load_on_the_shared_workstation`). The class's
program, `browser_runners_take_the_slot_and_free_the_box`, has landed. This
fixes a site it left. Baseline: master at or after `d209fc6`. Scope:
`tests/browser_slot.py`, `tests/conftest.py`, `tests/test_browser_runner.py`.
Do NOT touch `scripts/browser_runner.mjs`, the node runners, or dispatch's
`slot` implementation.

## Why it matters, measured

`tests/browser_slot.py`'s `browser_slot` fixture is `scope="session"`, so a
full `pytest -q` takes dispatch's browser slot at its first browser test
(`tests/test_browser_runner.py`, about 5% into the run) and keeps it, idle,
until the session ends. The review of 2026-10-21 measured about 6 minutes of
hold for about 30 s of browser work, with another runner queued behind it.
The 2026-10-22 batch merge saw the same thing from the other side. Its
candidate `pytest -q` took 27m18s because it queued behind atp-post for the
slot. Meanwhile a tolstack browser check queued behind this pytest's idle
holder (`waiting for browser slot held by tolstack-batchmerge/... python -c "import sys; print('held'...`)
for the rest of the suite.

## Deliverables

1. **Give the hold the lifetime of the browser tests, not of the session.**
   Suggested shape, to investigate and not binding: in
   `pytest_collection_modifyitems`, count the selected items that use
   `browser_slot`. Release the slot in the teardown of the item that brings
   that count to zero. With `-p xdist` or `--lf`, the count is whatever was
   selected. `scope="module"` happens to work today, because every browser
   test lives in one module. Use it only if you write down in the module
   docstring why it is enough, plus a test that fails when a second module
   starts using the fixture.
2. **Keep the existing pair of tests**: no browser test means 0 slot takes,
   and several browser tests mean 1 take. **Add one** where a run selects one
   browser test and one later plain test, and the slot has been released
   before the plain test runs. The plain test can probe whether the holder
   process is gone, or ask dispatch whether the slot is free. Use whichever
   the existing tests already have a seam for.

## Definition of done

- `venv-win/Scripts/python.exe -m pytest -q tests/test_browser_runner.py` is
  green, with the new release-timing test.
- During a full `pytest -q` in the main checkout, the `slot run ... print('held'...)`
  holder process exits within a few seconds of the last browser test. Show
  it with timestamps (process list or holder start/stop) in the lesson. Full
  suite green.
- Lesson (`docs/sessions/lessons/LESSONS_20261022_pytest_releases_the_browser_slot_after_its_last_browser_test.md`):
  hold time before and after, measured, and which mechanism you chose and why.
