---
priority: high
depends_on: [the_walk_reads_the_portrait_map_and_the_joints_on_the_merged_page]
model: opus
hitl: false
---

# HANDOFF 2026-11-17 — the_map_is_the_only_drawing_and_classic_retires: the DAG region draws the map for every model, and the rails drawing and its suites go

Source: Jeff, 2026-11-17: "I really like the new subway map style dag/graph,
let's go ahead and make it permanent." That is the yes decision 82 waited for
(the map was built beside the present DAG with a Map · Classic switch, Classic
to retire on his word). Baseline: `integration` with the five earlier links of
this chain merged; the map is portrait and the model's joints say their kinds.
Last of a chain of six. Read first:
`docs/sessions/lessons/LESSONS_20261115_the_map_draws_the_end_stop_model.md`
("Decisions not in the handoff" — what Classic still does for the map) and
`docs/issues/ISSUE_20261116_what_the_map_does_not_draw_yet.md`.

Scope: `apps/viewer/` (the region, the switch, the rails drawing and what only
it used), `scripts/build_topology_projection.py` (the map loader),
`scripts/run_viewer_browser_tests.mjs` and `apps/viewer/tests.js` (the
suites), `scripts/mutation_witnesses/` (specs of guards that go),
`docs/DAG_TOPOLOGY.md`, `ARCHITECTURE.md`, `apps/viewer/README.md`,
`CLAUDE.md`'s one sentence about the block-with-pins drawing. Do NOT touch the
model files, `tolerance_stack/`, the grid's rows, `apps/annotate/`, or the two
things fenced below.

**Fenced out, by name** (they are the next batch, written after Jeff reads the
review page): a fold control on an assembly's outline, and a study lit as a
route.

**Jeff's real binding log is read-only**
(`C:\workspace\tolstack\data\inbox\feature-identity\`): count its files
before and after.

## What is measured (2026-11-17, `master`)

- `VA.dagDrawingFor` draws Classic for a model with no `map_<id>.json`. Only
  v2 has one; v1 (`vpa_pitch_linkage`: 35 parts, 79 nodes, 99 edges) and the
  fixtures' other mechanisms do not.
- `renderTopoPane` builds the walk, the rails SVG and the grid, then hands the
  region to the map; on a map paint the rails SVG is built and thrown away.
- The browser runner's `newPage` wrapper seeds **Classic** for every suite, so
  the 43 suites in `scripts/run_viewer_browser_tests.mjs` run against the
  rails unless they are the map's own; `tv__rails` appears 143 times across
  the runner and `apps/viewer/tests.js`.

## Deliverables

1. **Every model draws a map.** A model with no layout file gets its places
   computed: bodies in authored order, each body a column, its top-level parts
   stacked in tree order (a model that declares no bodies is one column). An
   authored `map_<id>.json` overrides the computed places and nothing else
   changes. `load_topology_map` no longer makes the file a condition of the
   map. v1 gets **no** hand layout in this handoff: the requirement for it is
   that it draws, the counts drawn equal the model's, no two boxes overlap,
   and the page stays responsive — say in the lesson how many routes cross a
   box they do not end on (the layout's defect notes) and show it at 3840
   Side by side. The fixtures' mechanisms go through the same path.
2. **Classic goes.** The Map · Classic switch and its stored key,
   `VA.dagDrawingFor`, the rails drawing, the respine animation, the seam
   leaders, `fitDagTo`, and every control in the view bar that only acted on
   the rails (on `master` the bar reads: Rows, Rows: labelled, Lengths, Fit,
   Leaders, the three-way view control, Collapse assemblies, Expand all,
   Groups). For each control say in the lesson: kept because the map or the
   grid uses it, re-pointed at the map, or removed. Fit and the `0` key stay
   and fit the map. No dead control is left on the bar, and no module is left
   that nothing loads (`ARCHITECTURE.md`'s inventory is paired against the
   tree).
3. **The grid does not change.** It takes its row order from the walk the
   rails also used; that order now comes from the model's tree order without
   the rails. Before you start, record the grid's rows (text, in order) for v1
   and v2 from `master`; after, the lists are identical. Hover and selection
   between the grid, the tree, the 3D pane and the map behave as on `master`
   with Map selected.
4. **The suites are rewritten once.** Remove the Classic seed from the
   runner. For each suite that read the rails: if what it checks is still
   true of the page (selection, hover lighting, fit, resize, the fixed
   layout, the pane), re-point it at the map's elements; if what it checks no
   longer exists (rails geometry, respine, leaders), delete it with its
   witness spec and lower the pinned guard count in the same change. The
   lesson carries the table: suite, kept / re-pointed / deleted, why. Nothing
   is skipped or marked expected-red.
5. **Docs.** `docs/DAG_TOPOLOGY.md`: the sections that describe the rails
   drawing ("A part with many interfaces is a block with pins", "Joint
   glyphs" where it speaks of rails) are rewritten for the map or removed;
   "The map" becomes the description of the DAG region. `CLAUDE.md`,
   `ARCHITECTURE.md`, `apps/viewer/README.md` follow. Close
   `ISSUE_20261114_the_dag_still_lays_out_for_a_grid_beside_it_that_has_its_own_region_now`
   and update the rows of `ISSUE_20261116_what_the_map_does_not_draw_yet`
   (Classic's retirement and "a layout for v1" done; the fold and the study
   route still open).
6. **Add a section to Jeff's review page**,
   `docs/sessions/lessons/REVIEW_20261117_the_portrait_map_and_the_joints.md`:
   "After Classic retired" — v2 and v1 at 3840 Side by side and DAG view, the
   view bar before and after, a table of what was removed, each with a shot
   read with vision. If that page does not exist, write the section as
   `REVIEW_20261117_after_classic_retired.md` beside where it would be.

## Definition of done

- On the merged page there is one drawing in the DAG region for every model
  in the picker, no switch, no dead control; v2 looks as the walk left it.
- The exploratory click-around on the real projection for v2 **and** v1
  (`CLAUDE.md`): every kind of thing on the map, the grid, the tree and the
  pane, wheel, drag, Fit, resize.
- Tests per `CLAUDE.md`'s table; because this handoff changes most browser
  suites, run the whole browser tier once in the main checkout before handing
  back and cite its ledger row.
- Lesson (`docs/sessions/lessons/LESSONS_20261117_the_map_is_the_only_drawing_and_classic_retires.md`):
  the suite table, the control table, lines removed, v1's defect-note count,
  the grid row lists' identity, the suite times before and after, the
  feature-identity file count before and after.
