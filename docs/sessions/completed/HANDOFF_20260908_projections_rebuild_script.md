---
priority: med
depends_on: []
---

# HANDOFF 2026-09-08 — projections_rebuild_script: one command rebuilds every viewer projection, and the annotator gets a serve verb

Source: 2026-09-08 strategy session. The viewer's provenance alarms fired for
days because `topologies.json` had been written by a review agent's worktree
(19 commits behind, dirty) into the shared `data/` and nothing rebuilt after
the batch merge; rebuilding by hand takes three commands across two repos'
venvs and one of them is easy to get wrong (this session initially wrote
crops to a junk path via a mangled `--data-root`). Baseline: trunk `master`
@ `60dc9e16`. Scope: `scripts/rebuild_projections.ps1` (new), `ops.toml`,
`README.md`/`ARCHITECTURE.md` rows as repo convention requires, tests. Do
NOT touch the projection builders themselves, `apps/`, or
`docs/SOP_TOLERANCE_STACK.md` (all owned by parallel handoffs).

## Deliverables

1. **`scripts/rebuild_projections.ps1`** — runs, in order, from the main
   checkout (`C:\workspace\tolstack`):
   - `venv-win\Scripts\python.exe scripts\build_topology_projection.py`
   - `venv-win\Scripts\python.exe scripts\build_viewer_projection.py`
   - `C:\workspace\drawing-checker\venv-win\Scripts\python.exe
     scripts\build_viewer_crops.py` (PyMuPDF lives only there — the crops
     script's own error text says so; keep that fallback intact)
   Fails loud on any non-zero exit (including the provenance gate's exit 3 —
   never pass `--allow-older-tree` from this script), and finishes by
   printing the three projections' provenance stamps (branch, sha12, dirty,
   behind_trunk) so a caller can see at a glance they align. If
   drawing-checker's venv is absent, say exactly what's missing and exit
   non-zero — a partial rebuild that skips crops silently is the failure
   mode this script exists to kill (a stale `crops.json` re-arms the
   different-trees alarm).
2. **`ops.toml`: a real `serve` verb** — the annotator's entry point,
   one-click from the dispatch ops console:
   `["venv-win\\Scripts\\python.exe", "-m", "http.server", "8843",
   "--directory", "apps\\annotate"]`, `long_running = true` (port 8843 per
   `apps/annotate/README.md`). Note the constraint: verbs are exactly
   `install|serve|deploy|smoke` (enforced in code by both forge and dispatch
   `ops.py` `STANDARD_VERBS`) — that is WHY the rebuild is a script and not
   a fifth verb; put a one-line comment in `ops.toml` pointing rebuild
   users at the script.
3. **Pointer hygiene**: the SOP/DAG docs are out of scope, but wherever this
   repo currently documents the three-command rebuild recipe
   (`apps/viewer/config.js`'s `rebuild` block feeds the banner; leave that
   file to `viewer_v2_single_nav`), your lesson lists the sites so the
   viewer handoff can point its expanded-badge detail at the script.

## Definition of done

- From the main checkout, `powershell -ExecutionPolicy Bypass -File
  scripts\rebuild_projections.ps1` exits 0 and the three stamps print
  aligned (same head_sha, dirty=False).
- Kill-a-leg test: with drawing-checker's interpreter path made unreachable
  (test seam, not a real rename), the script exits non-zero and names it.
- `ops.toml` parses; the serve verb's argv is exactly as above (a test can
  toml-parse and assert — do not import dispatch's code to validate).
- Lesson (`docs/sessions/lessons/LESSONS_20260908_projections_rebuild_script.md`):
  stamp-print format, the rebuild-recipe sites inventory (deliverable 3).
