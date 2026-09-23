# LESSONS 2026-09-22 — stack_page_check_card_balance_sheet

The loose-stack page's checks are a **table** now: one row per check, one row
per path, in the same table, with the record folded under each row. The
`<article class="check">` card is gone.

`apps/viewer/README.md`'s new section ("A stack's checks and paths are one
table, and it reads like a balance sheet") holds the design and the commit
holds the code. What follows is only what neither says.

---

## The two answers deliverable 3 asked for

### (a) A stack's equivalent of the study grid's totals row is **a table of its own**, not footer rows of the elements table

A `<tfoot>` total is legible for exactly one reason: it totals the column
above it, over **every** row above it. A study's grid *is* its chain, so that
holds. A stack's elements table is not any one check's term list — on
`hub_bearing_thermal_fit_m1`, sixteen checks fold three terms each out of
eight elements — so sixteen footer rows under that grid would each be a total
of a subset the reader cannot see, and the columns do not even correspond (an
element row's are one element's `nominal / min / max / ± / LMC / MMC`; a
check's are a fold's interval). There is no arrangement of that grid in which
a check's number lands under a column it totals, which is the whole mechanism
the study page's footer rows rely on.

So: a **Results** table, and the link back to the elements is each row's own
term list, in its fold, with every sign and every coefficient — the one place
on this page where "which elements did this check actually use" was ever
answerable, and it stays answerable.

### (b) The checks **join** the Paths table

This is the decision I changed my mind on twice, so the argument is worth
having in full.

A path and a check are the *same object* with one field's difference. Both
are `fold()` run once over a subset of the elements; both carry
`nominal / worst_case_min / worst_case_max / rss_center / rss_half` and a
`worst_confidence`; both print them in the stack's units. The old Paths table
had seven columns and every one of them was also one of the five number boxes
or the confidence chip on a check card. Two tables, one column set, different
headings, thirty rows apart — that is precisely "two tables that look like the
same thing and are not", and the issue ruled it out.

The one honest difference is that a check was folded **against a criterion**
and a path was not, and that is worth exactly two columns. So:

* one table, `verdict` and `criterion` columns that a path leaves at `—`;
* a **group row** above each block when a stack has both kinds, carrying the
  reason once: *"Paths — the same fold with no criterion: a measured span, not
  an answer, so no verdict"*;
* that same sentence is the `title` on a path's two empty cells, from one
  constant (`RESULT_GROUPS`), because a blank verdict cell and a passing one
  look identical at a glance;
* a stack with **no** paths (both thermal fits) gets no group rows at all —
  there is nothing to tell its rows apart from, and a group row there would be
  the section heading said twice.

The counter-argument I rejected: *a path is not a check, and merging them
invites a reader to compare a path's span against a check's.* True, and it is
answered by the two columns rather than by two tables — a reader who sees
`—` under `verdict` has been told more, not less, than one who has to notice
that the table thirty rows up had no such column.

## Which of the study page's idiom transferred, and which had to be reinvented

**Transferred unchanged:** `VA.splitAuthoredFinding`'s ` -- ` convention —
the author's own separator between *what a term is* and *why it is a finding*,
name on the row and rationale in the fold. That is the whole of what made a
budget's excluded terms short without compressing anything, and it needed no
thought: the live rotor-stack terms already carry the split.

**Reinvented, and the reason each one is:**

| the study page's move | why it did not transfer | what this page does |
|---|---|---|
| totals as `<tfoot>` rows of the same grid | each check folds a different subset of the elements; nothing to be a total *of* | a table of its own (answer (a) above) |
| `<details>` in the findings table's **name cell** | that table has two columns, so the fold gets most of the width. This one has nine: a 47-word paragraph in a ~350px lane with eight columns of white space beside it | the record is a **second `<tr>`** with `colspan` over every column, toggled by a `<button aria-expanded>` on the row |
| the findings table's two-column `name / says` shape | a check's "says" is nine numbers, not a phrase | the numbers are columns; the phrase is the group row |

## Three things that cost me a cycle each

**A `<td>` with `display: flex` leaves the column model.** It looks like a
normal flex container and is not: the browser wraps a non-`table-cell` child
of a `<tr>` in an anonymous cell, and every column after it walks off its own
header. The new browser check measured it — **128 of 144 cells** off their
header's left edge — and the fix is a `<div>` inside the cell. Two cells had
it (the name cell and the verdict cell) and neither looked wrong in a
screenshot, because each row was individually self-consistent; only the
header disagreed.

**`table-layout: fixed` is not a nicety here, it is the only thing that makes
the one-line clamp mean anything.** An auto table sizes a column to its
content's *intrinsic* width, and `white-space: nowrap` + `overflow: hidden` +
`text-overflow: ellipsis` does not reduce that — so every 120-character
generated label counted in full and the table came out at **1850px**. With a
shared `<colgroup>` and widths inline from `RESULT_COLUMNS` (the topology
grid's arrangement, and for the same reason: a fixed table's total and its
per-column widths have to agree, so they come from one array and `style.css`
declares no `.rs-col--*` width) it is 1240px.

**The check id was on the row, and it was the corner chips spelled with
underscores.** A generated check's id is `lower_seat__hub_to_sleeve__cold`;
the three chips beside it read `chain lower_seat`, `stage hub_to_sleeve`,
`temperature cold (-20 °C)`. Together they wrapped the meta line in two and
stood every row up to ~100px. The id is one line into the fold now, which
keeps the affordance it exists for (a reviewer finding the row in the JSON)
and costs the scan nothing. Worth knowing because the elements table's
`<code>` beside a name is a *deliberate* affordance on this page and the
obvious thing to copy — and copying it here was wrong.

## The numbers, measured

`tests/debug_stack_check_table.mjs` (committed, hand-run, not a tier) takes
both phases at 1600×1000 off the live projection:

| | before | after |
|---|---|---|
| `hub_bearing_thermal_fit_m1` page height | **10,633 px** | **4,825 px** |
| `hub_bearing_thermal_fit_m2` page height | 10,805 px | 4,997 px |
| `tan_link_to_pitch_plate` page height | 5,728 px | 4,273 px |
| results surface width | n/a (cards, 702px) | **1,240 px** |
| elements table width, same page | 1,060 px | 1,060 px |
| the scrollport both sit in | 702 px | 702 px |

The issue reported 10,634 px; the probe reads 10,633 px. Same page, ±1px of
rounding.

**Deliverable 4, stated plainly: this layout needs horizontal room it does not
have.** The results table is **1,240 px** in a **702 px** scrollport — wider
than the elements table's 1,060 px, which already overflowed the same port.
Nothing was moved into a column it does not belong to to avoid that: the
`verdict` and `criterion` columns a path leaves empty could have been dropped
and the words folded into the row, and the units could have been printed once
in a caption instead of in five headers, and both would have traded a scroll
for a reader guessing which bound a criterion bites on. That is a real input
to `docs/strategy/BRIEF_20260916_topology_page_number_reach.md` and this
session did not pre-empt it.

## The two questions for Jeff (HITL, after merge)

The handoff says to build it, ship it behind the tests, and put these as
questions rather than block. Both are about the live page at
`hub_bearing_thermal_fit_m1`:

1. **Is one table right, or should paths go back to standing alone?** The
   argument above says a path is a check without a criterion and belongs in
   the same grid. `tan_link_to_pitch_plate` is the page to read it on — six
   checks over three paths, the only live stack with both
   (screenshot 3 below). If a path reads as "a check that forgot its verdict"
   rather than "a measured span", the group row is not carrying enough and the
   answer is two tables with deliberately different column sets.
2. **Is the corner belt on the row worth the two lines it costs?** Every M1
   row is a clamped label over up to four corner chips
   (`chain lower_seat`, `stage hub_to_sleeve`, `temperature cold (-20 °C)`,
   `k 0.8`), because the label's first forty characters are identical across
   all sixteen and the part that differs is at the tail, which is what the
   clamp takes off. The chips are what makes the sixteen rows tellable apart —
   and they are also the only reason a row is ~58px rather than ~32px: the
   sixteen rows are 923px of table with them and would be roughly 510px
   without, so folding them takes the page from 4,825 px to about 4,410 px
   and makes the rows indistinguishable at a glance. My read is that the
   chips are worth 400px; it is Jeff's page.

## Screenshots (live projection, 1600×1000, `deviceScaleFactor: 1`)

**Before — one check card**, and there were sixteen of these on M1: the
five-chip head, the five-box number ribbon, the configuration block printed
again under the chips that already said it, and the essay. The clip is the
card's own box: **393 px**, and there were sixteen.

![one check card, before](LESSONS_20260922_stack_page_check_card_balance_sheet_1_m1_results_before.png)

**After — all sixteen**, at the 2200px viewport where every column is visible
(at 1600px the four right-hand columns are past the scrollport's edge, which
is the honest reading of the page and is what the height shots below capture):

![the results table, after](LESSONS_20260922_stack_page_check_card_balance_sheet_1_m1_results_after.png)

**The hard case — `tan_link_to_pitch_plate`**, six checks and three paths in
one table, which is the shape question 1 above is about:

![checks and paths in one table](LESSONS_20260922_stack_page_check_card_balance_sheet_3_tan_link_results_after.png)

**The whole page, before and after**, same stack, same viewport — 10,633 px
against 4,825 px:

![the whole page before](LESSONS_20260922_stack_page_check_card_balance_sheet_1_m1_stackpage_before.png)

![the whole page after](LESSONS_20260922_stack_page_check_card_balance_sheet_1_m1_stackpage_after.png)

`_2_m2_*` are the same pair for `hub_bearing_thermal_fit_m2`, which the
handoff's definition of done names.

## Running the tiers and the probe from this worktree

Unchanged from `LESSONS_20260922_viewer_summary_balance_sheet.md`, and the
`node_modules` directory junction it warns about is still the way in and still
has to be removed before you finish. Mine is removed.

```
node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack
node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack
node tests/debug_stack_check_table.mjs --repo C:/workspace/tolstack \
     --shots docs/sessions/lessons --phase after
```

Two things about the probe that are not obvious and cost me runs:

* **`--repo` with backslashes silently does nothing under the Bash tool.**
  `--repo C:\workspace\tolstack` arrives as `C:workspacetolstack`, the `[real]`
  tier reports itself skipped, and the suite still prints a green total with
  the skip note underneath. Forward slashes.
* **A screenshot of an element taller than the viewport resizes the viewport,
  which fires `topology_app.js`'s 150ms repaint debounce.** Any direct
  `VA.renderStack` issued after a shot is torn down ~40ms later by a repaint
  the probe itself scheduled — this is the same race
  `tests/debug_typography_pass.mjs`'s `resizeTo` waits out, arriving by a
  different route. It cost two runs that reported M2's height and M2's picture
  under `tan_link`'s name, both entirely plausible. The probe now waits the
  same 450ms **and** waits for the rendered `<h2>` to be the title it asked
  for; the second half is the one that would have caught it.

## Taking the "before" phase after the fact

The before shots in this folder were taken two ways and it is worth writing
down, because the obvious route is blocked. `git stash` is forbidden in a
worktree here (the stack is shared with every other worktree), so to shoot the
old renderer *after* committing the new one:

```
git checkout <commit>^ -- apps/viewer/views/stack.js apps/viewer/style.css
node tests/debug_stack_check_table.mjs ... --phase before
git checkout HEAD -- apps/viewer/views/stack.js apps/viewer/style.css
```

Two files, named explicitly — `git checkout <commit>^ -- apps/viewer` would
have taken `README.md` with it and silently reverted the section written for
this pass.
