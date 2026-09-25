---
type: review
handoff: docs/sessions/active/HANDOFF_20260924_fixture_pairing_reads_a_fresh_projection.md
reviewer: agent (review/fixture_pairing_reads_a_fresh_projection)
date: 2026-09-24
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-24 — fixture_pairing_reads_a_fresh_projection

All five deliverables landed, and the one that mattered — a `[real]` tier that
refuses a projection it cannot pair with the tree — was **witnessed failing in
review on three independent arms**, not accepted on the strength of the
author's green. The instance is cleared: trunk is `513/514` on the viewer tier
right now, the merged branch is `516/516`.

The work is not a tolerance stack, so the stack-provenance checks in this
repo's overlay do not apply; what follows is the checklist read through the
shape this diff actually has (a guard, a fixture, two witness specs and four
documents).

## What I verified, and how

**Merge.** `git merge handoff/fixture_pairing_reads_a_fresh_projection` into
`review/…` **conflicted**, in
`docs/issues/ISSUE_20260924_fixture_shape_drift_is_invisible_until_the_gitignored_projection_is_rebuilt.md`'s
frontmatter. Both sides and the resolution, because a non-trivial resolution
changes what the green below proves:

- `integration` (`b35fdd3`, landed after the handoff branch was cut) rewrote
  `found_by:` from free-text prose to
  `dispatch/docs/sessions/lessons/LESSONS_20260924_triage_sweep_403_burst_and_the_merge_gate_ordering.md`,
  because free text there reddens dispatch's cross-repo backlink guard
  (`tests/test_issue_backlinks.py`) **workspace-wide**.
- The handoff branch added `handoff:` and moved `status: open` → `resolved` in
  the same block.

Both survive: `integration`'s `found_by` value (it is the fix for a live
cross-repo red, and the handoff branch could not see it), the handoff's
`handoff:`/`status:` disposition (it is this handoff's own deliverable). Merge
commit `1732cc5`.

**Deliverable 1 — the instance.** `apps/viewer/fixtures.js`'s hardware pile now
carries `claims`, declared against its own deliberately-empty `entries` list
(`total = 0`), which is true about the fixture rather than copied from trunk's
counts. The fixture-shape guard compares `hardware_entries`' own key set, so the
drift clears. Checked separately that this does **not** accidentally declare
anything: `tests/claims_registry.py` reads `.js` files through
`declarations_in_text`, which only sees a fenced ```claim``` block, so a JS
object literal named `claims` is not a declaration and nothing re-derives `0`.

**Deliverable 1's guard.** The handoff asked for a fixture-tier check pinning
"how the viewer renders it"; the honest answer the author found — nothing in
`apps/viewer/` reads `results.hardware_entries` at all, so it must not render —
is right, and I re-grepped it. The guard scans every stack surface for the
metric **name**, not the value, and both non-vacuity arms are asserted
(`metrics.length >= 1`, `surfaces.length > 10`). Its witness plants a positive
rather than removing a wire, which is the correct shape when there is no wire.

**Deliverable 2 — the freshness guard, observed failing.** Three arms, each run
by me on the merged tree, each exiting **1**:

| arm | how | what it said |
| --- | --- | --- |
| an input edited in this tree | appended a newline to `docs/tolerance_stacks/hardware_entries.json` | `results.json was built from 43d7052cb540, and 1 of its input file(s) differ in this tree: docs/tolerance_stacks/hardware_entries.json` — and **not** `topologies.json`, whose inputs did not move |
| the original defect replayed | copied the live projection to a scratch `--repo` root, stamped it `76cb8179bbc9` | names the stale commit and **13** input files for `results.json`, 5 for `topologies.json`, 13 for `crops.json` |
| an unusable stamp | same scratch root, `head_sha` set to 40 zeros in one file, `provenance` deleted from another | `built from commit 000000000000, which is not in this tree at all` / `carries no provenance stamp, so which tree built it cannot be established` |

In every case the runner printed the diagnosis, the projection path, this
tree's path and sha, and the rebuild command; then `SKIP node-fs tier`; then
`422/423 passed, 1 TIER SKIPPED -- NOT RUN, NOT PASSED`. A stale tier cannot be
read as a pass, which is the posture the handoff asked for and the same posture
the 2026-09-18 skip decision set.

**Deliverable 3 — the worktree decision.** Written where the check is
(`apps/viewer/run_tests.cjs`), in `ARCHITECTURE.md` and in the issue's
resolution: a borrowed projection is checked against the **borrowing** tree, a
failed borrow is a failed check *plus* a skipped tier, and the rejected
alternative (accept the borrow, soften the verdict) is argued down rather than
waved at. No worktree rebuild of the shared projection anywhere in the diff.

**Deliverable 4 — enrollment.** Two guards, two specs, `DECLARED_GUARDS.fast`
`514 → 516`, which is the derived census agreeing rather than a number raised by
hand: `tests/test_mutation_witnesses.py` passes, and it re-derives the count by
running `scripts/guard_enumeration.mjs --json` over `apps/viewer/tests.js`.

**Deliverable 5 — the ordering fact.** `CLAUDE.md`'s pre-batch-merge list now
says rebuild before the three node tiers, never after, and says why in one
sentence.

**The tactical record.** The handoff branch carries **no** recorded full-suite
run — not in the commit messages, not in the lesson. Per the canonical cadence
that voids the benefit of the doubt, so I ran the **full suite pre-merge as well
as post-merge** rather than only the risky subset. (This is feedback for the
next tactical session here, not a finding against the code: the run almost
certainly happened, and the record is what the reviewer is asked to inspect.)

**Risky subset (pre-merge), named per the overlay's mapping.** Rows matched:
`apps/viewer/`; guard-and-witness; `ARCHITECTURE.md`; prose-in-a-tracked-doc;
and `scripts/projection_provenance.py`'s read side.

```
pytest -q tests/test_viewer_js_suite.py tests/test_js_python_vocabulary.py
  tests/test_js_vocabulary_is_generated.py tests/test_viewer_readme_doc_facts.py
  tests/test_viewer_deep_link_contract.py tests/test_mutation_witnesses.py
  tests/test_architecture_inventory.py tests/test_provenance.py
  tests/test_ops_toml_serve_verb.py tests/test_tolerance_stack.py
  tests/test_thermal_exception_list.py tests/test_claims_registry.py
  tests/test_projection_provenance.py
      -> 1 failed, 318 passed
node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack
      -> 516/516 passed, banner: "projection paired with this tree:
         results.json @ 43d7052cb540, topologies.json @ …, crops.json @ …"
```

The one failure is `test_viewer_js_suite_is_green`, the red `CLAUDE.md` documents
as deliberate in a worktree: that test spawns the tier **without** `--repo`, so
the `[real]` tier has no projection and a skipped tier is a failure here by
design.

**Full suite, post-merge, in this review worktree** (the merged tree; the main
checkout sits on trunk and measures trunk):

```
venv-win/Scripts/python.exe -m pytest -q   ->  1 failed, 1243 passed
```

Same single failure, same cause.

**…then armed, and green.** The canonical cadence asks for everything a worktree
CAN be given, so: the three live projection JSONs copied into this worktree's own
gitignored `data/projections/viewer/`, and the 35 MB `crops/` PNG tree reached by
a directory junction (both gitignored, both die with the worktree). The new
freshness check then pairs the borrowed projection against *this* tree and
passes, the `[real]` tier runs in full, and

```
venv-win/Scripts/python.exe -m pytest -q   ->  1244 passed
```

Worth recording for the next reviewer that the first armed attempt was
`514/516`: a copied `crops.json` without `data/projections/viewer/crops/`
fails `[real] every resolved crop's PNG is actually on disk` on 45 rules. The
projection JSONs alone are not the whole arming.

**Mutation-witness tier, post-merge** — the run the overlay asks for because a
review merge is the one point in the lifecycle where nothing else re-runs it,
and the only tier whose answer can change *as a result of* a merge:

```
node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack
      -> 125/125 declared mutations witnessed   (exit 0)
         apps/viewer/tests.js                   50 enrolled / 516 declared
         apps/annotate/run_tests.cjs             9 enrolled / 151 declared
         scripts/run_viewer_browser_tests.mjs   49 enrolled / 506 declared
```

No drop, nothing NOT WITNESSED, and both of this handoff's new specs fire:
`fast__a-hardware-pile-s-claims-…` reddens on the planted metric name in a
fixture element's `name`, and `fast__real-the-projection-this-tier-reads-…`
reddens on one more declaration added to `hardware_entries.json` — the original
defect replayed rather than mimicked. The browser half needed
`node_modules`, which a fresh review worktree never has; a directory junction to
the main checkout's is what makes those 49 real rather than a wall of misses.

**Production data untouched.** After every run above, the main checkout's
`data/projections/viewer/*` still stamp `43d7052cb540 / master`, `built_at
21:23`, with unchanged mtimes, and `git status` there is clean. Nothing in this
review wrote to the shared `data/`, and nothing rebuilt the shared projection
from a worktree.

**Lesson and issue arithmetic, re-derived** (the canonical checklist's
lesson-audit entry):

- *"two of the thirty commits before this one moved a projected input"* —
  **correct**, exactly two: `f802641` (1 file) and `0cf1122` (14 files), over
  `docs/tolerance_stacks`, `docs/topologies`, `tolerance_stack/` and the three
  builders.
- *"the thirteen input files that have moved"* at `76cb8179bbc9` — **correct**,
  13 for `results.json`.
- *"`421/422 passed, 1 TIER SKIPPED`"* — **wrong on the shipped tree**, which
  reports `422/423`; see nit 1.
- The lesson's `--work-tree` claim is load-bearing and true: the shadow lives
  *inside* the repo, so a bare `git -C <shadow>` resolves the real `.git` and
  the patched file is invisible.

## Findings

### should-fix (filed, not fixed — `ISSUE_20260924_the_projection_freshness_pairing_reads_tracked_head_content_only.md`)

**1. The pairing measures tracked content at `<sha>`, not the tree, and the
diff claims otherwise in four places.** `git diff --name-only <sha> -- <paths>`
is the whole check, and the comment, the lesson, the commit message and the
issue resolution all say the one question subsumes *"a stale projection, a newer
one, a divergent branch and an uncommitted edit."* Three inputs that change what
a rebuild writes are invisible to it, and in all three the tier reports fresh
and runs its ~93 `[real]` comparisons anyway:

- **An untracked addition.** Measured: dropping a new `.json` into
  `docs/tolerance_stacks/` left the banner at *paired* and the total at
  `516/516`. `build_viewer_projection.py:687` globs `stack_*.json`, so an
  authored-but-uncommitted stack is an input the check cannot see.
- **A `dirty: true` stamp**, which `projection_provenance.stamp()` records for
  exactly this reason and `projectionFreshness` never reads.
- **The builders' sibling imports.** `inputsOf()` is `[source dir, built_by,
  "tolerance_stack"]`, and the comment calls `tolerance_stack` *"the one input
  that is NOT derivable from a stamp"* — but
  `build_topology_projection.py` imports `build_viewer_projection`,
  `build_viewer_crops` and `projection_provenance`, so editing
  `build_viewer_projection.py` stales `results.json` and leaves `topologies.json`
  reading fresh.

Not a blocker: the guard catches the class it was built for, the misses are all
in the *quiet* direction on a clean tree, and the lesson's "widen it on
evidence" is the right instinct. But the claim of subsumption should be narrowed
to what is measured, and the issue carries the evidence and the constraint
(whatever the input set names must also be in the mutation shadow's `SHADOWED`,
or the guard is red on the *clean* run and every `fast`-tier witness reports
`TIER_ALREADY_RED`).

### nits

**1. `421/422` in the issue's resolution** was measured before this handoff's
second guard existed; the shipped tree reports `422/423`. **Fixed inline**, with
a parenthetical saying what was re-measured and that the 13 files and the exit
code reproduce exactly.

**2. `projection paired with this tree: (none on disk)`** is what the banner
prints in a bare worktree, one line before `SKIP node-fs tier`. It is honest
once you read the parenthesis, and it leads with the word *paired* for a state
where nothing was paired. Left alone — a runner log, not a reader surface — but
worth a different verb the next time that line is touched.

## Notes for the next reviewer

- **This diff created a coupling nobody declares.** `projectionFreshness` runs
  under the mutation shadow with `--work-tree=<shadow>`, and the shadow holds
  only `SHADOWED` (`scripts/run_mutation_witness_tests.mjs`). Every path the
  freshness input set names is in that list today. The day one is not, the
  clean run reads it as a deletion and *every* `fast`-tier witness goes
  `TIER_ALREADY_RED` — a failure that will look like anything but its cause.
  Added to this repo's overlay along with the entry above.
- **Trunk is red on the viewer tier until the operator's batch merge.**
  `node apps/viewer/run_tests.cjs` in `C:\workspace\tolstack` is `513/514`
  (`[real] every fixture shape still matches the builder's`), which is the
  instance this handoff fixes. Nothing to do here; it clears when `integration`
  reaches `master`.
- **The DoD's "in the main checkout" is pre-integration-branch phrasing.** The
  merged code lives in `integration` and in this worktree; the main checkout is
  on trunk. `516/516` was measured on the merged tree through the `--repo` seam,
  which is the only way those two halves can meet today.
