---
type: chore
priority: med
status: resolved
area: prompts/review
reporter: agent
handoff: docs/sessions/HANDOFF_20260918_mutation_witness_enrollment_gaps.md
audience: strategy
found_by: docs/sessions/HANDOFF_20260916_mutation_witness_tier_reaches_its_checks.md
resolution: handoff completed 2026-09-18 -- closed automatically by dispatch when handoff `mutation_witness_enrollment_gaps` moved to completed/; not independently verified.
---

# A review agent's own merge into `integration` is the one place `run_mutation_witness_tests.mjs` is never re-run

Carried forward from
`ISSUE_20260915_the_card_layout_out_of_flow_mutation_witness_stopped_witnessing_on_integration.md`,
which is now `resolved` — the card defect it reported is fixed, but its closing
suggestion is a separate change with no owner left once that issue closes. This
file is that owner.

## The evidence, already measured

`card-layout-out-of-flow` was WITNESSED at `473106e`, `0b898da`, `f629942` and
`0573826`, and **NOT WITNESSED from `afcbbb4` onward** — a review merge
(`Merge branch 'integration' into review/pitch_link_known_bands`) that brought
`viewer_study_verdicts_and_gaps`, `respine_tween_fidelity_round2` and
`annotate_hosted_page_posture` together.

**None of the three branches could have caught it.** Each was green alone; the
tier only fails with both sides present. That is the defining shape of a
merge-only regression, and the mutation-witness tier is the only tier that can
see it — which is precisely the tier a review agent does not re-run before it
merges. The coverage left `integration` silently and stayed gone for four days
and three duplicate filings.

## Why it is not just "run more tests"

The three behaviour tiers answer *does the app still behave?*. This one answers
*would the guards notice if it didn't?*, and it is the only one whose answer can
change **as a result of a merge** while every branch involved is green. So the
merge is not an incidental moment to re-run it — it is the only moment that
catches this class at all.

Against that: the tier costs a browser and several minutes, and needs
`--repo <main checkout>` (`ISSUE_20260915_npm_run_test_mutations_can_never_be_green.md`
— that flag is not a worktree escape hatch, it is the only way the command
works). A review agent's cycle is already long. So this is a cost/placement
decision, not an obvious yes — hence `audience: strategy`.

Shapes worth weighing:

- **run the full tier before every review merge** — complete, and the most
  expensive;
- **run it only when the merge touches `apps/` or `scripts/`** — the shadow tree
  is exactly those two directories plus `docs/topologies/`, so the trigger is
  mechanical and cheap to state;
- **run it in the operator's `integration` → trunk batch merge instead** —
  cheapest, and it catches the regression one merge later than it entered, which
  is still four days earlier than this one was caught;
- **run only the entries whose `file` the merge touched** — `--only` filters on
  the entry id, not on the file, so this needs a small runner change first.

## Where the change would land

`docs/prompts/REVIEW_AGENT.md` (this repo's override, which dispatch composes
onto the canonical prompt) if the rule is tolstack-specific, or
`dispatch/dispatch/prompts/REVIEW_AGENT.md` if it generalises. Only tolstack has
a mutation-witness tier today, so the override is the likely home — but the
*principle* ("a tier that can only fail at a merge has to be run at the merge")
is not repo-specific, and that is the part worth a strategy read.
