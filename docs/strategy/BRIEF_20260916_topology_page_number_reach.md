# BRIEF 2026-09-16 — the topology page publishes numbers a reader cannot see, and every way to fix it spends something recorded

> Routed here by the triage sweep of 2026-09-16 from one issue that asks for a
> layout decision rather than a fix, and says so in its own `audience: strategy`
> line. Triage deliberately did not design the answer: the three options trade
> against each other, one of them reverses a recorded decision, and picking
> between them is a call about what this page is *for*, not about CSS.
>
> Source issue:
> `docs/issues/ISSUE_20260915_topology_page_hides_its_own_numbers_behind_a_horizontal_scroll.md`
> (bug, med, `audience: strategy`), filed out of
> `viewer_study_verdicts_and_gaps` (2026-09-15).

## The measurement

Chrome at 1600×1000 — the browser tier's own viewport — on the real projection,
served from a repo-root static server, 2026-09-15. Two blocks on
`apps/viewer/topology.html` are reachable **only by dragging a horizontal
scrollbar**, and neither announces that it is there.

1. **The study totals strip** (`.tvtotals__strip`) is
   `flex-wrap: nowrap; overflow-x: auto`. On the ~870px pane that nav + DAG +
   detail aside leave at 1600px, the study's title, id and `from → to` span
   fill the whole width **before the first folded number**. So nominal,
   worst case, worst-case half, RSS and RSS half are all past the right edge on
   `pitch_link_shank_out` and on every `pitch_system` study. *The numbers this
   page exists to publish are the ones a reader cannot see.*

2. **The grid's `sourcing` and `crop` columns.** The row table is 1218px wide
   against a grid pane of roughly 640px once the rails are drawn, so the
   confidence chip, the attention badges and the crop thumbnail are all off the
   right edge in the default layout.

Repro: serve the repo root, open `apps/viewer/topology.html`, pick *Shank out*
under *Pitch link to pitch plate*, and look for the worst-case numbers in the
strip at the bottom. They are there. They are 300px to the right.

Both predate `viewer_study_verdicts_and_gaps`
(nothing in it changed the strip's overflow rule or the pane's width), but that
handoff made each slightly worse and is why they were noticed — the strip gained
one verdict chip at its left edge, and `sourcing` widened from 200px to 260px so
a badged row would stop clipping its own citation chip inside the cell.

## Why it is a decision and not a fix

Each candidate spends something the repo has already paid for.

- **Wrap the strip.** Reverses a recorded decision: the strip's height must not
  grow with a study's `notes` or with window width (`viewer_v2_single_nav`,
  deliverable 2). The reason that decision exists is the same reason the retired
  10-row floor and `.tv__scroll`'s old scrollport were retired — a page whose
  vertical budget is eaten by chrome squeezes the DAG. Wrapping is the smallest
  edit and the one that re-opens the oldest argument on this page.
- **Collapse the detail aside when nothing is selected.** Frees ~430px, which is
  more than the shortfall, and changes **what arriving at the page looks like** —
  today the aside is part of the first impression and the reader's mental model
  of where detail appears. This is the option with the largest surface and the
  least CSS.
- **Demote the `from → to` span to a hover.** Shortens the strip directly and
  removes a standing statement of what the study spans, which is arguably the
  second most load-bearing sentence in the strip after the numbers. Note this
  page already has a hover-card mechanism with an unresolved occlusion and
  accessibility policy (`docs/strategy/BRIEF_20260914_hover_card_occlusion_and_a11y.md`)
  — choosing this option inherits that brief's open questions rather than
  avoiding them.

A fourth framing the issue does not list and a strategy session should reject or
adopt explicitly: **the page could state that there is more to the right.** The
defect as filed is two-part — the content is off-screen *and* "neither announces
that it is there." An affordance is not a substitute for reach, but if the
decision is that a wide grid legitimately scrolls, then the missing announcement
is the actual defect and it is much cheaper.

## What the decomposition will need to say

- **Which numbers are non-negotiably on screen at 1600×1000.** The folded totals
  are the page's product; the `sourcing` chip and the `crop` thumbnail are
  navigation to evidence. If those two priorities differ, the strip and the grid
  get different answers and the brief decomposes into two handoffs rather than
  one.
- **Whether 1600×1000 is the width being designed for**, or whether it is merely
  the browser tier's viewport and the real floor is narrower. Every number above
  is one viewport wide; the grid's overflow scales with column count, so a
  topology with more columns is worse and none was measured.
- **What the detail aside's default state is.** This is the only option that
  changes the page's arrival state, so it is the only one that needs Jeff.

## Why this is a new file and not an addendum

Checked against the open briefs it would sit beside before being written, per
the dedupe rule. The near miss is
`docs/strategy/BRIEF_20260914_dag_layout_geometry_tradeoffs.md`, and it is
structurally analogous — its item 3 is also "the page cannot fit what it wants
to show in the viewport, and every escape spends a landed contract." It is still
a different question, and the test is whether either brief's options move the
other's variables:

- that brief's three items are the DAG's **internal geometry** — leader lane
  allocation and crossings, column **order** (a bijection on indices, so it
  cannot change the DAG's width), and the **vertical** fit budget, row pitch and
  edge-length floor. Its recorded constraints are `viewer_dag_spine_layout`,
  `DAG_TOPOLOGY.md`'s not-a-solver rule and `apps/viewer/README.md`'s
  no-heuristic-root rule.
- this one is the **horizontal composition of the three panes** — the strip's
  `nowrap`/`overflow-x`, the grid table's width against the grid pane, and
  whether the detail aside holds ~430px when nothing is selected. Its recorded
  constraint is `viewer_v2_single_nav`'s strip-height decision.

None of the geometry brief's candidates changes the 1218px table, the ~640px
grid pane or the ~870px strip; none of this brief's candidates changes a leader
lane, a column order, the 782px vertical budget or the one-row edge floor. They
are two conversations that happen to be about the same page, and merging them
would bury a decision about what the page *publishes* inside a decision about
how the DAG is *drawn*. Sequence them if both are taken up in one sitting — this
one's "collapse the detail aside" option widens `.tv__main`, which is room the
DAG may then be allowed to use.

## Coupling — read before deciding

`docs/sessions/HANDOFF_20260916_topology_grid_scroll_and_grips.md` (staged
2026-09-16, `model: opus`) is landing three defects on the **same horizontal
axis**: the sticky rails' containing block, scroll-position carry-over across a
render, and the drag grips that a wide preview pane covers. Its deliverable 3
changes what `scrollWidth` the strip and grid live inside, and it is instructed
to report the pane's new `scrollWidth` on real `pitch_system` at 1600×1000 in
its lesson for exactly this brief. **Decide against that number, not against the
1218px/640px pair above, once that handoff has merged** — and note that it is
explicitly forbidden from re-laying the strip or re-widening a column, so
nothing in it pre-empts this call.

One shared sub-question worth naming: that handoff's issue 1 lists
`overflow-x: auto` on `.tv__main` as a candidate and is told **not** to take it,
because reversing the full-page-scroll contract
(`viewer_error_surface_and_layout`, 2026-09-09) on the horizontal axis needs the
argument re-made. If this brief's answer is "a wide grid legitimately scrolls
sideways, and the page says so", that *is* the argument being re-made, and the
two decisions should be taken in one sitting.

## 2026-09-22 triage sweep — the grid's clipped zone now holds two *required* values, and the column budget is measured again

Source issue:
`docs/issues/ISSUE_20260922_the_totals_rows_put_two_required_values_in_the_grids_permanently_clipped_zone.md`
(bug, med, `audience: strategy`), filed by the review of
`viewer_summary_balance_sheet` (2026-09-22). It is this brief's item 2 — the
grid's column budget against the grid pane — with the stakes raised, so it is an
addendum rather than a second file.

**What changed.** `viewer_summary_balance_sheet` made the grid's **footer rows**
the place a study's rolled-up answer lives. Four of the values that pass now
land in the clipped zone:

| value | column | visible at the default layout? |
|---|---|---|
| worst-case half-width (`± 0.9901 mm`) | `contribution` | no |
| RSS half-width (`± 0.488755 mm`) | `contribution` | no |
| the criterion (`must be >= 0`) | `contribution` | no |
| the `BUDGET` scope chip | `sourcing` | no |

So the brief's question is no longer only *"can a reader reach the evidence"*;
it is *"can a reader reach the study's own answer"*. Two of the four that matter
most were deliberately placed in the always-visible zone (the verdict chip and
the check's label in `element`; the **margin** right-aligned across
`nominal`/`min`/`max`), so the bottom line does read without scrolling. The
half-widths and the criterion do not, and the issue is explicit that they are
placed **correctly** — a half-width is a spread, in the column a member row's
own spread occupies; the criterion is the row's premise. *The defect is the
column budget, not the placement.*

**A fresh measurement of the 1218/640 pair this brief says will expire.**
Measured 2026-09-22 on the live `pitch_link_to_pitch_plate` at a 1600 px
viewport with the preview pane at its default 560 px: `COLUMNS`
(`apps/viewer/views/topology.js`) still sums to **1218 px**; the table starts at
x≈417 and the pane ends at x≈1037, so **620 of 1218 px is visible** — `max` is
cut mid-number and `contribution`, `sourcing` and `crop` are off-screen
entirely. Read alongside `LESSONS_20260916_topology_grid_scroll_and_grips`'s
post-merge `scrollWidth` 1534 px in an 868 px pane (max `scrollLeft` 666), which
`dispatch/docs/strategy/BRIEF_QUEUE.md` #7 says to decide against: the two
differ because the preview pane's width is a *reader-set* variable, which is
itself an input this brief has not yet named.

**What it adds to the decomposition.** The issue prices two of this brief's
existing candidates and adds a constraint:

- the `crop` column (110 px) is a thumbnail nobody reads at a glance, and the
  preview pane already shows the same crop;
- `sourcing` (260 px) is the widest column on the page and holds chips that
  could fold to one mark — which is precisely the move the nav rail made on
  2026-09-22 and which `docs/sessions/HANDOFF_20260922_stack_page_alert_marks_and_drawn_glyph.md`
  is staged to make on the materials table. If that lands, "fold the chips" is
  no longer a hypothetical for this page either;
- a third option the issue raises that this brief did not list: **scroll the
  pane to its right-hand end when a study is selected**, so the answer is what
  is on screen rather than the left edge of the walk;
- and a fence: **do not move a totals value into a column it does not belong
  to** — that trades a scroll for a mislabelled number.

**Sequencing.** `docs/sessions/HANDOFF_20260922_stack_page_check_card_balance_sheet.md`
(staged 2026-09-22) is instructed to report the stack page's measured
`scrollWidth` if its layout needs room it does not have, and is explicitly
fenced out of pre-empting this decision. Nothing staged today re-lays the grid's
columns.
