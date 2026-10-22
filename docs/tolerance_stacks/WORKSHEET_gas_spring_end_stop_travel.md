# Worksheet — travel between the gas-spring end stops

Handoffs `the_travel_between_the_end_stops_is_a_study` (2026-10-16),
`the_travel_chain_cites_its_three_drawings` (2026-10-20) and
`a_general_profile_note_bands_a_model_defined_term` (2026-10-22). The graph is
`docs/topologies/topology_vpa_pitch_linkage.json` (the end-stop chain in it),
the study is
`docs/topologies/study_vpa_pitch_linkage_travel_between_end_stops.json`.

**All four values are banded by their drawings, two by a dimension and two by
the drawing's general profile note.** The lower head thickness (214699-002 A)
and the cover length (214958-002 A) are dimensioned. The upper head's step
height and the mount's end-stop thickness are not: 214698-002 A and 213668-002
A.1 carry no callout for either, so each takes its drawing's `⌓w UNLESS
OTHERWISE SPECIFIED` note as ±w/2 about a mesh-fit nominal (section 3, Jeff's
ruling of 2026-10-20). Those two general-note bands are 0.75 of the ±0.82
worst case, and both drawings should replace them with an explicit tolerance
(section 8).

The three drawings arrived 2026-10-20 (forge todo `20261016T165622_zy675c`, noted)
and were extracted by drawing-checker the same day:
`20261020_134240_214698-002-A`, `20261020_134300_214699-002-A`,
`20261020_134315_214958-002-A`.

## 1. Jeff's statement (forge note `20261016T144810_kk46rp`, 2026-10-16)

> total linear travel between end stops study/sub-stack: starting here because
> it is actually a fairly short stack and it is an input to the rest of the
> analysis. Total linear travel is just the difference between two as-built
> stacks:
>
> Piston head thickness (sum): These components must be added to the pitch
> plate/piston rigid body — Lower piston head (214699-002) thickness; Upper
> piston head (214698-002) thickness.
>
> End stop distance (difference): New components, part of the main rigid body
> (currently only the tan link mount 215198-001 is included in the kinematic
> model) — Piston cover (214958-002) length, from bottom flange to end stop
> surface (~82.154mm); gas spring mount thickness (piston cover mount flange
> to it's end stop surface), (~8.667mm).

From his feather-direction list: the pitch mechanism resting on the feather
(72 deg) hard stop has, as its contact, the **bottom of the lower piston head
214699-002 (flatness only)**, and a piston length (214700-002) of ~108.669.
That lower face is the main datum.

## 2. The face order along CAD Z

Read off the installed meshes, which carry their `placement_world` in the
217755 assembly at 72 deg blade pitch. All three share one placement: a rotation
of 5.36 deg about **Z** and a translation of **-23.333861** in Z, so the order
along Z is the same in the part frame and the world, and the world value is the
part value minus 23.333861. Every plane below is an exact fit (rms and max
residual 0; the tessellation is exact).

| Part (mesh) | Face | Normal | Z, part frame | Z, assembly frame | What it is |
|---|---|---|---:|---:|---|
| lower head (`asm217755_214699_002`) | 7 | -Z | 234.1690 | 210.8351 | lower face, **the main datum** |
| lower head | 0 | +Z | 236.6600 | 213.3261 | upper face |
| piston body (`asm217755_214700_002`) | 168 | +Z | 234.1690 | 210.8351 | shoulder the lower head sits on |
| piston body | 1 | +Z | 239.1690 | 215.8351 | top of the body |
| piston body | 109 | -Z | 125.5000 | 102.1661 | far end face |
| upper head (`asm217755_214698_002`) | 113 | -Z | 236.6596 | 213.3257 | lower face, against the lower head |
| upper head | 151 | -Z | 239.2690 | 215.9351 | recess floor, **0.100 above** the body top |
| upper head | 0 (and five more) | +Z | 240.6690 | 217.3351 | bolt seats |
| upper head | 110 | +Z | 243.2156 | 219.8817 | step, **the stop face (Jeff, 2026-10-20)** |
| upper head | 156 | +Z | 245.3751 | 222.0413 | step |
| upper head | 149 | +Z | 249.1690 | 225.8351 | topmost plane, the 2026-10-16 working choice, not the stop |
| mount (`machined_213668`) | 3 | +Z | 202.1930 | none | flange face |
| mount | 1080 | +Z | 210.8600 | none | end-stop surface |

The order, low to high: piston body far end (102.17) < **lower head lower face
and body shoulder (210.84)** < lower head upper face and upper head lower face
(213.33, one plane to 0.0004) < body top (215.84) < upper head recess floor
(215.94) < the upper head's stepped upper faces (217.34 up to 225.84).

- **The heads seat against each other, and the lower one seats on the body's
  shoulder.** They do not sit at the body's two ends. The body's top is 0.1 mm
  *below* the upper head's recess floor, so the upper head does not touch it.
- **The piston body is not a member of the chain.** Its 108.669 mm is the
  distance from the shoulder (234.169) down to its far end face (125.500) —
  that is exactly 108.669 — which is the body's own length, not a distance
  between the heads. It belongs to a different question and is on no edge here.
- **Which upper-head face is the stop is settled (Jeff, 2026-10-20): face 110,
  the step at part Z 243.216.** Evidence beside the handoff in
  `docs/sessions/shots_20261020_strategy_stop_face/`: the face highlighted on the
  head in its own frame, and a CAD section of the gas spring at 72 deg pitch
  with his measurement of **64.465 mm** between that face and the surface it
  meets at the flat-pitch stop (corrected by Jeff the same day to **64.440**,
  section 6).

### Which part owns which stop surface

The section view reads the other way round from the 2026-10-16 prose. At 72 deg
the head stack sits **at the bottom, on the mount's end-stop surface**, and the
travel gap is **above** the heads, up to the **cover's internal shoulder**.
So the mount owns the surface the datum rests on, and the cover owns the far stop
the step face meets; the 2026-10-16 graph had them the other way round (the
datum "against the cover end stop", the far stop named for the mount). The
arithmetic does not change — cover length less mount thickness less both head
heights — but the node names and `part` fields did, and were corrected
(section 4).

## 3. The citations, and the mesh against the drawing

| Edge | Value | Source | Band | Confidence |
|---|---:|---|---|---|
| `piston_head_lower_thickness` | 2.491 | 214699-002 A sh 1, SECTION A-A, `2.491 ±0.050`; run `20261020_134300_214699-002-A`, view `214699-002-A.pdf::p1`, bbox [156.68, 545.02, 234.84, 561.17] | ±0.050 (the callout's) | traced |
| `piston_cover_flange_to_end_stop` | 82.154 | 214958-002 A sh 3, SECTION CUT A-A, `82.154 ±0.020`; run `20261020_134315_214958-002-A`, view `214958-002-A.pdf::p3`, bbox [426.94, 385.51, 512.75, 401.66] | ±0.020 (the callout's) | traced |
| `piston_head_upper_thickness` | 6.556 | 214698-002 A sh 1, **general note 6**, `⌓0.5 UNLESS OTHERWISE SPECIFIED.`; run `20261020_134240_214698-002-A` (extracted the note's text); nominal a mesh fit, faces 113 and 110 of `asm217755_214698_002` | ±0.25 (the note's 0.5 zone, bilateral) | traced |
| `gas_spring_mount_flange_to_end_stop` | 8.667 | 213668-002 A.1 sh 1, **general note 12**, `⌓ 1 UNLESS OTHERWISE SPECIFIED.`; run `20260819_150314_213668-002_A.1_MOUNT,_GAS_SPRING,_PROPELLER` (extracted the text without its symbol and no dimensions; the symbol read off the page render, drawing-checker `ISSUE_20261022_the_gas_spring_mount_run_extracted_no_dimensions_from_sheets_that_print_many.md`); nominal Jeff's ~8.667 and a mesh fit that agrees | ±0.5 (the note's 1 mm zone, bilateral) | traced |

213668-002 A.1 sheet 1 also gives **76.86 ±0.10** from datum A (the base face) to
the top face, where the feather-direction stop hits (Jeff). It is recorded on the
topology as `gas_spring_mount_datum_a_to_end_stop` and is **not** a term here:
total travel is what the ATS controls, and a datum-A-to-cover-flange dimension
would lengthen this chain (section 8).

**Before and after.** Every term moved from a placeholder to its current state;
the 2026-10-16 values, for the record:

| Edge | 2026-10-16 (assumed, ±0.05) | Now | Difference |
|---|---:|---:|---:|
| lower head | 2.4910 (mesh fit) | 2.491 ±0.050, drawing | 0.0000 |
| upper head | 12.5094 (topmost plane, face 149) | 6.556 ±0.25 (step, face 110), general note 6 | the stop face moved, not the measurement |
| cover | 82.154 (Jeff) | 82.154 ±0.020, drawing | 0.000 |
| mount | 8.667 (Jeff and fit) | 8.667 ±0.5, general note 12 | 0.000 |
| **travel** | 58.4866 | **64.440** | +5.953, all of it the upper head's stop face |

**Mesh against drawing.** Only the lower head has both: the fit and the callout
are the same number, so the mesh's units and the drawing's agree. The cover has
no mesh, and Jeff's figure and the callout are the same value, so the callout is
a confirmation of his number and the first independent source for it. The upper
head's drawing gives one callout that the mesh can be set against: the recess
floor, `2.61 ±0.05` above the lower face, against 2.6094 in the mesh (face 151
over face 113) — inside the band by 0.0006. That is the only evidence that the
mesh frame is the drawing's frame; it says nothing about the step's height.
214698-002 A also prints `3.708 ±0.127` (a flange feature, not matched to a mesh
face and not claimed) and an overall `(13)` reference against a mesh height of
12.5094 for the topmost plane: a reference dimension, no band, and the drawing's
own "NET PART DIMENSIONS (Ø57 X 13)" envelope.

**Why two terms have no dimension to cite.**

- *Upper head step height.* The drawing dimensions the head's diameters, the
  recess floor and a flange feature, and defers everything else to the model
  (note 5, "for complete product definition this drawing shall be used with
  model 214698-002"). The step height is a model-defined basic with no band
  printed anywhere. The outcome in the SOP's terms is an **absence** — read for
  on the sheet, demonstrably not there — not an unreadable.
- *Mount thickness.* 213668-002 A.1's two sheets give 76.86 ±0.10 overall, 4.00
  ±0.10 flange thickness, a (85.36) reference and the bore and rib details; none
  is an axial flange-to-stop length. drawing-checker's run extracted no
  dimensions for this part at all, so this is a read of the page renders, by eye.
  Also an **absence**.

An untoleranced model-defined length takes no band from the title block: the
general-tolerance block (`X.XXX ±0.050`) applies to a callout, and there is none.
A fitted nominal is a measurement of a mesh, never a tolerance. Until 2026-10-22
each of the two therefore carried a ±0.05 stand-in, `kind: assumed`,
`confidence: untraced`.

**What bands them instead: the general profile note (2026-10-22).** Jeff, forge
note `20261020T171900_km22z6` (2026-10-20):

> Upper piston head (214698-002) thickness (bottom flange A datum to end stop
> surface): Measured to 6.556mm, is in fact missing a tolerance on the drawing
> face. This would default to the global surface profile (Drawing note 6,
> surface profile 0.5 Unless Otherwise Specified), this is an oversight and
> should be corrected/tightened in future releases.
>
> Gas spring mount (213668-002) thickness, 8.667 in CAD. Also would default to
> the global surface profile 1mm (note 12). Also needs an explicit tolerance.

Both notes are on the drawings as he says. 214698-002 A note 6 reads `⌓0.5 UNLESS
OTHERWISE SPECIFIED.` (extracted by the 2026-10-20 run). 213668-002 A.1 note 12
reads `⌓ 1 UNLESS OTHERWISE SPECIFIED.`: the 2026-08-19 run extracted its text
without the symbol, and the symbol was read off that run's page render. A
profile zone of width w is ±w/2 about the model surface, so the step height
carries **±0.25** and the mount thickness **±0.5**, each about its mesh-fit
nominal, `drawing`/`traced`, anchored to the note rather than a dimension (the
SOP's "What a term cites when its drawing does not band it"). Each edge's
`note` opens by saying it is a general note and that the drawing should carry an
explicit tolerance, and the viewer marks both terms.

**The cover's outcome: dimensioned.** Sheet 1 of 214958-002 A extracted no
dimensions (title and notes sheet), sheet 2 has bore diameters and port details;
sheet 3, SECTION CUT A-A, carries `82.154 ±0.020` from the flange's outer face to
the bore's internal step — one callout, one tolerance, nothing composed. It is
the cover's internal shoulder, which is the far stop.

## 4. The graph and the signs

Nodes: `endstop_feather_contact` (the datum: lower head on the mount's end-stop
surface), `piston_heads_seat` (lower head against upper head),
`piston_head_upper_step_face`, `piston_cover_mount_flange_seat` (cover against
mount) and `piston_cover_end_stop_shoulder`. One edge,
`gas_spring_mount_hub_face_to_cover_seat`, carries no value and sits in no study;
it only keeps the chain attached to the rest of the linkage.

**Renamed 2026-10-20** (no binding keyed on either, checked in the feature-identity
inbox and the tree): `piston_head_upper_top_face` → `piston_head_upper_step_face`,
and `gas_spring_mount_end_stop_face` → `piston_cover_end_stop_shoulder`, which is
now a node of the cover. `endstop_feather_contact` keeps its id and gains the
mount as its second part. Every edge id is unchanged; the cover and mount edges
are now authored from the flange seat in +Z (cover: seat → shoulder; mount: seat →
end-stop surface), and the gap edge runs step face → shoulder.

A hard contact is one node, so a study that ended on the datum would close a ring.
The far stop is therefore split into its two sides and the gap between them is the
travel: `travel_between_end_stops`, from the step face to the shoulder. The datum is
the interior node where the two stacks join.

| Edge (authored from -> to) | Walked | Sign | Contribution |
|---|---|---:|---:|
| `piston_head_upper_thickness` (seat -> step face) | against | -1 | -6.556 |
| `piston_head_lower_thickness` (datum -> seat) | against | -1 | -2.491 |
| `gas_spring_mount_flange_to_end_stop` (flange seat -> datum) | against | -1 | -8.667 |
| `piston_cover_flange_to_end_stop` (flange seat -> shoulder) | with | +1 | +82.154 |

Travel = cover length - mount thickness - lower head - upper head. Both
dimensions Jeff sums as "piston head thickness" carry the same sign, and the two
he differences as "end stop distance" carry opposite signs.

## 5. Requirements read

From `data/inbox/requirements/S461_equipmentrequirements_20260906.json`, all
`validated`, `must_have`:

| Row | Says | Use here |
|---|---|---|
| S461-516 / S461-637 | nominal normal operating stroke 61.67 mm; "equivalent to 75° blade pitch travel" | context only: a nominal, not a bound |
| S461-610 / S461-636 | stroke is 0 mm at full extension, maximum at full retraction | context only: defines the zero |
| S461-616 / S461-638 | gas spring shall provide mechanical travel stops | context only: the stops exist |
| S461-617 / S461-639 | the stroke between travel stops "shall be defined with sufficient tolerance" that contact during normal closed-loop operation is "extremely improbable" | the requirement this study answers; qualitative |

None states a number for the mechanical travel, so the study has **no check**
and says why in `no_checks_reason` rather than carrying a limit nobody wrote.
The study stays check-less; whether a study with no check should be able to say
it is incomplete is a design question
(`ISSUE_20261016_a_study_with_no_checks_has_nowhere_to_say_it_is_incomplete`) and
not answered here.

## 6. The result, and the numbers it sits beside

| | mm |
|---|---:|
| Nominal travel | **64.440** |
| Worst case | 63.620 to 65.260 (±0.820) |
| RSS | ±0.5616 (63.878 to 65.002) |

The worst case is the sum of the four bands, 0.020 + 0.050 + 0.250 + 0.500; RSS is
√(0.020² + 0.050² + 0.250² + 0.500²). All four bands are the drawings' own; the
two general-note bands are 0.75 of the 0.82, so the width of this interval is
what the two drawings leave to their general notes, not what they dimension.

| | 2026-10-16 (four ±0.05 stand-ins) | 2026-10-20 (two cited, two stand-ins) | 2026-10-22 (all four drawing-banded) |
|---|---:|---:|---:|
| nominal | 58.4866 | 64.440 | 64.440 |
| worst case | ±0.200 | ±0.170 | **±0.820** |
| RSS | | ±0.0889 | **±0.5616** |

**Nominal confirmed against the CATIA kinematic model: 64.440, not 64.465.**
2026-10-20's fold was 0.025 mm below the 64.465 Jeff had measured in his CAD
section, and that difference was stated rather than smoothed. Jeff checked it the
same day (forge note `20261020T171900_km22z6`): *"there was a slight .025mm
overlap/interference at 72deg resting state, while at -7deg the upper stop
surfaces are perfectly coincident. This means the actual nominal travel is
64.440, not 64.465 I reported earlier."* So **64.465 is retired**; the fold and
the model agree, and the 0.025 was the model's own interference, not a term.

Beside it, with no claim about which is right: the ATS acceptance row for this
travel, S4ATS-2439 (and S4ATS-2379 as a range of motion), is **≤ 65 mm** as
atp-post scores it, and the ATP's derived travel was **65.03 mm** per the
2026-10-16 handoff (not re-read here). The worst case above reaches 65.26. That
row is context, not a limit (the study's `no_checks_reason`); Jeff on it:

> The ATS spec (65mm) likely doesn't take into account compliance in the system
> as it pushes against the charged gas spring. I think Chao said this could be
> ~1mm of deflection based on a simplified FEA model he made, we'll likely need
> to revise the ATS to reflect this (or measure the true end stop locations with
> the gas spring discharged).

The ~1 mm is Chao's estimate from a simplified FEA model as relayed by Jeff:
unverified and not folded. S461-516/637's nominal operating stroke is 61.67 mm.

What the other upper-head faces would have given, holding everything else (stack
= face Z less the datum 234.169; stop-to-stop distance 73.487 = 82.154 - 8.667) —
kept as the record of why the stop face matters, not as live alternatives:

| Upper-head face | Z (part frame) | Head stack | Travel |
|---|---:|---:|---:|
| 149 (topmost, the 2026-10-16 choice) | 249.1690 | 15.0000 | 58.487 |
| 156 | 245.3751 | 11.2061 | 62.281 |
| **110 (the stop, Jeff 2026-10-20)** | 243.2156 | 9.0466 | **64.440** |
| 0 (bolt seats) | 240.6690 | 6.5000 | 66.987 |

## 7. Traced ratio

This study's chain holds four element instances, **four** `traced`, all
`drawing` citations: two to a dimension (the lower head and the cover) and two to
the drawing's general profile note (the step height and the mount thickness,
whose nominals are mesh fits). That count is
read from the topology by `tests/test_end_stop_travel_study.py`. The registry's
own metric is the seeded-stack figure, 5 of 26, which this handoff does not move;
it is declared here so a reader sees the repo's standing number next to this one,
per the SOP's "The traced ratio".

```claim
metric: traced_ratio
value: 5 of 26
```

## 8. Drawing follow-ups

Both are Jeff's, from forge note `20261020T171900_km22z6`; neither is this repo's
to make.

1. **214698-002 (upper piston head): add an explicit tolerance to the step
   height** (the lower face, datum A, to the end-stop step face, 6.556 in the
   model). Today it defaults to general note 6's ⌓0.5; Jeff: "an oversight and
   should be corrected/tightened in future releases."
2. **213668-002 (gas-spring mount): constrain the 8.667 directly** (the cover
   flange to the end-stop surface), rather than adding a datum-A-to-cover-flange
   dimension beside the existing 76.86 ±0.10. Jeff: "One option would be to add
   another tolerance from A-datum to piston cover mount flange, this would
   improve the absolute flat pitch end stop accuracy but lengthen the stack for
   total travel. Probably better to directly constrain the 8.667mm dimension
   since total travel is what is controlled in the ATS."
