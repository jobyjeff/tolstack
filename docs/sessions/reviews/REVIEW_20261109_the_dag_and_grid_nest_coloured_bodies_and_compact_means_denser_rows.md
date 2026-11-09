---
type: review
handoff: docs/sessions/active/HANDOFF_20261108_the_dag_and_grid_nest_coloured_bodies_and_compact_means_denser_rows.md
reviewer: agent
date: 2026-11-09
verdict: APPROVE
blockers: 0
---

# Review — the_dag_and_grid_nest_coloured_bodies_and_compact_means_denser_rows

Verdict **APPROVE**, 0 blockers. I made one inline fix (two stale sentences), and
filed one design issue, one tier issue and an addendum. The handoff is code-red,
for today's demo.

**Which run:** `handoff/…` at `d73883d5`. The tactical agent was still finishing
when this review started. I reviewed `2ee3fc54` first. Before merging I checked
for stragglers and found one commit, `d73883d5`, which adds the lesson's
verification record and a budget sighting. I aborted the first merge and merged
again at `d73883d5`. No earlier review of this slug exists on this branch.
Containment check: the branch was not already in `integration`.

## Merge conflicts I resolved (the carve-out)

- **`scripts/guard_enumeration.mjs`.** Both sides moved the pins away from the
  merge base (fast 672, browser 857/824).
  - Integration's sibling (`the_scene_draws_the_model_alone_…`) renamed one fast
    guard and added three browser guards.
  - This handoff removed one fast guard and added four browser guards.
  - Resolution: both comment blocks are kept. The pins are summed against the
    base: fast **671/671**, browser **864/831**. Both name digests were
    re-measured with the census (`e57b83e4620b`, `c9bfe8c37568`), and the census
    then reports no moved pin.
- **`docs/issues/ISSUE_20261106_the_viewer_browser_tier_ran_51_minutes_…`.** Each
  side appended its own budget sighting, and both are kept.
- I grepped for marker lines (`^\+(<<<<<<<|=======$|>>>>>>>)`) and found none.

## What I verified against the deliverables

| # | deliverable | finding |
| --- | --- | --- |
| 1 | Bands deleted | `VA.leaderBands`, `VA.rowBandParity`, `bandGeometry` and its helpers, `.rail__band*`, `--tv-band-a/b` and their comment block are all gone. A grep of the merged tree for `rail__band` finds only tests asserting a count of 0. The specs were re-keyed and the band spec was deleted. |
| 2 | One colour per body | `DAG_VIEW_DEFAULTS` is `colourBy: body`, `groupFill: parts`, `palette: bold`. The key is bumped to `.2`, so a stored old "None" cannot hide the new default. The reasoning is sound. I recomputed all 24 contrast ratios in the lesson against `--bg` #16181d, and every one matches to 0.1. The lowest is `#0072b2` at 3.4. The 3D tint is fenced to M2 and filed. |
| 3 | Line weights | Body 1.5px, part and block 1.25px. Rails, leaders and bars are unchanged. |
| 4 | Two nested layers | `VA.gridBraces` emits a body brace and a part brace for every body, one-part bodies included. `rules` is gone. `kinds` takes the Groups popover's state. I read `braceGeometry`'s part `x` (the parent's left plus the body strip) against the sort order (level, then start), and the `indexOf(b.body)` lookup lines up. In the DAG, blocks and fields share `partBox` and are named. |
| 5 | Compact is denser rows | `VA.RAIL_METRICS.drawPitch` stays at 26, and `ROW_DENSITIES.compact` is 18. The joint ring, the joint glyph and the block width read `drawPitch`. The browser check pins pitch and radius at both densities, and its witness reverts `jointNodeTargetR`. Both are meaningful. |
| 6 | Groups off means gone | Blocks now sit under `showParts`, which was the reported defect. The spec mutates that exact guard to `if (true)`. |
| 7 | Click-around | Done and written up. It found three things, and all three are filed with frontmatter. |

Scope fence: the diff does not touch `drawSeamLeaders`, `seamAnchors`, the
`annotate:anchors` listener, `.seam*` CSS or `apps/annotate/` (grepped). The
`topology_app.js` hunks are confined to palette and View handling plus the
pan-target class list.

Tolerance-stack mandatory checks 1–7 (provenance, signs, LMC/MMC, RSS, nominal,
quantised hardware, traced ratio): **not applicable**. The diff touches no stack,
topology, spec event or projection input, only viewer rendering. I confirmed it:
`git diff --name-only` has nothing under `docs/tolerance_stacks/`,
`docs/topologies/`, `tolerance_stack/` or `data/`. The projection stamps pair with
`a856a784` on both sides of the merge, because the inputs did not move.

## Tests

The tactical record (lesson, "Verification record") lists:

- full pytest in the worktree: 1890 passed, 1 skipped, 1 failed. The failure is
  the documented worktree `test_viewer_js_suite`;
- viewer fast tier 671/671 through `--repo <scratch>`, and annotate 303/303;
- the browser tier at 42/43 on `2ee3fc54`;
- witnesses 36/38, with the 2 misses re-run 3/3 after the check was repaired.

Its counts are consistent with the diff, and its browser run was on `2ee3fc54`,
the last code commit, so I gave it the benefit of the doubt.

**Pre-merge subset, on the merged tree** (the merge conflicted, so I ran the
subset after resolving it):

- `pytest tests/test_js_python_vocabulary.py tests/test_js_vocabulary_is_generated.py tests/test_viewer_readme_doc_facts.py tests/test_viewer_deep_link_contract.py tests/test_app_type_scale.py tests/test_mutation_witnesses.py tests/test_claims_registry.py tests/test_architecture_inventory.py`: **178 passed**.
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack/data/scratch/nested_bodies/repo`: **671/671**. The projections paired.
- `node apps/annotate/run_tests.cjs`: **304/304** (integration's sibling added one).
- After my inline doc fix: `test_app_type_scale`, `test_claims_registry` and `test_mutation_witnesses`: **92 passed**.

**Browser tier, merged tree** (`node scripts/run_viewer_browser_tests.mjs --repo
C:/workspace/tolstack/data/scratch/nested_bodies/repo`, `node_modules`
junctioned): **40/43 suites in 1974 s**, which is over the 30-min merge budget by
2m54s. The time is recorded, and the sighting is appended to the open budget
issue. The three reds:

1. `topology file://` 207/209 (rail hover): **209/209 when run alone**.
   `topology http`, which runs the same 209 checks, passed in the same full run.
   The red came from load: I ran the pytest subset while that suite was running.
   It is not the diff.
2. `annotate rail holds still` 11/17: already red on integration, and filed
   (`ISSUE_20261108_the_rail_holds_still_browser_check_is_red_on_integration.md`).
3. `the model drawn alone and led` 1/2: the sibling handoff's new check. It is
   **equally red on `git archive integration`** against the same projections
   (the same 19 leaders and the same 4 joint nodes), so it is not this branch.
   Its own review measured it against master's projections. Filed as
   `ISSUE_20261109_the_model_drawn_alone_and_led_check_is_red_on_integration_against_integration_built_projections.md`
   (`high`).

**Post-merge full suite (review worktree, merged tree):**
`C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q`
gave **1 failed, 1890 passed, 1 skipped, 2 deselected in 426.92 s**. The one
failure is `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`. It is
deliberately red in a worktree, and the tier it wraps passed 671/671 through
`--repo` (above). tolstack's suite prints no
`concurrent pytest processes` / `full-suite lock` header lines. The run left
nothing to exercise in the main checkout's `data/`, and no `data/` writes were
observed.

**Mutation witnesses**: `node scripts/run_mutation_witness_tests.mjs --repo
C:/workspace/tolstack/data/scratch/nested_bodies/repo --changed-since integration`,
on the merged tree, gave **38/38 witnessed, 38/65 reached in 29m02s, 27 left to the
sweep (budget), exit 0**. That is a pass by the repo's rule. The cap left two of
this handoff's own new browser guards unreached: Parts/Bodies off, and one ink in
the DAG and the grid. I started `--only` runs of those two after landing, and their
result is appended below.

## Findings

### Fixed inline

- **nit, `docs/DESIGN_TYPE_AND_COLOUR.md` (the grid brackets row) and the
  `apps/viewer/topology.css` brackets comment.** Both still said a grid row's
  background "carries nothing: no tint" / "no body tint". Under
  `Colour by: Body`, now the default, a row wears its body's ink at
  `--tv-body-tint` (`.tvrow--ink`). The doc row also still gave the bracket hue
  as `--group-*`. Each fix is a sentence, with no behaviour change and no test
  needed.

### Should-fix (filed, not blocking)

- **should-fix, design: the default palettes wear the provenance hues.**
  `apps/viewer/README.md` "The colours" says green, amber, red and magenta "are
  provenance on this surface and nothing else may wear them". "Reading the
  colours" says provenance is the only saturated colour. The default Bold set
  is green `#00cc96`, amber `#fecb52`/`#ffa15a`, red `#ef553b` and magenta
  `#ff97ff`, and v2's tangential link is that green beside the provenance chips.
  Jeff asked for a plotly-class set, so this is a decision to settle, not a
  defect to revert. The issue already existed
  (`ISSUE_20261105_design_overlay_inks_include_state_greens_and_reds.md`, on my
  branch through the merge). I appended a dated addendum: its only mitigation
  ("a reader never sees body and sourcing together") stopped holding when this
  handoff made Body the default. I also raised it to `med`. The decision is
  which half to change: the palettes or those two README sentences.
- **design, low: a long body name runs past its DAG container**, with rails
  drawn through the letters. "ground: the hub, …" overruns by about 50px and
  "pitch plate, …" by about 35px in the v2 default shots. The DoD's "no label
  over a label or glyph" still holds. Filed as
  `ISSUE_20261109_design_a_long_body_name_runs_past_its_container_and_under_the_rails.md`.

### Already filed by the tactical agent, and I agree

- The part number is printed twice in the grid, and the 152px gutter hides the
  value columns at 1600 (`…prints_a_parts_number_twice…`, `audience: strategy`).
  **Worth knowing for the demo:** at 1600 wide with the Preview open, only PART
  and DESCRIPTION are visible until the reader presses Fit or scrolls.
- v1's chain-study names overprint each other, which predates this handoff.
- The 3D tint does not follow a palette switch (M2).

## Lesson audit

- Contrast table: all 24 values re-derive.
- "PART column 152px wider" = 84 + 68 ✓.
- Compact 26 → 18, with pitch 20 and dot r 7 at both densities: matches the
  code and the browser check.
- The README numbers (2321 → 1147, 1174 → 743) are pinned by
  `test_viewer_readme_doc_facts`, which passed.
- Verification record: on its face it is consistent with the commits. Its "42/43
  … the red is `annotate rail holds still`" was measured **before** integration
  gained the sibling's `model drawn alone and led` suite. That explains why its
  count has one fewer red than mine.

## For the next reviewer

I added one entry to `docs/prompts/REVIEW_AGENT.md` under Recurring bugs: when a
diff flips a view setting's default, grep for the sentences and issues that
leaned on the old default.

## Addendum, after landing: the two capped guards

After `integration` was fast-forwarded to `de5255f0`, I ran each guard alone with
`node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack/data/scratch/nested_bodies/repo --only "<guard>"`:

- `[real] on both models Parts off removes every part outline, Bodies off every body outline, and both off leaves the nodes and bars`: **WITNESSED** (5m55s).
- `[real] on both models the DAG's body outlines and the grid's body brackets wear the same inks`: **WITNESSED** (5m48s).

All four of this handoff's new browser guards have now been seen failing under
their mutation.
