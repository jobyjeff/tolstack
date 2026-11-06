---
type: review
handoff: docs/sessions/active/HANDOFF_20261105_a_two_row_cylinder_band_fits_as_a_cylinder.md
reviewer: agent
date: 2026-11-05
verdict: APPROVE
blockers: 0
---

# Review: a_two_row_cylinder_band_fits_as_a_cylinder

**Verdict: APPROVE**, with one should-fix filed as an issue. The work fixes the
real cause: the facet-normal test, not the sphere's band rule. The new rule is
conservative: the sphere is asked first, and the only change is `other` →
`cylindrical`, so no face that was a plane, a sphere or a cylinder moves. The
corpus claim reproduced exactly.

## Which run, and the merge

- `docs/sessions/active/` holds this handoff. The branch worked it. The lesson
  arrives as `A`, so it overwrites nobody's record.
- `handoff/…` was not already contained in `integration` (`1a976673`). The
  branch merged cleanly into `review/…`. `integration` did not move during the
  review, so the sync merge was a no-op.

## What I verified

**The DoD, by re-derivation.** I wrote a scratch script that imports
integration's `feature_geometry.py` and the branch's side by side and runs
`fit_part_faces` over every sha directory in the main checkout's
`data/meshes/`.

- **487 and 521:** both `cylindrical`, r 20.5199994, axis 1.1e-7 off Z, arc
  73.0°.
- **Whole store:** 36,294 faces over **47** meshes. 115 faces change, every one
  `other` → `cylindrical`, over 12 parts. Per-radius counts match the lesson's
  table row for row.
- **Face 439:** unchanged, `cylindrical` at r 16.5.

**The proposals.** Events `0058`–`0062` in the main checkout's
`data/inbox/feature-identity/` propose face 487 for the five pilot-boss edges,
at `high`.

- "439 is no longer the top proposal" holds for the contact engine. In the
  proposal list it only holds once Jeff turns 439 down, because an agent cannot
  reject a proposal.
- The tactical agent reported this plainly and added it to the open
  `needs: jeff` issue
  (`ISSUE_20261103_reject_the_pitch_plate_centre_proposal_on_the_small_boss.md`),
  whose `ask:` still reads correctly. That satisfies the canonical "outcome the
  work could not show" check.

**Scope deviation (`apps/annotate/` touched).** The handoff fenced the
annotator off only so this work would not collide with
`the_annotator_reads_a_nodes_declared_face`. That handoff had already landed
on this branch's base. A Python-only change would turn
`test_real_both_readers_classify_every_installed_face_the_same` red on 115
faces. The deviation is justified and documented.

**The JS twin.** `cylinderByNodes` / `AA.refineCylinder` match the Python
statement for statement: the same gates, the same order and the same
`FLOAT32_RESOLUTION`. Both new tolerances are paired through
`JS_TOLERANCE_NAMES`. Their outputs are held equal on every installed face by
the `[real]` pairing test, which ran here.

**Mutations (Python, one line each, run against the three new tests):**

| mutation | result |
|---|---|
| drop the node test | red: `test_a_one_band_cylinder…` |
| drop the ulps bound | red: `test_a_one_band_sphere…` |
| drop the 8-node minimum | red: `test_six_nodes…` |
| drop the facet-radial pre-gate | **green** |
| drop the arc gate | **green** |

The three JS mutations are enrolled, and all were `WITNESSED` here.

**Repo-checklist items.**

- Checks 1–7 (traced ratio, signs, LMC/MMC, RSS, cotter hardware) do not
  apply. This is not a stack, and no element, band or `source_ref` changed.
  The only data edit is two topology node `note` strings. I grepped for them:
  no test pins that text.
- Guard enrollment: three new annotate guards with three specs. The pin went
  282 → 285 with the names digest updated, so these are real specs, not just a
  raised pin.
- No new module, so the inventory is unaffected. `data/inbox/specs/` was
  untouched.

## Tests

The tactical agent records a full suite in its worktree: 1727 passed,
1 skipped, 1 failed (the documented `test_viewer_js_suite` worktree red),
417 s. The diff's own tests are included, so I gave the record the benefit of
the doubt.

- **Pre-merge risky subset:**
  - pytest over `test_feature_geometry`, `test_architecture_inventory`,
    `test_js_python_vocabulary`, `test_js_vocabulary_is_generated`,
    `test_mutation_witnesses`, `test_topology`, `test_topology_projection`,
    `test_tolerance_stack`, `test_provenance`, `test_claims_registry`,
    `test_feature_identity` and `test_part_mesh_aliases`: **630 passed**, 245 s.
  - `node apps/annotate/run_tests.cjs`: **285/285**, 0 SKIP lines.
- **Post-merge full suite** (review worktree, single process; `-n` is not
  installed in this venv):
  `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -rs`. Result:
  **1 failed, 1727 passed, 1 skipped, 2 deselected, 412 s**. The failure is the
  documented worktree red. Recorded with `suite-time` as inside budget.
  - This repo's suite prints no `concurrent pytest processes` or
    `full-suite lock` header lines.
  - No file under the main checkout's `data/` changed during the run.
- **Mutation witnesses:**
  `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --changed-since integration`
  gave **5/5 witnessed**, in 3m06s.
- **Viewer fast tier:**
  `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` gave
  **517/518**. The one red is `[real] the projection this tier reads was built
  from this tree`, which correctly refuses the main checkout's
  trunk-built projection.
- **Left unexercised:** the viewer `[real]` tier and the browser TRUTH tier
  were not armed against the merged tree. This diff reaches them only through
  two node `note` strings, and `fits.json` has 0 fitted features. They are the
  batch merge's job, after `scripts/rebuild_projections.ps1`.

## Findings

**Should-fix (filed, not fixed):**
`ISSUE_20261105_the_pilot_boss_cylinder_fit_has_no_real_pin_and_two_node_test_gates_are_unwitnessed.md`.

- No `[real]` test pins 487/521 as `cylindrical`. The DoD's headline is held
  only by a look-alike fixture.
- The arc gate and the facet-radial pre-gate survive deletion in every
  synthetic tier.

Neither one moves a verdict today.

**Nit (fixed inline):** the lesson said "48 meshes", but there are 47
(`data/meshes/` also holds `README.md`). I added a correction blockquote and
left the original text as written.

## Overlay

I extended the "Two readers of one geometry" entry with its other half: an
output pairing cannot see a gate deleted from both readers, and a DoD that
names real faces needs a `[real]` pin on them.
