---
type: bug
priority: low
status: open
area: viewer/stack-page
reporter: agent
found_by: docs/sessions/HANDOFF_20260922_stack_page_check_card_balance_sheet.md
---

# The results table's units-mismatch warning asks for `.chip--alert`, which was retired the day before

`views/stack.js`'s `unitsNote()` (added by
`stack_page_check_card_balance_sheet`, 2026-09-22) is the guard that stops the
new results table printing a number under a column header that is wrong for
it: the five numeric headers carry the **stack's** units once, so a check
recording its own different units says so on its row instead.

```js
return VA.chip("chip--alert", "units: " + check.units,
  "This check's own units are " + check.units + ", not the " +
  stackProj.units + " the column headers state.");
```

**There is no `.chip--alert` rule in either stylesheet.**
`stack_page_alert_marks_and_drawn_glyph` retired it the day before — the badge
became `.rowalert`, a drawn path with no box — and `style.css`, `topology.css`
and `views/dom.js` all now describe `.chip--alert` in the past tense
(`grep -n 'chip--alert' apps/viewer/` returns comments and no declaration).
So the one warning on this page that says *"this number is under the wrong
header"* renders as an ordinary neutral chip, indistinguishable from the
`chain` / `stage` / `temperature` corner chips sitting on the same line.

Not reachable today: every live check and every live stack is `mm`, so the
branch never runs outside `apps/viewer/tests.js`'s synthetic case (*a check
whose own units differ from the stack's says so on its row*), which asserts the
text and not the treatment. That is why this is `low` — but it is also why it
will stay wrong until someone authors a stack in inches, at which point the
page is silently mislabelling a column and the mark that should say so is
invisible.

Fix is a design call rather than a rename, which is why it is filed rather
than corrected in review: the mark should be whatever the 2026-09-22 pass
decided an alert is (`VA.alertBadge` / `.rowalert`, the drawn glyph), not a
re-added `.chip--alert` rule — but a drawn badge beside a text chip on a row
already carrying up to four corner chips is a layout question, and
`apps/viewer/warning_icon.js` is one surface away from this one.

**The general shape, for the checklist:** a handoff cut immediately after a
retiring one reaches for the retired class name because every *comment* about
it is still there. `grep` the class for its **declaration**, not for the word.
