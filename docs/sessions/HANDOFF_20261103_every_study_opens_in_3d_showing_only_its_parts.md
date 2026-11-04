---
priority: med
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-11-03 — every_study_opens_in_3d_showing_only_its_parts: the 3D pane is there for every study, and the scene shows the parts the study includes

Source: Jeff's forge note `20261102T143335_4pcrwl` (2026-11-02): *"Make 3d view
visible for all studies, filter view to just included components."*

Baseline: `master` with `the_3d_pane_opens_in_the_mode_the_study_wants`
(10-20), `the_annotator_has_no_front_door` (10-30: `?pane=1` opens the pane;
`isolate` is re-derived from the selection, not carried in the URL),
`the_contributor_table_lives_in_the_results_pane_and_groups_are_checkboxes`
(10-29: the Unused dim/hide word reaches the scene through `syncSceneModel`).
Scope: `apps/viewer/topology_app.js` (`openWantedPane` ~446, `followSelection`,
the pane's open/close state), `apps/viewer/views/nav.js` (the 3D control on
study rows), the `annotate:exec` commands the viewer sends, and the smallest
pane-side change in `apps/annotate/` that filters the scene to a part set
(`isolate`/ghost rules in `scene.js`), tests and browser checks. Do NOT touch
the rail's rows and candidate lists (`a_joint_end_lists_its_candidate_faces_and_says_why_each_is_there`
owns them), the grid, the chart, or the respine/landing code.

## Measure first (the handoff does not assume the gap's shape)

Record in the lesson, on the real projection at
`http://127.0.0.1:8000/tolstack/viewer/`:

1. For each study kind — a kinematic study, a chain study with bound faces
   (`pitch_link_cotter_hole_clearance`), a chain study with none, the
   topology row — whether the 3D pane *can* open (the row's 3D control, the
   seam tab, `?pane=1`), which mode it opens in, and **what the scene shows**:
   every installed part, or the study's parts, and which parts are solid vs
   ghost. The 10-20 lesson says chain studies select in the nav with the pane
   open in bind mode; Jeff's note says the 3D view is not visible for all
   studies — find where those disagree (a hidden control, a pane that opens
   empty, a scene that draws the whole assembly).
2. How the pane decides what to draw today: the `isolate`/`trace` words the
   front-door lesson says are "re-derived from the selection", and whether a
   chain study's selection derives anything.

## Deliverables

1. **Every study row offers 3D.** Kinematic, chain and the topology row each
   carry the same 3D control, and the pane opens for each in the mode the
   10-20 rule gives it (sweep for a kinematic study, bind otherwise). A study
   none of whose parts has an installed mesh still opens the pane, which
   says so in its head line (reader words: "no 3D model for these parts
   yet") instead of hiding the control.
2. **The scene shows the study's parts.** On open and on every selection
   change, the scene draws **solid** exactly the parts the study's lit set
   names (its edges' ends' parts, the bodies they belong to), **ghosts** the
   rest of the installed assembly at the ordinary ghost opacity, and frames
   the solid set. The Unused control's hide word hides the ghosts entirely
   (one rule, already plumbed via `syncSceneModel`). An armed pick's isolate
   (`ARMED_GHOST_OPACITY`, 10-29) still wins while armed.
3. **The filter is one command.** The viewer sends one `annotate:exec`
   command naming the part set (suggestion: `isolate parts <id…>` /
   `isolate off`), the pane applies it; nothing is derived twice. The
   command is in the pane's verb table and documented in
   `docs/ANNOTATION_SURFACE.md` in one line.
4. **Switching studies keeps the pane open** and re-filters; closing it is
   the reader's act only.

## Definition of done

- On `pitch_link_cotter_hole_clearance` the pane opens from the row, draws
  the pitch link and its mates solid and the hub/blade ghosted, framed;
  switching to Blade pitch at the end stops re-filters to the linkage's
  parts in sweep mode; the topology row draws everything solid. Three
  screenshots in the lesson. A study with no installed meshes shows the
  "no 3D model" head line.
- `node apps/viewer/run_tests.cjs`, `node apps/annotate/run_tests.cjs`,
  `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`
  (a check per study kind asserting the solid/ghost part sets),
  `node scripts/run_mutation_witness_tests.mjs --changed-since integration`
  green; `venv-win/Scripts/python.exe -m pytest -q` green.
- Route and resolve `ISSUE_20261030_the_preview_offers_no_way_to_see_a_part_on_its_own_in_3d.md`
  if deliverable 2's filter covers it (a contributor row's part set is a
  one-part filter); otherwise say why not.
- Lesson (`docs/sessions/lessons/LESSONS_20261103_every_study_opens_in_3d_showing_only_its_parts.md`):
  the measure-first table; the one command's grammar; what the click-around
  found.
