---
priority: med
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-11-05 — stack_wording_drops_filler_and_the_hover_says_the_same_thing: one wording pass over every element name, and the cell and its hover are one phrase

Source: Jeff's forge note `20261105T164140_sm8hkc` (2026-11-05), "Wording": "The wording in the
tolerance stacks still needs another pass for consistency. For example 'datum A to its top face,
the feather direction st...' the entire string doesn't even fit in it's column anyways and is very
weird/confusing sounding, while the row above it is simply 'height'. And then when you hover over
it displays an entirely different but similar text string (gas-spring mount datum A...). Get rid of
filler words like 'the' and 'its'. This is a generalized statement across all tolerance stacks."
Baseline: master after the 11-03 batch. Element names are authored by hand in
`docs/topologies/topology_vpa_pitch_linkage.json` (the example is edge
`gas_spring_mount_datum_a_to_end_stop`, `:1939`, `"gas-spring mount datum A to its top face, the
feather-direction stop"`) and in the linear stacks under `docs/tolerance_stacks/`; the cell
prints `VA.elementDisplayLabel` (`apps/viewer/topology.js:3395`, drops the component's words)
and the hover shows the full `edge.name` (`VA.edgeHoverTitle`, `:309`; the record title in
`apps/viewer/element_record.js:148`). Scope: the `name` fields of every edge and element, the
two label functions, and `docs/SOP_TOLERANCE_STACK.md`'s "Titling an artifact" paragraph (the
rule lands there, once; the open brief `BRIEF_20260915_prose_field_rules_names_and_derivable_counts.md`
asked what a `name` may carry — answer its `name` half here and say so in the lesson). Do NOT
split the component column (owned by `the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what`)
and do not touch `description`/`note` fields or any `source_ref`.

## The rule (binding)

An element `name` is the feature-to-feature span in the part's own words, in this order and
nothing else: `<from feature> to <to feature>`, or a single word when the drawing calls it one
(`height`, `thickness`, `length`). No articles (`the`, `its`, `a`), no part name (the part column
carries it), no explanation after a comma (that is the `note`). Where a drawing names a datum,
use it: `datum A to top face`. Two elements of one part that would read the same get the
distinguishing feature word, never a number.

## Deliverables

1. **Rewrite every `name`** in the topology and the linear stacks to the rule. Keep a table in
   the lesson: old → new, with the count of names changed and the count left as they were.
2. **One phrase, two lengths.** The cell shows the name; when it is cut, the hover shows the
   same name in full, never a differently worded string. If a reader needs the part, it is in
   the part column. Remove the second wording path or make it return the name.
3. **The SOP states the rule** in "Titling an artifact", and a test pairs every `name` in the
   corpus against the rule's mechanical half (no leading article, no `the`/`its`, no comma)
   so the next author cannot drift. Enrol the guard's mutation spec in the same change.

## Definition of done

- Zero names in the corpus contain ` the `, ` its `, or a comma; the test proves it.
- Screenshot of the stop sub-stack with every row's cell readable and the hover text equal to
  the cell text where nothing was cut.
- `pytest -q` green in the main checkout; viewer `[real]` tier re-pinned where a name is a
  fixture value, with the reason stated.
- Lesson (`docs/sessions/lessons/LESSONS_20261105_stack_wording_drops_filler_and_the_hover_says_the_same_thing.md`):
  the old → new table, the brief's `name` question answered, any name the rule could not
  express and what was done instead.
