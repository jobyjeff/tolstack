# LESSONS 2026-08-10 — viewer_projection_provenance

Handoff: `HANDOFF_20260810_viewer_projection_provenance.md`. Issue:
`ISSUE_20260806_concurrent_worktrees_clobber_the_shared_viewer_projection.md`.

What landed: `scripts/projection_provenance.py` (the stamp + the ancestry gate),
both build scripts wired to it with `--allow-older-tree`, the viewer banner
reporting which tree built each projection, and
`tests/test_projection_provenance.py`. Deliverable 3 (per-branch subdir) was
prototyped and is **recommended against** — see below.

## The handoff's premise was half wrong, and the wrong half is the interesting one

The issue says `results.json` records neither `built_at` nor `built_by`, and the
handoff repeats it. It records **both**, and has since the original viewer commit
(`5a7b72e`) — the issue's own timeline is quoted *from* `results.json`'s
`built_at`, so it contradicts itself. It also already recorded `stacks_dir`.

The real defect is subtler and worth stating plainly, because it is the trap in
any "just record the inputs" fix: `stacks_dir` was recorded **repo-relative**, as
`docs/tolerance_stacks`. That is the same eighteen characters in every worktree
that has ever existed. The field was present, looked like provenance, and
identified nothing. `provenance.stacks_dir` is the resolved absolute path;
the old relative field is kept because other consumers read it by name.

Generalisation for the next agent: a provenance field that cannot *differ*
between the things it is supposed to distinguish is not provenance.

## The gate only protects trees that HAVE the gate — this is not fully fixed yet

The refusal is implemented in the build scripts, so it fires only when the
*rebuilding* tree is running this code. Until this branch is on `master` **and**
each live worktree has merged it, an older worktree runs `master`'s gate-less
script and clobbers a stamped projection exactly as before — and takes the stamp
with it, so the next reader sees an unstamped file and the "carries no provenance
stamp" note.

Live worktrees as of this session: `provenance_byte_identical_test` (branched
before this work) and `tolstack_founding-review`. Neither can be protected
retroactively. **Whoever merges this should say so in the merge note**, and the
`docs/issues/` entry should not be closed as "fixed" without that caveat.

## Does the ancestry gate make the review-overlay convention redundant?

The convention: *under concurrency, the reviewer of the newest tree rebuilds.*

**Yes, as a rule a human has to remember — delete it.** Two thirds of its content
is now machine-enforced or machine-delivered:

- *"the newest tree is the one that may rebuild"* — enforced. An older tree's
  rebuild exits 3 and writes nothing. That is the same predicate the convention
  encoded, applied by the machine at the moment of the mistake instead of by a
  reader who has to remember it beforehand.
- *"…and here is which tree that is"* — delivered. The refusal prints the other
  tree's branch, sha and **filesystem path** (from `provenance.repo_root`), so
  the person who needs the rule gets it at the moment they need it, with the
  answer filled in. That is strictly better than a rule in an overlay document
  that is read at session start and forgotten by the time it matters.

What does **not** survive, and must not be quietly dropped: the gate makes the
wrong action *fail*, it does not make the right action *happen*. The stand-off
the issue identifies ("with two live sessions the correct action for both is
don't rebuild, and then nobody rebuilds") is still reachable — nobody is obliged
to rebuild. The difference is that the stand-off is now safe rather than
lossy, and the newest tree's rebuild is guaranteed to succeed, so the deadlock
has an exit that cannot go wrong. If the overlay keeps one sentence, keep that
one; drop the tie-break mechanics.

Also note the gate cannot see *content*: two worktrees sitting on the same sha
with different uncommitted edits are identical to it. `provenance.dirty` is what
tells a reader that happened, and the banner shows it. There is nothing cheaper
that would catch it.

## Deliverable 3: per-branch subdirs — prototype findings, and a recommendation AGAINST

Prototyped for real (scratchpad, not landed): the projection re-laid out as
`data/projections/viewer/<branch-slug>/{results.json,crops.json,crops/}` plus a
`current.json` pointer, and the viewer's `NodeFsAdapter` patched to follow it.
Then the **real** test tier was run against the **real** data through the
indirection: 84/84, including the 24 crop PNGs.

**The reading path is simple.** The entire adapter diff is one cached `_dir()`
promise and three `.then()`s; `readCropImage` needs nothing beyond the same base,
because crop paths in `crops.json` are already relative to the projection dir. A
missing pointer falls back to the flat directory, so it is back-compatible with
every projection built before it. Two adapters need it (`fsa.js`, `node_fs.js`);
`memory.js` touches no paths. Call it ~30 lines total.

**The pointer's update rule is where it falls apart.** Every candidate rule fails:

| who writes `current.json` | what happens |
|---|---|
| every build | last writer wins **on the pointer**. Two worktrees, and the reader is looking at the other one's tree with no warning — occurrence 2 again, minus the data loss |
| a human | a rule a human must remember, which is precisely what the issue rejects |
| the viewer picks newest `built_at` | "whoever runs last wins" — occurrence 1's failure mode, restated |
| the viewer picks the descendant tree | the viewer cannot run git. It is a static page with a read-only folder grant |

So the pointer needs the **same ancestry gate** to be safe. Subdirs do not
replace the gate; they sit on top of it. What they buy over the gate alone is
that a loser's output is preserved rather than overwritten — real, but both files
are derived and cheap to rebuild, which is the reason occurrence 1 cost nothing.

What they cost:

- **13 MB per branch**, measured, almost all crop PNGs — and no garbage-collection
  rule for dead branches' directories. With a handful of live and dead worktrees
  that is a slow, silent fill of a gitignored directory nobody looks at.
- A **stale pointer is a new failure mode**: in the prototype, a pointer naming a
  deleted directory fell back to the flat layout and the suite went green while
  showing a different projection than the pointer named. Handling it properly
  means yet another banner state.
- Every consumer that touches those paths (both adapters, `config.js`, the two
  build scripts, `run_tests.cjs`'s node-fs tier, any future script) learns the
  indirection.

**Recommendation: no.** The harm in all three occurrences was a *reader believing
a projection that was not built from the tree they thought* — the stamp plus the
banner addresses that directly, and the gate stops the destructive half. Subdirs
add a directory tree, a pointer, a GC question and a new stale state, and still
need the gate underneath. Revisit only if rebuild cost stops being cheap (a
projection that takes minutes changes the trade) or if concurrent *reviews*
become routine.

## Other scripts writing to a shared `data/` path — audited, and there are three

> **Correction, `review/viewer_projection_provenance` 2026-08-10.** This section
> shipped saying *"exactly two members"*. There are three: `tolerance_stack/`
> was not in the search, and it holds one — see the correction at the end of the
> section. The audit below is right about everything it looked at; the miss is
> the scope, and the scope is stated in its own first sentence.

The class is "shared gitignored output dir", not "the viewer", so the whole
`scripts/` + `tests/` tree was checked for writers with a `--data-root`-style
default:

- `scripts/build_viewer_projection.py`, `scripts/build_viewer_crops.py` — the two
  in this handoff. The only ones defaulting to `REPO_ROOT / "data"`.
- `scripts/snapshot_drawing_checker.py` — writes only where the caller names
  (`take <out>`, a required positional). No default under `data/`. Not exposed.
- `tests/debug_dump_tol_stack_xlsx.py --csv` — same, caller-named and optional.

The thing to watch is a *new* script picking up the `--data-root` default by
copying one of these: it would inherit the shared path without the gate. If
another appears, `projection_provenance.stamp()`/`guard()` is two calls and works
on any JSON output file — it is not viewer-specific.

**The third member, found in review: `tolerance_stack/spec_library.rebuild()`.**
`python -m tolerance_stack` wipe-and-rebuilds
`data/projections/spec_library/library.json`, and it is the same class with the
knobs turned worse:

- `PROJECTION_DIR` is `REPO_ROOT / "data" / "projections" / "spec_library"` and
  `main()` takes **no arguments at all** — there is no `--data-root`, which is
  why the grep above (looking for a `--data-root`-style default) did not find it.
- So from a worktree it writes into *that worktree's* gitignored `data/`, which
  is deleted at cleanup. A worktree can never update the shared artifact and
  nothing says so. Reproduced in the review: it wrote to
  `…/viewer_projection_provenance-review/data/projections/spec_library/`.
- From the main checkout — the only invocation that lands the artifact — two
  sessions are last-writer-wins on a shared file that carries **no `built_at`,
  no `built_by` and no stamp of any kind**. Staleness is knowable only from the
  mtime, and the copy in the main checkout has been sitting there since
  2026-08-05 (its content still matches a fresh rebuild, which is luck, not a
  property).
- And it is the *higher*-leverage projection: `library.json` is what
  `library_ref: "spec_library:NAS6403U11D"` resolves through, so a wrong value
  there launders into a stack wearing `confidence: "traced"`.

Filed as `docs/issues/ISSUE_20260810_the_spec_library_projection_is_the_third_shared_writer.md`.
The generalisation for the next audit: **enumerate writers by what they write,
not by the flag they accept.** Grepping for `--data-root` finds the members that
already look like the two you are fixing.

## Smaller things the next agent would otherwise rediscover

- **The gate runs before the work, not before the write.** `build_viewer_crops.py`
  `rmtree`s `crops/` early; a refusal after that point would have destroyed the
  thing it was protecting. Both scripts gate immediately after argument parsing.
- **A stamp from a deleted branch refuses forever.** Delete the branch and its
  commit stays in the object database (unreachable, un-gc'd), so `cat-file` finds
  it and `merge-base` still says "not an ancestor"; after gc it becomes "not in
  this repo at all", which also refuses. Both are deliberate fail-closed, and
  both need `--allow-older-tree` to clear. Encountered while cleaning up the
  demo below — it is the expected exit, not a bug.
- **How the refusal was demonstrated for real** (the definition of done asks for
  the script refusing, not the predicate passing): `git worktree add` a throwaway
  worktree on a branch forked from `master`, `git checkout <this-branch> --
  scripts/` into it so it carries the gate, commit, and run its build against
  `C:\workspace\tolstack\data`. It refused to clobber this tree's projection
  (occurrence 1, prevented, in the direction it actually happened); with
  `--allow-older-tree` it won the race; then this tree's rebuild refused with the
  full message. Then `git worktree remove` + `git branch -D`, and rebuild with
  `--allow-older-tree` to restore. Whole loop is about ten commands.
- **New tests went in a new module on purpose.** `provenance_byte_identical_test`
  is live and owns byte-identical assertions in `tests/test_viewer_projection.py`;
  putting field-presence assertions there would have been a merge conflict for no
  benefit. `tests/test_projection_provenance.py` covers both files' new fields.
- **`build_viewer_crops.build_index()` was lifted out of `main()`** so `crops.json`'s
  shape is testable under this repo's stdlib-only venv. `main()` needs PyMuPDF and
  a real drawing PDF and never will be.
- **The viewer's file fence held.** `apps/viewer/viewer.js`'s `resolved_by` label
  branches and the crop-hover text were not touched; this handoff added
  `provenanceLine`/`provenanceAlarms` and a `provenance()` helper in
  `views/banner.js`. No overlap with the staged
  `viewer_source_ref_export_label`.
- **What the viewer still cannot do:** decide staleness *now*. It cannot run git,
  so "this projection predates master" is only knowable from what was stamped at
  build time (`behind_trunk`), and the banner says so in those words — "was built
  from a tree N commits behind master" — rather than claiming a fact about the
  present it cannot check. The one thing it *can* prove from the data alone is
  the pair disagreeing (`results.provenance.head_sha !==
  crops.provenance.head_sha`), which is a real failure mode because the two files
  are written by different scripts that each preserve the other's, and that is
  the loud alarm.
