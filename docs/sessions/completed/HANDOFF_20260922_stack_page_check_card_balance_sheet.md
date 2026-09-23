---
priority: med
depends_on: [stack_page_alert_marks_and_drawn_glyph]   # same file (apps/viewer/views/stack.js), and it retires chips from the source columns this restructure would otherwise re-lay and then have to re-lay again
model: opus
---

# HANDOFF 2026-09-22 — stack_page_check_card_balance_sheet: the loose-stack page is still a ribbon of numbers and an essay, one page over from the one that was fixed

> **⚠ INTERACTIVE EXCEPTION (HITL), 1 item:** the study pane's version of this
> was decided against Jeff's reading of a live page, not in the abstract, and
> this one should be too. **Do not block on it.** Build the restructure, ship it
> behind the same tests, and put a screenshot of the reworked
> `hub_bearing_thermal_fit_m1` page in the lesson with the two open questions in
> deliverable 3 stated as questions. Jeff reviews the live page after merge, the
> way he did on 2026-09-16 and 2026-09-21; his answer lands as a follow-up, not
> as a blocked session.

Source: `docs/issues/ISSUE_20260922_the_stack_pages_check_cards_are_the_ribbon_and_the_essay_one_page_over.md`
(feature, med, `audience: strategy`), filed by the review of
`viewer_summary_balance_sheet` and routed by the 2026-09-22 triage sweep.
Baseline: trunk `master` @ `836f11e` — `viewer_summary_balance_sheet` is in
`completed/`, projections rebuilt, full suite green.
Scope: `apps/viewer/views/stack.js` (`checkCard()` and what it renders),
`apps/viewer/style.css`'s `.check__*` rules, and the viewer tests that read
them. Do NOT touch `apps/viewer/topology.js` /
`apps/viewer/views/topology.js` (owned by
`HANDOFF_20260922_findings_splitter_scopes_to_excluded_terms.md`), and do not
re-open the alert/chip decisions in
`HANDOFF_20260922_stack_page_alert_marks_and_drawn_glyph.md` — that one merges
first and its result is your starting point.

## Why it is staged tactical rather than sent to a brief

The idiom already exists, measured and written down, from the page next door:
`docs/sessions/lessons/LESSONS_20260922_viewer_summary_balance_sheet.md` records
the `<tfoot>`-of-the-same-table pattern, the findings-table shape (name /
one-line reason / disclosure), and the ` -- ` convention for splitting an
authored term without editing it. Nothing here binds a rule beyond this one
page, there is no cross-repo contract, and the study-page version of exactly
this work was itself a tactical handoff reviewed by Jeff afterwards. The two
structural differences the issue names (below) are real, but they are layout
calls inside a table this session owns — not a policy. tolstack already carries
14 open briefs; a fifteenth for "do the same thing on the other page" would not
be read before this is built.

## What is there today, measured

`hub_bearing_thermal_fit_m1` at 1600px renders a page **10,634 px tall**.
`checkCard()` emits one `<article>` per check and that stack has **13** of them
(9 results + 4 sensitivity probes). Each card carries:

* a **head of five chips** — verdict, scope, `NOT A RESULT`,
  `weakest input: …`, and the check's own id in a `<code>`. That is the ribbon,
  once per card;
* `check__numbers` — **five** label/value boxes in a row (criterion, nominal,
  worst case, RSS, units). That is the ribbon again, and it is the exact shape
  ("a ribbon of random values") Jeff named on the study page;
* `check__excluded` — excluded terms joined with `; ` into one paragraph;
* `check__guidance` — the authored guidance, whole and unfolded; on the live
  thermal stacks this runs to **several hundred words per card**;
* `check__inputs` — one chip per element term.

## Deliverables

1. **A scannable layout for a stack's checks.** Probably one row per check in a
   table, numbers in columns, guidance folded one disclosure deep — that is a
   suggestion to prototype, not a requirement. Reuse the study pane's idiom
   where it transfers (the lesson above names precisely which parts do). The
   test of success is that a reader can compare 13 checks without scrolling past
   an essay between each pair.
2. **Keep the record's own words intact.** `check__guidance` is authored prose
   and must not be edited, truncated or summarised by the renderer — folding is
   the only permitted move. Same for the excluded-term text.
3. **Answer, in the build, the two questions the issue says do not transfer,
   and state both answers in the lesson.**
   a. *A stack's elements table is not any one check's term list.* Each check
      folds a subset (`element_terms`), and there are up to 13 checks over one
      table — so "totals rows of the same grid", which is what the study page
      got, has no single answer here. Decide what the stack's equivalent of the
      totals row is (per-check row? a checks table beside the elements table?)
      and say why.
   b. *A stack already has a **Paths** table*, which is a totals table of a
      different shape. Decide whether the checks join it, replace it, or stay
      separate — and do not leave the page with two tables that look like the
      same thing and are not.
4. **Do not solve the width by moving a value into a column it does not belong
   to.** That trades a scroll for a mislabelled number, and the topology page's
   version of that trade-off is a live strategy question
   (`docs/strategy/BRIEF_20260916_topology_page_number_reach.md`) that this
   session must not pre-empt. If your layout needs horizontal room it does not
   have, say so in the lesson with the measured `scrollWidth` — that is a real
   input to that brief.

## Definition of done

- The reworked page is demonstrated on the live `hub_bearing_thermal_fit_m1`
  (13 checks) **and** `hub_bearing_thermal_fit_m2`, projections at
  `C:\workspace\tolstack\data\projections\viewer\`. Report the new page height
  against today's 10,634 px.
- No authored guidance string is altered: a test asserts each check's guidance
  text is present in full behind its disclosure.
- Tests: value-level coverage for the new layout in `apps/viewer/tests.js` plus
  whatever the browser tier needs to see that the numbers land in the columns
  they label. `node apps/viewer/run_tests.cjs --repo C:\workspace\tolstack`,
  the browser tier, and the `venv-win` pytest run all green.
- Lesson (`docs/sessions/lessons/LESSONS_20260922_stack_page_check_card_balance_sheet.md`):
  the two answers from deliverable 3, a before/after screenshot, and one
  sentence on which parts of the study-page idiom transferred unchanged and
  which had to be reinvented — that is what the next reading-surface pass needs
  and cannot get from the diff.
