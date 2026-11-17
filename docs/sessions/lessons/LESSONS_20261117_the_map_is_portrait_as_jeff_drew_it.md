# LESSONS 2026-11-17 — the_map_is_portrait_as_jeff_drew_it

Handoff: `docs/sessions/active/HANDOFF_20261117_the_map_is_portrait_as_jeff_drew_it.md`.
Run 2026-11-17, in the worktree. The one arrangement is now tall. Side by
side at 3840 × 2160, the map is fitted at **0.933** (it was 0.566), and its
smallest label is **15 px** (it was 9 px). No jumper crosses a name, and a
click anywhere in a box selects the part.

**Jeff's binding log** (`data/inbox/feature-identity/`, read-only): **84 files
before, 84 after.** Nothing in this handoff writes a binding. The scratch root
holds a copy of the log, and no probe wrote to it.

## What landed

- `docs/topologies/map_vpa_end_stop_v2.json`: `places` re-authored, three
  columns by seven rows, plus `provenance.arrangement` and `authored_by`. The
  `symbols` key is untouched.
- `apps/viewer/map.js`. Steps 4–6 of `VA.mapLayout` now place each part whole:
  box, pins, marks, jumpers, children and name. The name's place is computed
  in the layout (`box.nameBlock`). `placeName` tries six corner positions at
  two wraps and keeps the first that the part's jumpers, pins and marks leave
  clear. Where none is clear, the box grows taller and is placed again. The
  wrap helpers moved here from `views/map.js` (`VA.mapWrapText`,
  `VA.mapFitText`, `VA.MAP_GLYPH`), so the layout and the drawing share one
  glyph estimate. A child's row moves beside any route that leaves its
  parent's bottom.
- `apps/viewer/views/map.js` changes in four places:
  - It draws the layout's name block.
  - A bottom pin's lit label now sits below the box, mirroring the top pin's
    label above it.
  - A right flank's lit label drops a line where a left flank's pin of the
    same part is level with it.
  - The pointer: a press on a box's interior, a district's field or empty
    space pans once it moves past `VA.MAP_DRAG_SLOP` (4 px), and the click
    that follows a pan is swallowed. A press that does not move is a click on
    whatever is under it.
- `apps/viewer/map.css`: a box's hit rect fills its interior. A district gets
  a click-only field.
- `docs/DAG_TOPOLOGY.md` "The map", `apps/viewer/README.md` "The map", and the
  struck row in `ISSUE_20261116_what_the_map_does_not_draw_yet.md`.
- Guards: 3 fast and 4 browser, each with a spec. The census pins were raised
  (fast 715 → 718, browser 902 → 906). One existing spec was re-anchored
  (`__82cc1b61`, because the box-height line is now `h0`).

## The reference drawing — iterations (`shots/<slug>/reference_0N_1201x2160.png`)

Each iteration was drawn by the renderer itself, from the real v2 model and
the worktree's layout file, into a 1201 × 2160 box. A scratch harness loaded
the page's own scripts and stylesheets. Each PNG was read against Jeff's
sketch (`dispatch/docs/strategy/drafts/mockups/tolstack_tube_map_20261109/jeff_sketch_20261110.png`).

| # | What it showed | What changed for the next |
| --- | --- | --- |
| 00 | The wide arrangement in the tall box: zoom 0.566, a strip across the middle third. 4 jumpers cross a name. | The handoff's suggested places, as given. |
| 01 | Already close to the sketch. Base column on the left (cover, gas-spring mount, mount, hub), pitch plate column on the right, the end stop across the top, the feather stop and the slide across the middle, tangential link between, pitch link / arm / blade down the right, hub ↔ blade along the bottom. Zoom 0.933. Two defects: **5 jumpers struck through a number or name**, and the pitch link → pitch arm route ran **through the pitch link's bearing box**, because a child row centred under a parent sits on a route out of its bottom (one layout note). | Names placed by the layout, clear of jumpers (`placeName`). The child row moves aside for a bottom route. |
| 02 | 0 jumper crossings; the names take top-left, top-right or bottom corners as their jumpers allow. The bearing still crossed: the room left of the route was 149 against a 150-wide child. | `child.clear` 18 → 16. |
| 03 | 0 layout notes, 0 crossings, every between-body symbol in the gap between districts, and the hub ↔ mount bundle three parallel routes with three symbols. Accepted. | — |

The places were not iterated beyond the suggestion. The sketch decides, and
the suggestion already matched it in every relation the handoff lists. What
still differs is in the last section.

## The six regions, old and new (real page, Map selected, `tests/debug_map_shots_20261116.mjs --only regions`; `region_*.png`, `regions_log.txt`)

| Window · view | Region | Zoom old → new | Smallest label old → new | Symbol old → new | Reads? (new, by vision) |
| --- | --- | --- | --- | --- | --- |
| 3840 · Side by side | 1201 × 2160 | 0.566 → **0.933** | 9 → **15 px** | 6 → 9 px | Yes. It fills the region's height; every number and name reads at arm's length; symbols are distinct. |
| 3840 · DAG view | 2390 × 2160 | 1.126 → 0.933 | 18 → 15 px | 11 → 9 px | Yes. Centred in the wider region, with nothing stretched. |
| 5120 · Side by side | 1841 × 2160 | 0.868 → 0.933 | 14 → 15 px | 9 → 9 px | Yes. |
| 5120 · DAG view | 3670 × 2160 | 1.73 → 0.933 | 27 → 15 px | 17 → 9 px | Yes, centred; a lot of empty region either side. |
| 1920 · Side by side | 485 × 1080 | 0.229 → **0.378** | 4 → 7 px | 2 → 4 px | A legible thumbnail: districts, boxes and routes read; numbers read when looked for, names need a wheel notch. It was illegible before. |
| 1920 · DAG view | 958 × 1080 | 0.451 → 0.466 | 8 → 8 px | 5 → 5 px | Borderline, as before. |

At 3840 and 5120 the tall map is height-bound, so every one of those four
regions fits at the same 0.933. The DAG view no longer magnifies the map past
that; it centres it. That is the handoff's "nothing stretches", and the reason
the wide views lost size against the wide arrangement. In all six regions
nothing leaves the region, no label is clipped, and the drawn counts equal
the model's.

## What in the layout code was orientation-dependent

What changed:

- **The name was always top-left at the box's full width.** In a stacked
  column a part has pins top and bottom, and a jumper between them runs
  straight down the middle of the box, through that corner. Now the layout
  finds a clear corner, at full width or wrapped to half, and grows the box
  where none is clear. In v2 no box needed to grow.
- **A child's row was always centred under its parent.** In a column the
  route out of the parent's bottom runs straight down through it. Now the row
  moves beside the routes on the side with more room, and stays centred when
  nothing leaves the bottom. Beside the parent was considered: a 270-wide
  parent plus a 150-wide child does not fit a 420 cell inside its district
  and assembly pads, so the row stays under the parent.
- **A bottom pin's lit label sat inside the box above the pin**, which is
  where a bottom-corner name may now be. It now sits below the box, mirroring
  the top pin's label above it.
- **Both flanks' labels sat just below their pins.** The tangential link,
  between two columns, carries level pins on both flanks, and its two lit
  labels ran together ("mount end bearing-centred bearing centre"; the
  click-around's `click_09`). The right one now drops a line when a left pin
  is level.

Read and left alone, because they were already neutral:

- **The pin side** (`sideTowards`) is decided in cell units, with a tie going
  to top or bottom.
- **The symbol's turn** follows the segment's angle: on a vertical route the
  capacitor plates lie horizontal and the cup opens along the route. This was
  read in every shot.
- **The district's label** sits top-left.
- **The fit** is the smaller ratio, centred.
- **The cell** stays 420 × 340.

## The box's interior, and the district's field — what I chose

- **A box's interior is the part's control**, for hover and click alike. The
  pointer passing over a box now lights the part. The click-around read this
  as right: a box is the part, and its name already did the same.
- **A district's field takes a click and nothing else.** A still click
  selects the body; a pass over it lights nothing. The pointer crosses a
  district on its way to every part inside it, so a hover there would light
  the whole body under every pass. I chose this by that reasoning and did not
  build and try the hovering variant; it is a one-line change if Jeff wants
  it. The border twin and the name still hover the body as before.
- A press that moves past 4 px is a pan, from anywhere but a pin, a jumper or
  a connector. The pointer is captured only once the press moves, so a still
  click lands on its own element, and the click after a pan is swallowed in
  the capture phase.

## The click-around (before the checks; `click_NN_*.png`, `click_log.txt`, `dod_NN_*.png`, `dod_log.txt`)

The 27-step walk of the map handoff was re-run at 3840 Side by side, plus a
scratch DoD probe:

- hover inside the hub's box (8 entities lead);
- a still click inside it: the hub is selected on the map, in the tree and in
  the grid (its three dimensions), and the scene shows `own: 1 part, 6 faces`;
- a drag from inside the piston cover's box: the world pans by the drag and
  nothing is selected;
- a hover on the pitch plate district's field (lights nothing), then a click
  on it (the body is selected);
- the tangential link selected (the label fix, `dod_07`);
- the window resized 3840 → 1920 → 3840 with the pane open (region 1201 → 485
  → 1201, zoom 0.933 → 0.378 → 0.933), then the pane closed (region 2389) and
  the window resized again (957 → 2389, zoom 0.466 → 0.933).

No page error in any of it. What it found that no check asked about: the
tangential link's level flank labels (fixed above). The page's banner says
the data is older than the code. That is true of the scratch root's stamps,
since only the topology and kinematic projections were rebuilt from this
tree, and says nothing about the map.

## What in Jeff's sketch the tall map still does not do

- His **gas-spring mount is tall**, spanning the height the cover and the
  piston body share on the right, so the feather stop and the slide both run
  straight across. Ours is one cell high; the piston body sits a row lower, so
  the slide runs on a 45° leg.
- His **hub sits right under the tangential link mount**. Ours keeps the hub
  in row 6 so the hub ↔ blade joint runs along the bottom, which leaves rows 4
  and 5 of the left column to the hub ↔ mount bundle's three long routes.
- His **pitch link body sits between the columns**, under the pitch plate and
  offset left. Ours is in the right column.
- He drew the **hub ↔ mount joint with one symbol**. The model has three
  constraints, and the map draws three.
- He drew **one red** for every connector and pin. The map keeps the house
  rule: the page's ink for routes, the body's ink for pins, and the accent for
  the selection alone.
- **Name alignment varies by box.** The right column's names sit top-right,
  where its pins leave room, and the left column's sit top-left; the hub's and
  the blade's sit at the bottom. His names are all at a top corner.

A box spanning several rows (the tall gas-spring mount) would need a place to
carry a size, which the layout file does not have. It is filed as a new row
of `ISSUE_20261116_what_the_map_does_not_draw_yet`.

## Test record

The browser and witness runs below used `--repo C:/workspace/tolstack/data/scratch/portrait_20261117`.
That scratch root holds copies of the main checkout's `data/inbox`,
`data/meshes` and `data/projections`, and of this worktree's `docs`. Junctions
into the main checkout were refused by the edit guard (`New-Item -ItemType
Junction` with a main-checkout target reads as a write there), so the root
copies instead, per the review recipe in the session memory. The topology
and kinematic projections in it were rebuilt from this tree with
`--data-root`. The main checkout's `data/` was not written.

**Fast tiers**, in this worktree, at the final tree:

| command | result |
| --- | --- |
| `node apps/viewer/run_tests.cjs` | 595/595; the node-fs tier skipped (no projection in a worktree) |
| `node apps/viewer/run_tests.cjs --repo <scratch root>` | **718/718**, with the `[real]` checks armed |
| `node apps/annotate/run_tests.cjs` (bare, then `--repo <scratch root>`) | 323/323 and 323/323 (no annotate code changed) |

The first armed run was red on one check, `[real] the projection this tier
reads was built from this tree`. The kinematic projection reads
`docs/topologies/`, so it was stale too, not only the topology projection.
Rebuilding it from this tree (`build_kinematic_projection.py --data-root`)
made the run green.

**Browser runner**, `--only` for each suite this branch changed or whose
drawing it moved:

| command | result |
| --- | --- |
| `node scripts/run_viewer_browser_tests.mjs --repo <scratch root> --only "the map (Map"` | **33/33** (29 + the four new checks), 95.2 s, on the final text |
| `... --only "a window resize re-clamps"` | 3/3, 22.4 s (unchanged suite; it draws the map) |

**Witness runner**: one invocation, every spec this branch added or changed
(`--only __9f67fb7a --only __6a40e84f --only __ffa918de --only __82cc1b61
--only __8460eda4 --only __90d563b8 --only __5b42fd02 --only __f9c586da`).
**All WITNESSED**: 5 fast mutations (3 new specs, plus the two mutations of
the re-anchored `__82cc1b61`) and 4 browser specs, about 10 minutes. The
runner's closing "NOT ENROLLED" block read the shadow tree snapshot, taken
before the pins were written. The pin lines it printed are exactly the ones
committed in `scripts/guard_enumeration.mjs`.

**Default tier**, once, in this worktree, at the end:

```
C:/workspace/tolstack/venv-win/Scripts/python.exe -X utf8 -m pytest -q -p no:cacheprovider
1 failed, 2027 passed, 1 skipped, 4 deselected in 484.51s (0:08:04)
```

The one failure is `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`,
the documented worktree red: no `data/projections/` here, so the wrapper
refuses to call a skipped tier green. The same tier ran 718/718 against the
scratch root (above). The skip is the pitch-link bearing re-extraction
(`test_fit_bound_features.py:433`). Recorded with `suite-time record tolstack
--tier default --seconds 485`: inside budget.

**Not run**, because they are the review's after the merge: the whole browser
tier and the `--changed-since` witness gate.

**Scratch left behind**: `C:/workspace/tolstack/data/scratch/portrait_20261117`,
the copy-based root above, with the run logs. It is left for the reviewer,
since the main checkout's projection carries the wide places until it is
rebuilt from a tree that has these. It is about 800 MB and safe to delete
once the review is done. The worktree's `node_modules` junction stays for
the same reason.

## Found on arrival

Nothing. This is a worktree session; the main checkout's `git status` was
clean at the end too.

## Blocked actions

One, worked around rather than repeated. Building the scratch root with
junctions (`New-Item -ItemType Junction -Path <scratch>\data\inbox -Target
C:\workspace	olstack\data\inbox`) was refused by the main-checkout edit
guard, which read the junction's target as a write into the main checkout.
The root was built by copying instead (`cp -r`), as the session memory's
review recipe does.

A stale `index.lock` in this worktree's own git directory, left after the
witness runner's shadow-tree build, stopped one commit. No git process was
running and the lock was empty; it was removed, and the commit went through.
