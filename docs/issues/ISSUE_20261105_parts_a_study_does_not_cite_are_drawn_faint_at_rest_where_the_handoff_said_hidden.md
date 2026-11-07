---
type: feature
priority: med
status: deferred
area: apps/annotate (part looks at rest, study scope)
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261105_everything_in_3d_is_transparent_until_an_action_needs_a_face.md
defer_until: 2026-11-20
class: three_d_visibility_policy
resolution: deferred 2026-11-06 (triage) -- med beyond tolstack's budget of 3 (two highs and one class-scoped handoff staged); 14 days
---

# Parts a study does not cite are drawn faint at rest, where the handoff said hidden

Handoff `everything_in_3d_is_transparent_until_an_action_needs_a_face`,
deliverable 4: "If a housing … must be drawn, it is ghost; **if a study does
not cite it, it is hidden.**"

What shipped (`apps/annotate/app.js`, `restLook` and `applyPartScope`): a part
the open study does not cite is drawn **faint** (opacity 0.07) while the page's
**Unused** word is `dim` — which is its default (the shots show "Unused:
dimmed") — and hidden only when the reader switches that word to `hide`. The
tactical lesson states this as a deliberate choice: the page already has a
reader-facing word for exactly this, and 0.07 obscures almost nothing.

The review (2026-11-05) accepted it as reasonable but it is a departure from
the handoff's words, so the choice is put where it can be confirmed:

- **Keep it (recommended).** One control already decides "unused parts: dimmed
  or hidden", on the 2D page and the 3D pane alike. Hiding regardless of it
  would make the 3D pane ignore the word the page shows.
- **Hide uncited parts at rest whatever the word says.** One line in
  `restLook`/`planPartScope` (`hideRest` always true while a study is open).
- **Change the Unused word's default to `hide`.** Affects the 2D page too.

Jeff's own note asked to "hide and/or dim"; the first option satisfies it
literally. If Jeff, using the page, still finds an uncited housing in the way,
the third option is the cheapest change that gets him there.
