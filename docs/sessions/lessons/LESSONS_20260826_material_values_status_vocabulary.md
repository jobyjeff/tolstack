# LESSONS — `material_values_status_vocabulary` (worked 2026-08-27)

Handoff: `docs/sessions/HANDOFF_20260826_material_values_status_vocabulary.md`, from
`ISSUE_20260821_material_values_status_vocabulary_is_an_inline_literal.md` (filed by
`three_field_vocabularies`, 2026-08-21, as the fifth and last hand-found instance of
the vocabulary-with-no-importable-name defect). Branch
`handoff/material_values_status_vocabulary`, one implementation commit plus this one.

## Deliverable 1: `MATERIAL_VALUES_STATUSES`

`tolerance_stack/thermal.py`: `MATERIAL_VALUES_STATUSES = ("inline", "library",
"not_transcribed")` now sits beside `MaterialEntry`, and `__post_init__` reads it
(`self.values_status not in MATERIAL_VALUES_STATUSES`) instead of the inline tuple.
`tests/test_js_python_vocabulary.py`'s `_values_statuses_from_source` already had an
`ast.Name` branch for exactly this refactor (added and unit-tested,
`test_the_values_status_reader_also_handles_the_constant_refactor`, before this
constant existed) — it resolves the name via `getattr(tolerance_stack.thermal, name)`,
so `python_values_statuses()` needed **no change** to keep reading the real vocabulary.
Not exported from `tolerance_stack/__init__.py`: `thermal.py`'s names aren't re-exported
there at all today (every caller does `from tolerance_stack.thermal import ...` or
`from tolerance_stack import thermal`), so adding one constant to that pattern while
leaving `MaterialEntry` itself unexported would be a narrower inconsistency than the one
being fixed.

## Deliverable 2: shared, not independent — and how, given `hardware_entry` is a dict

**Decision: shared.** `hardware_entry_problems()` (`tests/test_tolerance_stack.py`) is a
test helper, not production code, so "share the constant" could not mean "make
`hardware_entry` a dataclass that imports it" without inventing a dataclass the handoff
explicitly didn't ask for. Instead it now calls `python_values_statuses()` — the same
AST-read `MaterialEntry.__post_init__`'s own check is compared against, already imported
into this file for the doc-guard test — instead of re-spelling `("inline", "library",
"not_transcribed")` a second time. This is the weaker but honest form of "one
definition": not one Python object both schemas construct against, but one **source**
(the check in `thermal.py`) both schemas' validation is read from, with `hardware_entry`
one AST hop further from it than `MaterialEntry` is. Recorded so a future reader doesn't
"fix" this into a shared constant import and rediscover why it wasn't one: doing that
would mean either promoting `hardware_entry` to a dataclass (out of scope, and SOP Step 4
already validates it structurally without one) or importing `MATERIAL_VALUES_STATUSES`
directly, which is available and would also have worked — `python_values_statuses()` was
chosen only because it was already the file's own pattern for this exact vocabulary
(`_ENUMERATED_STATE_VOCABULARIES`, added 2026-08-21) and re-parses a 250-line file per
call, which is free at this suite's size but is the reason not to reach for it in
non-test code.

## Deliverable 3: built, not deferred — and why this time it was cheap

The lesson this closes argued the "is there a fifth?" question should become a scan
rather than a fourth grep, but left the shape unspecified beyond "a membership check
whose right-hand side is a literal rather than a module-level constant." Before writing
it, I grepped `tolerance_stack/*.py` for every `in (`/`not in (` and found the exact case
that would have made a naive version wrong on day one: `thermal.py:633`,
`if corner not in ("nom", "lmc", "mmc")` — a function-parameter label, not a persisted
field, already ruled "not a vocabulary" by hand in
`LESSONS_20260819_three_field_vocabularies.md`. A scan that flagged it would either need
a per-name allowlist (the exact recurring-hand-review shape the test exists to replace)
or a real scope boundary. `self.<attr>` *is* that boundary — `corner`, `stage` and `group`
are locals/parameters, never `self.something` — and it costs nothing extra to encode,
so `test_no_persisted_field_vocabulary_is_an_inline_literal` scopes to
`self.<attr> {in,not in} (...)` specifically rather than any `Compare`. Verified against
every other `self.<attr> not in (...)` check in `tolerance_stack/` before trusting it:
all seven pre-existing ones (`CONFIDENCES` ×2, `SUBJECT_KINDS`, `EVENT_MODES`,
`EXPORT_STATUSES`, `SOURCE_REF_KINDS`, `ELEMENT_ROLES`) already read a named constant, and
the one int-tuple check (`Term.sign not in (1, -1)`, `stack.py:443`) is excluded by the
all-string-constants filter, not by an exemption. Scan comes back
clean today, which is the point: the fifth instance this handoff fixes was the last one,
and the test exists so a sixth is loud instead of hand-found again.

**Mutation demonstration** (see the gotcha below for how nearly this section stayed
wrong): reverted `MaterialEntry.__post_init__` to the inline tuple, ran
`test_no_persisted_field_vocabulary_is_an_inline_literal` alone — it failed, naming
`tolerance_stack\thermal.py:152: self.values_status not in (...)` exactly. Re-applied the
constant and the check afterward (see below); reran the full suite clean.

## Gotcha for the next agent here — the exact trap the last lesson named, hit anyway

`LESSONS_20260819_three_field_vocabularies.md` already warned: *"`git checkout -- <file>`
after an in-place mutation test reverts the whole file, including the edits you meant to
keep."* I ran the mutation demonstration above with a `sed -i` edit on `thermal.py`, then
reverted with `git checkout -- tolerance_stack/thermal.py` — which discarded not just the
mutation but `MATERIAL_VALUES_STATUSES` and the `__post_init__` edit from deliverable 1,
silently, because `git status` was not checked in between. Caught only because the next
`grep` for `MATERIAL_VALUES_STATUSES` came back empty. Re-applied both edits by hand and
reran the full suite to confirm. The lesson's own prescription — mutate a copy, or commit
the real edit before mutating in place — is the fix; reading the warning is not the same
as having a habit that checks `git diff` before reverting.

## Verification, exactly as run

- **Python suite, in the worktree, main checkout's interpreter**
  (`C:\workspace\tolstack\venv-win\Scripts\python.exe -m pytest -q`): **473 passed, 1
  skipped** (the skip is the viewer's data-dependent tier). `tests/test_tolerance_stack.py`
  alone collects **142 tests** (one new: `test_no_persisted_field_vocabulary_is_an_inline_literal`;
  `hardware_entry_problems()`'s change touches an existing test's dependency, not its count).
- **`apps/viewer/viewer.js` was not edited** and no `data/` file was rebuilt — nothing in
  this handoff's scope touches JS or a projection.
- **`git log --oneline HEAD..master`**: two commits, both board moves (`staged -> active`
  for this handoff and its sibling `review_checklist_vocabulary_wording`), zero code —
  nothing to reconcile at merge.
- **PROVENANCE.md**: `tests/test_tolerance_stack.py`'s row amended for this change;
  `tolerance_stack/thermal.py`'s row is `not imported` (written 2026-08-05, no
  drawing-checker counterpart) and needs no amendment for an internal refactor of a file
  nothing imported it from.

## Follow-ups

None filed. This closes `ISSUE_20260821_material_values_status_vocabulary_is_an_inline_literal.md`
outright — deliverable 3's generalized test was built rather than deferred, so there is no
open "durable fix" item to hand off this time.
