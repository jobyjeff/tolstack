---
type: chore
priority: low
status: open
area: topology/kinematic
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261020_the_viewer_shows_a_kinematic_study.md
---

# The blade-pitch kinematic study's title carries a genre suffix the viewer now renders

`docs/topologies/kinematic_study_vpa_pitch_linkage_blade_pitch_at_the_stops.json`
has `"title": "Blade pitch at the end stops, kinematic"`.

`REVIEW_20261016_a_kinematic_study_folds_the_sweeps_jacobian.md` recorded this
as nit N1 ("a genre statement", SOP "Titling an artifact") and did not file
it, because nothing rendered the title then. Since
`the_viewer_shows_a_kinematic_study`, the title is both the nav row's label
(under a heading that already says **Kinematic studies**) and the page's `h2`.

**Suggested fix:** retitle to `Blade pitch at the end stops`. Keep the `id`,
because it is a deep link (`topology.html?kinematic=<id>`). The handoff that
found this was fenced off the study JSON, so it could not make the change.
Check `tests/test_title_style.py` and any fast-tier fixture or browser check
that quotes the title before you edit it.
