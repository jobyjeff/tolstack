---
type: bug
priority: med
status: open
area: tests/browser annotate scene
reporter: agent
found_by: docs/sessions/HANDOFF_20261122_v2_reads_the_pitch_plate_the_pitch_arm_and_the_tangential_link_sheets.md
---

# The scene suite gets no anchors message once v2 takes ten values

The browser suite `annotate model in the scene (anchors, lines, the sweep, the
anchors message)` in `scripts/run_viewer_browser_tests.mjs` stops after 9 checks:

    page errors: page.evaluate: TypeError: Cannot read properties of undefined (reading 'nodes')
      at inPane (scripts/run_viewer_browser_tests.mjs:6624)
      at testAnnotateModelInTheScene (scripts/run_viewer_browser_tests.mjs:6789)

`w.__lastAnchors` is never set, so `postModelAnchors` in `apps/annotate/app.js`
never got past its guards (`model.built`, `state.scene.modelScreenPoints()`).
The shell's `__anchorMessages` list stays empty.

## Where it is red and where it is not

Every run used one copied data set: the inbox, meshes and feature identity of
`data/scratch/v2_sheets` (main checkout). Each root's viewer, topology, crops,
kinematic and contact projections were rebuilt from the tree named, and that
tree's code served the pages:

| tree (code and projections) | result |
|---|---|
| `76447229` (review of the_blade_pitch_study_folds_on_v2_and_names_what_v2_adds) | **22/22** |
| `integration` at `5be884d5` | 9, then the throw |
| merged `review/v2_reads_the_pitch_plate…` (`bd7b2395` on integration) | 9, then the throw, both in the whole tier and alone |
| main checkout (trunk code, trunk projections) | 22/22 |

`git diff --stat 76447229 integration -- apps scripts tolerance_stack docs/topologies`
lists only `topology_vpa_end_stop_v2.json` and two v2 study files, all from
`73ef0aee` (handoff `v2_carries_the_ten_citations_v1_already_has_and_its_own_stop_stacks`).
That review ran no browser tier (its report: "browser tier and witness gate not
run"). So the red arrived with v2's first valued edges, and trunk will carry it
at the next batch merge.

## Lead

The suite drives v2. It is likely that some anchor, line or lit-set step now
throws or returns null for a valued v2 edge, so the layer never builds or never
posts. The next step is to read the pane's console during the suite on an
integration-built root.
To rebuild a baseline: `git archive <sha> | tar -x` under `data/scratch/`, add a
`node_modules` junction, copy in a scratch root's `data/`, and run the five
builders from the export with `--data-root … --allow-older-tree`. Then run the
suite with `--repo <export> --only "annotate model in the scene"`. Each run took
about 10 minutes. The two roots used here were removed.
