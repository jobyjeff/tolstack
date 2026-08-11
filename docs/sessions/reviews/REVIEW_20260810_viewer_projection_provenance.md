---
type: review
handoff: docs/sessions/active/HANDOFF_20260810_viewer_projection_provenance.md
reviewer: review agent (claude)
date: 2026-08-10
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-08-10 — viewer_projection_provenance

Branch `handoff/viewer_projection_provenance` (5 commits, fast-forwards onto
`master` at `a13601a`). **Not a tolerance stack** — plumbing plus a viewer
surface — so mandatory checks 1–7 mostly exit; each is addressed below anyway,
because "not mentioned" is not "checked", and because the work touches the
surface that *renders* provenance.

**Verdict: APPROVE.** Merged, pushed, worktrees cleaned. Three inline reviewer
fixes (commit `519064f`) plus one out-of-scope issue filed and one correction to
the author's own lesson (commit below). No blockers.

## What landed

`scripts/projection_provenance.py` (294 lines, stdlib only): `stamp()` writes
branch / HEAD sha / `dirty` / `behind_trunk` / resolved-absolute `stacks_dir` into
both projection files; `guard()` refuses (exit 3) a rebuild whose recorded commit
is not an ancestor of the rebuilding tree's HEAD, with `--allow-older-tree` as a
loud override. Both builders wired to it, gating **before** the `rmtree` and
before the work. `apps/viewer/` banner reports which tree built each projection
and raises alarms. `tests/test_projection_provenance.py`, 15 tests, ancestry cases
run against a throwaway git repo with a real fork in it.

## Verified, by re-running rather than reading

- **Full suite: `323 passed, 1 skipped`** — measured **in the review worktree**
  (`C:\workspace\tolstack-worktrees\viewer_projection_provenance-review`) with
  `C:\workspace\tolstack\venv-win\Scripts\python.exe -m pytest -q`. The skip is
  the known data-dependent test; the main checkout reports one more passed and
  none skipped. Post-merge re-run in `C:\workspace\tolstack` recorded at the end.
- **Viewer suites: `84/84`**, including the `[real]` node-fs tier against the
  main checkout's freshly rebuilt projection (24 crop PNGs all on disk).
- **`git log --oneline HEAD..master`: empty**, checked as the reviewer's last act.
  No sibling landed during the review. One sibling is *live* — see Concurrency.
- **`forge check`**: OK in both the worktree (1 expected vacuous-`data/` warning)
  and `C:\workspace\tolstack`.
- **The projections rebuilt against the main checkout** with both scripts
  (`--data-root C:\workspace\tolstack\data`), the second from drawing-checker's
  venv. Both files now stamped, matching pair, `dirty: false`, `behind_trunk: 0`.
- **drawing-checker read-only**: my own snapshot before/after
  (`scripts/snapshot_drawing_checker.py`, 1628 entries) diffs **EMPTY** across a
  review that ran `build_viewer_crops.py` under drawing-checker's venv twice. The
  author reported no snapshot — for non-stack work the SOP does not demand one,
  and my empty diff over two identical runs is the inductive evidence that theirs
  wrote nothing either. Noted, not held against the branch.

### The definition of done, item by item

| DoD item | verdict | evidence |
|---|---|---|
| Both files carry stacks-dir, branch, HEAD sha, `built_at` | **pass** | read out of `C:\workspace\tolstack\data\projections\viewer\*.json` after rebuild |
| A non-ancestor rebuild **refuses**, demonstrated for real | **pass** | reproduced independently — below |
| Six stacks' computed results **unchanged** | **pass** | key-by-key diff — below |
| Value-level tests for the gate and the new fields | **pass** | 15 tests; the ancestry ones use a real forked repo, not a mocked predicate |
| Full suite green | **pass** | 323/1s |
| Lesson with the subdir recommendation, the convention question, the other-writers audit | **pass, with one correction** | the audit missed a third member — see should-fix 3 |

**The refusal, reproduced independently.** `git worktree add` a throwaway on a
branch off `master`, `git checkout` this branch's `scripts/` into it, commit, run
both builders against `C:\workspace\tolstack\data`:

```
REFUSED: ...\results.json was built by review/viewer_projection_provenance @ d6856bc66581, built 2026-08-11T03:45:41+00:00
         and this tree is review/gate_demo_throwaway @ e6c3be2b2fae, ...
         commit d6856bc66581 is NOT an ancestor of this tree's HEAD, ...
```

Exit 3 from both scripts; `results.json` byte-identical afterwards; `crops.json`
and all 24 PNGs untouched, because the gate runs before the `rmtree`.
`--allow-older-tree` got through and printed `OVERWRITING`. From the newest tree
the rebuild was allowed with `... which this tree already contains -- overwriting
it with a newer build`. The review-worktree tie-break is genuinely mechanised.

**No number moved.** A `master`-built `results.json` against a branch-built one,
flattened to leaves:

```
master-built: 5261 leaves; branch-built: 5272 leaves
added=11 removed=0 changed=1
  +  .provenance.{schema,built_at,built_by,repo_root,stacks_dir,branch,
                 head_sha,dirty,trunk,trunk_sha,behind_trunk}
  ~  .built_at
```

Eleven new `provenance` leaves and the timestamp. Nothing else. `crops.json`:
same shape, 745 leaves either side, `summary` and all 24 resolutions identical.

## The mandatory checks

1. **Every tolerance traces to a spec or drawing callout** — **N/A, and confirmed
   N/A.** No stack JSON, worksheet, `hardware_entries.json` or `materials.json` is
   in the diff (`git diff master...HEAD --name-only`: 5 viewer files, 3 scripts, 1
   test, 2 docs). No `source_ref`, band or `confidence` value is created or moved.
2. **Signs on every path term** — **N/A.** No term list authored or generated; no
   change to `fold()`, `thermal.py`, or `Term`.
   2b. **Coherent material corners** — N/A, no transcription.
3. **LMC/MMC direction** — **N/A.** `fold()` untouched; grepped the diff for
   `lmc`/`mmc`: no hits.
4. **RSS actually computed** — **N/A**, and verified not disturbed: the six
   stacks' `checks` blocks are byte-identical across the old/new projection diff
   above, RSS included.
5. **Nominal inside its own min/max** — **N/A**, same evidence.
6. **Quantised cotter/castellation constraints** — **N/A**, no joint analysed.
   The analogous caveat for *this* work is stated where it belongs: the module
   docstring says outright what the gate does not do (no content comparison; each
   script gates its own file only), and I have hardened that in the overlay.
7. **traced / inferred / untraced ratio** — **re-derived, not copied**, with
   `tests\debug_report_tolerance_stacks.py --ratio`:

   > *3 of 26 element instances across the three seeded slice-1 stacks are
   > `traced`; 7 are `inferred` and 16 are `untraced`.* All six stacks:
   > **19 traced / 11 inferred / 18 untraced of 48 instances.**

   Unchanged by this work, which is the expected and now-verified answer. Non-element
   values (CTEs, temperatures, stiffness ratios) likewise untouched.

## Also verified

- **`PROVENANCE.md`'s byte-identical rows — the diff was run, and it is clean.**
  All 15 imported paths parsed out of the table and matched against
  `git diff master...HEAD --name-only`: **no intersection.** This branch touches
  no imported file, so no row goes false and none needed amending. Second
  consecutive clean pass on the class (first: `readonly_invariant_evidence`),
  though for a weaker reason — this one is clean by not touching the set, not by
  the author running the diff. My own doc fixes (`ARCHITECTURE.md`,
  `apps/viewer/README.md`) are also outside the imported set; re-checked after
  editing.
- **The no-second-combiner rule holds in JavaScript.** `provenanceLine` /
  `provenanceAlarms` / `shortSha` do string concatenation and `slice(0, 12)`.
  No `+` on a projection number, no comparison of tolerances, no `toFixed`, no
  verdict logic. `behind_trunk` is interpolated, never compared to another field.
- **`data/inbox/specs/` not reorganised** — no `data/` path in the diff;
  `git ls-files data/` unchanged.
- **`docs/reference/` untouched.** No `{{` placeholders in the diff.
- **Counts the lesson asserts, recomputed**: `84/84` viewer tests ✓, `24` crop
  PNGs ✓, three occurrences ✓. The lesson quotes **no suite count**, which is the
  right call given how that has aged in this repo. `13 MB per branch` and
  `~30 lines` are measurements of an unlanded scratchpad prototype and are
  reported as such — not independently checkable, accepted as reported.
- **The premise correction is right.** `results.json` *did* record `built_at`,
  `built_by` and `stacks_dir` from `5a7b72e`, the original viewer commit — checked
  the blob. The handoff and the issue both said otherwise. The real defect, as the
  lesson states, is that `stacks_dir` was repo-**relative** and therefore the same
  string in every worktree. That correction is the most valuable paragraph in the
  lesson, and the generalisation — *a provenance field that cannot differ between
  the things it distinguishes is not provenance* — is worth keeping.
- **The file fence held.** `apps/viewer/viewer.js`'s `resolved_by` branches and
  the crop-hover text are untouched (`git diff` on that file is two new functions
  appended plus one comment block). No overlap with the staged
  `viewer_source_ref_export_label`.

## Findings

### Blockers

None.

### Should-fix — 1 and 2 fixed inline (commit `519064f`), 3 corrected + filed

**1. `dirty` was `true` on every build from the main checkout, so the viewer's
alarm box was permanently lit.** `scripts/projection_provenance.py:126`,
`stamp()`. `git status --porcelain` counts untracked files, and the main checkout
permanently carries an untracked `.dispatch.toml` (dispatch writes it there; it is
not gitignored). So the *documented canonical invocation* stamped `dirty: true`,
which the banner renders as two red alarm rows — "results was built from a tree
with uncommitted changes, so `a13601a3b3f0` does not identify the code that ran",
and the same for crops — on a tree where nothing was wrong. Invisible from a
worktree, where that file does not exist. This is the author's own stated failure
mode ("an alarm a reader cannot act on is an alarm they learn to ignore") arriving
through the environment rather than through the code.
*Fixed inline*: `--untracked-files=no`, so `dirty` means *tracked content differs
from `head_sha`* — which is the claim the field is actually used to make — with
`test_an_untracked_file_alone_does_not_make_a_tree_dirty` pinning both
directions, so the flag is not merely switched off. Verified: the main checkout
now stamps `dirty: false`.

**2. The pair-mismatch alarm overclaimed.** `apps/viewer/viewer.js`,
`provenanceAlarms`. It said differing shas mean "the two halves of this page do
not describe the same stacks". They may well: `apps/viewer/README.md` tells you to
re-run step 1 alone after editing a stack, and once you commit that edit the pair
disagrees while the crop index is perfectly current — an *ancestor* build, the
ordinary case. The page cannot run git, so it cannot tell that from divergence.
*Fixed inline*: the alarm stays and now says what the data proves — "they may not
describe the same stacks … it cannot tell the ordinary case (crops built from an
ancestor, still current) from two divergent trees". The structural fix, if the
alarm proves noisy, is that `build_viewer_projection.py` *can* run git and could
stamp the neighbour's ancestry as a fact; deliberately not done here — new field,
schema one handoff old — and recorded in the issue.

**3. The other-writers audit found two members; there are three.** The DoD asked
whether any other script writes to a shared `data/` path. The lesson audited
`scripts/` + `tests/` "for writers with a `--data-root`-style default" and
concluded "exactly two members". `tolerance_stack/spec_library.rebuild()` is a
third: `python -m tolerance_stack` wipe-and-rebuilds
`data/projections/spec_library/library.json`, `main()` takes **no arguments at
all** (hence no `--data-root` for the grep to find), so from a worktree it writes
that worktree's throwaway `data/` — reproduced — and from the main checkout it is
last-writer-wins on a file carrying **no `built_at`, no `built_by`, no stamp of
any kind**. It is also the higher-leverage projection: `library.json` is what
`library_ref: "spec_library:NAS6403U11D"` resolves through, so a stale value
there launders into a stack wearing `traced`. Content currently matches a fresh
rebuild (checked), so nothing is wrong today.
*Handled*: the lesson section corrected in place with a dated correction
blockquote and the third member described; filed as
`docs/issues/ISSUE_20260810_the_spec_library_projection_is_the_third_shared_writer.md`
(`med`). The generalisation, now a checklist item: **enumerate an audit by what
its members do, not by the flag they accept** — grepping for the shape of the
members you already know finds only those.

**4. Documentation did not catch up with a durable operational fact.** *Fixed
inline.* `ARCHITECTURE.md`'s hand-written `scripts/` inventory gained
`projection_provenance.py` — and `snapshot_drawing_checker.py`, which had been
missing from that same block since `readonly_invariant_evidence` landed, so two
handoffs walked past it. `apps/viewer/README.md` still promised the banner only
tells you *when* a projection was built, and said nothing about a build that can
now exit 3; it gained a short "If a build refuses (exit 3)" section naming
`--allow-older-tree`. A rule that can stop a documented command has to live where
the command is documented, not only in a script docstring and a lesson.

### Nits

- `scripts/build_viewer_projection.py:602` builds its refusal's suggested command
  as bare `python scripts\build_viewer_projection.py`, while the crops script
  names drawing-checker's venv in full. Everything else in this repo spells out
  `venv-win\Scripts\python.exe`. Left alone — the message's job is done and the
  reader is an agent with a prompt that spells it out — but it is the one line in
  a very carefully written refusal that a reader could paste and have fail.
- `tests/test_projection_provenance.py`, `dangling_commit()` runs
  `git commit-tree` in the **real** repo, so each suite run leaves one unreachable
  loose object in the shared `.git`. Documented in the function's docstring,
  touches no ref/index/worktree, and `gc` prunes it. Worth knowing it is the one
  test in this suite that writes outside `tmp_path`; the alternative (a throwaway
  repo, as the ancestry tests use) would not exercise `main()` against the real
  `REPO_ROOT`, which is the point of that test.
- `guard()` is silent when `theirs == ours`. Correct, and it means two builds from
  one sha with different uncommitted edits overwrite each other quietly.
  `provenance.dirty` is the only tell, which the module says plainly — recorded so
  the next reviewer does not re-derive it.

## Concurrency

`git log --oneline HEAD..master` empty at the end of the review; nothing landed
underneath me. One sibling is **live**: `handoff/provenance_byte_identical_test`
(+ its review worktree), which mechanises `PROVENANCE.md`'s byte-identical rows.
Checked for a real collision:

- **File overlap: one file, `docs/prompts/REVIEW_AGENT.md`** — this overlay, which
  both reviews are required to edit. Both edits are additive and in different
  sections; whoever merges second resolves a text conflict, not a semantic one.
  Mine landed first.
- **Their `tests/test_provenance.py` derives every watched path from
  `PROVENANCE.md` itself** rather than hardcoding a list, so my two new files
  (`scripts/projection_provenance.py`, `tests/test_projection_provenance.py`) and
  my two doc edits are outside its scope and cannot make it fail. Verified by
  reading its parse, not by assuming.
- **The gate will refuse that reviewer's rebuild** of the shared projection until
  they merge `master`, because their tree predates this work. That is the gate
  working as designed, the message tells them what to run, and the author's lesson
  already flags it. Worth a sentence in the merge note.

The issue stays **`open`**, and the author is right about why: the gate protects
only trees that have merged it, and two live worktrees still run the gate-less
script. I appended a reviewer's note recording the verification, the two residual
gaps, and that reasoning.

## Note for the next reviewer

Read the new overlay entries before you review viewer or projection work:
**a new warning that is always on** (evaluate it on a clean tree in *both*
checkouts — `.dispatch.toml` is the named footgun), **a new file in `scripts/`
with an unchanged `ARCHITECTURE.md` inventory**, and **an audit enumerated by flag
rather than by behaviour**. The "under concurrency, YOU rebuild" entry has been
rewritten: the tie-break is the machine's now, so **a refusal (exit 3) is the gate
working** — read it, rebuild from the tree it names, and keep
`--allow-older-tree` for when overwriting a newer projection is what you mean. The
two things the gate still cannot see are content (same sha, different dirty edits)
and the pair (`results.json` vs `crops.json` gate independently).

## Post-merge

- Merged to `master` (fast-forward), pushed to `origin/master`.
- Suite re-run in the **main checkout** after the merge: recorded in the merge
  note below.
- `handoff/viewer_projection_provenance` worktree and branch removed;
  `review/viewer_projection_provenance` branch deleted after the merge. This
  review worktree cannot remove itself (Windows locks a live process's CWD) —
  dispatch removes it at Complete.
