---
type: review
handoff: docs/sessions/active/HANDOFF_20261021_the_kinematic_study_checks_its_run_its_units_and_shows_its_limit.md
reviewer: agent
date: 2026-10-22
verdict: APPROVE
blockers: 0
---

# Review 2026-10-22 — the_kinematic_study_checks_its_run_its_units_and_shows_its_limit

Branch `handoff/the_kinematic_study_checks_its_run_its_units_and_shows_its_limit`
(tip `be11a93`), merged into `review/…` as a **fast-forward**: `integration` had
not moved since the branch was cut, so there was no conflict to resolve and the
merged tree is the handoff's tree. Containment was checked first and the work
was not yet on `integration`. The branch carries this handoff's seven
deliverables, the lesson and three filed issues. Nothing was uncommitted.

## What I verified, per deliverable

1. **Candidate input declared.** `.dispatch.toml` adds `data/inbox/linkage-sweeps`.
   The comment and the `CLAUDE.md` bullet no longer say "inert". They now
   report the 2026-10-21 bridge result as the handoff states it.
2. **The study folds 1016.** `sweep.run_id` was re-pointed and the title
   retitled, with the `id` unchanged. I compared the two P2 runs directly:
   the `blade_pitch` Jacobian's max difference is `0.0`, and `geometry.values`
   and all 80 `points` are equal. So the unchanged `REAL` table is right.
   Rebuilding from this tree gives margins 0.256 / 0.258 and
   `kinematic studies: 1 of 1 built`. The new `[real]` pytest check pins all
   six contributors as `feature_source: "artifact"` and confirms every label
   is listed. `tests/test_title_style.py` now bans a trailing genre suffix,
   which fixes the whole class.
3. **Run/study mismatch.** `AA.sweepStudyFor` is pure. `cmdSweep` drops the
   study and sets a `warn` banner with the reason, as the handoff decided.
   The fast tier plants a mismatched pair. The browser tier boots on
   `study.sweep.run_id` and asserts that it equals `SWEEP_RAIL_RUN`. It then
   boots the 1015 run and asserts there is no group and that the banner names
   the run the study folded. Both runs are on disk, so this ran rather than
   skipped (`annotate sweep rail` 15/15).
4. **Units.** `PARAMETER_KINDS` and its attribute tuples are module-level
   constants, not inline literals. The refusal names the contributor and the
   label. Each refusal has a negative control: in-on-mm, mm-on-direction,
   deg-on-direction, deg-on-driver, no units, and an unknown attribute. A
   positive control folds a rad disk. A gap row on an unknown label still
   loads. The `DAG_TOPOLOGY.md` sentence and both `excluded_terms` rows now
   name the bushing length.
5. **Citation behind the verdict.** `limitCard` / `contextCard` reuse
   `VA.citationCard`, and the limit and the stop label are `cardtrig`s. The
   fast-tier and `[real]` checks are present. The two limit notes were
   reordered so the adoption reason leads. I diffed them: no fact was added,
   and the reasoning was only reworded.
6. **Layout.** `td.kmrow__3d` gets `nowrap`. The limit label moved to the
   bottom-left, and the fast tier pins its position. I looked at the 1100 px
   screenshots: the `3D ↗` links sit on one line, the label is clear of a
   mid-plot hover, and the citation card shows S461-607 with the adoption
   note leading.
7. **A loud unbuilt study.** `unbuilt_report` / `--report` are the rebuild's
   last command, which the script test pins. The exit-0 rationale is recorded
   in the builder, the `.ps1` and the lesson. I accept it: a worktree without
   the inbox is a normal state, and pytest catches an authored refusal anyway.

**Scope.** `scripts/guard_enumeration.mjs` was fenced, but the branch changed
its three `DECLARED_GUARDS` pin lines. This is unavoidable: the DoD requires
every new guard to be enrolled, and enrolling one means raising those pins.
The fence and the DoD contradict each other, and the author picked the only
consistent reading. Nothing else in that file changed. `topology_app.js`
(one line, `onCardShow`) is outside the scope list too, and the only way to
wire item 5.

## Tests run

**Pre-merge risky subset.** pytest over `test_kinematic`,
`test_architecture_inventory`, `test_tolerance_stack`, `test_topology`,
`test_topology_projection`, `test_viewer_projection`,
`test_js_python_vocabulary`, `test_viewer_readme_doc_facts`,
`test_viewer_deep_link_contract`, `test_js_vocabulary_is_generated`,
`test_feature_identity`, `test_part_mesh_aliases`, `test_app_type_scale`,
`test_mutation_witnesses`, `test_projection_provenance`,
`test_rebuild_projections_script`, `test_rebuild_terminal_state_pairing`,
`test_provenance`, `test_thermal_exception_list`, `test_claims_registry`,
`test_title_style` and `test_projection_freshness`: **752 passed**. Annotate
tier: **206/206**, with no SKIP lines.

**Viewer tiers, armed.** I reused the tactical agent's scratch root
(`data/scratch/kinematic_units`). Its kinematic projection was missing, so I
rebuilt it from `be11a93`. I also re-added `docs/` (copied) and the
`venv-win` junction, and junctioned `node_modules` into the worktree.
- `node apps/viewer/run_tests.cjs --repo <scratch>`: **546/546**, no tier skipped.
- `node scripts/run_viewer_browser_tests.mjs --repo <scratch>`: **28/28 suites**.
  This includes `annotate sweep rail` 15/15 and `kinematic study page` 10/10.

**Mutation witnesses** (`--only`, one per new spec): python inch-band,
annotate mismatched pair, fast citation and fast `[real]` S461-607 were all
**WITNESSED**. The two browser specs are recorded in the addendum below.

**Post-merge full suite** (review worktree, merged tree):
**1 failed, 1529 passed, 1 skipped in 347 s**. This matches the tactical
record exactly. The failure is `tests/test_viewer_js_suite.py`, the
documented worktree-only red: its node-fs tier has no projection here, and
that tier ran in full through `--repo` above. The skip is
`test_fit_bound_features`'s re-extraction. This repo's conftest prints no
`concurrent pytest processes` / `full-suite lock` header. **Not exercised:** a
main-checkout run. That checkout sits on master and does not carry this
merge, so that run belongs to the batch merge, after
`scripts/rebuild_projections.ps1`.

**`data/` pollution.** `find C:/workspace/tolstack/data -newer <marker>`
(excluding `data/scratch/`) is empty after the full suite and the browser
tier.

The tactical report recorded a full-suite run whose counts include the new
tests, plus every armed tier, so I gave it the benefit of the doubt.

## Findings

### Should-fix (filed, not blocking)

- **The live page's card wiring can be deleted and every tier stays green.**
  If `onCardShow: showCard` (`apps/viewer/topology_app.js`) goes,
  `citationTrigger` falls back to a `title` tooltip that holds only the
  where-line. The adoption note the DoD asks for then becomes unreachable on
  the real page. Both new fast checks pass their own `onCardShow`, and no
  browser check hovers `span.kmverdict__limit`. Fixing it needs a new
  browser check, which is outside the inline boundary. Filed:
  `docs/issues/ISSUE_20261022_the_kinematic_pages_citation_card_wiring_can_be_deleted_green_in_every_tier.md`.

### Nits

- On the card, the limit note's lead sentence is long enough that the 3-line
  clamp cuts the "because S461-241 states only the two stop angles" clause.
  It stays reachable under "Data source", so it is not filed.
- `[real] a run the study did not fold (skipped: …)` pushes `true` on its
  skip arm. That follows the suite's existing convention (eight other lines),
  and the arm was not taken here.

### Fixed inline

- **Lesson arithmetic.** The 1016 run's `geometry.features[]` has **60**
  entries, not 61. The list of differences between the runs also left out
  `mechanism.sha256`. I added a correction blockquote and left the original
  text intact.

## Already-filed follow-ups from the author (checked, frontmatter in contract)

- `ISSUE_20261021_a_kinematic_label_missing_from_geometry_features_still_reads_as_identified_by_the_artifact.md` (bug, low)
- `ISSUE_20261021_design_the_kinematic_charts_stop_labels_sit_on_the_upper_limit_line.md` (chore/design, low)
- `ISSUE_20261021_prefer_a_published_geometry_units_over_the_kinematic_label_vocabulary.md` (feature, low, strategy)

## Overlay

There are two new entries under Recurring bugs. The first covers a view that
degrades silently when a ctx callback is missing and is tested only with the
callback passed. The second covers a handoff fence that the DoD forces the
author through (the `DECLARED_GUARDS` pins).

## For the next reviewer / batch merge

The scratch root `C:\workspace\tolstack\data\scratch\kinematic_units\` holds
copied data, rebuilt projections, a `docs/` copy and a `venv-win` junction. It
is safe to delete after the batch merge.

## Addendum — browser witnesses

`--only browser__real-on-a-p2-run-the-study-did-not-fold-the-rail-has-no__ca4b43fc`
and `--only browser__real-the-sweep-rail-boots-p2-on-the-run-its-kinematic-st__4f7111cd`:
both **WITNESSED** (clean run green, mutated run red on the named check). All
six new specs are now witnessed on the merged tree.
