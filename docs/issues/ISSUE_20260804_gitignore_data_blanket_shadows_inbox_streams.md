---
type: bug
priority: medium
status: open
area: repo-conventions
reporter: agent
---

# An uncommitted `data/*` blanket in `.gitignore` shadows the per-stream inbox exceptions

Found during the `tolstack_founding` review (2026-08-04), in the **main
checkout** `C:\workspace\tolstack` — not in the reviewed work. Filed rather than
fixed because the change is someone else's uncommitted work in progress.

## What

`C:\workspace\tolstack\.gitignore` carries an **uncommitted** local edit
appending:

```
# dispatch runtime dir (per-repo state + generated launch scripts).
.dispatch/
# data/ layout: fs is canonical, absence from git is not data loss; the
# directory skeleton is tracked via .gitkeep.
data/*
!data/.gitkeep
```

That `data/*` sits *after* the per-stream inbox exceptions commit `c951a82`
added, and overrides them. Verified with `git check-ignore -v`:

| path | result |
|---|---|
| `data/inbox/specs/NEWDOC.md` | **IGNORED** by `.gitignore:53:data/*` |
| `data/inbox/tolerance_stacks/NEWPROV.md` | **IGNORED** by `.gitignore:53:data/*` |
| `data/inbox/newstream/README.md` | **IGNORED** by `.gitignore:53:data/*` |
| `data/runs/.gitkeep`, `data/projections/.gitkeep` | unaffected |

## Impact

Not currently breaking anything: `data/inbox/specs/README.md` and
`data/inbox/tolerance_stacks/PROVENANCE.md` are already **tracked**, and
`.gitignore` does not untrack. The specs pile is still correctly ignored.

The hazard is **future** tracked docs. Any new `data/inbox/<stream>/README.md`
or `PROVENANCE.md` — exactly the pattern this repo uses to commit provenance
beside gitignored contents — will be silently invisible to `git add`, with no
error. That is the same footgun the founding lesson documented for the
template's broad `data/inbox/*` rule, re-introduced one level up.

If this edit is committed as-is, deliverable-level work from `c951a82` is
silently undone.

## Suggested fix

Whoever owns the edit: either move the `data/*` block **above** the per-stream
exceptions, or drop `data/*` and keep the existing per-stream pattern (exclude
the stream's contents, negate its docs), which already achieves the same thing
without shadowing. The `.dispatch/` line is orthogonal and fine where it is.

Worth a look at whether this hunk is meant to be a template/forge convention
change — if so it needs the same treatment in the template, not just here.
