---
type: chore
priority: low
status: open
area: apps/annotate
class: guard_cannot_fail
reporter: agent
audience: strategy
found_by: docs/sessions/active/HANDOFF_20261021_mutation_tier_gates_on_every_pin_and_survives_a_board_move.md
---

# The annotator's `[real]` checks silently read the main checkout from a worktree, so `tests/test_annotate_js_suite.py` is green there where the viewer's wrapper is red

`apps/annotate/run_tests.cjs` resolves `data/projections/parts/names.json` and
`data/inbox/linkage-sweeps/` repo-relative first and then at a hardcoded
`C:/workspace/tolstack/...`. From a worktree it therefore reads the main
checkout's data and reports no SKIP, so the new wrapper (`tests/test_annotate_js_suite.py`)
applies the viewer wrapper's rule (a SKIP is a failure) but never meets it, and is
**green in a worktree** where `tests/test_viewer_js_suite.py` is deliberately red.

Two consequences, neither fixed by the handoff that added the wrapper (the runner
was not in its scope):

- The two wrappers answer the worktree question differently. Options: give the
  annotate runner the viewer's `--repo` seam and drop the hardcoded fallback (so a
  worktree SKIPs and the wrapper is red, one reading of the question), or keep the
  fallback and say so in both wrappers.
- The viewer runner pairs each projection's provenance stamp against the tree under
  test before trusting it (`test_viewer_js_suite.py`, "a stale tier is the same defect
  wearing a green"); the annotate runner has no such pairing, so a `[real]` check
  can compare this tree's code with another tree's projection and agree with itself.

Recommendation: the `--repo` seam plus the same freshness pairing, as one change to
`apps/annotate/run_tests.cjs`.
