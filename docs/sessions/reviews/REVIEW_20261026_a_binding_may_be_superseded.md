---
type: review
handoff: docs/sessions/active/HANDOFF_20261026_a_binding_may_be_superseded.md
reviewer: agent
date: 2026-10-26
verdict: APPROVE
blockers: 0
---

# Review — a_binding_may_be_superseded

**APPROVE.** Handoff branch merged into `review/a_binding_may_be_superseded` (not previously on integration).

- **Fold**: `build_projection` validates `supersedes` (dangling, cross-key, non-bound target, not-earlier, self, non-bound carrier all raise naming both ids), hides the target from `bindings`, keeps it in `superseded` and `history`; `as_dict` writes it through. Verdict vocabulary untouched. Two independent bindings on one key still project two.
- **Fits follow the fold**: `fit_bound_features` reads the projection; `test_a_superseded_binding_produces_no_fit` pins one fit, `summary.bindings == 1`. Solver contract line is in the lesson.
- **Annotator**: Flip direction / Correct this binding, history disclosure; five guards each with a mutation spec; annotate pin 220 -> 225 and `guard_enumeration.mjs` updated. Lesson records a real surprise (`nextEventFilename` collision on a second write) and its fix.
- **Docs**: ANNOTATION_SURFACE section, inbox README, CLAUDE.md sentence, lesson present.

## Tests run (review worktree, after merge)
- `pytest -q`: 1579 passed, 1 skipped, 1 failed — the failure is `test_viewer_js_suite` (no `data/projections` in a worktree), the documented worktree-only red, not caused by this work.
- `node apps/annotate/run_tests.cjs`: 225/225 passed.

## Not run here (needs the main checkout)
Browser TRUTH tier (`correctionPass` in `run_browser_check.mjs`), `--full` mutation witnesses, and the viewer `[real]` tier. These belong to the operator's batch merge per CLAUDE.md; the author reports the five new specs WITNESSED via `--only`. I did not independently re-run them.

## Notes (non-blocking)
- Flip direction is withheld when the other end is occupied (stated in the lesson); reachable through Correct this binding.
- Rail row shows no marker for a corrected binding (stated, deliberate).
