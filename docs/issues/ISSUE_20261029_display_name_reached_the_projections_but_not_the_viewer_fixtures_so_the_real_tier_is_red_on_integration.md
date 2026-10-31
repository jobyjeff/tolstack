---
type: bug
priority: high
status: triaged
area: viewer/fixtures
reporter: agent
found_by: docs/sessions/HANDOFF_20261029_a_face_is_picked_the_way_cad_picks_it.md
class: fixture_drift
handoff: docs/sessions/HANDOFF_20261030_display_name_reaches_the_viewer_fixtures_and_fixture_drift_is_caught_without_a_projection.md
---

# `display_name` reached the projections but not the viewer fixtures, so the `[real]` tier is red on integration

`the_rebuild_says_when_its_inputs_are_absent_and_a_link_is_named_by_its_drawing`
added `display_name` and `naming_note` to three stack files and to
`topology_vpa_pitch_linkage.json`. It did not touch `apps/viewer/fixtures.js`
or `apps/viewer/topology_fixtures.js`. That handoff's review recorded
`node apps/viewer/run_tests.cjs` as 507/507 *with the node-fs `[real]` tier
skipped*, so nothing armed caught it.

Measured at the `a_face_is_picked_the_way_cad_picks_it` review. The merged
tree's projections were built into a scratch root
(`data/scratch/review_face_pick`), with every projection paired to this tree,
and then `node apps/viewer/run_tests.cjs --repo <scratch>` gave **622/625**:

- `[real] every fixture shape still matches the builder's`: "the projection
  writes [display_name, naming_note] and apps/viewer/fixtures.js does not"
- `[real] the topology fixture's shapes still match the builder's`: same, for
  `topologies[].parts[]`; "REGENERATE it (its header says how)"
- `[real] every merged component cell on every live topology is its part's own
  NAME`: `vpa_pitch_linkage/group 16`: `"Pitch plate 215735-001/-002" !==
  "215177-001 pitch plate"`

None of the three reads a file the face-pick diff touches. The next batch
merge's armed viewer tier will be red on them.

Fix: regenerate `topology_fixtures.js` and add the two fields to
`fixtures.js`, per the failure messages. Then decide whether the merged-cell
check's expectation or the renderer should take `display_name`.
