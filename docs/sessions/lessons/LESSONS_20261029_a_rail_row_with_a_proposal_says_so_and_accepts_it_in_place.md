# LESSONS 2026-10-29 — a_rail_row_with_a_proposal_says_so_and_accepts_it_in_place

Handoff: `docs/sessions/HANDOFF_20261029_a_rail_row_with_a_proposal_says_so_and_accepts_it_in_place.md`.
A joint end with an agent's open proposal now reads "suggested · high" on the
kinematic rail (and in the shell's mirror of it). Clicking the row lights the
face solid, frames it and dims the rest. Accept and Pick a different face sit
on the selected row. Every answer writes through one path.

## Jeff's click path (the DoD)

1. Open `http://127.0.0.1:8000/tolstack/viewer/`.
2. In the nav, under **Kinematic studies**, click **Blade pitch at the end
   stops**.
3. Open the 3D pane with the seam's tab, or the row's 3D control. The scene's
   tree is drawn in the nav, under the study row.
4. Under **joints**, open **pitch link**. The row **pitch link lower
   spherical-bearing centre** reads `suggested · high`, in the suggestion
   blue. Rest the pointer on it to see who proposed it and why.
5. **Click the row.** Face 104 of the pitch link is drawn solid blue on all
   five pitch links, the camera frames the one this end's body anchors, and
   every other part goes see-through. The row now carries **Accept** and
   **Pick a different face**.
6. Click **Accept**. The row reads `bound · face 104` and a toast names the
   write. Or click **Pick a different face**: the pick arms as Pick does, and
   the face you click turns the suggestion down and binds that face.

The other suggested ends on that study are the pitch link's upper centre, the
tangential link's two centres (`suggested · medium`) and the pitch plate
spindle bore axis. The hub spindle bore axis reads `candidates · 10`.

To ratify everything else, click the **topology row** (Propeller pitch system,
blade 1). Since this handoff it lists every edge, and the 33 with a proposal
read `suggested · …`. Select one, and the pane's bar lists each end's
proposal with Accept and Reject.

## Reachability, measured on the real projection (55 open proposals, 33 edges)

| entry | rows reading "suggested" | proposals reachable |
|---|---:|---:|
| topology row (bind mode, every edge) | 33 of 95 edges | **55** |
| kinematic study `vpa_pitch_linkage_blade_pitch_at_the_stops` | 9 joint-end rows: 6 suggested (5 distinct ends: `pitch_link_length` from/to, `tan_link_length` from/to, and `hub_to_pitch_plate_spindle_coaxiality.to`, which two joints share), 2 `candidates · 10`, 1 with nothing; the 2 edge features also read suggested | **5** |
| `pitch_link_cotter_hole_clearance` | 4 of 7 | 8 |
| `pitch_link_shank_out` | 4 of 6 | 7 |
| `pitch_link_thread_region_t` | 2 of 2 | 3 |
| `pitch_system_blade_angle_average` / `_worst`, `pitch_system_end_stop_minus7` / `_plus72`, `pitch_system_vertical_hub_to_pitch_arm` | 3 each | 5 each |
| `vpa_output_shank_out` | 2 of 6 | 3 |
| `vpa_pitch_linkage_travel_between_end_stops` | 3 of 4 | 6 |
| `pitch_system_gas_spring_branch`, `..._mechanical_stroke`, the nine `rotor_fastener_grip_u*h`, `tan_link_take2_worst_case_protrusion` | 0 | 0 |

So only 5 of the 55 can be answered on a rail row. The rest are on edges no
sweep run lists as a joint feature: washers, bolts, bushings, thicknesses.
Those are answered from bind mode's bar. Filed with options:
`docs/issues/ISSUE_20261029_fifty_of_the_fifty_five_proposals_are_answered_from_bind_modes_bar_not_a_rail_row.md`.

## Decisions not in the handoff

- **The topology row now lists every edge.** A `goto` with no study and no
  element used to land on the topology's first chain study, which listed 4 of
  the 33 proposed edges. The handoff requires all 55 to be reachable from the
  topology-level entry. `cmdGoto` now calls `wholeTopology()` (no study; the
  studyless branch of `renderElementList`). The shell's own label for that row
  already said "the whole topology". A `[real]` check pins the 33.
- **Bind mode's element row says it too.** Its chip was "proposed by agent ·
  high", and the shell's mirror never carried it, because `.el-row__proposal`
  was not in the mirror's sub-line selectors. So in the shell, a proposed
  element was only an amber row. The chip now reads "suggested · high" in the
  suggestion colour, is the row's mirrored sub line, and has who/why per end
  on hover. The proposed state counts as quiet in the mirror, so it is no
  longer amber.
- **Unselected suggested rows carry no button.** Selecting is one click, and
  showing "Pick" on an unselected suggested row would arm a reject-and-bind
  without the reader seeing what it rejects. A row with no proposal keeps
  plain Pick. A candidates row keeps Pick.
- **An edge feature** (`pitch_link_length` as a whole) shows the line and
  lights on selection, but keeps its bind-mode Pick: two ends, no default.
  Contributor rows show no suggestion. Both are appended to
  `docs/issues/ISSUE_20261029_an_edge_feature_and_a_contributor_pick_still_leave_sweep_mode_for_bind_mode.md`.
- **The "hollow marker" is often not there to emphasise.** A joint's own node
  is anchored at the joint, so a proposal never draws a marker for it. Every
  joint end on the kinematic rail is such a node. The focus emphasises the
  node's **dot** (scaled up) when there is no marker. On P2's lower pitch-link
  centre that reads as emphasised. The hub spindle bore axis did not, and I
  did not chase why.
- **Superseding is one rule for every answer.** The bar's Accept used to
  supersede the end's *first* standing binding. It now uses the armed pick's
  rule (`AA.answerSupersedes`): the end's one binding, or nothing when it has
  none or two.
- **Accept is a verb** (`accept <edge> <from|to>`), so the rail button, the
  console and a harness are one path. "Pick a different face" is plain `arm`.
  An armed click at a proposed end is the answer: a click on the proposed
  face itself is an Accept, and any other face writes `rejected`, then
  `bound`.

## The fold — nothing needed changing

`rejected` then `bound` in one gesture folds as you would expect, in both
folds. Python's `build_projection` and the JS `addEventToRecord` take the
proposal out of the open list into `rejected_proposals`, and the picked face
stands. I proved this end to end on a scratch root (next section). The two
events share `created_at` and take consecutive `seq`. The rejection's id is
the binding's id plus `-rejected-1`, so one gesture's events sort together.

## Real-data proof on a scratch root (DoD deliverable 3)

`C:\workspace\tolstack\data\scratch\rail_row\data\` holds a copy of the 55
inbox events plus junctions to `meshes`, `inbox/linkage-sweeps`,
`projections/viewer` and `projections/parts`. The real inbox was never
written.

1. `scripts/propose_bindings.py --data-root <scratch>` wrote one scratch
   proposal: `0056`, `hub_to_pitch_plate_spindle_coaxiality` from, hub face
   3460, low. The scratch projection was rebuilt: 56 open.
2. A scratch Playwright script ran the annotator on P2 against the scratch
   root, using the memory adapter's reads, so writes are captured. The hub row
   read `suggested · low`. Selecting it lit face 3460 solid. **Accept** wrote
   one `bound` with `ratifies: proposal-0056-…`. On `pitch_link_length` from
   (`suggested · high`, face 104 lit on all 5 occurrences), **Pick a different
   face** followed by a click on face 140 wrote `rejected` (`rejects:
   proposal-0001-…`, seq 58), then `bound` face 140 (seq 59, no `ratifies`).
3. The three captured events were saved into the scratch inbox and the Python
   projection was rebuilt: `2 bound, 1 rejected, 54 open`. The hub edge is
   bound at `from` with `ratifies` and `accepted_proposals`. The pitch link is
   bound at `from` face 140, and its `from` proposal is in
   `rejected_proposals`.

**Delete the scratch root after the review.** It is small, because the big
directories are junctions. Remove the junctions with `rmdir`, never with a
recursive delete.

## Gotchas

- `onPick(pick, bead, other)`: the third argument is the *unfiltered* hit on
  another part. A harness that passes the face there gets "not on <part>".
- The real-data annotator harness (`installRealAnnotatorReads`) feeds
  synthetic identity projections. This suite added `binding: "real"`, which
  reads the built feature-identity and contact projections off disk.
- A `?topology=` boot draws the first study's rail before the entry's `goto`
  lands. To wait for the whole-topology rail, wait for `li.el-head`.
- Removing `const event = …` from `armedClick` left `event.created_at` in the
  `lastBound` line. That threw after the write, so the row never said
  "bound". The new suite caught it, and the "...and the end reads bound" spec
  is that exact mutation.
