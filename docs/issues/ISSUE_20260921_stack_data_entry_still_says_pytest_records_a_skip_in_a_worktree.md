---
type: chore
priority: med
status: open
area: prompts/review
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20260921_review_overlay_test_cadence.md
---

# The review overlay's "A STACK-DATA change is a viewer-test change" entry still says pytest records a *skip* in a worktree — it records a *failure*, and has since 2026-09-18

`docs/prompts/REVIEW_AGENT.md`, the *"A STACK-DATA change is a viewer-test
change, and `pytest -q` is structurally blind to it"* entry under "Recurring
bugs to check", reads:

> `tests/test_viewer_js_suite.py` runs the JS runner **without** `--repo`, so
> from a worktree the node-fs tier reports itself skipped and pytest records a
> `skip`, deliberately ("a red suite that means 'you are in a worktree' trains
> people to ignore red suites").

Both halves are now wrong, and the quoted rationale is the one that was
**reverted**. `real_tier_red_and_the_skipping_tier` (2026-09-18) made a skipped
tier a failure — `tests/test_viewer_js_suite.py`'s module docstring states it in
as many words ("**A TIER THAT CANNOT RUN IS NOT A TIER THAT PASSED**") — and
measured this review, the worktree reports:

```
FAILED tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green
1 failed, 1208 passed in 59.20s
```

The same overlay already says so correctly two thousand lines earlier ("a
worktree's `pytest -q` is `1 failed, …` by design"), so the file disagrees with
itself.

## Why it is `med` and not a nit

The entry's *conclusion* — grep `apps/viewer/tests.js` for the moved number
before you judge the suite green, then rebuild and run the tier through
`--repo` — is still right, and the new "Choosing the risky subset" mapping
(2026-09-21) cross-references this entry for exactly that. But the reasoning
under it now teaches a reviewer that a worktree `pytest` *skips* the tier
quietly, which is the behaviour the 2026-09-18 change exists to abolish. A
reviewer who believes it will read the `1 failed` as a real regression, or
worse, learn to expect a silent skip that no longer happens.

## Fix

Re-derive and rewrite the two sentences, keeping the entry's conclusion:
`pytest` in a worktree is **red, not silent**, and what it cannot tell you is
whether the `[real]` assertions pass — only the tier through `--repo` answers
that. Check the entry's "structurally blind" framing survives the rewrite: in
the **main checkout** `data/` is present, so the `[real]` tier does run under
`pytest`, and the blindness there is staleness of the projection rather than a
skip.

Out of scope for `review_overlay_test_cadence`, whose brief was the file's
*test-cadence* sentences; this is a factual drift in a different entry.
