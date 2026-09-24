---
type: chore
priority: low
status: resolved
area: tests/mutation-witnesses
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20260922_stack_page_check_card_balance_sheet.md
---

# The stack page's results-table guards have no mutation-witness entry

`stack_page_check_card_balance_sheet` (2026-09-22) added eleven fixture
checks, two `[real]` walks and three browser sub-checks for the stack page's
new results table. None is declared in `scripts/mutation_witnesses.json`, so
nothing proves any of them can go red — the same gap
`ISSUE_20260922_the_balance_sheet_guards_have_no_mutation_witness_entry.md`
records for the handoff one week before this one, and
`ISSUE_20260922_the_nav_status_icon_guards_have_no_mutation_witness_entry.md`
for the one before that.

Candidate rows, strongest first. Every one of these mutations was reachable
by hand during the session and two of them actually happened, which is why
they lead:

| mutation | file | expected witness | suite |
|---|---|---|---|
| `.rs-row__name` / `.rs-marks` get `display: flex` moved back onto the `<td>` (a `<td>` that is not `display: table-cell` leaves the column model) | `apps/viewer/style.css` | `every cell of the results table starts at its own header's left edge…` | `typography pass's visual rules` |
| `.restable` loses `table-layout: fixed` | `apps/viewer/style.css` | same | `typography pass's visual rules` |
| `checkRecord` appends the guidance to the row's name cell instead of the fold | `apps/viewer/views/stack.js` | `every check's authored guidance is in its fold, word for word, and never on the scan line` | fast tier |
| `excludedLine` renders `VA.splitAuthoredFinding(term).whole` instead of `.name`, or the fold drops the whole term | `apps/viewer/views/stack.js` | `an excluded term's name is on the row and its rationale one fold deep` | fast tier |
| `pathRow`'s verdict cell is left empty instead of `—` with the group's sentence | `apps/viewer/views/stack.js` | `a path states it has no verdict rather than leaving the cell blank` | fast tier |
| `appendResult` starts a fold open | `apps/viewer/views/stack.js` | `a result's record is folded until the row is asked for it` | fast tier |

Each has to be **run** before it is declared — the 2026-09-21 enrollment pass
found two of twenty-six proposed rows were not witnessed by the check they
named, and a declared-but-unwitnessed row is worse than no row.

```
node scripts/run_mutation_witness_tests.mjs --repo C:\workspace\tolstack
```

---

## Replayed in review, 2026-09-23 — two of the six candidates do not reproduce

The filing says each candidate has to be **run** before it is declared. It has
been. Scratch tree from `git archive` of the merged review branch, data through
`--repo C:/workspace/tolstack`; fast tier `node apps/viewer/run_tests.cjs`,
browser tier `node scripts/run_viewer_browser_tests.mjs --only "typography"`.
Baseline: **513/513 fast, 11/11 browser.**

| candidate | measured | verdict |
|---|---|---|
| `checkRecord`'s guidance printed on the row as well | 511/513 fast, red on *every check's authored guidance is in its fold…* **and** on the `[real]` walk | **reproduces** — declare it |
| `excludedLine` renders `.whole` instead of `.name` | 512/513 fast, red on *an excluded term's name is on the row and its rationale one fold deep* | **reproduces** — declare it |
| `pathRow`'s verdict/criterion cells left blank | 512/513 fast, red on *a path states it has no verdict rather than leaving the cell blank* | **reproduces** — declare it |
| `appendResult` starts a fold open | 511/513 fast, red on *a result's record is folded until the row is asked for it* **and** on the `[real]` row-count walk | **reproduces** — declare it |
| `.rs-row__name` gets `display: flex` back on the `<td>` | 513/513 fast, **11/11 browser** | **does NOT reproduce** — do not declare |
| `.restable` loses `table-layout: fixed` | 513/513 fast, **11/11 browser** | **does NOT reproduce** — do not declare |

Both misses name the same expected witness — *"every cell of the results table
starts at its own header's left edge…"* — and the reason they miss is
structural rather than a wording slip. That sub-check compares
`td.getBoundingClientRect().x` against `th.getBoundingClientRect().x` **within
one table**, and a `<td>` and its `<th>` share a column grid by construction,
so the comparison is close to tautological. Measured three ways: dropping
`table-layout: fixed`, moving `display: flex` back onto the `<td>`, and giving
`.rs-row td:first-child` a **20px** left border against the header's 3px all
leave it green. The 128-of-144 figure the lesson credits it with was measured
on a tree that had no `<colgroup>` yet.

Three further geometry mechanisms are unwitnessed in every tier and want an
assertion before they want a witness row:

* `table.style.minWidth = resultTableWidth()` — dropped, 513/513 and 11/11.
* `.restable thead th:first-child`'s matching transparent 3px spine — dropped,
  513/513 and 11/11, though `views/stack.js` and `style.css` both say it is
  what keeps the header on the grid.
* `resultName`'s `title` — dropped, 513/513 and 11/11. It is the only place a
  reader can read a clamped 130-character label, since the record does not
  repeat it.

One geometry mechanism **is** witnessed, and not by the check named for it:
dropping `table.appendChild(resultColgroup())` reddens *"no result row is
taller than a name and its corner chips…"* (10/11 browser).

**Route this with the enrollment stream, not as a fifteenth independent
filing.** `docs/issues/` holds fourteen open "no mutation-witness entry"
issues; the two immediately preceding this one
(`..._the_balance_sheet_guards_...`, `..._the_nav_status_icon_guards_...`) are
already `status: triaged` onto
`docs/sessions/HANDOFF_20260922_mutation_witness_repair_and_enrollment.md`.

Full evidence:
`docs/sessions/reviews/REVIEW_20260923_stack_page_check_card_balance_sheet.md`.


---

## Resolved 2026-09-23 — the four that reproduce are enrolled; the two that do not are deliberately still not declared

`mutation_witness_derived_enrollment_and_gating`. The review appended above
replayed the six candidates and found four reproducing. All four are enrolled,
and each was replayed again here before it was declared (the 2026-09-21 pass's
lesson: 4 of 26 transcribed rows stopped reproducing within days):

| guard | spec | replay |
|---|---|---|
| `every check's authored guidance is in its fold…` | `fast__every-check-s-authored-guidance-is-in-its-fold-word-for__68317efe.json` | 1/1 witnessed |
| `an excluded term's name is on the row…` | `fast__an-excluded-term-s-name-is-on-the-row-and-its-rationale__e9f0f2f6.json` | 1/1 witnessed |
| `a path states it has no verdict…` | `fast__a-path-states-it-has-no-verdict-rather-than-leaving-the__ad530583.json` | 1/1 witnessed |
| `a result's record is folded until the row is asked for it` | `fast__a-result-s-record-is-folded-until-the-row-is-asked-for-i__b846a40c.json` | 1/1 witnessed |

The guidance row is declared with a narrower mutation than the review's — the
guidance is blanked rather than also printed on the row — so what reddens is the
*word for word* half the guard's name leads with, and not a second check beside
it.

**The two that do not reproduce remain undeclared**, and their subject is not
enrollment at all: the sub-check named for the results table's column geometry
cannot fail on it. That is
`ISSUE_20260923_the_results_tables_column_geometry_is_unwitnessed_and_its_alignment_check_cannot_fail_on_it.md`,
still open, and it wants an assertion before it wants a witness row.

**On routing this "with the enrollment stream":** there is no enrollment stream
any more. A guard has no witness only until somebody writes one file, whose name
is derived, and the per-source guard census reddens `pytest -q` the moment a
guard arrives without one. A fifteenth independent filing would not be needed
today because the gap would have been red in the session that opened it.
