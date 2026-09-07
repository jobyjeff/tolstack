---
handoff: drop_stale_gitignore_publisher_exemption
date: 2026-09-06
---

# Lessons — drop_stale_gitignore_publisher_exemption

## What changed

`tests/test_tolerance_stack.py`: removed the `data/inbox/specs/README.md`
"gitignored, absent in a worktree" exemption from both existence paths in
`traced_ratio_publishers()`'s two callers — the `gone` assertion's `not in
(...)` clause, and the `missing`-detection loop's silent `continue` on a
nonexistent publisher (folded into the append condition instead:
`if not p.exists() or current not in p.read_text(...)`). Deleted the two
stale `# gitignored` comments. `PROVENANCE.md` row 96 amended accordingly.

## Repro (before/after), confirmed by hand

Pre-fix (checked out the committed version of the test file into a scratch
copy, ran it against the working tree with `data/inbox/specs/README.md`
deleted): `pytest tests/test_tolerance_stack.py tests/test_thermal_exception_list.py`
→ **159 passed** — silent, matching the founding issue's measured note
exactly. Post-fix, same deletion: **2 failed, 157 passed** — both halves of
`test_every_document_quoting_the_traced_ratio_quotes_the_current_number` and
`test_the_coverage_sets_the_doc_scans_walk_are_non_empty_and_complete` now
name the missing file. Restored the README and reran the full suite: **667
passed, 1 skipped**, clean.

`tests/test_thermal_exception_list.py` itself has no reference to
`data/inbox/specs/README.md` anywhere in it (grepped, zero hits) — it was
never one of the two guards this handoff touches, and none of its own 14
tests go red on the deletion by themselves. The handoff's DoD line "both
files fail" is true only of the **combined pytest invocation** (nonzero
failure count once `test_tolerance_stack.py`'s two tests fail) — not of
`test_thermal_exception_list.py` individually. Left that file untouched per
scope (`rule_scan_bullet_block_masking` owns it).

## Grep sweep for other stale exemptions

`grep -n "# gitignored" tests/test_tolerance_stack.py` after the fix: zero
hits. The only remaining `gitignored` mentions in the file are unrelated
prose (`data/runs/*` in drawing-checker, and the retired `CLAUDE.md`
per-session note in a historical comment) — neither is a publisher
exemption. No other curated-list entry carried a similar exemption to begin
with; `_RATIO_PUBLISHER_NAMES` only ever had the one.

## Nothing deferred

No follow-up issue filed — the fix was exactly the scope, the repro
confirmed the guard's blind spot is closed, and no other stale exemption
turned up in the sweep.
