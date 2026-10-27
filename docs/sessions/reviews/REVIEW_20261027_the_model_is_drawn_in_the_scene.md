---
type: review
handoff: docs/sessions/active/HANDOFF_20261026_the_model_is_drawn_in_the_scene.md
reviewer: agent
date: 2026-10-27
verdict: APPROVE
blockers: 0
---

# Review — the_model_is_drawn_in_the_scene

The branch `handoff/the_model_is_drawn_in_the_scene` has 8 commits, cut from
`integration` at `05745fc7`. `integration` had not moved, so the merge into
`review/the_model_is_drawn_in_the_scene` was a fast-forward to `9c8b030c`,
and the merged tree is the branch's own tree. There was no prior review
attempt on this branch, and the handoff ran once (`active/`). Every
lesson/issue in the diff arrives as `A`, except one dated addendum to
`ISSUE_20261014_sweep_modes_frame_rate…`.

**Scope.** This is not a tolerance stack. No element, band, `confidence` or
citation changed. Mandatory checks 1–7 have no subject here. The handoff's
own rule ("an anchor is a place to draw, never a value") is honoured: the
layer writes nothing, and `writeIdentityEvent` only *triggers* a rebuild.
`apps/viewer/` and the topology documents are untouched, as fenced. The only
change outside `apps/annotate/` / `docs/` / `tests` / witnesses is the
`DECLARED_GUARDS` pin raise (`scripts/guard_enumeration.mjs`), which is the
fence the DoD forces through (pins only, as allowed).

## What I verified

- **Code read in full**: `model_layer.js` (new, pure), the `app.js` layer
  wiring, `scene.js`'s model methods, the `sweep.js` layer vocabulary, the
  `face_geometry.js` plane `point`, the fast-tier checks and the new TRUTH
  suite.
- **The DoD against the run, re-measured on P2** (my run, scratch root below):
  - **47 nodes / 59 edges**, recounted from the projection: every node
    anchored and every edge a line.
  - **Anchors by source**: joint 4, section 36, origin 7, bound 0. The seven
    origin nodes are all on parts with no installed mesh.
  - **Hub ladder** at x = 176.2, six rungs from z −58.2 to 47.5.
  - **Tan-link mount**: 7 regions across x −129…113, and the bore anchors at
    x = 108.9 (not the ring's centre).
  - **Link lines** are bit-identical to the stick figure (`Object.is` per
    float).
  - **The synthetic binding** moves exactly one node.
  - **Anchors message**: 4 seen by the shell; one node agrees with an
    independent projection to 0.1 px.
  - **Frame rate**: 59.0 fps with the layer, 51.8 without, 60.2 with it again.
    That is noise on a shared box, and it agrees with the lesson's
    58.1 / 60.3 / 56.9.
- **The lesson's counts and tables re-derive** (canonical audit item). The
  source table, the 47/37/41 message shape, 6 of 59 lit, the section-plane
  rows I could measure (hub, mount) and the witness tally all match my own
  runs. I found no causal claim I could refute.
- **The handoff's deviations are pinned.** Two of the lesson's decisions
  depart from the handoff's literal text:
  - **The plane** goes through the occurrence's box middle rather than the
    body's frame origin. I put the handoff's version back in a scratch copy
    (`sectionPlaneAt` → `0 + nudge`). The fast tier went red by name
    (`model: a ring cut through its axis…`: "the plane follows the
    occurrence: got 0.0001, expected 7"), so the replacement rule is guarded.
  - **The rungs** are evenly spaced instead of "lifted to the node's Z".
    These are pinned by the ladder checks (`[5, 10, 15]`).

  Both arguments hold. On the first: every solver body's frame *is* the
  assembly frame here, so "the body's frame origin" is one point for every
  body. That is also the cause of the design finding below.
- **Overlay entries checked.**
  - **`announced(...)`**: `model` changes neither mode nor subject, so it
    needs none.
  - **Per-frame re-application**: `setModelFrame` → `_applyModelStyle`
    re-sets colour and opacity on each frame. These are plain property
    writes with no `needsUpdate` and no allocation, so I raised no finding.
  - **Composition in `app.js`**: covered by the TRUTH suite, and all 15 of
    its specs were witnessed.
  - **A new cross-frame message**: `annotate:anchors` is observed in the
    shell's own window and checked to the pixel.
  - **The screenshots**, read for layout as well as the DoD claim (see the
    design finding).
- **Pre-filed reds, not this diff's**: the two gap-badge checks
  (`ISSUE_20261026_the_rail_gap_badge_browser_checks_read_gap_rows_integration_no_longer_has.md`)
  and the topology fixture drift (`ISSUE_20261026_topology_fixtures_lack_the_tags_fields…`).
  Both are on integration.

## Tests

The tactical's record is complete: command, checkout, counts, the
worktree-only red named, and timed with `suite-time record`. I gave it the
benefit of the doubt.

**Pre-merge risky subset** (merged tree == branch tree), from the review
worktree with `node_modules` junctioned in:

- `node apps/annotate/run_tests.cjs`: **235/235**, no SKIP lines.
- `node apps/annotate/run_browser_check.mjs` (mock): **79/79**.
- `pytest -q` over `test_js_python_vocabulary`, `test_js_vocabulary_is_generated`,
  `test_feature_identity`, `test_part_mesh_aliases`, `test_mutation_witnesses`,
  `test_projection_freshness`, `test_tolerance_stack`, `test_provenance`,
  `test_thermal_exception_list`, `test_claims_registry`,
  `test_architecture_inventory` and `test_app_type_scale`: **399 passed**, 90 s.
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack/data/scratch/model_in_scene --only annotate`:
  **9/10 suites**. The new suite passed **15/15**. The red suite is
  `annotate rail and scene` at 20/22, which is the two pre-filed gap-badge
  checks.
- `node scripts/run_mutation_witness_tests.mjs --repo <same scratch> --changed-since integration`:
  39 selected, **38/39 witnessed**. All 25 of this branch's specs were
  witnessed, including the lit-set spec, which aborted in the tactical's run
  and witnessed here. The one miss is
  `browser__real-leaving-sweep-mode-puts-back-every-occurrence-a-bod__3d012dc4`,
  which was **red before** for the same pre-filed gap-badge reason. It is not
  a decay this diff caused.

**The scratch root** is the tactical's
`C:\workspace\tolstack\data\scratch\model_in_scene\`. Its projections were
built at `f773cf11`, and the only later commit (`9c8b030c`) changes the
lesson alone, so they are this tree's projections. Its `docs` is a junction
into the tactical worktree, which holds the same tree.

**Post-merge full suite**, run in the review worktree on `5a98fba0`:
`C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -rfs`, serial
(the venv has no xdist).

- **Result:** **1 failed, 1592 passed, 1 skipped, 2 deselected**, 968 s. These
  are the same counts as the tactical's run.
- **The failure** is the documented worktree-only
  `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`. Its `[real]`
  checks were exercised instead through `--repo` above, via the annotate
  TRUTH subset.
- **The skip** is `test_fit_bound_features.py:424`, because the pitch-link
  bearing re-extraction is not installed.
- **Contention header lines:** this repo's conftest prints neither
  `concurrent pytest processes at start` nor `full-suite lock`.
- **Timing:** `suite-time record` said **OVER BUDGET by 6m08s**. The same
  command took 366 s in the tactical's run of this tree, so most of the
  spread is load on the box. I appended a dated measurement to the open
  `ISSUE_20261022_the_default_test_tier_runs_past_its_ten_minute_budget.md`
  rather than filing a twin. That issue's status is `deferred`, which is
  still the one issue for this tier.
- **Pollution:** no file under the main checkout's `data/` (outside
  `data/scratch/`) changed during the session, and the main checkout's
  `git status` is clean.

**Not exercised from this worktree:**

- the full browser TRUTH tier outside `--only annotate`. That run is the
  batch merge's, and `apps/viewer/` is untouched.
- the viewer fast tier through `--repo`. The tactical recorded 570/571, the
  one red being the pre-filed fixture drift.

## Findings

**Blockers:** none.

**Should-fix:** none.

**Design (filed, non-blocking):**
`ISSUE_20261027_design_the_model_layer_draws_a_star_at_the_assembly_origin_and_runs_the_blade_lines_1400mm_outboard.md`
(`priority: low`, `audience: strategy`). Both items are visible in the
branch's own screenshots:

- The seven no-mesh nodes all fall back to "the body's frame origin", which
  is the assembly origin for every body. That draws a fan of lines meeting in
  the middle of the hub, which is the ring-centre line the +X bias exists to
  avoid.
- The blade's nodes anchor ~1.4 m outboard. The lesson knew this and left it
  as is.

Neither breaks a rule the handoff set, so the issue offers options rather
than a defect.

**Nits — fixed inline** (`5a98fba0`; comment/whitespace only, so all three
prongs hold):

- `apps/annotate/model_layer.js` header: the `origin` source said "or, in
  bind mode, the part is not open". `modelPartInfo` reads the mesh list in
  both modes, and the real second cause is `noCut` ("the section plane cuts
  nothing"), which is what the comment now says.
- `apps/annotate/app.js` (`buildOwnerNotInSetFields`): one `buildModel()` line
  was indented 2 spaces inside a 6-space block.

**Noted, not filed:**

- The new TRUTH suite returns a passing named SKIP line when the projections
  lack bodies. That is the convention of its neighbours, and it is already
  filed as `ISSUE_20260918_a_skipped_browser_suite_returns_ok_true…`. In the
  main checkout it **will** skip until the projections are rebuilt from a
  tree with the merged topology. The batch merge must rebuild first, as
  `CLAUDE.md` already says.
- `ISSUE_20260921_annotate_readme_measured_numbers_are_paired_by_nothing.md`:
  this diff added no measured numbers to `apps/annotate/README.md`, so there
  is no new sighting.
- The lit-set gap (nothing in the shell posts `model lit`/`model unlit` yet)
  is correctly filed by the author as
  `ISSUE_20261027_the_shell_does_not_yet_post_its_lit_set_or_unlit_style_to_the_scene.md`,
  with the staged `leaders_follow_the_active_study_across_the_seam` named as
  owner.

## Overlay

Added a Recurring-bugs entry: "The body's frame origin is one point for every
body here."

## For the next reviewer

- The scratch root `data/scratch/model_in_scene` (~385 MB) is the tactical's.
  The lesson says to delete it after review. I left it in place, because the
  leaders handoff is its natural next user, and dispatch/triage owns
  `data/scratch` cleanup.
