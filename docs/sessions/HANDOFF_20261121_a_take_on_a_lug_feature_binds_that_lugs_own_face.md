---
priority: high
depends_on: []
model: opus
hitl: false
---

# HANDOFF 2026-11-21 — a_take_on_a_lug_feature_binds_that_lugs_own_face: on v2, a suggestion's Take on one plate lug's feature must never bind the other lug's face

Source: `docs/issues/ISSUE_20261120_a_take_on_a_v2_lug_feature_binds_the_other_lugs_face.md`
(high, filed by the review of the 11-19 walk; the evidence table is in the
2026-11-20 addendum to
`docs/issues/ISSUE_20261028_contact_suggestions_cannot_say_which_blade_a_topology_edge_means.md`).
Staged by the 2026-11-21 triage sweep over tolstack's budget, because a `high`
is never deferred and none of the three handoffs already staged that day
(the viewer node suite's timeout, the export citation, the nav body-row hover)
touches the contact engine. Baseline: trunk `master` after the 2026-11-21
batch merge (`d77b2e19` or later), which carries the whole 11-19 chain:
`a_link_is_a_machined_part_and_two_bearings_each_two_races`,
`the_pitch_plate_carries_its_own_features_and_each_lug_is_a_bolt_stack`,
`the_first_end_of_a_joint_offers_the_contact_faces_the_pane_already_holds`
and the walk.

Scope: `scripts/build_contact_suggestions.py`, `tolerance_stack/interface_contact.py`,
`apps/annotate/` (the suggestion / Take path and `AA.sweepCandidateOccurrences`
in `sweep.js`, which `tests/test_contact_suggestions.py` pairs against the
Python), `docs/topologies/topology_vpa_end_stop_v2.json` (occurrence
declarations only — **no part, node or edge id changes**: Jeff's bindings are
keyed on them), `docs/ANNOTATION_SURFACE.md` ("Contact suggestions"), tests and
their witness specs. Do NOT touch `apps/viewer/` (the staged
`the_viewer_node_suite_runs_inside_its_default_tier_timeout` and
`a_body_row_in_the_nav_takes_a_resting_hover_every_time` own it) or
`docs/topologies/topology_vpa_pitch_linkage.json`'s citations (the staged
`an_export_citation_picks_up_a_new_drawing_checker_run_in_one_command` owns
those).

**Never write to Jeff's real log.** `C:\workspace\tolstack\data\inbox\feature-identity\`
is append-only and his. Every Take you press goes into a scratch copy of it
(`tests/debug_bind_latency_20261119.mjs` already builds one; the walk used the
same shape). Jeff is about to re-pick exactly these features
(`docs/sessions/lessons/REVIEW_20261119_the_links_and_the_pitch_plate_stack.md`,
"Bindings that need a re-pick"), which is why this is high.

## What is wrong (measured, integration `8082bad0`, v2)

The two plate lugs are separate parts that share one mesh each (both straight
bushings alias `asm217755_214820_002`, both flanged bushings
`asm217755_NAS77A3_015A`). The contact engine gives **both lugs the same top
candidate**:

| pair (pitch link / tangential link) | top candidate, both lugs |
|---|---|
| `*_straight_bushing_transition_fit` | bushing faces 10, 11 → plate (`0d6f23ee`) faces **1370, 1371**, at occurrence `…/prd-e-03300154.1/…` (the tangential link's group) |
| `*_flanged_bushing_press_fit` | bushing faces 8, 9 → plate faces 1445, 1446, at `…/NAS77C3-015.5` |

On `215735-001 › pitch link straight bushing bore` the suggestion "2 faces ·
round · r 4.2600 … fits the mating pin · Take" bound faces **1370/1371** in a
scratch copy of the log (event 0101). Earlier pages measured 1370/1371 as the
**tangential** link's Ø8.520 bore; the pitch link's is **1380/1381**
(`REVIEW_20261118_…`, "Each joint's play"). The page gave no sign the face is
on the other lug. The pitch-link lug's bolt pins also mix blades:
`pitch_link_bolt_in_flanged_bushing` pairs bolt occurrence
`prd-e-03481962.4` with `NAS77C3-015.7`, while
`pitch_link_upper_inner_race_on_bolt` and `pitch_link_bolt_in_straight_bushing`
use `prd-e-03481962.1`.

## Deliverables

1. **Each lug is offered its own faces.** Find why the engine settles a
   shared-mesh part at the other lug's occurrence (`candidate_occurrences` /
   `AA.sweepCandidateOccurrences`' second arm, `<product>.<n>`, is the first
   suspect, but measure — the diagnosis is the work), and fix it at the class:
   *a part that shares its mesh with another part of the same model is
   resolved at its own occurrence, never at whichever slot ranks best*.
   Suggested directions, labelled as suggestions: declare each lug part's
   occurrence on v2 (the flanged bushings already carry some — check which
   parts do not), and/or have the engine pick a shared-mesh part's occurrence
   by the interface's partner (the occurrence nearest the partner's own
   placed occurrence). Report in the lesson which you chose and why.
2. **What the engine cannot resolve is not a Take.** Where a part's
   occurrence still cannot be told apart, the suggestion row is shown without
   a Take (Pick a face still works) and says, in one short phrase, that its
   place is not known — never a silent wrong offer. Same fence as today:
   display and ranking only, never a value.
3. **The mixed-blade bolt pins** above: either all three of the pitch-link
   lug's bolt edges resolve to one bolt occurrence, or the lesson says why
   two occurrences are right.
4. **Re-read the four lug features on the real projection** after a rebuild
   (`scripts/rebuild_projections.ps1` from the main checkout's interpreter, or
   the builder with `--data-root C:\workspace\tolstack\data` from your
   worktree): pitch-link straight bushing bore's top candidate is 1380/1381,
   the tangential link's 1370/1371, and the flanged-bushing pair likewise
   each on its own lug. Record the before/after table in the lesson.

Sites this fact reaches: the Python builder (`contact_suggestions.json`), the
JS mirror in `apps/annotate/sweep.js` (paired by
`tests/test_contact_suggestions.py` — change both, keep the pairing green),
the pane's suggestion rows and their Take, and `proposals` written by
`scripts/propose_bindings.py` if it reads the same candidates (check; if it
does, it gets the same rule). `docs/ANNOTATION_SURFACE.md`, "Contact
suggestions", gets one sentence for the rule.

## Definition of done

- A fast test plants **two parts on one mesh at two occurrences** and asserts
  each is offered its own faces; a second asserts an unresolvable one is
  offered no Take. Both enrolled with a mutation spec
  (`node scripts/run_mutation_witness_tests.mjs --unenrolled` names the file).
- On the real v2 projection, in a scratch copy of Jeff's log: a Take on
  `215735-001 › pitch link straight bushing bore` writes faces 1380/1381, and
  on the tangential link's, 1370/1371. Screenshot each suggestion row and the
  written event in `docs/sessions/lessons/shots/a_take_on_a_lug_feature_binds_that_lugs_own_face/`.
  Click around the pane on both lugs first (CLAUDE.md's exploratory rule).
- Tests per CLAUDE.md's tier table for a tactical session: default pytest,
  both fast node tiers, the browser runner `--only` for any suite you add or
  change, the witness runner once with `--only` for each spec you add or change.
- Lesson (`docs/sessions/lessons/LESSONS_20261121_a_take_on_a_lug_feature_binds_that_lugs_own_face.md`):
  the root cause, which shared-mesh parts on v1 and v2 were exposed (a count
  per model), the before/after candidate table, and whether any binding
  already in Jeff's log was written by a wrong Take (read the log; do not
  edit it — if one was, file it as an issue with `needs: jeff` and a one-line
  `ask:` to re-pick that feature).
