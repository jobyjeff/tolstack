---
priority: med
depends_on: []
model: opus
---

# HANDOFF 2026-09-15 — mutation_witness_tier_repair: make the mutation-witness tier runnable and self-checking

Source: triage sweep 2026-09-15, consolidating three issues filed out of
`guard_mutation_witness_tier` (completed 2026-09-15) and its review. Baseline:
trunk after the 2026-09-15 batch merge (`integration` merged to `master`,
880 passed / 1 skipped). Scope: `package.json`,
`scripts/run_mutation_witness_tests.mjs`, `scripts/mutation_witnesses.json`,
`tests/test_mutation_witnesses.py`, and the **suite-registry / repo-default
portions** of `scripts/run_viewer_browser_tests.mjs`. Do NOT touch
`apps/annotate/`, `apps/viewer/topology.js`, `apps/viewer/views/`,
`apps/viewer/tests.js` or `apps/viewer/README.md` — those belong to the three
handoffs staged alongside this one (`annotate_hosted_page_posture`,
`respine_tween_fidelity_round2`, `viewer_value_guard_rows_and_replays`), two of
which are sequenced behind this one precisely because they rename sub-checks
this tier pairs against.

Read these three issues in full — each carries the measured evidence and the
fix shape its author had in mind:

- `docs/issues/ISSUE_20260915_npm_run_test_mutations_can_never_be_green.md` (bug, med)
- `docs/issues/ISSUE_20260915_expect_red_is_the_half_of_a_mutation_entry_nothing_cheap_checks.md` (bug, med)
- `docs/issues/ISSUE_20260915_the_suites_registry_restates_every_label_it_dispatches_on.md` (chore, low)

## Deliverables

1. **`npm run test:mutations` must be able to be green — from the main
   checkout and from a worktree.** Today the script is
   `node scripts/run_mutation_witness_tests.mjs` with no `--repo`, and with no
   `--repo` four of the ten declared mutations (the `[real]` ones) can never be
   witnessed: the mutation runner shadows only `apps/` and `scripts/` into
   `tmp/mutation-witness/`, never `data/`, and the browser tier it spawns there
   resolves `const REPO = normalize(join(HERE, ".."))` — the **shadow** root —
   so `DATA_REPO` defaults to a directory that by construction holds no
   projection. That is not a worktree-only problem: it holds when run from the
   main checkout too, which is the fact the runner's own note gets wrong. It
   currently prints *"From a worktree, pass `--repo <main checkout>`"*, framing
   the flag as a worktree escape hatch when it is the only way the command works
   at all.
   Decide and implement one of: (a) have the mutation runner pass the real
   repo's `data/` through to the spawned browser tier by default (deriving it
   from the *source* tree it shadowed from, which it knows), so a bare
   `npm run test:mutations` witnesses all ten; or (b) keep the flag mandatory
   but make `package.json`'s script pass it and make the no-`--repo` message
   state the true reason. **(a) is the suggestion to try first** — it removes a
   footgun rather than documenting it — but if shadowing the data path turns out
   to break the isolation the shadow exists for, (b) plus an accurate message is
   an acceptable outcome. Either way the runner's note must stop saying
   something false, and `LESSONS_20260915_guard_mutation_witness_tier.md` §1's
   claim about where the tier hangs off must end up true.

2. **Pair `expect_red` to the tree, the way `find` already is.** A
   `scripts/mutation_witnesses.json` entry couples to the tree with two strings:
   `find` (where the mutation lands, in the app) and `expect_red` (the sub-check
   name the owning tier must print). `tests/test_mutation_witnesses.py` pairs
   `find` on every `pytest -q` and its docstring says why — *"an entry whose
   `find` no longer resolves is not a failing guard, it is a guard that quietly
   stopped being checked"* — and every word of that is equally true of
   `expect_red`, which nothing checks. Measured 2026-09-15: replacing one
   entry's `expect_red` with `"a check name nobody prints"` left
   `pytest -q tests/test_mutation_witnesses.py` at **6 passed in 0.03s**; the
   only symptom was a `NOT WITNESSED` from a ~7-minute browser sweep. Add the
   assertion so a reworded sub-check name reddens in milliseconds. Note the
   interaction with deliverable 3: if the sub-check names are discoverable from
   the tier source by the same mechanism the suite labels are, do it once.

3. **Pair the `SUITES` registry keys to the labels they restate.** The registry
   in `scripts/run_viewer_browser_tests.mjs` keys each suite on its **printed**
   label, because `--only` matches on it ("so a filter can be copied straight
   off a failing line"). Every key is a hand copy: for suites that take their
   label as an argument the string is written twice on one line; for
   `testRebuildAffordance`, `testAnnotateFlyout` and `testAnnotateHostedPosture`
   the key copies a `const label = "..."` hundreds of lines away in another
   function. All nineteen agree today and nothing keeps them agreeing. Reword a
   label and `--only "<label off the failing line>"` silently matches no suite,
   while `scripts/mutation_witnesses.json`'s `suite` fields still hold the stale
   key. Make the label single-sourced (have the suite export/return its label,
   or derive the key from it) rather than adding a test that compares two hand
   copies — a pairing test is the fallback if single-sourcing turns out to be
   structurally awkward, in which case say why in the lesson.

## Definition of done

- `npm run test:mutations` run from `C:\workspace\tolstack` reports every one of
  the ten declared mutations as witnessed (or, under route (b), the script
  itself passes the flag and the same is true) — paste the run's summary lines
  into the lesson.
- `tests/test_mutation_witnesses.py` reddens when an entry's `expect_red` is
  edited to a name nothing prints. Demonstrate it: make the edit, show the
  failure, revert. Same demonstration for a reworded suite label against
  whatever guards deliverable 3.
- `venv-win/Scripts/python.exe -m pytest -q` green (baseline 880 passed,
  1 skipped), and `node apps/viewer/run_tests.cjs` (or the repo's fixture-tier
  entry point) green.
- Lesson (`docs/sessions/lessons/LESSONS_20260915_mutation_witness_tier_repair.md`):
  which route you took for deliverable 1 and what you measured that decided it;
  whether `expect_red` and the suite labels ended up guarded by one mechanism or
  two, and why; and the true statement of what a bare `npm run test:mutations`
  now covers, so the next agent does not have to re-derive the
  `REPO`/`DATA_REPO` defaults from the source.
