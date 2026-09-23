---
type: bug
priority: med
status: open
area: viewer/stack-page
reporter: agent
found_by: docs/sessions/HANDOFF_20260922_stack_page_check_card_balance_sheet.md
---

# The results table's column geometry is unwitnessed, and the browser check named for it cannot fail on it

`stack_page_check_card_balance_sheet` (2026-09-22) rests the stack page's new
results table on four geometry mechanisms, and argues for each of them at
length in `views/stack.js`, `style.css`, `apps/viewer/README.md` and the
lesson. It also added a browser sub-check whose name is that claim:

> `every cell of the results table starts at its own header's left edge, and
> each of a check's five numbers is printed verbatim under the header that
> names it — a scannable table that puts a value one column over is worse than
> the cards it replaced`

Measured in review (scratch `git archive` tree, `--repo C:/workspace/tolstack`;
baseline **513/513** fast and **11/11** browser):

| revert | fast | browser |
|---|---|---|
| `.restable` loses `table-layout: fixed` | 513/513 | **11/11** |
| `table.style.minWidth = resultTableWidth()` dropped | 513/513 | **11/11** |
| `.restable thead th:first-child`'s transparent 3px spine dropped | 513/513 | **11/11** |
| `display: flex` put back on the name `<td>` | 513/513 | **11/11** |
| `.rs-row td:first-child` given a **20px** left border against the header's 3px | 513/513 | **11/11** |
| `table.appendChild(resultColgroup())` dropped | 513/513 | 10/11 — reddens *"no result row is taller than a name and its corner chips"* |

## Why the alignment half cannot bite

It compares `td.getBoundingClientRect().x` against
`th.getBoundingClientRect().x` **inside one table**. A data cell and its header
share a column grid by construction, in fixed layout and in auto layout alike,
and `border-collapse: collapse` draws a border straddling the cell edge without
moving the box — so the two x values are two readings of the same number. The
only thing the geometric half can still catch is a row with the wrong *number*
of cells, which the fast tier already asserts
(`every result row fills exactly the columns the header names`).

The **value** half of the same sub-check is real and worth keeping: it reads
`results.json` and compares each of a check's five printed numbers against the
projection, so a table that prints `worst_case_max` under `worst case min`
does redden. That half is not in question here.

The lesson credits this sub-check with catching the `display: flex`-on-a-`<td>`
defect at **128 of 144 cells**. That measurement was taken before the
`<colgroup>` existed; with the colgroup in place the same edit is invisible to
it. See the correction appended to
`docs/sessions/lessons/LESSONS_20260922_stack_page_check_card_balance_sheet.md`.

## What would bite

An assertion about the **frame** rather than about the grid — the shape the
crop-lightbox review asked for when a percentage overlay's own correctness was
scale-invariant. Candidates, cheapest first:

* compare each rendered column's **width** against `RESULT_COLUMNS[i].width`
  (scaled by `table.clientWidth / resultTableWidth()`), which is what
  `table-layout: fixed` + the colgroup actually buy and what auto layout
  destroys;
* assert `table.getBoundingClientRect().width >= resultTableWidth()`, which is
  the min-width floor;
* assert the name cell is a `display: table-cell` (or that the row's `<td>`
  count equals its `children.length`, which is what the anonymous-cell wrap
  breaks).

Only once one of those exists is there anything for
`scripts/mutation_witnesses.json` to declare — see
`ISSUE_20260923_the_results_table_guards_have_no_mutation_witness_entry.md`,
whose first two candidate rows are the two reverts measured green above and
must not be declared as written.

A third mechanism has no assertion of any kind: `resultName`'s `title`. It is
the **only** place a reader can read the tail of a clamped ~130-character
generated label, because the fold does not repeat the label — dropping it is
513/513 and 11/11.
