---
priority: med
depends_on: [the_active_study_is_a_compact_band_and_the_rest_of_the_model_hangs_above_and_below]
model: sonnet
hitl: false
---

# HANDOFF 2026-10-28 — a_study_is_a_translucent_group_on_the_dag: every study draws as a see-through container, toggled by a filter, over the grey body containers

Source: Jeff's 2026-10-28 review ("we have groups for rigid bodies now, but
let's also add groups to display individual studies as well, with a filter
to turn the display on/off. Study groups should be a different color from
the grey rigid body containers … they'll overlap the rigid body containers
and each other, so they should be transparent"). Baseline: `master` with
`the_active_study_is_a_compact_band…` merged. Scope: `apps/viewer/views/topology.js`
(`railsSvg` ~:1302–1365 — body fields and the kinematic sub-stack field are
the two existing containers), `apps/viewer/topology.js` (`bodySpans`
~:2085–2117 is the span model to generalise), `apps/viewer/topology.css`
(`.tv__bodyfield` ~:468–475, `.tv__substack`), the toolbar, `tests.js`,
browser specs. Do NOT touch the layout/positions code or `apps/annotate/`.

## What exists

- A **body** is drawn as one padded `rect.tv__bodyfield` (rx 6) per maximal
  run of consecutive rows sharing a `body` (`VA.bodySpans`; Python's
  `body_spans` emits the same list), tinted by `VA.bodyTint`, `--flat` when
  nothing in it is lit; collapsible to a pill (`VA.collapseBodies`).
- The only per-study container is the kinematic page's dashed
  `rect.tv__substack` around each `study_ref` chain
  (`VA.kinematicSubStacks`, `views/kinematic.js:492–511`).
- Studies: 22 in the projection; each has a lit set (connected since the
  closure handoff) and, after the rearrange handoff, a contiguous band when
  selected — but when *not* selected its rows are wherever the current
  arrangement puts them, so a study group may be several rects.

## Deliverables

1. **Study spans.** `VA.studySpans(layout, study)` = maximal runs of
   consecutive rows in the study's lit set, the body-span shape; one rect
   per span, drawn **after** body fields and **before** marks, with `rx` and
   padding slightly larger than the body field so the two read as nested
   when they coincide. Fill at low alpha (two overlapping study groups still
   show both), stroke at medium alpha, one hue per study kind — chain
   stacks, thermal fits, kinematic — from the existing palette tokens
   (`docs/DESIGN_TYPE_AND_COLOUR.md`; never a new colour literal); label
   with the study title at the top-left of the first span, type size from
   the scale, elided to the field width.
2. **Filter.** A toolbar control "Groups: bodies · studies · both · none"
   (default **both** when a study is selected, **bodies** otherwise); state
   stored per topology like `VA.readCollapsedBodies`. The selected study's
   group is always drawn at a slightly higher alpha than the others.
3. **Hover and click.** Hovering a study field highlights its grid rows (the
   existing shared hover); clicking its label selects the study (the same
   path as the nav row).
4. **Hidden mode.** With "Unused: hidden" only the selected study's group
   remains (its lit band), drawn whole.

## Definition of done

- Real kinematic page and one grip-budget page: screenshots in both modes
  showing nested body + study containers, overlapping study groups legible.
- `tests.js`: `studySpans` on hand-built and real layouts (count and bounds
  per study), draw order (study rect index between body rects and marks),
  the filter's four states, alpha ordering for the selected study.
- Browser spec: toggle the filter through its states on the real page and
  assert rect counts.
- All four main-checkout tiers green after a projection rebuild; `pytest -q`
  green.
- Lesson (`docs/sessions/lessons/LESSONS_20261028_a_study_is_a_translucent_group_on_the_dag.md`):
  spans per study on the real model; the alpha values chosen and how they
  look against both themes; what overlapping groups still make hard to
  read (for the next round).
