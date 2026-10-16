---
type: review
handoff: docs/sessions/completed/HANDOFF_20261015_mutation_runner_survives_a_missing_interpreter_and_shadows_what_guards_read.md
reviewer: review agent
date: 2026-10-15
verdict: APPROVE
blockers: 0
---

# Review — mutation_runner_survives_a_missing_interpreter_and_shadows_what_guards_read (2026-10-15)

**Verdict: APPROVE.**

## Verified
- Missing-interpreter repro (`--repo <dir with no venv-win>`): finishes, prints the summary and the NOT WITNESSED verdict naming each entry as "the tier's process could not be started", exit 1. Before: died on `spawn ENOENT`.
- New spec `python__test-one-part-...__31a8b9ea`: clean run green, both mutations WITNESSED (`--repo C:\workspace\tolstack`).
- `pytest -q` in the review worktree, `test_viewer_js_suite.py` deselected (known red in a worktree): 1445 passed, 1 skipped.
- Lesson answers all four asked questions (cost 12->35 MB, ~2.3->3.0 s; specs README copied, read-via-`--repo` rejected with reason; other runners; the pairings-runner issue still live).

## Not run
The full-registry mutation sweep (tens of minutes, browser) — only the new spec and the repro were run; the one existing spec whose anchor was re-pointed (`...fecc0838`) was not re-witnessed here. The operator's merge-time run covers it.

## Notes (no findings against the work)
- Scope grew beyond the handoff list, forced and explained in the lesson: `tests/test_tolerance_stack.py` now accepts a claim-corpus walk when the tree is a copy inside another work tree (strict `GIT_TRACKED` still required in a real checkout), `tests/test_mutation_witness_shadow_concurrency.py` restores the specs README, `SHADOW_EMPTY_DIRS`, and a `PROVENANCE.md` row.
- The suggested up-front listing of python misses was not added; per-entry naming is enough.

Nothing fixed inline.
