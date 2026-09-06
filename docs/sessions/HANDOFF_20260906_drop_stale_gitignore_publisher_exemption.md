---
priority: med
depends_on: []
---

# HANDOFF 2026-09-06 — drop_stale_gitignore_publisher_exemption: `data/inbox/specs/README.md` is tracked, not gitignored — remove its guard exemption

Source: `docs/issues/ISSUE_20260903_curated_ratio_publisher_exempted_as_gitignored_is_actually_tracked.md`
(found during review of `doc_coverage_sets_derived`, 2026-09-03). Baseline:
trunk, with `doc_coverage_sets_derived` merged. Scope: `tests/test_tolerance_stack.py`
(`traced_ratio_publishers()` and its two existence-check paths). Do NOT touch
`tests/test_thermal_exception_list.py` — that's a separate handoff
(`rule_scan_bullet_block_masking`).

## Deliverable

1. **Remove the `data/inbox/specs/README.md` exemption from both existence
   paths in `traced_ratio_publishers()`** (`tests/test_tolerance_stack.py`):
   the `continue` in the `missing`-detection loop and the
   `not in ("data/inbox/specs/README.md",)` clause in the `gone` assertion.
   Both were written on the premise the file is gitignored and therefore
   absent in a worktree; it is not — `git check-ignore -v
   data/inbox/specs/README.md` returns nothing, `git ls-files data/` lists it,
   and `live_documents()` finds it in both a worktree and the main checkout
   (44 either way). Delete the two `# gitignored` comments alongside the code
   they justified.
2. **Verify the guard now actually catches the case it was written for.**
   `traced_ratio_publishers()`'s whole reason to exist (per
   `ISSUE_20260812_the_doc_scan_guards_cannot_fail_on_a_deleted_section.md`)
   is to fail when a curated publisher stops publishing the traced-ratio
   figure. With the exemption in place, deleting
   `data/inbox/specs/README.md` from a worktree was silently absorbed by the
   exemption + the `live_documents()` floor of 40 (44 → still ≥40, no
   failure). Reproduce this before your fix (confirm the guard stays green
   with the file removed) and confirm it goes red after your fix.
3. **If a genuinely gitignored `data/` publisher is ever added in the
   future**, gate that specific entry by `git check-ignore` at test time
   rather than by a remembered/hardcoded belief — but do not add such gating
   speculatively now; there is no such publisher today.

## Definition of done

- `tests/test_tolerance_stack.py` and `tests/test_thermal_exception_list.py`
  both fail when `data/inbox/specs/README.md` is removed from the worktree
  (reproduce, confirm red, then restore the file and confirm green again —
  do not leave the file deleted).
- Full suite green otherwise
  (`venv-win/Scripts/python.exe -m pytest -q`).
- Lesson (`docs/sessions/lessons/LESSONS_20260906_drop_stale_gitignore_publisher_exemption.md`):
  confirm the before/after repro (guard silent → guard fails) and that no
  other publisher in the curated list carries a similar stale exemption
  (grep the file for `# gitignored` once done — there should be none left
  that don't correspond to an actually-gitignored path).
