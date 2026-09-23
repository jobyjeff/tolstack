---
type: feature
priority: med
status: open
area: viewer/stack-page
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20260922_viewer_summary_balance_sheet.md
---

# The stack page's check cards are the same ribbon and the same essay, one page over

`viewer_summary_balance_sheet` (2026-09-22) rebuilt the **topology study**
summary: the chip ribbon became footer rows of the contributions grid, and the
two generated paragraphs became a findings table with the author's own
rationale one disclosure deep.

The **loose-stack page** (`views/stack.js`, reached from the same nav rail —
the two thermal-fit stacks and any stack no topology re-expresses) has the same
two defects and was left alone. Measured on `hub_bearing_thermal_fit_m1` at
1600px: the rendered page is **10,634 px tall**.

## What is there

`checkCard()` renders one `<article>` per check, and that stack has 13 of them
(9 results + 4 sensitivity probes). Each card carries:

* a **head of five chips** — verdict, scope, `NOT A RESULT`, `weakest input: …`,
  and the check's own id in a `<code>`. This is the ribbon, per card;
* `check__numbers`, **five label/value boxes** in a row — criterion, nominal,
  worst case, RSS, units. This is the ribbon again, and it is the exact shape
  ("a ribbon of random values") Jeff named on the study page;
* `check__excluded` — the excluded terms joined with `; ` into one paragraph;
* `check__guidance` — the authored guidance, whole, unfolded. On the live
  thermal stacks this runs to several hundred words per card;
* `check__inputs` — one chip per element term.

## Why it is filed rather than fixed

The balance-sheet idiom does **not** transfer without a design decision, and
that decision is not a tactical one:

* a study's grid **is** its chain, so the totals belong under it. A stack's
  elements table is not any one check's term list — each check folds a subset
  (`element_terms`), and there are up to 13 checks over one table. "Totals rows
  of the same grid" has no single answer there;
* a stack also carries a **Paths** table, which is already a totals table of a
  different shape, and it is not obvious whether checks should join it, replace
  it, or stay separate.

What IS directly reusable is written up in
`docs/sessions/lessons/LESSONS_20260922_viewer_summary_balance_sheet.md`: the
`<tfoot>`-of-the-same-table pattern, the findings-table shape
(name / one-line reason / disclosure), and `VA.splitAuthoredFinding`'s
` -- ` convention for splitting an authored term without editing it.

## What would close it

A layout for the stack page's checks that a reader can scan — probably one row
per check in a table, with the numbers in columns and the guidance folded —
decided the way the study pane's was: against Jeff's own reading of a live
page, not in the abstract.
