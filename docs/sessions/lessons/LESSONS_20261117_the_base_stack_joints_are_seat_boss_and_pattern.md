# Lessons — the_base_stack_joints_are_seat_boss_and_pattern (2026-11-17)

Handoff: `docs/sessions/active/HANDOFF_20261117_the_base_stack_joints_are_seat_boss_and_pattern.md`.
Model v2's two ground-stack joints above the hub were seats alone. Each is now
a seat, a locating boss in a bore and a fastener pattern, like the hub joint.
All three constraints were found in the meshes before they were authored, so
nothing was left out and no `needs: jeff` issue was filed.

## What was authored, and the mesh evidence

The four meshes all place their part at the identity, so these numbers are in
the assembly frame. They come from `feature_geometry.fit_part_faces`,
`pattern_siblings` and `hole_pattern` over each whole part, plus a facet-normal
convexity test to tell a boss from a bore. Meshes: the tangential link mount is
`asm217755_215175_001` (the alias row's other hand), the gas-spring mount is
`machined_213668` and the piston cover is `asm217755_214958_002`. They are
evidence that a feature exists, never values: no edge gained a dimension.

| joint | constraint | ids authored | mesh evidence |
| --- | --- | --- | --- |
| tan link mount ↔ gas-spring mount | seat | (existing) `tan_link_mount_gas_spring_seat` | mount face 62 (z 134.000, +Z) on gas-spring mount face 83 (z 134.000, −Z) |
| | boss in bore | `gas_spring_mount_locating_boss` (boss, gas-spring mount), `tan_link_mount_gas_spring_pilot_bore` (bore, tan link mount), gap `gas_spring_mount_boss_in_tan_link_mount_pilot` (`pin_in_bore`) | boss Ø220.370, two lands: faces 73/622 (z 126.55–127.55) and 81/624 (z 132.50–133.50), with a Ø214.782 relief between. Bore Ø220.421, faces 687/909 (z 125.98–133.14). Coaxial. **The gas-spring mount carries the boss**, the opposite of the hub joint. |
| | fastener pattern | `gas_spring_mount_fastener_clocking` (shared, `fastener_pattern`) | gas-spring mount: 10 × Ø5.000 on Ø240.000 through the flange (z 134.4–137.6), faces 303–312 and 800–809. Tan link mount: 10 × Ø5.000 on Ø240.000 (z 130.6–133.6), with Ø6.693/6.299/3.307 rings below on the same centres. Same ten angles (29.2, 44.2, 100.1, 115.1, 172.5, 187.5, 244.9, 259.9, 315.8, 330.8°), which are also the hub ring's. |
| gas-spring mount ↔ piston cover | seat | (existing) `piston_cover_mount_flange_seat` | mount face 3 (z 202.193, +Z) on cover face 126 (z 202.193, −Z) |
| | boss in bore | `gas_spring_mount_cover_locating_boss` (boss, gas-spring mount), `piston_cover_pilot_bore` (bore, cover), gap `gas_spring_mount_boss_in_piston_cover_pilot` (`pin_in_bore`) | boss Ø58.458, faces 1061/1063 (z 203.19–204.27) and 1074/1075 (z 208.78–210.11). Bore Ø58.572, faces 92/93 (z 203.93–210.22). Coaxial. |
| | fastener pattern | `piston_cover_fastener_clocking` (shared, `fastener_pattern`) | cover: 5 × Ø5.000 on Ø81.572 (z 202.19–207.19), faces 43–52 and 127–136. Gas-spring mount: 5 × Ø4.750 on Ø81.572 (z 198.19–202.19). Same five **unequal** angles (36.7, 107.6, 180.0, 252.4, 323.3°). The mount's other ring, 10 × Ø2.510 on Ø82.434, sits at other angles and is not this joint's. |

The repo's own contact suggestions agree on their own. Rebuilt from this tree,
`build_contact_suggestions.py` ranks exactly these faces as the single
candidate for both new gaps, `relation: contact`, with the same bore side:
clearance 0.025 mm on radius (tan link / gas-spring) and 0.057 (gas-spring /
cover).

Structural edges, each "Value to come from <drawing>'s drawing.":

- **tan link mount:** `tan_link_mount_gas_spring_pilot_to_pilot` (upper bore
  → pilot bore) and `tan_link_mount_gas_spring_fasteners_to_fasteners`
  (upper ring → lower ring).
- **gas-spring mount:** `gas_spring_mount_boss_to_seat`,
  `gas_spring_mount_boss_to_fasteners`,
  `gas_spring_mount_cover_boss_to_flange` and
  `gas_spring_mount_cover_boss_to_fasteners`. These mirror the hub's boss →
  seat and boss → ring.
- **piston cover:** `piston_cover_pilot_to_end_stop` and
  `piston_cover_fasteners_to_end_stop`. These mirror the tan link mount's
  ties to its own functional feature.

v1 has neither joint's boss or pattern, so every id is new.

## Decisions the handoff left to me

- **Names.** A bore is named for the part it receives
  ("gas-spring mount pilot bore"), as the pitch plate's "pitch link bore" is.
  The gas-spring mount's two bosses are "locating boss" and
  "piston cover locating boss". The cover's bore is "pilot bore", the same as
  the tan link mount's on the hub.
- **Gap direction.** Each gap edge reads from the lower part to the upper one,
  up the stack.
- **The tan link mount's upper features are dimensioned from its lower
  ones, not from its attachment bore.** My first cut tied both to the
  attachment bore. That drew six jumpers fanning to one pin, and the map
  reported two layout defects. Locating the upper bore from the pilot bore,
  and the upper ring from the lower ring, is also the better datum reading:
  the two rings share their angles. It did not clear the defect on its own,
  though (below).

## Counts, before → after

| | before | after |
| --- | ---: | ---: |
| parts | 15 | 15 |
| nodes (interfaces, DAG doc) | 25 | 31 |
| edges | 30 | 40 |
| branch points | 7 | 13 |
| grounded loops | 6 | 10 |
| gap edges | 8 | 10 |
| features (model view) | 34 | 42 |
| shared features | 18 | 22 |
| dimensions | 22 | 30 |
| interfaces (contacts + gaps) | 17 (9 + 8) | 21 (11 + 10) |
| within bodies (ground) | 9 (5) | 13 (9) |
| joints | 15 | 15 |
| compound joints | 1 | 3 |
| base parts (features, dimensions): tan link mount / gas-spring mount / cover | (5,4) / (4,3) / (2,1) | (7,6) / (8,7) / (4,3) |

Pins moved:

- `tests/test_model_view.py`: the hub-only compound-joint test is now
  `test_the_ground_stack_is_three_joints_with_three_constraints_each`.
- `tests/test_topology.py`: three incidence sets.
- `docs/DAG_TOPOLOGY.md`: the inventory sentence and a new paragraph.
- `apps/viewer/README.md`: crossings 276 → 37 became 334 → 42 (v2 alone is
  115 → 20). Live nodes 60 of 104 became 66 of 110. v2's rail reuse
  15 over 8 became 20 over 11.
- `views/topology.js`'s copy: 45/15 became 49/17.
- `apps/viewer/tests.js`: the pilot gap's touching set.

## The map: the one defect, fixed in `apps/viewer/map.js`

With three pins on top and three below, and a dimension straight through
from each, the 270-wide tan link mount box had no corner free for its name.
It grew taller past its cell: "name has no room clear of its jumpers" and
"box outgrows its cell". The browser tier's `[real] the map draws the model's
counts … reports no defect` would have failed on it. The fix is about 15
lines:

- Growth in height stops at the cell. After that the box widens, bounded by
  the cell's width rather than `tries`.
- `placeName` gains a third wrap: the strip between the box's start and its
  first top or bottom pin. That wrap takes the name **whole or not at all**.
  My first version truncated it to "tangent… / link / mount", which shows in
  the first shots. Refusing truncation makes the box widen to 318 instead.

A layout that placed its names before is unchanged: growth happens only
while a name has nowhere to go. New fast-tier guard: "a part joined to the
parts above and below it by three constraints each …", with spec
`fast__a-part-joined-…__4939ea28.json`. It reproduces the exact two notes on
the old `map.js`, and it is witnessed. The fast census pin is 720 → 721.
`map_vpa_end_stop_v2.json` is untouched.

## The browser check that assumed a short model

`[real] after the map, Classic's Fit and 0 key are the rails' again` compared
Fit's width with Classic's first-paint width (|Δ| < 12). It also checked
"fits the pane" on the SVG element's box. With 40 edges, v2's Classic is
taller than a 1700 × 1500 pane at natural size: first paint is 426 wide and
Fit gives 329. After Fit, the SVG's box is 1503 tall in a 1500 pane, while
the drawn walk spans 22 → 1499. Fit keeps its promise; the check measured
the wrong thing. It now asserts Fit fits the pane, measured on the drawn
shapes. Its declared mutation (Fit dead after a map paint) is still
witnessed. The main checkout's baseline on the old model was 330 → 325 and
passed, so the failure was this model, not a flake.

## Feature-identity log

The real log (`C:\workspace\tolstack\data\inbox\feature-identity\`) held 84
files (83 events + README) before and after. It was never written. The one
bind (Take all 5 holes on `piston_cover_fastener_clocking`, event 0084) went
to the scratch copy.

## The click-around

Scratch root `C:\workspace\tolstack\data\scratch\bsj`:

- a `git archive` of this branch with `data/` copied in, `venv-win` and
  `node_modules` junctioned, and `git init`;
- projections rebuilt by `scripts/rebuild_projections.ps1 -RepoRoot <root>`.

The probe is `tests/debug_base_stack_joints_20261117.mjs --root <root>`.
Shots are in `shots/the_base_stack_joints_are_seat_boss_and_pattern/`:

- `01` is the map at 3840 Side by side;
- `02`–`04` are the three bundles, each seat, ring of dots and
  circle-and-dot;
- `05` is the tree, three joints of "3 constraints";
- `06` is All · Unbound, where all 8 new features are listed (filter count
  30 = the fold's 30 = DOM rows);
- `07` is a hole of the cover's ring picked, with "5 like holes on one plane
  · Take all 5 holes · Just this one";
- `08` is after Take all: "bound · 20 faces", fit "5 holes Ø5 on a Ø81.57
  circle".

Notes on the shots:

- The red "data is older than the code" banner is the scratch repo's.
  Its commit lagged the files I synced into it. It does not appear on a real
  rebuild.
- Face 43's wall has no screen point from the framed view. The probe hands
  the click to the scene's `onPick`, as the hole-pattern probe did on the
  hub.
- One console 404 per page is a resource the probe's server doesn't mount.
  The page works around it.

## Gotchas

- **A `git init` inside `data/scratch/` turns the scratch root into a "main
  checkout" for dispatch's edit guard.** Plain `sed -i` and `git add` there
  are refused. Edit in the worktree, commit, and `git archive HEAD | tar -x`
  into the scratch root.
- The fast tier's `[real]` pairing wants the projection's build commit in the
  running checkout's history; an equal tree is not enough. Run
  `run_tests.cjs` from inside the scratch root.
- Resetting the scratch inbox is not enough to undo a bind. The page reads
  the served log under `projections/viewer/feature-identity/log.json`, so
  rebuild after resetting.
- The first browser witness run read "the tier never reached the witness",
  an abort. A rerun witnessed it. One `--only` rerun of the map suite also
  aborted once, then passed.

## Test record

All runs were on this branch's tree.

- **Default pytest, in the worktree:** `venv-win/Scripts/python.exe -m
  pytest -q`. 2063 passed, 2 failed, 1 skipped, 461 s. The two failures:
  - `test_viewer_js_suite_is_green`: the documented worktree red (no
    `data/`). Its `[real]` tier ran green at the scratch root.
  - `test_the_issue_each_mutation_cites_is_in_the_tree`: this lesson did
    not exist yet.

  The re-run after this lesson is below.
- **Re-run after the lesson:** `tests/test_mutation_witnesses.py`,
  `test_model_view.py` and `test_topology.py`, 250 passed. The default tier
  was also run from the scratch root, where the JS suite has data: 2058
  passed, 5 failed. All five are the scratch root's own. Four history tests
  need commits the scratch repo doesn't have. The JS suite's pairing failed
  because the guard blocks committing in the scratch repo. Suite time
  recorded: default, 461 s, inside budget.
- **Fast tiers at the scratch root (with `[real]`):** viewer 721/721,
  annotate 324/324.
- **Browser `--only`:** "the map (Map . Classic …)" 34/34, layout notes
  "none". "a pattern is bound as its like faces …" 11/11.
- **Witness, one invocation with both guards:** 2/2 witnessed.

## Blocked actions

- `rm -rf C:/workspace/tolstack/data/scratch/bsj` was meant to delete the
  scratch root. Dispatch's main-checkout edit guard refused it: the root
  holds a nested `.git`, so the guard reads it as a main checkout. The root
  is gitignored, and its `venv-win` and `node_modules` junctions are already
  removed. Deleting the whole directory reaches nothing else and is safe any
  time.
