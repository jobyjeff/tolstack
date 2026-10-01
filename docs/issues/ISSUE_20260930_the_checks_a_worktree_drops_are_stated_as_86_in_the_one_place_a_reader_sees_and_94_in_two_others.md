---
type: chore
priority: low
status: deferred
area: tests/viewer
class: unpaired_hand_copy
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20260930_guard_census_pins_the_set_not_the_count.md
defer_until: 2026-10-31
---

# How many `[real]` checks a worktree drops is written `~86` in the message a reader gets and `~94` in the two places written today

Three live sites state the same quantity — how many viewer checks do not run in
a worktree, where `data/projections/viewer/` is absent — and they disagree:

| site | figure |
|---|---|
| `tests/test_viewer_js_suite.py:129` (the failure message an agent reads) | `~86` |
| `scripts/guard_enumeration.mjs:412` (added 2026-09-30) | `~94` |
| `tests/test_mutation_witnesses.py:582` (added 2026-09-30) | `~94` |

**`94` is right today.** Measured in this review's worktree: `node
apps/viewer/run_tests.cjs` runs 422 of the 516 guards `apps/viewer/tests.js`
declares (`node scripts/guard_enumeration.mjs --executed` prints both numbers);
the same runner with `--repo C:/workspace/tolstack` runs 516/516. `86` dates
from 2026-09-18 (`real_tier_red_and_the_skipping_tier`, whose
`ISSUE_20260918_a_worktree_could_run_the_real_tier_against_the_main_checkout_instead_of_only_failing_on_it.md`
carries the same figure as a point-in-time measurement, which is fine there) and
the tier has grown eight checks since.

Nothing derives any of the three, so none of them fails when the tier grows —
the repo's most-cited defect class, and the site that matters is the one a
reader actually receives: `test_viewer_js_suite.py`'s message is the sentence an
agent hits on their first worktree `pytest -q`, and it under-reports what the
green they are being denied would have covered.

**The cheap fix is to stop stating it**, in all three: the message's job is
"the `[real]` tier did not run, run it with `--repo`", and the count adds
nothing an agent acts on. If a figure is wanted, `pairExecuted()` now computes
it exactly (`declared − executed` for the `fast` row), so a derived one is
available for the first time — but crossing modules to decorate an error
message is the more expensive half of the choice, not the obvious one.
