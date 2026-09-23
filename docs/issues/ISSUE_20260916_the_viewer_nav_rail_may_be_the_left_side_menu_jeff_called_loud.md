---
type: feature
priority: med
status: resolved
area: apps/viewer
audience: strategy
reporter: agent
found_by: docs/sessions/HANDOFF_20260916_flyout_resize_annotator_filter_and_deselect.md
handoff: docs/sessions/HANDOFF_20260922_stack_page_alert_marks_and_drawn_glyph.md
resolution: handoff completed 2026-09-23 -- closed automatically by dispatch when handoff `stack_page_alert_marks_and_drawn_glyph` moved to completed/; not independently verified.
---

# "Left side menu is now impressively 'loud'" — the viewer's nav rail is still the loudest thing on the page, and it may be the rail Jeff meant

## What was asked for, and what was done

Jeff, 2026-09-16 (forge note `20260916T175137_lj0lgi`):

> Left side menu is now impressively "loud"… roll all the alert badges into one
> single alert badge (something like a triangle ! icon). Mouse over the icon has
> a popup that lists out the actual alerts. Styling for the alert text
> themselves can then be a bit less obnoxious/overwhelming, especially the ones
> in the source column that are always visible.

`HANDOFF_20260916_flyout_resize_annotator_filter_and_deselect` read that as two
rails and said "Two rails qualify — do both":

* the **annotator's** element list (`apps/annotate/app.js`'s per-row state badge), and
* the **viewer's stack-table source column** (`views/stack.js`'s `sourcingCell`).

Both shipped on 2026-09-16 and both are quiet now.

## Why this is being filed anyway

A **third** rail was never in that list and is, on the evidence of the
screenshots, the loudest surface on the page: the nav tree's own study badges
(`apps/viewer/views/nav.js`'s `studyBadges`, over `VA.studyVerdict` and
`VA.ATTENTION`) plus `VA.summaryChips` on each stack leaf. See
`docs/sessions/lessons/LESSONS_20260916_flyout_resize_annotator_filter_and_deselect_4c_stack_alert_card_open.png`:
in the left 300px, at rest, with nothing hovered, a reader gets

```
Base datum to arm tip     no criterion   UNVERIFIED
                          NO TOLERANCE RECORDED
Base datum to strut end   no criterion   UNVERIFIED
⚠ Both paths at once      does not sum
Demo joint                2 traced  1 inferred  1 UNTRACED
                          1 element with no tolerance recorded
                          1 budget-scope check
```

Two filled red badges, a filled blue one, a filled amber one, and four outlined
chips — in a rail that is 300px wide and always visible.

**And it is very plausibly the rail Jeff's sentence names.** In the *same note*,
two paragraphs earlier, he writes: "It would be ok if it covered up the left
side **select menu** since you shouldn't need both at the same time" — and that
one is unambiguously this nav rail, because that is what the flyout now covers.
So "left side menu" reads at least as naturally as the viewer's nav as it does
as the annotator's element list.

## Why it was not simply done

This is a **design** question, not a copy-paste of the fix that shipped, which
is why it carries `audience: strategy`.

Those badges are loud **on purpose**, decided three weeks earlier and argued at
length: `viewer_study_verdicts_and_gaps` (2026-09-15) put them there after Jeff
said "None of the tolerance stacks in the entire page appear to have any kind of
roll up that shows whether the stack passes or fails". `apps/viewer/topology.js`
records the reasoning next to `VA.ATTENTION`:

> `loud` is the whole point — the failure mode being fixed is a page that
> "omits them entirely and then fails silently, which is worst of both worlds",
> so these are badges, not footnotes.

Quietening them is therefore partly reversing a deliberate recent decision, and
a tactical agent should not make that call inside a handoff that did not ask
for it. The two directions are genuinely different products:

1. **Consolidate like the other two rails.** One ⚠ per nav row, alerts on
   hover, the verdict badge (`PASS`/`FAIL`/margin) left alone because it is the
   answer rather than an alarm. Cheap — the mechanism now exists twice.
2. **Decide that the nav rail is where loud belongs** and that the 2026-09-15
   reasoning still stands, in which case this issue closes as `closed` with
   that written down, and the ambiguity in Jeff's sentence is resolved for good.

Either way it wants one sentence from Jeff about which rail he was looking at.

## A second instance of the same question, in the same page

The **materials table's** source column still carries a filled all-caps chip of
exactly the kind the elements table just lost: `CTE NOT TRANSCRIBED` /
`VALUES_STATUS UNKNOWN` (`views/stack.js`'s `materialSourcingCell`, over
`VA.valuesProvenance`, styled by the `.chip--values-*` half of the same
stylesheet rule the retired `.chip--export-*` selectors sit in). It is
always-visible, in a source column, and loud — which is the literal description
in Jeff's sentence.

It was left alone deliberately: the handoff enumerated the two rails by file and
line, this is a third table, and its vocabulary is its own (`CTE NOT
TRANSCRIBED` is not in `VA.EXPORT_CHIP_TEXT`, so consolidating it means deciding
where those words live as well as how they are shown). Mechanically it is the
cheap one of the two in this issue — `VA.rowAlerts` would grow a
`values.loud` branch and the card renderer needs nothing — but it is the same
"which rails should be quiet?" decision, so it waits on the same answer.

## Where the pieces are

* `apps/viewer/views/nav.js` — `studyBadges`, `stackItem`'s `VA.summaryChips` loop
* `apps/viewer/topology.js` — `VA.ATTENTION`, `VA.studyVerdict`, `VA.edgeAttention`
* `apps/viewer/viewer.js` — `VA.summaryChips`, `VA.ALERT_ICON`, `VA.rowAlerts`,
  `VA.alertsCard` (the consolidation shipped for the stack table; the model is
  reusable as-is, and `views/cards.js`'s `alerts` card kind renders it)
* `apps/viewer/style.css` — `.chip--alert`, `.hovercard__alert*`

## 2026-09-21 — answered for the nav rail; the materials table is what is left

Jeff answered the question this issue was waiting on, in the same words it
asked for. Reviewing the live viewer: *"the alerts still haven't been replaced
with a single triangle ! (hover over to see details)"*, and of the annotator's
badge, *"same purpose, just in a different place"*. So it was **direction 1**
(consolidate like the other two rails), not direction 2 — and the ambiguity
about which rail he meant is resolved: he meant this one too.

Shipped by `HANDOFF_20260921_viewer_nav_alert_badge_and_angled_default`:

* the **nav rail's study rows** now carry the verdict chip plus one outlined
  amber `⚠`, with the alerts as full sentences in the page's own hover card.
  `VA.studyNavAlerts` (`topology.js`) is the single place deciding which of a
  row's facts is an alert; `views/dom.js`'s `VA.alertBadge` is now the one
  builder behind both this badge and the elements table's. The 2026-09-15
  reasoning is kept where it applies: the **verdict** was what that handoff was
  answering, so it stays a chip, and the two verdict *states* that are not
  dispositions (`no criterion`, `does not sum`) fold with the flags. Documented
  in `apps/viewer/README.md`, "What a study row wears".
* `.tvflag` survives only on the DAG grid's edge rows and a study's totals
  strip, and `topology.css`'s note above those selectors now says so.

**Still open (1):** the **materials table's** source
column (`views/stack.js`'s `materialSourcingCell` over `VA.valuesProvenance`,
the `.chip--values-*` rules) still carries always-visible loud chips —
`CTE NOT TRANSCRIBED`, `VALUES_STATUS UNKNOWN`. That half was not in the
2026-09-21 handoff's scope (`apps/viewer/` nav rows and the leader default) and
still carries its own decision: consolidating it means deciding where those
words live, not only how they are shown. Everything the mechanism needs now
exists three times over, so it is cheap whenever it is picked up.

**Still open (2), and it is on this very rail — added by review, 2026-09-21.**
The section above originally called the materials table "the whole of what is
left"; it is not. The nav rail's **loose-stack leaf rows** (`views/nav.js`'s
`stackItem`, over `VA.summaryChips` — named in "Where the pieces are" above,
and visible in this issue's own screenshot excerpt as the `Demo joint` row)
were never in the 2026-09-21 handoff's scope, whose deliverable was written as
"the left nav's **study** rows". They still print every summary fact as its own
chip. Measured against `data/projections/viewer/` during that handoff's review:

```
hub_bearing_thermal_fit_m1   4 traced | 2 inferred | 2 UNTRACED | checks GENERATED | 4 sensitivity probes
hub_bearing_thermal_fit_m2   8 traced | checks GENERATED | 4 sensitivity probes
```

Five chips and three, one of them the **filled** `UNTRACED` — so after the
fold these two rows are the loudest rows on a rail whose study rows now wear a
verdict and one outlined ⚠. The inconsistency is new and is what makes this
worth naming separately: before 2026-09-21 the whole rail was loud together.

It is not a straight copy of the study-row fix, which is why it stays here
rather than being done inline. `VA.summaryChips` is a **counts** roll-up, not
an alert list: "4 traced" is not something the reader is asked to act on or
distrust, so the standing rule ("verdicts stay chips, everything that asks the
reader to act or distrust folds into the ⚠") does not by itself say which of
the five fold. That is the same *design* call this issue already carries
`audience: strategy` for.

## 2026-09-22 — "Still open (2)" is closed. (1) is the whole of what is left.

`viewer_nav_verdict_into_alert_and_icon` did the leaf rows, and in the same
pass took the verdict chip off the study rows Jeff had just looked at: "get rid
of the pass/fail in the left side menu (move it into the alert along with all
the other alerts)." So the rail now states **one** thing per row — a drawn
status icon — and everything a row has to say is in the card it opens, verdict
first, in sentences.

The design call this issue left open ("which of the five fold") was answered by
the rule the rail now runs on: **the rail states what asks you to look, and
nothing else.** A count of traced values, where the checks came from and how
many probes ran are a *scoreboard*, and they stay on the stack's own page,
which renders the same `VA.summaryChips` unchanged. What folds into the card is
what this repo's one rule is about — a value nothing stands behind, a value
with no band, and a check that is a budget rather than an answer
(`VA.stackNavAlerts`, `apps/viewer/topology.js`).

Two things the live data taught, which the measurement above could not show:

* `hub_bearing_thermal_fit_m2` has **nothing** in that list — all 8 values
  traced, no zero-width element — while two of its result checks are
  `marginal`. An alerts-only leaf row drew it silent. So a stack row derives
  its own verdict now (`VA.stackVerdict`, over the same `VA.worstVerdict` a
  study's comes from), minus the sensitivity probes, which the stack page
  stamps `NOT A RESULT`.
* `hub_bearing_thermal_fit_m1` **fails** `lower_seat__sleeve_to_bearing__hot`.
  Without the derived verdict it would have been amber — the one stack on the
  rail that fails, indistinguishable from the ones that merely need a look.

Both pinned against the live projection by the `[real]` leaf-row check in
`apps/viewer/tests.js`.

**"Still open (1)" — the materials table's source column — is unchanged and is
now genuinely the last of it.** This issue stays `open` for that half.

## 2026-09-22 (later) — "Still open (1)" is closed, and the 2026-09-16 thread is empty **as asked**

`stack_page_alert_marks_and_drawn_glyph` folded the materials table's source
column: `materialSourcingCell` no longer renders the `CTE NOT TRANSCRIBED` /
`VALUES STATUS UNKNOWN` chip at all. One quiet drawn mark per row where there
is something to distrust, nothing where there is not, and the words — unchanged
— on the mark's tooltip, its aria-label and the alerts card it opens.

Where the words live, which is the decision this half carried: **exactly where
they already did.** `VA.VALUES_CHIP_TEXT` (viewer.js) stays the one spelling,
and a new `VA.materialRowAlerts` beside it reads it into the alert shape
`VA.alertBadge` already renders — the fourth per-surface alert-list function
(`VA.rowAlerts`, `VA.studyNavAlerts`, `VA.stackNavAlerts`) rather than a third
branch on a function whose parameters are an element and its derived row.
`views/detail.js`'s pane chip reads the same table, so the row, the card and
the pane cannot disagree.

**So every half of this issue has shipped, and it can close.** But the
*question* behind it — which chips may be loud in an always-visible source
column — is not finished, and it moved rather than closed:
`ISSUE_20260922_the_loud_chips_in_the_live_materials_source_column_are_the_two_provenance_chips.md`
carries it, with the finding that made it worth re-filing. Measured on the live
projection while doing this fold: **the chip this issue asked to fold has never
rendered on a live stack page.** All six live material entries are
`values_status: "inline"`; the loud branch is reachable only from
`VA.generatedFixture()`'s `demo_fit`, which no browser surface loads
(`ISSUE_20260922_no_browser_surface_can_render_a_materials_table_at_all.md`).
What a reader of `hub_bearing_thermal_fit_m1` actually meets in that column is
two *filled* provenance chips on every row — `UNTRACED` and
`designation: NO CITATION` — and those are exempt from the fold by a rule this
repo wrote down on purpose. Before/after screenshots, including the live column
that did not change, are in
`docs/sessions/lessons/LESSONS_20260922_stack_page_alert_marks_and_drawn_glyph.md`.
