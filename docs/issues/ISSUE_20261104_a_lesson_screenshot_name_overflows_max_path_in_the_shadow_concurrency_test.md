---
type: bug
priority: low
status: open
area: tests / mutation-witness shadow
reporter: agent
class: unbounded_path_length
found_by: docs/sessions/reviews/REVIEW_20261103_coaxial_ends_share_one_3d_node.md
---

# A lesson screenshot's name overflows MAX_PATH in the shadow-concurrency test

`tests/test_mutation_witness_shadow_concurrency.py::test_two_different_repo_roots_both_still_succeed`
copies the tree into pytest's temp directory. On 2026-11-04 the copy failed:
`shutil.Error ... [WinError 3] The system cannot find the path specified`. It
failed on two files that `4c0b7c62` (`every_study_opens_in_3d_showing_only_its_parts`,
already on `integration`) put at the top of `docs/sessions/lessons/`:

- `LESSONS_20261103_every_study_opens_in_3d_showing_only_its_parts_5_switch_back_to_the_kinematic_study_pane_already_open.png`
- `LESSONS_20261103_every_study_opens_in_3d_showing_only_its_parts_6_switch_to_the_cotter_hole_study_pane_already_open.png`

The destination path came to **263 characters**:
`...\pytest-of-jeff.cortes\pytest-12590\test_two_different_repo_roots_0\second_repo\docs\sessions\lessons\<name>`.
That is over Windows' 260 limit. The same test passed in a full run earlier
the same day, so whether it fails depends on the length of pytest's run
counter.

The shots also break the lessons convention, which puts screenshots under
`docs/sessions/lessons/shots/<slug>/`. Moving the two files there shortens
the path. A guard on the longest tracked path would keep this from coming
back.
