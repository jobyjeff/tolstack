---
verdict: APPROVE
---

# Review — the_viewer_real_tier_follows_the_slide_re_author

- Each of the six reds root-caused to `b4b641db`; pins/README/fixture updated, red 5 fixed in the topology (pilot node = piston ID datum alone) with the guard untouched. Diff stays in scope; no `apps/annotate/` or witness-registry change.
- Inline fix: the branch had committed `venv-win` as a symlink blob (`0bbfc1db`); removed.
- Verified on projections rebuilt from this tree (`dirty=False`): all six `[real]` reds gone; viewer 634/635, the one miss is `an archetype with no loader...`, which also fails on a clean `integration` checkout (not this handoff) -- filed `ISSUE_20261104_the_no_loader_test_throws_in_the_node_tier_on_integration.md`. Annotate 280/280. pytest: 1721 passed, 3 failed = the worktree viewer-suite red (that no-loader test) + shadow-concurrency lock tests (pre-existing MAX_PATH issue, flaky under load).
- Witness gate: 0 of 729 entries reachable by the diff. Browser TRUTH tier not run (untouched).
- Author's "635/635" predates the no-loader landing on integration; not a defect of the work.
