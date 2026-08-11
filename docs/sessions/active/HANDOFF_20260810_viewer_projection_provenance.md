---
priority: high
depends_on: []
---

# HANDOFF 2026-08-10 — viewer_projection_provenance: `data/projections/viewer/` is one directory shared by every worktree, and the convention for who rebuilds it resolves to a stand-off

Source: `docs/issues/ISSUE_20260806_concurrent_worktrees_clobber_the_shared_viewer_projection.md`
(`bug`/high — raised from `med` by `review/traced_labels_and_ratio` after a second
occurrence). Triaged 2026-08-10. Baseline: `master`; `traced_labels_and_ratio`,
`citation_export_provenance`, `viewer_generated_checks`, `gitignore_data_precedence`
and `readonly_invariant_evidence` are all merged and completed, so the three
worktrees involved in the incidents below are gone. Scope:
`scripts/build_viewer_projection.py`, `scripts/build_viewer_crops.py`, the
projection schemas they write, and tests. Do **NOT** edit `apps/viewer/viewer.js`'s
`resolved_by` labelling — the staged `viewer_source_ref_export_label` owns that
(see "Coordination" below).

## The defect

`data/` lives only in the **main checkout**, so every worktree's build script is
told to write there by absolute path:

```powershell
python scripts\build_viewer_projection.py --data-root C:\workspace\tolstack\data --stacks-dir <my worktree>\docs\tolerance_stacks
python scripts\build_viewer_crops.py       --data-root C:\workspace\tolstack\data
```

That is the documented, correct invocation — a handoff's definition of done
routinely asks for "the viewer rebuilt against the main checkout". But
`data/projections/viewer/` is **one directory shared by every live worktree**, and
both scripts wipe-and-rebuild their own file in it. Neither file records which tree
produced it: `crops.json` has `built_at` and `built_by`, `results.json` has
**neither**. The whole directory is gitignored, so nothing in git notices.

Two failure modes, both quiet:

- **A newer script loses to an older one.** Whoever runs last wins, and "last" is
  whichever agent happens to finish first. The loser sees a regression in their own
  deliverable and has no reason to suspect a neighbour.
- **A projection built from branch A's stacks sits next to one built from branch
  B's.** `results.json` and `crops.json` are written by *different* scripts and each
  deliberately preserves the other's file, so the pair can describe two different
  trees.

## Three recorded occurrences — read all three, they argue for different fixes

**1 (2026-08-06, ~22:26).** `citation_export_provenance` rebuilt `crops.json` with
its script, which has a resolution rule (`source_ref_export`) that does not exist on
`master`: **24 of 48** citations resolved. `traced_labels_and_ratio` then ran the
**master** version against the same `--data-root` and overwrote it with **8 of 48** —
a 3× apparent regression in somebody else's in-progress work, no warning, no error.
Restored by re-running the other worktree's script; nothing was lost only because
the collision happened to be noticed.

**2 (2026-08-07, 00:24) — the one that raises this to `high`.** From `built_at` in
the files:

| time (UTC) | who | state of `results.json` |
|---|---|---|
| 2026-08-06T22:43 | `traced_labels_and_ratio` | agreed with its relabelling — `vpa_output` 1 traced / 2 inferred / 3 untraced, verified as that handoff's definition of done |
| 2026-08-06T23:30 | *(crops rebuilt by another session)* | — |
| 2026-08-07T00:24 | `viewer_generated_checks` (worktree branched before the merge) | **stale**: `fastener_grip_14` and `under_head_chamfer_washer` back to `traced`/`parts_list`, `vpa_output` back to 2/1/3 |

So the projection showed three `confidence` labels that no longer existed on
`master`, and the viewer's banner reported `built_at` rather than refusing —
**presenting pre-correction provenance as current.** Nothing failed. No test covers
it, because the projection is gitignored.

The review deliberately did **not** rebuild to fix this: `viewer_generated_checks`
was live and owned `build_viewer_projection.py`, and rebuilding with `master`'s copy
over a live session's newer script is exactly occurrence 1's mistake. **That is the
finding: with two live sessions the correct action for both is "don't rebuild", and
then nobody rebuilds. A convention that resolves to a stand-off under concurrency is
not a convention.**

**3 (2026-08-07, 00:30) — the stand-off broken by convention, not by a fix.**
`review/viewer_generated_checks` rebuilt both projections. The tie-break that made it
safe: **a review worktree holds `master` + the handoff, which is the newest tree in
existence**, so its script can never be the older one losing to a newer. Result:
current, with an old-vs-new key-by-key diff of exactly `built_at`, the three
relabellings, and nothing else.

That convention is now in the review overlay, and **it does not close this issue**:
it is a rule a human must remember, it does not help two concurrent *reviews*, and it
does not tell a reader of the file which tree produced it.

## Deliverables

1. **Stamp provenance into both projection files. This is the minimum, not a
   nice-to-have** — occurrence 2 is precisely a reader who could not tell. Into both
   `results.json` and `crops.json`:
   - the `--stacks-dir` actually used (resolved absolute, not as passed),
   - the git **branch** and **HEAD sha** of the script's own repo root (not of
     `--data-root`; the point is which *tree* built it),
   - `built_at` on `results.json`, which has no timestamp at all today.

   Keep `crops.json`'s existing `built_at`/`built_by` — do not rename fields other
   consumers read.

2. **Make a rebuild refuse, not warn, when the existing file's recorded sha is not an
   ancestor of the rebuilding tree's HEAD.** The issue is explicit that warn is not
   enough and that "rebuild first, trust nothing" does not help — in occurrence 1
   *both* sessions did rebuild, and the loser was whoever ran first. Ancestry
   (`git merge-base --is-ancestor`) is the right test because it encodes exactly the
   review-worktree tie-break that worked in occurrence 3: the newest tree is always
   allowed, an older one is not.

   Provide an explicit override flag for the legitimate case (a deliberate rebuild
   from an older tree), and make the refusal message say what to run.

3. **Evaluate the per-branch output subdir**, which the issue prefers:
   `data/projections/viewer/<branch>/` with the viewer reading a `current` pointer.
   Removes the collision entirely rather than detecting it, at the cost of a
   redirection. Treat deliverables 1–2 as required and this as a **prototype-and-report**:
   build it far enough to say whether the viewer's loading path and the `current`
   pointer's update rule are simple or fiddly, and recommend for or against in the
   lesson. Do not half-land it.

4. **Make the viewer refuse rather than present stale provenance as current.** The
   banner reporting `built_at` while showing superseded labels is the actual harm in
   occurrence 2. With deliverable 1's sha in the file, the viewer can compare against
   `master` and say "this projection was built from a tree that predates the labels it
   shows". Minimum: surface the branch/sha/stacks-dir in the banner so a reader can
   see it in one line. If a full refusal belongs in `apps/viewer/`, coordinate — see
   below — and put the *data* in place here regardless.

## Coordination — one file fence, and it is deliberate

The staged `HANDOFF_20260810_viewer_source_ref_export_label` also edits
`apps/viewer/viewer.js`. **No `depends_on` is set in either direction**, because they
touch different things in it: that handoff owns the `resolved_by` label branches and
the crop-hover text; deliverable 4 here owns the top-level provenance banner. They
share no fields in `crops.json` — that one reads `resolved_by` / `sha256_verified` /
`summary.by_resolved_by`, all of which already exist and none of which this handoff
changes. If you find yourself editing its branches, stop and say so in the lesson
rather than widening scope. Chaining these two would hold a broken-label fix behind a
concurrency investigation for no reason.

## Definition of done

- Both projection files carry stacks-dir, branch, HEAD sha and `built_at`, verified
  by rebuilding against the main checkout (`--data-root C:\workspace\tolstack\data`)
  and reading the actual files at
  `C:\workspace\tolstack\data\projections\viewer\`. **Your worktree's `data/` is
  empty and is deleted at cleanup** — build to the main checkout by absolute path.
- A rebuild from a tree whose recorded sha is not an ancestor **refuses**,
  demonstrated for real: construct the situation (e.g. stamp a file from a
  throwaway branch, then attempt a rebuild from an older checkout) rather than
  unit-testing the predicate alone. The predicate passing is not the claim; the
  script refusing is.
- The six stacks' computed results are **unchanged** by this work — this handoff adds
  provenance, it must not move a number. Diff old-vs-new key-by-key and report that
  the only differences are the new fields, exactly as occurrence 3's review did.
- Tests: value-level coverage for the ancestry gate and for the new fields' presence.
  Note the repo's gotcha — `venv-win` is gitignored so it does not exist in a
  worktree; run `& C:\workspace\tolstack\venv-win\Scripts\python.exe -m pytest -q`
  against your worktree's code.
- Full suite green.
- Lesson (`docs/sessions/lessons/LESSONS_20260810_viewer_projection_provenance.md`):
  the per-branch-subdir recommendation with the prototype's findings; whether the
  ancestry gate makes the review-overlay convention ("under concurrency, the reviewer
  of the newest tree rebuilds") redundant — if it does, say so, because a rule a human
  must remember should be deleted once a machine enforces it; and whether any **other**
  script in this repo writes to a shared `data/` path from a worktree, since the class
  is "shared gitignored output dir", not "the viewer".
