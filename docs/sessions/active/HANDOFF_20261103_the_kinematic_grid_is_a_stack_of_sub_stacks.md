---
priority: high
depends_on: [each_stop_is_its_own_stack]
model: opus
hitl: false
---

# HANDOFF 2026-11-03 — the_kinematic_grid_is_a_stack_of_sub_stacks: the kinematic study's grid reads like a stack — rows in chain order, sub-stacks that fold, bodies marked, and every tint explained

Source: Jeff's forge note `20261103T165357_43vf96` (2026-11-03), working
through the kinematic stack on the live page: *"There seems to be very little
rhyme or reason to the order of the items in the grid view. Sweeping over the
items in the list, adjacent rows don't seem to always correspond to
adjacent/connected sections of the dag. I also thought I asked for some type
of dividers/contrast between groups/bodies/features etc. in the grid view which
seems totally absent still. All the rows in grid view have randomly different
colors, but they don't seem to correspond to anything. … The whole idea with
unifying the kinematic and non kinematic stacks was that they would still
resolve down to, and could be displayed as, grid view stacks, where the
'sensitivity' column was derived from the 3d kinematic model. … I know they
can't be perfectly 'linear', as there are branches in the topology, or in some
cases two values are compared to each other (for example the distance between
housing end stops is then compared with the linear travel of the mechanism
plus the thickness of the piston end stops), but that just means those three
things should be rolled up into sub-stacks, potentially shown as collapsible
elements in the grid view."* And on 10-29: *"Grid view itself should have
visual indication of sub-stacks, rigid bodies, etc, accomplished with the line
weights/colors of the dividers and/or the background colors."*

**Jeff picked mock-up C (2026-11-03):** *"I like option C, and I think that is
what a kinematic study resolves to. Assuming it fits in a 2d grid like that
such that it is as simple as summing the final column (sensitivity x value for
each contributor)."* `C:\workspace\dispatch\docs\strategy\drafts\mockups\dag_iconography\C_stack_of_substacks.svg`
is the target picture for the grid half; open it first. The sub-stacks are
what `each_stop_is_its_own_stack` emits: per stop, a *linkage terms at this
pose* group and a *stop position* group (the axial chain to that stop's
contact face), plus a total-range result row — not the old single travel
`study_ref` at −7°.

Baseline: `master` with `the_contributor_table_lives_in_the_results_pane_and_groups_are_checkboxes`
(10-29) and **`each_stop_is_its_own_stack` (2026-11-03, this batch — read its
lesson first; its projection shape is what you render)** landed. Scope:
`apps/viewer/views/kinematic.js` (the kinematic results table), the grid
half of `apps/viewer/views/topology.js` (`VA.gridPlan`, the chain-study
rows) **only where the two tables are made one**, `apps/viewer/topology.css`
/ `style.css` for the new marks, `docs/DESIGN_TYPE_AND_COLOUR.md`,
`apps/viewer/tests.js`, the browser checks. Do NOT touch the chart
(`VA.kinematicTravelBands`, `datumNote` — owned this batch by
`each_stop_is_its_own_stack`), the DAG's
glyphs or edge grammar (a later handoff after Jeff picks a mock-up), the pane
(`apps/annotate/`), or the respine/landing code in `topology_app.js` (owned by
`the_dag_holds_still_and_the_filter_bar_stays_put`).

## What the grid does today, measured 2026-11-03

- `renderKinematicResults` (`views/kinematic.js` ~963) emits
  `model.rows` (direct contributors) in **reach order** (largest first), and
  interleaves each `study_ref` group where its reach ranks (~1366–1380);
  group children follow their group. Nothing orders by where a row sits on
  the DAG, so adjacent rows are not adjacent edges.
- Structure marks: none. The only row styles are `kmrow--selected`
  (`topology.css` ~1697) and `kmrow--muted` (~1724). The reddish rows Jeff
  saw are a **sourcing** tint keyed off the row's chip state
  (`unverified`/`untraced` vs `traced` — `style.css` ~44–46 defines the hues;
  find the rule that tints the row and name it in the lesson); nothing on the
  page says so. Jeff read it as random.
- The live study (`data/projections/viewer/kinematic/kinematic_studies.json`,
  `vpa_pitch_linkage_blade_pitch_at_the_stops`): 6 direct contributors
  (`pitch_link_length`, `pitch_arm_radius`, `pitch_plate_attach_height`,
  `tan_link_length`, `tan_link_mount_height`,
  `pitch_plate_tan_link_attach_radius`), one `study_ref`
  `travel_between_end_stops` with 4 children (upper head 6.556 ±0.25, lower
  head 2.491 ±0.05, mount flange-to-end-stop 8.667 ±0.5, cover
  flange-to-end-stop 82.154 ±0.02; coefficient 1.7279 deg/mm at −7°; folded
  ±0.82 mm → ±1.417°), and one declared gap `hub_to_feather_stop`. Each row
  carries `coefficient` (the sensitivity, deg/mm), `magnitude` (deg),
  `confidence`, `source_kind`.
- Chain studies render through `VA.gridPlan` in `views/topology.js`: a
  different table with the same columns and no sensitivity.

## Deliverables

1. **Rows follow the chain.** Order the kinematic grid by **adjacency along
   the lit DAG** — walk the study's lit edges from the measure's one end to
   the other (the stops' chain), emitting each sub-stack where its edge sits
   in that walk, so two adjacent rows are two connected edges. Where the lit
   set branches, the branch is a sub-stack (deliverable 2) placed where it
   leaves the walk. The sort key is in one place and a value-level test pins
   the live study's order. "By reach" becomes a column sort the reader can
   ask for, not the default.
2. **Sub-stacks fold.** Every `study_ref` group and every **compared
   quantity** (Jeff's example: housing end-stop distance vs mechanism travel
   plus piston end-stop thickness) is a sub-stack: a header row with ▸, the
   sub-stack's name, its folded total in its own units **and** what it
   contributes to the measure here (`±0.82 mm → ±1.417° at the −7° stop`),
   collapsed by default when it has more than three children, remembered per
   study (`localStorage`, like the group checkboxes). Its children indent one
   step. The declared gap is a gap sub-stack: dashed left rule, "not yet
   authored", no total. Nested sub-stacks are allowed to one level.
3. **Bodies and sub-stacks are marked.** A sub-stack = a left rule of one
   weight spanning its rows + the header row; a rigid body = a faint
   background tint per body, the **same** tint the DAG's body container
   already uses (`.tv__bodyfield--t*`, `topology.css`), with a hairline divider
   within a body and a heavier one between sub-stacks and between bodies.
   The 10-29 draft's mock-ups may refine the exact grammar; build the marks
   so weights and tints are tokens in one place (`:root`), per
   `docs/DESIGN_TYPE_AND_COLOUR.md`, which gains one paragraph.
4. **Sourcing is said, not only coloured.** The row tint stays, and a legend
   strip under the table names it: traced / inferred / untraced with the chip
   beside each word (reader words from the chip vocabulary). Hovering a
   tinted row's chip says the same thing. No new colour.
5. **Sensitivity is a column.** `SENSITIVITY` (deg/mm, from `coefficient`,
   signed) sits before `CONTRIBUTION` (deg, from `magnitude`); a sub-stack
   header shows the sub-stack's own coefficient; a chain-study row shows
   `1` (its ratio) so the two tables share one column set.
6. **One row component for both tables.** The kinematic grid and the
   chain-study grid are rendered by one row builder with one column set, so
   that a chain study and a kinematic study look like the same kind of
   stack (Jeff: "the two styles are still a fragmented mess that are
   implemented completely different from each other"). The DAG↔grid leaders
   keep working for every row that moved (`VA.leaderGeometry` reads row
   positions; re-measure the seam after the restructure). This is the item
   most likely to need a scope call: if unifying the two tables is more than
   a session, make the kinematic table use the chain grid's row builder and
   file the remainder as a named follow-up with a measured size.

Suggestion to investigate (labelled): the `BRIEF_20261030_topology_layout_questions_the_redesign_left_open.md`
question 6 (the grid cross-fades through a respine instead of moving its
rows) is adjacent; with rows now in chain order, a moving-row transition is
the natural follow-up — do not build it here, size it in the lesson.

## Definition of done

- `http://127.0.0.1:8000/tolstack/viewer/` → Kinematic studies → Blade pitch
  at the end stops: the grid shows the six direct rows in chain order, the
  travel sub-stack folded with `±0.82 mm → ±1.417° at the −7° stop` on its
  header and expanding to its four rows, the gap sub-stack after it, body
  tints matching the DAG containers, the sourcing legend, and a SENSITIVITY
  column. Full-page screenshot at 1600×1000, folded and expanded, in the
  lesson's shots folder.
- A chain study page (e.g. `pitch_link_cotter_hole_clearance`) renders
  through the same row component and still shows every leader.
- `node apps/viewer/run_tests.cjs` green with value-level pins: the live
  study's row order, the folded total text, the body-tint class per row;
  `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`
  green (seam leaders re-measured after the restructure);
  `node scripts/run_mutation_witness_tests.mjs --changed-since integration`
  witnesses the new guards; `venv-win/Scripts/python.exe -m pytest -q` green.
- Lesson (`docs/sessions/lessons/LESSONS_20261103_the_kinematic_grid_is_a_stack_of_sub_stacks.md`):
  the ordering rule in one paragraph; the rule that tinted rows before and
  what it is now; how far deliverable 6 got and the measured size of what is
  left; the brief question 6 sizing.
