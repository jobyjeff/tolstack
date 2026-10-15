---
priority: med
depends_on: [parts_sit_where_the_assembly_puts_them]
model: sonnet
---

# HANDOFF 2026-10-14 — a_context_filter_and_a_view_filter: the annotator's parts panel separates what is in the model from what is drawn, and Isolate can be undone

Source: strategy session 2026-10-14 (Jeff live, using the annotator in
Chrome). Baseline: `integration` after `parts_sit_where_the_assembly_puts_them`
merges. It owns the same `app.js`/`scene.js`, hence the dependency. Scope:
`apps/annotate/` parts panel + its verbs (`commands.js`), `README.md`,
`docs/ANNOTATION_SURFACE.md`. Do NOT touch the placement rule, sweep-mode
playback or `apps/viewer/`.

## What Jeff hit

- **Isolate is a trap.** "When I clicked one, it permanently hid everything
  else and there was no way to get back."
- **No bulk control.** He asked for "a checkbox at the top for show all/hide
  all (inline with the individual show/hide checkbox)".
- **One filter doing two jobs.** In his words: "there really should be two
  filters: the context filter (what is actually loaded into the model/study)
  and the view filter which controls what's actually rendered."
- **Empty study dropdown.** He picked topology "Propeller pitch linkage
  joints" and the study dropdown had no options. The topology is studyless
  by design (2026-09-30), but the page doesn't say so.
- **Clicks with no answer.** "Nothing happens or gets selected when I click
  the spherical faces." He may have been in sweep mode away from the 72° pose
  (picking off, which the bar says in orange), or without an element selected
  to bind to. Either way, a click that does nothing should say why.

## Deliverables

1. **Isolate becomes a toggle.**
   - On: show only this part (or, when several are toggled, only those).
   - Off: restore exactly the visibility set from before the first isolate.
   - The button shows its state (`aria-pressed`) and looks pressed, using the
     type and colour rules in `docs/DESIGN_TYPE_AND_COLOUR.md`.
   - The `isolate` verb gains its inverse. Suggestion: `isolate off`, keeping
     the everything-is-a-command rule, with the README verb table updated.
   - `ghost` gets the same treatment, since it is isolate's translucent twin.
2. **Two filters, named in everyday words.**
   - **Context** = which parts are in the model you're working in.
     - Default: the selected topology's parts, or the study's when one is
       selected.
     - In sweep mode: the run's bodies plus whatever the reader added.
     - The reader can add or remove parts. "Show parts outside this model" is
       the way to reach the rest of the mesh store.
   - **View** = which of those are drawn right now: the per-row checkbox,
     isolate and ghost.
   - Changing the view never changes the context.
   - Leaving a context (another topology or study) resets the view to "all
     drawn".
   - Lay it out so the panel reads as one list with two kinds of control, not
     two lists. Suggestion: context membership as the row grouping ("in this
     model" / "other parts with a 3D model", the second collapsed), and view
     as the row checkboxes.
   - Copy follows Jeff's rules: no paragraph explanations, no internal names,
     everyday words.
3. **Show all / hide all**: a tri-state header checkbox aligned with the row
   checkboxes, over the rows currently in context. It is checked when all are
   drawn, unchecked when none are, and indeterminate otherwise. It's a verb
   too.
4. **Say why, instead of doing nothing.**
   - An empty study dropdown reads "no studies yet" (disabled), not blank.
   - A click on a face while picking is off puts one line in the banner
     saying why (picking off during a sweep away from the as-modelled pose; no
     element selected to bind). That reuses the existing banner, not a new
     surface.

## Definition of done

- Fast-tier tests:
  - isolate → isolate off restores the prior set exactly;
  - show-all/hide-all tri-state over a mixed set;
  - changing the context resets the view;
  - none of the view verbs changes context membership.
- A browser-check pass that clicks Isolate twice and asserts the original
  set is drawn.
- Dark screenshots of the panel in three states: all drawn, one isolated,
  and mixed with the header indeterminate.
- Full suite green in the main checkout per `CLAUDE.md`, with mutation specs
  for new guards.
- Lesson: the context/view vocabulary as shipped, and anything about it you
  had to decide that this handoff didn't.
