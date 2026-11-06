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
