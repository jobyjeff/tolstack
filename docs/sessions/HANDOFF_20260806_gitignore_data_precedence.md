---
priority: medium
depends_on: []
---

# HANDOFF 2026-08-06 — gitignore_data_precedence: an uncommitted `data/*` blanket is shadowing the per-stream inbox exceptions

> **⚠ INTEGRATION NOTE (read before you start, and tell whoever merges you):**
> the defect lives in an **uncommitted** edit in the main checkout
> (`C:\workspace\tolstack`, ` M .gitignore`). Your branch fixes the *tracked*
> file; it cannot clear the main checkout's dirty copy, which will still shadow
> everything after your merge. The merge step must therefore end with
> `git -C C:\workspace\tolstack checkout -- .gitignore` (discarding the
> superseded local edit) followed by re-running the `git check-ignore -v` matrix
> **in the main checkout**. Put that in your lesson in so many words — a merge
> that skips it leaves the bug live while the branch looks like it fixed it.

Source: `docs/issues/ISSUE_20260804_gitignore_data_blanket_shadows_inbox_streams.md`,
filed by the `tolstack_founding` review and routed by the 2026-08-06 triage
sweep, which re-confirmed the edit is **still uncommitted and still shadowing**
two days later. Baseline: `master` @ `de7f7f1`. Scope: `.gitignore` only. Do NOT
touch stack JSONs, the viewer, or the SOP.

## Confirmed state, 2026-08-06

The main checkout's `.gitignore` carries an uncommitted hunk appending:

```
# dispatch runtime dir (per-repo state + generated launch scripts).
.dispatch/
# data/ layout: fs is canonical, absence from git is not data loss; the
# directory skeleton is tracked via .gitkeep.
data/*
!data/.gitkeep
```

That `data/*` sits **after** the per-stream inbox exceptions commit `c951a82`
added, and overrides them:

| path | result |
|---|---|
| `data/inbox/specs/NEWDOC.md` | **IGNORED** by `.gitignore:62:data/*` |
| `data/inbox/tolerance_stacks/NEWPROV.md` | **IGNORED** by `.gitignore:62:data/*` |
| `data/runs/.gitkeep`, `data/projections/.gitkeep` | unaffected |

Nothing is broken *today*: `data/inbox/specs/README.md` and
`data/inbox/tolerance_stacks/PROVENANCE.md` are already **tracked**, and
`.gitignore` does not untrack. The hazard is future tracked docs — any new
`data/inbox/<stream>/README.md` or `PROVENANCE.md`, exactly the pattern this repo
uses to commit provenance beside gitignored contents, will be silently invisible
to `git add`, with no error. If this edit is committed as-is, deliverable-level
work from `c951a82` is silently undone.

## The subtlety that makes this more than a reorder

Simply moving the `data/*` block above the per-stream rules does **not** work.
Git does not descend into an excluded *directory*, and `data/*` matches
`data/inbox` itself (a `*` does not cross `/`), so every `!data/inbox/specs/…`
negation below it becomes unreachable regardless of ordering. The same applies to
`data/runs/` and `data/projections/` and their `.gitkeep` files.

Two viable shapes, both of which you must verify rather than reason about:

1. **Drop the blanket**, keep the existing per-stream pattern (exclude the
   stream's contents, negate its docs). Simple and correct for every stream that
   exists; the cost is that a *new* `data/` child is not ignored by default.
2. **Keep the blanket, re-include each directory it needs to descend into**
   (`!data/inbox/`, `!data/runs/`, `!data/projections/`, …). Preserves
   ignore-by-default for new children; the cost is one more line per stream and a
   rule that is easy to get wrong next time.

Pick one, and argue it in the lesson — in particular, say which failure you would
rather have: an unignored new data stream, or a silently dropped tracked doc.

The `.dispatch/` line is orthogonal and fine; keep it.

**Verify with `git check-ignore -v <path>` and `git ls-files data/`, never by
eye.** That is this repo's own recurring-bugs checklist item, and the class of
bug this issue *is*.

## Also in scope

Check whether this hunk was meant to be a template/forge convention change. If
so it needs the same treatment in forge's `template/gitignore`, not just here —
**do not make that change yourself** (a tolstack session must not commit into
forge); state the finding in the lesson and it will be routed. forge's
`template_hygiene` handoff is staged and already touching `template/gitignore`,
so the finding has somewhere to go.

## Definition of done

- A `git check-ignore -v` matrix, run **in the main checkout after the merge and
  after discarding the dirty local copy**, covering at minimum:
  `data/inbox/specs/NEWDOC.md`, `data/inbox/tolerance_stacks/NEWPROV.md`,
  `data/inbox/drawings/NEWPROV.md`, `data/inbox/newstream/README.md`,
  `data/inbox/specs/some_real_spec.pdf` (must stay ignored),
  `data/runs/.gitkeep`, `data/projections/.gitkeep`, `.dispatch/anything`.
  Every row's expected result stated **before** the command output.
- `git ls-files data/` returns the same set as before the change — nothing was
  accidentally untracked or newly tracked.
- `git status --porcelain` in the main checkout is clean of `.gitignore`
  afterwards.
- Full suite green (`venv-win\Scripts\python.exe -m pytest -q`).
- Lesson (`docs/sessions/lessons/LESSONS_20260806_gitignore_data_precedence.md`):
  the shape chosen and why, the check-ignore matrix, the directory-descent rule
  stated plainly for the next person, and whether forge's template needs the
  same fix.
