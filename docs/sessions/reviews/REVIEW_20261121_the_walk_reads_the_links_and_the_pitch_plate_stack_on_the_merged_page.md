---
type: review
handoff: docs/sessions/active/HANDOFF_20261119_the_walk_reads_the_links_and_the_pitch_plate_stack_on_the_merged_page.md
reviewer: agent
date: 2026-11-21
verdict: APPROVE
blockers: 0
---

# Review: the_walk_reads_the_links_and_the_pitch_plate_stack_on_the_merged_page

Docs only: Jeff's review page, 27 shots, a lesson, 3 new issues and 2
addenda (`git diff --name-status`: every lesson, page and shot is `A`; the two
`M`s are issues, and both are append-only addenda). Merged as a fast-forward
onto `integration` `8082bad0`. The handoff tip was `87c6698f`.

## What I verified

- **Where it ran.** Port 8879, a private server over the worktree's `apps/`.
  Never 8000. The page says the 8000 proxy explains the banner.
- **Jeff's log untouched.** I re-hashed `data/inbox/feature-identity/`: 101
  files. The sorted listing's sha256 is `f1e06978…`, which matches the page.
  The contents hash (`0cdc8fc8…`) uses an unstated method, so I could not
  reproduce it. No file there is newer than 2026-11-19 10:08, which is before
  the walk.
- **Every cited shot exists.** Each `NN_…` the page cites resolves to a
  committed PNG. 27 PNGs, as the lesson says. Every cited issue exists on the
  merged tree, including the two the page names from link 5.
- **Counts re-derived** from `docs/topologies/topology_vpa_end_stop_v2.json`:
  104 edges (75 structural, 29 gap), 0 valued. The end-stop table's sums hold:
  36 joints, 50 constraints, 21 of 100 ends. The drawing-status table holds:
  25 + 20 + 8 + 22 = 75. So do 13 + 11 and "8 drawings, 25 dimensions". So
  does the verdict tally: 22 / 5 / 2 of 29.
- **The "before" tree.** `aa8f4ee4`'s `map.js` was trunk's viewer code at
  Jeff's note (13:48–14:25 on 11-19). The master reflog shows only board,
  triage and issue commits between `f510260e` and then.
- I did not re-check the ends-bound fold per joint, or the map scores. The
  scratch root `data/scratch/walk1119` was already gone when I started, and a
  rebuild takes about 11 minutes and would only re-run the author's scorer.

## Tests (docs-only diff: the two fast tiers, per CLAUDE.md's table)

All in the review worktree after the merge:

- `node apps/viewer/run_tests.cjs`: 523/523; the node-fs `[real]` tier
  SKIPPED, because a worktree has no projection.
- `node apps/annotate/run_tests.cjs`: 333/333.
- Doc-pairing subset: `pytest -q tests/test_claims_registry.py
  tests/test_topology_prose_for_a_reader.py tests/test_sop_vocabulary.py
  tests/test_viewer_readme_doc_facts.py`: 1057 passed.

The author's record covers a full default run (2585 passed; the 2 failures
are the documented worktree red and an already-filed live-data red), an
armed `[real]` viewer run (623/623) and annotate. For this diff, that leaves
the benefit of the doubt intact. No browser or witness run is owed: nothing
outside `docs/` changed.

## Findings

**should-fix (filed by the review, not fixed in code)**

1. **A wrong write was filed only onto a deferred issue.** The walk's best
   finding: a Take on a v2 lug feature binds the other lug's faces. It went
   in only as an addendum to
   `ISSUE_20261028_contact_suggestions_cannot_say_which_blade_a_topology_edge_means`
   (`deferred` until 11-29, `type: feature`). The page also sends Jeff to
   re-pick exactly those features. Filed as an open bug at high:
   `ISSUE_20261120_a_take_on_a_v2_lug_feature_binds_the_other_lugs_face`.
2. **A named-rule violation was filed the same way.** "Nothing is recorded as
   missing" is an always-visible negation on the surface, and it is false on
   v2. It went only onto deferred `ISSUE_20260930_…`. Filed at med:
   `ISSUE_20261120_design_the_gap_panel_says_nothing_is_missing_on_a_model_with_no_values`.

**Inline (review artifacts only):** a dated note on the walk page under the
two addenda, pointing to the two new issues. Also a new overlay entry ("A
walk files a live defect only as an addendum to a `deferred` issue").

**Nits:** `00_landing_3840.png` is committed and cited nowhere. The lesson
says the scratch root is "safe to delete after the review", but it was gone
before the review began, so the page's map scores can't be re-run from it.

The small-findings bundle (F1–F5) holds no prose-budget or prohibition hit
that needs splitting. F1's unnamed rows fall under the everyday-name rule, a
judgement call, so `low` stands.

## Verdict

APPROVE. The page meets every deliverable and DoD line. It opens with where
it ran and the log proof, and every row cites a shot that exists. The two
should-fixes were about where issues were filed, and both now have open
issues.
