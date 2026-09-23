---
type: feature
priority: med
status: open
area: viewer/stack-page
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20260922_stack_page_check_card_balance_sheet.md
---

# Two layout questions on the stack page's results table need Jeff's reading of the live page

`HANDOFF_20260922_stack_page_check_card_balance_sheet.md` carried an
interactive exception: the study pane's version of this restructure was
decided against Jeff's reading of a live page on 2026-09-16 and 2026-09-21,
and this one should be too — *build it, ship it behind the tests, and put the
open questions where his answer can land as a follow-up rather than as a
blocked session*. The session is over, so the questions need an owner that
outlives it. This is that owner.

Both are about the live `hub_bearing_thermal_fit_m1` page (sixteen checks) and
`tan_link_to_pitch_plate` (six checks over three paths, the widest live
example of a stack with both kinds of row — **five** of the seven live stacks
have both and therefore render group rows: `pitch_link_to_pitch_plate` 2/3,
`rotor_fastener_length` 9/1, `tan_link_to_pitch_plate` 6/3,
`tan_link_to_pitch_plate_take2` 1/1, `vpa_output_to_pitch_plate` 1/1. Only the
two thermal fits have checks and no paths. Corrected in review 2026-09-23;
the filing said "the only live stack with both", which matters here because
question 1 settles the shape of **five** pages, not one). Screenshots of
exactly what is being asked about are
in `docs/sessions/lessons/LESSONS_20260922_stack_page_check_card_balance_sheet*.png`.

## 1. One table, or two?

Checks and paths now share one table, because they are the same fold over the
same elements and printed the same five numbers under the same column names —
two tables would have been "two tables that look like the same thing and are
not", which is what the source issue ruled out. The single difference is that
a check was folded against a criterion and a path was not, and that is carried
by two columns a path leaves at `—` plus a group row saying why, once.

**If a path reads as "a check that forgot its verdict" rather than "a measured
span",** the group row is not carrying enough, and the answer is two tables
with deliberately *different* column sets rather than the two the page had
before. `tan_link_to_pitch_plate` is the page to read it on.

## 2. Is the corner belt on the row worth the two lines it costs?

Every M1 row is a clamped one-line label over up to four corner chips
(`chain lower_seat`, `stage hub_to_sleeve`, `temperature cold (-20 °C)`,
`k 0.8`). They are there because, within a seat, the generated label's first
forty characters are identical and the part that differs is at the
tail, which is exactly what a one-line clamp takes off — so without the chips
the sixteen rows are indistinguishable at a glance.

They are also the only reason a row is ~58 px rather than ~32 px: the sixteen
rows are 923 px of table with them and roughly 510 px without, so folding them
takes the page from 4,825 px to about 4,410 px. They are also the biggest
single contributor to the name column's 460 px, which is most of
`ISSUE_20260923_the_stack_pages_results_table_is_1240px_in_a_702px_scrollport.md`.

The session's read is that the chips are worth the 400 px. It is not the
session's call.
