---
type: review
handoff: docs/sessions/active/HANDOFF_20261026_the_kinematic_page_keeps_the_dag_and_says_each_contributor_once.md
reviewer: agent
date: 2026-10-26
verdict: APPROVE
blockers: 0
---

# Review 2026-10-26 — the_kinematic_page_keeps_the_dag_and_says_each_contributor_once

Branch `handoff/the_kinematic_page_keeps_the_dag_and_says_each_contributor_once`
(7 commits, tip `839486f3`), first review of this handoff. This review branch
had no earlier commits.

## Merges

1. `handoff/…` into `review/…` (`9ed9939b`). Clean. `integration` had moved only
   by board commits since the branch was cut.
2. `integration` into `review/…` (`6a0eb1c5`). `integration` moved again during
   the review: `bodies_and_studies_carry_forge_tags` and
   `the_full_registry_leaves_the_merge_gate` landed. Both touch
   `apps/viewer/{topology.js,topology_app.js,views/topology.js,topology.css,tests.js,README.md}`,
   and all of those auto-merged. One conflict, in `DECLARED_GUARDS` in
   `scripts/guard_enumeration.mjs`. It has no right side (overlay entry), so I
   re-ran the census and wrote fast `567 / 567 / 49afa903ff86`. That is
   integration's 554 plus this branch's 13 (551→564). browser `609 / 576` is
   this branch's, since integration left browser alone. I grepped for marker
   lines and found none.
   Semantic check: the tags handoff's "other variant" dimming adds its own
   classes (`rail__bar--other-variant`, `tvrow--other-variant`) from
   `ctx.otherVariantParts`, built in the same shared ctx. It is independent of
   the lit set and of `VA.hideUnlit`, so on a kinematic page the two compose.

## What I verified

Against each deliverable, in the code and in the branch's screenshots:

1. **The model on the kinematic page.** `showDag` draws `#topopane` in
   kinematic mode with `ctx.lit = VA.kinematicLitSet(...)`. That set is the
   contributor edges, their `dimension_ref` band edges, and a `study_ref`
   hook (`source.study` lights that chain). It sits in a bounded box that
   opens on the lit grid. In shot 01, the verdicts sit above the fold at 1600×1000.
   The author found that the handoff's premise was wrong: `spineRight` mirrors
   the whole walk regardless of the selection. I checked this against
   `VA.spineRight`, and the lesson's correction is right.
2. **One table.** `VA.kinematicTable` builds one row per contributor and one
   column group per stop. Rows are ordered by the larger magnitude, and gap rows
   come last. Each stop's summary sits in its group header. No
   "contributors at …" heading is left in `apps/viewer/` outside comments and
   the README's sentence about it. `contributors[].by_point[]` comes straight
   from `fold_at`'s rows, with nothing recomputed. It is pinned value-level on P2
   (`test_real_the_projection_carries_every_coefficient_across_p2`: 80 points,
   the stop tables at both ends, and the sign flip between 44 and 45) and on the
   fixture. The curve plots sign × coefficient, which places points without adding anything.
3. **In-place select.** `onKinematicEdge` → `selectElement` and no
   `selectTopology`. `followSelection` posts `highlight` through
   `schedulePaneHover(selectedPaneTarget())` and never a `goto`. Shot 05's
   pane head reads "Sweep — vpa pitch chunk2 p2". The deep link
   `?kinematic=…&edge=…` is in the README contract table.
4. **Gap card.** `gap_rows[].drawings` checks PDF presence in drawing-checker's
   `data/inbox/drawings/`, the directory `build_viewer_crops` resolves against.
   It does not check that a run exists. That is a reasonable reading of
   "drawing on file, not yet read", and the copy has no file names. The live
   study has **no gap rows** since `the_tangential_link_cites_its_drawing`, so
   this card is exercised on the fixture only. The lesson says so.
   `VA.needsAnnotation(confidence, edge)` is widened only at the detail-pane
   call site. The gap list and the badges are left to
   `ISSUE_20260930_…`, with an addendum.
5. **Dim/hide toggle.** `VA.hideUnlit` re-derives rails and links from the
   remaining rows (`VA.walkRailsAndLinks`). The live `[real]` pin checks that
   this reproduces the projection's own rails and links on every topology.
   The setting persists in-session, like the leader style it is modelled on.

Lesson arithmetic, re-derived from `git diff --name-status` and the census:
25 specs added (fast 17, browser 8), 8 deleted, 8 modified. Pins went
551→564 and 605→609. 33 specs touched (the runner prints 33). All of these
match the lesson.

## Tests

- **Tactical record:** present and consistent with the diff. Full pytest was
  1566 passed, 1 failed (the documented worktree `test_viewer_js_suite`) and
  1 skipped. Fast tier 563/563, browser 30/31, and 33/33 `--only` witnesses.
  The benefit of the doubt applies.
- **Scratch root:** I built every projection from the review worktree into
  `C:/workspace/tolstack/data/scratch/kmdag_review/root`, first for the branch
  merge and again for the integration merge. Inputs were copied there and
  junctions added for `venv-win` and `node_modules`. The shared
  `data/projections/` was not touched.
- **Risky subset**, on the merged tree. Code at that point equalled the
  handoff tip, since the integration drift was board-only:
  - pytest `test_kinematic, test_js_python_vocabulary,
    test_js_vocabulary_is_generated, test_viewer_readme_doc_facts,
    test_viewer_deep_link_contract, test_mutation_witnesses,
    test_architecture_inventory, test_app_type_scale,
    test_projection_provenance, test_claims_registry` gave **211 passed**.
  - `run_tests.cjs --repo <scratch>` gave **563/563**.
  - The annotate tier gave **225/225**.
  - The browser tier gave **30/31**. The one red is
    `annotate rail and scene`'s two gap-badge `[real]` checks. They were
    already filed on integration as
    `ISSUE_20261026_the_rail_gap_badge_browser_checks_read_gap_rows_integration_no_longer_has.md`.
- **After merging the moved integration**, with projections rebuilt:
  - Fast tier: **565/566**. The red is
    `[real] the topology fixture's shapes still match the builder's`
    (`variant_axis`, study `tags`). It comes from integration, not this branch.
    The tags handoff changed the builder's output shape without regenerating
    `topology_fixtures.js`, and neither the old nor the new fixture has those
    keys. Filed as
    `ISSUE_20261026_topology_fixtures_lack_the_tags_fields_so_the_real_fixture_pairing_is_red_on_integration.md`
    (high).
  - Annotate: 225/225.
  - Browser: **30/31**, the same pre-filed red.
- **Full pytest, post-merge, review worktree:** **1559 passed, 1 failed,
  1 skipped, 2 deselected** in 275 s. Recorded with `suite-time`, and it is
  inside budget.
  - The failure is the documented worktree-only `test_viewer_js_suite`; that
    tier ran above through `--repo`.
  - The skip is `test_fit_bound_features.py:424`.
  - `tests/test_browser_runner.py` was `--ignore`d because it takes the browser
    slot, which the witness run held. It ran separately (see the re-run note
    at the end).
  - This suite prints no `concurrent pytest processes` / `full-suite lock`
    header lines.
- **Mutation witnesses:** `--changed-since integration` on the merged tree
  (see the appended result below). My first `--only` pass over the 118 specs
  whose `file` this diff touches was stopped part-way, after its first few entries,
  because `integration` moved. That pass measured a superseded tree.

## Findings

No blockers.

**Nits** (not filed):

- `scripts/build_kinematic_projection.py`, `build()`: the default
  `drawing_checker_root` is the real drawing-checker checkout. So
  fixture-based tests that call `builder.build(FIXTURE…)` without the argument
  list another repo's live inbox. That is read-only and harmless today
  because the fixture's gap parts name no drawing. The inbox listing is also
  outside `projection_provenance`'s stamp, so `on_file` goes stale without the
  freshness gate noticing. Recorded as an overlay entry.
- `topology_app.js` `onKinematicEdge`: a contributor whose topology differs
  from the page's is a silent `return`. It cannot happen after the one-model
  fold, but if `study_ref` ever crosses topologies it would be a dead click.
- The detail pane still labels the three borrowed-band contributors
  "DERIVED — the quantity a study computes" (shot 04). This is already recorded
  as an addendum on `ISSUE_20260930_a_valueless_structural_edge_is_invisible_to_the_gap_list.md`.

**Design:** the ~180 px page column with the 3D pane open at 1600 is filed by
the author (`ISSUE_20261026_with_the_3d_pane_open_at_1600_…`, audience
strategy). I found nothing further to file. The toggle copy "Unused: dimmed"
is two words, as asked.

**Fence:** `scripts/guard_enumeration.mjs` is outside the handoff's scope
list, but only its pins changed. That is enrollment, which the DoD requires.

## Found on arrival

The main checkout was clean (`git status --porcelain`: nothing).

## For the next reviewer

Overlay updated with three entries:
- a builder shape change reviewed with `[real]` skipped
- a cross-repo input outside the provenance stamp
- checking `HEAD..integration` before the slow tiers
