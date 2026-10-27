---
type: chore
priority: low
status: open
area: repo/.gitignore
reporter: agent
found_by: docs/sessions/HANDOFF_20261026_the_dag_draws_bodies_as_containers_and_joints_as_symbols.md
---

# `.gitignore`'s `venv-win/` misses the symlink `dispatch bridge-test-inputs` leaves

`dispatch bridge-test-inputs` links `venv-win` into a worktree root as a
symlink. `.gitignore` line 9 is `venv-win/`. The trailing slash matches only
a directory, and git records a symlink as a file, so the link shows as
`?? venv-win`. `git check-ignore -v venv-win` prints nothing, measured
2026-10-27 in the review worktree.

The cost is real. The tactical session for
`the_dag_draws_bodies_as_containers_and_joints_as_symbols` ran `git add -A`,
committed the link in `7c10349d`, and needed a later commit to remove it (see
its lesson, "Verification"). Every bridged worktree is one `-A` away from the
same mistake.

Fix: add a bare `venv-win` line (no slash) beside `venv-win/`, or replace the
slash form with it. Check `.venv` and `node_modules` the same way:
`node_modules/` is also slash-only, and a junction to it reads as ignored
today, but a symlink would not.
