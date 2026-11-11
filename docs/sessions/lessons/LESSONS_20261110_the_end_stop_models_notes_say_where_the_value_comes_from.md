# Lessons — the_end_stop_models_notes_say_where_the_value_comes_from

- All 22 notes in `docs/topologies/topology_vpa_end_stop_v2.json` now read
  `Value to come from <drawing>'s drawing.`; no test pinned any of the old strings.
  Every note named a drawing, so none fell back to `Value to come.`
- Judgement calls: the "New in v2" lead was dropped on all 7 notes that had one, and
  so was the descriptive text after it (ids, handoff slugs, the long
  flange/feather-stop rationale on the 213668-002 edge). Four notes had a
  parenthetical after the drawing number ("whose 76.86 v1 cites ...", "in hand: ...");
  those became `<drawing>'s drawing`. The dropped rationale is in git history
  (`git show HEAD~1:docs/topologies/topology_vpa_end_stop_v2.json`) if wanted back
  somewhere that is not the Preview.
- **Blocked: the projection rebuild.** See
  `docs/issues/ISSUE_20261110_rebuild_projections_cannot_run_from_a_worktree_so_a_handoff_cannot_prove_a_projection_input_change.md`.
  Not worked around; the main checkout's projection is untouched.
- Remaining old-shape notes filed: `docs/issues/ISSUE_20261110_topology_notes_still_say_what_would_close_it_and_open_with_history.md`; the test accepts either wording until then (my earlier commit says it asserts only "Value to come" — superseded; topology tests: 171 passed).
- Viewer unit tier: 554/554 passed, node-fs tier SKIPPED (no projection in the worktree).
- One test pinned the old wording: `tests/test_topology.py` (v2 mount test) asserted
  `"What would close it"` in every edge note; it now asserts `"Value to come"`.
  Found only by the full suite (my first grep missed it because I searched for
  "adds the term").
- Full default tier (serial; `pytest-xdist` is absent from `venv-win`), worktree,
  `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`: 2 failed, 1926
  passed, 1 skipped, 687s (over the 10 min budget, but serial not `-n 16`). The two
  failures: the topology test above (fixed after, passes alone) and
  `test_viewer_js_suite_is_green`, red by design in a worktree (node-fs tier has no
  projection). The browser TRUTH tier and witnesses were not run.
