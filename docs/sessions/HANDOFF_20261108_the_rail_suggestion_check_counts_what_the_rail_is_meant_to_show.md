---
priority: high
depends_on: []
model: opus
hitl: false
---

# HANDOFF 2026-11-08 — the_rail_suggestion_check_counts_what_the_rail_is_meant_to_show: trunk's browser tier is red on "the topology-level rail shows a suggestion on every edge with an open proposal" (15 rows against 34 edges); find whether the rail or the check is wrong since model v2, fix that one, and close the gap that let a `[real]` check first run on trunk

Source: the 2026-11-08 triage batch merge (`dispatch/docs/sessions/lessons/LESSONS_20261108_triage_sweep.md`).
The issue has the measurement and what is already ruled out:
`docs/issues/ISSUE_20261108_the_rail_suggestion_real_check_finds_15_suggested_rows_for_34_open_proposal_edges_on_trunk.md`.

Baseline: trunk `master` at `6682b972` or later, in the main checkout, projections rebuilt
(`powershell -NoProfile -File scripts\rebuild_projections.ps1`). Reproduce with
`node scripts/run_viewer_browser_tests.mjs --only "annotate rail suggestion"`. It prints
`topology-level rail: 15 rows read suggested; the projection has 34 edges with 62 open ends`
and fails 18/19.

Scope: `apps/annotate/` (boot, rail, identity keys under `ids_from`), the suite's section 5 in
`scripts/run_viewer_browser_tests.mjs`, the issue, and tests. Do NOT rewrite
`data/inbox/feature-identity/` (append-only), and do NOT try to rebuild `bindings.json` here.
That has its own issue (`ISSUE_20261108_four_feature_identity_events_share_a_seq_…`).

## Deliverables

1. **Decide which side is wrong, by content.** Open the annotator the way the check does
   (`?embedded=1&topology=vpa_pitch_linkage`, real reads). Find which model's rail is drawn, and
   which of the 34 open-proposal edges have no suggested row. Start with the model v2 commits
   (`5694df28`, `d0863681`, "a shared id under ids_from has one identity key, the source
   model's") and `36bc255c`. If the rail now hides suggestions it should show, fix the app. If
   the check's count no longer describes what the rail is meant to show (for example, edges a
   v1 rail no longer draws as rows), fix the count to the rule the docs state
   (`docs/ANNOTATION_SURFACE.md`, "Proposals"). Do not just loosen the comparison.
2. **The class.** This `[real]` sub-check first ran on trunk. The tactical and review runs used
   a data root with no `bindings.json` and skipped it, and the batch merge cannot run browser
   tiers on the candidate. Say in the lesson which of those it is cheapest to close. One
   example: a review run that names each `[real]` sub-check it skipped, so a skip on the
   diff's own surface is visible. Make the in-repo change if there is one, or file it.
3. Resolve the issue with the verifying command and its output.

## Definition of done

- `node scripts/run_viewer_browser_tests.mjs --only "annotate rail suggestion"` passes in the
  main checkout against the real projection.
- `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q` is no redder than at baseline.
- Any guard added or changed is enrolled under `scripts/mutation_witnesses/`.
- Lesson written to `docs/sessions/lessons/`.
