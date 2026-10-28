# LESSONS 2026-10-27 — a study shows the worksheet and joint of the stack it folds

Handoff `HANDOFF_20261027_a_study_shows_the_worksheet_and_joint_of_the_stack_it_folds.md`.
The subject of a worksheet (and of the joint block) is now the **selected
study**, not the page.

## Where the mapping lives, and which source it uses

**Projection time**, as the handoff preferred. `scripts/build_topology_projection.py`
gained `study_stack()`, and every projected study row carries `stack`:
`{id, title, re_expresses, joint, worksheet_file, worksheet_source}` or `null`.

- **The study → stack link** is read off the study's own chain: the one stack
  file every `dimension_ref` edge of its `selection` names. Not the study's
  `provenance.equivalent_to` prose, and not the stack-suffixed ids: the
  `dimension_ref` is the machine field the fold kept on every grip edge, and
  `crop_key` is derived from the same field, so there is one source.
- **The joint block** is the `provenance.grip_stack_joints` row whose
  `re_expresses` equals that file — the block each stack's own topology
  carried, kept verbatim by the fold. It is *not* the stack file's own `joint`,
  which differs (the stack file's is longer: parts, clamped, export ref...). The
  page rendered the topology's block before the fold, so that is what comes back.
- **The worksheet** is the stack file's, by `build_viewer_projection.worksheet_for`
  (imported, not copied) — the same rule `results.json` applies, so all three
  resolve `by_name` and tan link take 2 resolves none.
- It never guesses: no `dimension_ref` edge, edges into two stacks, or a stack
  the topology kept no block for, all give `null` (pinned by
  `test_a_study_naming_no_stack_or_two_or_an_unkept_one_resolves_none`).

The page reads one field: `VA.worksheetSubject(topology, study)` returns
`study.stack` when there is one, otherwise the topology; `VA.jointSubject`
reads `.joint` off the same subject, and `VA.renderTopoJoint` takes the study.

## Decisions the handoff left open

- **The old topology-level fallback is gone.** `VA.worksheetSubject` used to
  take `results` and offer the first covered stack's sheet when a topology
  declared none. No live topology reaches it since the fold, and kept it would
  have been a page-level stack sheet, the rejected alternative. The fixture
  tier tested it through the demo topology; that check now selects the demo
  study that carries a stack.
- **A stack with no sheet hides the toggle; it does not fall back to the
  model's sheet.** Selecting the tan-link study shows its joint and no
  "Show worksheet" button (the absent-feature rule: show nothing). Offering the
  end-stop graft sheet under a grip-stack chain would be a sheet about another
  part of the product.
- **The demo fixture's eighth hand patch.** The builder would write
  `stack: null` on all three demo studies (no `grip_stack_joints`).
  `demo_strut_branch` carries a `demo_joint` block instead, so `?mock=1` and the
  fixture tier reach the new branch; the patch is documented in the fixture's
  header like the other seven.
- `docs/DAG_TOPOLOGY.md` said "the worksheet lives on the topology, not the
  study". It now names the one exception. Not in the handoff's scope list, but
  it would have been a wrong fact otherwise.

## What still has no study to hang off

- The model's own sheet (`WORKSHEET_end_stop_graft.md`) and its empty `joint`
  are the page's, shown with no study selected and with any of the mechanism's
  own studies. That is the intended reading, not a gap.
- The kinematic study is its own page and offers no worksheet (unchanged).
- Nothing else on the topology page was per-stack before the fold, so nothing
  else lost a subject.

## Guards and pins

Census: fast 590 → 592, browser 660/627 → 664/631. Every new guard has a spec
(6 fast, 7 browser), plus a `python` spec for the projection's joint pin. The
three browser checks that used to cite the issue (a SKIP row and two guarded
pushes) are replaced by three study-by-study `[real]` checks.

## Verification record

Projections built from this tree (commit `a3d0f98b`, all five builders) into
`C:\workspace\tolstack\data\scratch\study_worksheets\root\data` (`inbox`,
`meshes` junctioned to the main checkout's; `docs`, `venv-win`, `node_modules`
junctioned in so the tiers could use it as `--repo`). The shared
`data/projections/` was not touched. Delete that scratch root (junctions first)
once the review is done with it.

- `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider`,
  worktree: 1587 passed, 1 skipped, 1 failed in 321 s. The one failure is the
  documented worktree red `test_viewer_js_suite` (no projection here); its tier
  is the next line. Recorded with `dispatch suite-time`: inside budget.
- `node apps/viewer/run_tests.cjs --repo <scratch root>`: 591/591, projection
  paired with this tree, plus the one named `[real]` SKIP already filed
  (`ISSUE_20261026_the_per_document_qualifier_lost_its_only_live_witness.md`).
- `node apps/annotate/run_tests.cjs --repo <scratch root>`: 235/235.
- Browser, `--repo <scratch root>`: `--only "topology file://"` 2/2 suites
  (topology file:// and its respine), `--only "no nav click"` 16/16 sub-checks.
  The full browser TRUTH tier was not run (merge-only).
- `node scripts/run_mutation_witness_tests.mjs --repo <scratch root>
  --changed-since integration`: 21/21 witnessed, 0 left to the sweep, 12m17s.
- An earlier partial run of `tests/test_mutation_witness*.py` showed 4 reds in
  `test_mutation_witness_shadow_concurrency.py`. They did not come back in the
  full run, where the same file passed.

## Surprises

- The screenshots still show "Data is older than the latest code", on a
  projection stamped at this branch's HEAD. The stamp is measured against
  trunk, not against this tree, so a handoff branch's own build shows it. It is
  not a defect in this change.
- The witness runner resolves the python tier's interpreter under `--repo`, so
  a scratch root needs `venv-win` junctioned in as well as `data/`.
