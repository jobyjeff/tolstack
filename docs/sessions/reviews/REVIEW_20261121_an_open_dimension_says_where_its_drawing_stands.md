---
type: review
handoff: docs/sessions/active/HANDOFF_20261119_an_open_dimension_says_where_its_drawing_stands.md
reviewer: agent
date: 2026-11-21
verdict: APPROVE
blockers: 0
---

# Review — an_open_dimension_says_where_its_drawing_stands

Branch `handoff/an_open_dimension_says_where_its_drawing_stands` at `a9aa00db`,
merged into `review/…` as a fast-forward. `integration` had not moved past the
base `14072fb7`. Not merged before this review: containment was false at the start.

## What I verified

**Deliverable 1, one status per open dimension.** `dimension_drawing_status`
(`scripts/build_topology_projection.py`) reads the projected part's
`drawing_runs` / `other_dash_runs`. Those are `part_drawing_runs`'s lists, so the
work adds no second matcher. Precedence is `unknown` (empty run listing), then
`no_drawing`, then `read` (newest own run), then `other_dash_read`, then
`not_read`. Cited edges (including `untraced` ones) and gap edges get `null`.
`DRAWING_STATUSES` is a module constant with a `js_vocabulary.py` row, and
`vocab.gen.js` is regenerated. An absent root makes every status `unknown`,
`no_drawing` parts included, and the value-level tests pin that.

**The counts, re-derived** from my own build of the merged tree (scratch root,
drawing-checker at `C:\workspace\drawing-checker`):

| model | read | other dash | not read | no drawing | unknown |
|---|---:|---:|---:|---:|---:|
| `vpa_end_stop_v2` | 25 | 20 | 8 | 22 | 0 |
| `vpa_pitch_linkage` | 3 | 8 | 1 | 6 | 0 |

These match the lesson. 25+20+8+22 = 75 open dimensions on v2. The read-and-uncited list
(213668-002 ×7, 214700-002 ×6, three drawings ×3, three ×1) sums to 25, and
"13 of the 25" is right. The issue addendum's not-read drawings (216332-001 ×3,
214820-002 ×4, 213861-002 ×1) sum to 8. The four other-dash drawings in the
lesson's table are exactly v2's four (214373-003, 215175, 215071, 215735).

**Deliverable 2, the rebuild summary.** One line per model, iterating the
counts object's own keys. PowerShell restates no word list.

**Deliverable 3, the chip.** The chip appears in the grid row's nominal cell
and in the Preview. `read` and `other_dash_read` chips link to the run through
`VA.runUrl`. The other statuses show the spec or the drawing on hover, and
`unknown` shows nothing. I read the shots: the read grid, the no-drawing
Preview and the page are fine. No sentence explains the chip, and nothing
was added to the header or the tree.

**Deliverable 4, the to-transcribe list.** `drawings_read_uncited` is sorted
by `-waiting` then `drawing`, and pinned.

**Scope fences held.** The diff makes no change to topology values, the copy
inbox, drawing-checker, forge, the spec library or the map layout. It adds no
guard, gate or refusal beyond the three witnessed viewer checks.

**Lesson file** is new (`A`), at the handoff's named path.

## Tests

Pre-merge risky subset (rows: builder/rebuild script, `apps/viewer/`, guard +
witness, ARCHITECTURE, CSS):
`pytest -q tests/test_dimension_drawing_status.py tests/test_js_python_vocabulary.py tests/test_js_vocabulary_is_generated.py tests/test_viewer_readme_doc_facts.py tests/test_viewer_deep_link_contract.py tests/test_projection_provenance.py tests/test_rebuild_projections_script.py tests/test_rebuild_terminal_state_pairing.py tests/test_topology_projection.py tests/test_topology_map.py tests/test_mutation_witnesses.py tests/test_architecture_inventory.py tests/test_app_type_scale.py`
gave **274 passed**.

Post-merge (merge sha `a9aa00db`, tree `ee9550e2`). The scratch root
`data/scratch/rv_odd_1120` was built from this worktree with `--data-root`. All
eight builders exited 0 and every stamp was paired at `a9aa00db`.

| tier | command | result |
|---|---|---|
| viewer fast | `node apps/viewer/run_tests.cjs --repo <scratch>` | **623/623**, "projection paired with this tree" at `a9aa00db` for all four |
| annotate fast | `node apps/annotate/run_tests.cjs` | 333/333 |
| default | `C:/workspace/tolstack/venv-win/Scripts/python.exe -X utf8 -m pytest -q -p no:cacheprovider` (worktree) | **2 failed, 2585 passed, 1 skipped, 4 deselected in 561 s** (ledger: inside budget) |
| browser, whole tier | `node scripts/run_viewer_browser_tests.mjs --repo <scratch>` | **49/49**, 981 checks, no `SKIPPED` block, 2398 s (over the 1800 s merge budget; appended to the deferred `ISSUE_20261106_the_viewer_browser_tier_ran_51_minutes_against_the_merge_budget.md`) |
| witness gate | `node scripts/run_mutation_witness_tests.mjs --repo <scratch> --changed-since integration --budget-min 10` | exit 0: 1/1 witnessed, 1/22 reached in 10m32s, 21 left to the sweep. One unrelated fast entry (`…borrows-its-band…`) used the whole budget |
| witness, this handoff's 3 specs | the same runner, `--only` ×3 | exit 0: **4/4 witnessed**, 4/7 reached in 24m15s, 3 left (budget). The tactical ledger row (2026-11-21T04:37:35Z, 34 s, `6aa24691`) witnessed all 7, and the anchors are unchanged since then |

The pytest output has no contention header lines (the repo's conftest prints
none). The two reds are the same ones the tactical agent recorded:
`test_viewer_js_suite_is_green` is the deliberate worktree red, and that tier is
623/623 through `--repo` above. `test_export_runs_match_the_run_log` is live
drawing-checker data (a sixth gas-spring-mount run), already filed on
integration as
`ISSUE_20261119_the_gas_spring_mount_export_has_a_sixth_run_the_pitch_linkage_topology_does_not_list.md`.

## Findings

No blockers. No should-fixes. Nits, not filed:

- **`spec sheet` asserts a reason for an absence.** `no_drawing` means only
  that the part has no `drawing` field. Every open `no_drawing` dimension today
  sits on hardware or a vendor part (races, NAS bushings and bolts, the gas
  spring), so the word is true now. v1 also has `ring_gear`, `hydraulic_brake`
  and `flanged_bushing_unidentified` ("part not identified") with no number. An
  open dimension on any of them would wear a wrong word. The handoff itself
  defined the status as "hardware on a spec sheet", so this is not a defect
  against it. I added an overlay entry.
- **The lesson's other-dash table covers v2's four drawings, not v1's
  215177.** The handoff asked for one per drawing in the group. v1's pitch plate
  is the one not looked at. Minor, because the walk targets v2.
- **The `DECLARED_GUARDS` `fast` pin moved 620 → 623 with no dated comment line.**
  The comment above still describes the previous change. The digest is the
  real guard, so this is cosmetic.
- **A pre-existing class, nothing new:** `drawing_status` reads
  drawing-checker's run listing, which sits outside the provenance stamp. A new
  run leaves the projection "fresh" and stale until the next rebuild. The part
  rows' run links already had the same exposure (overlay, "A projection field read
  off another repo's directory listing").

## For the next reviewer

The witness runner took about 4.5 min per fast entry on this box today (the
fast tier alone took 296 s), so the 10-minute gate reaches one or two fast
entries. Run the handoff's own specs `--only` and cite the tactical row when
the budget cuts them off.
