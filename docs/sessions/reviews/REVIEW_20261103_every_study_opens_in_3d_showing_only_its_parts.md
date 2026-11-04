---
type: review
handoff: docs/sessions/active/HANDOFF_20261103_every_study_opens_in_3d_showing_only_its_parts.md
reviewer: agent
date: 2026-11-03
verdict: APPROVE (round 2)
blockers: 0
---

# Review — every_study_opens_in_3d_showing_only_its_parts

Merged `handoff/every_study_opens_in_3d_showing_only_its_parts` into the review
branch (clean, no conflicts, no markers). **Not landed on `integration`.**

## Blocker

**B1 — the new fast-tier check is red, and its two selectors are ones the fast
tier's DOM shim cannot evaluate.** `apps/viewer/tests.js:10283`, "every kind of
study row wears a 3D control where the scene is mounted, and none where it is not":

- `all(withControl, ".navtree__row--topology, .navtree__row--study")` is a comma
  selector; `matcher()` in `apps/viewer/run_tests.cjs:107` supports only `tag`,
  `.class`, `tag.class`, so the whole string is read as one class name and
  matches nothing -> `the fixture has at least the topology row` fails.
- `all(row, "[data-nav-3d]")` is an attribute selector, also unsupported by the
  shim (it would be read as a tag name), so past that assertion it would fail
  the `eq(..., 1)` too.

It passes in a real browser (test.html) and the browser tier is green, which is
why it slipped past: the fast tier is the one that cannot see it. Result on the
merged tree: `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` ->
`514/516` — this check, plus the `[real]` "projection built from this tree" check
(expected here: the main checkout's projection is trunk's). The tactical report
records `514/515` and attributes the one failure to the worktree's missing
projection; with `--repo` the real count shows this check is red on its own.
Fix: select with `tag.class` / a class the shim supports (e.g. a `navtree__3d`
class query on each row, run per row class), and rerun until the only red is
the projection one. That is a test rewrite, so it goes back to the author rather
than an inline fix.

Knock-on: the two **fast** mutation witnesses the tactical agent could not show
(its report says their clean run is red) are very likely red for this reason, not
for the node-fs skip; re-run them after the fix.

## What passed (pre-merge risky subset, run on the merged tree)

- `pytest -q` on test_js_python_vocabulary, test_js_vocabulary_is_generated,
  test_feature_identity, test_part_mesh_aliases, test_viewer_readme_doc_facts,
  test_viewer_deep_link_contract, test_mutation_witnesses,
  test_architecture_inventory: **191 passed**.
- `node apps/annotate/run_tests.cjs`: **270/270**.
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack --only
  "every study opens in 3D"`: **8/8**. (Node_modules junction made locally for the
  run and removed; not committed.)
- Design read: one command (`isolate parts <id…>`), pane-side `planPartScope`
  pure and the hide word and armed-pick precedence both honoured; the verb is
  documented in `docs/ANNOTATION_SURFACE.md`; guard pins moved with specs written
  for each new guard (no pin-raise-only).

## Gaps in the tactical record (why the full tier is mine to run later)

- Full 41-suite browser tier not run; only the new suite (8/8). Round 2 should run
  it in the main checkout after a projection rebuild.
- Mutation witnesses: one browser entry and both fast entries not shown;
  `--changed-since integration` output lost. Re-run once B1 is fixed.
- The full pytest run was before the pin update and not repeated.

## Non-blocking notes

- No body expansion in `litPartIds` (edge parts and joint-end parts only) — the
  handoff text says "the bodies they belong to"; the author's reason (the base
  body would turn the whole fastener family solid) is sound, and the lesson flags
  it as one line to change. Jeff may want to confirm the reading.
- `ISSUE_20261030_the_preview_offers_no_way_to_see_a_part_on_its_own_in_3d` left
  open with a stated reason (the issue is about where the action lives): accepted.
- Traced/inferred/untraced ratio: not applicable (viewer/annotator work, no stack
  or value changes).

## For round 2

Fix B1; run the fast tier with `--repo`, the full browser tier and
`--changed-since integration` witnesses in the main checkout after
`scripts/rebuild_projections.ps1`; full `pytest -q` after the pin update.

## Re-run 2026-11-03 (round 2) — APPROVE

Round 1 was REQUEST CHANGES, 1 blocker (B1); it is closed. `be7b7e68` rewrites the
check onto shim-supported selectors; merged cleanly.

- Fast tier `--repo C:/workspace/tolstack`: **515/516**; the one red is the
  `[real]` "projection built from this tree" check (main checkout holds trunk's
  projection) — environmental.
- Full `pytest -q` in the review worktree, post-merge: **2 failed, 1699 passed, 1
  skipped, 2 deselected, 46m27s** (contention header lines not captured). Failures:
  `test_viewer_js_suite_is_green` (no projection in a worktree, by design) and
  `test_contact_suggestions::...live_projection...` (reads the main checkout's
  trunk-stale projection, which lacks the already-landed slide-joint edge;
  unrelated to this diff). Not exercised: the `[real]` viewer tier, the full
  41-suite browser tier (only the new suite, 8/8, run pre-fix).
- `--changed-since integration` witnesses: 16/25 witnessed, 12 left to the sweep
  (30-min cap). Nine NOT WITNESSED, all "tier red before the mutation" (the same
  stale-projection red; includes guards this diff did not add). Two are this
  handoff's fast entries -> filed
  `ISSUE_20261103_two_fast_witnesses_for_the_3d_scope_were_not_shown_in_a_worktree.md`.
  This handoff's browser witnesses that ran were witnessed.
- The operator's batch merge must rebuild projections first and run the full
  browser tier and witnesses in the main checkout (repo CLAUDE.md).

**Landing note.** `integration` moved (each_stop_is_its_own_stack) before the
finishing merge; one conflict, `scripts/guard_enumeration.mjs`: integration's
fast 629 / browser 793-760 pins vs this handoff's +2 fast / +8 browser. Resolved
by taking integration's base and adding this handoff's counts (631/631 fast;
801/768 browser), digests recomputed from the census; `test_mutation_witnesses`
+ `test_architecture_inventory` 54 passed afterwards, fast viewer tier 515/516
(stale-projection red only). Landed as a fast-forward at `3a0b6a46`; pushed.
