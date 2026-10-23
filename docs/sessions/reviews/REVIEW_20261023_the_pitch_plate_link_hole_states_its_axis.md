---
type: review
handoff: docs/sessions/active/HANDOFF_20261022_the_pitch_plate_link_hole_states_its_axis.md
reviewer: agent
date: 2026-10-23
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-10-23 — the_pitch_plate_link_hole_states_its_axis

The branch is docs only: two commits, four files. There is an addendum on
`ISSUE_20261022_…_stays_a_band.md`, two new issues (`…_bind_the_pitch_plate_link_hole_in_the_annotator.md`
with `needs: jeff`, and `…_a_kinematic_disk_spans_two_frame_axes_….md` with
`audience: strategy`), and the lesson. The agent took **deliverable 3**. The
study, the topologies and the tests are unchanged.

## What I verified (re-derived, not copied)

- **The drawing reading.** 215735-A in `data/inbox/drawings/` hashes to
  `a06526c2…c004`, the same sha256 as both drawing-checker runs
  (`20260813_180734_215735-A`, `20260819_153213_215735-A`). I rendered both
  sheets myself and dumped their text layers.
  - Sheet 1's edge view carries the A-A cutting line in the plate plane, and
    datum A sits on the face with ⏥0.1. So Section A-A (sheet 2) is a plane
    normal to the spindle. CAD Z is the spindle, per the study's own
    `pitch_plate_attach_height` note.
  - In Section A-A the 5X Ø7.950 holes are drawn lengthwise across the rim
    walls, with diameter extension lines running along the axis. The axis
    therefore lies in the plate plane.
  - The frame is composite: one ⌖ spans `⌀0.2 A B C` and `⌀0.1 A`.
  - Neither sheet has a basic angle or dimension that fixes the in-plane
    direction. The 5X 9.39 / 3.00 / 4.06 dimensions run along the hole from
    G. Note 5 defers to the 3D model. The holes do draw near-radial, but the
    drawing never states it.
  - So "half settled, direction unknown" is the honest reading, and choosing
    deliverable 3 over 2 was correct. Nothing was guessed.
- **The numbers.** I wrote my own script against `tolerance_stack.kinematic`
  on P2 (`vpa-pitch-p2-20261016-235852`):
  - At point_a, J is (−0.0428, −0.2376, −1.5555) at −7° and
    (−0.0287, −0.3988, −1.4893) at +72°. Today's worst-case halves are
    0.2436° and 0.2424°.
  - The disk coefficient is 1.5735 with the axis ∥ X, 1.5741 radial and
    1.5741 at most at −7°. At +72° it is 1.5418, 1.5412 and 1.5420.
  - The worst-case deltas are +0.0018 / +0.0019 / +0.0019° at −7° and
    +0.0052 / +0.0052 / +0.0053° at +72°.
  - point_a's azimuth is −11.40°.
  - Every figure in the addendum, the issue and the lesson reproduces. No
    verdict moves: the S461-607 margins are 0.256 / 0.258.
  - The lesson's "max over in-plane axes = ‖J‖" claim is correct algebra.
- **Issue hygiene.** Both new issues have complete, in-grammar frontmatter
  with `found_by:` and no `handoff:`.
  - The `ask:` is plain words under 140 characters, has the shape the handoff
    prescribed, and is a person-only action (an annotator binding is a human
    select-and-tag step).
  - I found no duplicates on `HEAD`, `integration` or `master`.
  - "`data/inbox/feature-identity/` holds only its README" is true. The parts
    mesh with `asm217755_215735_001` exists under `data/meshes/0d6f23ee…`.
- **F4** was described, not decided. The rows it cites (32, 37 and 48 of
  `WORKSHEET_endstop_vision_baseline.md`) say what the lesson says they say.
- **Mandatory stack checks 1–7.** No element, band, sign, `lmc`/`mmc`,
  nominal or confidence changed. Check 1 is the only one with content here:
  the cited drawing exists, the hash matches and the reading holds. Checks
  2–6 have nothing to check. For check 7 the ratio is unchanged, because no
  stack element moved.
- **Drawing-checker read-only.** The 215735 run directories' files are all
  from August and September. The directory mtimes moved at 14:00 today, along
  with eleven other run directories and an appended `runs.jsonl` row listing
  exactly those twelve runs. That is a drawing-checker-side batch operation,
  not this session: the tactical agent only read 215735.

## Tests

- **Tactical record:** `venv-win/Scripts/python.exe -m pytest -q -rs`, run in
  the bridged worktree, gave 1 failed / 1563 passed / 1 skipped in 537 s. The
  failure is `test_viewer_js_suite.py`, red by design in a worktree. The skip
  is `test_fit_bound_features.py:422`. That is consistent with a docs-only
  diff, so I gave it the benefit of the doubt.
- **Pre-merge risky subset** (a docs/issues + lessons diff, so the prose row
  plus the kinematic file it discusses): `tests/test_kinematic.py
  tests/test_tolerance_stack.py tests/test_provenance.py
  tests/test_thermal_exception_list.py tests/test_claims_registry.py` gave
  **261 passed**. That includes the `[real]` P2 pins, which read the main
  checkout's data by absolute path.
- **Post-merge full suite** (review worktree, after
  `dispatch bridge-test-inputs`: 6 linked, 1 present):
  `venv-win/Scripts/python.exe -m pytest -q -rs -p no:cacheprovider` gave
  **1 failed, 1563 passed, 1 skipped in 443.85 s**. It is the same failure and
  the same skip as above, and it is recorded inside budget with `suite-time`.
  tolstack's conftest prints no contention header lines. `-n 16 --dist
  loadfile` is not available here because xdist is not installed in
  tolstack's venv, so the run was single-process.
- **Viewer:** `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`
  gave 451/452, with the node-fs `[real]` tier **NOT RUN**: the main
  checkout's projection was not built from this tree. This is the DoD item the
  agent reported unmet. I did not arm it through a scratch rebuild either,
  because the diff touches no projection input and no viewer code. The tier's
  verdict on this tree is therefore the same as on `integration`'s tip, and the
  batch merge's rebuild-then-run covers it.
- The suite left no file under the main checkout's `data/` modified.

## Findings

No blockers and no should-fixes.

Nits (no issue needed):

- The DoD's "viewer `[real]` tier against a rebuilt projection" was not met.
  It is moot for a diff that changes no projection input, and the agent said so
  plainly rather than presenting a green. That is the right handling.
- Both parent issues (`ISSUE_20261016_…_one_axis_band.md` and
  `ISSUE_20261022_…_stays_a_band.md`) carry `handoff:` pointing at this
  handoff, so Complete will auto-resolve them. That is correct this time
  because the conversion now has an owner, `ISSUE_20261023_bind_…` (plus the
  strategy issue). A triage sweep should not "reopen" them as a false
  close-out.
- The study's `excluded_terms` text still says the gap is "closed by … or by
  215735-A's own views naming the hole's direction". We now know those views
  do not name it. The handoff fenced the study in deliverable 3, so that text
  waits for the binding's follow-up, which rewrites those lines anyway.

## Overlay

I refined the existing kinematic-zone entry under "Recurring bugs to check":
a two-label `disk` is right only when the feature's axis is the third CAD
axis, so check the cited axis against the frame.

## Verdict

**APPROVE.** I merged into `integration` as a fast-forward of
`review/the_pitch_plate_link_hole_states_its_axis`.
