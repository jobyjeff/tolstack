---
type: review
handoff: HANDOFF_20261014_a_context_filter_and_a_view_filter
reviewer: review agent (Sonnet 5.5)
date: 2026-10-14
verdict: APPROVE
blockers: 0
---

# Review — a_context_filter_and_a_view_filter

## Verified

- Merged `handoff/a_context_filter_and_a_view_filter` into the review branch (no conflicts).
- Deliverables, by reading the diff: Isolate/ghost toggle with one snapshot per run (`isolate off`,
  `aria-pressed`); context grouping ("In this model" / folded "Other parts") with `context add|remove|reset`;
  tri-state `show-all`/`hide-all` header; "no studies yet" (disabled) on a studyless topology; a banner line
  for a face click with no element selected. Picking-off-in-sweep already had `AA.SWEEP_PICKING_DISABLED`
  on the same click path (confirmed in `onPick`).
- View verbs never touch `contextEdit` (browser check asserts it); selecting a topology/study resets context and view.
- Latent bug fixed by the author, and correct: `selectTopology` now nulls `currentStudy` for a studyless topology.
- Three dark panel screenshots present under `docs/sessions/lessons/assets/`; lesson written; the
  bound-meshes-in-"Other parts" question is filed as an issue.

## Tests (counts and checkouts)

Risky subset (diff: `apps/annotate/`, CSS, guards/witnesses, `scripts/guard_enumeration.mjs`):
- `node apps/annotate/run_tests.cjs` — 188/188 (before and after my inline fix; `[real]` ran, no SKIP lines).
- `node apps/annotate/run_browser_check.mjs` (mock) — 50/50.
- pytest: vocabulary x2, feature_identity, part_mesh_aliases, app_type_scale, mutation_witnesses,
  architecture_inventory — 133 passed.
- The six new mutation specs, each `--only <hash> --repo C:/workspace/tolstack`: all WITNESSED (clean run green).
Full suite after merge, review worktree: **1 failed, 1445 passed, 1 skipped** — the one red is
`test_viewer_js_suite_is_green`, the documented worktree-only red (no `data/projections/` here); `apps/viewer/`
is untouched by this diff. `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: 428/429, one tier
skipped (node-fs, same cause). Not exercised here: the main-checkout viewer browser and full mutation-witness
tiers — owed at the operator's batch merge per CLAUDE.md.

## Fixed inline (all three prongs)

`apps/annotate/app.js`: the author's scripted edit left a stray U+FEFF BOM before `async function cmdIsolate`
and two mojibake ellipses (`â€¦`) in comments (`ghost <part…>`, `context add|remove <part…>`). Removed;
no behavior change (JS treats a BOM as whitespace). Commit on the review branch.

## Findings

None blocking. Note for next reviewer: the scripted-edit mojibake/BOM is cheap to catch with
`git diff integration | grep -P "\xEF\xBB\xBF|â€"`.
