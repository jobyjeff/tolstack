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

## Decisions not in the handoff

- **What "touching" is, per kind.** The handoff gave two examples (a part:
  the interfaces to its neighbours and their rows; a feature: the interface
  it is an end of and the feature across). I completed the table so every
  kind has one answer, and the resolver's comment carries it: a body touches
  the joints to other bodies, their interfaces and far features; a feature
  also touches the dimensions that end at it (otherwise a hovered node lit
  nothing in the grid, which has no node rows); a dimension touches the
  interfaces at its two ends; an interface its joint and the dimensions
  arriving at its features; a joint the two parts it joins. A joint belongs
  to the touching tier of a part and a feature because its row is the fold
  the interface rows sit under.
- **Neighbour parts go faint, not ghost, on a part hover.** Rule 5 says
  everything the hover is not about goes faint, and a part's touching tier
  is interfaces, not parts; so the mount is faint while the hub is hovered.
  A joint hover is the one hover whose touching tier holds parts, and there
  the two parts ghost. The 3D "near" (ghost) tier therefore exists for a
  joint hover and an armed pick.
- **Where a touching feature is revealed.** Under the lit interface it is an
  end of (the fold `i:<interface>`), never by opening the part across the
  joint: a part selected opens its own features and the interfaces to its
  neighbours, with the far feature as that interface's end row. An interface
  or a joint selected reveals its own ends under itself, where the reader is
  looking; a part's or a body's own features under their parts
  (`VA.navRevealPaths` takes the entity for that one distinction).
- **The scroll on select is minimal and never costs the own row.** The
  selected entity's own row first, then the lit rows in column order: the
  first one off screen is brought in with the smallest scroll, and if that
  takes the own row off screen the scroll is undone. A click on a row already
  on screen whose lit rows are all on screen moves nothing (Jeff, 2026-11-05
  and 2026-11-10, on the column yanking).
- **A rail is no element.** Hovering a rail lights nothing and the whole
  rail-leg glow is gone with it; the handoff decided it for parts and
  bodies, and the one lighter cannot keep a leg for edges without a second
  rule. Filed `ISSUE_20261112_the_rail_leg_glow_left_with_the_two_tier_light.md`
  (strategy) in case tracing a leg is wanted back as a third thing hover
  says.
- **Seam leaders light from the own tier only.** The DAG-to-3D leaders are a
  node's; lighting them for the touching tier fanned leaders out from the far
  ends of a hovered dimension's gaps, which the seam suite caught.
- **The selected edge still posts `highlight` while a run is loaded**, beside
  `light select`. Kept so the kinematic page's selected-edge behaviour and
  the pane's own rail tint are unchanged; filed as a duplication,
  `ISSUE_20261112_a_selected_edge_reaches_the_pane_twice_as_highlight_and_as_light.md`.
- **A grid bracket is lit, never a control.** The handoff named "its bracket
  in the grid" as a selector. With the label clickable, a row click on its
  PART cell selected the part (the seam suite's row-click check found it);
  with the caps clickable, a cap lying across a row's bottom edge took the
  pointer from the row's cell (the kinematic suite's sensitivity hover found
  it). So a bracket wears the two tiers and nothing else; on the DAG the
  container border and the part's NAME are the part's controls, in the
  container's own margin where no mark sits.
- **A part that arrives takes its look at once** (`onPartLoaded` runs
  `applyLooks`). A mesh joined the scene solid and stayed so until the next
  sweep frame; in a paused sweep that was for as long as the pause, and the
  3D-pane suite read an opaque part under a hover. In scope under rule 5.
- **The `hover part|body|feature` verbs stay in the pane** for its own rail
  rows; the page no longer posts them. `hover face` is still posted from a
  feature body's bound line, and that line's hover is now the feature's hover
  too (the one hover lights the feature on every surface while the face is
  washed).

## Stores and message dedupes, by name

Gone from the page (`apps/viewer/topology_app.js`): `paneHoverPosted` and
`paneHoverCommand` (the `hover part|body|feature` post), `endOfFeature`,
`endAtNode` and `sceneSubjects` (what that post needed), `revealNavRow` and
the feature-id form of `revealPending`. Gone from the DAG
(`apps/viewer/views/topology.js`): the pane's own lighting in `setHot`
(it tells the page; a bare render with no page lights locally), and
`VA.lightTopoKeys`'s "the pane's pointer wins" refusal. Gone from the pane:
`sweep.washAction` (now `state.washAction`, both modes).

Remaining dedupes on the page: `paneLightPosted` (the `light` word last
posted; reset on `annotate:tree` and `annotate:state`), `paneHighlightPosted`
(the selected edge's `highlight`), `sceneSelectPosted`, `sceneModelPosted`,
`sceneVisibilityPosted`, `sceneFilterPosted`, `partScopePosted`,
`panePosePosted`, `paneFollowed`, `seamScrolledTo`, `sceneTreeSelected`,
`sceneInspectHeld`, `hoverSource`, `paneHoverTimer` (the one hover debounce)
and `revealPending` (now a flag: one reveal-and-scroll per selection change).
Remaining stores in the pane: `state.light` (the page's light, parsed),
`state.washAction`, `state.lookRestore` (looks before an action in a scene
nothing owns at rest), `sweep.inspect` and `model.selected` (the 2026-11-11
lesson's two), `sweep.focus`, `sweep.highlightAction`.

## For the fixed-layout handoff: the reveal and the scroll

- `setSelected` opens folds by writing `state.navOpen[key] = true` for every
  key in `VA.navRevealPaths(model, light, entity)`; the reader's later fold
  of any of them wins again (the same `navOpen`).
- The scroll is `revealLitRows`, run from `renderNav` after the paint that
  opened the folds, once per selection change (`revealPending`). It reads
  `#navtree`'s own box and `scrollTop`, so a column that becomes a fixed,
  independently scrolling pane needs nothing new; a column that scrolls with
  the document would need the document's scroll instead. It never scrolls the
  page.
- A selection made in the column, the DAG, the grid or the scene is one
  path; the 2026-11-10 "never on a click in the column itself" rule became
  "never at the cost of the own row leaving the screen", which is what the
  yank was.
- `VA.lightNavTree` marks closed folds (`--holds`, `--holds-touching`) by
  `data-nav-fold`, which every fold row carries (body, group, part, joint,
  interface). A layout that collapses groups differently only has to keep
  that attribute.

## The table, re-filled from the page

End-stop model v2, the P2 sweep loaded from the Studies row (and the same walk
with no sweep, `--bind`), read off the page by
`tests/debug_light_on_four_surfaces_20261112.mjs` at 3840×2160 and 5120×2160
(the probe prints every surface beside each shot; the numbers below are its).
H = hover, S = select. "own / touching" are the two tiers. The scene column
names the looks read off the scene: every drawn part's opacity was 0.22
(ghost) or 0.07 (faint) in every shot; **none was 1**.

| entity (how) | left tree | 3D | DAG | grid |
|---|---|---|---|---|
| body `base` (S from tree) | own: the body, its 4 parts, their 15 features, the 3 joints inside it and their interfaces; touching: the 5 joints to other bodies, their interfaces, the far features (26 rows strong, 10 faint); every fold on the way opened | select layer: 4 part glows + 4 bound faces, a touching layer of 2 faces; its 4 parts ghost 0.22 (+2 neighbours' ghost through the touching faces), 9 faint 0.07 | the body field and its 4 part containers accented; 11 dots and 12 bars accented, 3 dots touched | 12 rows selected (the base parts' dimensions and the pilot gap), 3 touched (the gaps to other bodies); the body's and its parts' brackets accented |
| part `hub` (H from tree; also H from its grid bracket) | own: hub row + 4 features strong; touching: the 4 interfaces to the blade root and the mount, their joint, the 3 far features faint; closed folds marked (`Interfaces` group, `blade 1 root bearing bore`) | hover layer: 1 part glow + 3 bound faces (face 0.6 over part 0.22); hub ghost 0.22, every other part faint 0.07 | 4 dots and 3 bars strong, the pilot gap's dot and bar faint, the hub's container strong; no rail leg | **3 rows strong = `model.dimensionsOf("hub")` (3)**, 1 faint (the pilot gap); the hub's bracket lit |
| part `hub` (S from tree; also from its DAG name) | 5 rows accented, 9 faint-accented (interfaces, joint, far features), the folds down to them opened | select layer: 1 glow + 3 faces (0.55 over 0.18); hub ghost, rest faint | container, 4 dots and 3 bars accented; the pilot dot and bar touched | 3 rows selected, the pilot gap row touched; the bracket accented |
| feature `locating boss` (S from Parts) | its row accented and open to `bound · face 144`; touching: the hub-mount joint, the pilot interface, the pilot bore across it — the Interfaces group, the joint and the interface opened, the interface row on screen | select layer: 1 face (face 144 on the hub), hub ghost, rest faint | its dot accented, the pilot bore's dot touched | 4 rows touched: its 3 dimensions and the pilot gap; no row of its own (a node has none) |
| bound face (H on the body's line) | its feature's row lit (the one hover) | the face washed in the pre-selection yellow, its part at rest | its feature's dot | its feature's dimensions faint |
| interface `tangential link mount base face` (H from tree) | own: its row and its 2 end rows strong; touching: the hub-mount joint faint | hover layer: 1 face (the hub side's binding); hub ghost, rest faint | its dot strong; the 3 dimensions arriving at it faint bars | 0 own rows (a node has none), 3 faint: `hub_spindle_to_tan_link_mount_face`, `tan_link_mount_height`, `tan_link_mount_overall_height` |
| interface `locating boss in pilot bore` (gap; H from grid) | its row and its 2 ends strong; the joint faint | hover layer: 1 face; hub ghost, rest faint; **no part solid** | its bar and 2 end dots strong; 4 bars faint | its row strong, 4 faint (the dimensions at its two ends) |
| joint `hub and mount` (H from tree) | own: the joint, its 3 interfaces and their 6 end rows strong; touching: the hub and the mount rows faint | hover layer: 2 faces; hub and mount ghost, rest faint | 4 dots and the pilot gap's bar strong; the hub's and the mount's containers faint | the pilot gap's row strong |
| dimension (H/S from grid) | its two end features' rows | the ends' bound faces overlaid | its bar and two dots | its row (selected: the accent; the interfaces at its ends touched) |

Deliberately empty cells: a bound face has no element of its own on the DAG or
the grid (it lights its feature there); a joint has no mark of its own on the
DAG and no row in the grid (its interfaces are its marks and rows); a node
interface has no grid row (the dimensions arriving at it are its rows, as
touching). The DAG's part NAME and a part's or body's container border are the
controls on that surface; a grid bracket is lit only (see Decisions).

Bind mode (`--bind`): every row of the table reads the same -- the light's
layers, the looks and the lit rows are identical with no sweep loaded.

## Shots (`docs/sessions/lessons/shots/hover_and_select_light_the_same_things_on_all_four_surfaces_and_nothing_goes_opaque/`)

`sweep_<nn>_<what>_3840.png` and `_5120.png`, `bind_<nn>_<what>_bind_3840.png`,
taken by the probe above; each one looked at before this was written. The
3D pane in every shot is the narrow strip under the sweep bar the 2026-11-12
pane lesson filed (`ISSUE_20261112_at_3840_the_3d_pane_is_a_narrow_strip_under_the_sweep_bar.md`);
the looks are read off the scene, not the pixels. `hover_to_select_filmstrip.png`
is the hub hovered in the tree then clicked, eight frames 150 ms of page
time apart, with its probe JSON beside it.

(Witness counts and the suite record follow as the session closes.)
