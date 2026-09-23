# BRIEF 2026-09-15 — mutation-witness enrollment: the tier exists, and joining it is nobody's job

> **CONSUMED 2026-09-23 — decided by the strategy session (Jeff live: both
> remediation arms measured flat, no seventh backlog handoff); expanded to
> `HANDOFF_20260923_mutation_witness_derived_enrollment_and_gating.md` and
> `HANDOFF_20260923_js_vocabulary_generated_from_python.md` (the pareto's
> R2), sequenced by depends_on.** Enrollment becomes mechanical, the HONEST
> version: entry ids derive from test names so the set of guards and the set
> of witnessed guards are ONE enumeration — this also removes the hand-kept
> JSON table two agents collided over (the 09-22 sharpest instance). AND the
> 09-22 finding's second guard is bought too: the tier's exit code means
> something — NOT WITNESSED fails, and the main-checkout pre-batch-merge
> check discipline runs it (a witness that decays between branch and trunk
> is caught at the merge, not by the next audit). The "flat is fine" answer
> is rejected on the brief's own evidence (one-line-from-reverted blockers).
> The 13 open instances are the derivation handoff's DoD, cleared at a
> stroke. The at-source rule (a handoff that adds a guard enrolls it in the
> same change — trivial once ids derive) rides dispatch's
> `prompt_antipattern_hardening`. Cost-gate note: the direction doesn't
> hinge on the pending N/M baseline; the derivation handoff's FIRST
> deliverable is measuring it.

Filed by triage 2026-09-15 as this sweep's **step-5 bug-class finding** — not a
request for a checklist entry (there are already five), but the question of what
change would make the class structurally impossible. No issue file is the source
of this brief; its source is the review corpus, measured below.

## The measurement

In the 2026-09-14/15 window, **9 of the 16 review reports in this repo** found a
guard that survives the mutation it exists to catch:

| report | the finding |
|---|---|
| `REVIEW_20260914_viewer_dag_spine_layout` | B1 render wiring, B2 leader-span centring — **both blockers** |
| `REVIEW_20260914_spec_crop_region_registry` | B1: one line reverts the whole deliverable, with 863 passed + 311/311 green |
| `REVIEW_20260915_projection_field_guard_rows` | the blocker: `prose_candidates()` cannot yield a `list[str]`, so the completeness arm never sees `notes` — 120 passed with the key dropped |
| `REVIEW_20260915_viewer_leader_grid_legibility` | S1 `state.leaderStyle` |
| `REVIEW_20260915_viewer_study_respine_animation` | S1 `chainable()`'s false branch |
| `REVIEW_20260915_viewer_transport_honest_hosted` | #3 "and nothing else", 100% green on three tiers |
| `REVIEW_20260915_respine_tween_fidelity` | nits 1a, 1b, 3 |
| `REVIEW_20260915_guard_mutation_witness_tier` | #1 `expect_red` |
| `REVIEW_20260914_viewer_browser_tier_wait_predicates` | the ninth sleep |

And in that **same window** the mutation-witness tier shipped
(`guard_mutation_witness_tier`, 2026-09-15: `scripts/mutation_witnesses.json`,
`scripts/run_mutation_witness_tests.mjs`, 12/12 witnessed). So the tier and the
nine findings are contemporaries. The tier did not reduce the rate, because it
cannot: **a mutation entry exists only when a reviewer remembers to hand-write
five strings for it.**

`docs/prompts/REVIEW_AGENT.md` already carries **five** entries for this class —
`A guard that no longer witnesses what it claims`, `The whole deliverable is one
line from being silently reverted`, `Mutate the plumbing lines too`, `A
persistence guard that returns the toggle to its default BEFORE the only
switch`, and `The deliverable is mutation-tested and the guard the author added
on their OWN initiative`. Two of them were added by the 2026-09-14/15 sweep
itself. The rate did not move.

This is `dispatch/docs/sessions/lessons/LESSONS_20260915_triage_sweep_guards_not_checklists.md`'s
own argument, one level up: a checklist promotion makes a class *visible to
whoever reads the checklist*; it does not make the class *impossible*. That
lesson's dispatch example had two promotions and zero reduction. This one has
five.

## The question this brief exists to answer

**Should enrollment in the mutation-witness tier be mechanical, and if so on
what key?**

The shape of the guard, per the review sweep: for every test or guard a diff
adds or modifies, either a `scripts/mutation_witnesses.json` entry names it, or
the diff records why not. Two implementations were sketched and they are not
equivalent:

- **The cheap version** — a test that reads the diff's added `test(...)` /
  `push(...)` names against the entry set. Works today, no refactor. But it
  keys on a *diff*, which means it is a CI/pre-merge check rather than a
  `pytest -q` invariant, and this repo's whole guard posture is that the suite
  is the gate.
- **The honest version** — make the entry ids derivable from test names, so the
  set of guards and the set of witnessed guards are the same enumeration rather
  than two hand-kept lists. This is a real refactor of the tier's identity
  scheme, and it is the version that ends the class rather than policing it.

Note the second is the same shape as `BRIEF_20260911_structural_count_pinning_convention.md` (now `CONSUMED`, merged into dispatch's brief below — re-pointed by the 2026-09-21 triage sweep)
and as dispatch's `BRIEF_20260906_guard_coverage_set_size_assertions.md`: *the
guard's coverage set is a hand-kept literal, and nothing asserts it covers the
thing it claims to.* A decomposition that solves enrollment by deriving the
enumeration is solving a workspace-wide shape in one repo, and should say so.

A third answer is legitimate and must be argued rather than assumed: **that
flat-rate is the right outcome** — review *is* catching these before they ship
(all nine were filed by review, none by a user), so the system may be working
as designed and the rate simply tracks how much guard code gets written. If
that is the read, close this with the reasoning recorded. But it has to contend
with the two blockers in `viewer_dag_spine_layout` and the one in
`spec_crop_region_registry`, where the deliverable was **one line from being
silently reverted with the whole suite green** — that is not "caught cheaply",
it is caught by an expensive human-shaped pass that happened to run.

## Prerequisite — read this first

`docs/sessions/HANDOFF_20260915_mutation_witness_tier_repair.md` (staged this
sweep, med/opus) fixes the tier's own plumbing and **must land before any
enrollment work**:

- `npm run test:mutations` cannot currently be green from anywhere — with no
  `--repo`, four of the ten declared mutations can never be witnessed, because
  the runner shadows only `apps/` and `scripts/` and the browser tier it spawns
  resolves `DATA_REPO` to the shadow root
  (`ISSUE_20260915_npm_run_test_mutations_can_never_be_green`).
- `expect_red` — half of what couples an entry to the tree — is paired to
  nothing, so a reworded sub-check silently orphans an entry
  (`ISSUE_20260915_expect_red_is_the_half_of_a_mutation_entry_nothing_cheap_checks`).

Enrollment on top of a tier that cannot run, keyed on a string that is not
paired, would be enrollment into nothing. Do not decompose this brief before
that handoff is in `completed/`.

## What this brief is not

The nine findings themselves. Each was dispositioned in its own review cycle,
and the four still-open ones are routed this sweep to
`respine_tween_fidelity_round2`, `viewer_value_guard_rows_and_replays`,
`annotate_hosted_page_posture` and `mutation_witness_tier_repair`. This is only
about whether enrollment gets a mechanism.

## 2026-09-22 triage sweep — a third data point on the curve, and it points the same way

This is evidence for the question above, not a re-route: the three fresh
instances below are staged as tactical work
(`docs/sessions/HANDOFF_20260922_mutation_witness_repair_and_enrollment.md`),
because the *instances* have always been cleared by a periodic backlog handoff
while the *mechanism* question waits here. No issue's `strategy:` was pointed at
this brief by the sweep; what is recorded here is what those instances say about
whether the mechanism is worth building.

**The registry grew 73 → 96 and the arrival rate did not move.**
`HANDOFF_20260921_mutation_witness_enrollment_backlog` reached `completed/` in
the 2026-09-22 batch merge and enrolled 22 of 26 proposed rows (commit
`f402884`) — the **second** dedicated backlog handoff in four days, after
`HANDOFF_20260918_mutation_witness_enrollment_gaps`. In the same week, three
more handoffs shipped guards and declared none of them:

| handoff | guards added | entry written |
|---|---|---|
| `HANDOFF_20260921_policy_free_brief_residues` | 4 | none — the enrolling handoff was **active in a sibling worktree**, so two agents editing one table would have collided |
| `HANDOFF_20260922_viewer_nav_verdict_into_alert_and_icon` | ~10 | none |
| `HANDOFF_20260922_viewer_summary_balance_sheet` | 4 + 2 surface enrollments | none |

So the pattern the brief predicted is now visible three times over: enrollment
is done by a *separate, later* session, which means it is nobody's job inside
the session that creates the debt. The middle row is the sharpest instance yet
and is an argument the "cheap version" of the mechanism has to answer: the
reason that handoff wrote no rows was **worktree contention on a single
hand-kept JSON table**. A per-diff CI check would have reddened it; a derived
enumeration would have removed the table it collided over.

**And the other half of the same coin: declared coverage is decaying.** Measured
by this sweep from the main checkout on `master` @ `836f11e`, clean tree,
`--only` per entry: all three entries named by
`ISSUE_20260921_three_declared_mutations_are_unwitnessed_on_trunk_after_the_batch_merge.md`
are **still NOT WITNESSED**, one day and a batch merge later, with three
*distinct* diagnoses (an over-broad mutation eaten by an earlier check; a
mutation that aborts the suite instead of failing a check; a witness that cannot
see the difference at all). The runner prints them and **exits 0**. One of the
three was reported WITNESSED on its own review branch hours before it reached
trunk.

That is the input the brief's third answer — *"flat-rate is the right
outcome"* — now has to contend with. Enrollment is not only failing to keep up
with new guards; the entries that do exist are silently losing their witnesses
between the branch that measured them and the trunk that runs them, and nothing
in the pipeline fails when they do. A mechanism keyed on "every guard has an
entry" would not have caught any of the three; a mechanism keyed on "the tier's
exit code means something, and the batch merge runs it" would have caught all
three. Those are two different guards, and the decomposition should say which
one it is buying, or that it is buying both.

**Cost input, still the freshest thing about this brief.** The 09-18 pass
measured ≈4 min/entry. The 09-21 pass added 23 entries. The handoff staged
today is instructed to report a third figure plus the first full-tier `N/M`
baseline written down since 54/54 on 2026-09-16 — the registry is 96 entries
now, so nobody can currently say whether the tier is regressing or has always
leaked. Decide after that number exists, not before; it is due this week.
