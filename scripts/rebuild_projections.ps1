<#
.SYNOPSIS
    Rebuilds all three viewer projections, in order, from the MAIN checkout.

.DESCRIPTION
    Runs, in this order:
      1. venv-win\Scripts\python.exe scripts\build_topology_projection.py
      2. venv-win\Scripts\python.exe scripts\build_viewer_projection.py
      3. <drawing-checker's venv> scripts\build_viewer_crops.py
    (PyMuPDF lives only in drawing-checker's venv -- build_viewer_crops.py's own
    docstring says so, and that fallback stays intact here.)

    Fails loud on any non-zero exit, including the provenance gate's exit 3 --
    --allow-older-tree is never passed from this script, so a refused rebuild
    stays refused and is reported, not silently worked around.

    Before building anything, checks that BOTH interpreters exist. If
    drawing-checker's is missing, says exactly what is missing and exits
    non-zero without having built a thing: a rebuild that quietly skips crops
    because the second venv wasn't there re-arms the different-trees alarm this
    script exists to kill (see docs/sessions/lessons/
    LESSONS_20260908_projections_rebuild_script.md).

    On success, prints the three projections' provenance stamps (branch,
    sha12, dirty, behind_trunk) so a caller can see at a glance whether they
    agree.

.PARAMETER RepoRoot
    tolstack's MAIN checkout. Defaults to this script's own parent directory.
    A worktree copy of this script has no venv-win of its own, so running it
    from a worktree fails the preflight check below -- correctly; venv-win and
    data/ exist only in the main checkout.

.PARAMETER DrawingCheckerPython
    drawing-checker's venv interpreter. Overriding this is the kill-a-leg test
    seam: point it at a path that does not exist to exercise the missing-leg
    failure without touching the real drawing-checker checkout.

.PARAMETER DrawingCheckerRoot
    drawing-checker's repo root, forwarded to build_viewer_crops.py's own
    --drawing-checker-root so an overridden -DrawingCheckerPython and the root
    it resolves runs against never disagree.
#>
param(
    [string]$RepoRoot = (Split-Path -Parent $PSScriptRoot),
    [string]$DrawingCheckerPython = "C:\workspace\drawing-checker\venv-win\Scripts\python.exe",
    [string]$DrawingCheckerRoot = "C:\workspace\drawing-checker"
)

# NOTE: this script deliberately declares no [CmdletBinding()]. Adding one
# makes Windows PowerShell 5.1 evaluate parameter default values (the
# $PSScriptRoot expressions above) before the automatic variable is populated,
# so $RepoRoot silently binds to "" instead of the script's own directory --
# discovered the hard way while writing this script; see the lesson file above.

$ErrorActionPreference = "Stop"

$TolstackPython = Join-Path $RepoRoot "venv-win\Scripts\python.exe"
$ScriptsDir = Join-Path $RepoRoot "scripts"

if (-not (Test-Path $TolstackPython)) {
    Write-Error -ErrorAction Continue (
        "tolstack's own interpreter is missing at $TolstackPython -- run this " +
        "script from the MAIN checkout (C:\workspace\tolstack), not a worktree: " +
        "venv-win exists only there. Nothing has been built."
    )
    exit 1
}

if (-not (Test-Path $DrawingCheckerPython)) {
    Write-Error -ErrorAction Continue (
        "drawing-checker's interpreter is missing at $DrawingCheckerPython -- " +
        "PyMuPDF lives only there, and build_viewer_crops.py needs it to render " +
        "drawing crops. A rebuild that skipped crops here and left crops.json " +
        "stale is exactly the failure this script exists to prevent, so nothing " +
        "has been built. Install drawing-checker's venv (its setup.ps1) or pass " +
        "-DrawingCheckerPython to point at the real one."
    )
    exit 1
}

function Invoke-Step {
    param(
        [string]$Name,
        [string]$Exe,
        [string[]]$Arguments
    )
    Write-Host ""
    Write-Host "==> $Name"
    Write-Host "    $Exe $($Arguments -join ' ')"
    & $Exe @Arguments
    $code = $LASTEXITCODE
    if ($code -ne 0) {
        Write-Error -ErrorAction Continue (
            "$Name exited $code -- stopping here. Nothing after this step ran."
        )
        exit $code
    }
}

Invoke-Step -Name "topology projection" -Exe $TolstackPython -Arguments @(
    (Join-Path $ScriptsDir "build_topology_projection.py")
)

Invoke-Step -Name "viewer results projection" -Exe $TolstackPython -Arguments @(
    (Join-Path $ScriptsDir "build_viewer_projection.py")
)

Invoke-Step -Name "viewer crops" -Exe $DrawingCheckerPython -Arguments @(
    (Join-Path $ScriptsDir "build_viewer_crops.py"),
    "--drawing-checker-root", $DrawingCheckerRoot
)

# --- provenance stamps, so a caller can see at a glance whether they agree --

$ProjDir = Join-Path $RepoRoot "data\projections\viewer"
$Projections = @("topologies.json", "results.json", "crops.json")

Write-Host ""
Write-Host "==> provenance stamps"
foreach ($name in $Projections) {
    $path = Join-Path $ProjDir $name
    $doc = Get-Content $path -Raw | ConvertFrom-Json
    $p = $doc.provenance
    $sha12 = if ($p.head_sha) { $p.head_sha.Substring(0, 12) } else { "?" }
    $behind = if ($null -eq $p.behind_trunk) { "null" } else { $p.behind_trunk }
    Write-Host ("    {0,-16} branch={1} sha12={2} dirty={3} behind_trunk={4}" -f `
        $name, $p.branch, $sha12, $p.dirty, $behind)
}

exit 0
