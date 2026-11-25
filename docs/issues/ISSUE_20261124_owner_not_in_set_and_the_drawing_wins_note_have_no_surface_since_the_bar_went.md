---
type: feature
priority: med
status: triaged
area: annotate/form
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261122_right_click_offers_what_the_form_does_and_the_bar_over_the_canvas_only_plays.md
class: setting_without_surface
resolution: deferred 2026-11-25 (triage) -- med beyond BUDGET=3 | triaged 2026-11-25 (triage, class escalation) -- three arrivals of setting_without_surface in two days; one brief decides all three
strategy: docs/strategy/BRIEF_20261125_what_the_retired_bind_bar_held_needs_a_home_or_a_retirement.md
---

# Owner-not-in-set and the "drawing wins" note have no surface since the bar went

Handoff `right_click_offers_what_the_form_does_and_the_bar_over_the_canvas_only_plays`
(2026-11-24) made the bar over the 3D canvas hold the play controls alone. Two
things it held when an element (an edge) was selected in the pane have no
other home:

| what | where it was | what it did |
|---|---|---|
| **Owner not in this set…** (a folded form under the bar) | `app.js` `buildOwnerNotInSetForm` / `buildOwnerNotInSetFields`, deleted | wrote an `owner_not_in_set` event: "this element's part is not among the parts loaded here, so no face here can stand for it" |
| the precedence note | `app.js` `precedenceNote`, deleted | "A drawing already cites this element (confidence: …). The drawing wins -- a binding here only records which feature this is" |

The writer itself (`AA.buildOwnerNotInSetEvent`) and the fold are untouched;
nothing on any surface calls the writer now. Jeff's log holds no
`owner_not_in_set` event (0 in the 2026-11-24 fold), so nothing that exists
is stranded.

Options:

1. **The feature's form** carries both: a quiet "Not on these parts…" control
   beside Unbind that writes the event (a form-level verb, so the tick rule
   needs a line on it), and the precedence fact as the form's provenance
   disclosure.
2. **The row's right-click menu** carries owner-not-in-set (a menu item that
   writes, like Bind the suggested faces), and the precedence fact goes on the
   Preview, where the drawing citation already is.
3. **Retire owner-not-in-set** as a UI gesture (it was built for the
   rail-era element list, where an element's part might have no mesh at all;
   a feature whose part has no 3D model has no form and no menu today).

Recommendation: 2 for the precedence fact (it is about the element's value,
which the Preview already shows) and 3 for owner-not-in-set unless Jeff has a
case for it -- with the tree, a feature with no mesh is visibly open and has
no ✎, which is the same fact without a write.
