---
priority: high
depends_on: [a_binding_shows_the_moment_it_is_made_and_is_corrected_where_it_is_shown]
model: fable
hitl: false
---

# HANDOFF 2026-11-12 — hover_and_select_light_the_same_things_on_all_four_surfaces_and_nothing_goes_opaque: one rule says what an entity lights, in two strengths, down its hierarchy

Source: Jeff's forge note `20261112T114449_f3anmp` (2026-11-12), "Glow/hilight":
"Seems to still be some inconsistency/split brain with the hilight view state.
Let's get rid of any selection hilighting that switches the body to be fully
opaque… the goal is for all four display regions (left side menu, 3d canvas, 2d
dag, grid view) to have elements that correspond to each other, and to have all
of them light up simultaneously when you hover or select any of them, and for it
to be hierarchical (so selecting a group selects/hilights all of it's children).
I think this means when you select a part, all of it's bound surfaces should
also be hilighted (even more prominently than the entire part which is already
hilighted). Same for rigid bodies." Strategy record:
`dispatch/docs/strategy/HANDOFF_20261112_strategy.md`.

Baseline: `integration` after
`a_binding_shows_the_moment_it_is_made_and_is_corrected_where_it_is_shown`
(which gives each feature its own part and marks bound faces from the record).
`one_selection_one_hover_and_leaders_off` (F1b) and
`the_pane_follows_the_one_selection_both_ways` are both in; read their lessons
first. Line numbers below were read on `master` before the pane handoff reached
it; the function names are the anchors. Scope: `apps/viewer/` (`model.js`,
`topology_app.js`, `views/nav.js`, `views/topology.js`, styles),
`apps/annotate/` (`commands.js`, `app.js`, `scene.js`), docs, tests. Do NOT
change the DAG's or the grid's layout, the page's scroll model (the fixed layout
is the next handoff), how a binding is keyed, or the model files.

## What the page does today (read on master, 2026-11-12)

H = hover, S = select. A bold cell is missing or wrong.

| entity | left tree | 3D | DAG | grid |
|---|---|---|---|---|
| rigid body | H own row only; **S impossible** | H, **only with a sweep loaded**; **S none** | H parts + joints; **S none** | H **over-lit**; **S none** |
| part | H **own row only**; **S impossible** | H full-part glow, **sweep only**; **S none** | H nodes + dims; **S none** | H **over-lit**; **S none** |
| feature | H row + twin; S opens its part; **gap interface not lit** | H **first edge end only, sweep only**; S **parts go solid** | H; S | H; **S no row marked** |
| bound face | only inside an open feature body | H wash + **part solid** | not drawn | not drawn |
| interface (node) | **H none**; S, **no auto-open** | as feature | as feature | as feature |
| interface (gap) | **H none**; S | H tint + **both parts solid**; S | H; **S bar only** | H; S |
| joint | **H none; S none** | **nothing posted** | H; **S none** | H; **S none** |
| dimension | H/S its two end features | H tint + **parts solid** | H/S | H/S |

Causes, each with its anchor:

- **Solid.** One writer: `scene.setLook` (`apps/annotate/scene.js:771-787`;
  looks at `:81` — solid 1, ghost 0.22, faint 0.07), fed by `applyLooks`
  (`app.js:447`) from `AA.planActionLooks` (`commands.js:534`), which makes
  every "about" part **solid**, its "near" parts ghost and the rest faint. What
  becomes an action: a face or candidate row hovered (`hoverFace` →
  `washAction`, `app.js:3226`); any edge hovered on the grid, the DAG or a 3D
  joint dot (`cmdHighlight`, `app.js:839/857`); a feature selected with a sweep
  loaded (`cmdInspect` → `focusDim`, `app.js:4040/4067`); an armed pick
  (`sweep.armed.shas`, `app.js:2913-2917`); and, outside sweep mode, `isolate`
  → `setGhost(false)` on arrival (`app.js:551`, from `:709`, `:1037`) and
  `cmdOpenPart` (`:295`).
- **The grid's random rows.** `focusElementKeysOf(part)` (`apps/viewer/model.js:274-277`)
  returns a node key for every feature of the part plus an edge key for each of
  its dimensions; a grid row leads on its own edge key **and on both its end
  nodes** (`views/topology.js:3835-3843`); and `lightKeys` also lights every
  entry on each key's rail (`:2187-2190`). So a part hover lights every edge of
  any part that touches any node of the part, plus whole legs.
  `model.dimensionsOf(part)` already is "this part's rows"; the distinction is
  flattened before it reaches the grid.
- **The counterpart that is not revealed.** Hover never opens a fold
  (`lightNavTree` toggles a class on rows already drawn, `nav.js:183-199`); on
  select only part rows auto-open (`holdsSelection`, `nav.js:335-344`);
  interface, joint and group rows default closed (`:276`, `:308`, `:428`).
  `focusNavRowsOf(feature)` does not light a feature's gap interfaces at all
  (`model.js:319-321`). Interface and joint rows have no hover handler
  (`nav.js:274-329`) and `wirePageHover` skips the tree (`topology_app.js:2318`).
- **Selection is one exact element.** `state.selection`
  (`topology_app.js:688`), matched exactly by `isSelected`
  (`views/topology.js:3848`); a body, a part or a joint cannot be selected. The
  DAG keeps its own `hot.on`, which wins over the page's hover
  (`views/topology.js:2211, 2225`).
- Open issues on the same ground, read them first and close the ones this rule
  covers: `ISSUE_20261110_a_body_or_part_hovered_in_the_tree_lights_the_scene_in_sweep_mode_only`,
  `ISSUE_20261111_the_pane_keeps_two_selections_of_its_own_beside_the_pages_one`,
  `ISSUE_20261112_escape_does_not_let_go_of_the_selection_while_any_mirrored_control_reads_pressed`,
  `ISSUE_20261112_the_page_re_asserts_its_end_row_into_the_pane_so_a_pane_side_deselect_is_swallowed`.

## The rule (decided by the strategy session from Jeff's note; build exactly this)

1. **One resolver.** `model.js` answers, for any entity — body, part, feature,
   bound face, interface, joint, dimension — the set it lights, in two tiers:
   - **own**: the entity and everything it contains. A body contains its parts;
     a part its features and dimensions; a feature its bound face(s); a joint
     its interfaces; an interface its two end features.
   - **touching**: what meets it without belonging to it — for a part, the
     interfaces to its neighbours and their rows; for a feature, the interface
     it is an end of and the feature on the other side.
   Hover and select call the same resolver. Nothing else decides what lights.
2. **Two strengths, one colour family.** Own is the present highlight;
   touching is visibly fainter (Jeff: "a less pronounced color for
   interfaces"). Every surface draws both from the resolver's tiers. A part or
   body hover lights no whole rail leg.
3. **Everything can be selected.** Body, part and joint rows in the tree, a
   body's or a part's container in the DAG and its bracket in the grid, select
   that entity. Interface and joint rows hover.
4. **Select reveals; hover marks where.** On select, every fold on the path to
   every lit row opens — interfaces, joints and groups, not only parts — and the
   first lit row not on screen scrolls into view. Hover opens nothing; a closed
   fold that holds a lit row shows a small mark so the counterpart's place is
   seen without drilling down.
5. **Nothing goes opaque.** In the 3D pane a hover or a selection leaves the
   parts it is about at their resting look and takes everything else to faint;
   the face, or the feature's bound faces, are overlaid. An armed pick follows
   the same rule. Solid is reachable only by Jeff's own See-through control.
   (Jeff: "we always want to have some opacity"; "leave the opacity of the
   focused part the same, and make all the other parts less opaque".)
6. **A part or a body lights its bound faces harder than itself.** Selecting or
   hovering a part glows the whole part (the glow Jeff likes) and overlays each
   of its bound faces more strongly; a body does the same over all its parts.
7. **The same with no sweep loaded.** Body, part, feature and joint hover and
   select reach the 3D pane in bind mode as in sweep mode; a feature posts all
   its own ends, not its first.

## Definition of done

- **The table above, every cell answered.** On the end-stop model (v2), merged
  page, for each of the eight entity rows: hover it and select it from each
  surface that draws it, and record what the other three show. The lesson
  carries the table re-filled from the page, not from the code; a cell that is
  deliberately empty says why (a bound face has no element of its own on the
  DAG or the grid — it lights its feature there).
- Shots at 3840×2160 and 5120×2160, each one looked at, in
  `docs/sessions/lessons/shots/<slug>/`: a part hovered from the tree (own rows
  strong, interface rows faint, no other row lit — count the lit rows and state
  the number against `model.dimensionsOf`); a part selected (bound faces
  stronger than the part); a body selected; `locating boss pilot bore` selected
  from the Parts section with its interface row opened and on screen; an
  interface hovered; a joint hovered; a gap edge hovered from the grid with no
  part solid. In every 3D shot, name the opacity of each lit part read from the
  scene, and none is 1.
- The exploratory click-around the repo requires, with a filmstrip of one
  hover-to-select transition.
- Tests: value-level tests of the resolver (own and touching sets for one body,
  one part, one shared-node feature, one gap interface, one joint on v2, pinned
  by id); the default `pytest -q` once; the two fast node tiers; the browser
  runner with `--only` for each suite added or changed; the witness runner with
  `--only` for each spec added or changed.
- Lesson (`docs/sessions/lessons/LESSONS_20261112_hover_and_select_light_the_same_things_on_all_four_surfaces_and_nothing_goes_opaque.md`):
  the re-filled table; which stores and message dedupes are gone and which
  remain, by name; how many witness specs were re-anchored, retired and added;
  what the fixed-layout handoff must know about the reveal-and-scroll behaviour.
