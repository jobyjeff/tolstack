# LESSONS 2026-09-30 — projection_freshness_pairs_with_the_tree

Handoff: `docs/sessions/active/HANDOFF_20260930_projection_freshness_pairs_with_the_tree.md`
(from `ISSUE_20260924_the_projection_freshness_pairing_reads_tracked_head_content_only`).
Branch `handoff/projection_freshness_pairs_with_the_tree`, cut from `integration`
at `fbbba37`.

## What the check now says, and what it does not

This is the thing to read if you touch it, because the original defect here was
**a true check with an overreaching description** and leaving a new overreach
behind would have repeated it. The claim now lives in exactly one place — the
header of `scripts/projection_freshness.cjs` — as a list of questions put to git
plus a list of what is outside them. `apps/viewer/run_tests.cjs` points at it
and deliberately does not restate it.

**Asked:** is the stamped commit in this tree; was the stamping tree `dirty`; do
the inputs' tracked files still match that commit; does **the source directory
the stamp names** — the one a builder globs, and only that one — hold an
untracked file a rebuild would read.

**Not asked, and not close:** a builder's **gitignored** inputs
(`build_viewer_crops.py` reads the datasheet pile under `data/inbox/specs/` —
replace a PDF in place and every crop changes while git sees nothing); anything a
builder reads by path rather than imports; the builder's environment. Filed as
`ISSUE_20260930_projection_freshness_cannot_see_a_builders_gitignored_inputs.md`
with `audience: strategy`, because the cheap fix (hash the pile into the stamp)
reddens every existing crop projection on an **append**, which is the one thing
that append-only directory is for. That is the false-alarm failure
`projection_provenance.py` already wrote down, so it is a decision about
evidence rather than an implementation.

## Arm 3: I implemented it, and it cost one path, not three

> **Corrected 2026-09-30, in review.** This section first said arm 3 "added
> three `scripts/*.py` files" and called that the "net false-alarm surface",
> and the diagram annotated all three as "in no stamp". Both are wrong: three
> is *`topologies.json`'s own* set, and two of those three were already inputs
> as `results.json`'s and `crops.json`'s `built_by`. The union went from **six
> paths to seven**. The numbers below are the corrected ones; the number was
> worth correcting because it is the one a reader quotes forward when they
> weigh widening this check again.

The handoff allowed declining arm 3 with a reason, on the grounds that an
over-wide input set is where this change would start crying wolf. It turned out
not to be the trade-off it looked like, and that is worth knowing before anyone
re-litigates it.

The pre-existing input set was, per projection, `[stamp's source dir, stamp's
built_by, "tolerance_stack"]` — and that last entry was a **hand-written whole
directory**. Deriving the closure from the builder's own imports replaced it
with:

```
docs/tolerance_stacks   (stamp: results, crops)    docs/topologies  (stamp: topologies)
scripts/build_topology_projection.py   (built_by: topologies)
scripts/build_viewer_projection.py     (built_by: results;  derived for topologies)
scripts/build_viewer_crops.py          (built_by: crops;    derived for topologies)
scripts/projection_provenance.py       (derived for all three -- in NO stamp)
tolerance_stack                        (derived: the PACKAGE, because __init__ runs)
```

So the union grew by exactly one path, `scripts/projection_provenance.py`, and
that is the sharpest one available: it is no projection's `built_by` and every
builder's import, and it is the module that writes the stamp. What arm 3 mostly
did was make each projection's set *right* — `topologies.json` picked up the two
sibling builders it imports, which is the measured defect the issue named.

And it **did not** add `scripts/` as a directory. A tracked file in `scripts/`
that no builder reaches — there is one in the fixture on purpose — cannot redden
the tier, which is what a hand-extended `tolerance_stack`-shaped input would
have implied.

Three implementation notes on the closure, since it is a static reader:

- **It reads source text, not a real interpreter, and that is deliberate** —
  `venv-win/` exists only in the main checkout, which is the situation a tier is
  most often run from a worktree to escape. A module name that resolves to no
  file at either end (`import fitz`) is dropped, so a false positive out of a
  docstring costs nothing.
- **A package is named as a directory, not as the one module that resolved.**
  `tolerance_stack/stack.py` resolving means `tolerance_stack` is the input:
  `__init__.py` runs on import and siblings are reachable by attribute. "Is
  this a package?" is answered by looking for `__init__.py`, so no package name
  is written down. Known consequence, in the header rather than special-cased:
  an `__init__.py` in `scripts/` would collapse the three builder files into
  the whole directory.
- **The closure resolves imports against `<sha>`'s tracked listing UNION the
  work tree, and that union is load-bearing.** See the next section — it is the
  half of the review's B2 that was not in the review.

## What review sent back, and the two things worth carrying forward

`REVIEW_20260930_projection_freshness_pairs_with_the_tree.md` returned this with
two blockers, and both are the same shape as the defect the handoff existed to
fix — **a claim written next to code that does something else.** The fixes are in
the tree; these are the generalisations.

### A derived set drops what a hand list asserted unconditionally

The review's B2: replacing `inputs.push(stamp.built_by)` with "walk the closure
starting at `built_by` and keep what comes back" lost the `built_by` assertion,
because the walk reads files and an unreadable entry contributes nothing. A
projection whose builder had been **renamed** read *paired with this tree*,
where the hand list it replaced caught it as a deletion. That is the whole
hazard of turning a list into a derivation in one step: the list's *floor* is
invisible in the diff.

Fixing only the measured site would have left the same false green one site over,
so I went looking for the class and found it: **rename
`scripts/projection_provenance.py`** — no projection's `built_by`, every
builder's import — and before this pass all three projections went quiet. So the
fix is not just "seed `built_by`", it is that the closure now resolves imports
against **`<sha>`'s tracked listing union the work tree** (`treeAt`), one
`ls-tree` per commit plus a `git show` only for files the work tree does not
have. A module that was local at *either* end stays in the set, where the diff
reports its disappearance; `import fitz`, local at neither, stays invisible,
which is what keeps the alarm off. That union also retired a caveat this lesson
used to carry — the closure no longer narrows silently against a partial work
tree, because `<sha>`'s listing is in the object database whatever the work tree
holds.

### A question asked of the wrong half of a derived set

The review's S1: question 4 (untracked files) was asked of every *directory* in
the input set, and two different things are directories there — the source
directory a builder really does glob, and a **package** the closure derived. The
module's own comment gave the reason a package needs no asking and then asked
anyway. One untracked scratch file in `tolerance_stack/` took all three
projections stale and printed *rebuild the projections* as the remedy. Asked of
the stamp-named directories only now, and both halves have a test: the same file
in `docs/tolerance_stacks/` must stay loud, in `tolerance_stack/` must stay
quiet.

## The SHADOWED coupling did not cost me a red clean run — because of a file nobody would think to copy

The handoff said this would bite and to check `SHADOWED` in the same change. It
did bite, but not on the path list. Every path the derived input set names is
already inside `SHADOWED` (`docs/tolerance_stacks`, `docs/topologies`,
`scripts/`, `tolerance_stack`), so widening the set cost nothing there.

**What it cost was `.gitignore`.** Arm 1 asks
`git ls-files --others --exclude-standard`, and **git reads exclude patterns out
of the work tree**. The shadow is a work tree (`--work-tree=<shadow>`, which is
what makes this guard witnessable at all) and `SHADOWED` copies only
directories — so the shadow had no ignore rules at all, and in the **main
checkout** that means:

```
$ git ls-files --others -- tolerance_stack     # i.e. without --exclude-standard
tolerance_stack/__pycache__/__init__.cpython-313.pyc
tolerance_stack/__pycache__/feature_identity.cpython-313.pyc
... 7 files
```

Seven `.pyc` files reading as untracked input drift: the freshness check red on
the **clean** run, and `TIER_ALREADY_RED` for every `fast` witness after it. The
fix is `[".gitignore"]` in `SHADOWED`, so the shadow answers git the way the
checkout it was copied from does.

**And it would not have shown up in my worktree.** This worktree has no
`tolerance_stack/__pycache__` (nothing has imported the package from here with a
writable cache), so the clean run was green either way. I found it by asking the
main checkout the question above, not by running the tier. **If you widen this
check again, ask git about the MAIN CHECKOUT's ignored files, not your
worktree's** — the worktree is the quieter of the two trees and the mutation
tier is meant to run in the other one.

## Deliverable 3 is a preflight, and it is askable in one second

`node scripts/run_mutation_witness_tests.mjs --check-shadow-covers-projection-inputs --repo <main checkout>`
derives the input set from the full checkout and holds it against `SHADOWED`,
printing the path and the consequence when it does not fit. The slow run does
the same check before it builds the shadow (a table defect, so it stops the run
rather than counting misses), and `tests/test_projection_freshness.py` runs it
so `pytest -q` answers in seconds instead of after a browser sweep. It is
enrolled: the python-tier spec drops `["tolerance_stack"]` from `SHADOWED` —
the entry the closure *derives*, which is the shape the failure actually takes
(nobody deletes a `SHADOWED` line; a builder grows an import and the derived set
reaches past the list).

Its honest limit, which is in the review prompt too: it covers **one** guard's
path set. A different git-reading guard still has to be checked against
`SHADOWED` by hand.

### And its refusal arm crashed for one commit — read this before you add a flag like it

**A module-scope `if (process.argv.includes(...)) process.exit(f())` runs during
module initialisation, so every `const` declared below it is in its temporal
dead zone.** `reportShadowGaps` names `MISS.TIER_ALREADY_RED`, and only on its
**refusal** arm. Placed above `const MISS`, it printed the path and then
`ReferenceError: Cannot access 'MISS' before initialization` exactly where the
remedy goes — a node stack trace in place of reader-facing copy, on the one
surface this lesson and the reviewer checklist both advertise.

Three things about it are worth more than the fix (the block now sits below
`MISS`, and its position is commented as load-bearing):

- **The success arm touches no constant, so the path that was run was the path
  that worked.** An early-exit flag has two arms and only one of them is the
  reason the flag exists.
- **Its own mutation witness reported `WITNESSED` over it**, because the pytest
  guard asserted `returncode == 0` and a crash exits non-zero just like a
  refusal does. *A verdict built on an exit code cannot tell refusing from
  dying.* Both arms now assert on what is **printed**, and the discriminator is
  the last paragraph — the one emitted after the reference that threw.
- **Reaching the refusal arm needed no edit to `SHADOWED`** (the thing under
  test). A doctored data root whose stamp points `stacks_dir` at
  `docs/reference/` — a real directory `SHADOWED` does not copy — produces a
  gap, because the source directory is found by *shape*. That trick is worth
  remembering for anything else that refuses on a derived set.

## Extractability, and the issue that asks where this belongs

`ISSUE_20260924_other_real_tiers_still_read_the_shared_projection_untested_for_freshness`
was **`status: deferred`, `defer_until: class:fixed_at_one_of_n_sites`** when I
started — open, not staged, nobody assigned. Per the handoff I kept the change
shaped so it can move, and the cheapest way to do that turned out to also be the
only way to test arms 1 and 2 at all: the check is a **module with a CLI**
(`scripts/projection_freshness.cjs`), not a function inside a harness that runs
a whole suite on load. So `apps/annotate/run_tests.cjs` is a `require` away and
the two Python consumers can shell out to `--json`; the decision that issue
exists for is untouched, but neither option now starts with an extraction. I
appended a dated update block to that issue saying so, and left its frontmatter
alone — dispositions are triage's.

## Two things about testing this that were not obvious

- **Every interesting answer is a negative, and producing one in this checkout
  means dirtying it — or worse, overwriting `data/projections/viewer/`, which
  every live worktree shares.** So `tests/test_projection_freshness.py` builds a
  small git repo in `tmp_path`, writes a provenance stamp into it by hand, and
  asks the real check about it. Each arm is paired with its **quiet twin** (a
  gitignored `.pyc`, an edit to a module nothing imports, `dirty: null`) because
  the constraint on widening this check is direction, not coverage, and a test
  suite that only proves the reds would not notice an alarm that is always on.
- **The one probe worth running against the real tier is the review's own.**
  Dropping `docs/tolerance_stacks/ZZZ_probe.json` into the worktree was measured
  at *"paired with this tree, 516/516"* on 2026-09-24; it now prints
  `FAIL [real] the projection this tier reads was built from this tree` naming
  the file, with the `[real]` tier skipped behind it. It takes ten seconds and it
  is the arm a synthetic fixture can most easily be wrong about.

## What I ran, and what I could not run here

The review pointed out that the first version of this lesson recorded the node
tiers and said nothing about `pytest -q`, which the definition of done asked
for — so the reviewer ran the full suite on both sides of the merge rather than
taking the branch on trust. Recorded properly this time, from the runs' own
output:

| command | where | result |
| --- | --- | --- |
| `venv-win/Scripts/python.exe -m pytest -q` | this worktree | 1 failed, 1260 passed (~75s) |
| `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | worktree source, main-checkout data | 516/516 passed |
| `node scripts/run_mutation_witness_tests.mjs --only fast__real-the-projection --repo <main>` | this worktree | 2/2 witnessed, clean run green |
| `node scripts/run_mutation_witness_tests.mjs --only python__test-the-mutation-shadow --repo <main>` | this worktree | 1/1 witnessed, clean run green |
| two unrelated entries (one `fast`, one `annotate`) | this worktree | 1/1 each |

The one pytest failure is `test_viewer_js_suite.py::test_viewer_js_suite_is_green`
— the deliberate worktree red `CLAUDE.md` documents, because `data/` exists only
in the main checkout. It is the same failure before and after this change, and
the row above it is that tier armed the way the module's own message says to arm
it.

## What I could not run here

`node scripts/run_viewer_browser_tests.mjs` and the **browser entries** of the
mutation sweep need `node_modules/playwright-core`, which is gitignored and
exists only in the main checkout — node resolves it by walking up from the
running script, and nothing above a worktree has it. I ran the three witnesses
this change owns plus one unrelated `fast` and one `annotate` entry to prove the
shadow still works for them (the `.gitignore` addition changes what the shadow
holds, so that was worth a spot check). The browser tier reads no file this
change touches — only the fast harness moved — but that is an argument, not a
run. **The batch merge still owes the full sweep from the main checkout**, in the
order `CLAUDE.md` gives: rebuild the projections first, then the three node
tiers.
