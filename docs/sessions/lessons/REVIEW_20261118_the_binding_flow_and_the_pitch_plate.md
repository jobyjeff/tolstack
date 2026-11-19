# The binding flow and the pitch plate, read against Jeff's 11-17 note

> **Where this ran:** I served `integration` at `a7a05123` (this branch's base)
> on drawing-checker's mount shape, port 8874. The projections were rebuilt from
> that tree into `data/scratch/walk1118`, with a copy of your log. 8000 has none
> of this yet. Nothing was listening on 8000 during the walk, and the main
> checkout it serves is on `master` (`448311a4`), which is 59 commits behind and
> carries none of the three handoffs. **Your real log held 101 files before and
> 101 after** (100 events and the README), and the sorted listing hashed to
> `f1e06978…` both times. Every bind went into the scratch copy (11 events). No
> code was changed.

**4 rows: 2 does it · 2 partly.** Shots:
`shots/the_walk_reads_the_binding_flow_and_the_pitch_plate_on_the_merged_page/`,
each one read before its row was written. Issues are cited by name.

**What you can do now that you could not on 11-17:**

- **Settle the pitch link bore.** It reads "2 sets of faces disagree", one line
  per set, each with its own Keep, then Pick a face and Unbind. One Keep writes
  one event that supersedes all eight of your standing binds, and the bore
  reads `bound · 2 faces`. Unbind lets every face go with one event.
- **See the pitch plate as an assembly.** In the tree, 215177-001 holds the
  plate 215735-001 and both flanged bushings. The two 214820-002 straight
  bushings sit beside it at the top of the pitch plate body. The map draws the
  members in a row inside the assembly's outline. The four bushing fits are
  constraints, and they read "press fit" and "transition fit".
- **Take a whole hole pattern from the other side.** Bind one side of a
  fastener pattern, and the other side's first row is the whole pattern
  ("5 of 5 holes Ø5.2"). Hovering it washes every hole in the 3D view, and one
  Take binds them all.
- **Bind a joint in about 30 clicks.** Blade root ↔ pitch arm went from 0 to
  6 of 6 ends. Once one side of a pair is bound, the other side lists ranked
  mates, and binding it is two clicks.

**What is still wrong:**

- **Keep and Unbind take 20–27 s and show nothing while they work** (row W1).
  The button gets a focus ring and nothing else. That is why Keep "seemed to
  do nothing": your log holds five Keep events (0096–0100) from five presses.
  Filed: `ISSUE_20261118_a_bind_on_the_pitch_plate_takes_ten_to_forty_seconds_to_write`
  (addendum).
- **The first end of every joint offers nothing.** The contact engine has the
  right faces for 20 of the model's 21 fits. For blade boss ↔ arm bore it has
  exactly 1060/1061 and 253/254. But the tree shows only "Pick a face", so you
  hunt in 3D. Filed:
  `ISSUE_20261119_a_joint_ends_feature_body_shows_none_of_the_contact_faces_the_pane_holds`.
- **The blade root binds both of its duplicate solids.** One Take on face 1060
  wrote four faces in two solids, and the list ranks the duplicate first.
  Filed as an addendum to
  `ISSUE_20261117_the_blade_root_mesh_carries_near_copies_of_four_of_its_solids`.
- **The two flanged bushings show no part number**, in the tree or on the map.
  Filed: `ISSUE_20261119_design_the_maps_flanged_bushing_boxes_carry_no_part_number`
  (addendum).
- **Six small findings** are in
  `ISSUE_20261119_small_findings_of_the_binding_flow_and_pitch_plate_walk` (F1–F6).

## Only you can decide

| # | Question | What the walk shows | Recommendation |
|---|---|---|---|
| D1 | **Pitch arm on the blade root** (Q1, `ISSUE_20261117_the_blade_and_piston_joints_leave_questions_for_jeff`). Does the arm clamp on the root fitting's shoulder, so the 0.025 mm gap in the CAD is placement slack? Or does the cross pin set its axial place, so the seat is a clearance and goes? | With the arm's clamp face (250) bound, the blade side offers 1079 and 6432 as "against pitch arm, 0.025 mm apart". The page reads the seat as a contact. Shot `07d_arm_seat_hover` is face 250, lit | None: this is a fact about the assembly that the meshes do not settle |
| D2 | **The piston body's top** (Q2, same issue). What are the three Ø7 pockets, the six Ø2.515 holes and the Ø4 centre bore? If one locates the upper head, the model is missing a constraint | Nothing new. The upper head's 3-hole pattern bound and offered cleanly ("3 of 3 holes Ø5.3" on the body), so the pattern is not in doubt | None |
| D3 | **Split the other meshes into a detail plus children** (`REVIEW_20261117_the_models_parts_against_the_product_structure.md`, "You decide" (a)) | The pitch plate's split cost 0 re-keys. On the blade root, the duplicate solids made one Take bind four faces across two bodies | **Settle the blade root's duplicate solids first** (which copy is the part), before splitting anything else. It is the only mesh where a bind came out wrong in this walk |
| D4 | **Do Enovia collectors count as assemblies?** (same page, (b)) | Nothing in the walk bears on it | None |
| D5 | **Which revision wins where the STEP and Enovia disagree?** (same page, (c)) | Nothing in the walk bears on it | None |
| D6 | **Which part the pitch link and tangential link bores sit on** (Q3/Q4, `ISSUE_20261118_which_part_the_pitch_plates_attachment_bores_sit_on`): **(a)** the assembly (as today), **(b)** the plate's Ø7.950 flanged-bushing bore, or **(c)** the flanged bushing's Ø4.826 bore | Your note: the straight bushing is a transition fit, put in at the top level. Keep on "faces 1380, 1381" settles the disagreement, but those faces are the plate's empty Ø8.520 bore, the straight bushing's seat, which no bolt touches. Shots `02a_…`, `02d_after_keep_bound_crop` | **(c)**. The bolt, and so the ball, is located by the bushing bores. On your page, **press Unbind rather than Keep** on the pitch link bore. After you answer, the bore is re-picked under its new key |

**Decided 2026-11-18, not asked again:** a joint's play becomes a gap edge
between the parts' own features, beside the shared node. The numbers the next
handoff needs are in "Each joint's play" below.

## Jeff, 11-17

| # | Your sentence (short) | What the page does now | Shot | Verdict |
|---|---|---|---|---|
| W1 | "No way to cancel a selection … clicking 'keep' seemed to do nothing" | On a copy of your log, `pitch link bore` under 215177-001 reads "2 sets of faces disagree": `faces 1380, 1381` and `faces 1380, 1381, 1509, 1510`, each with Keep, then Pick a face and Unbind. **Keep** on the first set wrote one event (`supersedes` all eight of 0093–0100) **23 s** after the press. The body read `bound · 2 faces of 215177-001`, with Correct, Add a face, Unbind and a Remove per face, about 27 s after. **Unbind** then wrote one retraction, and the body read `not bound`, with Pick a face, at 21 s. Both work. During each wait nothing on the page changes | `02a_attach_bore_two_sets_disagree_crop`, `02c_keep_just_pressed_crop` (0.3 s after the press: unchanged), `02d_after_keep_bound_crop`, `02e_unbind_1s_crop` (1 s: unchanged), `02f_after_unbind_crop` | partly |
| W2 | The pitch plate assembly, its flanged bushings, and the straight bushings at the top level | **Tree:** pitch plate body, 9 parts. Under 215177-001 pitch plate assembly ("3 parts · 5 features") are 215735-001 pitch plate (4 features), flanged bushing, pitch link (2) and flanged bushing, tangential link (2). The assembly's own five features follow. The two 214820-002 straight bushings are siblings of the assembly. **Map:** the assembly's dotted outline holds 215177-001, the tangential link's flanged bushing and 215735-001. The pitch link's flanged bushing is a small box under the assembly. The straight bushings are outside the outline. **Selected:** the tree opens every member, the map lights the members and their routes, and the 3D view lights the plate. Still missing: the flanged bushings' NAS number (filed), and one long diagonal bolt route (filed in the same issue) | `03a_map_pitch_plate_district`, `03b_pitch_plate_assembly_selected`, `02a_attach_bore_two_sets_disagree_crop` | does it |
| W3 | "Once a hole pattern on one side … suggest the entire pattern on the other side" | Every v2 fastener pattern was tried (table below). Where one side holds two or more holes, the other side leads with the whole pattern in **5 of 5** cases. Hovering it washes the holes yellow in 3D, and one Take binds the set. The one joint without an offer is hub ↔ tangential link mount, where the hub holds one hole, and one hole is not a pattern | `04a_pattern_offer_tan_link_mount_hovered`, `10b_take_all_bar`, `10c_plate_offered_5_of_5`, `09a_blade_clocking_offer_crop` | does it |
| W4 | "Keep working towards the kinematic end stop studies" | 21 of the 72 feature ends are bound in your log. This walk's copy took that to 29 (table below). **No constraint carries a cited value.** 4 bushing fits have one side's band cited, and 47 of the 49 dimensions inside parts wait on a source nobody has read yet. The end-stop study can be lassoed, but it would fold no number | `01_landing_3840_side_by_side` | partly |

### Every fastener pattern in v2

"Bound" is your real log. Where neither side was bound, I bound one in the
scratch copy, as you would have.

| Joint | Side bound | How | Offered on the other side |
|---|---|---|---|
| propeller hub ↔ tangential link mount | hub, 1 hole (your 0083) | — | per-face mates only ("Ø5.80 vs Ø5.50"), no pattern row: one hole is not a pattern. Bound from the mount's side, the 11-18 lesson measured 10 of 10 Ø5.5 on the hub |
| gas-spring mount ↔ tangential link mount | gas-spring mount, 10 holes (your 0086) | — | **10 of 10 holes Ø5**, coaxial within 0.000 mm. Hover washes the ten holes (`04a_…`) |
| piston cover ↔ gas-spring mount | both (your 0088, 0092) | — | nothing left to offer. The bodies read "5 holes Ø5 on a Ø81.57 circle" and "5 holes Ø4.75 on a Ø81.57 circle" |
| piston body ↔ pitch plate | piston body, in the copy | Pick a face, click hole 115; the bar reads "5 like holes on one plane · Take all 5 holes · Just this one"; Take all | **5 of 5 holes Ø5.2** on the plate (`10c_…`) |
| upper piston head ↔ piston body | upper head, in the copy | Pick a face, 2 orbits, click hole 129, Take all 3 holes | **3 of 3 holes Ø5.3** on the body |
| pitch arm ↔ blade root (the cross pin) | pitch arm, in the copy | Pick, click one hole, Add a face, orbit, click the other (no "Take all" for a two-hole line) | **2 of 2 holes Ø6.35**, "in solids 16, 18, 20 of 20". The Take bound 11 faces, not 12 (F4) (`09a_…`) |

### What the end-stop study still needs, joint by joint

"Ends bound" is the fold of your log, then the fold of this walk's copy. In
"value": **cited** means a band read off a drawing in the inbox, and **gap**
means the note says what would close it. No constraint in v2 carries a
`dimension`, by the model's own rule.

| # | Parts | Constraints | Ends bound: your log → copy | Value |
|---|---|---|---|---|
| 1 | hub ↔ blade root | rotary | 2 of 2 → 2 of 2 | gap: no blade-bore callout has been transcribed (212966-006-A is in the inbox) |
| 2 | hub ↔ tangential link mount | seat · pattern · boss in pilot | 3 of 6 → 3 of 6 | gap: 214373-002 and 215175-002 drawings |
| 3 | gas-spring mount ↔ tangential link mount | seat · pattern · boss in pilot | 3 of 6 → 3 of 6 | gap: 213668-002, 215175-002 |
| 4 | gas-spring mount ↔ piston cover | seat · pattern · boss in pilot | 5 of 6 → 5 of 6 | gap: 213668-002, 214958-002 |
| 5 | gas-spring mount ↔ lower piston head | seat (feather stop) | 1 of 2 → 1 of 2 | gap |
| 6 | blade root ↔ pitch arm | seat · cross pin · boss | **0 of 6 → 6 of 6** | gap: 216332-001, 215071-001 (D1 open) |
| 7 | piston body ↔ pitch plate assembly | seat · pattern · pilot | 1 of 6 → 2 of 6 | gap. The note names 214700-002's 5X Ø4.900 (VIEW C-C), but that drawing is not in the inbox |
| 8 | piston body ↔ lower piston head | seat · boss | 0 of 4 → 0 of 4 | gap |
| 9 | lower ↔ upper piston head | seat | 0 of 2 → 0 of 2 | gap |
| 10 | piston body ↔ upper piston head | pattern · boss | 0 of 4 → 1 of 4 | gap (D2 open) |
| 11 | pitch arm ↔ pitch link | ball | 1 of 2 → 1 of 2 | gap: bearing and lug fits |
| 12 | pitch link ↔ pitch plate assembly | ball | 1 of 2 → 1 of 2 | gap. The plate's end is your disagreeing bore (D6) |
| 13 | tangential link mount ↔ tangential link | ball | 1 of 2 → 1 of 2 | gap |
| 14 | pitch plate assembly ↔ tangential link | ball | 1 of 2 → 1 of 2 | gap |
| 15 | gas-spring mount ↔ piston body | slide | 2 of 2 → 2 of 2 | gap: the GR04WB328AT11 bushings' bore against 214700-002's OD |
| 16 | piston cover ↔ upper piston head | clearance (the stops) | 0 of 2 → 0 of 2 | the study's own output |
| 17 | pitch link lug: plate ↔ flanged bushing ↔ straight bushing | press fit · transition fit · 2 bolt fits | 0 of 8 → 0 of 8 | **cited** on the plate: Ø7.950 +0.015/0 and Ø8.520 ±0.008 (215735-A sh 2, SECTION A-A). gap: both bushings' OD (NAS77 sheet not parsed; no 214820 drawing) and the bolt (not in the model) |
| 18 | tangential link lug: the same four | press fit · transition fit · 2 bolt fits | 0 of 8 → 0 of 8 | the same |
| | **18 rows (24 part pairs)** | **36 constraints** | **21 of 72 → 29 of 72** | **0 with a value; 4 with one side cited** |

Inside the parts, the 49 dimensions break down like this:

- 43 read "value to come from <part>'s drawing", and none of those drawings is
  in the inbox;
- 2 are the plate's bushing-bore position callouts, which are cited;
- 4 are the bushings' own walls, which wait on the NAS77 sheet (in the inbox,
  not parsed) and on the 214820-002 drawing (absent).
So the next step towards the study is acquisition (213668-002, 214958-002,
214698/9-002, 214700-002, 215175-002 and 214373-002 drawings, and the NAS77
sheet parsed) more than binding.

### Each joint's play — the numbers for the next handoff (your 2026-11-18 decision, option a)

Every diameter here is a measurement of a mesh unless it says cited.

| Joint | Features the gap edge joins | Gap | Authored that way? | Cited diameter today |
|---|---|---|---|---|
| hub ↔ blade bearing | hub's blade bore (2356/2358, Ø82.550 on the mesh) and blade root's journal (4034, Ø82.515) | radial clearance of the bearing | no: one shared node, `hub_blade1_root_bearing_bore`, bound on both parts | none |
| hub ↔ tangential link mount pattern | the hub's holes (Ø5.50) and the mount's (Ø5.80) | float of each fastener in its hole | no: one shared node per pattern | none |
| gas-spring mount ↔ tangential link mount pattern | 10 holes Ø5.000 / 10 holes Ø5.000 | the same | no | none |
| piston cover ↔ gas-spring mount pattern | 5 × Ø5.000 / 5 × Ø4.750 | the same | no | none |
| piston body ↔ pitch plate pattern | 5 × Ø4.900 / 5 × Ø5.200 | the same | no | Ø4.900 is named from 214700-002 VIEW C-C in the note; that drawing is not in the inbox |
| upper head ↔ piston body pattern | 3 × Ø5.200 / 3 × Ø5.300 | the same | no | none |
| pitch arm ↔ blade root cross pin | 2 × Ø6.350 / 2 × Ø6.35 (three solids) | the pin's float | no | none |
| pitch link lug | plate bores Ø7.950 / Ø8.520; bushing ODs 7.965 / 8.506; bushing bores 4.826 / 4.826 | press fit, transition fit, bolt in each bushing bore | **yes**: 4 gap edges by the pitch plate handoff | the plate bores (215735-A sh 2) |
| tangential link lug | plate bores Ø7.950 (1375/1376) / Ø8.520 (1370/1371); flanged bushing OD 7.965 and bore 4.826 (solid 1, 1458/1459 and 1452/1453); straight bushing OD 8.506, bore 4.826 | the same | **yes** | the plate bores |

The fastener patterns' float needs the fasteners themselves, which v2 leaves
out. The ball joints and the seven boss-in-pilot fits are
already gap edges between two features, so they need values, not a new shape.

## Binding one joint from nothing (deliverable 3)

**Blade root ↔ pitch arm, 0 of 6 ends to 6 of 6, in the scratch copy.** I
counted every gesture, including the misses.

| End | Gestures | To disk / to the tree | Where I hunted |
|---|---|---|---|
| arm's bore (253/254) | open the part and the feature (2), Pick a face, 1 orbit, click = **5** | 9 s / ~15 s | The armed view showed the arm side-on, with the bore inside the ring (`05a_arm_bore_armed`). Pre-selection lit the half-bore with its radius (`05c_arm_bore_hover`). One click took both halves |
| blade's boss (1060/1061) | open the part and the feature (2), Pick a face, Take = **4** | 22 s / 35 s | Nothing to hunt: with the bore bound, eight ranked mates appeared (`06b_…`). But the top two are the duplicate solid, and the Take bound four faces in two solids |
| arm's clamp face (250) | open (1), Pick, **6 orbits that missed**, 2 zoom-out notches, a half turn, click = **12** | 8 s / 21 s | The face is on the side away from the camera (`07_arm_seat_not_found`, `07d_arm_seat_hover`) |
| blade's clamp face (1079) | open (1), Take = **2** | 7 s / 20 s | "against pitch arm, 0.025 mm apart" was offered. It bound 1079 and 6432 (both copies) |
| arm's cross-pin holes (271/272, 266/267) | open (1), Pick, click, then Add a face, 1 orbit, click = **6**, plus the first hole's orbits, which my script's log lost | ~8 s / ~20 s each | No "Take all" for a line of two holes |
| blade's cross-pin holes | open (1), Take = **2** | 14 s / 26 s | "2 of 2 holes Ø6.35" offered (`09a_…`) |

**About 31 gestures and 7 writes. The waits alone were about 2½ minutes, and
the session took about 15 minutes with the hunting.** The second end of each
pair was 2–4 clicks. The first end was 5–12, because nothing is offered there
(the contact issue above). At this rate the **43 ends still unbound** in the
copy are about 4 gestures and 30 s each once found. **That is an afternoon,
not a week.** If the contact faces reached the tree, the first ends would cost
what the second ends cost now. Two things could stretch it: the blade root's
duplicate solids, which need deciding before its binds mean anything (D3), and
its slow hover (F1).

## Everything else

The six findings are in
`ISSUE_20261119_small_findings_of_the_binding_flow_and_pitch_plate_walk`:

- F1: a 370 ms pick on the blade root;
- F2: the armed view does not frame the feature;
- F3: a toast names one face of a set;
- F4: 11 of 12 faces;
- F5: an event file is named for some other edge;
- F6: "plain bushing" against "straight bushing".

Already filed, seen again and not re-filed:

- the offer bar covers the toast (`ISSUE_20261114_design_the_group_offer_bar_covers_the_write_toast_in_the_pane_header`);
- the opposite-pattern row clips its fit (`ISSUE_20261118_design_the_opposite_pattern_row_clips_its_fit_and_repeats_its_faces_below`, visible in `04a_…`);
- the 3D view draws the plate's bushings twice (`ISSUE_20261001_the_pitch_link_assembly_mesh_and_its_own_two_bearings_are_both_drawn_in_sweep_mode`).
