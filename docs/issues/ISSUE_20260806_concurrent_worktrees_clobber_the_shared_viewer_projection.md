---
type: bug
priority: high
status: triaged
handoff: docs/sessions/HANDOFF_20260810_viewer_projection_provenance.md
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

---

## Second occurrence, hours later, and this one shows the real cost

Recorded by `review/traced_labels_and_ratio` (2026-08-06), which raises this from
`med` to **high**: the first occurrence was a session clobbering an artifact and
noticing; the second is the shared projection **disagreeing with `master`** with
nobody watching.

Timeline, from `built_at` in the files themselves:

| time (UTC) | who | state of `results.json` |
|---|---|---|
| 2026-08-06T22:43 | `traced_labels_and_ratio` | agreed with its relabelling — `vpa_output` 1 traced / 2 inferred / 3 untraced, verified by the review as the handoff's definition-of-done |
| 2026-08-06T23:30 | *(crops rebuilt by another session)* | — |
| 2026-08-07T00:24 | `viewer_generated_checks` (live worktree, branched before the merge) | **stale**: `fastener_grip_14` and `under_head_chamfer_washer` back to `traced` / `parts_list`, `vpa_output` back to 2/1/3 |

So the projection now shows three `confidence` labels that no longer exist on
`master`, and the viewer's banner reports `built_at` rather than refusing —
meaning it presents pre-correction provenance as current. Nothing failed. No test
covers it, because the projection is gitignored.

The review deliberately did **not** rebuild to fix this: `git worktree list` shows
`viewer_generated_checks` live, that handoff *owns*
`scripts/build_viewer_projection.py`, and rebuilding with `master`'s copy over a
live session's output with a newer script is precisely the first occurrence's
mistake. **Which is the finding: with two live sessions the correct action for
both of them is "don't rebuild", and then nobody rebuilds.** A convention that
resolves to a stand-off under concurrency is not a convention.

Two consequences for whoever picks this up:

- The **stamp-provenance** step above is now the minimum, not a nice-to-have: with
  `--stacks-dir`, branch and HEAD sha in the file, a reader could have seen in one
  line that this projection was built from a branch that predates the labels it
  shows.
- Prefer the **per-branch output subdir**, or at least make a rebuild refuse (not
  warn) when the existing file's recorded branch/sha is not an ancestor of the
  rebuilding tree's HEAD. The "rebuild first, trust nothing" option does not help
  here: both sessions did rebuild, and the loser was whoever ran first.

Anyone reading the viewer between now and the fix: **check `built_at` against
`git log -1 --format=%cI` on `master` before believing a provenance count**, and
re-derive the ratio with `tests\debug_report_tolerance_stacks.py --ratio`, which
reads the stack files directly and cannot be stale.

### The stand-off was broken, by convention, not by a fix — 2026-08-07T00:30

`review/viewer_generated_checks` rebuilt both projections. The tie-break that
makes this safe rather than a third occurrence: **a review worktree holds
`master` + the handoff, which is the newest tree in existence**, so its script can
never be the older one losing to a newer. Add to the timeline above:

| time (UTC) | who | state of `results.json` |
|---|---|---|
| 2026-08-07T00:30 | `review/viewer_generated_checks` | current — the three `traced_labels_and_ratio` labels restored, plus that handoff's generated checks. Old-vs-new key-by-key diff: `built_at`, the three relabellings, and nothing else |

**This does not close the issue.** The convention ("under concurrency, the
reviewer of the newest tree rebuilds") is now in the review overlay, but it is a
rule a human has to remember, and it does not help two concurrent *reviews*, nor
tell a reader of the file which tree produced it. The suggested fix above —
stamp `--stacks-dir`, branch and HEAD sha into both files, then refuse a rebuild
whose recorded sha is not an ancestor — is still the fix. Status stays `open`.

---

## What landed — handoff `viewer_projection_provenance`, 2026-08-10

The suggested fix, both halves: `scripts/projection_provenance.py` stamps branch,
HEAD sha, `dirty`, `behind_trunk` and the **resolved absolute** `--stacks-dir`
into both projection files, and refuses (exit 3, writes nothing) a rebuild whose
recorded sha is not an ancestor of the rebuilding tree's HEAD.
`--allow-older-tree` overrides, loudly. The viewer's banner shows which tree
built each projection and raises an alarm when the pair disagrees. Demonstrated
against a real throwaway worktree, not just unit-tested.

Two corrections to this issue's text, for anyone reading it as a record:

- `results.json` **did** record `built_at` and `built_by`, from the original
  viewer commit — this issue's own timeline is quoted from that `built_at`. What
  it lacked was a tree identity: its `stacks_dir` was repo-*relative*
  (`docs/tolerance_stacks`), the same string in every worktree.
- The per-branch subdir was prototyped and is **recommended against**: the
  viewer's reading path is easy (~30 lines, back-compatible, real suite green
  through the indirection), but every candidate update rule for the `current`
  pointer reintroduces last-writer-wins and so still needs the ancestry gate
  underneath, at a cost of 13 MB per branch with no GC rule. Reasoning in
  `docs/sessions/lessons/LESSONS_20260810_viewer_projection_provenance.md`.

**Not yet closable.** The gate lives in the build scripts, so it protects only
trees that have merged it. A worktree branched before this work still runs the
gate-less script and still clobbers, stamp and all. Closing this should wait
until the live worktrees are gone or merged.

---

## Reviewer's note — `review/viewer_projection_provenance`, 2026-08-10

Verified end to end, not from the report: a throwaway worktree branched off
`master` and carrying only this branch's `scripts/` was **refused** by both
builders (exit 3, output byte-identical afterwards), `--allow-older-tree` got
through and said so, and the newest tree's rebuild was allowed with an
"already contains" note. The stamp diff against a `master`-built projection is
exactly eleven new `provenance` leaves plus `built_at`: **no computed number
moved.**

Two residual gaps, both recorded here rather than fixed, because both are design
calls and neither is a defect in what landed:

1. **The pair is gated per-file, so `results.json` and `crops.json` can still
   name different commits, and the viewer cannot tell an ancestor from a
   divergence.** This is not exotic — `apps/viewer/README.md` tells you to re-run
   step 1 alone after editing a stack, and once you commit that edit the pair's
   shas differ while the crop index is perfectly current. The banner alarm was
   asserting "the two halves of this page do not describe the same stacks"; the
   review softened it to what the data proves. The structural fix, if this proves
   annoying: `build_viewer_projection.py` can already run git, so it could read
   the neighbour's stamp and record whether it is an ancestor, turning the
   viewer's guess into a stamped fact. Deliberately not done here — it is a new
   field on a schema one handoff old.

2. **`dirty` was true on every build from the main checkout**, because dispatch
   leaves an untracked `.dispatch.toml` there and `git status --porcelain` counts
   it. Fixed inline (`--untracked-files=no`, so `dirty` means *tracked content
   differs from `head_sha`*, which is the claim the field is used to make) with a
   test pinning both directions. Recorded because the *class* is the interesting
   part and it is now a checklist item: a warning derived from environment state
   must be evaluated on a clean tree in **both** checkouts before it ships.

**Status: still `open`, and the author's reasoning for that is right.** The gate
protects only trees that have merged it, and two live worktrees
(`provenance_byte_identical_test`, `tolstack_founding-review`) branched before it
and still run the gate-less script. Close this when they are gone, not now.
