---
type: feature
priority: low
status: triaged
area: viewer/accessibility
reporter: agent
audience: strategy
strategy: docs/strategy/BRIEF_20260914_hover_card_occlusion_and_a11y.md
---

# Absorbing a mark's native `<title>` into a hover card leaves a focusable element with no accessible name

Noticed reviewing `viewer_dag_hover_cards` (2026-09-14). The "one hover
surface, not two" rule is right for a sighted reader — a browser tooltip
stacked under a card says less than the card alone — but the `<title>` it
retires was also the element's **accessible name**, and nothing replaced it.

The pattern now covers four triggers, and it started before this handoff:

- `.rail__barhit` and `.rail__dot` — `wire()` sets `tabindex="0"`; the card
  branch appends no `<title>` (`apps/viewer/views/topology.js`,
  `viewer_dag_hover_cards`, 2026-09-14).
- the merged component cell — `tabindex="0"`, `title` retired
  (`componentCell`, `viewer_hover_cards_and_deep_links`, 2026-09-10).
- the sourcing confidence chip — same shape.

So a keyboard reader tabs onto a graph mark, the card opens on `focus` (good),
and a screen reader announces an unnamed graphic: `grep -rn "aria-" apps/viewer`
returns **nothing at all**, so the popover is not `role="tooltip"`/`role="dialog"`,
is not an `aria-live` region, and carries no `aria-describedby`/`aria-labelledby`
relationship to the trigger that opened it.

This is a design call rather than a tactical edit, which is why it is filed
rather than fixed: the app has no accessibility convention to conform to yet,
and picking one (name the marks with `aria-label` from the same string the card
heads itself with? make `#croppop` a described-by target? both?) sets the
pattern for every future trigger. It belongs with whoever owns the hover-card
mechanism as a whole — the same owner
`ISSUE_20260914_dag_hover_card_occludes_the_marks_beneath_it.md` is waiting on.

Cheap interim option if the full answer is deferred: `aria-label` on the mark
carrying `VA.edgeHoverTitle(...)` / the node name — the strings already exist
as constants, it is one attribute per mark, and it restores what the `<title>`
used to provide without re-introducing a visible second tooltip.
