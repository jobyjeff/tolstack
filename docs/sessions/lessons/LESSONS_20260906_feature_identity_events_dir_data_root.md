# LESSONS 2026-09-06 — feature_identity_events_dir_data_root

**No code changes needed — the fix this handoff asks for had already landed.**
`annotation_surface_mvp`'s own tactical session got REQUEST CHANGES for this
exact bug (`ISSUE_20260906_feature_identity_events_dir_ignores_data_root.md`)
and fixed it itself, in the same branch, before this separate handoff was
dispatched: commit `d0c3565` ("review response: fix --events-dir/--data-root
default bug, add JS/Python vocab pairing") already derives `--events-dir`'s
default from `--data-root` in `tolerance_stack.feature_identity.main()`
(`Path(args.data_root) / "inbox" / "feature-identity"`, matching how `out_dir`
is already derived), already adds the three CLI-level tests this handoff's
item 2 asks for (`test_cli_with_only_data_root_reads_that_roots_own_events_dir`,
`test_cli_with_only_data_root_does_not_read_this_modules_own_tree`,
`test_cli_explicit_events_dir_still_overrides_data_root` in
`tests/test_feature_identity.py`), and already updated
`docs/sessions/lessons/LESSONS_20260906_annotation_surface_mvp.md`'s review-round
section with the same fix-shape rationale this handoff's item 3 asks for.
That commit merged into `integration` ahead of this branch being cut from it
(`git merge-base --is-ancestor d0c3565 HEAD` confirms; `git diff d0c3565 --
tolerance_stack/feature_identity.py scripts/build_feature_identity_projection.py
tests/test_feature_identity.py` is empty on this branch's HEAD). The two
handoffs raced against the same issue; the in-branch review-response won.

**Fix shape (for the record, since I didn't have to choose it): default-derive,
not refuse-on-mismatch.** `--events-dir`, when not explicitly passed, is
`Path(args.data_root) / "inbox" / "feature-identity"` — the same shape
`out_dir` already used, so a worktree run with `--data-root` alone now behaves
like every other projection builder's documented recipe instead of needing a
second flag.

**`data/inbox/feature-identity/README.md` needed no edit.** It never taught the
bare `--data-root`-only recipe as sufficient or insufficient in the first
place — it just points at the build script and `tolerance_stack/
feature_identity.py` for the CLI details — so there was no stale claim to
correct there. Re-read it end to end to confirm before concluding this.

## What I verified this session

- `git merge-base --is-ancestor d0c3565 HEAD` → is an ancestor; diff of the
  fix commit against current HEAD for the three in-scope files is empty.
- Re-ran the handoff's own DoD repro against the real main checkout: seeded a
  probe `bound` event under `C:\workspace\tolstack\data\inbox\feature-identity\`,
  ran `scripts/build_feature_identity_projection.py --data-root
  C:\workspace\tolstack\data` from this worktree — `1 stack key(s) from 1
  event(s)`, not the historical `0 stack key(s) from 0 event(s)`. Deleted the
  probe event and the generated `data/projections/feature-identity/` afterward
  (same "don't leave a fabricated identity claim in the shared inbox" posture
  `LESSONS_20260906_annotation_surface_mvp.md` already used for its own demo
  bindings) — main checkout's `data/inbox/feature-identity/` is back to just
  its tracked `README.md`.
- Full suite: `667 passed, 1 skipped` (`venv-win/Scripts/python.exe -m pytest
  -q`, run via the main checkout's absolute interpreter path from this
  worktree). `tests/test_feature_identity.py` alone: `37 passed`, including the
  three CLI-path tests.

## For whoever triages the issue

`docs/issues/ISSUE_20260906_feature_identity_events_dir_ignores_data_root.md`
is `status: triaged` and still points at this handoff. I did not change its
status — the issue frontmatter contract reserves `resolved`/`closed` for
triage, not the tactical session acting on it — but the fix it describes is
already shipped, verified above, so it should resolve cleanly rather than
generate a second round of code changes.
