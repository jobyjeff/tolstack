---
type: review
handoff: feature_identity_events_dir_data_root
reviewer: agent
date: 2026-09-06
verdict: APPROVE
blockers: 0
---

# Review — `feature_identity_events_dir_data_root`

## What this handoff actually was

Not a tolerance stack or a spec-library parse event, so the seven mandatory
provenance checks in this repo's overlay do not apply — the deliverable is a
CLI default-resolution bug fix plus doc/lesson updates. This review is
structured around the handoff's own Definition of Done instead.

**The tactical session's claim, checked rather than trusted: no code change
was needed.** The bug this handoff was staged to fix
(`ISSUE_20260906_feature_identity_events_dir_ignores_data_root.md`,
`--events-dir`'s default following the module's own `REPO_ROOT` instead of
`--data-root`) was already fixed by `annotation_surface_mvp`'s own
review-response commit `d0c3565`, which merged into `integration` before this
handoff's branch was cut from it. The handoff branch (`e6a553d`) is a single
lessons-file commit recording that finding. I did not take this on faith:

- `git merge-base --is-ancestor d0c3565 HEAD` — confirmed ancestor.
- `git diff d0c3565 HEAD -- tolerance_stack/feature_identity.py
  scripts/build_feature_identity_projection.py tests/test_feature_identity.py`
  — empty. The three in-scope files are byte-identical to the fix commit.
- Read `tolerance_stack/feature_identity.py::main()` directly: `events_dir`
  is derived as `Path(args.data_root) / "inbox" / "feature-identity"` when
  `--events-dir` is not passed — the default-derive shape, mirroring `out_dir`.
- Confirmed the three CLI-path tests exist and are the right shape
  (`test_cli_with_only_data_root_reads_that_roots_own_events_dir`,
  `test_cli_with_only_data_root_does_not_read_this_modules_own_tree`,
  `test_cli_explicit_events_dir_still_overrides_data_root`, all calling
  `main()` itself, not just `build_projection`).
- Read both flagged docs end to end: `data/inbox/feature-identity/README.md`
  (main checkout) never taught a bare-`--data-root` recipe as insufficient —
  nothing to correct there, as the lesson claims. `LESSONS_20260906_
  annotation_surface_mvp.md`'s review-round section and its "what the
  endstop/stroke stack-build handoffs should consume" section both already
  describe the corrected default-derive behavior; neither teaches the stale
  recipe.

## DoD repro, run myself against the real main checkout

Seeded a real `bound` event (valid 64-hex `source_step_sha256`) directly in
`C:\workspace\tolstack\data\inbox\feature-identity\`, then ran, from this
worktree, the exact documented recipe:

```
C:/workspace/tolstack/venv-win/Scripts/python.exe
  scripts/build_feature_identity_projection.py
  --data-root C:/workspace/tolstack/data
```

Result: `1 stack key(s) from 1 event(s)` — not the historical `0 stack key(s)
from 0 event(s)`. Deleted the probe event and the generated
`data/projections/feature-identity/` afterward; `git status --short data` in
the main checkout is clean and `data/inbox/feature-identity/` holds only its
tracked `README.md` again.

## Tests

Merged `handoff/feature_identity_events_dir_data_root` into this review
branch: fast-forward, single commit, no conflict (lesson-file-only diff).

- Review worktree: `venv-win/Scripts/python.exe -m pytest -q` → **667 passed,
  1 skipped**.
- Main checkout (`master`, which already contains this fix via the same
  `integration` merge, 2 unrelated board/triage commits ahead of this
  branch's merge-base — checked, neither touches
  `tolerance_stack/feature_identity.py`, `scripts/build_feature_identity_
  projection.py`, or `tests/test_feature_identity.py`): **668 passed, 0
  skipped**, run with cwd in `C:\workspace\tolstack`. The 667+1-skip vs.
  668+0-skip split is the expected worktree-vs-main-checkout data-dependent
  skip (`data/` empty in a worktree), not a regression.
- `data/` left exactly as found in both checkouts (checked via `git status
  --short` and directory listing) — no stray run output.

## Findings

- **Nit, fixed inline.** `docs/sessions/lessons/LESSONS_20260906_
  feature_identity_events_dir_data_root.md` (lines 58-59) asserted
  `docs/issues/ISSUE_20260906_feature_identity_events_dir_ignores_data_root.md`
  "is `status: triaged`" — the issue's actual frontmatter is `status: open`.
  A restated field value that didn't match the field, same shape as this
  overlay's "prose asserting a field is null while it is not" entry, one
  level removed (a status word instead of a null claim). Fixed inline
  (clears all three prongs: wording only, no behavior, no test needed) —
  changed `triaged` to `open` in the lesson.

No should-fix or blocker findings outstanding, so no new issue file is
required under "an unfixed should-fix outlives its handoff."

## Verdict

**APPROVE.** Fast-forward merge already landed on this review branch
(no conflict to resolve). Proceeding to merge into `integration` and push.

## Overlay

This is a second sighting, not a new failure class: the "stale count/field
restated by hand" entries in this repo's overlay already cover the shape (a
prose claim about a field's value that doesn't match the field). Did not add
a new entry — the existing family already tells the next reviewer what to
check.
