# LESSONS 2026-11-12 — hover_and_select_light_the_same_things_on_all_four_surfaces_and_nothing_goes_opaque

Handoff: `docs/sessions/active/HANDOFF_20261112_hover_and_select_light_the_same_things_on_all_four_surfaces_and_nothing_goes_opaque.md`.
Written as the work landed; the table, the shots and the suite record are last.

## The rule, as built

- **One resolver**: `VA.focusLightOf(model, entity)` (`apps/viewer/model.js`)
  returns `{own, touching}` lists of entities. Own is the entity and what it
  contains; touching is what meets it. The four surfaces read it through four
  derivations and nothing else: `VA.focusElementKeysOf` (DAG and grid keys,
  containers included), `VA.focusNavRowsOf` (tree rows), `VA.navRevealPaths`
  (the folds a lit row is behind) and `VA.sceneLightOf` (ids for the pane).
- **Two strengths**: `--lead` / `--hot` on the DAG and the grid for the hover,
  `--selected` / `--touched` for the selection; `--hot` / `--hot-touching`
  and `--on` / `--on-touching` in the tree. In the scene the hover's family
  is the pale wash and the selection's the pick orange, each at an own and a
  touching opacity, a face harder than its part (`scene.js`'s `LIGHT_LOOKS`).
- **Everything selects**: body, part and joint rows in the tree
  (`entityRow`, the twisty alone folds), a part's field or block and its
  name on the DAG, a body's field, and a body's or a part's bracket in the
  grid (`wireContainer`; `pointer-events: stroke` on the SVG rects).
- **Select reveals, hover marks**: `setSelected` opens every fold on every lit
  row's path and sets `revealPending`; `revealLitRows` scrolls after the
  paint. `VA.lightNavTree` marks the deepest drawn fold hiding a lit row
  (`--holds`, `--holds-touching`).
- **Nothing goes opaque**: `AA.planActionLooks` keeps an about part at its
  resting look (a faint-resting part comes up to ghost), near ghost, rest
  faint. Solid is reachable only through the See-through control.
- **The same with no sweep**: the page posts one `light <json>` verb
  (`VA.sceneLightCommand`); the pane's `cmdLight` draws it in either mode,
  and `applyLooks` snapshots and restores looks in a scene nothing owns at
  rest.

(The rest of this lesson follows below as the session closes.)
