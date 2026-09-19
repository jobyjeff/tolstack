---
priority: med
depends_on: []
model: opus
---

# HANDOFF 2026-09-18 — mutation_witness_enrollment_gaps: six handoffs' guards were watched reddening by hand and never declared, and the tier has no word for pytest

Source: the 2026-09-18 triage sweep, routing six open issues that are one class
— **a guard demonstrated reddening in one session's lesson is a hand check no
runner repeats, which is the exact gap `mutations[]` exists to close** (its own
`about` block: *"An entry here is how that hand check becomes a standing one"*):

- `docs/issues/ISSUE_20260916_the_mutation_witness_table_has_no_tier_for_a_pytest_guard.md` (feature, med)
- `docs/issues/ISSUE_20260916_three_new_guards_have_no_mutation_witness_entry.md` (chore, med)
- `docs/issues/ISSUE_20260916_the_reader_facing_copy_guards_have_no_mutation_witness_entry.md` (chore, med)
- `docs/issues/ISSUE_20260916_the_crop_lightboxs_new_guards_carry_no_mutation_witnesses.md` (chore, med)
- `docs/issues/ISSUE_20260916_the_sticky_rails_witness_note_describes_a_limit_that_no_longer_exists.md` (chore, low)
- `docs/issues/ISSUE_20260916_a_review_merge_is_the_one_place_the_mutation_tier_is_never_re_run.md` (chore, med, `audience: strategy`)

Baseline: trunk at `5809360`, the 2026-09-18 batch merge, with
`HANDOFF_20260915_mutation_witness_tier_repair.md` and
`HANDOFF_20260916_mutation_witness_tier_reaches_its_checks.md` both in
`completed/`. Scope: `scripts/mutation_witnesses.json`,
`scripts/run_mutation_witness_tests.mjs`, `tests/test_mutation_witnesses.py`,
`docs/prompts/REVIEW_AGENT.md`. Do NOT change any guard's assertion or any app
code — if a guard turns out not to redden on its declared mutation, **file that
and stop**, do not adjust the guard to fit the witness.

## What this handoff is NOT

`docs/strategy/BRIEF_20260915_mutation_witness_enrollment.md` asks whether
enrollment should become **mechanical** — a diff-reading CI check, a derived-id
refactor, or an argued acceptance that the flat rate is correct. That question
stays with the brief, and it is now **decidable**: its stated gate (*"`HANDOFF_20260915_mutation_witness_tier_repair.md`
must land before any enrollment work"*) has lifted, as of this sweep.

This handoff clears the **current backlog by hand**, which is what happens today
whether the brief is decided or not. Doing so does not pre-empt the brief — and
it gives it something it currently lacks: a measurement of what one enrollment
round actually costs, which is the input to "is a mechanism worth building?".
Record that cost in the lesson deliberately.

## Deliverables

1. **Give `tier` a word for pytest — this one unblocks the others.**
   `scripts/mutation_witnesses.json`'s `tier` vocabulary is `fast` | `annotate` |
   `browser`: three node harnesses, written in exactly two places (`TIER_HARNESS`
   in `scripts/run_mutation_witness_tests.mjs`, `TIERS` / `CHECK_SOURCE` in
   `tests/test_mutation_witnesses.py`) and paired against each other on every
   pytest run. There is no word for `venv-win/Scripts/python.exe -m pytest`, so a
   guard whose only tier is pytest can be **demonstrated** and cannot be
   **declared**. Add the tier, in both places, keeping the existing pairing test
   honest — and note that the harness for this tier is the suite that is *already
   running the pairing test*, so think about re-entrancy before you wire it.

2. **Enroll the three from `js_guards_and_suite_isolation`.** All three were
   watched reddening by hand; the issue says all three are paste-ready. The
   blocker deliverable 2 of that handoff named is **already gone** —
   `ISSUE_20260915_the_annotate_fast_tier_cannot_own_a_mutation_witness.md` is
   `status: resolved`, closed by `mutation_witness_tier_reaches_its_checks`. Do
   not re-derive that; just check it is still true and declare.

3. **Enroll the two from `reader_facing_copy_and_vocabulary`.** Same shape, same
   cause: that handoff's fence said *"Do not enroll your new guard in the witness
   tier yourself; name it in your lesson so that handoff can"* — and the handoff
   it pointed at is in `completed/`, so there is no session left to do it. This
   is that owner.

4. **Enroll the crop lightbox's guards.** `crop_lightbox_zoom_viewer` added 16
   fast-tier checks and one browser suite and declared **no** entries; the tier
   still reports 54/54, so nothing is red — the guards are simply outside the set
   of claims shown to bite. The issue names three worth a witness and the exact
   mutation each should redden. Start with the highest-value one, and note *why*
   it is highest-value: `transform-origin: 0 0` on `.lightbox__pan` in
   `apps/viewer/style.css` — changed to the CSS default `50% 50%`, the browser
   suite's anchor check should fail, because the pure layer measures anchors from
   the stage's top-left and a centred origin offsets every zoom by half the
   stage. **It is a stylesheet claim, which is precisely the class a class-name
   assertion passes straight through.**

5. **Correct the stale `sticky-rails-hold-a-scrolled-dag` note.** Its `note`
   still ends by describing the limit `topology_grid_scroll_and_grips` removed
   (`.tv__body { width: max-content }` makes the sticky's containing block the
   content's width, so the rails hold for the whole horizontal scroll). The
   arm was rewritten in that change and now reads *"and it holds PAST the room
   the DAG leaves beside it, all the way to the far end"*. The note's "the issue
   above tracks" is spent too — the issue it points at is closed by that change.
   Make the note say what the arm now checks.

6. **The review merge is the one place the tier is never re-run — fix the
   process gap, not the tier.** Measured: `card-layout-out-of-flow` was
   WITNESSED at `473106e`, `0b898da`, `f629942` and `0573826`, and **NOT
   WITNESSED from `afcbbb4` onward** — a review merge (`Merge branch
   'integration' into review/pitch_link_known_bands`) that brought three
   handoffs together. A merge is exactly where two independently-green changes
   can stop witnessing each other, and it is the one point in the lifecycle
   where nothing re-runs the tier.

   The fix is one line in `docs/prompts/REVIEW_AGENT.md`: after a review agent
   merges `integration` into its review branch, re-run
   `node scripts/run_mutation_witness_tests.mjs` and report the count. Write it
   as an instruction with the measured evidence beside it, so the next reader
   knows it is not a ritual. This issue carries `audience: strategy`; the sweep
   judged it below the brief bar — it is a single-repo prompt gap with a known
   answer, not a contested decision — and that judgement is recorded here for
   review.

## Definition of done

- `node scripts/run_mutation_witness_tests.mjs` passes with **every** newly
  declared witness actually observed reddening on its declared mutation, and the
  before/after witness counts in the report (54/54 today).
- A pytest-tier witness exists, runs, and is paired in
  `tests/test_mutation_witnesses.py` the way the three node tiers are.
- No witness `note` in `scripts/mutation_witnesses.json` describes a limit or
  an issue that no longer exists — check all of them while you are in the file,
  not just the one filed.
- `docs/prompts/REVIEW_AGENT.md` tells a review agent to re-run the tier after
  its own merge into the review branch.
- `PYTHONIOENCODING=utf-8 venv-win/Scripts/python.exe -m pytest -q` green. In a
  worktree the venv is absent — use
  `C:/workspace/tolstack/venv-win/Scripts/python.exe` — and note that the
  `[real]` tier reads gitignored `data/`, so point it at the main checkout with
  the runner's `--repo C:/workspace/tolstack` seam rather than treating the
  environment failure as a red (measured 2026-09-18: a worktree cannot run 86 of
  455 checks).
- Lesson (`docs/sessions/lessons/LESSONS_20260918_mutation_witness_enrollment_gaps.md`):
  **the cost of this round, in wall-clock and in guards that turned out not to
  redden.** That number is the input
  `docs/strategy/BRIEF_20260915_mutation_witness_enrollment.md` needs and does
  not have. Also: how many of the six gaps traced back to a *"do not enroll
  yourself, name it in your lesson"* fence pointing at a handoff that had
  already completed — if that is the dominant cause, the mechanism question has
  a much cheaper answer than CI, and saying so is the most useful thing this
  session can produce.
