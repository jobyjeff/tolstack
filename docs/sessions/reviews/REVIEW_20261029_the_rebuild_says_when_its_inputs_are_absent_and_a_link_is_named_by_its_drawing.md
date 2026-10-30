---
type: review
handoff: docs/sessions/active/HANDOFF_20261029_the_rebuild_says_when_its_inputs_are_absent_and_a_link_is_named_by_its_drawing.md
reviewer: agent
date: 2026-10-29
verdict: APPROVE
blockers: 0
---

# Review — inputs_absent stamp + display names

## Verified
- Item 1: `projection_provenance.READ_INPUTS` (six paths, mirrors `.dispatch.toml` `candidate_inputs`),
  `absent_inputs()` ignores tracked READMEs, `stamp(data_root=...)` fills `provenance.inputs_absent`
  in every builder (all stamp call sites pass the data root); `note_lines` warns; the ps1 prints
  `inputs absent: n` in yellow, exit unchanged. Two new tests pin both.
- Item 2: `display_name`/`naming_note` additive on `Part` (topology.py) and on three stack JSONs;
  topology JSON for the link/plate parts; ids untouched; `VA.componentLabel` prefers `display_name`,
  `componentTitle` carries the id. SOP paragraph added. Layout/kinematic/annotator untouched.
- Mutation-witness spec's `find` line updated to the new source line; `--only` witnesses it.
- Lesson lists the inputs and the files touched.

## Tests (worktree, after merge)
- `pytest -q` excluding the viewer-JS suite (cannot run in a worktree by design): 1685 passed, 1 skipped.
- `node apps/viewer/run_tests.cjs`: 507/507, node-fs `[real]` tier skipped (no projections in a worktree).
- Witness `--only` on the component-label guard: WITNESSED.

## Notes (non-blocking)
- Stack `display_name` is data only (stack pages show `title`); disclosed in the lesson.
- `--changed-since --repo C:/workspace/tolstack` reports NOT WITNESSED here because it measures the
  main checkout's skipped tier, not this tree; the `--only` run in this tree is the real signal.
- Browser tier and `[real]` tier remain for the operator's main-checkout batch-merge run.
- The dispatch issue / brief CONSUMED marking are strategy/dispatch's, outside this repo.
