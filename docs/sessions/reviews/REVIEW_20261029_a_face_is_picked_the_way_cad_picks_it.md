---
type: review
handoff: docs/sessions/active/HANDOFF_20261029_a_face_is_picked_the_way_cad_picks_it.md
reviewer: agent
date: 2026-10-29
verdict: APPROVE
blockers: 0
---

# Review — a_face_is_picked_the_way_cad_picks_it

**Verdict: APPROVE.** No blockers. Two should-fixes and two lower findings
are filed as issues. Three comment and doc corrections were made inline.

## Run identity

- First review of this slug. Before I started, `git log HEAD --
  docs/sessions/reviews/` showed no prior attempt, and the handoff sits in
  `active/`.
- The handoff branch was not yet contained in `integration` when I started.
- The lesson arrived as `A`, and every issue the diff modifies is the
  author's own appended measurement.

## What the work does

A joint end's **Pick** in sweep mode now arms a CAD-style pick: `arm <edge>
<from|to>` (`apps/annotate/app.js` `cmdArm`, pure half in `sweep.js`). In
order:

1. Arming seeks to the as-modelled frame with no prompt.
2. The end's part is drawn solid. Every other part is ghosted at
   `ARMED_GHOST_OPACITY = 0.07` with depth write off, or hidden (a remembered
   toggle).
3. The camera frames the occurrence the end's body anchors.
4. The raycast is filtered to that part (`scene.js` `setPickFilter`, `pick`).
5. Hover pre-selects: a yellow wash and outline, a crosshair cursor, and the
   state line names the face.
6. A click binds through the existing `buildBoundEvent`, superseding the end's
   single standing binding if it has one. A toast shows and the arm ends.
7. A click on another part flashes "not on <part>". Empty space does nothing.
8. Esc (in the annotator and from the shell), Cancel, `arm off` and any
   transport verb restore the scene and camera. The bar then offers "back to
   the sweep".

The shell's nav gets a `.tv__divider` drag handle with a 260 px floor and a
half-window cap, remembered under `VA.NAV_WIDTH_KEY`. The two-template rail is
explained and removed: `appendPickNote`'s per-end link buttons, placed after
Pick, squeezed the name off the mirrored row. A refused Pick's reason is now
the row's state line.

## Handoff decisions vs. the diff

| # | decision | shipped |
|---|---|---|
| 1 | one row template, no Go-there prompt | yes; DOM-shape browser check; `buildSweepBack` offers the way back |
| 2 | resizable rail, 260 min, half max, persisted | yes, on the shell's nav (the rail Jeff sees embedded). Half the *window*, not the pane: the nav is a window-level column, so this is right |
| 3 | isolate: opaque part, ghost/hide others, frame, restore | yes |
| 4 | selection filter = the part; "not on <part>" | yes; the ray sees only the filter set, and an unfiltered second ray names the other part |
| 5 | hover pre-select, crosshair, class + radius line, nothing while orbiting | yes (`ev.buttons` drops it). The class words are `AA.SURFACE_WORDS` ("ball-shaped"), a deliberate one-vocabulary choice that is stated in the lesson |
| 6 | click confirms: bound tint, state line, toast, disarm; failure keeps pre-select | yes; the failure text is raw (finding 3) |
| 7 | gestures named; second click on the bound face offers unbind "writing the existing retraction" | **not built, and correctly.** `tolerance_stack/feature_identity.py` `VERDICTS = ("bound", "owner_not_in_set", "proposed", "rejected")` has no retraction, so the handoff's premise was wrong. A second click writes nothing and says so. Filed by the author (`ISSUE_20261029_an_armed_pick_cannot_unbind_…`, `audience: strategy`). The gesture table is in `docs/ANNOTATION_SURFACE.md` |

Scope fences held. `git diff` touches no proposals read/write code, no
standalone-page chrome and no DAG/grid code. Edge features and contributors
still jump to bind mode, because an edge has two ends and no default. That is
filed (`ISSUE_20261029_an_edge_feature_and_a_contributor_pick_…`).

**Tolerance-stack mandatory checks 1–7: not applicable.** The diff changes no
stack, topology, hardware, material or spec-library data. There are no element
values, signs, LMC/MMC, RSS or traced ratio to audit.

## Merge, and the conflicts it produced

`integration` had moved from `d5e53778` to `8e2a12a5` underneath the branch.
`git merge handoff/…` into `review/…` conflicted in two files:

- **`scripts/guard_enumeration.mjs`, the browser pin.** Integration had
  733/700/`8a6219644d8d` (+6 from `the_wheel_the_column_and_fit_behave`). The
  handoff had 749/716/`45122ce2981f` (+22 on the old 727 base). I resolved it
  by re-measuring with `node scripts/guard_enumeration.mjs`: **755/722,
  digest `7d3aa0a125b0`**. The counts are exactly additive (733 + 22), so
  nothing was swapped. I kept the handoff's comment and added "re-measured at
  the review merge".
- **The default-tier budget issue**: two appended measurement sections. I kept
  both, integration's first.

The marker grep was clean. Merge commit: `08eb5d23`.

## Verification

Every run below was on the merged tree. `[real]` tiers were armed through a
scratch root built **from this tree**:
`data/scratch/review_face_pick`, with topology, viewer, crops and kinematic
projections built with `--data-root`, plus copies of the inbox, meshes and
docs. The freshness line paired every projection with `08eb5d230e9b`.

**Tactical record.** It ran the full suite: `2 failed, 1682 passed`. Both
failures were explained: the worktree-only viewer `[real]` skip, and a
browser-runner flake that passed on rerun. It also ran the browser tier
(35/36, with an issue for the one red) and witnesses `--changed-since` (58/60,
both misses fixed and re-checked). The record is consistent with the diff, so
I gave it the benefit of the doubt and did not re-run the full suite before
the merge.

**Pre-merge risky subset** (overlay rows: `apps/annotate/`, `apps/viewer/`,
CSS, guards and witnesses, prose):

- `pytest -q` over `test_annotate_js_suite`, `test_app_type_scale`,
  `test_architecture_inventory`, `test_claims_registry`,
  `test_feature_identity`, `test_js_python_vocabulary`,
  `test_js_vocabulary_is_generated`, `test_mutation_witnesses`,
  `test_part_mesh_aliases`, `test_provenance`, `test_tolerance_stack`,
  `test_viewer_deep_link_contract` and `test_viewer_readme_doc_facts`:
  **410 passed**. After my inline edits, the doc and annotate subset gave
  **211 passed**.
- `node apps/annotate/run_tests.cjs`: **258/258**, no SKIP lines. Re-run
  after my edits: 258/258.
- `node apps/viewer/run_tests.cjs --repo <scratch>`: **622/625**. The three
  reds are integration's, not this diff's (finding 2).
- `node scripts/run_viewer_browser_tests.mjs --repo <scratch>`, full tier:
  **34/36** in 516 s.
  - "annotate armed pick": 17/17.
  - "topology http": 216/216.
  - "annotate sweep rail": 20/20.
  - "no nav click wedges the page": 16/16.
  - Two load-sensitive reds: "3D pane follows the selection" 31/32 (`[real]
    ...and leaving it takes the light down`), and "crop lightbox" ABORTED
    (focus check, then a 10 s wait on the lightbox opening). Both were green
    alone with `--only`: **32/32, 20/20**. The lightbox check calls `.focus()`
    directly, so the new tab-stop divider is not in its path. Appended to the
    author's `ISSUE_20261029_four_3d_pane_nav_gesture_checks_…`.
- `node scripts/run_mutation_witness_tests.mjs --repo <scratch>
  --changed-since integration`: **59/63 witnessed, 63/63 reached** in 25m38s
  (33m15s wall including the slot queue; OVER the merge budget by 3m15s,
  appended to the existing issue).
  - Every browser and annotate entry was WITNESSED, all 22 new browser specs
    among them.
  - The four NOT WITNESSED are `fast` entries whose tier was red before any
    mutation, because of integration's fixture drift. The main checkout's
    fast tier is red at baseline too (its projection is from trunk), so the
    runner cannot certify them anywhere today. **I witnessed all four by
    hand**: apply the spec's find/replace, run the fast tier, read the named
    check, restore. Each went PASS → FAIL, and the tree was clean after.
    - `a mirrored row with a pressed button … Esc cancels`
    - `the nav widens to the RIGHT …`
    - `the nav width is remembered under its own key …`
    - `this page's own markup prints no repo path …`

**Post-merge full suite:** see "Post-merge record" below.

## Findings

### Should-fix (filed; not blocking)

1. **The armed part is the node's `parts[0]`, justified by a count that
   doesn't re-derive, and a miss can't be recovered from the rail.**
   `apps/annotate/sweep.js` `AA.pickEndPartIds`. The lesson said "all 35
   two-part nodes are named `<first part's face> against <second part>`". The
   topology has **34** two-part nodes, and **20** of them are "against" names.
   Jeff's own bore is one of the 14 that are not, and happens to be right.
   For the other 14 the order is unverified; for example, "gas-spring bushing
   in the pitch plate" lists `[pitch_plate, gas_spring]`. If the face is on
   the second part, the filter makes it unpickable and nothing on the rail
   switches parts.
   → `docs/issues/ISSUE_20261029_an_armed_pick_assumes_the_face_is_on_the_nodes_first_named_part.md`
   (`audience: strategy`; recommendation: declare the face's part on the
   topology, with a pairing test).
   I corrected the false universal inline in the `sweep.js` comment, the
   `docs/ANNOTATION_SURFACE.md` bullet, and the lesson (a correction
   blockquote). Behaviour is unchanged.

2. **The viewer `[real]` tier is red on `integration`, and this diff did not
   cause it.** `display_name` / `naming_note` landed in the stack and topology
   files with the_rebuild_says_…_named_by_its_drawing, whose review ran the
   tier skipped. Three reds: two fixture-shape pairings and the merged
   component-cell name check. None reads a file this diff touches. The next
   batch merge will hit them.
   → `docs/issues/ISSUE_20261029_display_name_reached_the_projections_but_not_the_viewer_fixtures_so_the_real_tier_is_red_on_integration.md`
   (`priority: high`). This is a second sighting of an overlay entry, now
   annotated there.

### Lower

3. **Design (named rule: a raw diagnostic in user copy).** `armedClick` shows
   `"Bind failed: " + err.message`, which is the storage adapter's own text,
   filenames included.
   → `ISSUE_20261029_design_an_armed_picks_failed_bind_prints_the_storage_errors_own_text.md`
   (`med`, `area: design`, non-blocking).
4. **The DoD's "class and radius in the state line" for the real bore is
   witnessed nowhere end to end.** The `[real]` reproduction checks arming
   only. The mock hover check accepts a bare `face 1`. There is also an
   untested race: `ensureFaceClasses` is not awaited, and `onPreselect` does
   not refresh when the classes arrive.
   → `ISSUE_20261029_no_check_hovers_the_real_bore_so_the_dods_class_and_radius_line_is_unwitnessed.md`
   (`low`).

### Fixed inline

All three are comment, doc or lesson text only. No behaviour changed and no
test was needed.

- `apps/annotate/app.js` (sweep-mode header) said "THIS MODE WRITES NOTHING …
  `storage.writeFeatureIdentityEvent` is not reachable from anything below".
  That is false now that `armedClick` writes. It now names the one write and
  its as-modelled-pose fence.
- `apps/annotate/sweep.js` header said "THIS APP WRITES NOTHING IN SWEEP
  MODE". It now says "nothing in this file writes", which is true, and points
  at `armedClick`.
- The part-order universal claim (finding 1), in three places.

### Nits (no action)

- `AA.ARM_OTHERS_MODES[1]` and `AA.ARMED_CLICK_ACTIONS[n]` are compared by
  index in `app.js`. That is correct, but it reads worse than the names would.
- A re-pick supersedes only when the end has exactly one standing binding.
  With two, it adds a third. This is documented in the gesture table, but it
  differs from bind mode, which supersedes the explicitly chosen target.

## Universal checks, briefly

- **Data pollution.** I took a manifest of the main checkout's `data/`
  (excluding `data/scratch/`) before the post-merge suite, then diffed it
  after (see the post-merge record). The armed-pick bind check writes only to
  the mock's captured writes, and the `[real]` bore check never clicks.
- **No operator hoop.** A refused click stays on the agent's own surface.
- **New guards observed failing.** All 22 new browser specs and 3 annotate
  specs were witnessed by the runner. The 3 new fast specs plus the
  re-pointed one were witnessed by hand, as above.
- **Hand restatement.** The census pin was re-measured, not added by hand.
  The new vocabularies (`ARMED_PICK_WORDS`, `ARM_OTHERS_MODES`,
  `ARMED_CLICK_ACTIONS`) are JS-only, with no Python owner, so nothing needs
  generating.
- **Lesson arithmetic.** One count was wrong (finding 1), corrected inline.
  The ghost-opacity and template-cause narratives match the code: the old
  `appendPickNote` is in the diff's minus side.

## Note for the next reviewer

Fix finding 2's fixtures before trusting any armed viewer fast tier on
`integration`. Until then, every `fast` witness reached by a diff reports NOT
WITNESSED for a reason unrelated to that diff.

## Post-merge record

- `PYTHONIOENCODING=utf-8 C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider --durations=15`,
  in the review worktree on the merged tree: **1 failed, 1685 passed, 1
  skipped, 2 deselected in 333 s** (serial; `suite-time record`: inside
  budget).
  - The one failure is `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`:
    "reported 1 tier(s) SKIPPED". That is the documented worktree red (no
    projection in a worktree). The same tier was run armed through the
    scratch root above (622/625, with the 3 reds being finding 2).
  - Contention headers: tolstack's conftest prints neither
    `concurrent pytest processes at start` nor `full-suite lock`. Two browser
    runs from other sessions held the slot during this review.
- **`data/` unchanged.** The before/after manifest of the main checkout's
  `data/` (479 files, excluding `data/scratch/`: path, size, mtime) is
  identical.
- The scratch root `data/scratch/review_face_pick/` and the worktree's
  `node_modules` junction are removed at the end of this review.
- **Integration moved again before landing** (`8e2a12a5` → `e6898934`,
  `viewer_browser_checks_wait_on_settled_state`). I merged it into the review
  branch. Its one conflict was the default-tier budget issue's appended
  measurements, and I kept all of them. The census was unchanged at
  755/722/`7d3aa0a125b0`. Re-run on that tree:
  - `pytest -q` over `test_mutation_witnesses`, `test_annotate_js_suite` and
    `test_claims_registry`: **85 passed**.
  - `node apps/annotate/run_tests.cjs`: **258/258**.
  - The browser suite "annotate armed pick": **17/17**.
