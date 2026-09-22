---
type: chore
priority: med
status: triaged
area: scripts/mutation_witnesses
reporter: agent
handoff: docs/sessions/HANDOFF_20260921_mutation_witness_enrollment_backlog.md
found_by: docs/sessions/reviews/REVIEW_20260918_reader_facing_surfaces_second_pass.md
---

# Thirteen guards from `reader_facing_surfaces_second_pass` have no mutation-witness entry, and the handoff they were written down for closed the same day

`reader_facing_surfaces_second_pass` was told not to touch
`scripts/mutation_witnesses.json` because `mutation_witness_enrollment_gaps`
owned it, and to **name its new guards in its lesson for that handoff to
enroll**. It did exactly that — `LESSONS_20260918_reader_facing_surfaces_second_pass.md`,
"For `mutation_witness_enrollment_gaps` — the guards this session added",
thirteen rows with the mutation each claims to catch, spelled out.

`mutation_witness_enrollment_gaps` reached `completed/` and merged on
**2026-09-18** (`0b849fa`, `62fd404`), before this work was reviewed. The
handoff the lesson hands off to does not exist any more, so the thirteen rows
have no owner and no one is scheduled to read them.

The list, verbatim from the lesson — nine in `apps/viewer/tests.js`, three in
`apps/annotate/run_tests.cjs`, one more viewer markup scan — each already
carries the `find`/`replace` shape an entry needs, because the lesson wrote
down the mutation and not just the check name. Enrolling them is transcription,
not design.

**Two things to get right when enrolling:**

* `apps/annotate/run_tests.cjs` is the `"annotate"` tier
  (`tests/test_mutation_witnesses.py`'s `TIERS`), and per
  `ISSUE_20260915_the_annotate_fast_tier_cannot_own_a_mutation_witness` that
  runner is both harness and suite — check what that means for a `suite: null`
  entry before writing one.
* `expect_red` is compared as a **substring** by the pytest half and for
  **equality** by the runner
  (`test_no_expect_red_is_a_truncated_check_name`), so paste the check name
  whole. Two entries were filed truncated on 2026-09-18 for exactly this
  reason.
