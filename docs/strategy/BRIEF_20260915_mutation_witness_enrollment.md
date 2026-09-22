# BRIEF 2026-09-15 — mutation-witness enrollment: the tier exists, and joining it is nobody's job

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
