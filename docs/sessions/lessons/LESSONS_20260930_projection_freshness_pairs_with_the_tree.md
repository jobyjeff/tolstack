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
the inputs' tracked files still match that commit; does an input **directory**
hold an untracked file a rebuild would glob in.

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

## Arm 3: I implemented it, and it made the input set *narrower*, not wider

The handoff allowed declining arm 3 with a reason, on the grounds that an
over-wide input set is where this change would start crying wolf. It turned out
not to be the trade-off it looked like, and that is worth knowing before anyone
re-litigates it.

The pre-existing input set was `[stamp's source dir, stamp's built_by,
"tolerance_stack"]` — and that last entry was a **hand-written whole directory**.
Deriving the closure from the builder's own imports replaced it with:

```
docs/tolerance_stacks            (stamp)          docs/topologies      (stamp)
scripts/build_topology_projection.py  (built_by)
scripts/build_viewer_projection.py    \
scripts/build_viewer_crops.py          }  derived — none of these is in any stamp
scripts/projection_provenance.py      /
tolerance_stack                       (derived: the PACKAGE, because __init__ runs)
```

So arm 3 *added* three `scripts/*.py` files and **did not** add `scripts/` as a
directory. A tracked file in `scripts/` that no builder reaches — there is one
in the fixture on purpose — cannot redden the tier, which is what the previous
`tolerance_stack`-shaped input would have implied if anyone had extended it by
hand. Net false-alarm surface: three files that genuinely change what a rebuild
writes. `scripts/projection_provenance.py` is the sharpest of them: it is in no
stamp at all, and it is the module that writes the stamp.

Two implementation notes on the closure, since it is a static reader:

- **It reads source text, not a real interpreter, and that is deliberate** —
  `venv-win/` exists only in the main checkout, which is the situation a tier is
  most often run from a worktree to escape. A module name that resolves to no
  file in the tree (`import fitz`) is dropped, so a false positive out of a
  docstring costs nothing.
- **A package is named as a directory, not as the one module that resolved.**
  `tolerance_stack/stack.py` resolving means `tolerance_stack` is the input:
  `__init__.py` runs on import, siblings are reachable by attribute, and a
  directory is also what makes an untracked new module inside it visible to
  question 4. "Is this a package?" is answered by looking for `__init__.py`, so
  no package name is written down.
- **The closure is walked in the work tree under test, so a PARTIAL tree
  narrows it silently.** Remove `tolerance_stack/` and it leaves the input set
  rather than being reported absent. That is a coverage loss, not a false red,
  and the thing that covers it is the preflight below — which derives the set
  from the *full* checkout. A test pins this
  (`test_an_input_absent_from_the_work_tree_names_the_shadow` removes a
  stamp-named path instead, with the reasoning in a comment).

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
