---
type: review
handoff: docs/sessions/active/HANDOFF_20261028_the_active_study_is_a_compact_band_and_the_rest_of_the_model_hangs_above_and_below.md
reviewer: agent
date: 2026-10-28
verdict: APPROVE
blockers: 0
---

# Review — the_active_study_is_a_compact_band_and_the_rest_of_the_model_hangs_above_and_below

Branch `handoff/…` at `ca18adf1` (8 commits), merged into
`review/…` at `26aa8f73` on top of `integration` `0380a557`. The work was not
in `integration` before this review (the containment check came back false).
This is the first review of this handoff, and there was no prior attempt on
the review branch.

## What the work is

All in JS. With a study selected, the walk's rows are re-ordered.
`VA.bandSides` decides which side each unlit row goes to. `VA.layWalk` is a
generic re-layer of any row order. `VA.bandLayout` puts the rest of the walk
above and below the lit band, which sits on the spine's columns. Hidden mode
draws the band alone. A direction-aware `closePath` lets an unlit edge curve
down into the band. Each body is named once, on its band field
(`VA.bodyLabelFields`). Collapsed pills get unique ids per block
(`body:<id>#2`). After the respine settles, a study arrival runs Fit
(`fitDagTo(true)`). There is no Python change and no projection-input change.
That is correct: nothing in the builders needs to move, and the lesson says
so.

## Checklist

- **Tolerance-stack mandatory checks 1–7:** not applicable. No stack,
  topology, spec or material data changed. The traced ratio is unchanged,
  because no element was touched.
- **Handoff fence:** respected. Only `apps/viewer/{topology.js,
  topology_app.js, views/topology.js, tests.js, README.md}` and the browser
  runner changed. `apps/annotate/`, `views/kinematic.js` and the lit-set code
  are untouched. `topology.css` was not needed.
- **DoD — browser, three studies:** done.
  - On the respine page, `rotor_fastener_grip_u2h` and
    `pitch_system_blade_angle_worst` are each checked as contiguous on screen,
    in view after Fit, with every bar and dot still drawn. Each one's leader
    ends land on the moved dots, and hidden mode is one connected drawing.
  - The kinematic study is checked on its own page, and the compact-density
    target is met: in my run the band was 480 px drawn in the 500 px box, at
    zoom 0.717.
  - The handoff's "a thermal fit" study does not exist on the product
    topology (thermal fits are stacks). The lesson says so and substitutes the
    81-row pitch chain. Accepted.
- **DoD — `tests.js`:**
  - Contiguity over the real projection, for all 22 chain studies plus the
    kinematic study.
  - The side rule on a hand-built walk with interleaved pieces.
  - Body fields split and named once.
  - `testRespine` extended (part 5).
  - The identity re-lay test pins `layWalk` against every committed walk.
- **Lesson arithmetic: re-derived, exact.** I ran a scratch script over the
  merged tree's projection. It reproduced every row of the crossings table
  (lit rows, walk span, crossings in walk / in band, band columns). It also
  confirmed "11 columns for every study", and the heights follow (rows × 26 /
  16). The kinematic study's lit rows are 42, its span 105, its crossings 15
  → 7, and its band 5 columns wide. I could not re-derive the "58 leader
  crossings" with a script. It matches what my browser run printed
  (`crossings among them 58`).
- **Guards enrolled:** 8 fast and 6 browser guards, each with a spec, and the
  census was re-pinned. The specs mutate the wiring lines as well as the pure
  functions:
  - the arrival-Fit `if (false && …)`;
  - `layWalk(layout.rows…)` in place of the band order;
  - `{only: true}` dropped from the hidden path;
  - the zoom factor in the seam.
- **Weakened assertion (`six to ten` → `at least six`):** the justification
  holds on the committed data. The box now shows the whole band (17 leaders
  in my run), and the equality `ids == expected` is still asserted, so the
  check is not vacuous. But see S1 for what the re-aim lost.
- **Design:** the band arrival-Fit is designed behaviour (handoff step 4). I
  read the README rewrite paragraph by paragraph, and no tail of the old text
  survives. No design finding to file.
- **Issue frontmatter:** all three tactical issues are well-formed.

## Findings

### Should-fix (unfixed; issues exist)

- **S1 — the seam's dot clip lost both of its witnesses.** Location:
  `scripts/mutation_witnesses/browser__real-on-p2-…__47dcfe3f.json` and
  `…at-least-six…__fce3b8e5.json`.
  - Arrival Fit means no lit dot is out of the box in those checks, so both
    old mutations (`dotClip: null` and the bottom-edge drop) stopped
    reddening.
  - Both were re-aimed at the *same* zoom mutation. `git grep dotClip --
    scripts/mutation_witnesses/` is now empty.
  - The clip is still live behaviour: zoom in or scroll the box, and it is
    what stops leaders being drawn to unseen dots.
  - This is a coverage loss, not a defect in the product. Filed as
    `ISSUE_20261028_the_seam_dot_clip_lost_both_its_witnesses_when_the_band_began_fitting_the_box.md`
    (med), and the class is added to the overlay.
- **S2 — the transition tweens y only; a row that changes column jumps
  sideways on the first frame.** Location: `VA.tweenPositions` /
  `VA.respineX`.
  - Handoff step 3 asked for keyed positions to move. The author measured
    and disclosed this, and filed it as
    `ISSUE_20261028_a_row_the_band_moves_sideways_jumps_to_its_new_column_on_the_first_frame.md`,
    which is a design question.
  - Accepted as filed. That issue would route better with
    `audience: strategy`, but that is not worth an edit.

### Nits

- `VA.bodyLabelFields`'s `holdsLit` re-checks `if (!lit)` after the function
  has already returned on `!lit`. Harmless.

## Merge

`integration` had moved by one handoff (`the_scene_pane_is_one_flyout_that_reads_over_http`).
There was one conflict, in `scripts/guard_enumeration.mjs` `DECLARED_GUARDS`.
Neither side was right on its own. I took integration's as a placeholder,
re-measured with `node scripts/guard_enumeration.mjs --json`, and pinned the
result. Each count is integration's pin plus this handoff's delta:

- fast 599 + 8 = **607**;
- annotate **246** (unchanged);
- browser 713 + 6 = **719**, enrollable 680 + 6 = **686**.

I added a comment line naming the merge. The conflict grep found no markers.

## Test record

| when | tier | where | result |
| --- | --- | --- | --- |
| pre-merge | pytest `test_mutation_witnesses, test_js_python_vocabulary, test_viewer_readme_doc_facts, test_viewer_deep_link_contract, test_architecture_inventory` | handoff worktree | 69 passed |
| pre-merge | `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | handoff worktree | 606/606 |
| post-merge | `pytest tests/test_mutation_witnesses.py` (census) | review worktree | 44 passed |
| post-merge | fast tier `--repo C:/workspace/tolstack` | review worktree | **refused**: the main checkout's kinematic projection predates integration's `build_kinematic_projection.py` change (the freshness gate working) |
| post-merge | fast tier `--repo data/scratch/review_band` (all five builders run from the merged tree with `--data-root`) | review worktree | **606/606**, freshness pairs with the merge |
| post-merge | `node apps/annotate/run_tests.cjs` | review worktree | 246/246 |
| post-merge | full `pytest -q` | review worktree | **1593 passed, 1 skipped, 1 failed**, 316 s (inside budget, recorded). The one failure is `test_viewer_js_suite_is_green`, red by design in a worktree because a tier was SKIPPED for lack of `data/`. The fast tier above covers it through `--repo`. This repo's conftest prints no contention header lines. |
| post-merge | `node scripts/run_viewer_browser_tests.mjs --repo <scratch>` | review worktree, `node_modules` junctioned | **34/35**, 346 s (inside budget, recorded). The red is `crop lightbox`'s launcher-focus check, already filed (`ISSUE_20261028_crop_lightbox_suite_fails_under_load_on_launcher_focus.md`), and the diff touches nothing in it. Every suite the diff touches is green: respine 44/44, DAG zoom 26/26, flyout 46/46, kinematic page 19/19, seam leaders 17/17 (P2: 17 leaders). |
| post-merge | doc-corpus row (`test_tolerance_stack, test_provenance, test_thermal_exception_list, test_claims_registry`) after the overlay edit | review worktree | 221 passed |
| post-merge | `run_mutation_witness_tests.mjs --changed-since master --repo <scratch>` | review worktree | **70/71 witnessed, 71/145 reached, 29m53s, 74 left to the sweep (budget)**. The one miss is `browser__real-clicking-a-contributor-row-…__d42adbc7`. Integration already carries it as a decay, filed by the previous review (`ISSUE_20261028_the_contributor_row_highlight_witness_aborts_before_its_check.md`), so it is not a drop this merge caused. Eight of this handoff's own browser specs were among the 74 left to the sweep. The tactical agent's record has them witnessed (`--changed-since integration` 32/35, and `--only` on the seam suite 4/4). Per the cap rule, I did not re-run them. |

Not exercised in the worktree: nothing beyond the data-gated JS suite, which
the `--repo` fast tier covers.
