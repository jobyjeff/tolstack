---
type: review
handoff: docs/sessions/active/HANDOFF_20261112_a_part_links_to_its_drawing_before_it_has_a_tolerance.md
reviewer: agent
date: 2026-11-13
verdict: APPROVE
blockers: 0
---

# Review — a_part_links_to_its_drawing_before_it_has_a_tolerance

Branch `handoff/a_part_links_to_its_drawing_before_it_has_a_tolerance` (4 commits,
`7a079c61..389ff2dc`), merged into `review/…` as a fast-forward: `integration`
(`a7818d99`) had not moved since the branch was cut, so there was no conflict and
the merged tree is the handoff tip. Containment was checked first: not already in
`integration`. All diff status letters are `M`/`A`, and the lesson is `A`; no
earlier run of this handoff exists on any branch.

## What I verified

**Deliverable 1, each part's record carries its runs.** `drawing_checker_runs` /
`part_drawing_runs` in `scripts/build_topology_projection.py` list runs with
`build_viewer_crops.run_dirs` and read the drawing number with
`build_part_names_projection.drawing_number`. That is the reuse the handoff asked
for, with no second parser. The match is exact on base and dash. `other_dash_runs`
is filled only when the exact list is empty, compares base to base (not a prefix,
and the test pins `21469` against `214698`), and is ordered newest first by run
directory name, whose leading stamp sorts. I rebuilt the projection in-process
against the real `C:\workspace\drawing-checker\data\runs\`, and every row of the
lesson's v2 table re-derives:

- **7 own runs:** gas-spring mount (5 runs, so "4 older"), piston body, pitch link,
  tan link, lower head, upper head, cover.
- **4 offered another dash number:** hub → 214373-003 A, tan-link mount → 215175 A,
  pitch arm → 215071 C, pitch plate → 215177 A (2 runs, so "1 older").
- **1 with nothing:** 216332-001.
- **3 without a number:** the bearings.

v1 matches as claimed: the same seven and the same four, and every other v1 part
has none.

**Deliverable 2, the Preview shows the link.** `VA.renderPartName` /
`VA.renderOlderRuns` link the number through `VA.runUrl` with `target=_blank` and
`rel=noopener`. The revision is muted beside the number, the older runs sit behind
one `runsfold`, and a part with no run gets its plain label with nothing else. A
tolerance row's citation link is untouched. I looked at both shots and they show
exactly that. There is one gap in the sites, and the author measured it and filed
it rather than working around it: a part or body selected in the tree has **no
Preview at all** (`VA.focusElementOf` → null). So the link lives on every surface
that previews a part today: the dimension line and each side of an interface, from
the grid, the tree's feature rows and the DAG. The handoff's "preview of a part"
assumed a surface that does not exist, and building one is a design question. It
is filed `audience: strategy`
(`ISSUE_20261113_a_part_or_body_selected_in_the_tree_previews_nothing.md`). I
accept that rather than send it back.

**Deliverable 3, a near miss is offered and marked.** The text reads
`214373-002 propeller hub · 214373-003 (different dash number) rev A`. The part's
own number stays plain and the other number is the link. Witness `__eb2a9384`
pins that the part's number is never linked to the other run.

**Read-only against drawing-checker.** The builder only lists and reads
`*_p01.json`. Nothing writes there.

**Tests.** The new `tests/test_part_drawing_runs.py` is value-level against a
fixture of run directories: exact match, other dash, bare base, none, no number,
newest first, title-block-less runs filed by PDF name, and non-runs left out. It
also has one wiring test through `build()`. Three new fast guards each carry a
mutation spec, the census pin moved 688 → 691 with the names digest, and the
tactical report says all three were WITNESSED.

## Tolstack mandatory checks

This work is a projection field and a viewer link, not a stack, so checks 1–7
are N/A. I addressed each one: no element value, `source_ref`, sign, LMC/MMC
mapping, RSS, nominal or cotter hardware changed, and the traced ratio is
unchanged (the diff touches no stack). The provenance rule still applies in
spirit, and it holds: the other-dash link is explicitly a display choice, marked
on the page, and never written as a citation.

## Test record

| when | command | where | result |
|---|---|---|---|
| tactical (recorded) | `pytest -q` | worktree | 1 failed (the deliberate worktree red), 1944 passed, 1 skipped |
| pre-merge subset | `pytest -q tests/test_part_drawing_runs.py tests/test_topology_projection.py tests/test_architecture_inventory.py tests/test_projection_provenance.py tests/test_rebuild_projections_script.py tests/test_rebuild_terminal_state_pairing.py tests/test_js_python_vocabulary.py tests/test_viewer_readme_doc_facts.py tests/test_viewer_deep_link_contract.py tests/test_app_type_scale.py tests/test_mutation_witnesses.py` | review worktree | 180 passed |
| post-merge | `node apps/viewer/run_tests.cjs` / `node apps/annotate/run_tests.cjs` | review worktree | 568/568 (node-fs tier skipped, no projection) / 314/314 |
| post-merge | `node apps/viewer/run_tests.cjs --repo <scratch root>` | review worktree | **691/691**, `[real]` armed |
| post-merge full | `C:/workspace/tolstack/venv-win/Scripts/python.exe -X utf8 -m pytest -q` | review worktree | 1 failed, 1944 passed, 1 skipped, 2 deselected, 461 s. Recorded in the ledger, inside budget |
| merge tier | `node scripts/run_viewer_browser_tests.mjs --repo <scratch root>` (whole tier) | review worktree | **44/44 suites, 1141 checks**, 1795 s. Self-recorded, inside the 1800 s budget by 5 s: the next suite added will likely tip it |
| merge tier | `node scripts/run_mutation_witness_tests.mjs --repo <scratch root> --changed-since integration` | review worktree | **13/13 witnessed**, 13/13 reached, 0 left to the sweep, 848 s. Ledger: inside budget |

The one failure is `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`,
the documented worktree red (no `data/projections/` in a worktree). The same tier
ran 691/691 against the scratch root. This repo's conftest prints no
`concurrent pytest processes` / `full-suite lock` header lines. The main
checkout's `git status` was clean after the run.

The scratch root is `C:/workspace/tolstack/data/scratch/rv_partlinks`: copies of
`data/inbox`, `data/meshes` and the non-viewer projections, with all seven
builders run from this tree. Its provenance is
`review/… @ 389ff2dc`.

## Findings

**Blockers:** none.

**Should-fix:** none.

**Nits (not filed separately):**
- `_read_page` in `build_topology_projection.py` is a twin of
  `build_part_names_projection._read_json` (same body). It could import that one,
  as it already imports `drawing_number`. This is cosmetic, so I left it.
- The newest run's date appears only in the link's hover title, and repeated
  same-revision older runs read as `rev A · <date>` ×4. Filed as design, low:
  `ISSUE_20261113_design_the_newest_drawing_run_shows_no_date_while_its_older_runs_do.md`.

**Issues filed by the author, checked:** the strategy issue above (frontmatter
correct, `type: feature`, `audience: strategy`), and
`ISSUE_20261113_five_end_stop_parts_have_no_drawing_checker_run_of_their_own.md`
(`needs: jeff`, with an `ask:` that passes both halves of the test: only Jeff
exports from CATIA, and the task is finished once he has).

**Inline fixes:** none.
