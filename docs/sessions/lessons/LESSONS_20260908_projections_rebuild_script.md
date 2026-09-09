# LESSONS 2026-09-08 — projections_rebuild_script

Handoff: `docs/sessions/active/HANDOFF_20260908_projections_rebuild_script.md`.
Delivered `scripts/rebuild_projections.ps1`, a `serve` verb in `ops.toml` for
`apps/annotate/`, and this file.

## `[CmdletBinding()]` breaks `$PSScriptRoot` in a parameter default, on this machine's Windows PowerShell 5.1

The first working draft of the script used

```powershell
[CmdletBinding()]
param(
    [string]$RepoRoot = (Split-Path -Parent $PSScriptRoot),
    ...
)
```

and every invocation failed at parse-time with `Split-Path : Cannot bind
argument to parameter 'Path' because it is an empty string` — `$PSScriptRoot`
was empty *inside the parameter default expression itself*, even though it is
populated correctly everywhere else in the same script (verified: printing it
in the script body, after the param block, shows the right value). Reproduced
in isolation with a two-line throwaway script: adding `[CmdletBinding()]`
alone flips a working `param([string]$X = (Split-Path -Parent
$PSScriptRoot))` from resolving to the script's directory to binding `$X` to
`""`. Dropping the attribute (which this script never needed — it declares no
common parameters) fixed it outright. I did not find this documented anywhere
public; recording it here since the next PowerShell script in this repo that
wants `$PSScriptRoot` in a default and reaches for `[CmdletBinding()]` out of
habit will hit the exact same silent failure.
`tests/test_rebuild_projections_script.py::test_the_script_itself_declares_no_cmdletbinding`
pins it so a future edit re-adding the attribute is caught immediately rather
than by a confusing empty-path error at the next full rebuild.

## Why the script passes absolute script paths rather than `cd`-ing into the repo root

`build_topology_projection.py` / `build_viewer_projection.py` /
`build_viewer_crops.py` all compute their own `REPO_ROOT` as
`Path(__file__).resolve().parent.parent`, which only names the right tree when
the path Python was invoked with actually resolves to the real file — a
relative `scripts\build_viewer_crops.py` after `Push-Location` would work too,
but an absolute path removes the dependency on the calling process's cwd
entirely, which matters here because two *different* interpreters (tolstack's
own venv, then drawing-checker's) run three different scripts in sequence.
Simpler to get right once than to get `Push-Location`/`Pop-Location` ordering
right across a `try`/`finally` with three exit paths.

## Pointer hygiene — where this repo currently documents the three-script rebuild recipe

Out of scope for this handoff to edit (SOP/DAG docs are explicitly excluded,
and `apps/viewer/config.js` belongs to `viewer_v2_single_nav`), but here is
the inventory that handoff asked for, so its expanded-badge detail can point
at `scripts/rebuild_projections.ps1` instead of restating the three commands:

- **`apps/viewer/config.js`** — `VA.CONFIG.rebuild` (`results` / `topologies`
  / `crops` keys), which feeds the viewer's own "projection missing" banner.
  Owned by `viewer_v2_single_nav`.
- **`README.md`** — "Reviewing a stack or a topology" section (around line 57):
  "It needs `scripts/build_viewer_projection.py` ... then
  `scripts/build_viewer_crops.py` ... and, for a system with a topology,
  `scripts/build_topology_projection.py`".
- **`apps/viewer/README.md`** — two sites: a fenced three-command block
  (around line 40, the canonical copy-pasteable recipe with numbered
  comments) and a second, topology-only invocation (around line 135).
- **`apps/annotate/README.md`** — its own "Run it" section documents building
  *two* of the three (`build_topology_projection.py` +
  `build_feature_identity_projection.py`, not this projection set), so it is
  a near-miss for anyone searching for "the rebuild recipe" but is not one of
  this handoff's sites.

None of these were edited this session. A future doc pass that wants to point
at the new script rather than restate the commands should update the first
three.

## `ops.toml`'s `serve` verb needed no new command — `apps/annotate/` already had one

`apps/annotate/README.md`'s own "Run it" section already documented
`python.exe -m http.server 8843 --directory apps\annotate` (well,
`cd apps\annotate` + bare `http.server 8843` — equivalent argv via
`--directory` instead, which avoids the ops console needing to know to `cd`
first). No new server code, no new script — just wiring the manifest to a
command that already existed and worked.

## Verified live

Ran `powershell -ExecutionPolicy Bypass -File scripts\rebuild_projections.ps1`
from the main checkout (`C:\workspace\tolstack`, clean, `master` @
`9b9ef1d55481`): exited 0, all three projections' provenance stamps printed as
`branch=master sha12=9b9ef1d55481 dirty=False behind_trunk=0` — aligned, as
the definition of done asks. Also verified the two preflight failure paths
directly (drawing-checker interpreter missing; `-RepoRoot` pointed at this
worktree, which has no `venv-win`) — both exit non-zero and name the missing
path before anything is built.
