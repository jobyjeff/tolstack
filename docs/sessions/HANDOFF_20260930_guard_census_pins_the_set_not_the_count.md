---
priority: med
depends_on: []
model: opus
---

# HANDOFF 2026-09-30 — guard_census_pins_the_set_not_the_count: three ways to arrive unenrolled that move no number

Source: `docs/issues/ISSUE_20260923_the_guard_census_pins_a_count_not_a_set_so_three_arrivals_are_silent.md`
(`med`, `chore`, `area: guards/mutation-witness`). Baseline: tolstack trunk at
the 2026-09-30 triage sweep — nothing to merge this pass. Scope:
`scripts/guard_enumeration.mjs`, `DECLARED_GUARDS`,
`tests/test_mutation_witnesses.py`. Do NOT change the witness *specs*
themselves, and do not touch `apps/viewer/run_tests.cjs`'s
`projectionFreshness` — a sibling handoff staged this sweep owns it
(`projection_freshness_pairs_with_the_tree`); the two share no files.

## The mechanism works; this is about its blind spots

`mutation_witness_derived_enrollment_and_gating` (2026-09-23) made *"this guard
has no witness"* computable: `guard_enumeration.mjs` scans declarations,
`DECLARED_GUARDS` pins how many each source has, and
`test_the_enrollment_census_holds` reddens in under a second when the number
moves. Replayed at review: planting a guard reddens pytest naming the source and
the delta, and `--unenrolled` answers with the file name to write. **This is not
a complaint about the mechanism.**

It is about three arrivals it cannot see, all one cause: **the pin is a
cardinality and the thing it stands in for is a set.**

1. **One guard deleted and one added in the same change.** 513 → 513. If the
   deleted guard was unenrolled — the common case, **466 of 513** are — nothing
   moves and the new guard arrives with no spec and no signal.
2. **A new guard whose name already exists.** `enumerateGuards` deduplicates
   `(tier, name)` deliberately, so a second `test("<existing name>")` leaves
   `declared` unchanged. The `enrollable` column *does* move (513 → 512) and the
   runner prints it — but **nothing pins or gates `enrollable`**, so the move is
   silent in `pytest -q` and in the tier's exit code. What is new here is that an
   *enrolled* guard can slide into that population with nothing saying so.
3. **A declaration shape the scanner does not match.** The scan requires a
   `"…"` or `` `…` `` literal first argument: `test('…')` with single quotes, or
   a name from a helper or a loop, is not a declaration to the enumeration.
   Measured 2026-09-23: **zero** such declarations exist today, so this is a
   future hole, not a present miss — but a guard written that way is invisible
   in both directions at once (not censused → not enrollable → never reported).

**Why it matters more than it looks.** This census is now the *only* mechanism
between a new guard and the backlog the whole rework exists to end. Every other
check in `test_mutation_witnesses.py` asks whether existing specs are still
true; this one alone asks whether a guard arrived without one.

## The cheap half is already sitting there, unclaimed

**`declared` equals what the tier actually runs, and nothing says so.** Measured
on the merged tree 2026-09-23:

| source | `DECLARED_GUARDS` | what the runner executed |
|---|---|---|
| `apps/viewer/tests.js` | 513 | `node apps/viewer/run_tests.cjs --repo …` → **513/513** |
| `apps/annotate/run_tests.cjs` | 154 | `node apps/annotate/run_tests.cjs` → **154/154** |

Two sources, exact agreement, twice. That agreement is the evidence the scanner
has no false positives and no false negatives today — **and a reviewer produced
it by hand**, which is precisely the shape this repo keeps converting into a
standing check. Pairing the pin against the tier's own printed total makes the
scanner's accuracy falsifiable on every run and closes (3) outright: a
single-quoted guard executes and is not counted, so the two numbers part company.

Note the exclusion the issue already establishes: **the browser tier is not free
to pair this way** (it needs a browser). Say what you do about that asymmetry
rather than quietly pairing two of three sources.

## Why opus

The mechanical reading — "pin the set instead of the count" — is a large,
churn-heavy artifact (513 names in a fixture) that makes every legitimate guard
rename a merge conflict, and it is not obviously the right answer. The work is
choosing which of the three arrivals to close and by what means, given that the
cheapest lever (pair against the runner's own total) closes one outright and
narrows another without pinning any set at all. Getting this wrong produces a
check nobody can live with, which is how the hand-maintained witness registry
became its own problem.

## Deliverables

1. **Pair `declared` against the tier's own executed total** for the two sources
   where that is free, and state in the code what the browser tier does instead.
2. **Gate or pin `enrollable`**, so arrival (2) stops being silent — or argue
   explicitly why it should not be gated, given it is a real population
   (4 of the browser tier's 31 unenrollables are multiply-declared names).
3. **Decide arrival (1) — the same-change swap — on its merits.** This is the
   one that genuinely wants set-awareness. Weigh a full name-set pin against
   cheaper options (a spec-orphan check already catches the enrolled half;
   something keyed on the *unenrolled* names only, which is the 466). Implement
   your choice; record what you rejected and the churn cost that decided it.
4. **Compute the honest limits rather than leaving them for the next reviewer.**
   Whatever remains uncovered after 1–3 must be stated by the tooling itself —
   the same way the `python` hole was named in
   `ISSUE_20260923_the_guard_census_cannot_see_a_pytest_guard.md`. A gate with
   known bypasses is still worth having; an *undocumented* one is not.

## Definition of done

- The scanner's accuracy is falsifiable on every run for the sources where that
  is possible, and the browser tier's exemption is stated in the code.
- Arrivals (2) and (3) are closed or explicitly declined with reasons; (1) is
  decided on its merits with the rejected option and its churn cost recorded.
- The census's residual blind spots are emitted by the tooling, not left in a
  review report.
- Green: `venv-win/Scripts/python.exe -m pytest -q tests/test_mutation_witnesses.py`,
  `node apps/viewer/run_tests.cjs --repo .`, `node apps/annotate/run_tests.cjs`,
  and the full `venv-win/Scripts/python.exe -m pytest -q`.
- Lesson (`docs/sessions/lessons/LESSONS_20260930_guard_census_pins_the_set_not_the_count.md`):
  which arrivals you closed and which you left, with the churn argument; and
  whether "pin a count as a proxy for a set" appears anywhere else in this repo's
  guards — the 2026-09-30 sweep found this issue is one of **three** on that exact
  shape, so a third sighting here would make it a class worth a refactor rather
  than three fixes.
