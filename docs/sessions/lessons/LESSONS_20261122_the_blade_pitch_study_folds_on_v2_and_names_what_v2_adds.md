# Lessons — the_blade_pitch_study_folds_on_v2_and_names_what_v2_adds (2026-11-22, run 2026-11-23)

The first study on model v2: blade pitch at the stops, on the same P2 run, v1's
six contributors on v2's edges with v1's bands, plus a row for every part v2 has
between a contributor's edge and its ball centre.

## The numbers: v1 and v2, equal

| | v1 | v2 |
|---|---|---|
| +72 stop: nominal / worst / RSS | 72.001 / ±0.784 / ±0.283 deg | the same |
| +72 S461-261 reach (at least +70) | pass (budget), margin +1.217, RSS +1.718 | the same |
| −7 stop: nominal / worst / RSS | −6.992 / ±2.355 / ±1.034 deg | the same |
| −7 S461-261 reach (at most −5) | marginal (budget), margin −0.363, RSS +0.958 | the same |

These are from the scratch build's own output. `tests/test_kinematic.py::test_real_v2_folds_to_v1s_numbers_at_both_stops_and_over_the_range`
computes both studies and compares each stop's interval, every term (sign,
coefficient, band), the range and the checks. It does not restate any digits. On the
page, v2's verdicts read **incomplete** where v1's read pass/marginal: v2 has 27 rows
with no value, and a refused row makes a stop's verdict incomplete. The margins
are the same.

## The contributors, as authored

| Sweep columns | v1 contributor | v2 contributor edge | Band (borrowed from v1) |
|---|---|---|---|
| `pitch_link.length` | `pitch_link_length` | `pitch_link_length` | `dimension_ref` v1 `pitch_link_length` |
| `pitch_link.point_b[0..2]`, sphere | `pitch_arm_radius` | `pitch_arm_radius` | v1 `pitch_arm_link_hole_to_clocking_hole` |
| `pitch_link.point_a[2]` | `pitch_plate_attach_height` | `pitch_plate_link_flanged_bushing_height` (new, deliverable 2) | v1 `pitch_plate_flange_to_link_hole` |
| `tan_link.length` | `tan_link_length` | `tan_link_length` | v1's inline 213863-004-A band, `borrowed_from` v1 `tan_link_length` |
| `tan_link.point_a[2]` | `tan_link_mount_height` | `tan_link_mount_height` | v1 `tan_link_mount_overall_height` |
| `tan_link.point_b[0..2]`, sphere | `pitch_plate_tan_link_attach_radius` | `pitch_plate_tan_link_flanged_bushing_radius` | v1 `pitch_plate_tan_link_attach_radius` |

**The new edge** runs from `piston_body_plate_flange_seat` (the plate's face on the
piston flange, datum A of 215735-A's ⌖Ø0.2 A B C on the 5X Ø7.950 link bores) to
`pitch_plate_link_flanged_bushing_bore`. That is the pair the suggestion named, and
the frame's datum A agrees. Its id is v2-only: v1's `pitch_plate_flange_to_link_hole`
joins different nodes, so reusing that id would claim the same feature, which `ids_from`
does not allow here. v2 is now 105 edges, 36 branch points, 28 loops, and the map
still reports no notes.

## The rows added (deliverable 4): v2 edge, columns, why on the route

Each row has `route_of` its contributor and the same columns and zone. It
shows the same sensitivity and has no value (`gap: "not yet read from its drawing or datasheet"`).
Rows follow the route in document order; the grid orders them by the lit walk.

| Contributor (columns) | Rows |
|---|---|
| `pitch_link_length` (length) | `pitch_link_lower_outer_race_od_to_centre`, `pitch_link_lower_outer_race_press_fit`, `pitch_link_upper_outer_race_press_fit`, `pitch_link_upper_outer_race_od_to_centre`. Each outer race's fit in the eye and its OD to the sphere centre are radial, so each moves the centre along the link. |
| `pitch_arm_radius` (point_b sphere) | `pitch_link_lower_inner_race_on_pitch_arm` (the stand-in pin), `pitch_link_lower_inner_race_bore_to_ball`, `pitch_link_lower_ball_joint`. This is the arm bore to the ball centre. The run's point is the joint, so the ball joint is the last step. |
| `pitch_plate_link_flanged_bushing_height` (point_a[2]) | `pitch_link_flanged_bushing_press_fit`, `pitch_link_flanged_bushing_wall`, `pitch_link_bolt_in_flanged_bushing`, `pitch_link_upper_inner_race_on_bolt`, `pitch_link_upper_ball_joint`. The radial chain bore → bushing → bolt → race → ball. The bolt is radial, so radial-in-bore moves Z. |
| `tan_link_length` (length) | `tan_link_lower_outer_race_od_to_centre`, `tan_link_lower_outer_race_press_fit`, `tan_link_upper_outer_race_press_fit`, `tan_link_upper_outer_race_od_to_centre` (as for the pitch link). |
| `tan_link_mount_height` (point_a[2]) | `tan_link_lower_inner_race_on_mount` (the stand-in pin), `tan_link_lower_inner_race_bore_to_ball`, `tan_link_lower_ball_joint`. |
| `pitch_plate_tan_link_flanged_bushing_radius` (point_b sphere) | The radial chain `tan_link_flanged_bushing_press_fit`, `tan_link_flanged_bushing_wall`, `tan_link_bolt_in_flanged_bushing`, `tan_link_upper_inner_race_on_bolt`. Then along the bolt `pitch_plate_tan_link_flanged_bushing_bore_to_seat`, `tan_link_flanged_bushing_flange_thickness`, `tan_link_upper_inner_race_face_to_ball`. Then `tan_link_upper_ball_joint`. A sphere has all three columns, so a position along the bolt moves one of them. |

27 rows. The tangential link's bolt axis is world X: the link's placement in the run's
provenance has its local z (the bore axis) at (0.9997, 0.019, 0.018). The pitch
link's bolt is taken to be radial too, which is what "a height to the bore" in v1's
callout implies. Neither link's bolt axis is a fitted fact in this repo
(`fits.json` holds the plate's link bore as `unresolved: disagreement`).

### Left out, with the reason (filed: `ISSUE_20261123_the_v2_blade_pitch_study_leaves_out_edges_that_need_a_ruling_before_they_carry_values.md`)

- `pitch_link_race_bores`, `tan_link_race_bores`: the link body's bore-to-bore *is*
  the band the length contributor borrows. A row here would count it twice once both carry values.
- The straight bushing's route at both lugs (`*_straight_bushing_transition_fit`,
  `*_straight_bushing_wall`, `*_bolt_in_straight_bushing`,
  `pitch_plate_*_bushing_bores_position`, `*_straight_bushing_bore_to_end`): a second
  support of the same bolt. How two supports share the race's position is a tilt,
  and this sweep has no column for it.
- Along the pitch link's bolt (`pitch_plate_link_flanged_bushing_bore_to_seat`,
  `pitch_link_flanged_bushing_flange_thickness`, `pitch_link_upper_inner_race_face_to_ball`,
  `pitch_link_upper_inner_race_width`, `pitch_link_bolt_shank_*`): these move
  `point_a[0]`, which this study does not fold. That is v1's rule and v1's named
  excluded term.
- `*_flanged_bushing_bore_to_flange`, `tan_link_upper_inner_race_width`,
  `tan_link_bolt_shank_*`: squareness and widths reach the centre only through a tilt
  or not at all.
- Washers and grip: v2 has none (set aside by Jeff 11-19).
- **A missing v2 edge, not a left-out one:** neither plate-end inner race has a radial
  bore-to-ball edge (only `*_upper_inner_race_face_to_ball`), so "the race bore to its
  ball" has no row at either plate lug. This is in the same issue.

## Did a shared column or a cross-model `study_ref` need code?

- **Shared column: no.** Measured first: nothing refused two contributors on one
  column (`seen` is keyed by edge only). `route_of` was added anyway, to *pin* that the
  rows meant to share are the ones that do (same parameters and zone, refused
  otherwise). A fixture test proves two banded contributors on one column fold as two
  terms on the same coefficient.
- **Cross-model `study_ref`: no.** `_load_study_ref` already loaded any topology. The
  stops' axial stacks are v1's three chain studies, unchanged.
- **What did need code:** `_reconcile_feature` now accepts `ids_from` (deliverable
  1). `borrowed_from` was added for v1's inline tangential-link band: it is about 0.0,
  and v1's edge of the same citation is about 61.40, which a `dimension_ref` cannot
  point at. The pairing (same half-width, same document) is checked at load, and the
  lender's basic 61.40 rides as the row's cited nominal. `VALUE_FROM` was added as
  the word for the three kinds of row.
- **A rule reversed on purpose:** since `5be7c85b` a gap row's display carried no
  sensitivity. The handoff asks for it, and the gap chip's own title already promised
  it. Now a *gap* row shows its sensitivity, while a row refused for a missing nominal
  still shows none. The test was renamed, and its witness spec re-pointed.

## What the next links switch from borrowed to own, by edge id

| v2 edge | Borrowed now from (v1) | Own band will come from |
|---|---|---|
| `pitch_plate_link_flanged_bushing_height` | `pitch_plate_flange_to_link_hole` | 215735-A (sheet 2, the 5X bores' ⌖Ø0.2 A B C) |
| `pitch_plate_tan_link_flanged_bushing_radius` | `pitch_plate_tan_link_attach_radius` | 215735-A (sheet 2, SECTION A-A, ⌖Ø0.2 A B) |
| `tan_link_mount_height` | `tan_link_mount_overall_height` | 215175-002 / 215198-A |
| `tan_link_length` → band onto `tan_link_race_bores` | inline 213863-004-A (`borrowed_from` v1 `tan_link_length`) | 213863-004-A |
| `pitch_link_length` → band onto `pitch_link_race_bores` | `pitch_link_length` (untraced, workbook) | 213861-002 (not acquired) |
| `pitch_arm_radius` | `pitch_arm_link_hole_to_clocking_hole` (untraced, workbook) | 215071-001 |

The stop stacks stay v1's chains until v2 has its own. Two of their leaves
(`piston_body_shoulder_to_top`, `piston_body_flange_to_top`) are not v2 edges: they fold
but have no row on v2's grid.

## The page (deliverables 5 and 6)

- **Three kinds of row:** a row valued on its own model shows nothing. A borrowed
  value leads its name with one muted **BORROWED** badge: the hover names the model by
  its title and the band by its name, and the badge opens the citation. A row with no
  value reads "no value" in its value cells, shows its sensitivity, and its mark opens
  the gap card. v2's linkage rows have no own-model value yet.
- `VA.kinematicSameModel` replaces five "same topology" filters, so v1's chains are
  v2's own model: their sub-stacks and leaves are rows and are lit. The band-lending edge
  stays same-topology only, so a v1 band is never "one click away" on v2's empty edge.
- **The map (deliverable 6), measured first:** a selected kinematic study, v1's
  included, lit *nothing* on the map. The lit set reached only the grid. Now
  `VA.mapRouteKeys` puts each lit edge and the features and parts it owns on the
  route, and everything else wears `map__quiet` (opacity .35). Selection and hover
  still apply over it. This is the same for v1 and v2, and there is no new control.
- The "Nothing is recorded as missing for this assembly." line is gone: an empty gap
  list shows nothing. ISSUE_20261120 is marked resolved.

## Looked at with vision

Scratch root `C:\workspace\tolstack\data\scratch\study_v2\` (a copy of `data/inbox`,
`data/meshes`, `data/projections`, plus this tree's `docs/` for the worksheet
checks). The eight builders ran from this worktree with `--data-root`, and
`tests/debug_walk_merged_page_20261114.mjs` served it on **8893**. 8000 was not used.
Shots are in `shots/the_blade_pitch_study_folds_on_v2_and_names_what_v2_adds/`:
01/02 the page at 3840 (−7, +72), 03 the +72 grid, 04 the verdicts, 05 the gap card,
06 the borrowed badge's citation card, 07 the +72 page at 1536, 08 the gap card at 1536,
09 v2's nav with the study row at 1536, 10 the map with the route lit. Shots 05 and 08
show the earlier gap wording ("no value on v2 yet"), which was replaced after reading
them. Each shot was read before it is cited here. Seeing the same at
`http://127.0.0.1:8000/tolstack/viewer/topology.html` (model v2) is for after the merge.

## Jeff's binding log

`C:\workspace\tolstack\data\inbox\feature-identity\`: **116 files before and after**.
The sha256 over all file hashes was `fd4f2255…4044` at both ends, so he bound nothing
during the run.

## Found on arrival

Nothing: the worktree was clean, and this session did not work in the main checkout.

## Tests

- `python -m pytest -q` (worktree): 2612 passed, 1 skipped (a pitch-link mesh not
  installed), 1 failed. The failure is `test_viewer_js_suite_is_green`, the deliberate
  worktree red (no projection under the worktree's `data/`). Its tier was run
  separately with `--repo` on the scratch root: `node apps/viewer/run_tests.cjs --repo
  C:/workspace/tolstack/data/scratch/study_v2` gave **628/628, [real] tier armed**.
  Wall time 523 s, recorded on the ledger as inside budget.
- `node apps/annotate/run_tests.cjs`: 334/334.
- Browser `--only "the map (the counts"`: the first run stopped after 12 checks on a
  nav-row click (filed: `ISSUE_20261123_the_map_suite_stopped_on_a_nav_feature_row_click_once_and_passed_on_rerun.md`).
  The rerun was 32/32, v2 "notes none". `--only "kinematic study page"`: 22/22.
- The witness runner, run once with the four new specs and the re-pointed one:
  5/5 witnessed. The fast guard census was raised 624 → 628 with its comment.
