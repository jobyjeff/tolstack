---
type: feature
priority: med
status: open
area: apps/viewer
audience: strategy
reporter: agent
found_by: docs/sessions/HANDOFF_20260922_stack_page_alert_marks_and_drawn_glyph.md
---

# The chip that was folded out of the materials source column was never on a live page — the two that *are* always visible there are the provenance chips

## What the fold actually moved

`stack_page_alert_marks_and_drawn_glyph` (2026-09-22) closed "Still open (1)"
of `ISSUE_20260916_the_viewer_nav_rail_may_be_the_left_side_menu_jeff_called_loud`
by folding `materialSourcingCell`'s `CTE NOT TRANSCRIBED` / `VALUES STATUS
UNKNOWN` chip into the row's one quiet alert mark. That is done, tested and
witnessed.

**On the fixture.** Measured on `data/projections/viewer/` during that handoff,
all **six** live material entries — three on `hub_bearing_thermal_fit_m1` and
the same three on `_m2` — carry `values_status: "inline"`, whose
`VA.VALUES_STATUSES.inline.loud` is `false`. So the chip that was folded away
**has never rendered on a live stack page**, and `?mock=1` cannot show it
either (`topology_app.js`'s `mockFixture()` offers `demo_joint` and
`demo_joint_standalone`; the only stack with materials is
`VA.generatedFixture()`'s `demo_fit`, which no browser surface loads).

`apps/viewer/viewer.js` already said half of this next to the sentences —
*"only one of the three was ever reachable by live data"* — and the new
`[real]` check in `apps/viewer/tests.js` now asserts it where a reader of the
fold will see it.

## What a reader of a live page actually meets in that column

Screenshot: `docs/sessions/lessons/LESSONS_20260922_stack_page_alert_marks_and_drawn_glyph_2_materials_source_cell_live_before.png`
(the `after` is pixel-identical, which is the point). On
`hub_bearing_thermal_fit_m1`, every one of the three material rows:

```
UNTRACED            filled red      the CTE's own confidence
workbook            grey            kind
designation: NO CITATION   filled magenta   the DESIGNATION's confidence
260209_Hub Bearing Fits.xlsx · sheet 260209…
```

**Two filled chips per row, on every row, in a 260px always-visible source
column** — which is the literal reading of Jeff's 2026-09-16 sentence
(*"especially the ones in the source column that are always visible"*) far more
than the chip that was just folded. Three rows, six filled chips.

## Why this is filed rather than done

Because folding either of them reverses a rule that is written down and
deliberate, which is a design call and not a tactical one:

* the **confidence chip is explicitly exempt.** `VA.rowAlerts`' own comment:
  *"What stays on the row beside it is the confidence chip, the kind chip and
  the material chip, which are not alerts: they are the row's primary
  provenance signal."* The elements table keeps `conf--untraced` and
  `conf--no_source_ref` filled for the same reason — *"an untraced value has to
  survive being skimmed"* (`apps/viewer/README.md`, "Reading the colours").
* but `designation: NO CITATION` is arguably **not** the row's primary signal.
  It is the provenance of the material's *name*, a second confidence axis on
  the same row, and it wears the same fill as the first. The standing rule the
  2026-09-22 rail pass runs on — *a row states what asks you to look, and
  nothing else; verdicts stay chips, anything that asks the reader to act or
  distrust folds into the mark* — does not by itself say which of the two a
  second confidence axis is.
* and the honest third option is that **nothing is wrong here**: a stack whose
  every material is untraced and uncited should look alarming, and the 2026-09-17
  typography pass already thought about this exact cell (it outlined
  `.chip--values-*` precisely because *"the confidence chip immediately beside
  it is already the filled magenta mark, and one row was carrying that mark
  twice"* — leaving two filled marks rather than three).

## What would settle it

One sentence from Jeff, looking at that column on
`hub_bearing_thermal_fit_m1` — the same way the 2026-09-21 answer settled which
rail he meant. The question is narrow: **may a *confidence* chip be filled in
an always-visible source column, and does a second confidence axis
(`designation:`) belong on the row at all?**

If the answer is "fold the designation axis", the mechanism is already there
and it is four lines: `VA.materialRowAlerts` grows a branch over
`row.designation_confidence` and the chip comes off the cell. If the answer is
"the fill stays", this closes as `closed` with that recorded, and the
2026-09-16 thread is finally empty — because the half that handoff was given is
done.

## One smaller thing, in the same column

The cell is clipped to 260px (`.el-row__source`), so three chips wrap onto
three lines and `designation: NO CITATION` is cut mid-word
(`designation: NO CITA…`) at the default pane width — visible in the same
screenshot. A chip that is truncated states a different thing from the one it
says. Whether the answer is a shorter word, a narrower axis or a wider column
is the same design question as above, which is why it is a paragraph here
rather than an issue of its own.
