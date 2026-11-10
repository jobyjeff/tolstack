---
type: review
handoff: docs/sessions/active/HANDOFF_20261109_the_demo_path_reads_cleanly_on_a_projector.md
reviewer: agent
date: 2026-11-09
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-11-09: the_demo_path_reads_cleanly_on_a_projector

**Verdict: APPROVE, 0 blockers.** There is one should-fix, filed as an issue,
and four nits. One of the nits I fixed inline.

All five deliverables are done, and the merged page shows them. The chip is
gone in all five demo clicks. PART through ELEMENT are on screen beside the open
pane at 1920. The Preview copy has no backticks, negation or field names. The
lines are heavier. The HTTP probe asks the right mount first. The gap is
coverage: the layout fix and the line weights can be reverted with every tier
green. I measured this and filed it.

## What I verified

- **Branch state.** This is a first review: `review/…` carried only
  integration's history, with no prior report. `handoff/…` was not already
  contained in `integration`. Every lesson, issue and shot in the diff is new
  (`A`), except the over-budget issue, which got an appended section (`M`).
- **The diff, line by line**, against the handoff's three decisions:
  - **Chip.** `AA.paneStatusShown(status, writeBegun)` returns null until
    `beginWrite()` runs. Three gestures call it: `cmdSelectFace`, `cmdArm` and
    `nextEventSeq`. `renderPaneStatus` posts an empty word while the status is
    hidden, and the shell already reads an empty word as "no chip".
  - **Grid.** The doubled number is gone: `VA.gridPartLabel` labels the
    bracket, and `partCells(…, bracketed)` leaves the cell empty under a
    bracket. The PART column is 112 + 84 = 196px, down from 264. The scene's
    clamp now keeps the drawing plus `VA.gridKeptWidth()` (586px through
    ELEMENT). The Preview clamps to `clamp(200px, 100vw − 1706px, 560px)` under
    `flyout-open`.
  - **Weights.** Bar 4 > rails 3 > leaders 2 = body containers 2 > part
    containers 1.5, and each hot, lead or selected state is one step above its
    base. That fits "dimension bar > rails > leaders ≥ containers".
  - **Copy.** All three value sources got a new `title` and a new `crop`. The
    transform line now shows nothing for one-to-one and "scaled …" otherwise.
    The chain-study note was rewritten. The backtick is added to
    `reader_facing_bans.js`.
  - **404.** `VA.httpCandidateOrder(pathname)` tries the candidate the page's
    own path names first, and both are still probed. An empty icon is added on
    served pages only.
- **The lesson's arithmetic, re-derived:**
  - 264 → 196 (112+84+68 → 112+84).
  - 586 = 196+140+30+220.
  - 1706 ≈ 300 + 400 + 416 + 586 + dividers, and 1920 − 1706 = 214, the
    Preview's measured width.
  - "22 notes" of "M2 adds the term" in `topology_vpa_end_stop_v2.json`: 22.
  - The strings table matches the code, site for site.
- **The demo phase, re-shot on the merged tree**:
  `node tests/debug_integration_walk_20261108.mjs --phase demo --shots <scratch>`.
  - No errors in any of the five clicks. 17 seam leaders at 2px during the
    sweep.
  - The Preview reads "A study computes it from the dimensions on either side."
  - No status chip. PART, DESCRIPTION, # and ELEMENT are on screen. The
    DERIVED chip wraps inside its pill.
  - My demo_5 is committed beside the author's as
    `shots/…/review/demo_5_tan_link_length_selected_merged.png`. See nit N2 for
    why.
- **The tactical suite record.** It covers every tier, with counts and with the
  reds explained. There is no reason to void it.
  - The two browser reds were trunk's, and their handoff has since landed on
    integration (merged here).
  - The one witness miss (`…nav-stays-beside…`) the author reproduced on
    trunk, and filed.
- **Merge.** `git merge handoff/…` conflicted in two files. I resolved both and
  then merged integration (`5fec3b0f`), which was clean.
  - `scripts/guard_enumeration.mjs`. Both sides moved the annotate and browser
    census pins: the sibling `a_folded_part_rides_its_own_body…` went +2/+2,
    this handoff +1 and a two-for-two swap. I summed the counts against the
    merge base (annotate 307/307, browser 866/833, fast 674 unchanged), kept
    both comments, and re-measured the names digests with `census()`:
    `448f901a9e4d` and `f095291d1d17`.
  - `docs/issues/ISSUE_20261106_…_merge_budget.md`. Two appended measurements
    from the same day; I kept both, in landing order.

## Tests

- **Pre-landing risky subset, on the merged tree:**
  - `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: **674/674**.
  - `node apps/annotate/run_tests.cjs --repo C:/workspace/tolstack`: **307/307**,
    no SKIP lines.
  - `pytest -q` over `test_js_python_vocabulary`, `test_viewer_readme_doc_facts`,
    `test_viewer_deep_link_contract`, `test_js_vocabulary_is_generated`,
    `test_feature_identity`, `test_app_type_scale`, `test_mutation_witnesses`,
    `test_architecture_inventory`, `test_claims_registry` and `test_provenance`:
    **249 passed**.
- **The mutation that found S1:**
  `--only "annotate flyout"` with the deliverable-2 lines reverted: **41/41, green**.
- POST-MERGE-PLACEHOLDER

## Findings

### Should-fix (filed: `docs/issues/ISSUE_20261109_the_grid_beside_the_open_pane_and_the_new_line_weights_revert_green_in_every_tier.md`)

**S1. Two deliverables can be reverted with every tier green.** This is the
"whole deliverable is one line from silently reverted" entry again, its fifth
sighting.

- **The grid beside the open pane.** I deleted
  `body.flyout-open .tv .detail { width: clamp(…1706px…) }` in
  `apps/viewer/topology.css` and `graphNeed()`'s `+ VA.gridKeptWidth()` in
  `apps/viewer/topology_app.js`. The flyout suite stayed 41/41. Its live-study
  checks ask whether the drawing is clear of the panel, which holds in both
  layouts.
- **`1706` is a hand sum, paired with nothing.** It is nav 300 + scene floor
  400 + v2's 416px leader fan + `gridKeptWidth` 586 + dividers.
- **The line weights.** Only the relational "hot rail thicker" check reads
  them.

The DoD asked for these to be measured and quoted, not guarded, and the lesson
does that. So this is a should-fix and not a blocker. The issue names the check
and specs that would close it.

### Nits

- **N1. The chip rule takes one reading of the decision, and does not say so.**
  The decision reads "appears only when a write is attempted, **or in bind
  mode**". The branch shows no chip in bind mode until a face is picked, and the
  lesson's click 5 says "none (bind mode, nothing picked yet)".
  - The source issue offered those as two *alternatives* ("Show nothing until a
    write is attempted, or show the chip only in bind mode"). The branch takes
    the first, and the issue's row-selected state was one it wanted cleared.
  - I read the branch as faithful. The lesson should have named the choice.
    No action.
- **N2. The committed `after/demo_5` shot is older than the chip-wrap fix.** It
  shows "DERIVED — the quantity a study co" clipped at the Preview's edge. The
  wrap fix (`4aef1610`, 15:00) is in the tree and works; my re-shot shows the
  chip wrapped. The shots were committed with the lesson at 16:45 but taken
  before 15:00. My shot is now committed beside it, and the overlay has an
  entry for this.
- **N3. Fixed inline.** The re-anchored
  `browser__the-leaders-across-the-seam-rest-in-the-same-dimmed-ink__50620c99.json`
  `replace` changed the ink *and* moved the width from 2 to 1.5, so the
  mutation changed two things. Its `replace` now keeps `stroke-width: 2`, and
  the post-merge `--changed-since` run re-checks it.
- **N4.** The annotate check that `cmdSelectFace`, `cmdArm` and `nextEventSeq`
  call `beginWrite()` is a text search over function bodies. Its spec's second
  mutation witnesses the `cmdSelectFace` call. That is acceptable for a
  three-name wiring check, and is noted for whoever restructures those
  functions. The sleep-gated absence check is item 3 of the filed issue.

### Design (non-blocking, nothing new filed)

- At 1920 with the pane open, the Preview is 214px. That is the stated
  trade-off and it reads acceptably in the shots.
- The remaining demo-path copy defects are already filed by the author:
  - M2 wording: `ISSUE_20261109_the_end_stop_models_notes_say_m2_adds_the_term_on_the_demo_path.md`.
  - Backticked ids: `ISSUE_20261109_deep_link_and_drift_notices_print_ids_in_backticks.md`.
  - Sweep head row at 400px: `ISSUE_20261109_the_sweep_bars_head_row_clips_its_controls_at_the_scenes_400px_floor.md`.

## Tolerance-stack mandatory checks

None apply. The diff touches no stack, topology, hardware entry or spec-library
event: `git diff --name-only` has nothing under `docs/tolerance_stacks/`,
`docs/topologies/` or `data/`. The traced ratio is therefore unchanged by this
work, and I did not recompute it.

## Found on arrival

Clean review worktree; nothing.
