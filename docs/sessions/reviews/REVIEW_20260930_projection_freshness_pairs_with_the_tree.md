---
type: review
handoff: docs/sessions/active/HANDOFF_20260930_projection_freshness_pairs_with_the_tree.md
reviewer: agent
date: 2026-09-30
verdict: REQUEST CHANGES
blockers: 2
---

# REVIEW 2026-09-30 — projection_freshness_pairs_with_the_tree

Branch `handoff/projection_freshness_pairs_with_the_tree` (3 commits, tip
`03ef162`), merged into `review/projection_freshness_pairs_with_the_tree`
(fast-forward off `integration` @ `fbbba37`) **for verification only — the merge
to `integration` is NOT made, see the verdict.**

## Short version

The design is right and the hard parts are done well. Arm 3 was implemented as a
real derivation rather than a second hand list, the false-alarm fence is
respected almost everywhere, the claim now lives in one header instead of three
places that disagreed, and deliverable 3's preflight is a genuinely good idea
(it computes the `SHADOWED` trap instead of remembering it). The lesson is one of
the more useful ones in `lessons/` — the `.gitignore` finding in particular is
the sort of thing that would have cost the next author a day.

Two things send it back, and both are the same shape as the defect the handoff
existed to fix — a claim written next to code that does something else:

1. The preflight's **refusal arm crashes** before it prints the half of its
   message that tells you what to do. Its own mutation witness reports
   `WITNESSED` over the crash, so nothing in the tree can see this.
2. The derived input set **silently drops `built_by`** when the builder file
   cannot be read, so a renamed or deleted builder now reads *paired with this
   tree* where the pre-work hand list caught it. That is a coverage regression
   introduced by arm 3.

## What I verified, and how

**The defect reproduces pre-work.** On `integration` @ `fbbba37`, with the main
checkout's projection borrowed through `--repo`:

- arm 1: `docs/tolerance_stacks/stack_zzz_probe.json` dropped in →
  `projection paired with this tree: results.json @ fbbba37ab8e7, ...`, 516/516.
- arm 3: `SCHEMA_PROVENANCE` bumped to `/v1` in `scripts/projection_provenance.py`
  → `projection paired with this tree: ...`.

**All three arms bite post-merge.** Same probes, through the new module:

- arm 1 → `results.json`/`crops.json` named, `1 untracked file(s) sit in its
  input directories`, and the tier reports
  `FAIL  [real] the projection this tier reads was built from this tree` /
  `SKIP  node-fs tier` / `422/423 passed, 1 TIER SKIPPED -- NOT RUN, NOT PASSED`.
- arm 3 → all three projections named, `1 of its input file(s) differ in this
  tree: scripts/projection_provenance.py`.
- arm 2 (dirty stamp) is covered only by the synthetic fixture — I did not forge
  a stamp in the shared `data/`, deliberately.
- clean tree → `projection paired with this tree: results.json @ fbbba37ab8e7,
  topologies.json @ fbbba37ab8e7, crops.json @ fbbba37ab8e7`.

**The two mutation witnesses this change owns, run against the main checkout's
data:** `fast__real-the-projection-...__ea8930ee` 2/2 WITNESSED (both arms
redden `[real] the projection this tier reads was built from this tree`);
`python__test-the-mutation-shadow-covers-...__fecc0838` 1/1 WITNESSED. Clean
runs green in both, so the `.gitignore` addition to `SHADOWED` does hold.

**The preflight,** `node scripts/run_mutation_witness_tests.mjs
--check-shadow-covers-projection-inputs --repo C:/workspace/tolstack`:
`SHADOWED covers all 7 input path(s)` — `docs/tolerance_stacks`,
`docs/topologies`, `scripts/build_topology_projection.py`,
`scripts/build_viewer_crops.py`, `scripts/build_viewer_projection.py`,
`scripts/projection_provenance.py`, `tolerance_stack`. Exactly the set the
lesson names. With no `--repo` it prints the "no stamped projection" note and
exits 0, which is the honest answer from a worktree.

**The `ARCHITECTURE.md` row is load-bearing:** cutting the
`projection_freshness.cjs` block reddens
`test_architecture_inventory.py::test_the_block_inventories_every_module_in_the_directories_it_lists`.

**`DECLARED_GUARDS` / `scripts/guard_enumeration.mjs` untouched**, as the handoff
fenced. The sibling handoff's files are not in this diff.

**No pollution.** `data/projections/viewer/` mtimes unchanged (13:34-13:35), main
checkout `git status` clean, review worktree clean apart from my own committed
artifacts.

### Test cadence

**The tactical record does not include a full-suite run**, so the benefit of the
doubt is void and I ran the full suite on **both** sides of the merge. The lesson
records the node tiers it could and could not run and is explicit about the
browser sweep, which is good; it says nothing at all about `pytest -q`, which the
DoD asked for. Next time, record the command, the checkout and the counts.

- Pre-merge, full suite, review worktree: **1 failed, 1243 passed** in 40.6s.
- Post-merge, full suite, review worktree: **1 failed, 1254 passed** in 51.5s
  (+11 = every test in `tests/test_projection_freshness.py`, all green).
- The one failure is the same on both sides and is the documented worktree
  condition: `test_viewer_js_suite.py::test_viewer_js_suite_is_green`, node-fs
  tier SKIPPED because `data/` exists only in the main checkout. Armed the way
  the overlay says instead: `node apps/viewer/run_tests.cjs --repo
  C:/workspace/tolstack` → **516/516 passed** with the `[real]` tier running.
- Risky subset rows matched (overlay "Choosing the risky subset"): *a guard, a
  witness, or `scripts/mutation_witnesses/`*; *`apps/viewer/`*; *Python under
  `tests/`*; *`ARCHITECTURE.md`*; *prose in a tracked document, including this
  file*. Pre-merge I ran `test_mutation_witnesses.py
  test_architecture_inventory.py test_claims_registry.py
  test_projection_provenance.py` → 83 passed, then the full suite above.
- **Not exercised here:** the browser tier and the browser entries of the
  mutation registry (`node_modules/playwright-core` is gitignored and exists only
  in the main checkout), and the full mutation sweep. This diff touches no CSS
  and nothing positional, so the overlay does not put the browser tier in the
  subset; the full sweep is still the batch merge's, in `CLAUDE.md`'s order
  (rebuild the projections **first**).
- No new pytest-level skips (`-rs` is empty).
- The diff shape matched no existing risky-subset row for `scripts/*.cjs` test
  tooling; I added one rather than leaving the derivation unwritten (see
  "Overlay updated").

## Blockers

### B1 — the preflight's refusal arm crashes in the temporal dead zone

`scripts/run_mutation_witness_tests.mjs:279`, reached from the module-scope early
exit at `:289-291`.

`reportShadowGaps()` prints `JSON.stringify(MISS.TIER_ALREADY_RED)` in its
**refusal** branch, and `const MISS` is declared at `:370`. The
`--check-shadow-covers-projection-inputs` block calls that function at module
scope, above the declaration, so on the only arm that matters:

```
REFUSED: the mutation shadow would not hold 1 of the 7 input path(s) the viewer
tier's freshness check names:
  tolerance_stack
...
ReferenceError: Cannot access 'MISS' before initialization
    at reportShadowGaps (.../scripts/run_mutation_witness_tests.mjs:279:23)
```

Everything after the first two lines is lost — the paragraph explaining that git
reads the path as a deletion, and the line that says *add it to `SHADOWED` in
this file*. The success arm touches no constant, which is why this shipped: it is
the one path that was run. The in-run call (`:520`, before `buildShadow()`)
executes after module init and does print the whole message; verified by reaching
it with `--only`.

Two reasons this is a blocker and not a nit:

- It is deliverable 3's advertised surface. The lesson calls it "askable in one
  second"; the overlay entry the author added to the reviewer checklist tells the
  *next reviewer* to run exactly this command and says it "refuses in under a
  second, naming the path". What it actually does is name the path and then print
  a node stack trace where the remedy goes — a raw diagnostic in place of
  reader-facing copy.
- **Its own mutation witness cannot see it.** The spec's `note` claims "what the
  mutation changes is the runner's own answer to
  `--check-shadow-covers-projection-inputs`", and the mutation run reports
  `WITNESSED` — because the pytest guard asserts `returncode == 0` and a crash
  exits non-zero too. I reproduced this: drop `["tolerance_stack"]` from
  `SHADOWED` and the witness is green over a broken message.

Fix: move the early-exit block below `const MISS` (or the declaration above the
block), **and** cover the refusal arm — the guard's failing branch currently has
no test asserting what it prints, which is why one line of module ordering was
enough to break it silently. I have not fixed this inline: it is a logic defect
and the fix wants a test, so prongs 1 and 2 of the inline-fix boundary both fail.

### B2 — a renamed or deleted builder now reads "paired with this tree"

`scripts/projection_freshness.cjs`, `inputsOf` / `importClosure`.

Pre-work, `inputsOf` did `inputs.push(stamp.built_by)` **unconditionally**. The
derived version calls `importClosure(treeRoot, stamp.built_by)`, and
`importClosure` does `if (source === null) continue;` — so when the entry file
cannot be read in the tree under test, `out` is empty and `built_by` is not in
the input set at all. Measured on the merged tree, against the main checkout's
projection:

```
$ mv scripts/build_viewer_projection.py scripts/build_viewer_projection_RENAMED.py
$ node scripts/projection_freshness.cjs --repo C:/workspace/tolstack --tree . --inputs
docs/tolerance_stacks
docs/topologies
scripts/build_topology_projection.py
scripts/build_viewer_crops.py
scripts/projection_provenance.py
tolerance_stack
$ node scripts/projection_freshness.cjs --repo C:/workspace/tolstack --tree .
projection paired with this tree: results.json @ fbbba37ab8e7, ...   # exit 0
```

`results.json`'s builder is not in the tree and the check says paired. The old
path list caught it — same tree, the pre-work pathspec reports the deletion:

```
$ git --no-optional-locks diff --name-only fbbba37 -- docs/tolerance_stacks \
      scripts/build_viewer_projection.py tolerance_stack
scripts/build_viewer_projection.py
```

Note the second-order loss in the same run: `topologies.json` imports
`build_viewer_projection`, so that projection's closure quietly narrows too. The
`missing`-from-the-work-tree arm catches neither, because a path that left the
input set is never checked for presence.

The lesson does say "the closure is walked in the work tree under test, so a
PARTIAL tree narrows it silently" and points at the preflight as the cover. That
is true for the `SHADOWED` coupling and not for this: the preflight derives from
the *full* checkout, so it has nothing to say about a builder renamed on a branch
under test. A rename is also exactly the change most likely to alter what a
rebuild writes.

Fix shape: keep the unconditional seed **and** the closure —
`inputs.add(stamp.built_by)` before walking it — so an unreadable entry surfaces
through the existing `missing` arm or the diff instead of leaving the set. Worth
a test in `tests/test_projection_freshness.py`; the synthetic fixture already has
everything needed (delete `BUILDER`, assert not fresh).

## Should-fix

### S1 — question 4 is asked of derived package directories, where the module's own comment says it need not be

`scripts/projection_freshness.cjs`, the `dirs` filter in `projectionFreshness`.

The untracked-file question is asked of every **directory** in the input set. Two
different things are directories there: the stamp's globbed source directory
(`docs/tolerance_stacks`, which `stacks_dir.glob("stack_*.json")` really does
pick a new file up from) and a package directory the closure derived
(`tolerance_stack`). For the second, the module's own comment gives the reason it
does not need asking — "a new module becomes an input only when some tracked file
starts importing it, and that edit is in the diff above" — and then asks anyway.
Measured:

```
$ echo "X=1" > tolerance_stack/zzz_scratch.py
$ node scripts/projection_freshness.cjs --repo C:/workspace/tolstack --tree .
  - results.json ..., 1 untracked file(s) sit in its input directories ...
  - topologies.json ...   - crops.json ...
```

One untracked scratch file that nothing imports takes all three projections stale
and the `[real]` tier out of the run, and the remedy the message prints is
*rebuild the projections* — right for the globbed directory, wrong here. The
equivalent file one directory over (`scripts/zzz_scratch.py`) is correctly quiet,
which is the asymmetry showing this is the package-directory half. This is the
false-alarm direction the handoff fenced ("Direction matters more than
coverage"), so it belongs with the rework rather than in an issue: either ask
question 4 only of stamp-named directories, or keep it and say in the header why
a package directory is asked too. Related latent edge: adding a
`scripts/__init__.py` would make `packageOf` collapse the three builder files
into the whole `scripts/` directory and put every untracked file there in scope.

### S2 — the lesson's "three files" is topologies.json's set, not the net

`docs/sessions/lessons/LESSONS_20260930_projection_freshness_pairs_with_the_tree.md`,
"Arm 3: I implemented it...": "arm 3 *added* three `scripts/*.py` files" / "Net
false-alarm surface: three files that genuinely change what a rebuild writes."

The union input set went from **6 paths to 7**. `build_viewer_projection.py` and
`build_viewer_crops.py` were already in it as `results.json`'s and `crops.json`'s
own `built_by`; the one path the closure added that is in no stamp is
`scripts/projection_provenance.py` — which is also the one the lesson itself
calls "the sharpest of them". Three is right for *`topologies.json`'s* own set
and wrong for the net, and the diagram's annotation ("derived — none of these is
in any stamp") is false for two of the three rows it covers. A dated correction
blockquote is enough; the number will be quoted forward by whoever picks up the
where-should-it-live issue.

## Nits

- **Two em-dashes survived in `scripts/projection_freshness.cjs`** (`:337`,
  `:351`, in the `git could not...` and `carries no provenance stamp` arms) where
  every other one in both touched files was deliberately converted to `--`. Both
  sit on arms no test covers, so they are the two a Windows console would
  mojibake unnoticed. Left for the rework rather than fixed inline, since the
  file is being reopened anyway.
- **`flag()` in the CLI does `path.resolve(argv[at + 1])`** with no check that a
  value follows, so a trailing bare `--repo` throws a `TypeError` instead of
  saying what it wanted.
- **`from . import x` resolves to nothing** in `candidates()` (`name` is empty
  after the dot-stripping, and the function returns `[]`). No builder uses that
  form today, so this is a note rather than a defect — but the closure is
  advertised as the derivation that replaces a hand list, and this is one form it
  cannot see.
- **The tactical agent edited `docs/prompts/REVIEW_AGENT.md`**, the reviewer's
  overlay, which the canonical process assigns to the review agent. The content
  is accurate — I checked both rewritten entries against the code — and leaving
  the old text in place would have left a now-false entry on the checklist, so
  this is the better of the two mistakes. Flagging it because the author was also
  documenting their own work on the instrument used to review it, and one of
  those two entries is what advertises the command in **B1**.

## Overlay updated

Committed on the review branch (`docs/prompts/REVIEW_AGENT.md`):

- **Recurring bugs:** a module-scope `if (process.argv.includes(...))
  process.exit(f())` runs in the TDZ of every `const` below it — success arm
  passes, refusal arm crashes, and a mutation witness reports `WITNESSED` over it
  (B1).
- **Recurring bugs:** replacing a hand-written path list with a derived one drops
  what the list asserted unconditionally (B2), with the measured repro.
- **Recurring bugs:** a freshness/glob question asked of a derived directory
  input rather than only the one a builder globs (S1).
- **Choosing the risky subset:** a new row for test tooling under
  `scripts/*.cjs` / `*.mjs` that a harness `require`s — run every CLI flag the
  file exposes on its **failing** arm, not only its green one.

## Verdict

**REQUEST CHANGES** — 2 blockers (B1, B2), plus S1 and S2 to land in the same
pass. Nothing is merged to `integration`; the handoff branch and both worktrees
are left in place. The verification merge lives only on
`review/projection_freshness_pairs_with_the_tree`.

For the next reviewer: the probes in "What I verified" are cheap and repeatable
from a worktree (`--repo C:/workspace/tolstack`), and B1's repro is one `sed` on
`SHADOWED` plus the standalone flag. Re-run the two mutation entries this change
owns after the fix — and read their **output**, not their verdict, because B1 is
the case where the verdict lies.
