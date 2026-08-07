---
type: chore
priority: low
status: open
area: repo-conventions
reporter: agent
---

# `.dispatch.toml` sits untracked in the main checkout — decide tracked or ignored

Noticed while fixing `.gitignore` for the `gitignore_data_precedence` handoff
(2026-08-07). Filed rather than fixed: the handoff scoped me to the `data/*`
precedence defect, and this is a separate convention decision.

## What

`git status --porcelain` in `C:\workspace\tolstack` shows:

```
?? .dispatch.toml
```

The file is dispatch's **per-repo config** — it declares this repo's name, trunk
branch, session/prompt/issue paths, role-prompt filenames, launch settings, and
worktree policy. Contents are stable, hand-authored, and repo-specific; nothing
in it is generated or machine-local.

That makes it materially different from `.dispatch/`, the runtime directory
(per-repo state + generated launch scripts), which my `.gitignore` change
correctly ignores. `.dispatch/` does **not** match `.dispatch.toml`, so the
config file is neither tracked nor ignored — it just dirties `git status`
permanently, which is exactly the noise that let the `data/*` blanket sit
unnoticed in a dirty tree for two days.

## Why it matters

A permanently-dirty `git status` in the main checkout trains everyone to ignore
it. The `data/*` bug (`ISSUE_20260804_gitignore_data_blanket_shadows_inbox_streams.md`)
survived two days precisely because a dirty `.gitignore` line did not stand out.

## Options

1. **Track it** — it is durable repo configuration, same class as `ops.toml`.
   Means a fresh clone is dispatch-ready. Preferred, if dispatch treats the file
   as authored rather than generated.
2. **Ignore it** — add `.dispatch.toml` beside `.dispatch/`. Correct only if
   dispatch regenerates it per-machine.

Someone who knows dispatch's contract for this file should pick. Whichever way
it goes, the same decision likely applies to every forge-stamped repo and to
forge's `template/gitignore` — see the routing note in
`docs/sessions/lessons/LESSONS_20260806_gitignore_data_precedence.md`.
