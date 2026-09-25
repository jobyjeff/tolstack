# LESSONS — 2026-09-24, `fixture_pairing_reads_a_fresh_projection`

What the next agent could not get from the diff or the log.

## The freshness question that works is not the one the stamp suggests

The stamp records `branch`, `head_sha`, `dirty` and `behind_trunk`, and the
issue and the handoff both describe the fix in those terms ("a commit the
working tree does not contain, or which is behind the tree"). Implemented
literally, that is **red on every handoff branch in existence**: a worktree's
HEAD is always ahead of the projection built on trunk, so the tier would have
gone loud on branches that touch nothing the projection is built from. This
repo has already written down what that costs — `projection_provenance.py`'s
own `dirty` note: *"an alarm that is always on is an alarm a reader learns to
skip, which is the failure this banner exists to prevent."*

The question that works is one step further in: **are the inputs this
projection was built from still what is on disk here?** `git diff <stamped sha>
-- <inputs>`, one command, empty means usable. It subsumes behind, ahead,
divergent *and* uncommitted-edit, and it was measured quiet before it was
written: two of the thirty commits before this one touched a projected input.

If you widen this later, widen it on evidence. `tolerance_stack/` is in the
input set because all three builders import it and it costs almost nothing;
`docs/spec_library/` is not, because no viewer projection is built from it.

## The input list is derived, not written down — including the key name

`inputsOf()` finds the projection's source directory by **shape**: the one
value in the stamp that is an absolute path inside the recorded `repo_root`.
That is not cleverness for its own sake. The key is `stacks_dir` for the two
viewer projections and `events_dir` for the spec library, and
`projection_provenance.py` says in as many words that the name is "a label for
the reader" — i.e. the next builder may pick a third word. Spelling either name
in JS would have been a second copy of a fact Python owns, and it would have
gone quietly wrong rather than loudly.

## `--work-tree` is what made the new guard witnessable

The mutation-witness shadow is `tmp/mutation-witness/`, a copy of the tracked
tree **inside the repo**. A freshness check written as `git -C <shadow> diff`
reads straight past it to the real checkout: the shadow is not a repo, so git
walks up, finds the real `.git`, and diffs the real working tree. The patched
file is invisible and the guard can never be witnessed.

Naming the work tree explicitly (`--git-dir=<resolved> --work-tree=<shadow>`)
is what makes the check answer for the files the tier is actually reading.
`--no-optional-locks` rides along so a shadow run cannot write the real
checkout's index. **Anything else that shells out to git from a tier and wants
a witness will hit this same wall.**

## A stale tier is a failed check *and* a skipped tier, on purpose

Both, not either. The failed check is what makes the exit code non-zero and
carries the diagnosis; the skip is what takes the ~450 `[real]` checks out of
the numerator and the denominator, so the total line cannot read as a pass. It
also has a side effect worth knowing: because the tier skips, the freshness
mutation reddens **exactly one** check, which is the cleanest possible witness.

## There was no honest way to pin "how the viewer renders `claims`"

The `[real]` shape guard's message asks for a fixture-tier test that pins how
the viewer renders a new key. For `claims` the true answer is that **nothing in
`apps/viewer/` reads `results.hardware_entries` at all** — grep it. So the
guard pins the other fact: a metric name is a key out of a test registry, the
same class as `source_ref` on the reader-facing banned list, and no surface may
print one.

That also means the mutation **plants a positive** instead of removing a wire:
there is no wire to remove, and what has to be proved is that the scan reaches
the surfaces it walks. This repo has been bitten twice by scans that reached
nothing (`new RegExp("\b" + name + "\b")` with one backslash; a
`div.worksheet__body` exemption selecting no node), and both times what told
the truth was planting a positive.

## Still open

- `docs/issues/ISSUE_20260924_other_real_tiers_still_read_the_shared_projection_untested_for_freshness.md`
  — three more readers of the same shared projection, one of them
  `tests/claims_registry.py`, which **publishes a number** re-derived from it.
  Whoever takes it should decide where the one freshness implementation lives
  before writing a second one.

## Running the node tiers from a worktree

`node_modules/` is gitignored and main-checkout-only, so the browser tier and
every browser-tier mutation witness are unreachable from a worktree by default.
A directory junction (`cmd /c mklink /J <worktree>\node_modules
C:\workspace\tolstack\node_modules`) makes both run against **this branch's**
source, which is the tree you actually want to test — the main checkout holds
trunk. It is gitignored, so it commits nothing and dies with the worktree.
