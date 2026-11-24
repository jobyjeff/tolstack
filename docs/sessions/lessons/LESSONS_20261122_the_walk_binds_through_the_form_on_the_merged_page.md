# LESSONS 2026-11-22 — the_walk_binds_through_the_form_on_the_merged_page

Run 2026-11-24. The review page is `REVIEW_20261122_binding_through_the_form.md`.
It has 29 verdict rows (26 does it, 3 partly, 0 does not), the binds table
with click counts, the filmstrip numbers, seven questions and the flip list.
There are 33 shots and 2 probe JSONs in
`shots/the_walk_binds_through_the_form_on_the_merged_page/`. Each shot was
read before a row cited it. Probe shots and shots that were not read were
deleted.

## How the tree was served

- **Walked tree: `integration` = this branch's base, `10a6b07f`**, with all
  three binding-pane links merged.
- **Scratch root: `C:/workspace/tolstack/data/scratch/walk1124`.**
  - It is a copy of the right-click link's `rc1124`, with `data/inbox`
    re-copied from the main checkout and this tree's `docs/` copied in.
  - `walk1124/pristine_fi` is an untouched copy of Jeff's log.
  - The eight builders ran from this worktree with `--data-root`
    (`walk1124_tools/build.sh`, log `walk1124.build.log`). All exited 0, all
    stamped `10a6b07fbb48`, in about 20 min, most of it the kinematic
    builder.
- **Driver:** `node tests/debug_walk_merged_page_20261114.mjs --root <scratch>
  --port 8941 --width 1536 --height 864 --shots <shots dir>`, unchanged. It
  was driven over HTTP by the scratchpad clients in `walk1124_tools/`:
  - `c.py`, `e.py` and `walk.py` (helpers);
  - one script per bind: `pilot.py`, `pilot0.py`, `pattern.py`, `boss.py`,
    `takeline.py`, `run.py`;
  - `flips.py`, `accept1.py` and `w3840.py`.

  A `node_modules` junction to the main checkout's was made for the driver
  and the filmstrip, and removed at the end with `cmd //c rmdir`. The main
  checkout's `node_modules` was checked afterwards.
- **Filmstrip:** `node scripts/filmstrip.mjs --scenario
  walk1124_tools/film_tree.mjs --real-time --repo <scratch root>`. The
  scenario serves the real page repo-root static, as `filmstrip.mjs` does. It
  adds the driver's fake folder grant (an init script) and backs `/fs/` with
  `page.route` onto the scratch root, so a tick in the film writes to the
  scratch log.
- **8000 was not served or rebuilt from.** The driver proxies unmounted GETs
  to it read-only.

## Jeff's log

`C:\workspace\tolstack\data\inbox\feature-identity\`: **116 files before and
after.** The listing sha256 was `efe47ec6…3145` both times, and the
concatenated contents `39e9abba…2e11` both times. The scratch copy went
from 116 to 130 files, events 0116–0129:

- 0116: the pilot's second shoulder;
- 0117–0120: Unbind, a mis-aimed bind (mine, below), Unbind, the pilot
  from nothing;
- 0121: the bushing bores;
- 0122–0123: the pattern's Unbind and its bind;
- 0124–0125: the boss's Unbind and its bind;
- 0126–0127: the Next run;
- 0128: the filmstrip's tick, finding F4;
- 0129: v1's "Bind the suggested faces".

## What the walk could not check, and why

- **A 3D click on the pilot's shoulders from the pane's own framing.** No
  ray reaches the bore faces from outside the mount, the same as 11-23.
  `aim.js` puts the camera inside the ring looking at one face. `scan.js`
  raycasts for it, and a real mouse click lands there once
  `scene.preselected()` confirms the face. The first try clicked on an edge
  and bound face 201 (scratch 0118). The helper now checks the pre-selected
  face before it clicks. The shots of those clicks show an odd camera; the
  form beside them is what the rows read.
- **"Select from the scene" selecting a row.** It does not, in bind mode or
  in sweep mode on `base` (addendum on the 10-27 deferred issue). So the
  filmstrip's scene click shows the tree holding still, not following.
- **The blue "suggested" ring** was not in a shot. The rows that offered
  suggestions were already bound or opened straight into forms.
- **Jeff's 11-22 page itself.** The before-counts are the editing link's
  table, made from the 11-23 walk's replay of the old code.
- **"Tangential link mount flanged bushing … two shoulders"** was read as the
  gas-spring mount's locating boss (two lands and a relief). Its own note
  says so, and no flanged bushing sits at the mount. The page says so too.
- **Contrast** (Jeff's chat C4) was not measured.
- **The whole browser tier and the witness gate** are the review's. This
  diff touches only `docs/`.

## Traps for the next walk

- **The driver and `filmstrip.mjs` both take the browser slot.** Quit the
  driver (`/__ctl` `quit`) before a filmstrip, or the filmstrip waits
  forever.
- **The filmstrip's own server has no folder grant.** For a tick to write,
  copy `film_tree.mjs`'s `FAKE_PICKER` and its `page.route("**/fs/**")`. Also
  wait for the pane, not a fixed time: `__scene.listOpenParts().length` and
  `__embedTree`. A fixed 15 s left the first film with an unloaded scene.
- **Wait for `.navform:not([data-form-waiting])`** before you tick. The
  pane's read of the part takes 5–12 s, and a tick pressed earlier lands
  late.
- **`scrollIntoView` before you measure a row's y,** or measure after it.
  My first "the row moved 67 px" was my own scroll between the two reads.
- **A twisty click through `click_sel` misses a twisty that is off
  screen.** Scroll it into view first.
- **Never leave an empty `python.exe - <<EOF` in a command.** Under Bash it
  opens the REPL, which spun writing errors into a 300 MB task output until
  stopped.
- **`edit()` read straight after a menu pick can race the pane's post.** The
  shot is the evidence; read again after a second.
- **A tick on an unchanged form can write** (F4). Count the log around every
  tick, not only the ones that change something.

## Issues

- **New:**
  - `ISSUE_20261124_next_in_a_features_form_cycles_between_features_that_offer_nothing` (bug, low);
  - `ISSUE_20261124_small_findings_of_the_binding_through_the_form_walk` (bug, low, F1–F5);
  - `ISSUE_20261124_which_faces_of_the_gas_spring_mount_are_its_bushing_bores` (`needs: jeff`).
- **Addendum:** `ISSUE_20261027_the_scene_to_shell_mapping_stops_at_a_body_and_ignores_hover`
  (deferred). The scene-to-tree gap as measured in both modes.
- **Cited, not refiled:**
  - play with a form open (`ISSUE_20261124_play_with_a_form_open…`);
  - Flip, owner-not-in-set and the drawing-wins note (both strategy);
  - two shoulders with the same words;
  - the race listed twice (3D half);
  - the tangential link's plate-end lug features that offer nothing (11-23 walk).

## Test record

All runs were in this worktree. The diff is docs only (this lesson, the
review page, 33 shots and 2 JSONs, 3 issues, 1 addendum). No suite, guard or
spec changed, so neither the browser runner nor the witness runner was run.

- **Default tier:** see the addendum below (filled in from the run's own
  output).
- **`node apps/annotate/run_tests.cjs`:** 329/329.
- **`node apps/viewer/run_tests.cjs`:** 517/517, with the node-fs tier skipped
  (worktree).
- **`node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack/data/scratch/walk1124`:**
  **618/618**, with `[real]` armed.

## Found on arrival

Nothing. The worktree was clean, and the main checkout was not written:
every write went under `data/scratch/walk1124*` (gitignored). That root, its
`_tools`, `.build.log`, `.driver*.log` and `.pytest*` files are safe to
delete after the review.

## Blocked actions

None.
