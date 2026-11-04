---
type: review
handoff: docs/sessions/active/HANDOFF_20261103_a_joint_end_lists_its_candidate_faces_and_says_why_each_is_there.md
reviewer: agent
date: 2026-11-03
verdict: APPROVE
blockers: 0
---

# Review — a_joint_end_lists_its_candidate_faces_and_says_why_each_is_there

**Verdict: APPROVE.** No blockers. I fixed nothing inline. The work is
`apps/annotate/` and the shell's nav mirror only. It touches no stack and no
`source_ref`, so mandatory checks 1–7 (provenance, signs, LMC/MMC, RSS,
nominal-in-band, cotter quantisation, traced ratio) **exit: no stack element
or band is added or changed.** The one rule still applies in its UI form, and
it holds. A candidate's radius is labelled evidence for a rank, "never a
value", and a Take writes an identity event, never a dimension.

## What I verified

- **Which run.** The handoff is `active/`, and this is its first review. All
  lesson and screenshot files arrive as `A`. The only `M` docs are issue
  addenda and status edits.
- **Merge.** `integration` (`d9eb2196`) went into `review/<slug>`, then
  `handoff/<slug>` was merged (`38eecafe`). There was **one conflict**, in
  `docs/issues/ISSUE_20261022_the_default_test_tier_runs_past_its_ten_minute_budget.md`.
  The slide review's addendum (`integration`) and this handoff's addendum
  (`handoff`) were both appended at the same spot. I kept both, in that order.
  They are independent dated measurements.
- **Code read against the handoff's five deliverables.**
  - `AA.endContactFaces` dedups by `(sha256, faceId)` in best-rank order. The
    closed row's count is now faces, not pairs. On the real projection, the
    hub spindle end has 26 faces from 10 pairs and the pitch-plate end has 2.
    I re-derived both from `contact_suggestions.json`.
  - `AA.endCandidates` puts proposals first, surest first. A proposed face is
    listed once, and the engine's reason rides on its hover.
  - `cmdTake` goes through `AA.planArmedClick` → `AA.planAnswer(pick)` →
    `writeAnswer`, which is the one write path. A face already bound writes
    nothing. `answerSupersedes` is unchanged.
  - `washFace` reuses `_drawWash`. It is not gated on a pick filter, and the
    `[real]` witness is exactly that mutation. A wash token guards against a
    late part load.
  - Every reason word is keyed through `VOCAB.table` over the generated
    vocabularies, so drift throws at load.
- **Lesson audit.** The 20 ends with contact faces is right: I recounted it
  on the main-checkout projection the author used. 102 distinct face rows,
  minus the proposed faces they share, is consistent with "90 of them the
  engine's". 145 = 55 + 90, and the reason table sums to 55 + 90. The 55/55
  reach is pinned by an annotate `[real]` check that re-measures it.

## Tests

The tactical report records its full suite, tiers and wall times. All are
consistent with the diff: 13 new specs, the annotate 273 count, viewer 630.
So I gave the record the benefit of the doubt.

| run | where | result |
|---|---|---|
| risky pytest subset: js vocab ×2, feature_identity, part_mesh_aliases, viewer readme/deep-link, app_type_scale, mutation_witnesses, tolerance_stack, provenance, thermal_exception_list, claims_registry, architecture_inventory | review worktree, merged | **420 passed** |
| `node apps/annotate/run_tests.cjs` | review worktree. Its `[real]` checks fall back to the main checkout's (older) projections, and the runner has no `--repo` | **273/273**, no SKIP lines |
| `node apps/viewer/run_tests.cjs --repo <scratch>` | every projection built from the merged tree into `data/scratch/review_candidate_list`. The freshness line pairs all four with `38eecafe` | **624/630**. The 6 reds also fail on a `git archive integration` export (623/629), so they are not this diff's. Filed |
| `node scripts/run_viewer_browser_tests.mjs --repo <scratch>` | same scratch root, `node_modules` junctioned | **34/40**, 1301 s. All six failing suites fail the same way with `--only` from the integration export (topology ×2, real render path, crop lightbox, kinematic study page, 3D pane flake). All 16 suites this diff touches pass, including the sweep rail (24/24), armed pick (17/17) and rail suggestion (19/19) |
| `node scripts/run_mutation_witness_tests.mjs --repo <scratch> --changed-since integration` | same | `35/51 witnessed, 51/57 reached in 29m55s; 6 left to the sweep`. **Every new annotate and browser spec this handoff added is WITNESSED** (5 annotate, 8 browser, plus the re-anchored `d21f3471`/`e2edd808`). The two `fast__` specs it owns (`d442f0db`, re-anchored `ed8e4a27`) are `NOT WITNESSED — the tier was red before the mutation`: the viewer fast tier is red on `[real]` from integration (above). The tactical run witnessed both on its own tree. `browser__real-the-hub-spindle-bore-axis-end-opens…a0d86d5d` was left to the sweep by the budget cap. The other NOT WITNESSED entries are the 3D-pane flake suite |
| **full pytest, post-merge** | review worktree | `2 failed, 1699 passed, 1 skipped, 2 deselected`, **3963 s**. Both reds are known checkout reds: `test_viewer_js_suite`, and `test_contact_suggestions::test_real_…row_per_gap_edge` (`ISSUE_20261103_the_contact_suggestions_real_test_pairs…`). The suite prints no contention header lines. It ran concurrently with the two slot tiers above. Recorded as over budget and appended to the open `suite_over_budget` issue |

The run left `data/` untouched: no file outside `data/scratch/` changed during
the session's runs, and the main checkout is clean.

## Findings

**Blockers:** none.

**Should-fix:** none in this diff's scope.

**Nits** (no issue needed):

1. `apps/annotate/app.js` `candidateRow`: the surest proposal's Take runs
   `accept`, which leaves the end's other open proposals open. Take on any
   other proposal row runs `take`, which rejects them. The handoff asked for
   exactly this, but two proposal rows on one list answer differently. Worth a
   sentence in the gesture table if it ever confuses anyone.
2. `docs/ANNOTATION_SURFACE.md`, "Taking a suggested face", restates the
   reason words in prose, and nothing pairs that prose with
   `AA.CANDIDATE_*_REASONS`. They are display words, not a field vocabulary,
   so drift would cost a stale doc and nothing else.
3. The DoD's walk through the shell at `:8000` was replaced by a scratch
   script driving the pane, with writes to the memory adapter. The shell
   writes over HTTP to the real inbox, so that was the right call, and the
   mirror is covered by the browser check "…with its candidate disclosure
   closed, a toggle from the shell…" (witnessed).

**Design (filed, non-blocking):**
`ISSUE_20261103_design_the_candidate_lists_disclosure_is_nearly_invisible_at_rest.md`
(low). The 10 px muted ▸ reads as a dot, and every reason line uses the
accent colour.

**Out of scope, filed:**
`ISSUE_20261103_the_slide_re_author_leaves_six_viewer_real_checks_red_on_integration.md`
(high). `integration` is red on six viewer fast `[real]` checks and on six
browser suites once projections are built from its tree. The slide
re-author's review deferred those tiers to the batch-merge rebuild. That red
also stops the witness gate from proving any viewer `fast__` guard.

## Overlay

Added a **Recurring bugs** entry: a topology or builder change whose review
leaves the viewer `[real]` tier for the batch rebuild lands `integration`
red. Use the scratch-root recipe, and run the same tier from an integration
export to attribute the reds.

## Housekeeping

The tactical lesson asks that its scratch root,
`data/scratch/candidate_list/` in the main checkout, be deleted after review.
It holds no junctions. I left it for its owner or for triage, because it is
another session's output. I removed my own `data/scratch/review_candidate_list/`
before finishing (its junctions first, with `rmdir`), and the worktree's
`node_modules` junction.

## Landing: `integration` moved during the review

When I came to fast-forward, `integration` had moved to `dde0ecd6`
(`each_stop_is_its_own_stack` approved and landed). I merged it into the
review branch. Two conflicts, both resolved:

- `docs/issues/ISSUE_20261029_four_3d_pane_nav_gesture_checks…md`: two dated
  addenda, mine and each_stop's. I kept both.
- `scripts/guard_enumeration.mjs`: `DECLARED_GUARDS` `fast` and `browser`.
  each_stop swapped eight fast guards (count unchanged at 629) and renamed two
  browser guards (793/760). This handoff adds +1 fast and +8 browser. The
  resolution keeps both comment blocks and pins `fast 630/630` and
  `browser 801/768`, with the name digests recomputed from the merged tree
  (`5a17e779acfd`, `35a2f9e55371`). `annotate` is untouched by integration
  (273). `tests/test_mutation_witnesses.py`: 44 passed.

Re-run after that merge: annotate fast tier 273/273, viewer fast tier
514/514 (worktree, node-fs `[real]` tier skipped), and a pytest subset of
427 passed (vocab ×2, feature_identity, viewer readme/deep-link,
app_type_scale, tolerance_stack, provenance, claims_registry,
architecture_inventory, topology_projection). The scratch-root `[real]`, browser and
witness runs above were measured before each_stop arrived, on `38eecafe`.
