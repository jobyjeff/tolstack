---
priority: low
depends_on: []
---

# HANDOFF 2026-09-09 — annotate_command_vocabulary_pairing_test: pair the documented verb table against `commands.register(...)`

Source: `docs/issues/ISSUE_20260908_command_vocabulary_table_has_no_pairing_test.md`,
a should-fix from `docs/sessions/reviews/REVIEW_20260908_annotate_deep_link_and_part_filter.md`
(not blocking that handoff). Baseline: trunk (master). Scope: this session
owns `apps/annotate/run_tests.cjs` (or a new test file alongside it) and
`apps/annotate/commands.js`'s `verbs()` method if a test hook is needed there.
Do NOT touch `apps/annotate/README.md`'s table or the `commands.register(...)`
calls in `app.js` unless a discrepancy is actually found — the goal is a
pairing test, not a rewrite of the vocabulary itself.

## The gap

Handoff `annotate_deep_link_and_part_filter` (2026-09-08)'s own lesson calls
the command layer's verb vocabulary "agent-facing API — name it carefully,"
and documents the ten registered verbs (`open-part`, `show`, `hide`,
`isolate`, `camera` (`reset`/`frame`), `select-face`, `select-topology`,
`select-study`, `select-edge`, `goto`) by hand in three places:
`apps/annotate/README.md`'s table,
`docs/sessions/lessons/LESSONS_20260908_annotate_deep_link_and_part_filter.md`'s
table, and the `commands.register(...)` calls themselves in `app.js`. All
three agree today, but nothing pairs them: `CommandLayer.prototype.verbs()`
(`commands.js`) exists and is called exactly once, inside the "unknown
command" error message, never by a test.

This is the same shape as `apps/annotate/binding_state.js`'s vocabulary
constants before `annotate_vocab_pairing_test` closed that exact gap
(`ISSUE_20260906_annotate_js_vocab_has_no_pairing_test.md`) — this repo's
`CLAUDE.md` and its own review checklist name "documented vocabularies
drifting from the seeded data" as its most-repeated defect class.

## Fix

Add a small `run_tests.cjs` check that parses `apps/annotate/README.md`'s
verb-table column (or, cheaper, just asserts `commands.verbs()` — captured
once at boot via a test hook — equals a literal list matching the README) so
a verb added/renamed in `app.js` with no doc update fails structurally. Model
this on `test_the_sop_spells_the_same_vocabularies_the_code_enforces`'s shape
one repo layer down (tolstack's own SOP-vs-code vocabulary pairing test), and
on however `annotate_vocab_pairing_test` (the sibling fix for
`binding_state.js`) already solved this for a different vocabulary in the
same app — check that prior handoff/lesson for the pattern before inventing a
new one.

## Definition of done

- A new committed test fails if a verb is added to `app.js`'s
  `commands.register(...)` calls without updating `apps/annotate/README.md`'s
  table (verify by temporarily adding a fake verb registration, confirming
  the new test goes red, then reverting).
- `venv-win\Scripts\python.exe -m pytest -q` and the JS suite (however
  `run_tests.cjs` is invoked, per `tests/test_viewer_js_suite.py`'s pattern if
  annotate has an equivalent pytest wrapper) both green.
- Lesson (`docs/sessions/lessons/LESSONS_20260909_annotate_command_vocabulary_pairing_test.md`):
  note which of the two options (parse README vs. literal-list-plus-boot-hook)
  was used and why.
