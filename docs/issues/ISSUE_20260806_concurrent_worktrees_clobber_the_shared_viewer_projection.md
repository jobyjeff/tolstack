---
type: bug
priority: med
status: open
area: viewer / projections
reporter: agent
---

# Two concurrent handoffs silently overwrite each other's `data/projections/viewer/`

Hit for real on 2026-08-06 by handoff `traced_labels_and_ratio`.

## What happened

`data/` lives only in the **main checkout**, so every worktree's build script is
told to write there by absolute path:

```powershell
python scripts\build_viewer_projection.py --data-root C:\workspace\tolstack\data --stacks-dir <my worktree>\docs\tolerance_stacks
python scripts\build_viewer_crops.py       --data-root C:\workspace\tolstack\data
```

That is the documented, correct invocation — a handoff's definition of done
routinely asks for "the viewer rebuilt against the main checkout". But
`data/projections/viewer/` is **one directory shared by every live worktree**,
and both scripts wipe-and-rebuild their own file in it. So:

1. `citation_export_provenance` (active, in its own worktree) rebuilt
   `crops.json` at 22:26 with **its** script — which has a new resolution rule,
   `source_ref_export`, that does not exist on master. 24 of 48 citations
   resolved.
2. `traced_labels_and_ratio` (active, different worktree) then ran the **master**
   version of `build_viewer_crops.py` against the same `--data-root`. It
   overwrote `crops.json` with 8 of 48 resolved — a 3x apparent regression in
   somebody else's in-progress work, with no warning, no error, and nothing in
   git to notice it by (the whole directory is gitignored).

Restored by re-running the other worktree's script. Nothing was lost, because
both files are derived and cheap to rebuild — but only because the collision
happened to be noticed.

## Why it matters

The two failure modes are both quiet:

- **A newer script loses to an older one.** Whoever runs last wins, and "last"
  is whichever agent happens to finish first. The loser sees a regression in
  their own deliverable and has no reason to suspect a neighbour.
- **A projection built from branch A's stacks sits next to a projection built
  from branch B's.** `results.json` and `crops.json` are written by *different*
  scripts and each deliberately preserves the other's file, so the pair can end
  up describing two different trees. There is nothing in either file that says
  which branch or which stacks-dir produced it — `crops.json` records
  `built_at` and `built_by`, `results.json` records neither.

## Suggested fix

Smallest useful step: **stamp provenance into both projection files** — the
`--stacks-dir` actually used, the git branch and HEAD sha of the script's own
repo root, and `built_at` on `results.json` too (it has no timestamp at all).
Then a rebuild can warn when it is about to overwrite a projection built from a
different branch, and a reader can tell what they are looking at.

Bigger options, for whoever picks this up to weigh:

- Per-branch output subdir (`data/projections/viewer/<branch>/`) with the viewer
  reading a `current` pointer. Removes the collision, costs a redirection.
- Treat the projection as strictly per-session scratch and rebuild it as the
  *first* step of any session that reads it, never trusting what is there.

Related: the worktree/data-root split itself is documented in the tactical
prompt and in `.gitignore` precedence
(`ISSUE_20260804_gitignore_data_blanket_shadows_inbox_streams.md`); this is the
concurrency consequence of it, which no document currently mentions.
