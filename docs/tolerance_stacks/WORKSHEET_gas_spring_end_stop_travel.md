# Worksheet — travel between the gas-spring end stops

Handoff `the_travel_between_the_end_stops_is_a_study`, 2026-10-16. The graph is
`docs/topologies/topology_vpa_pitch_linkage.json` (the end-stop chain added to
it), the study is
`docs/topologies/study_vpa_pitch_linkage_travel_between_end_stops.json`.

**Every value in the chain is a placeholder.** Three are mesh fits and one is
Jeff's single figure; none is read off a drawing, because none of the three
drawings this stack needs is in any inbox. Forge todo
`20261016T165622_zy675c` asks Jeff to export 214958-002, 214699-002 and
214698-002 into drawing-checker's drawings inbox. Nothing below is a tolerance
and the interval at the bottom is a statement about the placeholder width, not
about the hardware.

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
| upper head | 110 | +Z | 243.2156 | 219.8817 | step |
| upper head | 156 | +Z | 245.3751 | 222.0413 | step |
| upper head | 149 | +Z | 249.1690 | 225.8351 | topmost plane, the working choice for the stop |
| mount (`machined_213668`) | 3 | +Z | 202.1930 | none | flange face |
| mount | 1080 | +Z | 210.8600 | none | end-stop surface |

The order, low to high: piston body far end (102.17) < **lower head lower face
and body shoulder (210.84)** < lower head upper face and upper head lower face
(213.33, one plane to 0.0004) < body top (215.84) < upper head recess floor
(215.94) < the upper head's stepped upper faces (217.34 up to 225.84).

Two things this settles and one it cannot:

- **The heads seat against each other, and the lower one seats on the body's
  shoulder.** They do not sit at the body's two ends. The body's top is 0.1 mm
  *below* the upper head's recess floor, so the upper head does not touch it.
- **The piston body is not a member of the chain.** Its 108.669 mm is the
  distance from the shoulder (234.169) down to its far end face (125.500) —
  that is exactly 108.669 — which is the body's own length, not a distance
  between the heads. It belongs to a different question (piston end to the
  stop feature) and is on no edge here. No node ties the upper head to the
  body, since the two do not touch; the lower head's lower face is the same
  plane as the shoulder, and that is the only tie.
- **It cannot say which upper-head face meets the mount's stop.** The mount's
  mesh is a single-part export with no placement, and the cover has no mesh at
  all, so no contact can be read off the geometry. The chain takes the topmost
  plane (face 149) and section 6 shows what each alternative does.

## 3. The fits

Planes fitted with `tolerance_stack/feature_geometry.py` (`fit_face`), distance
along the common normal of two parallel planes.

| Edge | Mesh (sha256 prefix) | Faces | Fit | Residual (rms / max) | Source of the value |
|---|---|---|---:|---|---|
| `piston_head_lower_thickness` | `asm217755_214699_002` (`5dbbe4e15c29`) | 7, 0 | 236.6600 - 234.1690 = **2.4910** | 0 / 0 | the fit |
| `piston_head_upper_thickness` | `asm217755_214698_002` (`8899ea5d7297`) | 113, 149 | 249.1690 - 236.6596 = **12.5094** | 0 / 0 | the fit |
| `gas_spring_mount_flange_to_end_stop` | `machined_213668` (`6d5b1321446d`) | 3, 1080 | 210.8600 - 202.1930 = **8.6670** | 0 / 0 | Jeff's ~8.667; the fit agrees |
| `piston_cover_flange_to_end_stop` | none | none | none | none | Jeff's ~82.154, the only source |

The mount's 8.667 is the one number with two independent routes, and they give
the same value. The cover's 82.154 has no cross-check at all.

A fitted nominal is a measurement of a mesh, never a tolerance: none of the four
carries a band from its source. Each gets **±0.05 mm** (0.10 mm total) as a
placeholder, the width `topology_pitch_system.json` already uses for its
feature-to-feature stand-ins, applied identically to all four so the width says
nothing about which term matters. Each is `kind: assumed`, `confidence:
untraced`, with `PLACEHOLDER BAND` in its note.

The lower head's lower face has a flatness callout and no length (Jeff). That is
recorded as a note on node `endstop_feather_contact`, not as an edge.

## 4. The graph and the signs

New nodes: `endstop_feather_contact` (the datum: lower head against the cover's
end stop), `piston_heads_seat` (lower head against upper head),
`piston_head_upper_top_face`, `piston_cover_mount_flange_seat` (cover against
mount) and `gas_spring_mount_end_stop_face`. New parts: the two heads and the
cover. One further edge, `gas_spring_mount_hub_face_to_cover_seat`, carries no
value and sits in no study; it only keeps the chain attached to the rest of the
linkage so the graph is one piece.

**A deviation from the handoff's node list, and why.** The handoff names the
upper head's upper face against the mount's end stop as one node, the "other
stop". A hard contact is one node, so a study that ended on it would walk the
head stack and the cover stack to the same node and close a ring, which the
walk refuses. The other stop is therefore split into its two sides and the gap
between them is the travel: `travel_between_end_stops`, the derived `gap` edge,
from `piston_head_upper_top_face` to `gas_spring_mount_end_stop_face`. That is
the quantity as Jeff states it, the clearance at the far stop when the piston
sits on the feather stop. The datum is still a contact and still the main
datum; it is the interior node where the two stacks join, not an endpoint.

Every edge is **authored in the +Z direction at the feather stop**, so the signs
come straight off the walk from the upper head's upper face to the mount's end
stop:

| Edge (authored from -> to) | Walked | Sign | Contribution |
|---|---|---:|---|
| `piston_head_upper_thickness` (seat -> upper face) | against | -1 | -12.5094 |
| `piston_head_lower_thickness` (datum -> seat) | against | -1 | -2.4910 |
| `piston_cover_flange_to_end_stop` (datum -> cover flange seat) | with | +1 | +82.1540 |
| `gas_spring_mount_flange_to_end_stop` (mount stop -> cover flange seat) | against | -1 | -8.6670 |

Travel = cover length - mount thickness - lower head - upper head. Both
dimensions that Jeff sums as "piston head thickness" carry the same sign, and
the two he differences as "end stop distance" carry opposite signs, which is his
"sum" and "difference" read through one fold.

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
The two context rows ride in `provenance`.

## 6. The result, and the number Jeff will compare it to

| | mm |
|---|---:|
| Nominal travel | 58.4866 |
| Worst case | 58.2866 to 58.6866 (±0.2000) |
| RSS | ±0.1000 |

The RSS half-width is √(4 × 0.05²) = 0.10; both intervals come from the one
`fold()` and come from the placeholder width alone.

Beside it, with no claim about which is right: the ATP's derived travel is
**65.03 mm** against a **≤65 mm** acceptance row (atp-post, S4ATS-2439), per the
handoff; that row was not re-read here. S461-516/637's nominal operating stroke
is 61.67 mm.

What the choice of upper-head stop face does, holding everything else (stack =
face Z less the datum 234.169; stop-to-stop distance 73.487 = 82.154 - 8.667):

| Upper-head face meeting the stop | Z (part frame) | Head stack | Travel |
|---|---:|---:|---:|
| 149 (topmost, **the working choice**) | 249.1690 | 15.0000 | 58.487 |
| 156 | 245.3751 | 11.2061 | 62.281 |
| 110 | 243.2156 | 9.0466 | 64.440 |
| 0 (bolt seats) | 240.6690 | 6.5000 | 66.987 |

This is a sensitivity of the placeholder, not a reading of the hardware: which
face is the stop is the open question, and a drawing of 214698-002 or the mount's
placement would close it.

## 7. Traced ratio

This study's chain holds four element instances, **none** `traced` (all four are
`untraced`: placeholder band, no drawing). The registry's own metric is the
seeded-stack figure, 5 of 26, which this handoff does not move; it is declared
here so a reader sees the repo's standing number next to this one, per the SOP's "The
traced ratio".

```claim
metric: traced_ratio
value: 5 of 26
```
