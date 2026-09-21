---
type: feature
priority: med
status: open
area: apps/viewer
audience: strategy
reporter: agent
found_by: docs/sessions/HANDOFF_20260916_flyout_resize_annotator_filter_and_deselect.md
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

**Still open, and the whole of what is left:** the **materials table's** source
column (`views/stack.js`'s `materialSourcingCell` over `VA.valuesProvenance`,
the `.chip--values-*` rules) still carries always-visible loud chips —
`CTE NOT TRANSCRIBED`, `VALUES_STATUS UNKNOWN`. That half was not in the
2026-09-21 handoff's scope (`apps/viewer/` nav rows and the leader default) and
still carries its own decision: consolidating it means deciding where those
words live, not only how they are shown. Everything the mechanism needs now
exists three times over, so it is cheap whenever it is picked up.
