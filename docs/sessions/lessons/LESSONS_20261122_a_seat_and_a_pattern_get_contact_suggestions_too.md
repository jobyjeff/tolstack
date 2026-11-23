# LESSONS 2026-11-22 — a_seat_and_a_pattern_get_contact_suggestions_too

Handoff: `docs/sessions/HANDOFF_20261122_a_seat_and_a_pattern_get_contact_suggestions_too.md`.
Worked 2026-11-23 on a branch cut from integration `78d5cc45`.

## The table, re-measured

"Ends" are the two features of each of v2's interfaces (29 gap edges + 21
nodes two parts share = 50 interfaces, 100 ends), each counted once by what a
reader would see: bound, an open proposal, a contact row, or nothing. The
script is the session scratchpad's `measure_ends.py` (model view features +
`bindings.json` + a contact projection); it reproduced the handoff's 37
exactly on the live (master-built) projection.

| projection | bound | proposal | contact row (edge) | contact row (node) | nothing |
|---|---:|---:|---:|---:|---:|
| live, built from master `c3928f9a` | 33 | 5 | 25 | — | **37** |
| this branch's base (`78d5cc45`, lug fix in) | 33 | 5 | 29 | — | **33** |
| this branch, final | 34 | 5 | 31 | 20 | **10** |

(The final row folds a scratch copy of the log, which holds one binding the
master-built `bindings.json` had not folded yet: 34, not 33. No end moved
from bound to anything else.)

The 10 still empty, each with its reason:

| ends | why |
|---:|---|
| 6 | NAS6403U14D has no mesh: `tan_link_bolt_in_flanged_bushing`, `tan_link_upper_inner_race_on_bolt`, `tan_link_bolt_in_straight_bushing`, both ends each (Jeff's D7) |
| 4 | `tan_link_upper_inner_race_flange_seat` and `..._clamp_seat`, both ends: MS14103-3 is modelled about 6.2° off its bolt's axis, so its race faces meet the bushings 0.04 mm apart but past the 2° angle margin. Filed: `ISSUE_20261123_the_tangential_links_ms14103_3_sits_six_degrees_off_its_bolt_so_its_race_seats_get_no_contact_row.md` |

No end that had a row lost it (the measure counts an edge row first; every
base row is still `ok` in the final projection).

## Per deliverable

1. **Seats.** A node two parts share is now a row under `topologies[].nodes`
   (`build_contact_suggestions.node_row`), `from` = `parts[0]`, `to` =
   `parts[1]`, each side carrying `feature` and `ends` — the edge ends whose
   feature it is (`model_view.end_feature`). Every shared-node feature of v2
   has at least one such end (a dimension), so the annotator finds a node row
   through the ends it already asks by, and a Take writes through one of
   them. A seat (no interface word) pairs flat on flat.
2. **Patterns.** `ic.pair_patterns`: concave cylinders grouped per hole, sized
   by `fg.PATTERN_TOLERANCES["radius_fraction"]`, lined up hole to hole within
   the cylinder margins and the reach; one candidate per (size, size), most
   holes first, then sizes nearest each other. Pairing word
   `hole_pattern` = `fg.PATTERN_SURFACE`. On v2: piston body 5 holes
   (r 2.45 / r 2.6, the topology note's faces), upper head 3, mount 10, cover
   5, gas-spring mount 10. **The pitch arm clocking reads 1 hole**: on the
   meshes it is one radial hole line through both parts (the topology note
   says so), so each side's "pattern" is one axis — correct, flagged
   "not clear" because a counterbore-size row is close behind.
3. **Declared occurrence.** Already done by `a_take_on_a_lug_feature_binds_that_lugs_own_face`:
   on this branch's base the four race press fits are `ok` (pitch link pair
   through a borrowed slot, `own.to: false`). Nothing changed here.
4. **Balls.** When a ball joint's two ends are one mesh at one declared place,
   the end whose node name's word is "ball" (`BALL_WORD`) takes the convex
   sphere and the mesh is compared with itself (never a face with itself).
   MS14101-3 pairs ball and race (r 5.147 / 5.198). **MS14103-3 models no
   seat** — one solid, no concave sphere — so the one ball is offered at both
   ends (`seat_modelled: false`, "the bearing's one ball"); Jeff had already
   bound the outer race's centre to that same sphere by hand. A mesh with a
   concave sphere not at the ball's centre, or two balls, offers nothing.
5. **Why Jeff saw none.** Reproduced: with the 3D pane closed, a plate
   feature in the nav opens to the preview only — no body, no suggestion
   (`01_no_pane_straight_bore.png`); open the pane and the same row shows
   "2 faces · round · r 4.2600 · fits the mating pin · Take"
   (`02_pane_open_straight_bore.png`). The nav's feature body reads `tree.mates`,
   which only the pane posts. `apps/viewer/` was fenced: filed
   `ISSUE_20261123_a_features_suggestions_show_only_while_the_3d_pane_is_open.md`
   (audience strategy; the binding-pane chain may dissolve it).

## A wrong offer found on the walk, fixed

The plate's **piston body fastener pattern** opened (pane up) to four mate
rows "coaxial with 215177-001 pitch plate assembly, Ø41.04" — the plate's own
spindle bore, with a Take — ahead of the new pattern row. Cause: the mate
ranking skips a bound reference at the other end of a dimension *within one
part* (`AA.edgeWithinOnePart`, the lug handoff's fix), but read a dimension's
end parts off its end nodes' first parts; `pitch_plate_pilot_to_piston_fasteners`
(the plate's own dimension) ends on the shared pattern node, which names the
piston body first. Now a structural edge whose `part` is no assembly is within
that part (`topology.dimension_ends`' rule). After: the body leads with
"10 faces · round · r 2.6000 · lines up with the mating holes"
(`05_pattern_plate_holes_framed.png`). Same class, same site as the lug fix:
fixed here because it hid this handoff's row and offered a Take on the wrong
face.

## The shots, read

`docs/sessions/lessons/shots/a_seat_and_a_pattern_get_contact_suggestions_too/`,
1536 wide, scratch root on port 8871:

- `03_seat_plate_flange_underside_lit.png`, `04_seat_framed.png`: the plate's
  "flange underside" offers face 779, flat, "coincident with the mating face";
  framed, it is the lug face edge-on beside the bearing, where the flange sits.
  Looks right.
- `05_pattern_plate_holes_framed.png`: the five Ø5.2 holes lit under the
  piston body's flange. Rows 2–4 are the Ø14 counterbore (5 faces) and two
  single Ø17 faces (857, 883): fewer holes, ranked below. They look odd as
  Takes; the count and radius in each line say what they are.
- `06_ball_centre_pitch_link_upper_framed.png`: the upper ball lit solid at
  the plate lug — and the **lower** bearing's ball outlined too. Both bearings
  are one mesh (MS14101-3 .1 and .2) and the scene lights a face at every place
  its mesh is drawn; display only, the projection's row is the upper one. A
  reader may read it as two offers.
- MS14103-3's ball centre: "4 faces · ball-shaped · r 6.7318 · seated against
  the mating race" (text only, no shot).

## Jeff's log

`C:\workspace\tolstack\data\inbox\feature-identity\`: 116 files before and
after, aggregate SHA-256 of the sorted file hashes `4F95219F…51 58 B7 DB`
both times. The walk's fake folder grant wrote only to the scratch root.

## Traps

- **The contact build on real data takes ~15 minutes** and prints nothing
  until it ends (stdout is the report). The node rows added little; the hub's
  mesh dominates. Start it in the background before anything else.
- **Refactoring a JS function re-indents lines witness specs anchor on.** Two
  specs' `find` strings went missing after `endContactFaces` gained a loop
  level; a third still matched only because an 8-space find is a substring of
  a 10-space line. Scan every spec's `find` against the tree after a refactor
  (a ten-line Python loop over `scripts/mutation_witnesses/*.json`).
- **`apps/viewer/vocab.gen.js` is regenerated** by a new pairing word even
  though `apps/viewer/` was fenced: it is generated, and the test demands it.
- **A mirrored test mesh flips its winding**: z-mirroring a convex sphere made
  a concave one, and the "one ball" test found a seat. Rotate instead.

## Test record

All at `03adc696` (code final; only this lesson after it).

- **Default pytest tier**, in this worktree,
  `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -rs`:
  **2619 passed, 1 failed, 3 skipped, 4 deselected in 517 s** (recorded with
  `dispatch suite-time`, inside budget). The failure is the documented
  worktree red, `tests/test_viewer_js_suite.py` (no projection here). The
  skips: my two `[real]` node-row checks, which wait for the live projection
  to be rebuilt (they pass against the scratch projection: 25/25 in
  `tests/test_contact_suggestions.py` with it copied into this worktree's
  gitignored `data/` and removed after), and `test_fit_bound_features.py:433`
  (unrelated, a re-extraction not installed).
- **Viewer node tier**: against the main checkout it refuses (its projection
  is built from master, "NOT paired with this tree"). Against the scratch root
  rebuilt from this tree, with this worktree's `docs/` junctioned in for the
  worksheet checks: **628/628**.
- **Annotate node tier**, `node apps/annotate/run_tests.cjs`: **335/335**.
- **Witness**, one run, six `--only` guards (the new one, the two re-anchored,
  the occurrence check whose spec gained a mutation, and the two whose code
  moved under them): **12/12 witnessed in 8m40s**.
- **Browser runner**: no browser suite added or changed; none run. The whole
  browser tier is the review's.
- **The live `contact_suggestions.json` is not rebuilt** by this session
  (writing it from an unmerged branch makes every other worktree's rebuild
  refuse). The review rebuilds after the merge, and the two `[real]` checks
  then run.
