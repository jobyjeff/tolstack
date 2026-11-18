---
type: chore
priority: low
status: open
area: scratch roots
reporter: agent
needs: jeff
ask: Delete the 1.7 GB leftover review folder named bsj from tolstack's data scratch area
found_by: docs/sessions/active/HANDOFF_20261117_the_base_stack_joints_are_seat_boss_and_pattern.md
todo: 20261117T222300_v3ap1z
---

# A scratch root with its own `git init` cannot be deleted by any agent

The tactical session of `the_base_stack_joints_are_seat_boss_and_pattern`
built its click-around root at `C:\workspace\tolstack\data\scratch\bsj` as a
`git archive` of its branch plus a `git init` (so the projection builders could
stamp a sha). The nested `.git` makes dispatch's main-checkout edit guard read
the folder as a main checkout, so its own `rm -rf` was refused (the lesson's
"Blocked actions" section). Measured at review, 2026-11-17: 1.7 GB, still
there. It is gitignored, its `venv-win` and `node_modules` junctions were
already removed by the author, and nothing reads it: deleting the whole folder
reaches nothing else and is safe at any time.

The recurring half is for agents, not for Jeff: a scratch root built with
`--data-root` from the worktree's own scripts (the review overlay's "two traps"
recipe) needs no `git init`, pairs with the worktree's sha, and stays
deletable. The review overlay now says so beside that recipe.
