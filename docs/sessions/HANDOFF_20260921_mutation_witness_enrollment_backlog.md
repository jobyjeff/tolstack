---
priority: med
depends_on: []
model: sonnet
---

# HANDOFF 2026-09-21 — mutation_witness_enrollment_backlog: transcribe 26 orphaned witness rows whose enrolling handoff closed underneath them

Source: the 2026-09-21 triage sweep. Two open issues, filed 2026-09-18, each
reporting the same accident: a handoff was correctly fenced out of
`scripts/mutation_witnesses.json` and told to **name its new guards in its
lesson so the enrollment handoff can declare them** — and
`mutation_witness_enrollment_gaps` reached `completed/` and merged *while those
branches were still open*. The lists were written; the reader was gone.

Baseline: tolstack trunk at `1946330`, the 2026-09-21 batch merge, with
`scripts/rebuild_projections.ps1` already re-run (all three projections at
`behind_trunk=0`). Scope: you own `scripts/mutation_witnesses.json` and
`tests/test_mutation_witnesses.py`. Do **NOT** change any guard, any check, or
anything under `apps/` — every entry below is transcription of a mutation
somebody already measured, and if an entry does not reproduce, that is a
finding to report, not a guard to adjust.

**`model: sonnet` deliberately.** This is well-scoped mechanical work against
two tables that already exist in prose, with the traps named. The judgement was
done by the sessions that measured the mutations.

## What to transcribe, and where the tables are

**Set A — 13 rows from `reader_facing_surfaces_second_pass`.**
`docs/sessions/lessons/LESSONS_20260918_reader_facing_surfaces_second_pass.md`,
section *"For `mutation_witness_enrollment_gaps` — the guards this session
added"*: thirteen rows, each with the mutation it claims to catch spelled out.
Nine in `apps/viewer/tests.js`, three in `apps/annotate/run_tests.cjs`, one
more viewer markup scan. Issue:
`docs/issues/ISSUE_20260918_thirteen_new_guards_have_no_mutation_witness_and_their_enrolling_handoff_closed.md`.

**Set B — 13 claims from `visual_rules_nothing_checks`.**
`docs/sessions/lessons/LESSONS_20260918_visual_rules_nothing_checks.md` §4 is
the full table with the `expect_red` strings. Four guards carrying thirteen
witnessable claims. **These entries are measured, not proposed** — each `find`
was verified to occur exactly once in its file, and each was planted in a
`git archive HEAD` scratch tree and observed reddening the named check. Issue:
`docs/issues/ISSUE_20260918_thirteen_new_guards_from_visual_rules_nothing_checks_have_no_mutation_witness_entry.md`.

Set B's distribution, from the issue, so you can check your own arithmetic:

| tier | suite | count |
| --- | --- | --- |
| browser | `typography pass's visual rules (live stack view)` (**new suite**) | 6 |
| browser | `crop lightbox (launch, zoom, pan on the live crops)` | 2 |
| browser | `real render path (non-mock)` | 2 |
| fast | — | 1 |
| python | `tests/test_app_type_scale.py` | 2 |

## Five traps, all already discovered — do not rediscover them

1. **Set B needs one new suite registered** so its `suite` values resolve
   against the `SUITES` registry: `typography pass's visual rules (live stack
   view)`. Register it before adding the six rows that name it.
2. **`crop-trigger-is-not-filled` and `attention-flag-is-not-filled` redden the
   same sub-check** — the fill census is one assertion covering every mark on
   the page. **Two entries, one `expect_red`.** That is correct, not a
   copy-paste slip; do not collapse them and do not invent a second
   `expect_red`.
3. **`lightbox-opens-modal-on-file-origin` reddens two sub-checks**, because
   `showModal()` → `show()` also leaves Escape without a dismiss. Read the
   lesson for which name to record.
4. **`expect_red` is compared as a substring by the pytest half and for
   equality by the runner** (`test_no_expect_red_is_a_truncated_check_name`).
   **Paste the check name whole.** Two entries were filed truncated on
   2026-09-18 for exactly this reason, so this trap has already cost a round.
5. **`apps/annotate/run_tests.cjs` is the `annotate` tier** and that runner is
   both harness and suite. Before writing a `suite: null` entry for any of Set
   A's three annotate rows, read
   `docs/issues/ISSUE_20260915_the_annotate_fast_tier_cannot_own_a_mutation_witness.md`
   and work out what it means for this tier. If it means those three rows
   **cannot** be enrolled as they stand, say so in your report and in your
   lesson and enroll the other ten — do not force an entry that the tier's
   shape does not support, and do not change the tier to make it fit.

## Deliverables

1. **Enroll Set A** (13 rows), minus any annotate rows that trap 5 rules out —
   with the exclusion named and reasoned if so.
2. **Enroll Set B** (13 claims), registering the new suite first.
3. **Run the witness tier over the result** and report its output verbatim:
   `npm run test:mutations`, plus `venv-win/Scripts/python.exe -m pytest -q
   tests/test_mutation_witnesses.py`. Every enrolled row must actually redden
   the check it names. **A row that does not reproduce is the interesting
   result of this session** — the mutation was measured on a branch three days
   ago and trunk has moved since, so a row that no longer reddens means either
   the guard changed or the `find` string is no longer unique. Report which,
   per row, and do not delete the row to make the tier green.
4. **Say what the total is now.** The tier's row count before and after, so the
   next reader can tell enrollment backlog from enrollment growth.

## Why this handoff is `depends_on: []` even though it shares the repo

`docs/sessions/HANDOFF_20260921_policy_free_brief_residues.md` is staged the
same day and touches `apps/viewer/views/banner.js`,
`scripts/run_viewer_browser_tests.mjs` and `docs/topologies/`. No overlap with
your two files, so the two can run in parallel. If that handoff lands first and
its deliverable 1 removes the last terminal command from the banner, a Set A row
that witnesses banner copy may need its `find` string re-read — check the row
against the file rather than against the lesson if you see a mismatch.

## Definition of done

- Every row from both lessons is either enrolled or excluded with a named
  reason; the count reconciles to 26 minus exclusions.
- `npm run test:mutations` and the pytest witness module both green, output
  quoted, with the before/after row count.
- No guard, check or app file changed — `git diff --stat` shows only
  `scripts/mutation_witnesses.json` and, if a suite registration lives there,
  `tests/test_mutation_witnesses.py`.
- Lesson (`docs/sessions/lessons/LESSONS_20260921_mutation_witness_enrollment_backlog.md`):
  **minutes spent, and rows per minute** — dispatch's
  `docs/strategy/BRIEF_20260906_guard_coverage_set_size_assertions.md` is
  weighing whether this enrollment should be mechanical at all, and its only
  cost measurement so far is ≈4 minutes an entry from the 09-18 pass. A second
  measurement over a 26-row batch is a different point on the same curve and is
  worth more to that decision than an opinion. Also: how many rows failed to
  reproduce, because that is the decay rate of a lesson-recorded mutation and
  nobody has ever measured it.
