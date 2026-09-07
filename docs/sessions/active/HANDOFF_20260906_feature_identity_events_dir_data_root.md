---
priority: high
depends_on: []
---

# HANDOFF 2026-09-06 — feature_identity_events_dir_data_root: `--events-dir` default must follow `--data-root`, not the module's own path

Source: `docs/issues/ISSUE_20260906_feature_identity_events_dir_ignores_data_root.md`
(filed during review of handoff `annotation_surface_mvp`, reported as the
REQUEST CHANGES blocker in
`docs/sessions/reviews/REVIEW_20260906_annotation_surface_mvp.md`). Baseline:
trunk, with `annotation_surface_mvp` merged. Scope: `tolerance_stack/feature_identity.py`,
`scripts/build_feature_identity_projection.py`, `tests/test_feature_identity.py`,
`data/inbox/feature-identity/README.md`,
`docs/sessions/lessons/LESSONS_20260906_annotation_surface_mvp.md`. Do NOT touch
`apps/annotate/` or `apps/viewer/` — owned by other handoffs.

## Deliverable

1. **`--events-dir`'s default must derive from `--data-root`, the same way
   `out_dir` already does.** `tolerance_stack/feature_identity.py` currently
   hardcodes `EVENTS_DIR = REPO_ROOT / "data" / "inbox" / "feature-identity"`,
   where `REPO_ROOT = Path(__file__).resolve().parent.parent` — i.e. wherever
   the module physically lives, not wherever `--data-root` points. Every other
   projection builder in this repo reads from tracked `docs/` (identical
   between a worktree and the main checkout), so REPO_ROOT-relative defaults
   are harmless there; this one reads from gitignored `data/inbox/
   feature-identity/`, which is **not** identical between a worktree and the
   main checkout, exactly like the output already isn't.
   Fix: in `scripts/build_feature_identity_projection.py`, when
   `--events-dir` is not explicitly passed, default it to
   `Path(args.data_root) / "inbox" / "feature-identity"` — mirroring how
   `out_dir` is already derived from `--data-root`. Alternatively, refuse to
   run (loud error) when the two roots disagree in a way that looks like a
   worktree/main-checkout mismatch; pick whichever reads cleaner once you're
   in the code, and say which you picked in the lesson.
2. **Add CLI-path coverage.** `tests/test_feature_identity.py`'s 28 existing
   tests call `build_projection`/`revalidate`/the dataclasses directly, never
   `rebuild()` or `main()` — so the `--data-root`/`--events-dir` resolution
   this bug lives in has zero coverage today. Add a test that runs `main()`
   (or `rebuild()`) with only `--data-root` pointed at a tmp dir seeded with
   an events file, and nothing present under the module's own `REPO_ROOT`,
   asserting the event is picked up (non-zero bindings out).
3. **Update the two docs the review flagged as giving the stale recipe.**
   `data/inbox/feature-identity/README.md` (main checkout, absolute path
   `C:\workspace\tolstack\data\inbox\feature-identity\README.md` — gitignored,
   read/write it there) and
   `docs/sessions/lessons/LESSONS_20260906_annotation_surface_mvp.md`'s "what
   the endstop/stroke stack-build handoffs should consume" section both
   currently teach the bare `--data-root`-only recipe as sufficient. Update
   both once the fix lands so they describe the corrected behavior.

## Definition of done

- Reproduce the review's failure first: from a worktree, seed a real fixture
  event under `data/inbox/feature-identity/` (main checkout, absolute path),
  run `scripts/build_feature_identity_projection.py --data-root
  C:\workspace\tolstack\data` — confirm it currently reports `0 stack key(s)
  from 0 event(s)` before you fix anything, then confirm it picks up the
  event after your fix.
- New CLI-path test green, full suite green
  (`venv-win/Scripts/python.exe -m pytest -q`, or the main-checkout absolute
  interpreter path from a worktree).
- Lesson (`docs/sessions/lessons/LESSONS_20260906_feature_identity_events_dir_data_root.md`):
  which fix shape you picked (default-derive vs refuse-on-mismatch) and why;
  confirm the two docs were updated.
