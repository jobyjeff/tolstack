---
type: feature
priority: med
status: open
area: viewer/stack-page
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20260922_stack_page_check_card_balance_sheet.md
---

# The stack page's results table is 1,240 px in a 702 px scrollport — a measurement `BRIEF_20260916_topology_page_number_reach` has no copy of

`stack_page_check_card_balance_sheet` (2026-09-22) turned the loose-stack
page's check cards into one row per result, with nine columns. Deliverable 4
of that handoff said not to solve the width by moving a value into a column
it does not belong to, and to **report the measured width instead** — that
report is in the lesson, which nothing schedules anyone to read, so it is
here too.

Measured on `hub_bearing_thermal_fit_m1` at 1600×1000 with the preview pane
at its default width
(`node tests/debug_stack_check_table.mjs --repo C:/workspace/tolstack`):

| surface | rendered width | scrollport |
|---|---|---|
| the new results table | **1,240 px** | 702 px |
| the elements table, same page | 1,060 px | 702 px |

Both overflow. The elements table already did, and has a browser check that
*asserts* it does (`the elements table is wider than its scrollport at this
viewport`), so this is not a regression introduced here — it is a second
table in the same condition, and the first one whose overflow is a
consequence of a layout decision taken this month rather than of the number
of element attributes.

What was NOT done to avoid it, deliberately, because each is the trade the
brief exists to weigh rather than one a tactical session may take:

* dropping the `verdict` and `criterion` columns a path leaves empty and
  folding those words into the row — that reintroduces "a blank cell and a
  passing one look identical";
* printing the units once in a caption instead of in the five numeric
  headers;
* putting the criterion under `worst case min`. Every live criterion is
  `>= 0`, so that would look right and would be a printed *reading* of the
  operator rather than the record — the same argument
  `LESSONS_20260922_viewer_summary_balance_sheet.md` makes for the study
  grid's margin row.

The corner-chip belt in the name column is the biggest single contributor to
the column's 460 px; whether it should be there at all is the layout question
`ISSUE_20260923_two_layout_questions_on_the_stack_pages_results_table_need_jeffs_reading_of_the_live_page.md`
puts to Jeff.
