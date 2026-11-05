---
verdict: APPROVE
---

# Review — the_no_loader_warning_speaks_to_the_reader

- Diff (stack.js arm, tests.js, lesson) matches the handoff scope; no runner or projection-builder files touched.
- Sentence now: `This stack has checks, generated from its "<archetype>" block; this page cannot show them yet.` + `VA.PROJECTION_BUILT_ELSEWHERE`. Script path, constant name and instruction gone.
- Test renders the arm from a synthetic projection, runs `surfaceIsClean`, asserts the old words absent and the built-elsewhere sentence present (would fail on restore).
- `node apps/viewer/run_tests.cjs` after merge: 516/517, the 1 is the node-fs tier skipped in a worktree (expected).
- Not run here: full pytest (author reported 3 red: worktree-expected viewer suite + 2 unrelated witness-lock tests, unverified on trunk), browser tiers (untouched).
- Landed on `integration` as fast-forward (0fdcfa77) and pushed.
