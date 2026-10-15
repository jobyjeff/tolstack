# Lessons — mutation_runner_survives_a_missing_interpreter_and_shadows_what_guards_read (2026-10-15)

## What changed

- `runTier()` has a `child.on("error")` that resolves the same shape `close` does
  (`code: null`, the spawn error as `out`, `spawnError` set), guarded by a `settled`
  flag. A spawn failure is now `MISS.UNSPAWNABLE` ("the tier's process could not be
  started"), not a throw. Repro `--repo <dir with no venv-win>` now finishes, prints
  the summary and the verdict, and exits 1. The up-front "no interpreter" note was
  already there; the entries are named per entry when they are reached, which was
  enough, so I did not add a second up-front list.
- `SHADOWED` gained `README.md`, `CLAUDE.md`, `ARCHITECTURE.md`, `PROVENANCE.md`,
  `docs/DAG_TOPOLOGY.md`, `docs/SOP_TOLERANCE_STACK.md`, `docs/prompts`,
  `docs/sessions` and the single file `data/inbox/specs/README.md`. New
  `SHADOW_EMPTY_DIRS` makes `docs/issues` and `docs/reference` as empty directories.
- The guard `test_one_part_and_feature_states_one_nominal_...` is enrolled
  (`python__test-one-part-and-feature-states-one-nominal-in-every-to__31a8b9ea.json`,
  both mutations from the issue, both WITNESSED).

## What the issue did not predict (the handoff said "add these paths")

Adding the documents the issue listed was not enough; the module was still red
twice:

1. `test_the_claim_corpus_exempts_dated_history_on_purpose` also needs
   `docs/issues/`, `docs/reference/` to be *directories* and `PROVENANCE.md` to be a
   file. Empty directories satisfy it (the leak check is `startswith`, vacuous on an
   empty dir). Copying `docs/issues` was rejected: 2 MB, and its long filenames
   already broke `test_two_different_repo_roots_both_still_succeed` under a pytest
   tmp_path (MAX_PATH).
2. `test_the_coverage_sets_...` asserts the claim corpus is `GIT_TRACKED`, and the
   shadow cannot be: it is not a repository, and **must not become one** —
   `projection_freshness.cjs` runs `rev-parse --absolute-git-dir` from the tree root,
   so a nested `.git` would make the freshness check read the shadow's empty history
   and take every `fast` witness with it. So the assertion now also accepts a walk when
   the tree is a copy inside another work tree
   (`_is_a_copy_inside_another_work_tree`: toplevel exists and is not the root).
   With no git at all it still fails. Edits outside the handoff's listed scope
   (`tests/test_tolerance_stack.py`, `tests/test_mutation_witness_shadow_concurrency.py`,
   the `PROVENANCE.md` row, one existing spec's anchor) were forced by this.

The existing spec `python__test-the-mutation-shadow-covers-every-input-...fecc0838`
anchored on the exact `SHADOWED` closing line; re-pointed to the shorter
`["tests"], ["tolerance_stack"], [".gitignore"],`.

## The `data/inbox/specs/README.md` decision

Copied into the shadow (one tracked file). The guard reads
`<repo root>/data/inbox/specs/README.md`, and the repo root is wherever the test file
sits. **Rejected:** reading it through the `--repo` data root — the test would need a
second root channel (env/argv) that the real suite never has, for one file; the copy
keeps the guard reading exactly what it reads in a checkout. The rest of `data/` stays
unshadowed.

## Cost

Measured by copying the list with `fs.cpSync`: before 12 MB / ~2.3 s, after 35 MB /
~3.0 s (`docs/sessions` is 24 MB of it). The shadow is built once per run, so the
cost is paid once, not per entry. Clean run of `test_tolerance_stack.py` +
`test_topology.py` in the shadow: **312 passed**.

## Other spawned runners

- `scripts/guard_enumeration.mjs` uses `spawnSync` and checks `proc.error` — not the
  same defect.
- `projection_freshness.cjs` uses `execFileSync` inside a try that returns null.
- `ISSUE_20260930_the_pairings_spawned_runner_reports_a_crash_as_a_parse_divergence`
  is **still live**: `guard_enumeration.mjs::runTier` never reads `proc.status` or
  stderr, so a child that started and threw is parsed as a divergence. Untouched here
  (already filed, `deferred`).
