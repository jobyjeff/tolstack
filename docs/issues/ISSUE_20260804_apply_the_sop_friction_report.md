---
type: chore
priority: high
status: closed
area: docs
reporter: agent
closed: 2026-08-05
closed_by: handoff sop_edits_apply
---

# Apply the pitch_link_stack SOP friction report (14 proposed edits)

> **CLOSED 2026-08-05** by handoff `sop_edits_apply` (commit `61e7386`). All 14
> edits are in `docs/SOP_TOLERANCE_STACK.md`, except edit 10, which the
> `pitch_link_stack` reviewer had already applied inline to
> `docs/prompts/REVIEW_AGENT.md` §3 in `6a5ce62` — verified there, not re-applied.
> Both extras filed below landed too: the pinned test count is gone from Step 0,
> and 217755 sheet 4's printed border range is corrected to A–L × 1–16. See
> `docs/sessions/lessons/LESSONS_20260805_sop_edits_apply.md` for what changed in
> wording and why.

Filed during the `pitch_link_stack` review (2026-08-04) so 14 well-formed,
already-drafted edits do not decay inside a lesson.

## What

`docs/sessions/lessons/LESSONS_20260804_pitch_link_stack.md` carries deliverable
3 of that handoff: a friction report from the SOP's **first consumer**, ordered
by how much time each item cost, each with the replacement wording already
written. The handoff said *propose, do not edit*, so nothing was applied. Edit 14
was added by the reviewer.

The ones that will bite the next author hardest, in order:

1. **Step 3 sends you to `data/inbox/specs/` from a worktree, where it is
   empty.** The 42-file pile is untracked, so it lives only in the main checkout
   at `C:\workspace\tolstack\data\inbox\specs\`. This is the single highest-cost
   item — and it is worse for a *reviewer*, who sees an empty directory and can
   read it as "the cited document does not exist", which is the most serious
   finding the checklist defines.
2. **Step 1 assumes you know which features you are stacking.** No part in
   217755 is named "pitch link"; identifying the joint took the largest share of
   that session. The method that worked — resolve by agreeing *counts*, never by
   matching a value — should be in the SOP.
3. **Step 2's "`nominal` is transcribed, not computed" has no legal move when
   the source prints limits only** (`M = .174 / .154`), and the schema requires
   the field.
4. **New Step 5c** — how to shape a stack around an element that cannot be
   sourced at all (omit it, write the check as a budget, label it `INCOMPLETE`).
5. **New Step 5c bullet (edit 14)** — which end of that budget interval is the
   binding requirement. This one is not hypothetical: the session got it
   backwards in two places and the reviewer fixed it inline.
6. **Step 5b's workbook ban is not transitive.** `hardware_entries.json`'s
   inline values are mostly slice-1 workbook transcriptions, so citing an entry
   launders an untraced number into a from-scratch stack while showing
   `kind: "parts_list"` and passing every test in the repo. The sharpest trap in
   the report.

Plus edits 5, 7–13 (zero-width bands; `hardware_entry/v0` cannot cite its own
source; the `kind: "spec"` three-place drift; the RSS caveat's missing third
kind; `REVIEW_AGENT.md` §3's `max == mmc` exit; printed zones expiring between
exports; balloon `nX` prefixes absent from the extraction; and three small ones).

## Two more for the same pass, found by the reviewer

- **Step 0 pins "expect 34 passed".** It is **51** after this handoff. Edit 13
  already proposes dropping the number; do it, because this is the repo's own
  recurring bug about asserted counts.
- **Step 3's zone warning says "217755 is A–L × 2–15".** Sheet 4 of the
  `[PRELIM 2026-AUG-3]` export prints **A–L × 1–16** (verified off the border
  ticks). The A–L half is right; the numeric range is not.

## Why it matters

The SOP was written 2026-08-03 and is described in its own header as
under-tested. `pitch_link_stack` is the only session that has ever run it cold,
and this is the only feedback of its kind that will ever be this cheap to act on
— the author wrote the replacement prose while the friction was fresh. Every
edit left unapplied is a trap re-armed for the next author.

## Suggested fix

One small handoff: apply all 14 edits to `docs/SOP_TOLERANCE_STACK.md` (plus the
`REVIEW_AGENT.md` §3 one, which is edit 10 and already applied — see that file),
and note in the lesson that they landed. Nothing here needs re-derivation; it
needs a careful editing pass and a `forge check`.
