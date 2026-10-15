---
priority: high
depends_on: []
model: sonnet
---

# HANDOFF 2026-10-15 — annotate_gated_browser_suites_follow_the_three_part_mock: re-green the two red annotate browser suites on trunk, and gate the placement rule

Source: triage sweep 2026-10-15. Two issues:
`docs/issues/ISSUE_20261015_the_gated_annotate_browser_suites_still_count_a_one_part_mock_the_context_filter_handoff_made_three.md`
(high, the red) and
`docs/issues/ISSUE_20261014_the_annotators_placement_wiring_can_be_deleted_green_in_every_gated_tier.md`
(med, folded in because it edits the same suites in the same file — two
handoffs here would conflict). Baseline: trunk `master` @ `c51cf49` (batch merge
of `parts_sit_where_the_assembly_puts_them` and
`a_context_filter_and_a_view_filter`). Scope: `scripts/run_viewer_browser_tests.mjs`
(annotate suites), `scripts/mutation_witnesses/` (new specs only),
`apps/annotate/fixtures.js` only if a fixture fact must be exposed (prefer
reading `window.AnnotateApp.FIXTURES`); do NOT touch `apps/annotate/sweep.js`,
`docs/ANNOTATION_SURFACE.md`, `docs/topologies/`, or `apps/annotate/README.md`
(owned by the parallel `annotate_texts_follow_the_installed_mesh_store`), nor
`scripts/run_mutation_witness_tests.mjs` (owned by the parallel
`mutation_runner_survives_a_missing_interpreter_and_shadows_what_guards_read`).

## Deliverables

1. **Re-green the seven red sub-checks without weakening any claim.** In the
   main checkout on `c51cf49`, `node scripts/run_viewer_browser_tests.mjs
   --only "annotate"` is red in `[annotate rail filter + face deselect]` (29/32)
   and `[annotate top bar + entry context (auto-filter, see-through)]` (26/30);
   the issue lists the seven sub-check names verbatim. Cause, read from the
   diff: `c2e1d79` grew the mock from one installed mesh to three
   (`demo_bracket`, `demo_plate` with no occurrences, plus the demo triangle)
   and split the parts panel into "in this model" / "Other parts" with a
   `part-row part-row--head` header row; the suites still count
   `#parts-panel li.part-row` against the one-part picture (`allParts === 1`,
   `=== 0` for the meshless element, "that element's part alone"). **Confirm
   the cause first** (dump the panel's rows at each failing step) — if any of
   the seven is the app being wrong rather than the check being stale, fix the
   app instead and say so in the lesson. Re-express each count against the new
   semantics: header rows excluded, and where the claim is about a filter,
   about the "in this model" section and what is *drawn*. Each rewritten
   sub-check keeps its claim; its name may sharpen, never widen. Suggestion:
   derive the expected counts from `window.AnnotateApp.FIXTURES` rather than
   hand-typing `3`, so the next fixture growth does not repeat this.
2. **Witness the rewritten checks.** Any of the seven that already has a spec
   in `scripts/mutation_witnesses/` must still be witnessed after the rewrite;
   any that did not and can carry one (mock tier, no `[real]` data) gets one,
   per the enrollment README.
3. **Port the placement rule into the gated tier (the folded med issue).**
   Today only `apps/annotate/run_browser_check.mjs` (run by no gate) sees that
   an opened part is drawn at every recorded occurrence. Add to an annotate
   suite in `scripts/run_viewer_browser_tests.mjs` (the mock part has two
   recorded occurrences): after `open-part`, `window.__scene.drawnPlacements(sha)`
   equals the fixture's two `placement_world`s; plus the pick-on-a-repeat
   assertion (same `(sha, face)` from occurrence 1 as from occurrence 0, via a
   real raycast). Add a mutation spec that replaces `placementsFor`'s return in
   `apps/annotate/app.js` with `return null;` and show it witnessed.

## Definition of done

- Main checkout, after `scripts/rebuild_projections.ps1`:
  `node scripts/run_viewer_browser_tests.mjs` 25/25 (or 25+/25+ with the new
  check), `node apps/viewer/run_tests.cjs` green,
  `node scripts/run_mutation_witness_tests.mjs` reports every declared mutation
  witnessed, `venv-win/Scripts/python.exe -m pytest -q` green.
- Note: the main-checkout browser tier is the one that failed to run at the
  previous handoff's review — run it yourself (from your worktree, pointed at
  the main checkout's projection per the script's header) and paste counts.
- Lesson (`docs/sessions/lessons/LESSONS_20261015_annotate_gated_browser_suites_follow_the_three_part_mock.md`):
  the confirmed cause per sub-check (stale check vs app defect), the before/after
  counts, the mutation witnessed for the placement rule, and whether any
  remaining annotate claim is checked only by `run_browser_check.mjs`.
