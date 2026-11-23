# Lessons — an_export_citation_picks_up_a_new_drawing_checker_run_in_one_command

## The command

    venv-win/Scripts/python.exe scripts/sync_export_runs.py          # writes
    venv-win/Scripts/python.exe scripts/sync_export_runs.py --check  # reports only

It pairs every established export in the guard's citing documents with
`runs.jsonl` (the guard's own `consuming_runs` / `resolve`, imported, so the two
cannot drift) and splices the missing `{run_id, ts}` entries into the `runs`
array as text. `ts` comes from the run's `run_meta.json`, falling back to the
log row (with a stderr note). Entries already listed are never touched, so a
second run is a no-op; no other byte of the JSON moves.

## What a reviewer should expect when the next run lands

- `pytest -q` goes red on `test_every_established_export_lists_exactly_...`; its
  message now names this command. Run it **in the main checkout** (the log is
  read-only there; from a worktree the default `--log` still points at
  drawing-checker, so it works anywhere), commit the JSON diff: a few `+` lines
  per citing export, nothing else.
- Prose notes beside a `runs` list that count runs ("Five runs consumed this
  export") are **not** rewritten — the script touches `runs` only. This session
  annotated the two such notes by hand; the next run's author should expect to
  do the same or leave them as a dated statement.
- An *extra* run (listed, not in the log) is reported on stderr, exit 1, and
  left alone: removal is a judgement.

## Decisions not in the handoff

- Layout assumption: the `runs` array directly follows `sha256` in the block.
  The script refuses (rather than guesses) if an established export has another
  layout.
- Left the guard's logic alone; only its failure message changed.

## Test record

`venv-win/Scripts/python.exe -X utf8 -m pytest -q` in the worktree, default tier:
7 failed / 2584 passed / 1 skipped / 4 deselected, 886 s (over the 10 min budget;
the box was shared). Of the 7: three `test_architecture_inventory` were mine (the
script imported a test module; fixed by moving the pairing helpers into the script,
and the row's wording) and now pass; three `test_browser_runner` passed when re-run
alone (load flake); `test_viewer_js_suite` is the documented worktree-only red
(no projection in a worktree). The guard itself is green in this worktree because the
log is read from drawing-checker's path. Node tiers not run (docs/JSON/Python only).
