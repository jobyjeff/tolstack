# LESSONS 2026-11-22 — the_walk_reads_the_v2_study_and_the_map_on_the_merged_page

Run 2026-11-23. The review page is `REVIEW_20261122_the_first_study_on_v2.md`.
It has 20 verdict rows (8 does it, 6 partly, 6 does not) and 4 answered
sentences, plus the study tables, the Add-a-face replay and the flip list.
There are 24 shots in `shots/the_walk_reads_the_v2_study_and_the_map_on_the_merged_page/`.
Each was read before a row cited it. Shots that were not read, or that showed
nothing (a before/after pair of a row that was already open), were deleted.

## How the tree was served

- **Walked tree: `integration` = this branch's base, `f267da49`.** The code
  is identical to the lug review's `3b7c68fe`: `git diff` outside
  `docs/sessions` and `docs/issues` is one prompt file.
- **Scratch root: `C:/workspace/tolstack/data/scratch/walk1123`.**
  - Copied from the lug review's `rv_lug_1123`, with `data/inbox` re-copied
    from the main checkout (the review's copy lacked Jeff's 0101–0115).
  - This tree's `docs/` copied in, and `walk1123/pristine_fi` is an
    untouched copy of Jeff's log.
  - The eight builders ran from this worktree with `--data-root`
    (`data/scratch/walk1123_tools/build.sh`, log
    `data/scratch/walk1123.build.log`). All exited 0, all stamped
    `f267da494778`, in about 50 min. The kinematic builder was most of it,
    not contacts: the log's tail sits on "=== contacts" until the next
    header prints.
- **Driver:** `node tests/debug_walk_merged_page_20261114.mjs --root <scratch>
  --port 8881 --shots <shots dir>`, unchanged, driven over HTTP by scratchpad
  clients. A `node_modules` junction to the main checkout's was made in the
  worktree for it and removed at the end.
- **8000 was not served or rebuilt from.** The driver proxies unmounted GETs
  to it read-only.

## Jeff's log

`C:\workspace\tolstack\data\inbox\feature-identity\`: **116 files before and
after.** The sha256 of the sorted listing was `efe47ec6…3145` both times; the
sha256 of all contents concatenated in listing order was `39e9abba…2e11`
both times. (This is not the 11-19 walk's hash recipe, so do not compare the
digits across walks.) The scratch copy went from 116 to 121 files: 0116 add,
0117 unbind, 0118 take, 0119 take-while-adding, 0120 Shift-add.

## What the walk could not check, and why

- **A real 3D click on the pilot's shoulder faces.** With the pick filter
  on the mount, a 160 × 160 raycast scan of the pane's canvas hit none of
  the 18 bore faces: they sit inside the mount, behind its own walls, from
  the arm's framing. The replay therefore handed `scene.onPick` (the app's
  own click handler) a pick on that face, with `record` from
  `scene.faceRecord`. Everything after the handler is the code a click runs.
  The scan took over 5 minutes; do not repeat it at that density.
- **Jeff's 11-22 page itself.** The add/take code is unchanged since master
  `e7df6649` (the tip at his 04:30Z events), so the replay's writer is his.
  The mate ranking did change since (lug ownership, unplaced rows), so the
  exact list he saw may have differed.
- **The MS14101-3 green-sphere case (J7) in 3D.** The cause comes from the
  alias table and the seat link's shot, not from a fresh shot (F5 in the
  small-findings issue).
- **The jump measurement is the clicked row's label y**, 0.1/0.5/3 s after a
  real mouse click. That counts scroll and reflow together. No filmstrip was
  made; the numbers do not change after 0.1 s.
- **"Ends that offer nothing" was counted per feature (99), not per end
  (100)** as the seat link counted. Both arrive at 10, the same lug.
- **Assemblies-off and Parts-off map shots** were taken and not read, so
  they are deleted. The switches were read back in-page.
- **The whole browser tier and the witness gate** are the review's. This
  diff touches only `docs/`.

## Traps for the next walk

- **`c.py` inline JSON cannot carry a JS regex with a backslash** (`\s`,
  `\+`): it is a JSON decode error before anything runs. Put JS in a file
  (`e.py <file.js> [pane]`) or build it in Python.
- **A module imported by another script must guard its argv loop**
  (`if __name__ == "__main__"`), or importing `op` from the client re-runs its
  argv as ops.
- **`.click()` on the nav's Take did nothing visible** where a real mouse
  click wrote; drive body buttons with the driver's `mouse click` at the
  button's centre.
- **The sticky header covers a feature scrolled to `block: 'start'`**; use
  `center` before clipping a shot of it.
- **The pane's "folder needed" is not a button to press.** The first write
  calls the fake `showDirectoryPicker` itself.
- **`__embedTree` lives in the pane frame, not the page.**
- **Selecting the kinematic study sticks** (F1). Choose "Travel between end
  stops" or reload before walking anything else on the map.

## Issues

- **New:**
  - `ISSUE_20261123_a_take_under_an_armed_add_a_face_replaces_the_set_and_ends_the_add` (bug, high);
  - `ISSUE_20261123_a_dimension_row_under_a_feature_wears_its_other_ends_bound_mark_beside_suggested` (bug, med);
  - `ISSUE_20261123_small_findings_of_the_v2_study_walk` (bug, low: F1–F5).
- **Addendum:** `ISSUE_20260930_a_valueless_structural_edge_is_invisible_to_the_gap_list`
  (deferred). A gap row's card says "DERIVED — the quantity a study computes"
  above its own "Open." note.
- **Cited, not refiled:**
  - the race listed twice (`ISSUE_20261120_an_assembly_in_no_body_is_listed_twice…`);
  - suggestions only with the pane open (`ISSUE_20261123_a_features_suggestions_show_only_while_the_3d_pane_is_open`);
  - the lug-stack rectangle rule (`ISSUE_20261122_a_lug_stack_cannot_be_one_straight_line…`);
  - the pitch-arm datums (`ISSUE_20261123_215071_c_datums…`);
  - the Ⓜ bonus (`ISSUE_20261123_a_position_band…`);
  - D1–D11's three filed issues (all triaged, unanswered).
- **No new `needs: jeff`.** The only questions that gate a number are already
  filed (D1, D5, D10, the pitch arm).

## Test record

See the commit's report: the default tier, run once in this worktree, and the
two fast node tiers.

## Found on arrival

Nothing. The worktree was clean, and the main checkout was not written:
every write went under `data/scratch/walk1123*` (gitignored). That root, its
`_tools`, `.build.log`, `.driver.log` and `.pytest*` files are safe to delete
after the review.

## Blocked actions

None.
