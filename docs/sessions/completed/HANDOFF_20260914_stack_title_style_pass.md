---
priority: high
depends_on: []
model: opus
---

# HANDOFF 2026-09-14 — stack_title_style_pass: retitle every stack/topology/study to a short noun phrase; encode the title style rule

Source: Jeff, strategy session 2026-09-14, reviewing the viewer nav: titles
like "Pitch link to pitch plate -- the grip-length joint as a topology" —
"All joints are now a topology, there's no reason to clutter up the title
with this random meaningless fact, and the rest of it has strange wording.
It should simply just be something like 'Pitch link to pitch plate grip
length' … about half of the titles randomly have the units in parentheses
in the title … the end result is it just looks like a wall of text."
Baseline: `integration`. Scope: the authored `title`/name fields in
`docs/tolerance_stacks/*.json`, `docs/topologies/*.json` (topologies AND
their studies), `docs/SOP_TOLERANCE_STACK.md` + `docs/DAG_TOPOLOGY.md`
title guidance, `docs/prompts/REVIEW_AGENT.md` checklist, and
`apps/viewer/views/nav.js` ONLY for tooltip rendering. Do NOT touch viewer
geometry/layout/grid code (owned by the active `viewer_dag_spine_layout`
and staged `viewer_leader_grid_legibility` / `viewer_dag_hover_cards` /
`viewer_study_respine_animation`); do NOT change any stack VALUE, id, or
filename — display names only, deep-link ids must survive untouched.

## Deliverables

1. **Retitle pass over every stack, topology and study.** The rule (this is
   the standing UI-copy guideline, now applied to titles): a title is a
   short noun phrase naming the thing — no genre statements ("as a
   topology", "-- built from scratch, no source workbook"), no history or
   negation (what it used to be / isn't), no units in parentheses (units
   belong on the values; where a disambiguation is genuinely needed it goes
   in the tooltip, not the title), no sensitivity/mode clauses baked into
   the name where a shorter name + tooltip works. Examples from the live
   nav: "Pitch link to pitch plate -- the grip-length joint as a topology"
   → "Pitch link to pitch plate grip length"; "Propeller pitch system --
   blade-pitch position topology (L2: branches + the linear-rotary
   coupling)" → "Propeller pitch system blade-pitch position" (the L2
   framing moves to the tooltip/description); study titles like "Blade OML
   angular position, hub A datum to blade OML, at the full-sweep-average
   sensitivity (degrees)" lose the units and compress. Keep a `description`
   (or equivalent existing field) carrying anything real that the title
   sheds — nothing informative is deleted, it is demoted.
2. **Nav tooltips = the progressive disclosure.** `views/nav.js` gains a
   `title=`/hover tooltip showing the description where one exists.
   Display-only; no new panel, no new chrome.
3. **The rule goes where authors read.** One short titled-artifact style
   rule in `docs/SOP_TOLERANCE_STACK.md` (and referenced from
   `docs/DAG_TOPOLOGY.md` if it has its own naming section), plus a
   REVIEW_AGENT.md checklist line, so the next authored stack doesn't
   regress. Mind the repo rule: prose that restates a vocabulary a test
   owns is a defect — write the rule once, point at it.

## Constraints

- The suite pins ground-truth numbers and pairs docs against code; a
  title-only change should not move any number. If a test pins a title
  string verbatim, update the pin — that is the test doing its job.
- Deep links (`topology=`/`stack=`/`study=` params) are IDs, not titles —
  ids do not change. `results.json`/`topologies.json` regenerate via the
  normal builders after the JSON edits (from the MAIN checkout,
  `--data-root C:\workspace\tolstack\data`, provenance gate rules apply).

## Definition of done

- The rebuilt viewer nav reads as a scannable list of short noun phrases;
  no title contains "as a topology", "(degrees)", "(millimetres)", or a
  built-from/isn't-anymore clause; hover shows the demoted detail.
- Full pytest + fast viewer tier green from the worktree; projections
  rebuilt in the main checkout.
- Lesson: the full before → after title table, and any title where
  shortening lost a genuine distinction (say what the tooltip now carries).
