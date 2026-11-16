# LESSONS 2026-11-15 — a_suggestion_names_its_face_and_the_mating_side_ranks_the_candidates

## Why the pane supplied no rows for "tangential link mount base face"

This is the designed state, not a defect. The tree draws the pane's rows for a
feature only when the pane lists a row for it (`VA.sceneRowsForFeature`):
- in **sweep mode**, the run's joint ends;
- in **bind mode**, the element rows of the open study's edges, or of every
  edge when no study is open.

On the kinematic page (`?kinematic=vpa_pitch_linkage_blade_pitch_at_the_stops`)
the pane is in sweep mode. The run's joints do not include the mount's base
face, so `sceneRows` was 0. The body was then the model's own plan:
"suggested · high" and Pick a face, with nothing naming the face. The probe
measured it there (`00_kinematic_page_…png`). On `?topology=vpa_end_stop_v2`
with no study the pane lists all 30 interfaces, and the same feature got two
element rows. That is why the 11-12 probe saw rows and Jeff did not.

The fix is the line itself (`VA.featureBodyPlan`, nav.js):
- It reads the surest proposal (`VA.surestProposal`). The old code named the
  surest confidence but armed at `proposals[0]`, which was unsorted.
- It carries the face: hover runs `hover face`, a click runs `camera face`
  (new; it frames the faces on every drawn occurrence and gives the first the
  pick tint).
- **Take** runs `accept <edge> <end> <model>`. `cmdAccept` and `cmdTake` now
  take a topology, as `arm` does.
- A ranked mate that is the proposal's own face folds into the line as its
  reason: "against propeller hub, 0.050 mm apart".

## The tolerance table (v2's bound pairs, real meshes, the placements v2 draws)

Only two v2 pairs were bound on both sides, both cylinder against cylinder.
For flats I used the hub's bound base face (526) against the mount's
**proposed** face (134), both ways. That is an agent's proposal, not a
binding, so the flat rows rest on a weaker truth.

| pair (armed side vs bound side) | true mate: angle / offset / Δr | nearest face failing the relation | nearest wrong face passing it |
|---|---|---|---|
| hub blade-1 bore vs blade seat 4034+4033 | 2356/2358: 0.0033° / 0.000 mm / 0.018 mm | 1985: 0° / **3.99 mm** | 2427: Δr 0.83 mm (ranked 3rd) |
| blade seat vs hub 2356+2358 | 4033/4034: 0.0033° / 0.000 mm / 0.018 mm | 2851: **0.50° / 0.53 mm** | 4038: Δr 0.010 mm (ranked above the true mate) |
| gas-spring mount bushing bore vs piston OD 166 | 53: 0° / 0 / 1.60 mm | 799: 1.30° / 0.48 mm | 113: Δr 0.18 mm (53 ranks 13th: bushings sit between) |
| piston OD vs mount bore 53 | 166: 0° / 0 / 1.60 mm | 9: 0° / 6.96 mm | 167 (166's other half) |
| mount base face vs hub 526 (flat) | 134: 0° / gap 0.05 mm / reach 0.4 mm | 792: 0° / gap **7.1 mm** | none |
| hub base face vs mount 134 (flat) | 526: 0° / gap 0.05 mm / reach 0.4 mm | 598: coplanar, reach **178 mm** of 149 allowed | none |

Thresholds (`AA.MATE_TOLERANCES`): axis 0.25° and 0.25 mm, plane 0.25° and a
1.0 mm gap. A flat must also be within reach: its centre's distance along the
plane can be no more than the two faces' sizes summed.

Coaxiality alone does not choose a bore. 44 of the hub's 747 cylinders sit
exactly on blade 1's axis, a stack of bores and grooves. **Radius orders
them**, which is the "nearest radius first" in the handoff.

## How blade 1's bore is told from blade 2's

Model v2 declares the blade's one occurrence
(`217755-001/…/211587-001.3`, `AA.occurrencePins`). The ranking pairs every
drawn occurrence of each part, so v2 leaves one pair (hub × blade 1). Face
2564's axis is 73.4° off that seat's axis and 168.8 mm away, so it is not on
the list at all.

With the blade at every occurrence, as v1 draws it (no pins), 2564 and its
siblings mate too, at the same Δr. A fast check proves it by turning the
blade's placement onto 2564's axis. On v1 the list ties those bores, and
nothing says which blade a v1 feature means. That is the same open question
as `ISSUE_20261028_contact_suggestions_cannot_say_which_blade_a_topology_edge_means`.

## v2's unbound sides, 2026-11-15 log (83 events)

12 features are bound. Of the 22 unbound:
- **4 open to a ranked list:**
  - `tan_link_mount_215175_002@tan_link_mount_hub_face`: 1 face, 134, which
    is also the proposal;
  - `tan_link_mount_215175_002@tan_link_mount_pilot_bore`: 76, head 459/784;
  - `tan_link_mount_215175_002@tan_link_mount_fastener_clocking`: 12, head
    207/206;
  - `gas_spring_piston_214700_002@pitch_plate_pilot_in_piston_id`: 17, head
    33/34.
- With the hub bore unbound (scratch), `hub@hub_blade1_root_bearing_bore` is a
  fifth: 44, head 2356/2358.
- **18 still say nothing.** Four have a ball bound opposite, which the
  ranking does not relate:
  - `pitch_arm@pitch_arm_link_bore`
  - `pitch_plate_215177_001@pitch_plate_link_attach_bore`
  - `pitch_plate_215177_001@pitch_plate_tan_link_attach_bore`
  - `tan_link_mount_215175_002@tan_link_mount_bore`

  Filed as `docs/issues/ISSUE_20261115_a_bore_opposite_a_bound_ball_centre_gets_no_ranked_mates.md`.
- The other 14 have nothing bound opposite:
  - both sides of `tan_link_mount_gas_spring_seat`,
    `piston_cover_mount_flange_seat`, `endstop_feather_contact`,
    `pitch_arm_root_seat`, `piston_body_head_seat` and `piston_heads_seat`
    (12);
  - `piston_cover_214958_002@piston_cover_end_stop_shoulder`;
  - `piston_head_upper_214698_002@piston_head_upper_step_face`.

I did not check the heads of the pilot bore, fastener and piston-ID lists
against a drawing. They are what the geometry says.

## The scratch root and the real log

- Every bind, unbind and accept went to
  `C:\workspace\tolstack\data\scratch\mate_ranking_20261115\`. That folder
  holds a copy of the viewer projections and the inbox log, served by
  `tests/debug_mate_ranking_20261115.mjs`, which is the 11-12 probe's server
  and folder grant.
- **The real log had 83 events before and 83 after**, as each probe run
  printed. The browser suite writes to the pane's in-memory store only.
- Click to shown is slow through the probe's HTTP-backed folder handle, as on
  11-12:
  - Take: written 15.3 s after the click, shown bound 9.6 s later;
  - Unbind: 12.7 s, then 12.7 s.

  The 11-12 lesson measured about 22 s click to body on a page's first write.

## Shots (`docs/sessions/lessons/shots/a_suggestion_names_its_face_and_the_mating_side_ranks_the_candidates/`, 3840×2160; `5120/` the same at 5120×2160)

- `00_kinematic_page_mount_face_line_names_its_face.png`: Jeff's state on the
  kinematic page. The one line now names the face, with Take beside it.
- `01_landing_mount_face_suggested.png`, then
  `02a`–`02d`: before, hover lights face 134, the click turns the pane, Take
  binds it. `05_filmstrip_hover_take.png` is the four frames composited
  (cropped to the tree and the pane).
- `03_hub_bore_unbound_opens_to_ranked_list.png`: the hub side unbound, the
  blade's seat bound. It reads "not bound", then 2356 and 2358, each "coaxial
  with blade bonded assembly, Ø82.55 vs Ø82.51" with Take, then 2427 and
  below. 2564 is absent.
- `04_hub_bore_armed_mates_prelit.png`: armed. The same list sits under the
  pick's line, and the first eight are marked in the suggestion colour. Esc
  takes the marks down (0 after).

What the click-around showed beyond the handoff:
- A ranked face's Take first sat on a line of its own and tripled the list's
  height. It is on the face's line now.
- The proposal's face was listed twice, as the proposal and as a mate. It is
  folded into one line.
- Reasons are clipped at the nav's rest width. The whole reason and the
  evidence are on hover.

## Decisions not in the handoff

- **`camera face <mesh> <face>…`** is a new pane verb. No existing verb framed
  a face in both modes.
- **Spheres rank nothing** (see the issue). A face the classifier calls
  `other` asks nothing either.
- **The pane computes mates for every unbound feature of the open model** and
  posts them as `tree.mates`, at most `AA.CANDIDATES_LISTED` rows each. The
  arm computes its own list for the armed feature, bound or not, so Correct
  ranks too.
  - The recompute is memoised on the log, the session's writes and the
    model, not on the fold object. In mock mode that object is rebuilt on
    every call, and keying on it would loop render → rank → render.
- `ISSUE_20260921_cross_part_face_relations_need_assembly_placement` was set
  `resolved`, since this is the capability it asked for.
