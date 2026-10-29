---
type: review
handoff: docs/sessions/active/HANDOFF_20261028_an_interface_suggests_the_faces_that_touch.md
reviewer: agent
date: 2026-10-28
verdict: APPROVE
blockers: 0
---

# Review — an_interface_suggests_the_faces_that_touch

**Verdict: APPROVE**, with one should-fix filed as an issue and two nits.

The branch delivers what the handoff asked for. `tolerance_stack/interface_contact.py`
pairs faces in the assembly frame by interface kind. `scripts/build_contact_suggestions.py`
is a gated projection writer on the rebuild rail. The annotator lists and
colours the top pairs and frames a clicked one, and never selects or writes.
Docs, the inventory row and the `CLAUDE.md` sentence are in place. The lesson's
table re-derives exactly from a projection this review built from the merged tree.

## Which run, which branch

- Seeded `docs/sessions/active/HANDOFF_20261028_…`; the branch worked that file.
  The lesson and the new issue are `A`. Two existing issues are `M`, and both
  are appended addenda; no earlier text was removed.
- Not already merged (`merge-base --is-ancestor` false). `integration` had moved
  two commits past the branch's last sync, a master merge and a board rename,
  and the merge was clean with no conflict markers. Because the only
  difference was that rename, the tactical's merge-tier witness run still
  describes this tree (below).
- No prior attempt on `review/…` (`git log HEAD -- docs/sessions/reviews/`).

## The mandatory checks

The overlay's seven stack checks (tolerance traceability, re-derivation table,
hardware entries, etc.) **do not apply**: this is not a stack and carries no
tolerance. The provenance rule they serve does apply. **Nothing here is a
value.** Every candidate's numbers are labelled evidence for a rank, the
projection has no `confidence`/`source_ref` field to misuse, and
`docs/ANNOTATION_SURFACE.md` "Contact suggestions" says that a drawing callout
wins (decision 6). **Pass.**

## What was verified

| check | result |
|---|---|
| Projection rebuilt from the merged tree (`ff39e814`) into the worktree's own `data/`, meshes read from the main checkout | 24 s; 17 gap edges, 10 `ok`, 4 `no_mesh`, 2 `no_contact`, 1 `no_occurrence`, **4 with one clear top pair**. Every row and every evidence figure matches the lesson's table |
| Pre-merge risky subset (`test_interface_contact`, `test_contact_suggestions`, `test_kinematic`, `test_architecture_inventory`, `test_projection_provenance`, `test_rebuild_projections_script`, `test_rebuild_terminal_state_pairing`, `test_js_python_vocabulary`, `test_js_vocabulary_is_generated`, `test_feature_identity`, `test_part_mesh_aliases`, `test_mutation_witnesses`, `test_app_type_scale`, `test_tolerance_stack`, `test_provenance`, `test_thermal_exception_list`, `test_claims_registry`) | **502 passed, 0 skipped**: the two `[real]` contact tests ran against the projection above |
| `node apps/annotate/run_tests.cjs` | 248/248 |
| `node apps/annotate/run_browser_check.mjs` (mock) | 79/82, then 80/82 on rerun. The two persistent reds are the mock-anchor checks already filed on integration (`ISSUE_20261028_annotate_browser_check_mock_anchor_checks_are_red_on_integration.md`); the third (reduced-motion fps) passed on rerun |
| Post-merge full suite, review worktree: `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -rfs` | **1618 passed, 1 skipped, 1 failed**, 314 s, recorded `inside budget`. The failure is `test_viewer_js_suite`, the by-design worktree red; its tier is the next row. The skip is the bearing re-extraction test (not installed). This repo's conftest prints no contention header lines. +2 over the tactical's 1616 = the two `[real]` contact tests, armed here |
| `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | 494/495: refuses the main checkout's master-built projection as stale (correct) |
| `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack/data/scratch/contact_suggest` (the tactical's scratch root, built from `6ca0ce68`) | **606/606**, projection paired with this tree |
| `node scripts/run_viewer_browser_tests.mjs --repo <same scratch>` | **33/35**, 351 s. The two reds are `3D pane follows the selection` ("…leaving it takes the light down") and `crop lightbox` (launcher focus): exactly the pair filed in `ISSUE_20261028_two_browser_suites_fail_in_the_full_run_under_load_and_pass_alone.md`. Each passed alone with `--only` (1/1, 1/1). The new contact sub-checks in `annotate face suggestions` are 29/29 (coloured on both parts, listed best first, click reframes, nothing written) |
| Mutation-witness `--changed-since integration` | Not re-run. The tactical's run at the last code commit was 20/20 witnessed (8m07s), and the merge added only a board rename. The six new specs exist, one per new guard, and `test_mutation_witnesses.py` is green, so the census pins moved with them |
| Builder refuses an older tree | Pinned by `test_it_refuses_to_overwrite_a_projection_built_from_a_tree_it_does_not_contain` (exit 3, file untouched, `--allow-older-tree` overrides) |
| `--data-root` reaches the *input* too (the overlay's architectural entry) | `--meshes-dir` defaults to `<data-root>/meshes`; topologies are tracked. Pass |
| Never writes | `[browser]` sub-check reads `window.__mockWrites` after a click; `cmdFrameContact` calls no writer. Pass |
| Lesson arithmetic | 17 / 10 / 7 (4+2+1) / 4 clear, all re-derived. Pass |

## Findings

### should-fix — the rules that pick the live top pair are unpinned

`tolerance_stack/interface_contact.py`: `ball_in_seat`, `edge_candidates`,
`cylinder_in_cylinder`. The handoff's DoD tests are present: four shape fixtures,
plus a `[real]` test that each ball joint has ≥ 1 spherical candidate. I planted
one-line mutations, ran the two test files, then rebuilt the live projection
under each and diffed it against the unmutated build:

- dropping the ball-convexity gate → **top pair changes on 3 of 4 live ball
  joints**, tests green;
- dropping the "coaxial only when nothing touches" filter → 6 edges 1→2–8
  candidates, every "clear" edge stops being clear, green;
- unbounding the interference margin → 4 bearing edges 1→4 candidates, green;
- flipping the own-occurrence tie-break → a different occurrence pair on
  `pitch_arm_link_joint`, green.

Caught: the tie rounding and the plane-gap `abs`. Survived with no live effect:
the `_convexity` vote threshold and the race-seat concavity check. Filed:
`docs/issues/ISSUE_20261028_contact_suggestion_rules_that_pick_the_live_top_pair_are_unpinned.md`.
It does not block, for two reasons. The DoD's test bar is met, and today's
output is right: it matches the measured table, and the next handoff
(the agent's proposal) is the one that will trial and debug these picks. But
the next edit to any of these gates would land silently.

### nits

- `interface_contact._convexity`'s `0.9` vote threshold is an inline number.
  The repo rule is a named module constant with its population, beside
  `CONTACT_TOLERANCES`. Folded into the issue above.
- The handoff said "the pair of occurrences nearest each other wins". The code
  picks the pair whose best candidate *ranks* best, then the mesh's own, then
  key order. That is a sound choice, documented in the docstring and in
  `ANNOTATION_SURFACE.md`, but the lesson's "Decisions the handoff did not
  make" leaves it out. No action.

### design (non-blocking, nothing filed)

The "Faces that touch" list stays inside the prose budget: a muted heading
that ellipsizes with a tooltip, three one-line quiet buttons, and a violet
hairline on the one in focus. It shows no ids (edge *names* in the
neighbour-joint heading), no commands and no state hues. Nothing to file.

## Notes for the next reviewer

- The blade/end ambiguity the lesson lists is the proposal handoff's input and
  is filed as `ISSUE_20261028_contact_suggestions_cannot_say_which_blade_…`
  (`audience: strategy`).
- After this lands, the main checkout's projections need a rebuild
  (`scripts/rebuild_projections.ps1`) before the `[real]` contact tests stop
  skipping there. This is the operator's normal post-batch-merge rebuild, not
  a new step.
- The tactical scratch root `C:\workspace\tolstack\data\scratch\contact_suggest\`
  (~430 MB) was used by this review and is left in place (see the
  closing section).

## Landing — two integration merges, and the witness gate

`integration` moved twice while the review ran (`a_study_is_a_translucent_group_on_the_dag`,
then `the_kinematic_study_reads_like_every_other_study_and_its_plot_shows_both_tolerances`),
so `review/…` merged it twice.

**Conflicts, both merges: `scripts/guard_enumeration.mjs`'s `DECLARED_GUARDS`.**
Neither side is right on its own, because each side's pins were measured
without the other's guards. Resolution: take integration's lines and comments,
add this handoff's note, and paste the counts `node scripts/guard_enumeration.mjs --json`
measured. Each count is integration's pin plus this handoff's delta: annotate
246+2 = 248, and browser 721+4 / 688+4 at the first merge, 723+4 = 727 /
690+4 = 694 at the second. `fast` is integration's (622).
**Second merge also: `docs/prompts/REVIEW_AGENT.md`**. Both sides appended a
new Recurring-bugs entry at the same place, so both are kept, ours first. No
marker lines were committed (checked with the grep).

After each merge: `test_mutation_witnesses`, the contact/inventory/kinematic/
vocabulary/doc-corpus tests (199, then 396 passed), the annotator fast tier
248/248, and the viewer fast tier through the scratch root (614/614, then
621/621, projection paired).

**Witness gate after the first merge** (`--changed-since master --repo <scratch>`,
30-minute cap): **84/85 witnessed, 85/174 reached, 30m40s, 89 left to the
sweep (budget)**. The one NOT WITNESSED is
`browser__real-clicking-a-contributor-row-with-the-pane-open-keeps__d42adbc7`:
"another check reddened, but not the declared one". It reproduces with
`--only` on the merged tree, **and identically on a `git archive` of the
integration tip without this handoff** (`88440806`). So the decay is not
caused by this merge; it is already filed on integration as
`ISSUE_20261028_the_contributor_row_highlight_witness_aborts_before_its_check.md`.
It was selected only because `master..HEAD` spans other handoffs' harness hunks.
This handoff's own harness hunk is at `run_viewer_browser_tests.mjs:8242`,
far from that guard (`:6924`).

**Witness gate after the second merge** (`--changed-since integration --repo <scratch>`,
i.e. the hunks this handoff adds on top of the current integration tip):
**20/20 witnessed, 20/20 reached, 8m10s, 0 left to the sweep**, exit 0, at
`3be8f1be`. No drop.

Scratch root `C:\workspace\tolstack\data\scratch\contact_suggest\` (the
tactical's; gitignored) is left in place for the operator's housekeeping. This
review's own projection under the worktree's `data/` goes with the worktree.
