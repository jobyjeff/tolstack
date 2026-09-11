# LESSONS 2026-09-09 — topology_projection_emits_study_checks

## What changed

`project_study()` (`scripts/build_topology_projection.py`) now calls
`check_study(topology, study, spec["check_id"])` for every entry in
`study.checks` and merges the `CheckResult` into a new `"checks"` list on the
study's projected row -- `None` when the study errors (mirroring `"result"`/
`"layout"`), `[]` when a study authors no checks, otherwise one dict per
check in `project_stack`'s check shape (`CheckResult.as_dict()` + rounded
interval + `generated`/`input_confidence`/`worst_confidence`/
`workbook_cells`).

A study check has no `terms` list to walk (unlike a stack check) -- the whole
chain `traverse()` already built *is* the term list -- so `input_confidence`
is counted off `Contribution.dimension` for every edge in the chain, not off
a term spec. `generated` is unconditionally `False`: there is no topology
equivalent of the `thermal_fit` archetype that synthesizes checks, so every
study check is authored.

**Reused, not re-listed:** the confidence vocabulary and its rank order
(`count_confidence`/`worst_confidence`) are imported from
`build_viewer_projection` rather than copied. That module already carries a
`RuntimeError` guard that refuses to import if `CONFIDENCE_ORDER` and
`tolerance_stack.stack.CONFIDENCES` disagree -- a second copy here would be
exactly the vocabulary-drift failure mode `docs/prompts/REVIEW_AGENT.md`
tracks. This is the one place `build_topology_projection.py`'s docstring
claim ("stdlib only, plus tolerance_stack") is now slightly stale, same as it
already was for its `projection_provenance` import.

Also updated `main()`'s console summary line to append
`, {check_id}={verdict}` per study check, since the handoff's definition of
done asked for the rebuild's printed output to visibly reflect the new
checks. No test pins that string; it's operator-facing only.

## A worktree trap the handoff's own DoD wording runs into

`.\scripts\rebuild_projections.ps1` (run from the main checkout) always
invokes **the main checkout's own copy** of `build_topology_projection.py` --
it resolves the script path off `$RepoRoot`, which defaults to its own
parent directory. Since this session's changes live only on
`handoff/topology_projection_emits_study_checks` in a worktree, running the
`.ps1` from `C:\workspace\tolstack` exercises master's *old* code and will
not show the new checks line, no matter how correct the worktree's code is.

The DoD item is still satisfiable, just not with the wrapper alone: run the
`.ps1` from the main checkout to prove the three-step pipeline still
succeeds end-to-end (provenance gate, all three builders, stamps), then
separately spot-check the new behavior by invoking *this worktree's* script
directly against the shared data root:

```
"C:\workspace\tolstack\venv-win\Scripts\python.exe" scripts\build_topology_projection.py --data-root C:\workspace\tolstack\data --allow-older-tree
```

run with cwd inside the worktree (so the relative script path resolves to
the worktree's file, not the main checkout's). `--allow-older-tree` is
needed here only because the main checkout's own unmodified rebuild had just
re-stamped the shared projection with a newer `built_at`; a reviewer running
this after merging into `integration` won't need the flag. Confirmed output:
`vpa_output_shank_out ... worst_case_shank_out=fail` -- matches the acid
test's `computed.verdict == published.verdict` (both `fail`; the L1 stack's
own published check is also `fail`, so this is not a regression, just the
number the archetype has always agreed on).

Next session doing a similar "prove the shared build script picks up my
change" DoD item should expect this same wrinkle and route around it the
same way, rather than concluding the rebuild script is broken.

## Left for later

Rendering a study's `checks` in `apps/viewer/topology.html` is explicitly
out of scope for this handoff (per the handoff file) and is left for
whichever handoff next builds topology-mode check display -- plausibly
`viewer_v2_single_nav`, if that candidate is still live when picked up.
