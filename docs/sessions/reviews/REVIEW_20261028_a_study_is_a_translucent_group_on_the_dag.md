---
type: review
handoff: docs/sessions/active/HANDOFF_20261028_a_study_is_a_translucent_group_on_the_dag.md
reviewer: agent
date: 2026-10-28
verdict: APPROVE
blockers: 0
---

# Review — a_study_is_a_translucent_group_on_the_dag

**APPROVE.** Merge of `handoff/...` into the review branch was clean (no conflicts); no inline fixes.

## What I checked
- Deliverables 1–4 against the diff: `VA.studySpans` (body-span shape), `studyGroups`
  (selected study last), `rect.tv__studyfield` drawn after body fields and before marks,
  wider/rounder than the body field, palette tokens only (`--zero`/`--accent`/`--muted`,
  `color-mix` alpha 9/40 normal, 16/70 selected), `Groups:` four-state button stored per
  topology, default both/bodies, hover via `studyOfEdge` leads, title click opens study,
  hidden mode keeps only the selected group. Body names appended after groups so the
  field never covers the fold control. Do-not-touch list respected (no layout/positions,
  no `apps/annotate/`).
- Risky subset (diff is `apps/viewer/` + CSS + `scripts/guard_enumeration.mjs` + witnesses):
  `pytest -q` on js_python_vocabulary, viewer_readme_doc_facts, viewer_deep_link_contract,
  app_type_scale, mutation_witnesses -> 67 passed.
- `[real]` tier armed against a scratch root built from the merged tree
  (`data/scratch/review_translucent`, all viewer projections rebuilt with `--data-root`):
  fast tier **614/614**; browser tier **34/35** — the one failure (crop lightbox launcher
  focus) is **identical on `integration`** in the same scratch root, so not this diff.
  The DAG zoom suite incl. the new Groups checks passed.
- Witnesses `--changed-since integration`: 21/21 reached, 14 witnessed; all 8 new fast
  entries WITNESSED. The 7 NOT WITNESSED are browser entries, all "tier red before the
  mutation" (the lightbox failure above) — 2 of them new; filed as
  `ISSUE_20261028_study_group_browser_witnesses_unproven_at_review.md`.
- Full `pytest -q` after the merge in the review worktree (viewer JS suite deselected, as
  it is red in any worktree by design): **1593 passed, 1 skipped**.
- Screenshot of the real kinematic page in "both" mode renders with the filter button
  and nested containers (page at fit zoom, small).

## Notes (non-blocking)
- DoD asked for screenshots on kinematic and a grip-budget page in both modes; the author
  left none committed. Rect counts (76 / 83) are in the lesson and the browser spec
  asserts the four states on the real page.
- The lesson flags the haze of 22 groups and label collisions for the next round; no issue
  exists for it as no successor handoff is named.
- Main-checkout tiers (rebuild first, then four runners) still owed at batch merge.
