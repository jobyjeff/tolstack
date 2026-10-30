---
type: review
handoff: docs/sessions/active/HANDOFF_20261029_a_rail_row_with_a_proposal_says_so_and_accepts_it_in_place.md
reviewer: agent
date: 2026-10-29
verdict: APPROVE
blockers: 0
---

# Review: a_rail_row_with_a_proposal_says_so_and_accepts_it_in_place

Branch `handoff/a_rail_row_with_a_proposal_says_so_and_accepts_it_in_place`
(9 commits, tip `1290e73c`). `integration` (`93203ff4`) did not contain it, and
it was cut from that tip, so `git merge` into `review/<slug>` fast-forwarded
with no conflicts. This is the first review of the slug: there was no earlier
report, and every lesson and issue in the diff is `A`. The one `M` is an
addendum appended to the tactical agent's own edge-feature issue.

This is not a tolerance stack. The overlay's mandatory checks 1–7 (provenance,
signs, LMC/MMC, RSS, nominal-in-band, quantised hardware, traced ratio) **do
not apply**. The diff adds no element value, band, citation or stack data, and
no projection builder changed, so the traced ratio is unchanged.

## What I verified

- **The handoff's decisions, in code.**
  - `sweep.js` `AA.endSuggestion` returns `proposed` (surest first) or
    `candidates` (`n`, the top face at this end), and `null` once the end is
    bound. A proposal at the other end is no longer counted as this end's
    `proposed` state (`AA.featureBindingState`).
  - `featureRow` puts "suggested · high" / "candidates · n" on the state line,
    with who and why on hover, and draws Accept / Pick a different face only on
    the selected suggested row. A row with no proposal keeps plain Pick.
  - `inspectFeature` draws the proposed face solid on every occurrence
    (`scene.setSuggestionFocus`), frames the occurrence the end's body anchors
    (`anchoredOccurrences`, now shared with `cmdArm`), dims the rest and puts
    back the ghost state it found, and emphasises the marker or the node dot.
  - Every reader-facing word comes from `AA.SUGGESTION_ROW_WORDS`. No sha or
    face id appears on a row.
- **One write path.** `AA.planAnswer` plus `AA.buildAnswerEvents`
  (`binding_state.js`) and `writeAnswer` (`app.js`) serve the rail's Accept
  (`accept` verb), the armed click, and the bind bar's Accept and Reject. The
  bar's inline builders are gone, so there are not two copies.
  - "Pick a different face" writes every `rejected` and then the `bound`, with
    consecutive seq numbers.
  - A click on the proposed face itself is planned as an accept.
  - The agent guard (`an agent only proposes`) is kept.
  - `geometryKeyOfPick` uses camelCase keys, which match `planAnswer`'s
    comparison against the snake_case `geometry_key`.
- **The real inbox was untouched.** It holds 56 files: 55 `proposed` events
  plus the README. By my recount that is 55 proposals on 33 edges, 45 high and
  10 medium, which agrees with the handoff.
- **Lesson arithmetic, re-derived.** On the kinematic study the five
  reachable proposals are one each at `pitch_link_length` from/to,
  `tan_link_length` from/to and `hub_to_pitch_plate_spindle_coaxiality.to`.
  The from end of that last edge has none. That matches "5". The 9-row
  breakdown (6 + 2 + 1) adds up. The "33 of 95 edges" figure is pinned by a
  `[real]` browser check, which passed here.
- **Guards and witnesses.**
  - The `DECLARED_GUARDS` pin moved by fast +1, annotate +8 (net, one renamed)
    and browser +15.
  - 24 new spec files cover them, the renamed chip check's spec was replaced,
    and three specs were re-anchored.
  - The pin comment names the one unenrollable browser push (`skipped`, whose
    condition is literal `true`). I accept that claim.
- **The overlay's "annotator verb" entry.** The new `accept` verb changes
  neither mode nor subject, so it needs no `announced()`. The new behaviour of
  `goto` (`wholeTopology()`) goes through `goto`, which is already announced.
- **The overlay's cross-frame message entry.** `annotate:rail` rows gained a
  `suggestion` field, not a verb. The real-iframe browser check "the shell's
  mirror carries the row's suggestion line" exercises it.

## Tests (the tactical record covers a full run: 1684 passed / 2 failed, both explained)

Before the merge I ran this risky subset, chosen from the overlay rows for
`apps/annotate/`, `apps/viewer/`, guards and prose:

| run | result |
|---|---|
| `pytest -q` test_js_python_vocabulary, test_js_vocabulary_is_generated, test_feature_identity, test_part_mesh_aliases, test_mutation_witnesses, test_tolerance_stack, test_provenance, test_thermal_exception_list, test_claims_registry, test_architecture_inventory, test_app_type_scale, test_viewer_readme_doc_facts, test_viewer_deep_link_contract | **420 passed** |
| `node apps/annotate/run_tests.cjs` | **266/266** |
| `node apps/annotate/run_browser_check.mjs` (mock) | 103/105. The 2 reds are the mock-anchor checks, filed on integration as `ISSUE_20261028_annotate_browser_check_mock_anchor_checks_are_red_on_integration.md` |
| `node apps/viewer/run_tests.cjs --repo <scratch rail_row_root>` | 623/626. Its projections are paired with `481659008f19`. The 3 reds are `display_name` fixture/merged-cell checks, filed on integration (`ISSUE_20261029_display_name_reached_the_projections_but_not_the_viewer_fixtures…`). The diff touches no fixture or builder |
| `node scripts/run_viewer_browser_tests.mjs --repo <scratch rail_row_root>` (node_modules junctioned) | 35/37 in 5m57s. The new **rail suggestion suite was 14/14**. The two reds both **pass alone with `--only`**: "3D pane follows the selection" 32/32 and "crop lightbox" 20/20. Both are filed full-run flakes (`ISSUE_20261029_four_3d_pane_nav_gesture_checks…`, `ISSUE_20261028_crop_lightbox_suite_fails_under_load_on_launcher_focus.md`) |

After the merge I ran the full suite in the review worktree (merged tree):
`PYTHONIOENCODING=utf-8 C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -rfs`
gave **1685 passed, 1 skipped, 1 failed** in 330 s (recorded as `inside budget`).

- The failure is `test_viewer_js_suite_is_green`, the deliberate worktree red
  (no `data/projections/viewer/` here). The `--repo` runs above cover that
  tier.
- The skip is the pitch-link bearing re-extraction.
- tolstack's conftest prints no contention header lines.
- Nothing under the main checkout's `data/` (outside `data/scratch/`) was
  modified during the run.

Mutation witnesses (`--changed-since integration --repo C:/workspace/tolstack`):
see "Witness tier" at the end.

## Findings

No blockers and no should-fix findings.

**Nits** (not filed; none of them changes behaviour):

1. `apps/viewer/tests.js`, "a mirrored row the annotator marks as a
   suggestion…": the `"a suggestion is not amber"` assertion is vacuous. The
   input row never sets `attention`, so the renderer cannot add it. The real
   decision is in `app.js` `railRow` (`QUIET_BINDING_STATES`), and the browser
   mirror check covers it.
2. `apps/annotate/style.css` `.el-row__proposal`: the comment above it still
   says "muted", but the rule now draws in the suggestion blue.
3. `sweep.js` `AA.endSuggestion` reads `row.status === "ok"` as an inline
   literal. That repeats an existing literal in `suggestions.js:588`, and no
   generated constant exists for the contact-row statuses yet. If one is
   added, both sites should move together.
4. `writeAnswer` writes events one file at a time. If the `bound` write fails
   after a `rejected` write succeeded, the proposal is left rejected with
   nothing bound. The end then reads unbound and can be picked again, so this
   is recoverable and not worth a transaction.
5. Bind mode's bind form (`buildBindForm`) still builds its own `bound` event.
   Binding through it at a proposed end leaves the proposal open, although
   bound wins in the fold. That form is the standalone chrome the handoff
   fenced off for `the_annotator_has_no_front_door`, so I added an overlay
   entry and filed no issue.

## Scope notes

- **Deliverable 3, "55 suggested ends" on the topology-level entry.** The
  topology row lists every edge in bind mode, so 33 rows read "suggested" and
  all 55 proposals can be answered from the bar. Only 5 can be answered on a
  sweep-rail row. The lesson says so plainly, and the gap is filed with
  options and `audience: strategy`
  (`ISSUE_20261029_fifty_of_the_fifty_five_proposals_are_answered_from_bind_modes_bar_not_a_rail_row.md`,
  frontmatter checked). The DoD's click path, kinematic study → 3D pane →
  joint end → select → Accept, is met and written out in the lesson.
- **Main-checkout scratch.** The lesson asks the reviewer to delete
  `data/scratch/rail_row/` and `data/scratch/rail_row_root/` after the review.
  They are gitignored and hold junctions to the main checkout's `meshes` and
  `inbox` streams. A recursive delete would follow a junction into real data,
  so I **left them in place**: removing a junction safely is a one-way step
  better done by the next triage sweep. The lesson's warning is correct.

## Overlay

I added a "feature-identity write that bypasses the one answer path" entry
under Recurring bugs, with its grep.

## Witness tier

`node scripts/run_mutation_witness_tests.mjs --changed-since integration~0 --repo C:/workspace/tolstack`
gave **59/63 witnessed, 63/63 reached** in 20m54s (inside budget), with 0
left to the sweep. The command exited 1 because of the NOT WITNESSED entries
below. Each of those four is "the tier was red before the mutation, so nothing
was proved": the main checkout's shared projections are older than this tree,
and the viewer fast tier is red at baseline (`display_name`).

- `fast__a-mirrored-row-the-annotator-marks-as-a-suggestion…a6c0094f` is this
  handoff's own guard, so **I witnessed it by hand**. I commented out
  `nav.js`'s `data-suggestion` line and ran the fast tier against the scratch
  root: 622/626, with exactly that check newly red beside the 3 baseline reds.
  I then restored the file (`git status` clean).
- `browser__real-a-structural-line-rides-its-body…85040aa4`, re-run with
  `--only` against the scratch root built from this tree: **1/1 witnessed**.
- `fast__a-mirrored-row-with-a-pressed-button…d7d247f8` and
  `fast__the-scene-s-tree-under-the-study-row…ed8e4a27` belong to the previous
  handoff. They cannot be proved anywhere while the viewer fast tier is red at
  baseline. The cause is already filed as
  `ISSUE_20261029_display_name_reached_the_projections_but_not_the_viewer_fixtures_so_the_real_tier_is_red_on_integration.md`.
  Once that is fixed, the sweep will reach them.
