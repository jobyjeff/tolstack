---
type: review
handoff: docs/sessions/active/HANDOFF_20261112_a_binding_shows_the_moment_it_is_made_and_is_corrected_where_it_is_shown.md
reviewer: agent
date: 2026-11-12
verdict: APPROVE
blockers: 0
---

# Review — a_binding_shows_the_moment_it_is_made_and_is_corrected_where_it_is_shown

First run of this review (no prior commits on `review/<slug>`). The branch
worked the `active/` handoff; every changed lesson/report/issue file arrives
as `A` or as an appended `M` (two issue addenda), so nothing overwrote another
record. Containment checked before the merge: `handoff/<slug>` was **not** an
ancestor of `integration`, and `integration` had not moved since the review
branch was cut, so the merge into `review/<slug>` was clean (no conflicts).
**Nothing was landed on `integration`:** the verdict is REQUEST CHANGES (two
browser suites regress, below).

**For the next round:** the main checkout's projections are refused by the
viewer tier for this branch, since they were built from a tree without its
`feature_identity.py`. Build a scratch root as described under "Tests". Then run
`--only` on **every** suite that reads the tree's feature body, not only the
ones edited:
`grep -n 'navtree__featurebody\|data-kind="action"\|navtree__featurestate' scripts/run_viewer_browser_tests.mjs`.

## What was verified

**Deliverable by deliverable, against the code:**

1. *The page reads the log.* `feature_identity.main()` (rebuild step 5) also
   writes `data/projections/viewer/feature-identity/log.json` (every event
   verbatim + installed mesh shas). Both apps fold it in the browser
   (`apps/viewer/identity_fold.js`); the pane re-reads the inbox through its
   grant after every write, rewrites the served copy, repaints, and posts
   `annotate:identity` to the shell. Reading needs no grant. The departure
   from the handoff's suggestion (no mount serves `projections/feature-identity/`)
   is argued in the lesson and is right: I confirmed on the live 8000 mount
   that `/tolstack/data/` serves subdirectories (`kinematic/annotate.json` →
   200) and that `feature-identity/log.json` is 404 **today** only because
   trunk's builder does not write it yet.
2. *A feature belongs to one part.* `model.js`'s `featureEnds` keeps only the
   edges whose part at the node is the feature's part (gap edge → the node's
   first part, matching `model_view._end_part`). Hover uses `endOfFeature`
   and rows use `featureEdgeIds`. **Observed failing:** deleting the one line
   `if (part !== feature.part) return;` reddens three fast checks (the model
   object, the left-column tree, the feature body) — so the deliverable's key
   rule is pinned even though no witness spec names that line.
3. *A body always says something.* `VA.featureBodyPlan` (bound / suggested /
   none / armed) with Correct, Unbind, Flip, Pick a face, Cancel. Lesson's
   twisty walk ("34 features, 0 opening to nothing") — 34 re-counted from the
   built v2 model.
4. *Unbind is an event.* `retracted` joins `VERDICTS` and
   `HUMAN_ONLY_VERDICTS`, carries `retracts`, carries no face; the Python fold
   refuses a retraction of a missing / other-key / non-bound / later /
   already-superseded / already-retracted target and refuses a `supersedes`
   onto a retracted one. Vocabulary regenerated (`vocab.gen.js`), counts line
   prints `0 retracted` on the real log. `tests/test_identity_fold_is_paired.py`
   folds one log both ways (restated accepts, corrections, unbind, flip).
5. *Bound faces from the record.* `paintBoundMarks` clears and repaints from
   the merged record on part-load, write and toggle; the accept path no
   longer marks. Top-bar **Bound faces** box, on by default, persisted.
6. *Orphans.* `VA.orphanBindings` + one `<details>` line at the tree's foot;
   refuses nothing. Absent on the real log (re-checked: 11 standing bindings,
   all on present edges and installed meshes).

**Real log untouched.** `C:\workspace\tolstack\data\inbox\feature-identity\`
still ends at `0078_hub_blade_axis_offset.json` (78 events + README), folded:
15 bound, 62 proposed, 1 rejected, **0 retracted**, 11 standing bindings —
which matches the lesson's "11 faces green on load".

**Lesson audit.** 34 v2 features ✓; 11 standing bindings ✓; 78→79→80→81
scratch events is consistent with one bind, one correction, one unbind ✓.
The 6 m 46 s rebuild figure is from projection mtimes and I did not re-derive
it.

**DoD shots** looked at (01, plus the step set listed in the lesson): the hub
side reads `bound · face 526 of 214373-002` with Correct/Unbind/Flip; the
mount's same-named feature is a separate row.

**DoD not demonstrated, accepted:** the tactical session found 8000 not
serving and ran a faithful reproduction of drawing-checker's mounts on a
private port against a scratch log. 8000 *is* serving now (trunk), but trunk
lacks the served log, so a real-mount demo was not possible from this review
either. It becomes demonstrable after the batch merge **and** a
`scripts/rebuild_projections.ps1` in the main checkout (that run writes
`log.json`; until it, or Jeff's first write through a grant, the page on 8000
reads no bindings — the state before this handoff).

## Tests

| when | tier | command | result | time |
|---|---|---|---|---|
| tactical (recorded) | default pytest | worktree, single-process | 1 failed (deliberate worktree red), 1938 passed, 1 skipped | 462 s |
| pre-merge subset | pytest | `test_feature_identity`, `test_identity_fold_is_paired`, `test_js_vocabulary_is_generated`, `test_js_python_vocabulary`, `test_part_mesh_aliases`, `test_architecture_inventory`, `test_mutation_witnesses`, `test_viewer_readme_doc_facts`, `test_viewer_deep_link_contract`, `test_claims_registry`, `test_tolerance_stack`, `test_provenance`, `test_app_type_scale`, `test_rail_act_vocabulary_is_paired` | 432 passed | 142 s |
| pre-merge subset | annotate fast | `node apps/annotate/run_tests.cjs` | 313/313, 0 SKIP lines | — |
| pre-merge subset | viewer fast | `node apps/viewer/run_tests.cjs` | 565/565 (node-fs tier skipped, armed below) | — |
| post-merge | viewer fast + `[real]` | `node apps/viewer/run_tests.cjs --repo <scratch>` | **687/687** | — |
| post-merge | default pytest | `C:/workspace/tolstack/venv-win/Scripts/python.exe -X utf8 -m pytest -q -p no:cacheprovider` (review worktree) | **1 failed, 1938 passed, 1 skipped, 2 deselected**; the failure is `test_viewer_js_suite_is_green`, the deliberate worktree red, armed through `--repo` above. This conftest prints no contention header lines. | 435 s, recorded, inside budget |
| post-merge (review branch) | whole browser tier | `node scripts/run_viewer_browser_tests.mjs --repo <scratch>` | **41/44 suites, 1134 checks**: three red (below) | 1845 s (runner self-records its ledger row) |
| re-run, merged tree | the two regressed suites, `--only` each | same, `--only "annotate rail holds still"` / `--only "the model drawn alone and led"` | red again, the same sub-checks: deterministic | — |
| baseline, `integration` tree (`git archive integration`, same scratch data) | the three red suites, `--only` each | same runner from the extracted tree | DAG zoom **red** (pre-existing); rail holds still **17/17**; model drawn alone **11/11** | — |
| — | witness gate | not run | left to the next round: with two browser suites red on the merge, a witness run over them reads "red before the mutation" and says nothing | — |

`<scratch>` = `C:/workspace/tolstack/data/scratch/review_binding_20261112`:
`data/inbox`, `data/meshes` and the non-viewer projections **copied** from
the main checkout, this tree's `docs/` copied, `venv-win` and `node_modules`
junctioned; topology, viewer, part-names, crops (drawing-checker's venv),
feature-identity and kinematic projections built from **this merged tree**
with `--data-root`. The main checkout's projections could not serve: the
viewer tier refuses them (`[real] the projection this tier reads was built
from this tree` red), as the tactical lesson predicted. The shared `data/`
was unchanged across the full pytest run (no file under it newer than the
run's start, scratch excluded).

## Findings

### Blockers

**B1. "annotate rail holds still" goes from 17/17 on `integration` to 10/17 on
the merge.** `scripts/run_viewer_browser_tests.mjs` around line 9435. The seven
failing sub-checks all read the tree's feature body after a **Take**: "the
faces layer follows the partner end … with the pane's row for it beneath",
"the other end is selected with its candidate faces listed under it", the rows'
kinds and marks, the picked-now mark, the indent, the glyphs, the attention
ink. The run's own diagnostic shows what the page draws instead: `titles
["bound · face 166 of 214700-002"]` with `kinds ; ends ; legend items 0`. That
is the new bound line (`VA.featureBodyPlan`, deliverable 3) where the suite
expects the pane's rows. The tactical session swapped four 11-10 guards that
pinned the old body, but it did not run this suite, which checks the same
surface. **Fix:** decide, check by check, whether each one pins the retired
body, so the check moves to the new contract (with its witness spec, as was done
for the other four), or still states a behaviour the handoff kept (the partner
end is selected and on screen after a Take; a suggested end's candidates are
listed under it), so the product must still do it. Then run the suite `--only`
against a projection built from the branch.

**B2. "the model drawn alone and led" goes from 11/11 on `integration` to
10/11: "[real] Escape with a pick armed cancels the pick and keeps the
selection".** Around line 15115. The check arms the pick by clicking
`#navtree .navtree__featurebody [data-kind="action"]`, the old pane-row
action. On the selected feature (`hub_boss_in_tan_link_mount_pilot`, bound by
event 0077) the body is now the planned one, and its buttons carry
`data-body-act`, so the click finds nothing. Nothing arms (`armed: false`),
and the selection is gone afterwards (`rows 0, dots 0, inspect null`). It is
not yet shown that Esc after **Correct** or **Pick a face** keeps the selection,
which is the behaviour the check exists for. **Fix:** arm through the new
body's action (`[data-body-act="arm"]`) and keep the assertion. If it is then
still red, it is the product's: an Esc on a pick armed from the shell's body
outside sweep mode goes through the new `keydown` branch in
`apps/annotate/app.js`. This suite runs in sweep mode, though, so check which
branch handles it.

Both are inside this handoff's scope and need a test change judged against
the design (prongs 1 and 2), so they go back rather than being fixed inline.

### Not this merge's

- "the DAG zoom, Fit and the grid header": "first row is whole … at the
  wheel's maximum" is red on `integration`'s own tree too (`fit 0.42, max 0.42`:
  the wheel never zoomed). Already filed and deferred as
  `ISSUE_20261104_the_first_row_zoom_check_wheels_above_the_drawing.md`. I
  appended today's measurement there.

**Nits (not filed — no owner needed beyond this note):**

- The narrow-refold ask is filed in **tolstack's** `docs/issues/`
  (`ISSUE_20261112_bindings_json_waits_for_a_full_rebuild_and_the_mount_has_no_narrow_refold.md`,
  `area: drawing-checker mount / rebuild route`), whereas the handoff said
  "file a drawing-checker issue". The body says it is a drawing-checker
  handoff, so triage can route it; noting it so the route is not staged
  here.
- `scripts/guard_enumeration.mjs`'s fast-tier comment says "+4" and then
  lists five things; the pinned count and digest (what the test reads) are
  right.

**Design (non-blocking):** nothing filed. The bound line and its three
actions read as one compact block under the feature (shot 01); text that
truncates carries a `title`.

## Checklist items addressed

- Provenance checks 1–7 (stack mandatory checks): **not applicable** — no
  stack, element value or topology edge changed.
- Vocabulary drift: `retracted` and `PROPOSAL_CONFIDENCES` are Python
  constants, generated into `vocab.gen.js`; `VA.ORPHAN_REASONS`,
  `VA.FEATURE_BODY_*` are JS-owned module constants. ✓
- Guards enrolled: 9 new fast/annotate specs + 4 browser specs, the 4 retired
  browser guards' specs deleted, pins re-measured; `test_mutation_witnesses`
  green. ✓
- Nothing written into drawing-checker; `data/inbox/specs/` untouched. ✓
- A new projection writer: the served log is a copy of inputs written after
  the gated `bindings.json` write, and by the pane through its grant; it
  carries no provenance stamp by design (argued in `feature_identity.py`).

## Overlay

Three entries added to the "Recurring bugs" list in `docs/prompts/REVIEW_AGENT.md`:
- the annotate page has no `VA.CONFIG`;
- a page fold of the log is only as true as its pairing to Python's, and the
  served copy must be rewritten by every inbox writer;
- a handoff that swaps the guards pinning a surface must run every suite that
  reads that surface, not only the suites it edited (the shape of B1 and B2).

## Round 2 (2026-11-12) — APPROVE

Re-reviewed `d7e9c208` (the handoff's round-1 fix), merged onto this branch
as `05ea5a49`. It is test-only: the browser harness, one witness spec
swapped, the browser name-set pin, the fast-tier comment (nit 2) and a lesson
section. No product code moved, so the round-1 reading of the six
deliverables stands.

**Read against the tree:**
- `installRealAnnotatorReads` now routes the served `log.json` and drops the
  events that ratify the proposals the suite serves unaccepted. That gives the
  page's fold and the pane's memory adapter the same pre-accept log. This
  fixes the harness, not the product: in use, both read the one served log.
- The Escape check's selector `[data-body-act="arm"]` matches what
  `featureBodyPlan` emits (`VA.FEATURE_BODY_VERBS.arm === "arm"`; `arm-off`
  is Cancel, which doesn't match).
- The new taken-end guard reads `.navtree__featurebody[data-body-kind="bound"]`
  and `.navtree__featurewords`, both emitted by `nav.js`. Its spec's anchor,
  `if (!VA.paneIdentityWins(state.identity, msg)) return;`, resolves once
  in `topology_app.js`.
- Attention ink now reads a candidate row's `.navtree__scenename`. That word
  span has no colour of its own for a candidate row, so the spec's
  `.navtree__scenerow[data-attention]` recolour reaches it. The old read could
  not be reached by it, and the lesson says so.
- The glyph floor is 6px, against the 7px candidate and 8px feature marks
  in `topology.css`.

**Tests on the merged tree** (scratch root `data/scratch/review_binding_r2`,
built from this tree as in round 1, real log untouched at 78 events):

| Tier | Result |
|---|---|
| viewer fast with `[real]` | 687/687 |
| annotate fast | 313/313 |
| pytest (`test_viewer_js_suite.py` deselected; run as the tiers above) | 1938 passed, 1 skipped |
| whole browser tier | 42/44 — B1 "rail holds still" 17/17, B2 "model drawn alone and led" 11/11 |
| witness `--changed-since integration` | 39/39 witnessed, 39 of 94 reached in 27m30s, 55 left to the sweep (budget) — a pass |

**The two browser reds are both pre-existing, measured on integration's own
tree** (`git archive integration`) against the same scratch data:
- DAG zoom first-row: as in round 1, filed in
  `ISSUE_20261104_the_first_row_zoom_check_wheels_above_the_drawing.md`.
- "3D pane follows the selection", 31/32, on "[real] resting on a body row in
  the nav lights that body in the scene". It was red in the full tier, red
  once more run alone on the merged tree, and red alone on the integration tree.
  It is filed in
  `ISSUE_20261105_3d_pane_follows_selection_suite_flakes_under_the_witness_runner.md`.
  It was green in round 1's full tier, so it is intermittent on both trees, not
  a regression. I added a dated addendum there.

**Not blockers, for the batch merge:** after this lands, port 8000 needs
`scripts/rebuild_projections.ps1` in the main checkout, which writes
`projections/viewer/feature-identity/log.json`. Until then the shell's log read
404s there.
