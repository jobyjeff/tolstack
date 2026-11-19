---
type: review
handoff: docs/sessions/active/HANDOFF_20261118_the_pitch_plate_is_an_assembly_with_its_bushings.md
reviewer: agent
date: 2026-11-19
verdict: APPROVE (round 3)
blockers: 0
---

# Review — the_pitch_plate_is_an_assembly_with_its_bushings

Branch `handoff/the_pitch_plate_is_an_assembly_with_its_bushings` (tip
`850c8b93`) was cut from the current `integration` (`433619e5`). It is
fast-forwarded into `review/…` here and **not** landed on `integration`.

The modelling work is sound and carefully sourced. One deliverable is missing:
the question for Jeff is not on his review page, and the page does not show
the faces. A small false statement in one edge note goes back with it.

## What I verified

- **The drawing citation (mandatory check 1).** I rendered
  `data/inbox/drawings/215735-A.pdf` sheet 2 myself. All four bore callouts
  match the notes word for word:
  - pitch link side: 5X Ø7.950 +0.015/0.000, ⌖ Ø0.2 A B C / Ø0.1 A, datum G, 5X individually; and 5X Ø8.520 ±0.008, ⌖ Ø0.03Ⓜ GⓂ;
  - tangential link side: 3X Ø7.950 +0.015/0.000, ⌖ Ø0.2 A B, datum C; and 3X Ø8.520 ±0.008, ⌖ Ø0.03Ⓜ FⓂ.
- **Nothing is invented.** No new edge carries a `dimension`. Each bushing
  band is a recorded gap: NAS77 is in `data/inbox/specs/` but has not been
  parsed, and there is no 214820 drawing. The gaps are filed in
  `ISSUE_20261118_the_pitch_plate_bushing_fits_…`. The mesh diameters are
  stated as measurements and never as values.
- **Mandatory checks 2–7 do not apply.** This is a topology with no stack
  elements, so there is no sign, LMC/MMC or RSS to check. The traced ratio is
  0 element instances. Of the non-element values, 4 bore bands are traced to
  215735-A, and 4 bushing outside-diameter bands plus 4 wall bands are gaps.
- **Bindings.** The real log has 101 files, the same as before. I compared
  `bindings.json` built from this tree with the one built from integration's
  tree off the same log: **48 = 48 features, 0 differ**. The lesson's claim
  holds.
- **Counts.** The model gains 5 parts, 12 nodes, 14 edges (6 structural and
  8 gap) and 1 new assembly. That agrees with `MODEL_V2_COUNTS`, the lesson,
  and "4 of 17 bushings" (8 + 1 NAS77, 8 214820).
- **The map.** The shots show the assembly outline holding its members and no
  route through a box. The new `rowDetour` and the flank choice read
  correctly. The new fast guard has a spec, and the re-pointed column spec
  passed in the tactical run.

## Tests

- **Tactical record.** The default tier gave 2371 passed and 2 failed: the
  expected worktree `[real]` red, plus an anchor rot the author fixed and then
  re-ran **one file** for. Benefit of the doubt given. The next round should
  record one clean default-tier run.
- **Pre-merge risky subset, run by me in this worktree.** 21 files: topology,
  projection, viewer projection, tolerance stack, model view, map, mutation
  witnesses, both vocabulary tests, architecture inventory, interface contact,
  feature geometry, feature identity, part mesh aliases, claims registry,
  provenance, the readme doc facts, deep-link, topology prose/tags/conversions.
  Result: **1667 passed**.
- **Both fast node tiers**, against a scratch root built from this tree
  (`data/scratch/rv_pitch_plate_1119`, all eight builders with `--data-root`,
  exit 0):
  - viewer **605/605**, `[real]` armed;
  - annotate **331/331**, with no SKIP lines.
- **Not run, because the verdict is REQUEST CHANGES:** the post-merge default
  tier, the whole browser tier and the witness gate. They are owed by the
  next round's review.

## Findings

### Blocker

1. **Deliverable 4: the question is not on Jeff's review page, and the faces
   are not shown.**
   - **What the handoff asked for:** "Which part `pitch_plate_link_attach_bore`
     itself should finally sit on … is a question for that page too, with the
     faces of each shown." The page is
     `docs/sessions/lessons/REVIEW_20261117_the_portrait_map_and_the_joints.md`.
     `dispatch/docs/strategy/HANDOFF_20261117_strategy.md` names it Jeff's
     review point and says "expect some on the review page". It already has a
     "questions … left for you" table, with a shot per question.
   - **What was done:** the question went into
     `ISSUE_20261118_which_part_the_pitch_plates_attachment_bores_sit_on.md`
     (`audience: strategy`). That is a good issue, but it holds face ids only:
     no shot of option b's faces or option c's, and no row on the page.
   - **Fix:** add a row to that page's questions table for the pitch link,
     and one for the tangential link if it is worth asking separately. Give
     it a shot of each option's faces lit in the 3D pane: the plate's 7.950
     bore 1385/1386, and the bushing bore 2/3 (215177 mesh 1509/1510). Also
     show where Jeff's disagreeing binds sit, on 1380/1381. Keep the issue
     and link it from the row.

### Should-fix (back to the author with the blocker)

2. **`tan_link_flanged_bushing_bore_to_attach_bore`'s note states a binding
   that does not exist.**
   - **Where:** `docs/topologies/topology_vpa_end_stop_v2.json`, that edge's
     note.
   - **What is wrong:** it says `pitch_plate_tan_link_attach_bore` "keeps …
     Jeff's binding (faces on the plate's straight bushing bore and on this
     bushing's bore)". No event in the log names that feature (I grepped the
     101 files). The lesson's own table says "no standing bind". The sentence
     was copied from the `pitch_link_` twin, and the note shows in the pane.
   - **Fix:** drop the binding clause from the tan link note.

### Nits

3. **v1 is touched through the alias table.**
   - **What changed:** the new `flanged_bushing_nas77a3_015a` alias row is
     keyed by an id that v1 also uses. v1's builder line went from 26/35 to
     **27/35** parts with an installed mesh, so v1's flanged bushing is now
     drawn at all eight NAS77A3 instances. The handoff fences v1 off.
   - **Why it is only a nit:** the mapping is physically right, Jeff has
     called v1 abandoned, and the alias evidence string half-says it.
   - **Fix:** say so in the lesson.
4. **`pitch_plate_tan_link_flanged_bushing_bore`'s note leaves out datum F.**
   The drawing puts "F 3X INDIVIDUALLY" on that bore, and the straight bore's
   ⌖ Ø0.03Ⓜ FⓂ refers to it. The position edge's note does say "against the
   flanged bore as its datum", so nothing reads wrong, but the quote is
   incomplete.

### Design (filed, non-blocking)

- `ISSUE_20261119_design_the_maps_flanged_bushing_boxes_carry_no_part_number.md`:
  the flanged bushing boxes have no number, and one long diagonal bolt route
  crosses the district.

## Note for the next reviewer

- **Reuse the scratch root.** `C:\workspace\tolstack\data\scratch\rv_pitch_plate_1119`
  has `docs/` and junctions to `venv-win` and `node_modules`. Rebuild it from
  the reworked tree with the eight builders and `--data-root`.
- **Run everything owed after the merge:** the default tier, the whole
  browser tier and `--changed-since integration --budget-min 10`.
- **Overlay.** I added two entries under "Recurring bugs": twin notes copied
  across attachments, and v2 alias rows that reach v1.

## Re-run 2026-11-19 — round 2

Round 1 was REQUEST CHANGES with 1 blocker, 1 should-fix and 2 nits. The
fixes arrived as `301bfa41` and `ee6c5861`, and **all four are closed**:

- **Blocker (closed):** Jeff's review page has new rows Q3 and Q4, each
  linking the issue. The six `q_*.png` shots are new. I read the two for the
  pitch link: (b) lights the plate's larger Ø7.950 bore, (c) the bushing's
  smaller Ø4.826 bore.
- **Should-fix (closed):** the tangential-link note no longer claims a
  binding.
- **Nits (closed):** the datum F quote is added, and the lesson now states
  the v1 alias reach.

I merged `ee6c5861` into this branch (no conflict, no marker lines) and ran
the post-merge tiers. **They found four regressions that no earlier run
covered**: the tactical record says "no browser suite was added or changed,
so none was run" on both rounds. This overlay's "a stack-data change is a
viewer-test change" entry exists for exactly this case. The model gained 5
parts and 12 features, and the `[real]` browser suites read the model.

### Post-merge tiers (merged tree `6108d27d`)

- **Projections:** all eight builders, `--data-root
  data/scratch/rv_pitch_plate_1119/data`, exit 0. The real log still has 101
  files, and the main checkout is clean.
- **Default tier, in this worktree:**
  `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider`
  gave **2372 passed, 1 failed, 1 skipped, 4 deselected in 446 s**. It is
  recorded on the ledger (inside budget). The one failure is the expected
  worktree `test_viewer_js_suite_is_green`. This repo's conftest prints no
  `concurrent pytest processes` or `full-suite lock` header lines.
- **Fast tiers, through `--repo`:** viewer **605/605**, annotate **331/331**.
- **Whole browser tier,** `node scripts/run_viewer_browser_tests.mjs --repo
  <scratch>`: **41/46**. Each red suite was re-run `--only` from a
  `git archive integration` export against
  `data/scratch/rv_opposite_1118`, which was built from `586e6d93`, a tree
  identical to integration in `apps/`, `scripts/`, `tolerance_stack/` and
  `docs/topologies/`:

| suite | merged tree | integration | verdict |
|---|---|---|---|
| the model drawn alone | 19/22 | 22/22 | **regression** |
| a pattern is bound as its like faces | 10/11 | 11/11 | **regression** |
| the DAG zoom, Fit and the grid header | 34/35 (twice) | 35/35 | **regression** |
| 3D pane follows the selection | 30/31 (twice) | 31/31 | **regression** |
| the map | 29/30 | 29/30 | pre-existing, already filed as `ISSUE_20261118_the_map_pin_hover_real_check_is_red_on_integration.md` (on integration) |

- **Witness gate:** not run, because the verdict is REQUEST CHANGES again.

### Blocker (round 2)

1. **Four `[real]` browser suites go red on the new structure.** These are
   deliverable 6: "the 3D pane's part list … read the new structure". What
   the runs log:
   - **The model drawn alone.** "at rest: **18 meshes drawn for 20 parts**";
     integration draws 15 for 15. The two parts that share the NAS77A3 mesh,
     and the two that share 214820, appear to draw once each, even though
     each declares its own `occurrence`. Then, with the P2 run loaded: "parts
     of the model's bodies not posed with their body:
     `pitch_plate/flanged_bushing_nas77a3_015a`,
     `pitch_plate/pitch_plate_215735_001`,
     `pitch_plate/flanged_bushing_nas77a3_015a_tan_link`,
     `pitch_plate/straight_bushing_214820_002`". So in the sweep these four
     stand at their assembly position instead of riding the pitch plate.
   - **A pattern is bound….** "filter count 46; feature rows not bound under
     Parts **38**". The 8 rows missing are the same number as the features on
     215177's three children (the plate's 4 bores, and 2 on each flanged
     bushing). So either the tree does not show a nested child's features
     under Parts, or the count includes rows the tree never draws.
   - **The DAG zoom….** "a click on a pin, a jumper, a part's name or a grid
     row never moves the map: its view stays exactly as it was" is red.
   - **3D pane follows the selection.** "…and leaving it takes the light
     down" is red.

   **Fix:** decide, for each one, whether the product or the check is wrong
   for an assembly whose children share a mesh. A check that only assumed one
   mesh per part may be updated, saying why. Then run the browser runner
   `--only` for each of the four suites, and record those runs.

The rest of round 1's verification stands: the drawing re-read, the bindings
48 = 48, and the counts.

## Re-run 2026-11-19 — round 3

Round 2 was REQUEST CHANGES with 1 blocker: four `[real]` browser suites red
on the merged tree. The fixes arrived as `0717cb0d`, `06cbfaa0`, `2560a437`,
`51086501` and `7927d383`. **The blocker is closed**, and the verdict is
APPROVE.

### What changed, and whether it is right

- **The model drawn alone: product and check, both fixed.**
  - `AA.occurrencePins` now keeps a list of occurrences per mesh rather than
    one. `AA.pinnedOccurrences` and the sweep's candidate filter read that
    list. Before, the last part read won, so the second NAS77A3 bushing and
    the second 214820-002 bushing were drawn nowhere. That was a real product
    defect.
  - I checked every other consumer of the pin table. `sweep.js:1393` tests
    only `sha in occ.pinned`, and `occurrencesFor` passes the table through,
    so both are unaffected by the change of value type. `[].concat(pins[sha])`
    still takes a bare string, which the fast check's `lost` case uses.
  - A rider part that declares an occurrence now rides only there. This
    stops `bushing_214820_002` being refused as a tie.
  - The check now counts meshes rather than parts, and requires each shared
    mesh at every declared place. That is the right claim, because two parts
    on one mesh are one mesh drawn twice. The posed check now accepts a
    `carried` row by its mesh and declared occurrence, which matches how a
    part recorded inside a placed occurrence is drawn.
  - A fast check pins the two-parts-one-mesh case.
- **The DAG zoom: product, fixed.** `VA.mapBringIntoView` used to pan a box
  that was wholly on screen but inside the 24 px pad. At v2's fit, k = 0.25,
  the drawing's margin is thinner than that pad, so a click on an edge box
  moved the map. It now pans only an axis the rect is off screen on, and the
  pad is how far it brings the rect in.
  - Two fast cases pin it.
  - The witness spec for "brought into view" (`…bd77c7ea`) anchors on the
    caller, which did not change. The author applied that mutation by hand,
    and it still reddens.
  - `DAG_TOPOLOGY.md` says so.
- **A pattern is bound…: not reproduced by the author; green here.** The
  author added only a diagnostic, which prints the twisties and feature rows
  when the counts disagree. It is 11/11 in my whole-tier run below, so I
  accept that round 2's 10/11 was the tree-opening timing.
- **3D pane follows the selection: not reproduced by the author; still
  intermittent here.** See below. It is a filed, deferred flake, not this
  branch's defect.
- **Docs.** The `ANNOTATION_SURFACE.md` sentence is accurate: a shared mesh
  is drawn at both places, and each part rides at its own.

### Post-merge tiers (merged `7ae3124d`, tree `009b7119`)

- **Merge:** `7927d383` merged with no conflict, and the tree has no conflict
  markers. `integration` is still `433619e5`, an ancestor of the handoff tip.
- **Projections:** all eight builders, `--data-root
  data/scratch/rv_pitch_plate_1119/data`, from the merged tree, after
  refreshing that root's `docs/` from the merged tree. Exit 0. The real log
  still has 101 files.
- **Default tier, in this worktree:** **2372 passed, 1 failed, 1 skipped, 4
  deselected in 450 s.** The one failure is the expected worktree
  `test_viewer_js_suite_is_green`. **Not on the ledger:** my hand-appended
  row was refused by this session's permission classifier, so it is left to
  the operator.
- **Fast tiers, through `--repo`:** viewer **605/605**, annotate **331/331**.
- **Whole browser tier:** **44/46 in 1823 s.** The runner's own ledger row
  is `merge` at 2026-11-19T13:20:59Z, tree `009b7119`. It is 23 s over the
  1800 s budget; the round-2 run was 1829 s.
  - The model drawn alone **22/22**.
  - A pattern is bound **11/11**.
  - The DAG zoom **35/35**.
  - The two reds:
    - **The map 29/30**: the pin-hover check, which is red on integration and
      filed as
      `ISSUE_20261118_the_map_pin_hover_real_check_is_red_on_integration.md`.
    - **3D pane 30/31**: "…and leaving it takes the light down".
- **The 3D pane suite on its own.** Seven `--only` runs on the merged tree
  plus the two whole tiers make 9 valid runs; a tenth failed at boot when the
  pane never opened.
  - "…leaving it takes the light down" was red 5 times in 9, and "resting on
    a body row…" was red once.
  - The `integration` export, run 3 times against `rv_opposite_1118`, was
    green 3 of 3.
  - The author ran it green 4 of 4 on their own root.
  - Both sub-checks are filed and deferred:
    `ISSUE_20261029_three_d_pane_nav_body_checks_fail_in_a_loaded_full_run.md`
    names this exact sub-check, and
    `ISSUE_20261105_a_nav_scene_row_rebuilt_under_a_resting_pointer_drops_the_scenes_hover_light.md`
    is its product half.
  - The branch changes nothing on that code path. The plausible link is that
    v1's kinematic scene now draws the NAS77A3 bushing at eight more places,
    which gives the hover more rebuild time to lose. I put a temporary
    diagnostic on the check, which I have reverted. It never printed, because
    the sub-check passed on all four runs that carried it.
  - I appended the counts to the 10-29 issue as a sighting. A higher flake
    rate on a filed flake is not a blocker.
- **Witness gate,** `--changed-since integration --budget-min 10 --repo
  <scratch>`: **14/14 witnessed, 14/25 reached in 8m13s, 11 left to the sweep
  (budget), exit 0.** That is a pass.

### Verdict

**APPROVE (round 3).** Every finding from rounds 1 and 2 is closed. The
branch resolves no open issue. Its five issue changes are four new ones and a
sighting on a deferred one. No should-fix is left unfixed.

### Inline edits in this round

- Reviewer artifacts only: this report, and the sighting on
  `ISSUE_20261029_three_d_pane_nav_body_checks_fail_in_a_loaded_full_run.md`.
- I did not fix anything in the author's work.
- **Re-check after writing this report:** I ran the 10 test files that read
  `docs/issues/` or the reviews: **1178 passed, 1 failed**. The failure is
  `test_mutation_witness_shadow_concurrency.py::test_two_different_repo_roots_both_still_succeed`.
  Run on its own, it fails on `WinError 3` while copying long-named lesson
  shots from earlier handoffs into a pytest temp directory. That is the
  Windows path limit, made worse by this worktree's long path. None of those
  shots is this branch's, and the test passed in the full default tier above.
  So it is environmental, not a finding.
