---
priority: medium
depends_on: []
---

# HANDOFF 2026-08-05 — sop_edits_apply: apply the 14 reviewed SOP edits + backfill `values_source`

Source: `docs/sessions/lessons/LESSONS_20260804_pitch_link_stack.md` (the SOP
friction report — 13 proposed edits from the session + edit 14 from its
reviewer; all reviewed, none applied — the pitch_link handoff said "propose,
do not edit", and this handoff is the promised cheap application pass).
Baseline: `master` with `pitch_link_stack` merged. Scope:
`docs/SOP_TOLERANCE_STACK.md`, `docs/prompts/REVIEW_AGENT.md`,
`tolerance_stack/`, `data`-citing docs, tests; do NOT reorganize
`data/inbox/specs/` (append-only) or touch `docs/reference/` beyond what an
edit explicitly requires.

Note: the main checkout `C:\workspace\tolstack` may still lack `venv-win`
(founding lesson: run `setup.ps1` once) — create your worktree venv as the
founding session did if needed.

## Deliverables

1. **Apply edits 1–14** from the lesson's friction report to
   `docs/SOP_TOLERANCE_STACK.md` (and edit 10 to
   `docs/prompts/REVIEW_AGENT.md` §3). The lesson contains full proposed
   wording for each — treat that wording as the requirement, adjusting only
   for surrounding context. If any edit is wrong or superseded on close
   reading, reject it *explicitly* in your lesson with the reason (do not
   silently skip). Highlights so nothing is missed: worktree spec-pile
   path (edit 1), identity-by-counting Step 1 (2), limits-only nominal (3),
   Step 5c incomplete-check shape (4) **including edit 14's
   which-end-is-binding bullet**, zero-width bands (5), the
   `hardware_entries.json` laundering ban (6), `values_source` (7), the
   kind-list three-places pointer (8), RSS zero-width caveat (9), REVIEW §3
   `max == mmc` exit (10), export-scoped zone citations (11), balloon `nX`
   trap (12), the small ones (13: test-count unpin, 215197 fixture path,
   `--crop` usage).
2. **Backfill `values_source` on the other 12 hardware entries** (edit 7's
   follow-up, called "small and mechanical" in the lesson: every entry is
   either the 260729 workbook or the 217755 parts list). Then enforce
   repo-wide: the existing per-entry test generalizes to all entries with
   `values_status == "inline"`.
3. **Keep provenance honest**: entries whose inline values are workbook
   transcriptions get a `values_source` that SAYS so (`kind: "workbook"`) —
   the point is that Step 5b's transitive ban becomes checkable, not that
   the entries look clean.

## Definition of done

- All 14 edits applied (or explicitly rejected with reasons in the lesson);
  the SOP no longer pins a test count; `pytest -q` green (50+ tests).
- All 13 hardware entries carry `values_source`; a value-level test asserts
  the requirement for every inline-valued entry and at least one workbook-
  kind and one spec-kind entry by exact content.
- Lesson (`docs/sessions/lessons/LESSONS_20260805_sop_edits_apply.md`):
  which edits changed in wording and why, any rejected outright, and
  whether the SOP now reads coherently end-to-end (it accreted 14 patches —
  say if it needs a structural pass next).
