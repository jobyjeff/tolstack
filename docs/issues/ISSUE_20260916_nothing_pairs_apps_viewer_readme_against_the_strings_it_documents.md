---
type: chore
priority: med
status: open
area: apps/viewer
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20260916_reader_facing_copy_and_vocabulary.md
---

# Nothing pairs `apps/viewer/README.md` against the strings it documents, so a copy change goes green with the documentation of it left wrong

`reader_facing_copy_and_vocabulary` (2026-09-16) changed five reader-facing
strings and left **three** `apps/viewer/README.md` passages describing the old
ones. Every tier was green — 419/419 fast, 20/20 browser, 1192 pytest — because
nothing in the repo compares that README against the viewer's own constants.
The three were found by a reviewer grepping the retired strings by hand, and
were fixed on the rework:

* the chip legend table — `dashed blue zero-width band` / `min == max`, both
  retired by item 3 in favour of `VA.ATTENTION.no_tolerance`;
* the `established` export-block row — *"the drawing-checker runs that consumed
  it, or no run has consumed this export"*, replaced by
  `VA.exportRunsText` / `VA.EXPORT_NO_RUNS_TEXT`;
* the run-id bullet — *"a run id is a **link** only where … Every other id
  prints as plain text with a hover saying why"*, false end to end once item 4
  stopped printing ids at all.

The fixes are in. **The gap that let all three happen is not**, and it is the
part worth scheduling: that README is the one document a reader goes to when
they meet a chip, and it documents the rendered wording chip by chip and panel
by panel — about fifteen rows of it — with no guard of any kind.

## Why this is a design question, not a one-line test

The tactical agent declined to build the pairing inside the rework, correctly
(the reviewer had bounded it to three findings), and named the reason: the
existing precedent —
`tests/test_tolerance_stack.py`'s enumerated-state doc guard — pairs **state
names**, not rendered sentences. A sentence has legitimate reasons to differ
from the constant it documents (it is prose about the string, not the string),
so the pairing needs a rule about *what* must match before it can be written.

Candidate shapes, cheapest first:

1. **The retired-string scan.** Assert no `apps/viewer/README.md` line contains
   a string that used to be a rendered constant and no longer is — a small
   curated "these words are gone" list, which is exactly the shape
   `BANNED_IN_RENDERED_TEXT` already has and is maintained the same way. Cheap,
   catches all three of the above, needs a human to add a row per retirement.
2. **The legend-table pairing.** The chip legend's first column is a set of
   rendered chip labels; pair that column against the labels
   `VA.ATTENTION` / `VA.CONFIDENCE_LABEL` / `VA.EXPORT_STATUSES` actually mint.
   Stronger, and scoped to the one table whose first column genuinely IS a set
   of strings.
3. **Constant references.** Where the README already names a constant
   (`VA.EXPORT_NO_RUNS_TEXT`, after the rework), assert the constant exists.
   Weak on its own, useful as a nudge toward naming constants instead of
   quoting sentences.

(2) is probably the one worth building; (1) is worth building today either way.

Until one exists, `docs/prompts/REVIEW_AGENT.md` carries a **Recurring bugs**
entry telling the reviewer to grep the retired string across
`apps/viewer/README.md` by hand. That makes the class visible to whoever reads
the checklist; it does not make it impossible, which is the distinction
`dispatch/docs/sessions/lessons/LESSONS_20260915_triage_sweep_guards_not_checklists.md`
§2 exists to draw.
