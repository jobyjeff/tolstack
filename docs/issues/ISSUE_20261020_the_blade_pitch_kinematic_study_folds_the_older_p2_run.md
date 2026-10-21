---
type: chore
priority: low
status: triaged
area: topology/kinematic
reporter: agent
found_by: docs/sessions/HANDOFF_20261020_the_viewer_shows_a_kinematic_study.md
handoff: docs/sessions/HANDOFF_20261021_the_kinematic_study_checks_its_run_its_units_and_shows_its_limit.md
---

# The blade-pitch kinematic study folds the older P2 run, not the one that names its features

`docs/topologies/kinematic_study_vpa_pitch_linkage_blade_pitch_at_the_stops.json`
names `sweep.run_id: vpa-pitch-p2-20261015-013931`. The newest P2 run is
`vpa-pitch-p2-20261016-235852` (linkage's republish), and it is the first P2
run that carries `geometry.features[]` -- so the study's authored feature joins
(`feature.node` / `feature.body` per contributor) would be **checked against
the artifact** by `tolerance_stack.kinematic._reconcile_feature`, instead of
standing on the author's reading alone. The live projection today says
`sweep.features_in_artifact: false`, and the viewer's provenance fold says
"feature named by the study's author" for exactly that reason.

It also means the viewer's two kinematic entry points disagree about which
run they mean: the study page folds 1015, while a **Kinematic model** row (and
`VA.annotateLink({ sweep })`) would open the newest run, 1016-235852. On real
data no model row renders today -- `vpa_pitch_linkage` has a study -- so the
disagreement is not on screen, but the pane handoff
(`HANDOFF_20261020_the_3d_pane_opens_in_the_mode_the_study_wants`) posts
`sweep <study run>` for a study and `sweep <newest>` for a model row.

What would close it: re-point the study at the 1016 run, rebuild, and re-pin
`tests/test_kinematic.py`'s `REAL` table and `REAL_RUN` (the numbers may move
in the third decimal; the handoff that staged the viewer page quoted 1016 while
pinning 1015's margins, 0.256 / 0.258). Out of the viewer handoff's scope,
which forbade any topology/study JSON edit.
