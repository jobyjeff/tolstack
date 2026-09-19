---
type: chore
priority: med
status: open
area: apps/viewer
reporter: agent
found_by: docs/sessions/HANDOFF_20260918_reader_facing_surfaces_second_pass.md
---

# The typography suite's source-note clamp checks lost their subject, and were replaced by a check on the outcome rather than re-pointed

Filed so the substitution is visible to whoever owns the typography rules,
which is not this handoff. **Resolved in the branch that caused it** — this
issue exists because a guard changed meaning, not because anything is red.

## What happened

`visual_rules_nothing_checks` wrote two sub-checks on 2026-09-18
(`scripts/run_viewer_browser_tests.mjs`, rule 5 of *typography pass's visual
rules (live stack view)*):

* *a row's source note really has more in it than the row shows* — the
  anti-vacuity witness;
* *...and it is clamped to a PREVIEW of at most three lines.*

Both read `#stackview .el-row__srcnote:not(.el-row__srcnote--open)`. The claim
they carried: **the note in a row is a preview, so it is not the thing setting
the row's height.**

`reader_facing_surfaces_second_pass`, cut from `47134d6` the same day, retired
the composite source cell in both tables — the note, the callout, the values
line, the spec-library reference, the designation citation and the outstanding
request all moved to the preview pane, and `.el-row__srcnote` is now rendered
by nothing at all.

**Neither branch could see the other.** Each was green alone; the merge was
**9/9 → 7/9**, measured on both sides by the review agent, who did the sweep
and confirmed this is the only live guard standing on any selector the retiring
branch removed.

## What was done, and the choice

**Retired and replaced, not re-pointed.** The two remaining clamped previews in
this app are `hovercard__note` (a hover card) and `el-export__note` (the
*pane's* export note). Neither sits in a table row, so neither carries the
row-height argument, and pointing the old sentence at one of them would be a
new claim wearing an old one's words.

What the rule is actually about is **how tall a data row is**, and that is
measurable directly. Rule 5 now asserts:

* **the witness** — selecting a materials row puts strictly *more* of its
  sourcing in the preview pane than the row itself carries, so the row is short
  because its detail moved rather than because it was deleted;
* **the claim** — no materials row is more than twice the tallest elements row.

Measured on `hub_bearing_thermal_fit_m1` at 1600×1000: before the retirement,
653px against elements rows of 88–112px (750px before the clamp tightened on
2026-09-17); after, 111–169px. Both halves were hand-planted and watched
failing — re-adding the pane's lines to the row gives **5.3×** and reddens the
claim; making the material pane render nothing reddens the witness (313
characters on the row against 260 in the pane).

This is strictly the only place the claim can live: the fast tier runs against
a DOM shim with no layout, so its structural twin (`[real] the materials ROW
keeps only what decides whether to click it`) can say the pane's nodes are
absent from the row but cannot say the row is short.

## Why it is still worth an issue

Three things a later session may want to revisit, none of them blocking:

1. **The factor of two is slack and is a judgement.** The materials table's
   designation column holds a real specification string that wraps, so the
   tallest materials row is legitimately taller than the tallest elements row.
   Two is "reads as a row, not as a block", not a pixel budget. If the two
   tables' densities are ever tuned against each other properly, this is the
   number to revisit.
2. **The clamp rule itself is now unguarded.** `.el-export__note` is still
   clamped at `2.8em` in the preview pane, and nothing asserts it. Whether it
   *should* be clamped there is a separate question — the pane's own stated job
   is to hold the full written argument, and its citation note
   (`.detail__note`) is deliberately unclamped, so the export note may be the
   odd one out rather than the thing to re-guard.
3. **The two new sub-checks have no mutation-witness entry**, like every other
   guard this handoff added — see
   `ISSUE_20260918_thirteen_new_guards_have_no_mutation_witness_and_their_enrolling_handoff_closed.md`.
   The mutations are named above and in
   `docs/sessions/lessons/LESSONS_20260918_reader_facing_surfaces_second_pass.md`.

## Where the pieces are

* `scripts/run_viewer_browser_tests.mjs`, rule 5 of `testTypographyRules` — the
  replacement, with the retirement argued in place
* `apps/viewer/views/stack.js`, `materialSourcingCell` — what the row keeps
* `apps/viewer/views/detail.js`, `renderMaterial` — where the rest went
* `docs/sessions/reviews/REVIEW_20260918_reader_facing_surfaces_second_pass.md`,
  round 2 — the measurement and the sweep
