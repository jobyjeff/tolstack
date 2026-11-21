---
type: review
handoff: docs/sessions/active/HANDOFF_20261119_the_viewer_says_nothing_about_itself.md
reviewer: agent
date: 2026-11-20
verdict: APPROVE
blockers: 0
---

# Review — the_viewer_says_nothing_about_itself

Reviewed `handoff/the_viewer_says_nothing_about_itself` at `b2666caf` (three
commits on `integration` `a02f27a4`). `integration` had not moved, so the
merge into `review/the_viewer_says_nothing_about_itself` was a fast-forward.
The merged tree is `e0b9200a`. This is a first review on this branch: no
earlier report or merge was committed on it.

## The mandatory checks (1–7)

None applies. The diff is copy, the CSS that styled it, tests and witness
specs. It changes no stack, topology, value, band, `confidence` or
projection input (`git diff --name-only a63d1900 b2666caf` over
`docs/tolerance_stacks`, `docs/topologies`, `tolerance_stack`,
`scripts/build_*` is empty). Checked, and nothing to audit.

## What was verified

- **The DoD's two strings are gone.** "read-only · renders the built
  projections · computes nothing" (the `topology.html` topbar) and the
  HUMAN-lassoed paragraph (`views/topology.js`, empty results pane) are both
  removed. The empty pane now holds a `<select>` whose placeholder reads
  *Pick a study*. Choosing a study calls the same `onNavStudy` the nav row
  calls (`topology_app.js:3326`). A model with no studies shows no picker.
  Seen in `after_v1_no_study.png` and `after_v2_no_study.png`, and asserted
  by the new fast check and its witness spec.
- **Scope held.** Nothing under `tolerance_stack/`, the topology JSON, layout
  or routing changed. The Python exception text "a mechanics decision this
  tool does not make" was left alone because it is out of scope. The lesson
  says so.
- **Each removal.** I read all 23 rows of the lesson's table against the
  diff, and each one matches. The data facts stay: the derived gap's "A
  study computes it…", the crops-missing line and the stale alarm. The
  hovers are the handoff's third preference (the Materials heading, the RSS
  column headers). The "checks GENERATED" header chip, which now carries the
  generated-checks fact alone, exists (`viewer.js:484`).
- **My own search for misses.** I grepped the apps for "this page / this
  tool / this viewer / computes nothing / Read-only. / click … / pick …".
  The hits left are fallbacks for unknown vocabulary, hovers, Help lines and
  one provenance alarm ("Two different commits is as far as this page can
  get: it cannot run git…", `viewer.js:2198`). That alarm sits inside the
  collapsed `banner__stale` disclosure, so it is not always-visible and not
  a finding. `apps/viewer/index.html`'s "The stack viewer moved to…" shows
  only with JavaScript off, because the page redirects first.
- **The tests follow the copy.** The rewrites assert what the state shows
  now, and none was deleted for its string alone. Two annotate checks became
  one, and the census pins agree: fast 619→620, annotate 334→333, and the
  browser name hash moved for three renames. Most of the absence checks are
  structural (`textContent === ""`, zero `p.detail__crop-reason`, zero
  `.tvtotals__more`). A few use `indexOf(old phrase) === -1`; see the nit.
- **The witness specs.** Eight are new and two were re-pointed. The
  re-pointed CSS spec's `find` (`.check__warn { max-width: var(--measure); }`)
  is a substring of the shortened selector list, and its mutation still
  strips the whole rule.
- **The lesson's arithmetic.** I re-derived it: 7 fast renames plus 1 new
  check, 6 of the 7 with specs, and 10 specs witnessed, which the tactical's
  `--only` rows on the ledger confirm. One count was wrong and is corrected
  inline (below).
- **The shots.** I read the before and after shots for no study, a node,
  the stack page and the idle pane.

## Tests

The tactical's record is complete: default tier `2577 passed, 2 failed`, the
fast tiers through `--repo`, a browser `--only` per suite and the witness
specs. So the cadence held.

**Pre-merge risky subset** (on the merged tree, since the merge was a
fast-forward):

- `pytest -q tests/test_js_python_vocabulary.py tests/test_viewer_readme_doc_facts.py tests/test_viewer_deep_link_contract.py tests/test_js_vocabulary_is_generated.py tests/test_feature_identity.py tests/test_part_mesh_aliases.py tests/test_app_type_scale.py tests/test_mutation_witnesses.py tests/test_topology_projection.py tests/test_tolerance_stack.py tests/test_provenance.py tests/test_thermal_exception_list.py tests/test_claims_registry.py tests/test_architecture_inventory.py`:
  **516 passed**.
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack/data/scratch/plate`:
  **620/620**. The projection was paired with this tree; every projection
  carries the `a63d1900` stamp, and no projection input has changed since.
- `node apps/annotate/run_tests.cjs --repo …/plate`: **333/333**.

**Post-merge, in the review worktree:**

- **Default tier**, `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider`:
  **2577 passed, 2 failed, 1 skipped, 4 deselected in 595 s**. The ledger
  row was recorded and is inside budget. The suite printed no contention
  header lines (this repo's conftest emits none). The two failures are the
  same two the tactical run had:
  - `test_viewer_js_suite_is_green`: the worktree has no `data/`. The
    suite's real check is the 620/620 run above, through `--repo`.
  - `test_every_established_export_lists_exactly_the_runs_the_log_records_for_its_sha`:
    pre-existing, and already filed on integration as
    `ISSUE_20261119_the_gas_spring_mount_export_has_a_sixth_run_the_pitch_linkage_topology_does_not_list.md`.
- **The whole browser tier**, `node scripts/run_viewer_browser_tests.mjs --repo …/plate`:
  **49/49 suites, 2438 s**. The runner wrote its own ledger row.
- `node apps/annotate/run_browser_check.mjs`: **94/99**. The check this diff
  edited ("…and the bind bar is back, with no instruction") passes. The five
  reds are the same five, by name, on a `git archive a02f27a4` export
  (94/99, the same lines), so none belongs to this diff.
- **Witness gate**, `node scripts/run_mutation_witness_tests.mjs --repo …/plate --changed-since a02f27a4 --budget-min 10`:
  **exit 0, 7/7 reached entries witnessed**, 23 left to the sweep on budget.
  One fast entry (`fast__a-generated-check-…`) took 10m35s, which is the
  runner stall the overlay has seen before. The branch's own specs that the
  cap did not reach, including the picker spec, are covered by the
  tactical's `--only` ledger rows (10/10 witnessed).
- **Shared data.** A `find -newer` marker over the main checkout's `data/`
  (outside `data/scratch/`) listed nothing: the shared data was not
  touched.

## Findings

No blockers and no should-fix findings.

**Fixed inline** (each passes all three prongs, and none changes behaviour):

1. `docs/issues/ISSUE_20261120_the_stale_data_banner_says_needs_a_rebuild_twice.md`
   had no `found_by:`. It now names the handoff.
2. The lesson said the shots are "the same 20 states each". There are 17
   (`before_*` 17, `after_*` 18), and `after_v1_node_selected.png` is
   byte-identical to `after_v1_branch_node_selected.png`, because the
   probe's node is itself a branch point. A correction blockquote now says
   both.

**Nits** (filed nowhere: nothing is wrong today):

- A few rewritten absence checks match the old phrase (`indexOf("not a
  value")`, `"component boundary"`, `"This tool never makes it"`). A
  rephrased caption would pass them. The structural checks beside most of
  them cover the same states, so there is no gap now. This is added to the
  overlay as a pattern to look for.
- `.tvtotals__pick` hard-codes a fallback colour (`var(--panel, #1a1d24)`),
  where the rest of `topology.css` uses the tokens with no fallback.

**Design:** none to file. The kept borderline strings are listed in the
lesson for Jeff's walk, as the handoff asked.

## Overlay

Added a Recurring-bugs entry: a removed sentence's test should assert
absence structurally rather than by the old phrase, and probe shots should
be checked by hash.
