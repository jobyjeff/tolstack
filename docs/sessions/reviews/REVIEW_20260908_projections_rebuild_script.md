---
type: review
handoff: projections_rebuild_script
reviewer: agent
date: 2026-09-08
verdict: APPROVE
blockers: 0
---

# Review: projections_rebuild_script

## Scope note — not a tolerance-stack review

This handoff delivers `scripts/rebuild_projections.ps1`, an `ops.toml` `serve`
verb, an `ARCHITECTURE.md` row, tests, and a lesson file. It touches no
`StackElement`, `source_ref`, `hardware_entry`, or `MaterialEntry` data. The
overlay's "mandatory checks" (1–7: traced/inferred/untraced provenance, signs,
LMC/MMC, RSS, nominal bounds, cotter/castellation, traced ratio) are scoped to
tolerance-stack work and do not apply here — noting that explicitly per the
overlay's own instruction, rather than silently skipping the section.

## What I verified

- **Baseline confirmed pre-work.** Before merging, `tests/test_rebuild_projections_script.py`
  and `tests/test_ops_toml_serve_verb.py` did not exist on `review/projections_rebuild_script`
  (cut from `integration` @ `60dc9e1`); `pytest` on those paths errored "file not found."
- **Merge.** `git merge handoff/projections_rebuild_script` fast-forwarded cleanly
  (`60dc9e1..e34cef6`, single commit, no conflict). `git log --oneline HEAD..integration`
  is empty — no sibling handoff landed on `integration` underneath this one while it
  was in flight, so this review's suite run is evidence about the tree that will actually
  ship, not a moment that already passed.
- **Full suite, worktree.** `venv-win\Scripts\python.exe -m pytest -q`: **672 passed, 1 skipped**
  (the 1 skip is the ordinary `data/`-dependent tier skipping in a worktree where `data/`
  is gitignored-empty — consistent with this repo's documented worktree-vs-main-checkout
  count divergence, not a regression).
- **New tests, in isolation:** `test_rebuild_projections_script.py` (2) +
  `test_ops_toml_serve_verb.py` (3) — 5 passed. Both drive the real artifact
  (`powershell.exe` running the actual `.ps1`; `tomllib` parsing the actual `ops.toml`),
  not a predicate re-implementing it — the "the script, not the predicate" rule the repo
  already applies to the provenance gate's own tests.
- **Ran the real script against the real main checkout** (`C:\workspace\tolstack`,
  `master` @ `9b9ef1d5...`, clean): exit 0, all three stamps printed
  `branch=master sha12=9b9ef1d55481 dirty=False behind_trunk=0` — aligned, exactly the
  Definition of Done's success case. This is also this session's write into the shared
  `data/projections/viewer/` (intentional and required by the DoD, not test pollution —
  the wipe-and-rebuild is the deliverable's actual production use, run by absolute path
  against the main checkout per the standing worktree rules).
- **Exercised the kill-a-leg path live** (not just via pytest): re-ran the script with
  `-DrawingCheckerPython` pointed at a nonexistent path. Exit 1, the missing path named
  in the error text, and neither build step's own `==>` header printed — confirms the
  preflight check refuses *before* building anything, per the DoD's explicit requirement,
  not merely after a partial rebuild.
- **`ops.toml`'s `serve` verb** matches `apps/annotate/README.md`'s own documented
  `http.server 8843` command (translated from `cd apps\annotate` to `--directory
  apps\annotate` because ops verbs run with cwd = repo root, never a worktree — correct
  per `ops.toml`'s own header comment) and matches the real `STANDARD_VERBS` closed set
  I read directly from `dispatch/dispatch/ops.py:58`
  (`("install", "serve", "deploy", "smoke")`) — the handoff's own test deliberately
  doesn't import that code, and I independently confirmed the set it hard-codes is
  still correct today rather than trusting the docstring's claim.
- **`ARCHITECTURE.md`'s `scripts/` inventory** gained exactly one row for the new file,
  in the same commit, with an accurate one-line description of what it does and its
  add-date.
- **Scope respected.** The diff touches only `ARCHITECTURE.md`, `docs/sessions/lessons/`,
  `ops.toml`, `scripts/rebuild_projections.ps1`, and the two new test files — no changes
  to the projection builders, `apps/`, or `docs/SOP_TOLERANCE_STACK.md`, all named
  out-of-scope by the handoff.
- **Pointer-hygiene deliverable (item 3).** The lesson file inventories all three sites
  that currently restate the three-command rebuild recipe (`apps/viewer/config.js`,
  `README.md`, `apps/viewer/README.md`, twice) plus a correctly-identified near-miss
  (`apps/annotate/README.md`, which documents a different two-script pair) — I spot-checked
  two of the named line ranges and both matched.
- **Command paste-run.** The one multi-line invocation a reader might copy — the DoD's
  own `powershell -ExecutionPolicy Bypass -File scripts\rebuild_projections.ps1` — is a
  single line; I ran it verbatim, twice (success and failure cases above), no
  cmd-vs-PowerShell continuation-character trap.
- **No `{{REPO_NAME}}` template residue** in the new `.ps1`/`.py`/`.toml` files (grepped).
- **No stale-count residue.** The new `ARCHITECTURE.md` row and lesson state no
  hand-restated total (script count, test count) that a later addition could silently
  falsify.

## Findings

None. No blockers, no should-fix, no nits worth filing.

One thing worth naming as a **non-finding, addressed inline by the author already**: the
script's own docstring explains why it declares no `[CmdletBinding()]` (PS 5.1 evaluates
a `$PSScriptRoot`-referencing parameter default before the automatic variable populates
once that attribute is present — discovered empirically, no public doc found), and pins
it with `test_the_script_itself_declares_no_cmdletbinding`. I verified this is a genuine
PowerShell 5.1 behavior by reasoning through the mechanism described (advanced-function
parameter binding order) rather than taking the docstring on faith, and could not find
a case where the test's narrow regression-pin (grepping for the literal attribute line)
would give a false pass. Added it to this repo's overlay (`docs/prompts/REVIEW_AGENT.md`,
"Recurring bugs to check") since it is a genuinely new PowerShell footgun this repo has
not hit before and the next `.ps1` script here is the likely place it recurs.

## Overlay maintenance

`docs/prompts/REVIEW_AGENT.md` was already well-populated (not an empty stub). Added one
entry to "Recurring bugs to check" for the `[CmdletBinding()]`/`$PSScriptRoot` interaction
above. No entries pruned this pass — nothing in the existing list looked like it had
stopped finding anything.

## Verdict

**APPROVE.** Merging to `integration` and pushing.
