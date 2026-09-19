---
type: feature
priority: low
status: open
area: apps/annotate
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20260918_reader_facing_surfaces_second_pass.md
---

# The annotator's command box is a developer affordance living in a reader's chrome, and rewording its placeholder did not settle that

`ISSUE_20260917_the_annotators_console_and_parts_label_print_code_at_the_reader`
named two defects and one *undecided question*. The two defects are fixed
(`reader_facing_surfaces_second_pass`, 2026-09-18): the placeholder is the word
`command` with the accepted verbs on the input's `title`, read off the command
registry; the parts panel says `parts with a 3D model`. The question is not,
and the original issue said as much:

> * if the command box is a **developer affordance**, it should not be
>   always-on chrome at the foot of a reader's 3D view at all — that is the
>   "if a feature is disabled or absent from a build, show nothing about it"
>   rule, one step over;
> * if it is a **reader** affordance, then "isolate" is a verb the parts panel
>   already offers as a button, and the box is a second way to do the one thing
>   that already has a control.

Nothing in this session answered that, and rewording the placeholder makes the
box *quieter* without making it *justified*.

## What is actually true of it today

* `apps/annotate/README.md` calls it "the dev console", and `app.js`'s own
  comment above `runConsoleCommand` calls it "`window.AnnotateApp.exec`'s own
  UI … the shape a future vision-agent driver's own tool calls would take".
* The command layer has **15 verbs**. Of those, the parts panel already offers
  show / hide / isolate as buttons, the two pickers cover `select-topology` /
  `select-study`, a click covers `select-face`, the rail filter's **Show all**
  covers `filter-element`, and the deep link covers `goto`. The verbs with no
  UI equivalent today are `camera`, `ghost`, `mark-face`, `trace` and
  `deselect` — and `trace` is the one a reader might genuinely want.
* It occupies a permanent strip at the foot of the 3D pane, visible at rest
  with nothing selected, on both the standalone page and inside the viewer's
  flyout — where the reader has no devtools open and no reason to expect one.

## The options, and what each costs

1. **Withhold it unless asked for.** A `?console=1` param, or the same
   transport gate the hosted page already uses to withhold controls it cannot
   honour (`app.js`'s "a control that is about to be withheld is never wired").
   Cheapest, and it is the option Jeff's standing rule points at. Cost: an
   agent driver and a developer both have to know the param exists.
2. **Promote the verbs it uniquely offers into real controls** (`trace` above
   all, which is a per-study 3D view a reviewer would want) and then withhold
   the box. Most work, best surface.
3. **Keep it and argue for it in the README**, on the ground that this app's
   architecture *is* "a thin shell over CLI-shaped commands" and the box is
   that architecture made visible. Honest, but it is an argument about the
   builders' convenience on a surface Jeff reviews as a reader.

## Why this carries `audience: strategy`

It is a scope decision about what `apps/annotate/` is for, not a defect with a
right answer — and the annotation surface's scope is already written down
(`docs/ANNOTATION_SURFACE.md`, "select + tag only"), which is where an answer
belongs. A tactical handoff that just deleted the box would be making that
call by hand.

## Where the pieces are

* `apps/annotate/index.html` — the console markup
* `apps/annotate/app.js` — `runConsoleCommand`, the registry, the wiring gate
* `apps/annotate/commands.js` — the 15 verbs and `AA.commandHint`
* `apps/annotate/README.md` — "What the box SAYS, and why it is so little"
* `docs/ANNOTATION_SURFACE.md` — the surface's stated scope
