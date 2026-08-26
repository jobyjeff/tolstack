# Worksheet — end-stop graft workorder: structured read of Jeff's End Stop stack

Handoff `endstop_graft_workorder`, 2026-08-25. Source workbook:
`data/inbox/tolerance_stacks/260825_End_Stop_JC.xlsx` (see `PROVENANCE.md`).

> **Deliverable 3 (the slice + graft proposal) is blocked.** Chao's "Hardstop
> tol" workbook has not landed in `data/inbox/tolerance_stacks/` as of this
> writing — the HITL export in the handoff is still outstanding. Per the
> handoff's instruction, this worksheet covers deliverables 1, 2 and 4 only:
> the full structured read, a best-effort currency check, and a discrepancy
> ledger. No slice boundary is proposed here and no CSV exists yet — see
> **§6 Discrepancy ledger** for what happens once Chao's sheet lands.

---

## 0. What this workbook is

One sheet, `End Stop Tol Stack`, 505 non-empty cells, rows 1–98. It is **not**
a linear grip-length stack or a diametral fit like the other stacks in this
repo — it is a **blade-pitch angular-position-error rollup** for the propeller
pitch-control mechanism. Every contributor is a linear or diametral source
tolerance (a fastener size, a bearing size, a link length, a mount position)
that gets converted into an *equivalent blade pitch-angle error* through a
motion-ratio sensitivity, because the quantity the "end stop" ultimately
constrains is an angle, not a length.

Two parallel result columns run through the whole sheet:

- **D / E** — the error at blade pitch **−5° (worst case)**, per row 4/71.
- **F / G** — the error using the "**full sweep average**" motion ratio
  (row 10's comment), not a literal average over angle.

Column **B / C** carries the *underlying linear/diametral tolerance* in mm
that each row's D and F values are derived from; **H** carries Jeff's
free-text comment, which is the only source citation most rows have.

**No embedded drawing, no cell comments (the Excel "note" kind), one sheet.**
`xl/worksheets/sheet1.xml` contains 66 `t="shared"` formula cells but only
**two** distinct shared-formula masters (unlike the hub-bearing workbook's
several) — see §5.

---

## 1. Geometry & sensitivity model inputs (not stack elements)

These rows feed the motion-ratio conversion; they are not themselves
tolerance contributors and are **excluded** from the traced/inferred/untraced
count in §4.

| ref | name | value | unit | formula | comment |
|---|---|---:|---|---|---|
| B6 | pitch radius (pinion) | 40 | mm | — | |
| B7 | pitch arm radius | 50 | mm | — | |
| B8 | blade root radius (clocking fastener inx) | 32 | mm | — | |
| B9 | pitch link angle | 77 | deg | — | "at 40deg pitch" |
| D10 | pitch motion ratio (vertical→angle), −5° worst | 1.67 | deg/mm | — (CAD-sourced constant) | "full sweep average" |
| F10 | pitch motion ratio (vertical→angle), average | 1.25 | deg/mm | — (CAD-sourced constant) | |
| B11 | pitch motion ratio (blade-root tangential→angle) | 1.5625 | mm/mm | `=50/32` | "uses ratio of pitch arm to blade root radius" |
| D11 | " | 2.609375 | deg/mm | `=D10*$B11` | |
| F11 | " | 1.953125 | deg/mm | `=F10*$B11` | |
| D12 | pitch motion ratio (horizontal→angle) | 0.386375 | deg/mm | `=D10*$K12` | "horizontal (tangential to pitch plate) tolerances" |
| F12 | " | 0.289203 | deg/mm | `=F10*$K12` | |
| B15 | inner blade-root bearing to ring-gear pitch diameter | 21 | mm | `=106-85` | (radius, used only as an MMC-weighting factor below) |
| B16 | outer blade-root bearing to ring-gear pitch diameter | 94 | mm | `=179-85` | (same) |
| B66 | gas spring bushing vertical separation | 34.7 | mm | — | |
| B67 | pitch link radius from gas spring axis | 83.1 | mm | — | |

**Row 9's comment reads "at 40deg pitch."** Row 4's column header reads
"pitch −5deg (worst)." Both describe the same D-column, and they name
*different* operating pitch angles. This may simply mean the 77° link angle
(B9) is evaluated at 40° blade pitch while the sensitivity ratios themselves
are then applied at the −5° worst-case condition (i.e. two different points
in the mechanism's range feed two different parts of the model) — but that is
an inference, not something the sheet states. **Flagged as F1 in §5.5 —
ask Jeff before trusting the D column's precise numeric value at −5°.**

### 1a. Horizontal-sensitivity block (`J1:N12`, beside the main table)

A small finite-difference derivation of `K12` (the `dy/dx` used in D12/F12
above), not itself a stack element:

| ref | name | value | unit | formula |
|---|---|---:|---|---|
| K2 | theta | 77 | deg | — (= B9) |
| K3 | L (pitch link length) | 109.4 | mm | — |
| K4 | x | 24.609645 | mm | `=K3*COS(RADIANS(K2))` |
| K5 | y | 106.596085 | mm | `=K3*SIN(RADIANS(K2))` |
| K6 | check L | 109.4 | mm | `=SUMSQ(K4,K5)^0.5` (Pythagorean sanity check — passes) |
| K7 | perturb x | 0.1 | mm | — |
| K9 | new theta | 1.342965 | rad (M9/N9 = 76.946244 deg) | `=ACOS((K4+K7)/K3)` |
| K10 | new y | 106.572949 | mm | `=K3*SIN(K9)` |
| K11 | delta y | 0.023136 | mm | `=K5-K10` |
| K12 | dy/dx | 0.231362 | mm/mm | `=K11/K7` |

Reading it: the pitch link is treated as a rigid rod of fixed length `L`
pinned at angle `theta`; perturbing its horizontal projection `x` by 0.1 mm
and re-solving for the new angle gives the corresponding change in vertical
projection `y`. `K12` is that ratio — "how much vertical motion one mm of
horizontal (tangential) slop produces" — and it is what lets a tangential
tolerance be run through the same vertical-motion-ratio (`D10`/`F10`) as
every other row. This is a legitimate linearization, correct at the
mechanism's nominal 77° link angle; it is not re-evaluated at any other pitch
condition anywhere in the sheet.

---

## 2. Contributor elements, by section

Every row below is **untraced** (see §4 — no exceptions). "D" and "F" are the
angular error contributions (deg) at worst-case and average pitch
respectively; "B" is the underlying linear/diametral tolerance (mm) where the
sheet states one directly (some rows go straight to an angular estimate with
no linear precursor — noted).

### 2a. Vertical Components (tangential for gear tols) — rows 15–23

| ref | element | B (mm) | D (deg) | F (deg) | comment |
|---|---|---:|---:|---:|---|
| 17 | blade root seats in hub position tol | 0.12 | 0.258049 | 0.193151 | "diameter MMC" |
| 18 | blade root seat diameter tols (hub side) | 0 | 0 | 0 | "press fit (+.025/-0) total tol width (not +/-)" |
| 19 | blade root ID bearing race surf profile (AB) | 0.05 | 0.107521 | 0.080479 | "essentially behaves as diameter position" |
| 20 | blade root OD bearing race surf profile | 0.10 | 0.048041 | 0.035959 | "essentially behaves as diameter position" |
| 21 | blade root diameter (blade side) | 0.025 | 0.012010 | 0.008990 | |
| 22 | blade root to OML | — | 0.181 | 0.181 (`=D22`) | "Probably closer to .03deg" — **a bare estimate, not derived from a linear tolerance at all** |
| 23 | pitch arm bore size tolerance | 0.04 | 0.066800 | 0.050000 | |

Rows 17/19/20 carry the diameter-MMC weighting factor
(`B16/(B16−B15)` or `B15/(B16−B15)`) baked into their D/F formula — e.g. row
17: `=$B17*D$10*B16/(B16-B15)`. That factor is where B15/B16 (§1) are used.

### 2b. Blade Root Tangential Components — rows 26–27

| ref | element | B (mm) | D (deg) | F (deg) | comment |
|---|---|---:|---:|---:|---|
| 26 | pitch arm fastener-to-fastener tolerance position | 0.03 | 0.078281 | 0.058594 | **"need to correct — based on undersized hole for match drilling"** |
| 27 | pitch arm clocking hole size tolerance | 0.01 | 0.026094 | 0.019531 | |

Row 26's own comment says the value needs correction. It has not been
corrected. Carried into every downstream sum as-is — see §5.5 F2.

### 2c. Vertical Components (continued) — rows 30–45

Shared-formula range (§5): `D30:D45 = $B{row}*D$10`, `F30:F45 = $B{row}*F$10`.

| ref | element | B (mm) | D (deg) | F (deg) | comment |
|---|---|---:|---:|---:|---|
| 30 | pitch arm link hole size tolerance | 0.01 | 0.016700 | 0.012500 | |
| 31 | pitch link length tolerance | 0.06 | 0.100200 | 0.075000 | |
| 32 | pitch plate hole position tolerance | 0.20 | 0.334000 | 0.250000 | |
| 33 | pitch link fastener 1 size | 0.01 | 0.016700 | 0.012500 | **"NAS1154"** — see §3, couldn't-check |
| 34 | pitch link bearing 1 size | 0.013 | 0.021710 | 0.016250 | |
| 35 | pitch link fastener 2 size | 0.01 | 0.016700 | 0.012500 | |
| 36 | pitch link bearing 2 size | 0.013 | 0.021710 | 0.016250 | |
| 37 | pitch plate piston flange (A-datum) to pitch link hole position | 0.20 | 0.334000 | 0.250000 | |
| 38 | piston length tolerance | 0.20 | 0.334000 | 0.250000 | "2 decimals => +/-0.1" |
| 39 | piston end to end stop feature | 0.10 | 0.167000 | 0.125000 | "tol +/-0.05" |
| 40 | pitch plate spherical bearing fastener bore size | 0.01 | 0.016700 | 0.012500 | |
| 41 | lower gas spring body height (top to mounting flange) | 0.20 | 0.334000 | 0.250000 | |
| 42 | tangential link mount height | 0.20 | 0.334000 | 0.250000 | |
| 43 | hub lower bearing flange (a-datum) to top bearing flange | 0.20 | 0.334000 | 0.250000 | |
| 44 | hub top bearing flange to hub top deck | 0.10 | 0.167000 | 0.125000 | |
| 45 | hub top deck to tan link mount | 0.10 | 0.167000 | 0.125000 | |

**Row 39, "piston end to end stop feature," is the row whose name most
directly names the "end stop" itself** — it is the tolerance on the gap
between the piston's travel-limiting end and the physical stop feature it
contacts. Rows 37–45 read as a single vertical-position chain from the pitch
plate's A-datum down through the piston, the gas-spring body, the
tangential-link mount and the hub bearing flanges to the hub top deck — this
looks like the most likely candidate for "the physical joint boundary" the
graft is about, but that is offered as an observation for Jeff, not a
proposed slice (deliverable 3 is blocked — see the banner at the top).

### 2d. Tangential Components — rows 48–64

Shared-formula range (§5): `D48:D64 = $B{row}*D$12`, `F48:F64 = $B{row}*F$12`.

| ref | element | B (mm) | D (deg) | F (deg) | comment |
|---|---|---:|---:|---:|---|
| 48 | pitch plate to link tangential position | 0.20 | 0.077275 | 0.057841 | |
| 49 | pitch link fastener 1 size | 0.01 | 0.003864 | 0.002892 | |
| 50 | pitch link bearing 1 size | 0.013 | 0.005023 | 0.003760 | |
| 51 | tangential link position (pitch plate) | 0.15 | 0.057956 | 0.043380 | |
| 52 | tan link length | 0.06 | 0.023183 | 0.017352 | |
| 53 | tan link fastener 1 size | 0.01 | 0.003864 | 0.002892 | |
| 54 | tan link bearing 1 size | 0.013 | 0.005023 | 0.003760 | |
| 55 | tan link fastener 2 size | 0.01 | 0.003864 | 0.002892 | |
| 56 | tan link bearing 2 size | 0.013 | 0.005023 | 0.003760 | |
| 57 | tan link mount position (mount) | 0.20 | 0.077275 | 0.057841 | **"does not exist yet. Must roll up ring gear seat and tan link mount position"** |
| 58 | tan link mount size (hub feature) | 0.05 | 0.019319 | 0.014460 | |
| 59 | tan link mount size (mount feature) | 0.06 | 0.023183 | 0.017352 | |
| 60 | gas spring mount size (tan link mount feature) | 0.06 | 0.023183 | 0.017352 | |
| 61 | gas spring mount position (tan link mount feature) | 0.20 | 0.077275 | 0.057841 | |
| 62 | gas spring bushing position | 0.20 | 0.077275 | 0.057841 | |
| 63 | gas spring bushing clearance | 0.18 | 0.069548 | 0.052057 | "based on TB tolerances (catalog p~239)" — see §3, couldn't-check |
| 64 | blade root to hub tolerance | 0.12 | 0.046365 | 0.034704 | "blade roots =0.12, ring gear needs positional tolerace [sic]" |

**Row 57's own comment says the row's value is placeholder** ("does not
exist yet") and yet it carries a real 0.2 mm value that flows into every sum
that includes row 57. This is the same pattern as row 26 — a comment
admitting the number is provisional, with no flag anywhere else in the
sheet. See §5.5 F2.

### 2e. Gas-spring backlash (row 68) — outside the main sum range

| ref | element | B (mm) | D (deg) | F (deg) | comment |
|---|---|---:|---:|---:|---|
| 68 | gas spring bushing tipping backlash (vert. component) | `=B63/B66*B67` → 0.431066 | 0.719881 | 0.538833 | "how much cyclic backlash is allowed by the gas spring piston tipping within it's bushing (resulting in pitch plate tip)" |

Row 68 is **derived**, not a raw tolerance: it combines row 63 (gas spring
bushing clearance), row 66 and row 67 (§1) into an angular tip. **It is the
single largest individual D-column contributor in the sheet (0.72°, larger
than any row in §2a–2d) and it is excluded from "Collective error totals"**
(§2f sums `D17:D64` and `F17:F64` — row 68 is out of that range). It is
*included* in the deprecated "OLD STUFF" cyclic-backlash totals (§2g, rows
89/95/97). See §5.5 **F3 — the current headline total appears to omit its
largest single contributor.**

### 2f. Collective error totals — rows 70–75

| ref | quantity | B (mm) | D (deg) | F (deg) | formula | comment |
|---|---|---:|---:|---:|---|---|
| 72 | total blade OML angular position tol (worst case) | 3.55 | 4.091711 | 3.108179 | `SUM(_17:_64)` | "note this is total range (divide by 2 for +/-)" |
| 73 | bi-directional (±) | 1.775 | 2.045856 | 1.554090 | `=_72/2` | |
| 74 | total blade OML angular position tol (RSS) | 0.740182 | 0.962327 | 0.730236 | `SUMSQ(_17:_64)^0.5` | "note this is total range (divide by 2 for +/-)" |
| 75 | bi-directional (±) | 0.370091 | 0.481163 | 0.365118 | `=_74/2` | |

**The B-column total (row 72/74, 3.55 mm worst-case, 0.74 mm RSS) mixes
vertical and tangential linear tolerances in one raw millimetre sum.**
Elements in §2a/2c act in the vertical/gear direction and elements in §2d
act in the tangential direction; only the D and F columns put every element
into the *same* effective direction (blade pitch angle) via the motion-ratio
conversion, so **the B-column total is not a physically meaningful stack** —
it is a byproduct of the same SUM formula being dragged across a column that
happens to hold mixed-direction linear values. The D and F totals are the
real result of this sheet. Flagged so it is not mistaken for a usable number
if the graft references "the mm total."

`D71`/`F71` (row 71) are the column headers repeated as data cells
(`D71 = -5`, `F71 = "average"`, a literal string) — not tolerance values.

### 2g. "Blade to ring gear" — row 77, empty

A section header with nothing under it before "OLD STUFF" begins at row 80.
Rows 78–79 are blank. Either a placeholder for content Jeff intended to add,
or a leftover heading from content that moved/was deleted. Not filled in
either case — flagged, not guessed at.

### 2h. "OLD STUFF" — rows 80–98, superseded

Three deprecated rollups (Backlash Totals, Cyclic Error Totals, Cyclic
Backlash Totals), each a hand-picked `SUM`/`SUMSQ` over a subset of the same
element cells used in §2a–2e, evidently superseded by the "Collective error
totals" in §2f (row 95's own comment: "Needs updating (all lines)"). Included
here for completeness and because §2e's finding (row 68) surfaced by
comparing this section against §2f, but **none of these three totals should
be used as current** — that is what "OLD STUFF" as a section title says.

| ref | quantity | D (deg) | F (deg) | cell list | comment |
|---|---|---:|---:|---|---|
| 82 | collective backlash (worst case) | 0.812331 | 0.608033 | `D18,D21,D23,D27,D30,D33,D34,D35,D36,D38:D40,D49,D50,D53,D54,D55,D56,D63` | "take with grain of salt. Does not include VPA output bearing etc." |
| 84 | collective backlash (RSS) | 0.389548 | 0.291578 | same set | |
| 89 | cyclic error (worst case) | 2.438818 | 1.870984 | `D17,D18,D19,D20,D21,D22,D23,D26,D27,D30,D31,D32,D33,D34,D35,D36,D57,D58,D59,D60,D61,D62,D63,D64,D68` | "also take with grain of salt … in parallel with bevel gears" |
| 91 | cyclic error (RSS) | 0.523793 | 0.410022 | same minus D68 | |
| 95 | cyclic backlash (worst case) | 1.770158 | 1.324968 | `D19,D20,D21,D23,D27,D30,D33,D33,D34,D35,D36,D38,D39,D40,D49,D50,D53,D54,D55,D56,D58,D59,D60,D63,D68` | "Needs updating (all lines)" |
| 97 | cyclic backlash (RSS) | 0.827993 | 0.619755 | same set | |

Row 95/97's cell list cites **`D33` twice** (`…D33,D33,D34…`). Verified
against the cached total (§5) — the doubled reference is exactly what the
cached value implies, i.e. it is a real, deliberate double-count in the
formula as written, not a transcription slip on my part. Whether *Jeff*
intended pitch-link-fastener-1's tolerance to count twice in this superseded
total is unknown and moot, since this section is superseded — noted only so
a future reader does not "fix" what looks like a typo and isn't one.

---

## 3. Currency check (deliverable 2)

Best-effort only — this workbook predates the SOP and almost nothing in it
names a drawing zone. Checked against `data/inbox/drawings/` (main checkout;
holds only the five hub-bearing drawings, none relevant to this joint) and
drawing-checker's structured extractions at `C:\workspace\drawing-checker\data\`
(read-only, absolute path).

| workbook quantity | verdict | citation / reason |
|---|---|---|
| Row 33 "pitch link fastener 1 size" 0.01 mm, comment "NAS1154" | **couldn't-check** | No `NAS1154` document in `data/inbox/specs/` (confirmed by directory listing). `NAS1121 THRU 1128_REV_14.pdf` and `NAS6403-NAS6420 Rev 4.pdf` are in the pile but do not cover 1154 — not close enough to substitute as a citation. |
| Row 66 "gas spring bushing vertical separation" 34.700 mm | **couldn't-check** | Checked drawing-checker's `213668-002 A.1 MOUNT, GAS SPRING, PROPELLER` extraction (both the 2026-07-14 and the more complete 2026-07-27 run). Its structured JSON captures title block, revision block, notes and parts list only — individual linear dimensions exist only as rendered page images/crops, not as extracted values a text search can read. |
| Row 67 "pitch link radius from gas spring axis" 83.1 mm | **couldn't-check** | Same source, same schema gap as row 66. |
| Rows 66/67, secondary pass | **couldn't-check** | Grepped the 217755 assembly's balloon/revision-diff JSONs (`data/runs/*217755*`) for `34.7` / `83.1`. All hits are bounding-box pixel coordinates (e.g. `1434.7`, `1783.12`) — false positives, no genuine dimension match. |
| Row 63 "gas spring bushing clearance" 0.18 mm, comment "based on TB tolerances (catalog p~239)" | **couldn't-check** | Nothing in `data/inbox/specs/` or `docs/tolerance_stacks/` resolves what "TB" is or identifies a page ~239. `RBC - Plain bearings (NAS77 p92).pdf` and `RBC_Aerospace_Plain_Bearings_Web.pdf` are the pile's closest bushing/bearing catalogs — **not** claimed as a match, just noted as the nearest thing present. |
| Rows 51/52/57–62 (tan link position/length/mount, gas spring mount size/position) vs. `stack_tan_link_to_pitch_plate(.json/_take2)`, `stack_vpa_output_to_pitch_plate.json` | **no genuine correspondence — different physical quantity** | Those stacks are axial grip-length stacks for 217755 sheet 4 DETAIL B / sheet 5 DETAIL X (bolt-grip thicknesses); this workbook's rows are position/size tolerances of the mount features in a different (tangential/vertical) direction. Same assembly, not the same dimension — not usable as a cross-check. |

**Every row in this workbook is a couldn't-check or has no drawing/spec
citation at all to even attempt one.** Deliverable 2's outcome is itself a
finding: this is the least-traceable source workbook in the repo so far (see
§4).

---

## 4. The count

Contributor elements: §2a (7) + §2b (2) + §2c (11) + §2d (17) + §2e (1) = **38
element instances**, all rows 15–68 minus the pure geometry inputs of §1.

> **38 traced / 0 inferred / 38 untraced.**

No exceptions register. Nothing in this workbook cites a drawing zone, a
released spec, or even names a document that is in the repo (NAS1154 is named
but absent — naming a document that cannot be opened does not trace a value,
it is still `untraced` by SOP vocabulary). For comparison, the previous low
mark in this repo was `pitch_link_to_pitch_plate` at 4 of 6 in a
from-scratch stack, and the hub-bearing M1 sheet at 4 of 8 in a superseded
workbook read. **This workbook traces 0 of 38.** That is not a defect in the
transcription — the workbook is Jeff's own working scratchpad, built for
himself before there was an SOP that asked for citations, and it says so in
its own comments ("estimate," "probably," "need to correct," "does not exist
yet," "needs updating").

The 11 geometry/sensitivity inputs in §1 are excluded from this count for the
same reason the hub-bearing worksheet excluded CTEs and temperatures: they
are model parameters (a pitch radius, a link length, a CAD-sourced motion
ratio), not toleranced dimensions of a physical feature.

---

## 5. Re-derivation

No independent second computation method exists to compare this workbook
against — unlike the thermal-fit archetype (which has a coherent-corner
method to compare against `fold()`), this is a single-pass linear rollup with
no as-designed/as-built pair and no alternative formula for the same
quantity. What *was* checked, using the parser's shared-formula pattern
(`tests/debug_dump_tol_stack_xlsx.py`) plus a one-off recompute script (not
committed — read the raw cached cells and recompute in Python):

- **Shared-formula masters.** Two, not several: `D30:D45`/`F30:F45` follow
  `$B{row}*D$10` / `$B{row}*F$10`; `D48:D64`/`F48:F64` follow
  `$B{row}*D$12` / `$B{row}*F$12`. Every populated cell in both ranges
  recomputed from its own `B` value and the master's pattern and matched the
  cached value to float precision (max delta ~1e-9, i.e. none — the earlier
  cases in this repo had genuine float-summation noise at 1e-14; here there
  is none because the recompute is a single multiply, not a long chain).
- **Every `SUM`/`SUMSQ` total in the sheet** (rows 72, 74, 82, 89, 95, and by
  extension 73/75/83/90/92/96/98, which are simple halvings of these)
  recomputed from the individual cached cells it references and matched the
  cached total, including the two hand-picked, irregular cell lists at rows
  89 and 95 (the ones most likely to carry a hand-authored slip, per the
  hub-bearing worksheet's F3 precedent). **No arithmetic slip found anywhere
  in this sheet.** The issues below are modelling/currency issues, not
  arithmetic ones.

### 5.5 Findings

**F1 `[read]`** — Row 9's comment ("at 40deg pitch") and row 4's column
header ("pitch −5deg (worst)") name two different pitch-angle conditions for
what reads as the same D-column. Ask Jeff which condition the D-column
figures actually represent before quoting one.

**F2 `[model]`** — Two rows carry a value the sheet's own comment calls
provisional, with no correction applied and no flag propagated to the totals
that consume them: row 26 ("need to correct — based on undersized hole for
match drilling," 0.03 mm, feeds §2f's totals) and row 57 ("does not exist
yet. Must roll up ring gear seat and tan link mount position," 0.2 mm, feeds
§2f's totals). Both are counted at face value in every total in §2f.

**F3 `[model]`** — Row 68 (gas-spring bushing tipping backlash, 0.72°
worst-case) is this sheet's single largest individual contributor and is
**excluded** from "Collective error totals" (§2f, which sums `_17:_64`; 68 is
outside that range) while being **included** in the deprecated "OLD STUFF"
cyclic-backlash totals (§2h). If §2f is the number anyone downstream is
quoting as "the" end-stop tolerance budget, it is currently missing its
largest term.

**F4 `[model]`** — The row-72/74 **B-column** (mm) totals sum
vertical-direction and tangential-direction linear tolerances together in one
raw millimetre figure. That sum has no physical meaning — the D and F columns
(both expressed in the common unit of blade-pitch-angle degrees, via the
motion-ratio conversion) are the sheet's real result. Do not quote the mm
total as if it were a usable stack answer.

---

## 6. Discrepancy ledger (deliverable 4)

Everything Jeff should look at before any of this is sent to Chao:

1. **Chao's sheet has not landed** (HITL item 1 in the handoff) — deliverable
   3 (slice boundary, graft CSV, mapping table) does not exist yet. Once
   `260825_Hardstop_tol_Chao.xlsx` is copied into
   `data/inbox/tolerance_stacks/` with a `PROVENANCE.md` entry, deliverable 3
   can start from this worksheet's §2c (rows 37–45, the vertical chain that
   most plausibly matches a "hardstop" joint by name) as the first place to
   look for the slice boundary — not as a pre-committed answer.
2. **F1** — which pitch-angle condition the D-column actually represents
   (row 9 vs. row 4's header disagree). Needs Jeff.
3. **F2** — rows 26 and 57 carry self-admittedly provisional values, uncorrected,
   flowing into every current total. Needs Jeff to supply corrected numbers
   or confirm the current ones stand.
4. **F3** — the "Collective error totals" (§2f), which read as the sheet's
   headline number, omit row 68's 0.72° contribution that the deprecated
   "OLD STUFF" totals included. Needs Jeff to confirm whether §2f should be
   extended to include it, or whether it was deliberately dropped and why.
5. **F4** — do not carry the B-column (mm) total forward into anything sent
   to Chao; it mixes directions and is not a valid physical quantity. The D/F
   degree totals are the only usable rollup numbers in this sheet.
6. **Zero currency-checkable rows** (§3) — every named part/spec in this
   workbook (NAS1154, the "TB" catalog, the gas-spring-mount dimensions) is
   either absent from the repo or extracted at a level of detail (title
   block / notes / parts list, not individual dimensions) that could not
   confirm or refute a single value in this sheet. If any of NAS1154, the gas
   spring mount drawing's individual dimensions, or the "TB" catalog page can
   be supplied, re-run this check against them before the graft is sent.
7. **Section 2g ("Blade to ring gear") is an empty header** — either
   unfinished content or a stale leftover heading. Ask Jeff which.

---

## Reproducing this worksheet

```powershell
venv-win\Scripts\python.exe tests\debug_dump_tol_stack_xlsx.py "data/inbox/tolerance_stacks/260825_End_Stop_JC.xlsx"
venv-win\Scripts\python.exe -m pytest -q
```

No new stack JSON or parsing helper was added for this handoff — the existing
stdlib xlsx dumper was sufficient, and this sheet's shape (angular rollup, not
`stack_definition/v0`'s elements/paths/checks) does not fit the existing
`tolerance_stack` package's load functions without a new archetype, which is
explicitly out of scope for this workorder (the handoff works from workbooks,
not a from-drawings derivation).
