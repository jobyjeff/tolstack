<!-- The sweep's own record, one JSON line per run, appended to
     C:\workspace\tolstack\data\witness_sweeps.jsonl. The dispatch job card reads the
     LAST row's `summary` and `ts`, so these field names are a contract:
     {"ts": <ISO-8601 UTC>, "sha": <trunk sha>, "declared": <entries>, "witnessed": <entries>,
      "seconds": <wall time>, "issue": <repo-relative path or null>,
      "summary": "<one line, e.g. '312/312 witnessed in 71 min'>"} -->

# Witness sweep — the whole mutation-witness registry, unattended

You are a **job** agent, launched by dispatch on a schedule, in the **main
checkout** `C:\workspace\tolstack`. No one is watching. Your whole job is to run
every mutation witness against trunk and say, in one issue or one log row,
whether any of them stopped biting.

Why this is a schedule and not a merge gate: the whole registry takes hours under
the machine's one browser slot, a decayed witness is a test-quality defect with no
product exposure, and a landing runs only the entries its diff could have reached
(`--changed-since`, `CLAUDE.md`). What a diff cannot reach is yours — for example
the 2026-10-20 layout shift that left a spec blind while the spec's own file was
untouched. Do not fix a decayed witness; **report it**.

## Rules

- **Never generate synthetic load**, and never run a second browser command beside
  the runner: it takes the machine's one browser slot itself and waits its turn.
- Interpreter: `venv-win/Scripts/python.exe` (forward slashes, no `&`).
- Spell commands as written below; do not env-prefix them.
- Never edit a spec, an app file or a test. The only files you write are the issue,
  the JSONL row, and nothing else.

## Steps

1. **Preamble — refuse a checkout that is not ready.** Run
   `git -C C:/workspace/tolstack branch --show-current` and
   `git -C C:/workspace/tolstack status --porcelain=v1 --untracked-files=all`.
   If the branch is not `master`, or the status prints anything, **stop**: write
   one JSONL row (step 7) with `witnessed: 0`, `issue: null` and a summary that
   says which (`"skipped: checkout on <branch>"` / `"skipped: checkout dirty"`),
   and report it. Do not stash, reset or clean — the dirt is someone's work.
2. `git -C C:/workspace/tolstack pull --ff-only`. If it refuses, stop as in step 1
   (`"skipped: pull --ff-only refused"`). Note the trunk sha:
   `git -C C:/workspace/tolstack rev-parse HEAD`. Note the start time.
3. `powershell -ExecutionPolicy Bypass -File scripts/rebuild_projections.ps1`
   — **before** the runner, never after (`CLAUDE.md`, Environment).
4. `node scripts/run_mutation_witness_tests.mjs --full` (cwd `C:\workspace\tolstack`).
   Keep the whole output. The last lines are the verdict: `<n>/<N> declared
   mutations witnessed` and the enrollment census. Take `declared` and `witnessed`
   from that line. Exit non-zero means at least one decayed.
5. `venv-win/Scripts/python.exe -m pytest -q -m sweep` — the runner's own lock
   tests, which the default tier leaves out. A failure here is a decay too: put its
   `FAILED` lines in the issue (step 6) beside the runner's.
6. **On any `NOT WITNESSED`, `ANCHOR ROTTED` or `UNENROLLED` line, or a failed
   step 5, file ONE issue.**
   - Name: `docs/issues/ISSUE_<YYYYMMDD>_witness_sweep_<n>_entries_decayed.md`
     (`<n>` = the number of lines above; today's date).
   - **First look for an existing one:** `git grep -l "class: decayed_witness" HEAD
     -- docs/issues/`; if a hit has `status: open` or `status: triaged`, **append** a
     `## <YYYY-MM-DD> sweep` section to it instead of creating a second.
   - Otherwise write it with exactly this frontmatter, then a one-line `#` title:

     > ```
     > ---
     > type: bug
     > priority: med
     > status: open
     > area: tests/mutation-witness
     > class: decayed_witness
     > reporter: agent
     > found_by: docs/sessions/HANDOFF_20261026_the_full_registry_leaves_the_merge_gate.md
     > ---
     > ```

     Body: the verdict lines **verbatim** (every `NOT WITNESSED`, `ANCHOR ROTTED`,
     `UNENROLLED` line with its reason), the trunk sha, the wall time, and for each
     entry the line to re-check it —
     `node scripts/run_mutation_witness_tests.mjs --only <id>` (from a worktree add
     `--repo C:/workspace/tolstack`).
   - Run `C:/workspace/dispatch/.venv/Scripts/python.exe -m dispatch.cli check-issue <path>`
     and fix the file until it passes.
   - Commit on `master` (`sweep: <n> decayed witnesses at <short sha>`) and
     `git push`. If the push is refused, leave the commit local — the dispatch
     server commits board moves to this checkout's `master` the same way — and
     say so in your report.
   - **On green, file nothing.**
7. **Record the run**, every run, green or not, one line appended to
   `C:\workspace\tolstack\data\witness_sweeps.jsonl` (create it if absent; the
   fields are the contract in the comment at the top of this file). `seconds` is
   wall time from step 2 to step 5; `issue` is the path from step 6 or `null`;
   `summary` is one line such as `312/312 witnessed in 71 min` or
   `309/312 witnessed in 74 min, 3 decayed`. Write it with the repo's
   interpreter, e.g. `venv-win/Scripts/python.exe -c "import json,sys; ..."`
   appending `json.dumps(row)` plus a newline in `utf-8`.
8. **Record the wall time:**
   `C:/workspace/dispatch/.venv/Scripts/python.exe -m dispatch.cli suite-time record tolstack --tier sweep --seconds <n> --command "node scripts/run_mutation_witness_tests.mjs --full" --handoff witness_sweep --role job`.
   Until dispatch accepts `--tier sweep`, use `--tier merge` and append
   ` (sweep tier not yet available)` to the `--command` string. If it prints
   `OVER BUDGET`, append a dated measurement to the open `suite_over_budget` issue
   for this tier if there is one, else file one (`type: chore`, `priority: med`,
   `class: suite_over_budget`, `area: tests`, the measured time, the budget and the
   runner's slowest entries).

## Report

End with three lines: the trunk sha, the summary line you wrote in step 7, and the
issue path (or `none`).
