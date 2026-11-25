---
type: feature
priority: low
status: deferred
area: annotate/form
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261122_editing_a_feature_opens_its_form_where_the_tree_was.md
class: setting_without_surface
defer_until: 2026-12-25
resolution: deferred 2026-11-25 (triage) -- low, deferred by default
---

# Flip has no place in the feature's form

The feature body's **Flip** moved a binding to the other end of a dimension
whose other end was free (`flip <edge> <end> <topology>`, one correction).
The body is gone (2026-11-23): a feature is edited in its form, which takes
the tree's place, and the form has no Flip. The pane verb `flip` is still
registered and still works from the console; nothing on screen reaches it.

Flip is a different gesture from editing a set: it says "these faces are the
*other* feature's", which is a move between two forms. Options:

1. A **Move to <other feature>** control in the form, only on a feature that
   is a dimension end whose other end holds nothing (today's Flip rule).
2. Nothing: the reader unbinds here and binds the other feature in its own
   form (two ticks instead of one).
3. Fold it into the next link's right-click menu on a face (the handoff
   `right_click_offers_what_the_form_does_and_the_bar_over_the_canvas_only_plays`).

Recommendation: 3, since the menu already names the feature a face goes to.
