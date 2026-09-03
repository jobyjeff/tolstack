---
priority: med
depends_on: []
---

# HANDOFF 2026-09-02 — dc_snapshot_mtime_flake: a test asserts a directory mtime moved, and races the clock to do it

Source: `docs/issues/ISSUE_20260901_dc_snapshot_removed_entry_test_is_flaky_on_directory_mtime.md`.
A second issue filed the same defect from a single sighting
(`ISSUE_20260901_dc_snapshot_removed_entry_test_is_mtime_flaky.md`) and the
2026-09-02 sweep closed it as a duplicate — the kept issue carries strictly more
evidence. Baseline: tolstack trunk at the 2026-09-02 batch merge (`8693d16`, 570
passed / 1 skipped). Scope: `tests/test_dc_snapshot.py`. Do NOT change the
snapshot tool's behaviour — the tool is not what is wrong.

## The measurement

`tests/test_dc_snapshot.py::test_a_removed_entry_is_reported_as_removed` fails
intermittently:

- **1 of 5 consecutive isolated runs** on 2026-09-01;
- failed on **two of three full-suite runs** during handoff `dag_topology_format`,
  while passing every time the file was run alone immediately afterwards.

So it is load-sensitive, which is the worst kind: it reddens other people's
handoffs and then passes when they go to reproduce it. It was green in this
sweep's own baseline run, which is exactly the pattern.

## The defect

The test makes two assertions. The first — that the `removed` list reports the
removed entry — is the claim the snapshot tool exists to make. The second is that
the entry's **parent directory mtime also moved**, which is an incidental
consequence the tool does not promise, and which depends on directory-mtime
granularity being finer than the gap between the snapshot and the delete. On
Windows it often is not.

## The decision, with the issue's options

- **(1) Drop the second assertion, keep the first.** Cheapest. The comment above
  the assertion (*"which is how a re-render shows up"*) suggests the
  parent-moved signal is a nice-to-have rather than the contract.
- **(2) Make the precondition true** — stamp the directory's mtime backwards, or
  sleep past the granularity, between the snapshot and the delete. Keeps the
  coverage, at the cost of a test that now encodes a platform assumption.

**Decide, and argue it.** The question is genuinely whether "the parent's mtime
moved" is part of the snapshot tool's contract. If it is, (1) deletes real
coverage and (2) is right; if it is not, (2) spends a sleep defending a
non-promise. Read the tool and answer that, rather than picking the shorter diff.
If you choose (2), do **not** use a bare `sleep` — stamping the mtime backwards
is deterministic and a sleep is another race.

## Deliverables

1. Item 1 or 2, with the argument in the lesson.
2. **Demonstrate the flake is gone under load**, not just in isolation — the
   failure only appears in full-suite runs. Run the full suite several times
   (state how many) and report the count. A single green isolated run is the
   evidence that misled everyone here already.
3. **If the contract question resolves to "the mtime signal matters"**, check
   whether anything *else* in the suite depends on directory-mtime granularity
   the same way, and report it. One flake of this shape usually has siblings.

## Definition of done

- The test passes in N consecutive **full-suite** runs (N stated, N >= 5),
  with the count in the lesson.
- `PYTHONIOENCODING=utf-8 venv-win/Scripts/python.exe -m pytest -q` green (570
  passed / 1 skipped at baseline).
- Lesson (`docs/sessions/lessons/LESSONS_20260902_dc_snapshot_mtime_flake.md`):
  the contract answer and which option it implied, the full-suite run count, and
  the deliverable-3 finding.
