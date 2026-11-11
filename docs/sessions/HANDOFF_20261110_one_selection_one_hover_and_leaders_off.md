---
priority: high
depends_on: [the_sweep_rails_part_rows_carry_their_kind_and_the_bodies_call_is_pinned]   # both edit apps/annotate/app.js and sweep.js; that one lands first so this is the only handoff in the viewer and pane files while it runs
model: fable
hitl: false
---

# HANDOFF 2026-11-10 — one_selection_one_hover_and_leaders_off: the four surfaces light from one state, leaders default to Off, and a feature row in the left column is its own disclosure

Source: the foundation pass in
`dispatch/docs/strategy/drafts/DRAFT_tolerance_analysis_over_the_kinematic_model.md`
(step F1b, written 2026-11-09 and staged on Jeff's yes to F1a's merged page),
and Jeff's forge note `20261110T113000_ftbibd` (2026-11-10) after looking at
that page: "Newest is merged … Looks like the left side structure menu was at
least partially updated. One nit: The features inside of a part aren't shown
as collapsible elements, and then when you click them a second collapsible
element appears underneath it with the same title. It's jarring because there
is nothing suggesting that the first element is collapsible, and then the
whole menu jumps when you click it. Also the display/ui is different depending
on whether there are suggested faces, for example blade 1 root bearing bore
just says 'no face bound' and has a 'pick' button when you hover over it,
whereas 'locating boss' which has suggestions has an extra 'pick another face'
option below the list of suggestions, redundant with the 'pick' hover button."
Baseline: `master` at or after `46ed0380` (F1a
`the_model_is_derived_once_and_the_left_column_is_its_tree` and
`the_gas_spring_mount_sits_on_the_tan_link_mount_in_the_end_stop_model`
merged). Scope: `apps/viewer/` (`topology_app.js`, `views/nav.js`,
`views/topology.js` for lighting only, `model.js`, `topology.css`),
`apps/annotate/app.js` and `sweep.js` for the pane's feature rows and its
selection messages, the browser and witness specs those touch,
`apps/viewer/README.md`. Do NOT change the DAG's layout, routing or
iconography, the grid's rows or columns, the page's scroll model or pane
sizes (the next handoff, the fixed layout, owns those), the model files under
`docs/topologies/`, or `tolerance_stack/`.

## What is true today (read 2026-11-10, line numbers at `46ed0380`)

- F1a shipped `topologies[].model` (derived once in
  `tolerance_stack/model_view.py`), `apps/viewer/model.js` as its only browser
  reader, and `views/nav.js` rebuilt as the model's tree. On the end-stop
  model v2: 5 bodies, 15 parts, 34 features, 22 dimensions, 17 interfaces,
  15 joints.
- **Hover is three mechanisms and selection has five writers.** Two of the
  hover mechanisms are cleared by a full repaint
  (`topology_app.js:1181-1183`, `:1935-1937`, `views/topology.js:2055`). The
  3D pane is an iframe with its own state; the left column's faces layer is a
  mirror of the pane's rail subtree, not an API per feature
  (F1a's lesson, lines 81-92).
- **The left column's feature row.** `featureRow`, `views/nav.js:192-212`,
  puts `leafGap()` where a twisty would go (`:199`), so the row reads as a
  leaf. A click (`:205` → `onNavFeature`, `topology_app.js:879-888`) sets
  `state.selectedFeature` and repaints; `featureItem` (`nav.js:217-224`) then
  appends `div.navtree__scene`, which `renderSceneSlot`
  (`topology_app.js:1974-1993`) fills through `VA.renderSceneTree`
  (`nav.js:694-701`) from `VA.sceneRowsForFeature` (`nav.js:653-668`). The
  first row drawn there is the pane's own row for the same feature
  (`sceneItem`, `nav.js:736-842`, name from `apps/annotate/app.js:3331`,
  `:3374`) with its own twisty (`nav.js:760-778`): the second element with the
  same title. The jump also carries the marks legend (`nav.js:698`) and
  `revealSceneRow` scrolling the column (`topology_app.js:1999-2007`).
- **Two layouts by whether suggestions exist** (pane side, `featureRow`,
  `apps/annotate/app.js:3304-3318`). None: `if (!rows.length) return li;`
  (`:3309`), no twisty, the line `no face bound` (`:3336`; word at
  `sweep.js:2186`), and a Pick button (`:3430-3456`) mirrored into the column
  and shown on hover (`app.js:6200-6202`; `sceneControls` / `sceneButton`,
  `nav.js:847-885`; `.navtree__sceneacts`, `topology.css:436-441`). Some: a
  twisty (`:3311`) and `candidateList` (`:3569-3601`) ending in "Pick another
  face…" (`:3595`; word at `sweep.js:1967`), which runs the same
  `["arm", edge, direction]` (`:3314`) as the Pick button (`:3442`). A third
  layout: an open proposal shows Accept and "Pick a different face" on the
  selected row only (`:3402-3428`).
- Leaders (DAG↔grid and DAG↔3D) are always built and re-measured on scroll.

## Deliverables

1. **One selection and one hover, owned in one place.** One state object for
   what is selected and what is hovered, in terms of the model's entities
   (body, part, feature, dimension, interface, joint). The tree, the 3D
   scene, the DAG and the grid each light from it and each can set it; it
   survives a full repaint; the pane receives it by message and answers by
   message, with no second copy of "what is selected" on either side that can
   disagree. Lighting only: no DAG node moves, no grid row is added.
2. **Leaders gain Off, and Off is the default.** The toolbar's Leaders
   control covers both DAG↔grid and DAG↔3D. With it off no leader is built
   and nothing re-measures on scroll; highlight is what links the surfaces.
   Turned on, they draw as they do today.
3. **A feature row is its own disclosure** (Jeff's nit). The row carries a
   twisty and is open when it is the selected feature. Its body is the
   feature's state line, its candidate faces and its action, drawn directly
   under it; the pane's duplicate head row for the same feature is not drawn,
   the marks legend is not repeated per row, and opening a row does not
   scroll the column.
4. **One way to pick, in every state.** The same row layout whether a
   feature has no suggestion, some suggestions or an open proposal: state
   line, then the candidates if any, then one pick action in one place with
   one wording. Choose one of the two existing affordances (the hover Pick
   button, or a last row in the body) and remove the other everywhere; say
   which in the lesson. Accept stays on an open proposal.
5. **`apps/viewer/README.md`** describes the left column as it is now (F1a's
   review found it still describes the old nav).

## Tests, and what this session runs

- The nit touches browser checks at
  `scripts/run_viewer_browser_tests.mjs:9562-9566`, `:9682-9686`,
  `:10049-10053` and at least three witness specs whose `expect_red` names
  "Pick another face". Re-anchor each on the behaviour it guards; retire one
  only if the thing it guards is gone, and list it.
- **This session runs:** the default pytest tier once; the two fast node
  tiers (`node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`,
  `node apps/annotate/run_tests.cjs`); the browser runner with `--only` for
  each suite it added or changed; the witness runner with `--only` for each
  spec it added or changed. **It does not run the whole browser tier or the
  witness `--changed-since` gate**: those are the review's, once, after the
  merge (`dispatch/dispatch/prompts/_SUITE_BUDGET.md:12-16`; each is about 30
  minutes and they queue on one machine-wide browser slot, which is where
  F1a's 69 minutes of suite time went).

## Definition of done

- On the end-stop model v2, served from the main checkout with projections
  rebuilt: click one entity in each of the four surfaces in turn (a feature
  in the tree, a face in 3D, a node in the DAG, a row in the grid) and the
  other three light, before and after a repaint (resize the window). Shots of
  each of the four at 3840×2160 and one at 5120×2160, leaders off; one shot
  with leaders on.
- `locating boss` (has suggestions) and `blade 1 root bearing bore` (has
  none), both under `214373-002 propeller hub`: each opens in place with a
  twisty, shows one title, the same layout and one pick action. Before and
  after shots of both.
- **Look at every shot yourself with vision before writing the lesson**, and
  look at the page once more after your branch is rebased on `integration`:
  Jeff's standing complaint is that nobody looks at the merged page.
- Lesson
  (`docs/sessions/lessons/LESSONS_20261110_one_selection_one_hover_and_leaders_off.md`):
  the state object as shipped; every writer of selection and hover that
  remains and why; which pick affordance stayed; witness specs added,
  re-anchored, retired; the suite seconds you spent, per tier.
