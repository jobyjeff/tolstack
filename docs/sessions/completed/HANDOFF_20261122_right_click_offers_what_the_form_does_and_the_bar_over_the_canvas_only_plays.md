---
priority: high
depends_on: [editing_a_feature_opens_its_form_where_the_tree_was]
model: opus
hitl: false
---

# HANDOFF 2026-11-22 — right_click_offers_what_the_form_does_and_the_bar_over_the_canvas_only_plays: context menus on a face and on a tree row, and a top bar with the play controls alone

Source: Jeff, 2026-11-22 (chat), and the sketch he said yes to. Third of a
chain of four.

> Also, wondering if some of the commands could be hidden behind right click
> context menus, or if clicking an item brought up a separate panel (this
> used to partially exist in the top menu, which sort of still exists but is
> also very clunky because it crams the viewer play controls together with
> the binding controls and again has very little contrast etc.

**The sketch**: `C:\workspace\dispatch\docs\strategy\drafts\mockups\tolstack_binding_pane_20261122\index.html`
(right-click a face in it) and the `README.md` beside it.

Baseline: trunk with `editing_a_feature_opens_its_form_where_the_tree_was`
merged: a feature is edited in a form that replaces the tree; nothing in the
tree writes. Read its lesson first ("what the next link's menus should
call"). Scope: the 3D pane's bar and its pointer handling
(`apps/annotate/`), the tree's rows (`apps/viewer/views/nav.js`,
`apps/viewer/topology_app.js`), their styles and tests,
`docs/ANNOTATION_SURFACE.md`. Do NOT touch: the form's behaviour or the
write path; the map, grid and study views. Never write to
`C:\workspace\tolstack\data\inbox\feature-identity\`.

## Deliverables

1. **Right-click on a face in the scene.** With a form open: put this
   surface in the set, or take it out, named for the feature being edited.
   With no form open and a feature selected: bind to that feature, which
   opens its form with the surface in the set (nothing is written until the
   tick). Always: isolate this part, hide this part, show everything. A
   right-drag still orbits or pans as it does today; the menu opens on a
   click that did not move.

2. **Right-click on a tree row.** A feature: edit its binding; accept its
   suggestion (only where it has one best suggestion: this is the one
   gesture that writes without the form, the same event the form's tick
   would write); unbind. A part or a body: isolate, hide or show. A joint:
   go to either end.

3. **A menu is a shortcut, never the only way.** Everything in a menu can be
   done without it, from the form or the tree. Menus use the words the form
   uses.

4. **The bar over the canvas holds the play controls and nothing about
   binding.** Measure what the bar holds today, in each of the pane's modes,
   and table every control and line of text: stays (play, pose, view), moved
   to the form, moved to a menu, or gone. The pane's head that names its
   mode ("Binding — Propeller Pitch System"), the step prompts ("… Click the
   first one in the 3D view.") and "Pick an element on the left to bind this
   face to." go: the form is on screen when something is being edited, and
   that is how a person knows. A page never describes itself.

5. **Keys.** Esc closes a menu before it closes a form. Nothing else new.

## Definition of done

- Browser checks in the existing suites (no new tier): each menu item does
  what its form or tree twin does, checked by the event written or the state
  reached; a right-drag opens no menu; accepting a suggestion from the tree
  writes exactly the event the form would. Node suites and default pytest
  green in the main checkout.
- **Looked at with vision**, scratch data root, scratch port, never 8000, at
  3840 and 1536 wide: each menu open over the scene and over the tree (it
  must not run off the pane or cover the face it was opened on); the bar
  before and after in each mode; the sweep playing with a form open. Then
  click around as `CLAUDE.md` asks.
- Jeff's real log unchanged by you (count and hash before and after).
- Lesson (`docs/sessions/lessons/LESSONS_20261122_right_click_offers_what_the_form_does_and_the_bar_over_the_canvas_only_plays.md`):
  the bar's table (deliverable 4); the menus as built; anything the bar held
  that has no home yet, filed and named.
