---
verdict: APPROVE
---
# Review — decayed_witnesses_are_repaired_or_retired

- Every entry has a verdict in the lesson table; guards untouched (witness-only changes), as the handoff requires.
- Verified: `tests/test_mutation_witnesses.py` 44 passed; `--changed-since integration` witnessed 05996459 and 5c29720f; 2a27c165 #1/#2 witnessed on a green clean run (first two attempts hit the documented flaky "3D pane follows the selection" tier, red before the mutation).
- Not verified by me: tactical's pytest figure (1 expected worktree-only failure), and the sweep-count arithmetic (29 vs the issue's 30).
- Note: 24d58bf9 x3 and d25818b3 remain NOT WITNESSED by design (SKIPPED guard, owned by ISSUE_20261027, deferred 2026-11-26); the sweep will keep reporting them until then.
- The two source issues were not marked resolved by the work; left for triage since four entries stay open.
