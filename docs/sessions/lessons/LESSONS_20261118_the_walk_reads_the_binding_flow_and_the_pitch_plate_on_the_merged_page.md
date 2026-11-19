# LESSONS 2026-11-18 — the_walk_reads_the_binding_flow_and_the_pitch_plate_on_the_merged_page

The review page is `REVIEW_20261118_the_binding_flow_and_the_pitch_plate.md`.
It has 4 counted rows (2 does it, 2 partly), six "only you can decide" rows
(D1–D6), and four tables: the fastener patterns, the end-stop needs joint by
joint, each joint's play, and the click count. Shots are in
`shots/the_walk_reads_the_binding_flow_and_the_pitch_plate_on_the_merged_page/`.
There are 20 PNGs, each read with vision before the row that cites it.

## How the tree was served

- **Walked tree: `integration` = this branch's base, `a7a05123`.** `master`
  (`448311a4`, the main checkout) is 59 commits behind and carries none of the
  three baseline handoffs: `git grep` finds no `buildFeatureSetEvent`, no
  `rankOppositePattern` and no `pitch_plate_215735_001` on it. **Nothing was
  listening on 8000** at either check (curl exit 7 at the start, `000` at the
  end), so the driver's proxy to drawing-checker returned 502s. Those are the
  only console errors the page logged.
- **Scratch root: `C:/workspace/tolstack/data/scratch/walk1118`.** It is a
  `cp -r` of `data/inbox`, `data/meshes` and `data/projections`. The eight
  builders then ran from this worktree with `--data-root …/walk1118/data`,
  crops with drawing-checker's venv, and all exited 0 without
  `--allow-older-tree`. It took about 9 minutes, contact suggestions being
  the slow leg. The log is `data/scratch/walk1118.build.log`.
  `walk1118/pristine_fi` is an untouched copy of the log, for resets.
- **Driver:** `node tests/debug_walk_merged_page_20261114.mjs --root <scratch>
  --port 8874 --shots <shots dir>`, unchanged. It was driven by a Python
  client, with helpers injected into the page (`openBody`, `body`, and `click`
  returning a button's coordinates, so every press was a real mouse click).
  `bind.py` arms a pick, orbits until a wanted face is under the pointer,
  hovers, clicks, and times the event and the body. All of these are scratch
  files in the session's scratchpad, not tracked.

## Jeff's log

**The real `data/inbox/feature-identity/` held 101 files before and 101 after**
(100 events and the README). The sorted listing's sha256 was `f1e06978…` both
times. The scratch copy went from 101 to 112 files: Keep, Unbind, six binds
for blade root ↔ pitch arm, the second cross-pin hole, and one side of two
patterns. The real log has grown since the 11-17 walk (83 → 100 events): Jeff
bound most of gas-spring mount ↔ piston cover himself (5 of 6), so the
handoff's suggested joint was no longer "from nothing". I bound blade root ↔
pitch arm instead (0 of 6).

## The click count (deliverable 3)

**About 31 gestures and 7 writes for 6 ends. The waits came to about 2½ min;
the session took about 15 min with the hunting.** The first end of each pair
took 5–12 gestures, because nothing is offered there. The second end took 2–4,
because ranked mates appear once one side is bound. At that rate the 43 ends
still unbound are an afternoon. The cause of the hunting is filed:
`ISSUE_20261119_a_joint_ends_feature_body_shows_none_of_the_contact_faces_the_pane_holds`.

## Issues

- **New:**
  - `ISSUE_20261119_a_joint_ends_feature_body_shows_none_of_the_contact_faces_the_pane_holds` (bug, med);
  - `ISSUE_20261119_small_findings_of_the_binding_flow_and_pitch_plate_walk` (low, F1–F6).
- **Addenda** (each was on this branch's HEAD already):
  - `ISSUE_20261118_a_bind_on_the_pitch_plate_takes_ten_to_forty_seconds_to_write`: Keep 23 s and Unbind 21 s, with no sign on the page meanwhile;
  - `ISSUE_20261117_the_blade_root_mesh_carries_near_copies_of_four_of_its_solids`: a Take binds both copies, and the copy ranks first;
  - `ISSUE_20261119_design_the_maps_flanged_bushing_boxes_carry_no_part_number`: the tree has the same gap;
  - `ISSUE_20261118_which_part_the_pitch_plates_attachment_bores_sit_on`: now D6, recommend (c), Unbind rather than Keep;
  - `ISSUE_20261117_the_blade_and_piston_joints_leave_questions_for_jeff`: now D1/D2.
- **Seen again, not re-filed:**
  - the offer bar over the toast (`ISSUE_20261114_design_the_group_offer_bar_covers_the_write_toast_in_the_pane_header`);
  - the clipped pattern row (`ISSUE_20261118_design_the_opposite_pattern_row_clips_…`);
  - the double-drawn plate (`ISSUE_20261001_…`).

## What the next walk should know

- **Never scan `__scene.pick` over a grid on the blade root.** One pick costs
  about 370 ms there (F1). A 160 × 160 scan held the page's JS thread for
  over 20 minutes and stalled the driver until I restarted it. That cost the
  most time of anything in this walk. Time one pick first. Use a 0.02–0.03
  step on small parts, and aim by eye from a shot on big ones.
- **After a reload the pane header reads "folder needed".** The driver's fake
  picker grants the folder on the first write, so nothing blocked. On Jeff's
  page that is a click per load.
- **An armed click on a hole of 3 or more like holes writes nothing.** It
  raises the header bar ("N like holes on one plane · Take all · Just this
  one") and waits. A probe that waits for a file times out (120 s) unless it
  presses one of the two.
- **The interface rows under a part's INTERFACES reuse the same `f:` feature
  twisties**, so an end's body reads the same there as under its part.
- **The fold for the inventory** was a scratchpad script over
  `bindings.json`. A v2 end counts as bound if the projection holds a bound
  feature under v2's id or its `ids_from` (v1), as `identity_fold.js` reads it.

## Test record

All runs were in this worktree. The diff is docs only: the review page, this
lesson, 20 shots and 7 issue files. No suite, guard or spec changed, so
neither the browser runner nor the witness runner was run.

(Results are filled in below from the runs' own output.)

## Found on arrival

Nothing. This is a worktree session, and the main checkout was not written:
every write went to `data/scratch/walk1118` (gitignored). That root, and
`data/scratch/walk1118.build.log`, are safe to delete after the review.

## Blocked actions

None.
