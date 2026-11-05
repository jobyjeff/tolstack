# Lessons — the_no_loader_warning_speaks_to_the_reader (2026-11-04)

## Final sentence
`This stack has checks, generated from its "<archetype>" block; this page cannot show them yet. It is built in the tolerance-stack repository, not from this page.`
(`apps/viewer/views/stack.js`, the `checks_generated_not_rendered` arm; second sentence is `VA.PROJECTION_BUILT_ELSEWHERE`.)

## Test
The existing test "an archetype with no loader says so instead of 'no checks'" (`apps/viewer/tests.js`) already
rendered the arm over a synthetic projection; it asserted the old words (`ARCHETYPE_LOADERS`). It now asserts the new
sentence, runs the render through `surfaceIsClean` with the schema field names, and asserts no constant, script name
or `NO LOADER` is printed.

## Mutation check
Swapped the new tail for the old instruction ("Add the archetype loader to ARCHETYPE_LOADERS in
scripts\build_viewer_projection.py and rebuild."): the test went red (`FAIL an archetype with no loader ...`, tripped on
the missing built-elsewhere sentence; the explicit absence assertions also cover the old words). Restored afterwards.
Gotcha: I restored with `git checkout`, which also reverted the real edit; re-applied by hand. Use a backup copy instead.

## Sibling arms
`views/stack.js` lines ~1059 and ~1093 ("Lower bound only — zero-width inputs") carry no repo vocabulary. None other noticed.

## Verification
`C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q` in the worktree: 3 failed, 1721 passed, 1 skipped, 8m29s.
- `test_viewer_js_suite` red: expected in a worktree (no `data/projections`; node-fs tier skipped). `node apps/viewer/run_tests.cjs`: 516/517, the 1 is that tier.
- Two `test_mutation_witness_shadow_concurrency.py` lock tests failed (both concurrent runs refused, not one); unrelated to this diff, likely machine contention with other agents' browser slot. Not re-verified on trunk.
Not run: browser TRUTH tier, witness `--changed-since` (main-checkout tiers; handoff did not touch them).
