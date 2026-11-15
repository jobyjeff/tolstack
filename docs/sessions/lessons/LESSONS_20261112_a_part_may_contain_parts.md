# LESSONS 2026-11-14 — a_part_may_contain_parts

Handoff: `docs/sessions/active/HANDOFF_20261112_a_part_may_contain_parts.md`.
A part may name a `parent` part; v2's two link assemblies hold their bearings;
the tree nests them, the grid folds an assembly to one row, the DAG draws what
it drew.

## Every place that assumed two levels, and what it does now

| Site | Before | Now |
|---|---|---|
| `topology.Part` / `Topology` | `Body.parts` flat, no `Part.parent` | `parent` is checked: declared, same body, no cycle; a self-parent is refused in `Part`. `children_of` / `subtree` / `tree_order` give the one order: an assembly, then each child's subtree. The authored `bodies[].parts` still lists every part. |
| `model_view.py` (`parts`, `bodies`) | a body's parts as authored | each part carries `parent` / `children` / `depth`; a body's `parts` = its top-level parts, `all_parts` = every part in tree order; `counts.assemblies` |
| `build_topology_projection.project_study` | — | `result.assemblies`: `{part: {edges, units, …interval}}`, one `fold()` per assembly over its subtree's chain terms (`topology.assembly_rollups`) |
| `model.js` `buildModel` | `body.parts` read as every part | `childrenOf` / `subtreeOf` / `allPartsOf` / `parentOf` / `isAssembly`; `unbodiedParts` skips a child |
| `VA.focusLightOf` | part → its own features | an assembly's own tier holds every part inside it and the joints between them; touching = what leaves the subtree; a body's touching set is read over `allPartsOf` |
| `VA.navRowPath` | part → `b:`/`bp:` | plus each ancestor's `p:` key, outermost first |
| `views/nav.js` `partItem` / `bodyItem` | part → features | an assembly opens to its parts (recursive, one level in), then its own features. Count `N part(s) · M features`. The visibility box covers the subtree (mixed when it is partly hidden). A body counts and boxes `allPartsOf`. |
| `topology_app.js` `onNavVisibility` | `body.parts` / `[id]` | `allPartsOf` / `subtreeOf` |
| DAG: `VA.partPins`, `VA.partSpans` | raw `nodes[].parts`, `edges[].part` | read through `VA.topPartOf`: a child is drawn as its top-level assembly |
| `VA.bodyOfPart`, `gatherParts`, `blockLayout`, `collapseBodies` | authored `bodies[].parts` | unchanged; the authored list still names every part |
| Grid: `VA.gridPlan` | one row per edge | with `collapsed` (4th arg), a folded assembly's rows become one `{rollup: {part, edges}}` row at its first row. Later runs fold into that row, at the outermost folded assembly. A kinematic stack folds nothing. |
| Grid: `VA.gridBraces` / `braceGeometry` / `partCells` | — | a part bracket carries `depth` (indented `GRID_BRACE.nest` = 10 px a level) and `assembly: open/closed`; the caret is a button in the brace layer, or inline in the cell when part brackets are off |
| Toolbar | — | **Collapse assemblies** / **Expand all**, only on a model that has an assembly; the fold set is stored as `tolstack.viewer.collapsedAssemblies` per topology |
| 3D pane sweep rail (`apps/annotate`) | flat | **unchanged**; filed (`ISSUE_20261114_assembly_folding_left_out_of_three_surfaces.md`) |

## The numbers (DoD)

- **Model v2 has no total to compare.** It is studyless and no edge carries a
  value, so on v2 the grid's numeric columns and its foot are empty both
  ways. Folded, the two links read `212956-005 pitch anti-rotation link | 1
  dimension` and `213862-002 pitch link | 1 dimension`. The bearings have no
  edges, so each fold stands for the link's own length. The fold survives a
  reload; Expand all restores the 30 rows.
- **A real study, folded.** The scratch projection was built from a copy of v1
  with 214820-002 and NAS77A3-015A nested in the plate (the committed v1 is
  untouched). `pitch_link_cotter_hole_clearance`, open: the totals are worst case
  3.1662 (2.3296 … 4.3098, ± 0.9901 mm) and RSS 3.3197 (2.830945 … 3.808455,
  ± 0.488755). Folded: one row `215177-001 Pitch plate | 3 dimensions |
  -10.3948 | -10.4948 | -10.0378 | ± 0.2285 mm`. The foot is byte-for-byte the
  same text. The same numbers are pinned in pytest
  (`test_an_assemblys_roll_up_is_the_fold_of_its_subtrees_terms`).
- **DAG before / after / folded:** `before_dag.png`, `after_dag.png` and
  `after_dag_collapsed.png` share sha256 `e0feb3ca…`. They are byte-identical,
  so nothing here moved the DAG.

## Decisions not in the handoff

- **A roll-up includes the assembly's own dimensions**, not only its children's.
  The folded row replaces all of them, and that is the only way the total stays
  the same.
- **The folded row prints the totals row's columns** (centre, worst-case min / max,
  ± half). It does not sum the members' transcribed nominal/min/max, which would
  not be meaningful. On the whole walk nothing is totalled, so the folded row
  prints no numbers either.
- **A collapsed assembly whose rows are not contiguous** is one row at its first
  run. Later rows fold into it, and their leaders bind to the next kept row, as a
  filtered row's do. In expanded walk order a child's row can come before its
  assembly's own row (the demo's plain bushing sits above the plate).
- **Tree order**: an open assembly lists its parts before its own features.
- **The tree's folds and the grid's folds are separate.** The toolbar shortcuts
  fold the grid only.

## What the map handoff must draw for a nested part

Filed as `ISSUE_20261114_the_dag_draws_no_nested_outline_for_a_part_inside_an_assembly.md`
(no map handoff is staged): a nested outline per child inside the assembly's
block, a + / − on the group sharing the grid's fold store, and the
assembly-to-child pin, which is internal when folded.

## Decomposing 215177 and 215175, sized

`ISSUE_20261114_decompose_215177_and_215175_into_their_bushings.md`: the long pole
is separate bushing solids from the export. After that it is about one handoff
for the re-key: new mesh sha, orphaned bindings rebound by Accept (at least the
plate's pilot-boss face of the 11 standing bindings), new parts with `parent`,
alias rows, and count pins.

## Gotchas

- The fast tier's DOM shim matches only `tag`, `.class` and `tag.class`, so
  query a button by id with a filter.
- Writing a JS string containing `\n` through a Python heredoc put a real
  newline into `views/topology.js` (a syntax error in the tier). Check
  escapes after a scripted edit.
- `.tvbraces` is `pointer-events: none` and its children are positioned
  absolutely through their own class (`.tvbrace`, `.tvbrace__label`). A new
  child needs `position: absolute` too, or it stacks at the layer's corner.
  The first real-page shot showed exactly that, and the fast tier could not.
- Five witness anchors rotted with this change: two browser specs and three
  fast ones, on the part cell, the part-bracket loop and the body visibility box.
  `test_every_anchor_resolves_to_exactly_one_place` names only the first. A
  short script over every spec's `find` lists them all at once.
