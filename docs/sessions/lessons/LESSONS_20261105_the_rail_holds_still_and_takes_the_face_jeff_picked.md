# Lessons 2026-11-05 — the_rail_holds_still_and_takes_the_face_jeff_picked

Source: Jeff's note `20261105T164140_sm8hkc`, his second walk of the sweep rail
in the shell. Reproduced first on the real projection, in the shell, with
`tests/debug_rail_walk.mjs`. It serves this tree's `apps/` over the main
checkout's `data/` and boots the annotator on the memory adapter, so a Take
writes to memory, never to a folder.

## What each of Jeff's sentences turned out to be

| Jeff | what it was | cause | fix |
|---|---|---|---|
| "plate slide - slide base, the wrong part is selected (the hub)" | **stale artifact** | the study boots P2 `-20261016-235852`, whose `plate_slide` features still name `hub_spindle_bore_axis` and `pitch_plate_spindle_bore_axis` (linkage's `JOINT_FEATURES` before its 11-05 handoff) | linkage republished as `-20261105-204957`. I copied S/P1/P2 byte for byte into `data/inbox/linkage-sweeps/`. The study still points at the old run: `docs/issues/ISSUE_20261105_the_kinematic_study_still_folds_the_p2_run_whose_slide_joins_the_hub.md` |
| "actuator driver base: what does this even mean?" | **bug (wording)** | `AA.sweepJointRowWords` printed `<joint name> · <type> · <body> ↔ <body>`. With both ends on `base` and `pitch_plate` it read as a phrase | `<part> <joint word> <part>`, from `AA.sweepJointEndParts` |
| "the viewport snapped to the wrong pitch link" | **bug** | `anchoredOccurrences` (`app.js`) searched only `tree.bodies`. The pitch link is a `links[]` subject, so no body listed it, and the frame fell back to every occurrence of the mesh (five blades) | links are subjects (`AA.sweepTreeSubjects`), so the arm frames the occurrence the run poses. Witnessed by the browser check |
| "as soon as I clicked take, the whole menu jumped" | **bug** | `renderSceneSlot` (`apps/viewer/topology_app.js`) called `revealSceneRow` whenever the slot *was empty before the render*. Every viewer `render()` runs `renderNav()`, which rebuilds the nav with a fresh, empty slot, so any click that touched the page's state re-scrolled the nav to the study row | `sceneRevealPending`: reveal once per tree *arrival* (a tree after none) |
| "the lower spherical surface disappeared and was replaced with a 'pitch link length…', pre selected (re-pick)" | **bug + documented behaviour** | the joint listed three rows: two ends and the edge feature `pitch_link_length`. Once one end was bound, the edge row went `bound` with a **Re-pick** (a `goto`, leaving sweep mode). With the jump on top, the row under Jeff's eye was that one. The bind form's "remaining end preselected" (`AA.planBindChoices`, `docs/ANNOTATION_SURFACE.md` "Binding a face") is documented behaviour, and it is what he met if he pressed that Re-pick | `AA.sweepJointRowFeatures` drops an edge row whose two ends are already rows of the joint. After a Take, Accept or armed click, the partner end's list opens, selected (`nextEndToPick` → `inspect feature`) |
| "random lines for 213862-002 and MS14101-3 under the pitch link length" | **bug** | `renderSweepRail` appended `treePartRows(joint.parts)` under a link's joint | the link is a body row under Bodies. Under a joint, only its ends |
| "the second joint changed formatting (turned orange)" | **bug** | `AA.sweepFeatureState` returned `unbound` for an end whose *partner* was bound, even when the end had its own open proposal. `unbound` is not in `AA.QUIET_BINDING_STATES`, so the shell draws the row with `data-attention` in `var(--inferred)`, which is the orange | that end stays `proposed` |
| "the menu jumps around whenever you interact/expand elements" | **same bug as the jump** | the `revealSceneRow` cause, above | — |

What the walk measured after the fixes: expanding the tan-link and pitch-link
joints left `navtree.scrollTop` at 759. After the Take
it was still 759, the upper end was `bound`, and the lower end was `proposed`
with its list open (face 104, the agent's proposal).

## Decisions not in the handoff

- **A link's words name the parts it joins, not the link.** The pitch link's
  row reads `215177-001 ball-ended link 215071-001` (pitch plate and pitch arm),
  not `213862-002`. The link is listed under Bodies, and its ends' nodes sit on
  the link itself, so the rule looks one topology edge across
  (`pitch_plate_link_joint`, `pitch_arm_link_joint`) for the part on each end's
  body.
- **Deliverable 5's viewer half is filed, not built.** The grid is fenced by
  this same handoff. The DAG's joints are topology joint *edges*, not sweep
  joints, and the viewer has no part-number source:
  `docs/issues/ISSUE_20261105_the_dag_joint_hover_and_grid_joint_row_do_not_name_their_two_parts.md`.
- **The study was not re-pointed** at the 11-05 run. That move belongs with
  `SWEPT_JOINT_EDGES` and the `[real]` pins (the issue above names them).
  Deliverable 6's row is shown on `?sweep=vpa-pitch-p2-20261105-204957` instead.
- **The 10-29 edge/contributor Pick issue**: no live joint lists an edge row
  any more. The contributor half is re-filed:
  `docs/issues/ISSUE_20261105_a_contributor_rows_pick_still_leaves_sweep_mode_for_bind_mode.md`.

## Found on the way

- `docs/issues/ISSUE_20261105_every_annotator_session_numbers_its_event_files_from_0001.md`
  (high). Jeff's four bindings from today are `0001_…`–`0004_…` in the inbox
  beside `0001_…proposed`, because `AA.nextEventFilename` reads event ids as if
  they were filenames.
- A worktree with no `node_modules` link cannot run the browser tier. Other
  worktrees carry a symlink to the main checkout's, and `.gitignore`'s
  `node_modules/` (a directory pattern) does not hide a symlink, so it shows as
  `??`. I linked it for the runs and removed it before handing back.

## Shots

In `shots/the_rail_holds_still_and_takes_the_face_jeff_picked/`:

- `rail_walk.png` and `rail_walk.json`: the DoD filmstrip, filmed in real time
  (`node scripts/filmstrip.mjs --scenario tests/debug_rail_walk_scenario.mjs --real-time
  --frames 8 --interval 2500 --columns 4 --width 2800 --viewport 1200x850`).
  Frames: the tan-link joint expanded (#2), the upper end's list open (#3–#4),
  the upper end bound and the lower end's list open and selected (#5), both
  ends bound (#6–#8). The probe reads `navtree.scrollTop` = 836 in every frame.
  Frames land about 5 s apart under load, not at the 2.5 s asked for, because
  screenshots are slow.
- `01…04_*.png`: the walk on the study's run (`-20261016-235852`), after the fixes.
- `p2_20261105/`: the same walk on `?sweep=vpa-pitch-p2-20261105-204957`. The
  plate slide's row reads `213668-002 slide 214700-002` (deliverable 6). On
  this run the pane also says the study's contributors are left out, because
  the study folded the other run (the re-point issue).

## Sites this change reaches, and does not

- Reached: the sweep rail in the annotator and the shell's nav mirror of it
  (one tree, so both). The armed-pick framing and the armed click's
  aftermath, which now go through `answeredAtEnd` like Take and Accept.
- Not reached: bind mode's element rows. They list edges, not joints, and
  their two-end preselect is the documented `AA.planBindChoices` rule. The DAG
  hover and grid row words: filed. Contributor-row Pick: filed.

## Verification record

- `node apps/annotate/run_tests.cjs`: 288/288 (worktree; its `[real]` tier
  read the main checkout's sweeps).
- `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q` (worktree),
  final run: 1727 passed, 1 skipped, 1 failed in 517 s. The failure is
  `tests/test_viewer_js_suite.py`, the worktree's deliberate red (no
  projection here). With `--repo C:/workspace/tolstack` the node-fs tier still
  refuses, because the shared projections were built from master `eb3059ff`,
  which this branch (cut from integration) does not contain. I did not
  overwrite them, so the viewer's node-fs `[real]` tier is **not run** here.
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`
  (worktree, `node_modules` linked): 40/42 suites, both failures mine:
  the nav's body count (5 now, links included) and the hover of the removed
  length row. After re-pointing them, both suites re-ran green alone (32/32,
  20/20), and the new suite passed 7/7. Wall time 3144 s including about 27 min
  queued for the slot, so the run itself was about 1494 s. I recorded 1494 s as
  the merge tier (inside budget).
- `node apps/annotate/run_browser_check.mjs`: 96/99. Two failures are the
  deferred `ISSUE_20261028_annotate_browser_check_mock_anchor_checks_are_red_on_integration.md`.
  The third is the reduced-motion speed check, index 0 at both speeds in a
  500 ms window under load, filed as
  `ISSUE_20261105_the_annotate_speed_control_check_reads_index_0_at_both_speeds_under_load.md`.
- `node scripts/run_mutation_witness_tests.mjs --changed-since integration --repo C:/workspace/tolstack`:
  32/34 witnessed, 2 left to the sweep (budget). The two NOT WITNESSED had a red
  baseline on another sub-check ("clicking a contributor row in the nav
  selects it in the scene"), which was green in both of my runs of that suite.
  Re-run alone with `--only`: see the re-run note below.
- Witness re-anchors (the code they mutate moved in this change): the node
  state rule (`a0a3ee06`), the armed click's bound line (`19661b4f`) and toast
  (`5f7cb274`), the Bodies loop (`47d32ced`), and re-pick onto the
  contributor's Pick (`3b5f73c2`).

## Found on arrival

Nothing: `git status` was clean in the worktree, and the main checkout was clean
each time I touched it. My one mistake there was a `--data-root` without its
`data/`: it wrote a stray `C:\workspace\tolstack\projections\`, and I removed
it within the minute. I made it, it was regenerable, and nothing else wrote
there.

Re-run note: both, with `--only`
(`browser__real-embedded-the-annotator-shows-neither-its-rail-nor-i__7d7ba955`,
`browser__real-nothing-above-produced-an-uncaught-error__62500dca`), came back
**WITNESSED** (2m53s, 3m13s). So all 34 entries the diff reached are witnessed.
The contributor-row click went red once on an unmutated baseline under load and
was green in every other run. It is not filed: one sighting, and no cause I could
show.
