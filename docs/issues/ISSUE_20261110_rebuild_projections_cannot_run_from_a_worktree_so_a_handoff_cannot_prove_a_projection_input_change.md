---
type: bug
priority: med
status: triaged
area: scripts/rebuild_projections
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261110_the_end_stop_models_notes_say_where_the_value_comes_from.md
class: shared_mutable_state_across_worktrees
strategy: docs/strategy/BRIEF_20260914_real_tier_shared_projection_coupling.md
resolution: triage 2026-11-11 -- same question as the open real-tier coupling brief (a worktree builds and reads its own projection); appended there as a dated addendum
---

# `rebuild_projections.ps1` cannot run from a worktree, yet a handoff's DoD asks for it

`the_end_stop_models_notes_say_where_the_value_comes_from` required running the
script "from your worktree, writing into your worktree's own `data/`". The script
refuses: `venv-win` and `data/` exist only in the main checkout, so the preflight
exits 1 with nothing built. `-RepoRoot C:\workspace\tolstack` would pass it but
rebuilds the **main** checkout's projection, which port 8000 serves to every other
session and which the same handoff forbids touching.

So the DoD's "provenance stamp names your branch" and "Preview reads the new note"
could not be shown. Options for strategy: a `-DataRoot`/scratch-projection mode
(builders already take `--data-root`), or drop this DoD item from projection-input
handoffs and let the batch merge rebuild. Also: `pytest -n 16 --dist loadfile`
(CLAUDE.md's documented parallelism) fails here, as `pytest-xdist` is not installed
in `venv-win`.
