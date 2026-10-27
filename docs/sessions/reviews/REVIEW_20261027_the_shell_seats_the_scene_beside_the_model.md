---
type: review
handoff: docs/sessions/active/HANDOFF_20261026_the_shell_seats_the_scene_beside_the_model.md
reviewer: agent
date: 2026-10-27
verdict: APPROVE
blockers: 0
---

# Review — the_shell_seats_the_scene_beside_the_model

Branch `handoff/the_shell_seats_the_scene_beside_the_model` (tip `fa610075`,
7 commits). `integration` had not moved since the branch was cut
(`git log handoff..integration` empty), so the merge into
`review/the_shell_seats_the_scene_beside_the_model` was a **fast-forward**:
the tree I tested pre-merge and post-merge is the same tree, and the
tactical agent's measurements were taken on it too. Containment check before
the merge: not already in `integration`. Active handoff confirmed in
`docs/sessions/active/`; the lesson arrives as `A` (no overwrite).

## What I verified

**The DoD, item by item.**

- Order nav | scene | DAG + grid, no seam, no preview pane: read in
  `topology.html`/`topology.css` (the `<dialog>` moved into `.tv`'s row,
  `position: sticky` under the topbar like the nav, `var(--bg)`, no border,
  divider hairline transparent at rest; `body.flyout-replaces-detail` hides
  `#detail` and its divider) and in the four committed screenshots. The rule
  is `state.mode !== "stack"` in `syncSceneColumn`, re-applied on every render
  and on the dialog's `close` event.
- DAG + grid at or above today's no-pane width, measured and pinned:
  re-measured by my own browser run — `[chain study at 1600] DAG + grid:
  900px with the scene at its 400px floor, 739px with no scene open` — the
  lesson's figures exactly. Pinned by `[real] on a chain study at 1600 wide,
  …` (spec `722fd70b`).
- Mechanism tree under the study row with hover/pick coupling from the nav:
  `[real]` checks for nesting, hover-lights / leave-clears, click-selects,
  keyboard Enter selects, scene-selection marks the nav row, chips filter.
- Embedded mode: `?embedded=1` only from `VA.annotateEmbedHref`; the
  full-page link stays plain (pinned both tiers). The standalone annotator
  is unchanged apart from three additive pieces (`setBackground`, the
  `an--embedded` class rules, the mirror functions, all gated on
  `EMBEDDED`). `annotate sweep rail …` 15/15 with the bind snapshot not
  regenerated.
- Tree route (pane sends the rows read off its own rendered rail, gestures
  replayed on the mirrored node): read through `embedTree` / `railRow` /
  `railGesture`. Every rail row with a click handler uses `.onclick`
  (grepped), which is what `row.activate = !!node.onclick` relies on. I read
  the checkbox path through to `cmdSubjectView`, which re-renders the rail,
  so the `MutationObserver` re-posts the tree.
- Lesson audit: 20 new specs (2 fast + 18 browser), 2 deleted, 4 re-pointed
  — counted from `--name-status`; pins `fast 569/569`, `browser 622/589`
  match `guard_enumeration.mjs --json`; the widths re-measured above; the
  named test `test_no_viewer_vocabulary_is_spelled_as_a_comparison_chain`
  exists. No arithmetic or attribution I could fault.
- The DoD's `handoff:` on the narrow-strip issue points at this handoff, so
  Complete resolves it — correct, this handoff fixes it.

**Risky subset (pre-merge; same tree post-merge).** Rows: `apps/viewer/`,
`apps/annotate/`, a CSS rule, guards/witnesses, prose in tracked docs.

- `pytest -q tests/test_js_python_vocabulary.py tests/test_viewer_readme_doc_facts.py
  tests/test_viewer_deep_link_contract.py tests/test_js_vocabulary_is_generated.py
  tests/test_feature_identity.py tests/test_part_mesh_aliases.py
  tests/test_app_type_scale.py tests/test_mutation_witnesses.py
  tests/test_tolerance_stack.py tests/test_provenance.py
  tests/test_thermal_exception_list.py tests/test_claims_registry.py
  tests/test_architecture_inventory.py` — **393 passed**.
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack/data/scratch/shell_scene`
  — **567/568**; the one red is `[real] the topology fixture's shapes still
  match the builder's`, already filed on integration
  (`ISSUE_20261026_topology_fixtures_lack_the_tags_fields_…`). One `[real]`
  SKIP (part sourced to both a drawing and a workbook — no such part in the
  data), pre-existing.
- `node apps/annotate/run_tests.cjs` — **225/225**.
- `node apps/annotate/run_browser_check.mjs` — **72/72**.
- `node scripts/run_viewer_browser_tests.mjs --repo <scratch>` (full) —
  **30/31 suites**. The red is `annotate rail and scene` 20/22: the two
  gap-badge checks, already filed on integration
  (`ISSUE_20261026_the_rail_gap_badge_browser_checks_read_gap_rows_integration_no_longer_has.md`),
  in standalone-annotator code this diff does not touch. `3D pane follows …`
  27/27, `annotate flyout` 46/46.

The scratch root is the tactical agent's
(`C:\workspace\tolstack\data\scratch\shell_scene\`). Its projections carry
`head_sha afd812c7`, and `git diff afd812c7 fa610075` touches no projection
input (viewer JS, the browser harness, the pins, one spec, shots, lesson);
its `docs` junction points at the tactical worktree, which is clean at the
same tip `fa610075`. So it is paired with the tree under review.

**Witnesses.** `--changed-since integration --selection-only` selects 51
entries — the tactical lesson's 51, witnessed 51/51 on this identical tree
(the merge being a fast-forward, nothing moved underneath them). I did not
re-run the 38-minute selection. The overlay's "layout change decays an
untouched geometric witness" entry: every flyout-suite geometric spec is in
the selection; the three outside it (`b5183840`, `4d422e96`, `42579b37`) run
with the scene closed, in suites that went green above.

**Planted, to test a coverage gap (finding S1):** renamed the receiver's
`toggle`/`check` branches in `railGesture`; `--only "3D pane follows"` stayed
**27/27**. Reverted.

**Post-merge full suite:** see "Post-merge run" below.

## Findings

### Blockers

None.

### Should-fix (filed, not fixed)

- **S1 — two of the nav tree's six gestures are pinned by nothing
  end-to-end.** `apps/viewer/views/nav.js` (sender) /
  `apps/annotate/app.js` `railGesture` (receiver). `toggle` (collapse/open a
  body or joint from the nav — deliverable 3's "collapsible") and `check`
  (the per-body / per-part show-hide box), plus `button` at index > 0
  (Pick / Isolate / Remove), have no browser check; the fast tier pins only
  the sender's spelling; the six `act` words are inline literals on both
  sides with nothing pairing them; an unknown `act` is dropped silently.
  Measured: renaming both receiver branches is green in every tier. The
  behaviour works today (read through), so this is coverage, not a defect —
  but it is a new guard set that cannot see two of its own words.
  Filed: `docs/issues/ISSUE_20261027_the_nav_scene_trees_toggle_and_check_gestures_can_be_broken_green_in_every_tier.md`.

### Design (filed, non-blocking)

- Part rows in the nav carry a checkbox and two buttons at all times, so
  the name gets ~10 characters at the nav's 300px; and the kinematic tree
  arrives at the bottom of the nav. Full text is on hover, so nothing is
  undiscoverable. Filed `low`:
  `docs/issues/ISSUE_20261027_design_the_nav_scene_tree_clips_part_names_to_a_few_characters.md`.

### Nits

- Fixed inline: the keyboard issue's new addendum said the issue "stays
  open"; its status is `deferred`. Now "stays deferred".
- `body.an--embedded { background: var(--embed-bg, #1b1e22) }` keeps the old
  frame colour as a literal fallback; harmless (it only shows before the
  parent's token is read), noted for the next CSS pass.

## Checklist items that applied

- Handoff fence: `scripts/guard_enumeration.mjs` is touched for pins only
  (allowed). No DAG renderer layout or scene geometry touched
  (`scene.js` gains one `setBackground` method).
- An annotator verb changing mode/subject without `announced(...)`: no new
  `commands.register` in the diff.
- Second state fact beside an old one: the tree is cleared wherever the head
  line is (`drivePane`, close), and forced again after every announced verb.
- Read the branch's screenshots for layout: done; one design finding.
- Integration moves while a tier runs: checked before the slow tiers;
  `integration` did not move.

## Overlay

Added one **Recurring bugs** entry: a cross-frame message whose verb set is
exercised only in part — list the verbs, grep the browser tier for one
real-iframe check per verb, rename one receiver branch.

## Post-merge run

In this review worktree, on the merged tree (`fa610075` + my review commit's
docs), `node_modules` junctioned in:

- `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -rfs` —
  **1 failed, 1579 passed, 1 skipped, 2 deselected in 326 s**, single
  process. The failure is the documented worktree-only
  `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green` (no
  projection in a worktree); that tier ran through `--repo` above at
  567/568 with its one red already filed. The skip is
  `test_fit_bound_features.py:424` (re-extraction not installed). Identical
  to the tactical record. Recorded with `suite-time record`: inside budget.
  This repo's conftest prints no contention header lines.
- After my overlay edit: `pytest -q tests/test_tolerance_stack.py
  tests/test_provenance.py tests/test_thermal_exception_list.py
  tests/test_claims_registry.py` — 225 passed.
- No file under the main checkout's `data/` (outside `data/scratch/`) changed
  during the runs.

Left unexercised in the worktree: nothing beyond what the `--repo` runs
above covered. The full mutation-witness selection was not re-run (see
"Witnesses").

The tactical scratch root `C:\workspace\tolstack\data\scratch\shell_scene\`
is still in place; I reused it and did not delete it (another session's
artifact). It is gitignored; whoever cleans `data/scratch/` next can remove it.
