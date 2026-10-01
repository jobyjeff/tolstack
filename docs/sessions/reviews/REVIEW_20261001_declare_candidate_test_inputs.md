---
type: review
handoff: declare_candidate_test_inputs
reviewer: agent
date: 2026-10-01
verdict: APPROVE
blockers: 0
---

# Review: declare_candidate_test_inputs

## Scope of the actual diff

The handoff commit (`d235308`) touches exactly three files:
`.dispatch.toml`, `CLAUDE.md`, `docs/sessions/lessons/LESSONS_20261001_declare_candidate_test_inputs.md`.
(`git diff integration..handoff/declare_candidate_test_inputs --stat` shows a
much larger diff, but that is branch divergence — `integration` has since
absorbed `one_part_feature_one_value_across_topologies`'s completion, which
this branch was cut before. Confirmed the real diff is the single commit
above via `git show --stat d235308`.) No test, builder, or `data/` file is
touched, matching the handoff's explicit fence. `docs/topologies/` and
`scripts/run_mutation_witness_tests.mjs` (owned by sibling in-flight
handoffs) are untouched.

## What I verified

- **The mechanism claim.** Read `dispatch/candidate_inputs.py:166-174` directly
  (`plan_bridges`): confirmed the `PRESENT` guard fires whenever
  `dst.exists()`, and confirmed via `git ls-files` that all five declared
  paths (`data/meshes`, `data/inbox/{specs,drawings,feature-identity,
  tolerance_stacks}`) carry a tracked placeholder in the main checkout. The
  lesson's "the declaration is inert today" headline is accurate, not
  overstated.
- **Independently reproduced the dry-run.** Built a fresh throwaway candidate
  worktree off the merged review branch and ran `dispatch bridge-test-inputs
  --dry-run` myself: all five paths reported `present`, matching the lesson
  and the filed dispatch issue byte-for-byte (aside from the interpreter row,
  an artifact of using a worktree rather than the main checkout as
  `repo_root` for the spot-check). Torn down cleanly afterward
  (`git worktree remove --force` + `git branch -D`).
- **The filed dispatch issue** (`dispatch/docs/issues/ISSUE_20261001_bridge_test_inputs_cannot_arm_a_directory_that_carries_a_tracked_placeholder.md`)
  exists, carries correct frontmatter, and its code citation checks out.
- **TOML validity.** Parsed the handoff branch's `.dispatch.toml` with
  `tomllib` — valid, and the `candidate_inputs` list matches the issue's
  recommended set exactly. Confirmed the three forbidden paths
  (`data/projections/`, `data/runs/`/`data/sessions/`, a blanket `data/`) are
  absent, each for the distinct reason the handoff names.
  -  **The `.dispatch.toml` "permanently-untracked" footgun from this repo's
     overlay does not apply here**: `.dispatch.toml` is tracked
     (`git ls-files` confirms), so this change carries no risk of the
     `dirty: true` false-positive that overlay entry warns about.
- **`node_modules` call.** Reasoning (declare only once the data/ bridging gap
  closes, since arming the browser tier against a hollow just-rebuilt
  projection is worse than leaving it unproven) is sound and the rejected
  alternative is recorded in both the lesson and `CLAUDE.md`.
- **CLAUDE.md edit** lands exactly where the handoff asked (next to the
  existing "two test tiers cannot run" bullet) and states the unproven-tiers
  list without restating numbers that live in the lesson — consistent with
  this repo's "declared once, pointed at elsewhere" convention.
- **Merged cleanly.** `git merge handoff/declare_candidate_test_inputs` into
  the review branch produced no conflicts. Also merged `integration` back
  into the review branch (it had moved since the branch was cut, absorbing
  `one_part_feature_one_value_across_topologies`) — also conflict-free.
- **Risky subset / post-merge full suite.**
  - Review worktree, `pytest -q`: `1 failed, 1440 passed`. The one failure is
    `test_viewer_js_suite.py`'s documented, deliberate worktree-fences-this-red
    behavior (no real `data/`, no `node_modules`) — exactly the condition
    `CLAUDE.md`'s "two tiers cannot run in a fresh worktree" bullet names.
  - To get real signal on the node-fs `[real]` tier despite that fence, ran it
    directly against the main checkout's data: `node apps/viewer/run_tests.cjs
    --repo C:/workspace/tolstack` → **522/522 passed**. This exercises the
    merged tree's viewer code against real data and confirms nothing here
    regresses it (expected, since the diff touches no viewer code, but
    verified rather than assumed).
  - Main checkout, `pytest -q` (clean tree, `master @ f50e6525c18a`):
    `1 failed, 1437 passed`. The one failure is an **unrelated, pre-existing**
    condition: `data/projections/viewer/topologies.json` is stamped from
    `104eb140d5fa` (the `one_part_feature_one_value_across_topologies` review
    commit), which is **not an ancestor of `master`** — so
    `scripts/rebuild_projections.ps1` refuses to rebuild there
    (`ISSUE_20260806_concurrent_worktrees_clobber_the_shared_viewer_projection`'s
    guard, correctly firing). Confirmed unrelated: the failing test reads
    none of this handoff's three changed files. I did not force
    `--allow-older-tree` — not this handoff's tree dispute to resolve — and
    filed `ISSUE_20261001_main_checkout_projection_stamped_from_an_unlanded_review_branch_blocks_rebuild.md`
    for triage. The browser TRUTH tier and mutation-witness tier were not run
    in the main checkout: both would read the same contested projection and a
    run against it would not be representative; re-run both once the
    projection dispute resolves (next batch merge should do it).

## Findings

None against the work under review. One out-of-scope finding, filed per
"file, don't fix":

- **`ISSUE_20261001_main_checkout_projection_stamped_from_an_unlanded_review_branch_blocks_rebuild.md`**
  (`bug`, `med`) — the main checkout's shared viewer projection currently
  can't be rebuilt because it was stamped from a review-branch commit not
  reachable from `master`. Pre-existing, unrelated to this handoff, likely
  self-resolves at the next operator batch merge.

## Overlay

`docs/prompts/REVIEW_AGENT.md` is already extensive (5600+ lines) and already
names the concurrent-worktree-projection-clobber class and the
`--repo`/backslash trap; nothing in this review surfaced a genuinely new
failure class worth adding. Left the overlay unedited.

## Lesson audit

Re-derived the lesson's own numbers rather than trusting them (per the
"a lesson's arithmetic is checked by nothing" universal check): the timing
table's four rows, the manifest zero-diff claim, and the dry-run output all
reproduce. No arithmetic or causal-attribution errors found.

## Merge

Merged `handoff/declare_candidate_test_inputs` and `integration` (which had
moved) into `review/declare_candidate_test_inputs` — both conflict-free.
Proceeding to merge this review branch into `integration` and push.
