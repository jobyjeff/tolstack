# LESSONS 2026-10-28 — an_interface_suggests_the_faces_that_touch

A gap edge names two parts and an interface word; `tolerance_stack/interface_contact.py`
reads both parts' faces in the assembly frame and pairs them by that word,
`scripts/build_contact_suggestions.py` writes
`data/projections/feature-identity/contact_suggestions.json` on the rebuild
rail, and the annotator colours the pair in focus and lists the best three.
Never selects, never writes.

## The measured populations, and the margins chosen

Measured over every gap edge of `topology_vpa_pitch_linkage.json` with every
margin opened wide (angle 5°, gaps 3 mm, clearance ±10 mm, no overlap floor),
then the margins set between the populations. Each constant in
`CONTACT_TOLERANCES` carries its own population in its comment.

| margin | value | contacts measured | nearest non-contact | separation |
|---|---:|---|---|---|
| `angle_deg` | 2.0 | cylinders 0.000–0.015°, one bearing at 1.01°; planes 1.07–1.76° | planes 1.64–4.8° (angle alone does **not** separate planes; the gap does) | set to admit, not to separate |
| `plane_gap_mm` | 0.05 | −0.001 to 0.017 mm | 1.48 mm | clean |
| `overlap_fraction` | 0.05 | 0.56–0.99 | 0.0 | clean |
| `axis_offset_mm` | 0.1 | 0.000–0.001 mm; 0.026–0.075 mm for the tilted bearing | nothing within 3 mm; 2.6 mm at a 150 mm reach | clean |
| `max_clearance_mm` | 0.5 | 0.0005–0.17 mm | none positive observed up to 10 mm | clean |
| `max_interference_mm` | 0.05 | none negative | −4.7 mm (a race on a bolt hole) | clean |
| `axial_overlap_fraction` | 0.05 | 0.8–8.3 mm shared | −0.05 and −0.49 mm (a shank beside a washer) | clean |
| `centre_mm` | 0.1 | 0.000 mm (three joints), 0.050–0.053 mm (tan link mount) | 0.128 mm | **thin** — and thin for a known reason: the same 1° tilt read on a bigger, farther bore |
| `seat_gap_mm` | 0.05 | −0.0007, −0.019 mm | 0.23 mm | clean |

**The one outlier is real geometry, not noise.** The tangential link's
separately extracted MS14101-3 (`asm217755_MS14101_3_34f032f0`) sits 1.01°
off its own bore in the link. It sets the angle margin (2° rather than 1°), the
axis offset (0.1 rather than 0.05) and the ball centre margin. A 1° margin
dropped `tan_link_mount_end_centre_is_this_bearing` to a bogus coaxial fallback.

**No planar interface exists in the linkage**, so the plane margins were
measured by running the plane pairing over the ball joints' part pairs (clevis
lugs on the balls' flats). That population exists and is clean; it is not a
population of `planar` edges.

## The table — every gap edge with an interface

From the projection built from this branch (`6ca0ce68`). "Clear" is
`build_contact_suggestions.clear_top`: a contact, not ambiguous, and the
runner-up a quarter of a margin worse.

| edge | interface | candidates | top pair (from/to surfaces, faces, evidence) | clear |
|---|---|---:|---|---|
| `pitch_arm_link_joint` | spherical | 3 | cylinder/sphere, arm [78,79,275,276] / link ball [104,105]: ball on the arm's r 2.413 bore axis, off 0.000, 3.57 mm along it | no — #2 (the r 6.35 counterbore, same axis, same distance) ties |
| `pitch_plate_link_joint` | spherical | 7 | cylinder/sphere, plate [1559,1560] / link ball [140,141]: on the r 5.55 bore axis, off 0.000 | no — ambiguous across blades; #2 +0.148 |
| `hub_to_pitch_plate_spindle_coaxiality` | cylindrical_slide | 0 | `no_contact`: boxes never within 1.0 mm (nearest 1.04 mm) | — |
| `gas_spring_bushing_coaxiality` | cylindrical_slide | 0 | `no_occurrence`: `gas_spring_mount_213668_002` is the standalone STEP, no assembly position | — |
| `gas_spring_rod_to_pitch_plate` | pin_in_bore | 0 | `no_contact`: nearest occurrences 51.5 mm apart | — |
| `tan_link_mount_joint` | spherical | 9 | cylinder/sphere, mount [1569–1572,1597,1598] / ball [64,65]: on the r 2.415 bore axis, off 0.050 | no — ambiguous across the three links; #2 +0.080 |
| `tan_link_plate_joint` | spherical | 6 | sphere/cylinder, ball [0–3] / plate [1502,1503]: on the r 5.55 bore axis, off 0.000 | no — ambiguous across links; #2 +0.113 |
| `pitch_link_lower_centre_is_this_bearing` | pin_in_bore | 1 | race OD [0,1,20,21] in link bore [14,16,36,37], clearance 0.003 | no — ambiguous: the other end |
| `pitch_link_upper_centre_is_this_bearing` | pin_in_bore | 1 | the same pair as `lower` | no — ambiguous: the other end |
| `tan_link_mount_end_centre_is_this_bearing` | pin_in_bore | 1 | race OD [0,1,20,21] in link bore [83,84], clearance 0.003, 1.01° | **yes** |
| `tan_link_plate_end_centre_is_this_bearing` | pin_in_bore | 1 | race [22,23] in link bore [79,80], clearance 0.0005, 7.16 mm shared | **yes** |
| `travel_between_end_stops` | clearance | 0 | `no_mesh`: `piston_cover_214958_002` | — |
| `end_stop_clearance` | clearance | 0 | `no_mesh`: `vpa_208510_007`, `vpa_piston` | — |
| `shank_out_pitch_link` | clearance | 1 | shank [2,3] in washer bore [7,9,36,37], clearance 0.17, 0.81 mm shared | **yes** |
| `shank_out_rotor` | clearance | 0 | `no_mesh`: `fastener_family` | — |
| `protrusion` | clearance | 0 | `no_mesh`: `flanged_bushing_tan_link` | — |
| `shank_out_vpa_out` | clearance | 1 | shank [4,5] in bushing bore [7,9,36,37], clearance 0.0115, 3.76 mm shared | **yes** |

**4 of the 17 have exactly one clear top pair**; 10 have candidates; 7 have
none (4 `no_mesh`, 2 `no_contact`, 1 `no_occurrence`). All four ball joints
have a spherical candidate (the DoD's `[real]` bar).

## What the engine cannot decide, and why — the proposal handoff's input

1. **Which end of a link** (`pitch_link_lower/upper_centre_is_this_bearing`).
   The bearing mesh has two occurrences, one at each end of blade 1's link;
   both touch, at different link faces. The projection lists the second under
   `ambiguous_with`; both edges currently show the *same* top pair. The node
   names say "lower" and "upper" — the agent has to read them, or compare with
   the other edges that end at those nodes.
2. **Which blade** (`pitch_plate_link_joint`, `tan_link_mount_joint`,
   `tan_link_plate_joint`). A part every blade shares touches at a different
   face per blade. Filed for a decision:
   `docs/issues/ISSUE_20261028_contact_suggestions_cannot_say_which_blade_a_topology_edge_means.md`.
3. **Which coaxial bore** (`pitch_arm_link_joint`, and #2/#3 on every ball
   joint). The ball's centre lies on the axis of the lug bore, its counterbore
   and any bushing in it — all coaxial, all through the centre. The rank
   prefers the one nearest the ball along the axis; on the pitch arm the bore
   and its counterbore tie exactly. Which radius the node means is a word the
   topology has ("link bore") and the geometry does not.
4. **Two bores that should be coaxial and are not within 3 mm**
   (`hub_to_pitch_plate_spindle_coaxiality`). At a 150 mm reach the only
   coaxial-looking pair is 2.6 mm off-axis. Either the bores are not where the
   node note expects ("expected to be the CAD Z axis") or the plate's spindle
   bore is not in the `asm217755_215177_001` installation mesh. Worth a human
   look before an agent proposes anything.
5. **Parts that never meet** (`gas_spring_rod_to_pitch_plate`, 51.5 mm). The
   gas spring's three occurrences are nowhere near the plate; the rod end that
   attaches is likely a different part (a rod end, a clevis) than the one the
   node names.
6. **No geometry at all** — the four `no_mesh` edges and the standalone
   `213668-002` mount (`no_occurrence`). Nothing to suggest until rotorkit
   installs them with an assembly position.

## Decisions the handoff did not make

- **The list is in the top bar, not in the rail row.** Embedded, the
  annotator's rail is invisible (the shell mirrors it from `annotate:tree`), and
  `apps/viewer/` was fenced. The bar's work area is where the suggestion line
  already explains the colours, and it shows in both modes.
- **The served pane reads it from the read set.** No mount serves
  `projections/feature-identity/`, so `build_kinematic_projection.py` copies
  the projection into `annotate.json` beside the part names. The rebuild rail
  runs the contact step before the kinematic one for that reason.
- **Faces of one feature are grouped.** A cylinder exported as two halves
  produced four identical candidates per pair; grouping on "same surface, same
  side, same axis/plane/centre" (`same_feature`) collapses them to one with
  every face listed.
- **Pin-in-bore falls back to `coaxial`** when nothing touches — two bores, two
  pins, or a pin and a bore that do not overlap. A coaxiality edge between two
  bores (the hub/plate one) is exactly that. Shown only when there is no
  contact on the edge.
- **Ties are rounded** (`TIE_DECIMALS = 6`): five blades scored the same joint
  with float noise in the twelfth place and the noise picked blade 3. After the
  rounding, a pair whose occurrences are the meshes' **own** wins, because
  that is where the annotator draws the part — then key order.
- **`frame-contact` also moves the colour** to the clicked pair. Framing a pair
  while another stays coloured would put the camera on faces that are not lit.
- **A fourth mark colour** (`contact`, violet). The suggestion accent says
  "right shape"; this says "touches", which is narrower, and scene.js's own
  rule is one colour per claim. Not a state hue.
- **`window.__mockWrites`** — a read-only handle on mock mode's captured writes,
  added so the browser tier can show a click wrote nothing. The `__scene`
  convention.

## Things that cost time

- **Git Bash heredocs mangle `\\`, `'` and non-ASCII** in inline Python edit
  scripts (a `\b` in a PowerShell path became a backspace; an em dash did not
  match). Writing the edit script to the scratchpad with the Write tool and
  running it worked every time.
- **`plane_on_plane` returned no `relation`** and only the planar measurement
  run hit it; nothing in the linkage pairs planes. A planar test is in the
  suite now.
- **Merging integration mid-session** re-pinned the guard census
  (`fast` 607 from integration, `browser` 723/690 after both sides); resolve by
  taking integration's lines and re-running `node scripts/guard_enumeration.mjs`
  for the merged number, never by adding the two deltas by hand.
- **Adding a key to `MARK_COLORS` rotted an existing witness's anchor** (the
  accent spec's `find` was the whole line). `test_mutation_witnesses.py` names
  it; re-pointed and re-witnessed.

## Verification, as recorded

Every `[real]` and browser run read a scratch root,
`C:\workspace\tolstack\data\scratch\contact_suggest\` (gitignored): copies of
the main checkout's `data/projections`, `data/meshes`,
`data/inbox/{linkage-sweeps,specs,drawings}`, and this tree's `docs/` and
`apps/`, with **every** viewer projection plus the contact suggestions rebuilt
there from this branch at `6ca0ce68`. The shared projections in the main
checkout were not written: a build from this branch would have passed the gate
(their stamp `28c6f78` is an ancestor) and then locked every master-based
worktree out of rebuilding until this branch merges. **Delete the scratch root
after the review** (~430 MB).

| tier | where | result | wall |
|---|---|---|---:|
| `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -rfs` | worktree | 1614 passed, 3 skipped, 3 failed (below) | 318 s |
| ↳ `test_viewer_js_suite` | | the by-design worktree red; its tier is the next row | |
| ↳ `test_mutation_witnesses` ×2 | | a rotted anchor (fixed, re-witnessed) and the uncited-lesson check (this file) | |
| ↳ skips | | the two `[real]` contact tests (no projection in main yet — run by hand against the scratch projection: both pass) and the bearing re-extraction one | |
| `node apps/viewer/run_tests.cjs --repo <scratch>` | main data via scratch | 606/606, node-fs tier ran | 11 s |
| `node apps/annotate/run_tests.cjs` | worktree | 248/248 | — |
| `node apps/annotate/run_browser_check.mjs` | worktree | 80/82: the two mock anchor checks, red on integration and already filed | — |
| `node scripts/run_viewer_browser_tests.mjs --repo <scratch>` | scratch | 32/35 full run; the three reds each pass alone (32/32, 34/34, 20/20) — appended to `ISSUE_20261028_two_browser_suites_fail_in_the_full_run_under_load_and_pass_alone.md` | 348 s |
| six new witnesses, `--only` each | scratch | 6/6 WITNESSED; the re-pointed accent witness WITNESSED | — |

(The `--changed-since integration` gate run is recorded in the re-run section
below once it finishes.)

## Found on arrival

The main checkout was clean (`git status --porcelain=v1 --untracked-files=all`
empty, on `master`). Nothing was written there outside `data/scratch/`.

## Left in place

- `node_modules` in this worktree is a junction to the main checkout's (the
  browser tier imports `playwright-core` relative to the script). Gitignored;
  it goes with the worktree.
