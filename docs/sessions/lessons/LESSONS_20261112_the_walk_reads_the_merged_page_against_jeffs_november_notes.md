# LESSONS 2026-11-14 — the_walk_reads_the_merged_page_against_jeffs_november_notes

The review page is `REVIEW_20261112_the_merged_page.md` (48 sentences: 31 does
it, 11 partly, 6 does not). Shots are in `shots/the_merged_page_20261112/`.

## How long the walk took

- **About 85 minutes from launch to the last shot.** The scratch root took
  about 7 minutes: robocopy of inbox, meshes and the non-viewer projections,
  then the seven builders with `--data-root`, 23:03–23:11. Contact suggestions
  and kinematic were both quick here. The page walk took about 30 minutes,
  23:05–23:31, including the unscripted part. Write-up and tests came after.
- **The driver** (`tests/debug_walk_merged_page_20261114.mjs`) is what made it a
  walk and not a script. It serves the tree on drawing-checker's mount shape
  on a fixed port and fakes the pane's folder grant onto the scratch root. It
  proxies every other path to 8000, so drawing links resolve. It takes one
  step per HTTP call: `goto`, `hover`, `click`, `mouse`, `eval`, `shot`. I read
  each shot before choosing the next move. It holds the browser slot from
  start to `quit`, so quit it before the write-up.
- **Things that cost time:** JSON-escaping JS through `curl -d` in Bash.
  Write a tiny Python client that reads the JS from a heredoc and posts it.
  The Python client printing non-cp1252 text (`▾`) crashed on Windows until
  I set `ensure_ascii=True`. Playwright's `button:text-is("3D")` resolved to
  the hidden pane handle, not the settings bar's 3D option; I clicked by
  coordinates.

## Which defects a per-handoff look could not have seen

- **8000 is not the merged page.** drawing-checker's mount resolves tolstack's
  main checkout, which sits on `master`, 121 commits behind `integration`.
  Every per-handoff click-around and this walk used a private server. Jeff's
  surface gets the chain only at the batch merge plus a projection rebuild
  (`ISSUE_…small_findings…` row 10).
- **The black chord fill** (fixed here, `208d3c89`). The body-tinted copies of
  a block's chord paths carry no `rail__bar--chord` class, so SVG's default
  black fill painted under them. It shows only when a chord is lit. Lighting
  every surface together was the hover handoff; the blocks are the earlier
  component work, and none of the 11-12 chain saw them together. The fix is
  `fill: none` on `.rail__bar` and `.rail__barhit`. These are stroke-only, and
  hits use `pointer-events: stroke`, so no hit area changes.
- **The hub drawn twice on v2's whole walk**, in both the grid and the DAG
  (`ISSUE_20261114_the_hub_is_two_groups…`). Each handoff checked its own
  surface against fixtures or v1. Nobody looked at v2's hub with no study
  selected.
- **The bind toast and the tree name different part numbers** (215175-001
  from the mesh, 215175-002 from the model). Two handoffs each own one string.

## What the map handoff should know about the page it will be drawn into

- At 3840 with the pane open, the DAG's region is 1201 px wide (1841 at 5120)
  and v2's drawing uses about 300 px of it. In "DAG" view the region is the
  whole middle. The tall, narrow drawing is all the map has to replace.
- **The DAG already lights from all four surfaces**, through
  `VA.focusElementKeysOf`: a part's block and name, a body's field, and a
  chord bar. Anything the map draws must take the same keys, or the
  four-surface rule breaks again. A chord bar is an SVG path: give a new curve
  `fill: none` or it fills black when lit.
- **Part runs repeat on v2** (the hub). Settle that first, or the map draws a
  part twice.
- **"Collapse assemblies" changes the grid only.** The DAG has no folded
  assembly (`ISSUE_20261114_the_dag_draws_no_nested_outline…`); the map is
  where that `+` goes.
- The settings bar wraps at 3840 with the pane open. A map that adds controls
  there will push more onto a second line.

## Fixes made here

| Fix | Commit | Tiers run for it |
|---|---|---|
| `.rail__bar` / `.rail__barhit` take `fill: none` (`apps/viewer/topology.css`, two lines) | `208d3c89` | default pytest; `node apps/viewer/run_tests.cjs --repo <scratch root>` 699/699, `[real]` armed; `node apps/annotate/run_tests.cjs` 316/316. No browser suite or witness spec added or changed, so neither runner ran (the review's `--changed-since` covers the CSS hunk) |

Before committing, the fix was checked on the live page: a style injected
into the running page took the lit chord from black to its body tint
(`12b_…` before, `12c_…` after).

## Other notes

- The tree's divider was dragged to 520 px and was still 520 after a reload
  (`31_tree_seam_dragged_after_reload.png`).
- The scratch log at `data/scratch/walk1114/data/inbox/feature-identity` now
  holds three walk events: a bind and an unbind on the mount's pilot bore, and
  a Correct of the hub base face to face 310. Face 310 is a ring and the wrong
  face; it was only to test the button. Nothing was written to the main
  checkout's log.

## Test record

All runs were in this worktree on the tree with the fix (`208d3c89`).

- **Default tier.** `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider`:
  **1 failed, 1986 passed, 1 skipped, 2 deselected**, 462 s (single process;
  ledger: inside budget). The one failure is the documented worktree red,
  `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`: its node-fs
  `[real]` tier found no projection in the worktree. That tier was run on its
  own, below.
- **Fast node tiers.** `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack/data/scratch/walk1114`
  passed **699/699**, `[real]` armed against projections built from this tree.
  `node apps/annotate/run_tests.cjs` passed **316/316**.
- **Doc scans after the docs commit** (the default run had started before it):
  `pytest tests/test_claims_registry.py tests/test_sop_vocabulary.py tests/test_provenance.py`
  passed 56/56.
- **Not run:** the browser runner and the witness runner. No suite or spec was
  added or changed. The two CSS lines sit near `.rail__bar` anchors, so the
  review's `--changed-since` gate may select witnesses there.
