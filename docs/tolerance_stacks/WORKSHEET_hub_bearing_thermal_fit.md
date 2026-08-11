# Worksheet — hub bearing seats, two-stage thermal shrink fit

Stacks `hub_bearing_thermal_fit_m2` (the current design) and
`hub_bearing_thermal_fit_m1` (the as-built configuration that slipped).
Handoff `hub_bearing_thermal_stack`, 2026-08-05.

Source workbook: `data/inbox/tolerance_stacks/260209_Hub Bearing Fits.xlsx`.
Archetype: `docs/tolerance_stacks/ARCHETYPE_thermal_fit.md` — **read that first if
you are reading a number out of this file.**

> **Sign convention: interference is POSITIVE in this worksheet and NEGATIVE in
> the workbook** ("negative is inx"). Every comparison against a workbook cell
> below is negated, and says so. A negative number here is a **clearance**, which
> is a failure.

---

## The headline

**M2's upper bearing seat reads `marginal` at the hot loose corner, on both
stages.** Nominal interference exists; the loosest corner's does not. No single
build is guaranteed to hold, so the joint is not settled analytically.

The workbook already reported one of those two clearances (`M2!H43`, the stage-2
one). It could not report the other, because its column layout cannot express the
combination that produces it — see **F1**, which is the most consequential finding
in this worksheet.

**And the upper seat is the seat the M2 change did not touch.** Rows 31–44 are
**numerically** identical between the two sheets — every value and every formula,
which is what a test asserts; the only differences in that row block are in the
comment column (`O31` names 212966-**005** on M2 and 212966-**004** on M1, `O32`
differs by a trailing space, and M1 carries a tolerance-change note in `O34` that
M2 does not). The M2 change thickened and tightened the *lower* sleeve only.

Traced / inferred / untraced, as a ratio:

| stack | element instances | traced | inferred | untraced |
|---|---:|---:|---:|---:|
| `hub_bearing_thermal_fit_m2` | 8 | **8** | 0 | 0 |
| `hub_bearing_thermal_fit_m1` | 8 | 4 | 2 | 2 |

8-of-8 is not a reason to relax. **It is a reason to look at what is not in that
count**, which is every number the answer is most sensitive to:

| value | count | confidence | why it is not an element |
|---|---:|---|---|
| CTE (hub, sleeve, bearing) | 3 | **untraced** | material property — `materials.json` |
| operating temperatures (hot, cold) | 2 | **untraced** | a scenario, not a dimension |
| stiffness ratio | 2 | **untraced** | dimensionless |

**Not one CTE in this repo is traced to anything.** Every dimension is traced;
every *property* is a spreadsheet cell. That is the honest state and it is where a
reviewer's time is worth most.

---

## 1. The joint

Two independent shrink-fit chains in one hub, one per bearing seat. Neither is
retained by a fastener — interference alone holds each joint, which is why the
criterion is a sign rather than a margin.

| seat | outer member | middle member | inner member |
|---|---|---|---|
| **LOWER** | 212966-006 A hub bore ⌀202.140 | 214955-004 A sleeve, bore ⌀200.000, wall 1.190 | 214589-002 A bearing, OD ⌀200.000 |
| **UPPER** | 212966-006 A hub bore ⌀132.073 | 214959-002 A sleeve, bore ⌀129.968, wall 1.110 | 214588-002 A bearing, OD ⌀130.000 |

As-drawn part numbers and title-block nomenclature:

| part | rev | nomenclature (title block) | release |
|---|---|---|---|
| 212966-006 | A | PROPELLER HUB, DUAL BEARING GEN 5 | 30/Mar/2026 |
| 214955-004 | A | HUB SPINDLE SLEEVE, LOWER, PROPELLER | 06/Apr/2026 |
| 214959-002 | A | HUB SPINDLE BEARING SLEEVE, UPPER, PROPELLER | 27/JUN/2025 |
| 214589-002 | A | BEARING, ANGULAR CONTACT, ID 160, OD 200 | 11/NOV/2025 |
| 214588-002 | A | BEARING, ANGULAR CONTACT, ID 95, OD 130 | 11/NOV/2025 |

All five `MATURITY STATE: Released`. Copies and hashes in
`data/inbox/drawings/PROVENANCE.md`.

### Identity — `inferred`, by chained diameters, not by counting

SOP Step 1's identity-by-count is for a joint named in words that are not in a
parts list. This is not that case: the workbook names its own parts in its
comment column. What had to be resolved instead was **which drawing is which
part**, and the chain is:

1. the workbook's comment column names them — `O13` "212966-005", `O14` "wear
   ring: 214955-003", `O31` "212966-005", `O32` "wear ring: 214959-002";
2. the hub drawing carries exactly **two** bearing-seat bores, ⌀202.140 ±0.015
   (sh3 DETAIL E) and ⌀132.073 ±0.017 (sh3 DETAIL D), matching the workbook's two
   row blocks to three decimals **including tolerance**;
3. 214955-004's title block reads **LOWER** and its bore is ⌀200.000, which only
   fits the 202.140 seat; 214959-002 reads **UPPER**, bore ⌀129.968, only fits
   132.073;
4. each bearing pairs to the sleeve whose bore equals its OD — the ID160/OD200
   bearing into the lower sleeve, the ID95/OD130 into the upper.

Four independent agreements. **The pairing is not the part-number order**: 214588
(the *smaller* bearing) sorts before 214589 (the larger) while the sleeves sort
the other way, so anyone matching the five filenames in sequence pairs them
backwards. This is trap 11 in a new costume — a *number* matching (five drawings,
five parts) is not a *feature* matching.

### `[drift]` The drawings are later than the workbook

| | workbook models | drawing in hand | dimensions agree? |
|---|---|---|---|
| hub | 212966-**005** (M2) / -**004** (M1) | 212966-**006** A | **yes** — both bores identical, value and band |
| lower sleeve | 214955-**003** (M2) / -**002** (M1) | 214955-**004** A | **no** — wall 1.190 vs 1.18 (see F2) |
| upper sleeve | 214959-002 | 214959-002 A | yes |
| bearings | (unnumbered in the sheet) | 214589-002 A, 214588-002 A | yes, bands exactly |

Where they disagree, **the stack takes the drawing** and the divergence is a
finding. It is never reconciled away.

### Scope — what is deliberately out

- **THE INNER SIDE OF THE BEARINGS.** The bearing-bore-to-spindle fit and the
  spindle sleeves are excluded: that joint is owned by a separate team Jeff works
  closely with (Jeff, 2026-08-05). This is a **scope boundary, not a gap.** Both
  bearing bores are printed on the drawings in hand (⌀160.000 0/−0.018 and
  ⌀95.000 0/−0.008) and both are transcribed into `hardware_entries.json` as
  traced values marked `DELIBERATELY UNUSED`, so whoever sweeps that joint in
  later does not re-read the drawings.
- **All axial dimensions.** Bearing width, sleeve length, seat depth, axial gap,
  preload. The workbook is radial only — and this matters more than a normal
  scope note, because the workbook's own `Decision Matrix` sheet says the M2
  assembly drawings **already added an axial-gap inspection step** and lists
  "axial gap (causes slip/loss of preload)" as candidate root cause number one.
  The axial half of the same investigation exists and is not analysed here.
- **The sleeve flange.** 214955-004 is an L-section: a radial flange of axial
  thickness 1.110 ±0.035 with bore ⌀191.50 ±0.15. Only the cylindrical wall
  participates in the fit.
- **Hoop stress, contact pressure, and whether the interference is survivable or
  sufficient.** See the torque caveat below.
- **Surface roughness.** Ra 0.8 flags appear in *both* hub bore details on sheet 3
  — two at C11/E11 beside DETAIL E (202.140) and two at G10/G11 beside DETAIL D
  (132.073) — against Ra 3.2 general per note 7; the sleeves are Ra 3.2 general.
  Which face each flag attaches to was not resolved by crop, because roughness is
  out of scope either way.
- **Coating thickness at the interfaces** — see F5.
- **Bearing internal geometry, outer-ring thickness, radial internal clearance.**
  The bearing is an OD.

### The caveat that goes next to the numbers

**A dimensional interference is not a torque capacity.** These checks say the
parts touch at every corner (or, at the upper seat's hot corner, that they might
not). They do not say the joint can carry the torque that would spin the bearing
outer ring in its seat — that needs contact pressure, friction coefficient and
hoop stress, none of which is a tolerance question. So a `pass` here is a
necessary condition, not a sufficient one.

This is the direct analogue of the SOP's castellated-nut caveat, and it is stated
here, beside the results, for the same reason: **a clean-looking interval must not
imply a resolved joint.** The SOP's own caveat does *not* apply — there is no
slotted nut and no cotter pin anywhere in this joint, so nothing quantises.

---

## 2. Ordered elements

Physical order, outermost first. Bands are lengths; `conf` is the result, not
decoration.

### `hub_bearing_thermal_fit_m2` — 8 traced, 0 inferred, 0 untraced

| element | nominal | min | max | lmc | mmc | source | conf |
|---|---:|---:|---:|---:|---:|---|---|
| `hub_bore_lower` | 202.140 | 202.125 | 202.155 | 202.155 | 202.125 | 212966-006 A sh3 C9 DETAIL E `⌀ 202.140 ±0.015` | traced |
| `sleeve_bore_lower` | 200.000 | 199.975 | 200.025 | 200.025 | 199.975 | 214955-004 A sh1 G3 `⌀ 200.000 ±0.025` | traced |
| `sleeve_wall_lower` | 1.190 | 1.165 | 1.215 | 1.165 | 1.215 | 214955-004 A sh1 G8 `1.190 ±0.025` | traced |
| `bearing_od_lower` | 200.000 | 199.980 | 200.000 | 199.980 | 200.000 | 214589-002 A sh1 F5 `⌀ 200.000 0.000/-0.020` | traced |
| `hub_bore_upper` | 132.073 | 132.056 | 132.090 | 132.090 | 132.056 | 212966-006 A sh3 G9 DETAIL D `⌀ 132.073 ±0.017` | traced |
| `sleeve_bore_upper` | 129.968 | 129.943 | 129.993 | 129.993 | 129.943 | 214959-002 A sh1 G4 `⌀ 129.968 ±0.025` | traced |
| `sleeve_wall_upper` | 1.110 | 1.085 | 1.135 | 1.085 | 1.135 | 214959-002 A sh1 G5 `1.110 ±0.025` | traced |
| `bearing_od_upper` | 130.000 | 129.991 | 130.000 | 129.991 | 130.000 | 214588-002 A sh1 D5 `⌀ 130.000 0.000/-0.009` | traced |

### `hub_bearing_thermal_fit_m1` — 4 traced, 2 inferred, 2 untraced

| element | nominal | min | max | source | conf |
|---|---:|---:|---:|---|---|
| `hub_bore_lower` | 202.140 | 202.125 | 202.155 | `M1!C13`, band `D13`/`E13` | **inferred** |
| `sleeve_bore_lower` | 200.035 | 200.010 | 200.060 | `M1!C17`, band `D16`/`E16` | **untraced** |
| `sleeve_wall_lower` | 1.125 | 1.100 | 1.150 | `M1!C15`, band `D14`/`E14` | **untraced** |
| `bearing_od_lower` | 200.000 | 199.980 | 200.000 | 214589-002 A sh1 F5 | traced |
| `hub_bore_upper` | 132.073 | 132.056 | 132.090 | `M1!C31`, band `D31`/`E31` | **inferred** |
| `sleeve_bore_upper` | 129.968 | 129.943 | 129.993 | 214959-002 A sh1 G4 | traced |
| `sleeve_wall_upper` | 1.110 | 1.085 | 1.135 | 214959-002 A sh1 G5 | traced |
| `bearing_od_upper` | 130.000 | 129.991 | 130.000 | 214588-002 A sh1 D5 | traced |

**The two `inferred`s, stated so they can be rejected.** 212966-004 is not in the
repo. 212966-006 rev A — two revisions later, in hand — prints *identical* values
and bands for both bores. A later revision of the same drawing carrying the same
callout is real corroboration that the workbook transcribed its own revision
correctly. It is **not** evidence about -004: the bore could have changed at -005
and changed back. Downgrade both to `untraced` if that argument is not accepted;
the 212966-004 drawing closes it either way and is listed as a gap.

The two `untraced`s have no such corroboration — 214955-004's bore and wall are
*deliberately different*, so the later revision says nothing about the earlier
one.

### Material conditions — mixed, and mixed the right way round

`max == mmc` on every element is the review checklist's smell. **This stack has
four of each**, because a bore's least-material condition is its *larger* size:

| `max == lmc` (internal features) | `max == mmc` (external features) |
|---|---|
| `hub_bore_lower`, `hub_bore_upper` | `sleeve_wall_lower`, `sleeve_wall_upper` |
| `sleeve_bore_lower`, `sleeve_bore_upper` | `bearing_od_lower`, `bearing_od_upper` |

`min <= nominal <= max` holds for all sixteen element instances (F1 clean). Two
sit **on** a limit rather than inside it, both legitimately: the bearing ODs are
drawn basic-size-minus (`0/−0.020`, `0/−0.009`), so 200.000 and 130.000 *are* the
maxima. Neither is a computed midpoint.

No chamfer, relief or counterbore participates in either chain, so no element is
subtracted as a *material* feature — the negative signs in the term lists are on
whole members entering an interference difference, not on removed material.

## 3. Paths

**None.** Both stacks have `paths: []`. In this archetype a stage's term list *is*
the expression, and a named intermediate (a sleeve OD, an installed bore) would be
a second place a value could be wrong. The intermediates are algebraically
collected into each stage's weights instead — see the archetype doc's arithmetic
section for the substitution.

## 4. Checks — nominal, worst case, RSS, verdict

Criterion is `>= 0` on interference for every check. **The worst-case minimum is
the binding number**: it is the loosest corner, and looseness is what the
criterion is about.

### `hub_bearing_thermal_fit_m2` (the current design)

| check | nominal | WC min (loosest) | WC max (tightest) | RSS center | RSS ± | verdict |
|---|---:|---:|---:|---:|---:|---|
| `lower_seat__hub_to_sleeve__cold` | 0.34291 | 0.25296 | 0.43287 | 0.34291 | 0.05785 | pass |
| `lower_seat__hub_to_sleeve__room` | 0.24000 | 0.15000 | 0.33000 | 0.24000 | 0.05788 | pass |
| `lower_seat__hub_to_sleeve__hot` | 0.10621 | **0.01616** | 0.19627 | 0.10621 | 0.05791 | pass |
| `lower_seat__sleeve_to_bearing__cold` | 0.26153 | 0.18457 | 0.31850 | 0.25153 | 0.04321 | pass |
| `lower_seat__sleeve_to_bearing__room` | 0.19200 | 0.11500 | 0.24900 | 0.18200 | 0.04323 | pass |
| `lower_seat__sleeve_to_bearing__hot` | 0.10161 | **0.02456** | 0.15865 | 0.09161 | 0.04326 | pass |
| `upper_seat__hub_to_sleeve__cold` | 0.18226 | 0.09030 | 0.27421 | 0.18226 | 0.05840 | pass |
| `upper_seat__hub_to_sleeve__room` | 0.11500 | 0.02300 | 0.20700 | 0.11500 | 0.05843 | pass |
| `upper_seat__hub_to_sleeve__hot` | 0.02757 | **−0.06449** | 0.11963 | 0.02757 | 0.05846 | **marginal** |
| `upper_seat__sleeve_to_bearing__cold` | 0.18770 | 0.11594 | 0.25046 | 0.18320 | 0.04779 | pass |
| `upper_seat__sleeve_to_bearing__room` | 0.13550 | 0.06370 | 0.19830 | 0.13100 | 0.04781 | pass |
| `upper_seat__sleeve_to_bearing__hot` | 0.06764 | **−0.00421** | 0.13049 | 0.06314 | 0.04784 | **marginal** |

Stiffness-ratio sensitivity — **`[SENSITIVITY]`, not results.** `k` is a workbook
estimate with no derivation; these show its reach. Stage 1 never depends on it.

| check | nominal | WC min | verdict |
|---|---:|---:|---|
| `lower_seat__sleeve_to_bearing__hot__k0` | 0.01664 | −0.02839 | marginal |
| `lower_seat__sleeve_to_bearing__hot__k1` | 0.12285 | 0.03780 | pass |
| `upper_seat__sleeve_to_bearing__hot__k0` | 0.04283 | 0.00881 | pass |
| `upper_seat__sleeve_to_bearing__hot__k1` | 0.07040 | −0.00565 | marginal |

### `hub_bearing_thermal_fit_m1` (as-built — the control)

| check | nominal | WC min (loosest) | WC max | RSS center | RSS ± | verdict |
|---|---:|---:|---:|---:|---:|---|
| `lower_seat__hub_to_sleeve__cold` | 0.24795 | 0.15800 | 0.33791 | 0.24795 | 0.05785 | pass |
| `lower_seat__hub_to_sleeve__room` | 0.14500 | 0.05500 | 0.23500 | 0.14500 | 0.05788 | pass |
| `lower_seat__hub_to_sleeve__hot` | 0.01116 | **−0.07889** | 0.10122 | 0.01116 | 0.05791 | **marginal** |
| `lower_seat__sleeve_to_bearing__cold` | 0.15058 | 0.07361 | 0.20755 | 0.14058 | 0.04321 | pass |
| `lower_seat__sleeve_to_bearing__room` | 0.08100 | 0.00400 | 0.13800 | 0.07100 | 0.04323 | pass |
| `lower_seat__sleeve_to_bearing__hot` | **−0.00945** | **−0.08650** | 0.04759 | −0.01945 | 0.04326 | **fail** |
| `upper_seat__*` | *identical to M2's, element for element* | | | | | pass / pass / marginal |

`fail` on `lower_seat__sleeve_to_bearing__hot` means **even the nominal build has
a clearance** — not a tolerance edge case, a clearance at the middle of every
band. That is the configuration that slipped.

M2 improved the lower seat at every one of its twelve corners and left the upper
seat numerically untouched. Both statements are asserted by tests.

### What the RSS columns do and do not claim

`fold()` combines half-ranges in quadrature about the **midpoint** sum, treating
each band as an independent, symmetric, equal-confidence variate. Here:

- **the two bearing OD bands are one-sided** (`0/−0.020`, `0/−0.009`) and so are
  not symmetric about their midpoints. This is why every `sleeve_to_bearing` row
  has `RSS center` below `nominal` by exactly 0.010 (lower) or 0.0045 (upper):
  that offset is bookkeeping, not statistics;
- **temperature is a scenario, not a variate.** Each check is at one temperature.
  An RSS half-range inside one check says nothing about the probability of being
  at that temperature, and the three temperature rows must never be RSS'd against
  each other;
- **the sleeve wall enters at `coefficient: 2`, deliberately.** Listing it twice
  would give the same worst case and an RSS half-range 20% smaller (0.0465 vs
  0.0584 on `upper_seat__hub_to_sleeve__room`). The two walls across a diameter
  are one turned dimension — perfectly correlated — so the doubled coefficient is
  correct and the duplicated term would understate the spread.

So RSS here is a **relative softening indicator, not a probability statement**,
and not directly comparable to the worst-case columns. **No verdict reads RSS** —
`CheckResult.verdict` cannot see it.

There are no zero-width bands in either stack, and no `role: "allowance"`
elements.

---

## 5. Re-derivation vs the source

Two distinct comparisons, and conflating them is easy, so both are here.

### 5a. The workbook re-derives against itself: 427 cells, zero mismatches

`tests/test_hub_bearing_rederivation.py`. Every formula cell of all three sheets
— 206 on M2, 205 on M1, 16 on `Decision Matrix` — recomputed from the workbook's
own inputs. **Worst delta 2.842e-14** (on `M1!H18`, the longest chain), which is
float summation order. The committed `CACHED` table covers all **480** numeric
cells; a further test re-reads the live workbook when it can be found.

### 5b. This stack against the workbook's method — the divergence that matters

Both columns below are computed from **this stack's element values**; the only
thing varying is the method. Interference positive, so the workbook's cells are
negated.

| chain | stage | temp | workbook LMC (loose) | fold WC min | delta | workbook MMC (tight) | fold WC max | delta |
|---|---|---|---:|---:|---:|---:|---:|---:|
| lower | `hub_to_sleeve` | cold | +0.3029358 | +0.2529564 | **−0.0499794** | +0.3828875 | +0.4328669 | **+0.0499794** |
| lower | `hub_to_sleeve` | room | +0.2000000 | +0.1500000 | **−0.0500000** | +0.2800000 | +0.3300000 | **+0.0500000** |
| lower | `hub_to_sleeve` | hot | +0.0661835 | +0.0161567 | **−0.0500268** | +0.1462462 | +0.1962730 | **+0.0500268** |
| lower | `sleeve_to_bearing` | cold | +0.1845685 | +0.1845685 | −0.0000000 | +0.3184997 | +0.3184997 | −0.0000000 |
| lower | `sleeve_to_bearing` | room | +0.1150000 | +0.1150000 | −0.0000000 | +0.2490000 | +0.2490000 | −0.0000000 |
| lower | `sleeve_to_bearing` | hot | +0.0245610 | +0.0245610 | −0.0000000 | +0.1586503 | +0.1586503 | +0.0000000 |
| upper | `hub_to_sleeve` | cold | +0.1402830 | +0.0903036 | **−0.0499794** | +0.2242311 | +0.2742105 | **+0.0499794** |
| upper | `hub_to_sleeve` | room | +0.0730000 | +0.0230000 | **−0.0500000** | +0.1570000 | +0.2070000 | **+0.0500000** |
| upper | `hub_to_sleeve` | hot | **−0.0144679** | **−0.0644947** | **−0.0500268** | +0.0695996 | +0.1196264 | **+0.0500268** |
| upper | `sleeve_to_bearing` | cold | +0.1159361 | +0.1159361 | −0.0000000 | +0.2504645 | +0.2504645 | −0.0000000 |
| upper | `sleeve_to_bearing` | room | +0.0637000 | +0.0637000 | +0.0000000 | +0.1983000 | +0.1983000 | +0.0000000 |
| upper | `sleeve_to_bearing` | hot | **−0.0042069** | **−0.0042069** | +0.0000000 | +0.1304862 | +0.1304862 | −0.0000000 |

Identical pattern on the M1 sheet. Nominal columns agree to 0 everywhere.

**Stage 2: exact, to the last digit. Stage 1: off by exactly ±0.05003 mm.** That
is F1.

### 5c. Against the workbook's actual cached cells

`tests\debug_report_thermal_fit.py --workbook`. Here *values* differ too, and
every difference decomposes into four named causes, each pinned by
`test_every_lower_seat_divergence_from_the_workbook_is_one_of_three_named_causes`:

| cause | size | where |
|---|---|---|
| wall drift (1.190 vs 1.18) | 2×0.010 at stage 1, 2k×0.010 at stage 2 | M2 lower seat only |
| bearing nominal (200.000 vs 199.980) | 0.020 | nominal column only, lower seat |
| method (5b above) | ±band×f_sleeve | stage-1 LMC/MMC, every seat |
| the M1 row-18 slip | 0.05 at stage 1, (1−k)×0.05 at stage 2 | M1 lower seat, LMC column only |

**Nothing is unexplained.** The upper seat, where no value differs, lands on 24 of
the workbook's cells exactly and diverges on 12 by the method width alone.

---

## 6. Findings

### F1 `[model]` — the workbook's corner method understates the loosest stage-1 fit by 0.05003 mm, and it changes a conclusion

Both sleeve drawings tolerance the **bore** and the **radial wall** independently
and do not dimension the OD at all. So the loosest producible sleeve OD is
*smallest bore with thinnest wall* — and that combination is not in any of the
workbook's columns, because a least-material sleeve has a **larger** bore and a
**thinner** wall, and stage 1 puts both on the same sign.

The gap is the sleeve bore's full tolerance width (2 × 0.025) times the soak
factor, on both sides of the interval, at every stage-1 corner of both seats and
both sheets: **0.0499794 cold, 0.0500000 room, 0.0500268 hot.**

Consequences:

- **M2's upper seat stage 1 reads −0.0645 where the workbook reads −0.0145.** The
  workbook already called this corner a clearance, so the verdict does not change
  — but the magnitude is 4.5× larger.
- **M2's lower seat stage 1 would be −0.0039, a clearance, on the workbook's
  1.18 wall.** It reads +0.0162 only because the -004 drawing thickened the wall
  to 1.190 (F2). Two independent things had to go right for that corner to pass.
- Stage 2 is untouched: there the sleeve bore enters *negatively*, so LMC does hit
  the extreme and the two methods coincide exactly.

This is a **disagreement about method, not a transcription error**, and the
drawings support the wider reading. The general rule it is an instance of is in
`ARCHETYPE_thermal_fit.md`: compare each term's weight sign against the direction
its material condition moves it, and if any term disagrees, the coherent-corner
column is narrower than the truth.

### F2 `[drift]` — 214955-004 carries wall 1.190 ±0.025; the workbook models 1.18

0.010 mm on the radius, 0.020 mm diametral. The stack takes the drawing.

It decides a verdict: `lower_seat__hub_to_sleeve__hot` reads **+0.0162
(interference)** on 1.190 and would read **−0.0039 (a clearance)** on 1.18. Ask
Jeff whether -004's 1.190 supersedes the -003 the workbook modelled, or whether
the workbook's 1.18 was -003's value and 1.190 is a further tightening. Either
way the analysis on record is not the analysis of the part in hand.

`[read]` **This finding was nearly missed, and the way it was nearly missed is
reusable.** `1.190 ±0.025` and `1.110 ±0.035` sit side by side on 214955-004
sheet 1, and the text layer gives values without saying what they measure. Read
positionally, 1.110 looks like the wall — it is nearly the *upper* sleeve's wall
(1.110 ±0.025), which makes it doubly plausible. Only a rendered crop shows that
1.190 is the radial wall of the cylindrical section and 1.110 ±0.035 is the
**axial** thickness of the flange. A text-layer-only transcription of this drawing
gets the governing dimension wrong and re-derives perfectly.

### F3 `[slip]` — M1 sheet row 18: the LMC sleeve OD is built from the MMC column

`M1!D18` reads `=E17+2*E15` where every other cell in the row uses its own
column, and the hot and cold LMC cells were filled from the same wrong pattern —
so `D18 == E18`, `H18 == I18`, `L18 == M18` exactly. The M2 sheet has it right.
One authoring error, **21 affected cells**.

The tell needs no recomputation: the LMC column then carries *more* interference
than nominal (`D19` −0.155 against `C19` −0.145), which is backwards for a
least-material corner.

**It does not change M1's conclusion.** Corrected, room-temperature `D25` moves
from +0.006 (clearance) to −0.004 (interference) — but the hot LMC corner `H25` is
a clearance either way and an order of magnitude larger: **+0.0965 as written,
+0.0865 corrected**. (The corrected figure is already in this worksheet — it is
the M1 `lower_seat__sleeve_to_bearing__hot` WC min of −0.08650, negated, because
stage 2's coherent LMC corner and its worst-case fold coincide exactly.) M1's
slip risk survives the correction.

### F4 `[model]` — the stiffness ratio is the largest unsourced lever, and it is load-bearing

0.8 lower, 0.9 upper, labelled **"estimate"** in the workbook, with no derivation,
no reference and no stated uncertainty. Three things make it suspect beyond the
missing citation:

1. the two seats use **different** values with no stated reason;
2. it does **not move** when the M2 change thickens the lower sleeve by 6%,
   although a thicker sleeve is a stiffer one and stiffness is what the ratio is
   about;
3. its reach is larger than the margin it sits on. Across k = 0 → 1 the lower
   seat's hot stage 2 moves **0.0662 mm** (−0.0284 to +0.0378), and **k = 0 flips
   its verdict from `pass` to `marginal`.**

So the stage-2 hot numbers cannot be treated as settled while `k` is an estimate.
Stage 1 does not depend on it at all, which is worth knowing: the stage-1
clearance at the upper seat is *not* contingent on this number.

### F5 `[model]` — the two members use opposite before/after-coating conventions, and neither thickness is known

- **Hub** 212966-006: note 15, "DIMENSIONAL LIMITS APPLY **BEFORE** ETCHING, SHOT
  PEENING, ANODIZATION, CHEM CONVERSION COATING AND PRIMER". Note 12 anodizes to
  MIL-PRF-8625 Type I Class 1, **max 15 μm**; flag note 11 omits anodizing on
  indicated areas in favour of chem conversion coating.
- **Sleeves** 214955-004 / 214959-002: note 12, "DIMENSIONAL TOLERANCES APPLY
  **AFTER** SURFACE TREATMENT". Finish code S330, zinc-nickel per AMS2417 Type 2.

So the hub bore is analysed **as-machined** and the sleeve **as-plated**. Anodize
on a bore *reduces* it, which increases interference — the favourable direction —
but at up to 15 μm it is 30 μm diametral, comparable to the whole ±0.017 bore
tolerance and to the upper seat's clearance. Whether flag note 11 covers the
bearing bores could not be determined from the drawing's text layer and is a gap.

Unresolved and unmodelled in either direction. Recorded rather than guessed.

### F6 `[model]` — the hot case is a measurement from one test, not a qualified envelope

`M1!D7`: *"Max seen in whirly temp at spindle bearing temp sensor was 72C"*. The
cold case (−20 °C) carries no annotation at all. No document in the repo states
the assembly's qualified operating temperature range.

This is the governing corner, and its direction is unforgiving: **hotter is
worse**, monotonically. JPS00176 Table 3-1 caps *Aluminum 7050* at 90 °C, but
that is a cap on assembly heating, not a statement of operating envelope.
JED01848 (Propulsion Bearing Engineering Specification), which both bearing
drawings cite for "load capacity and operating temperature", is not in
`data/inbox/specs/` and is the document most likely to settle it.

### F7 `[model]` — `M2!I27` is an unlabelled orphan cell, and it is a different question

`I27 = I13 − E18`: **hot** MMC hub bore minus **room-temperature** MMC sleeve OD,
= −0.017838. No row heading, no comment, on the M2 sheet only.

Mixing a hot bore with a room-temperature sleeve is what an *assembly*-clearance
check looks like (heat the hub, drop in a cool sleeve), not an operational one.
Most likely a scratch calculation. It is re-derived and pinned because it is a
computed cell, and reported because an unlabelled cell in a hand-built sheet is
exactly what a later reader mistakes for a result. Worth confirming with Jeff,
because if it *is* an assembly check then there is an assembly-window question
this stack does not model.

### F8 `[model]` — the workbook's stated 1/1000 target is never enforced, and M1 never met it

Every interference-fraction row is commented "interference as fraction of nominal
diameter (**target 1/1000**)". **No cell compares against it.** It is recorded in
both stacks' `thermal_fit.interference_fraction_target` and deliberately *not*
generated as a check: it has no cited source, and turning an uncited spreadsheet
comment into a pass/fail criterion would dress a note as a requirement. JPS00176,
which *is* in the spec pile and *is* the interference-fit process spec, contains no
interference-magnitude requirement at all.

Worth noting anyway: M1's room-temperature nominal stage-1 fraction is
**7.17e-4** — it never met the stated target even at nominal, before any
temperature was applied. M2's is 1.09e-3, which does.

Two smaller notes on those rows: the fraction divides by the **column's own**
diameter rather than the nominal one (immaterial numerically, and the comment says
"nominal"), and the stage-2 fraction divides by the **bearing OD** while stage 1
divides by the hub bore.

### F9 `[read]` — the M1 comment column is safe to read positionally; the 260729 workbook's is not

Slice 1's trap 12 says a comment column in a hand-built sheet is free text, not
row-aligned, and reading it positionally attaches a washer's part number to a
bearing. That trap was checked here and **does not apply**: this workbook's column
O comments sit against the row they describe (`O13` names the hub on the hub-bore
row, `O14` the sleeve on the sleeve-thickness row), and they are the *only* source
for the M1 part numbers. Two different workbooks by the same author, two different
comment-column conventions. Check, do not assume — in either direction.

### F10 `[read]` — sheet order is reverse-chronological

The M2 (current intent) sheet is **first**, the M1 (as-built, superseded) sheet
**second**. A skim that assumes left-to-right chronology reads the as-built
configuration as the newer one and gets the direction of the fix backwards.

### F11 `[model]` — presence on the assembly was not checked

217755 was not opened by this handoff. Every parts-list field is `null` — not
guessed: find numbers, balloons, and `assembly_status.qty` on both bearing
hardware entries, each of which carries a "not checked" gap. (The `qty: 1` on the
`joint.parts` rows is a count *within this joint*, taken from the hub drawing's two
seats, not a parts-list quantity.) Slice 1's most valuable finding was a washer
that was not in the parts list at all, so this is a real omission, not a
formality.

---

## 7. Source gaps, ranked

Ranked by how much the answer moves if the gap is wrong, not by how easy it is to
close.

| # | gap | closed by | what it resolves |
|---|---|---|---|
| 1 | **CTE of 7050-T7451**, untraced, no temperature range (`M2!C5`, 23.04e-6/°C) | **CINDAS pull** — mean linear CTE over 20→72 °C and −20→20 °C. Request written out in `materials.json` | The hub is the fastest-growing member, so this number sets how quickly heat eats the interference. A value larger than 23.04 over the hot range makes every stage-1 result worse. Highest leverage in the stack. |
| 2 | **CTE of AISI 420** per AMS5621, untraced, no range (`M2!C6`, 10.3e-6/°C) | **CINDAS pull**; also ask whether 46-51 HRC and 48-54 HRC differ enough to separate | The other half of the mismatch that drives the whole analysis. |
| 3 | **Qualified operating temperature range** — 72 °C is one test's measured maximum (F6) | JED01848, or the assembly's environmental qualification | The governing corner. Hotter is monotonically worse and there is no margin at the upper seat to absorb it. |
| 4 | **Stiffness ratio derivation** — 0.8 / 0.9, "estimate" (F4) | An FEA or closed-form thick/thin-cylinder split, or a statement that the value is deliberately conservative | Worth 0.066 mm at the lower seat's hot stage 2, which flips a verdict at k = 0. |
| 5 | **Bearing outer-ring material** — "52100" is a spreadsheet cell label; both drawings are source-control drawings that name no material (F5 in `materials.json`) | The NSK material certificate (required per lot/serial by both drawings), or JED01848 | Blocks gap 6. **Confirm before pulling CINDAS** — a CINDAS pull for a guessed alloy arrives wearing a traced citation. |
| 6 | **CTE of the bearing steel**, untraced (`M2!C9`, 11.9e-6/°C) | CINDAS, *after* gap 5 | Least consequential of the three CTEs: the bearing appears only in stage 2, which is the stage the workbook already bounds correctly. |
| 7 | **214955-004 wall 1.190 vs the workbook's 1.18** (F2) | Jeff, or the 214955-003 drawing | Decides whether the M2 lower seat's hot corner passes on the analysed part or only on the current one. |
| 8 | **Coating thickness at both interfaces**, and whether hub flag note 11 covers the bearing bores (F5) | JPS00112 finish codes, the anodize/S330 process specs, and a read of the flagged areas on 212966-006 | Up to ~30 μm diametral on the hub, comparable to the whole bore tolerance. |
| 9 | **JED01848** (Propulsion Bearing Engineering Specification) — not in `data/inbox/specs/` | Append it to the spec pile | Cited by both bearing drawings for load capacity *and* operating temperature. Feeds gaps 3 and 5. |
| 10 | **212966-004 and 214955-002 drawings** (the M1 configuration) | Append them | Turns the M1 stack's 2 `inferred` + 2 `untraced` into traced values. Low priority — M1 is a superseded control, and its conclusion is robust to the values. |
| 11 | **Assembly presence on 217755** (F11) | Open the assembly export, check both bearings' find numbers, quantities and balloons | Slice 1 found an evaluated washer that was not in the parts list. |
| 12 | **What `M2!I27` is** (F7) | Jeff | If it is an assembly-clearance check, there is an assembly-window question not modelled here. |
| 13 | **Why ⌀129.968 is printed in a highlight colour** on 214959-002, uniquely on that sheet | Jeff, or JBM08009 (Drawing Standards Manual, in the spec pile) | Observed, not interpreted. May mark a critical characteristic. |
| 14 | **Surface roughness effect** — Ra 0.8 hub bore, Ra 3.2 sleeves | Not a document; a modelling decision | Asperity flattening reduces effective interference, always unfavourably. |

Gaps 1, 2, 5 and 6 are the **CINDAS asks** and Jeff can close them cheaply. Gaps
3 and 9 are the same document. Gap 7 is one question to Jeff.

## 8. The count

> **M2: 8 traced / 0 inferred / 0 untraced, out of 8 element instances.**
> **M1: 4 traced / 2 inferred / 2 untraced, out of 8 element instances.**
> **Across both stacks: 12 traced / 2 inferred / 2 untraced, out of 16.**

For calibration: the three seeded slice-1 stacks trace **5 of 26 element
instances**, and `pitch_link_to_pitch_plate` traces 4 of 6 in a much smaller
denominator it refused to pad. This stack traces 12 of 16 — and the reason is not
diligence, it is that **Jeff supplied the five part drawings**. Every traced
element here points at a released drawing that landed in the repo on the day the
stack was built. The lesson is about the inputs, not the method.

> **Correction, 2026-08-06** (handoff `traced_labels_and_ratio`). This line read
> *"slice 1 traced 1 of 17"*. That figure was wrong in both halves and is now
> 3 of 26; see `ARCHITECTURE.md` for what happened. The definition of the ratio
> lives in `docs/SOP_TOLERANCE_STACK.md`, "The traced ratio", and is reproduced
> by `tests\debug_report_tolerance_stacks.py --ratio` — which counts elements
> only, so the 0-of-7 point below is *not* something that command can tell you.
> The three seeded stacks carry no non-element values, so for them the element
> ratio is the whole story; for this one it is not.

> **Update, 2026-08-10** (handoff `fastener_citations_and_confidence`). Slice 1's
> figure is now **5 of 26**; nothing on either M1 or M2 changed. But M1's two
> `inferred` elements — `hub_bore_lower` and `hub_bore_upper` — acquired a
> mechanical guard by becoming its only registered exception. That handoff added
> `test_a_workbook_only_value_is_untraced_unless_its_exception_is_registered`,
> which states the SOP's rule that a workbook-only value is `untraced`. These two
> cite the 260209 workbook and claim `inferred`, and they are **right** to: their
> support is not workbook-only, because 212966-006 rev A prints the identical
> value and band and both notes say so, name the weakness, and pre-authorise the
> downgrade. The test is written as an allowlist rather than an implication
> precisely so these two do not have to be relabelled to satisfy it — but that
> makes the argument above load-bearing. **If 212966-004 ever arrives, or the
> -006 inference is rejected, these drop to `untraced` and come off the
> allowlist.**

**And the ratio is measuring the wrong thing for this archetype.** Seven
non-element values carry the analysis — three CTEs, two temperatures, two
stiffness ratios — and **all seven are `untraced`**. A dimension-only ratio of
12/16 traced next to a property ratio of 0/7 is a stack whose geometry is
documented and whose physics is not. Counted honestly:

> **12 traced / 2 inferred / 9 untraced, out of 23 sourced values.**

That is the number to quote.

---

## Reproducing this worksheet

```powershell
venv-win\Scripts\python.exe -m pytest -q
venv-win\Scripts\python.exe tests\debug_report_thermal_fit.py --markdown
venv-win\Scripts\python.exe tests\debug_report_thermal_fit.py --compare --markdown
venv-win\Scripts\python.exe tests\debug_report_thermal_fit.py --workbook --markdown
venv-win\Scripts\python.exe tests\debug_report_thermal_fit.py --terms --markdown
```

`--terms` is the one that matters for review: this archetype **generates** its
checks, so the term lists are not readable in the stack JSON. That output is where
every sign and every weight can be read one at a time, which is the check the
review checklist asks for and the JSON can no longer serve.

---

## Appendix — every generated term, every sign, every weight

Pasted from `--terms --markdown`. This is the appendix that exists because the
archetype generates its checks: read it the way you would read a hand-authored
`terms` array in a stack JSON, one row at a time, against the physical direction
of the feature.

What to check, per row:

- **`sleeve_bore` and `sleeve_wall` are `+1`, `hub_bore` is `-1`** at stage 1 — the
  sleeve OD pushes interference up, the hub bore pushes it down.
- **the wall's coefficient is exactly twice the sleeve bore's** at stage 1
  (diametral), and `2k` times it at stage 2.
- **`bearing_od` is `+1`, `hub_bore` is `-1`** at stage 2, and the sleeve bore is
  `-1` at `(1-k)`.
- **at room temperature every coefficient is exactly `1`, `2`, `k`, `2k` or
  `1-k`** — `ΔT = 0`, so the soak factors drop out and the structure reads plain.
- **cold coefficients are below their room values and hot above**, by the soak
  factor of that member's own material: aluminium 23.04e-6/°C moves fastest, so
  the `hub_bore` weight is always the one furthest from its room value.

﻿
### Expanded terms — `hub_bearing_thermal_fit_m2`

| check | element | sign | coefficient | weight | element min | element max |
|---|---|---:|---:|---:|---:|---:|
| `lower_seat__hub_to_sleeve__cold` | `sleeve_bore_lower` | +1 | 0.999588000 | +0.999588000 | 199.9750 | 200.0250 |
| `lower_seat__hub_to_sleeve__cold` | `sleeve_wall_lower` | +1 | 1.999176000 | +1.999176000 | 1.1650 | 1.2150 |
| `lower_seat__hub_to_sleeve__cold` | `hub_bore_lower` | -1 | 0.999078400 | -0.999078400 | 202.1250 | 202.1550 |
| `lower_seat__hub_to_sleeve__room` | `sleeve_bore_lower` | +1 | 1.000000000 | +1.000000000 | 199.9750 | 200.0250 |
| `lower_seat__hub_to_sleeve__room` | `sleeve_wall_lower` | +1 | 2.000000000 | +2.000000000 | 1.1650 | 1.2150 |
| `lower_seat__hub_to_sleeve__room` | `hub_bore_lower` | -1 | 1.000000000 | -1.000000000 | 202.1250 | 202.1550 |
| `lower_seat__hub_to_sleeve__hot` | `sleeve_bore_lower` | +1 | 1.000535600 | +1.000535600 | 199.9750 | 200.0250 |
| `lower_seat__hub_to_sleeve__hot` | `sleeve_wall_lower` | +1 | 2.001071200 | +2.001071200 | 1.1650 | 1.2150 |
| `lower_seat__hub_to_sleeve__hot` | `hub_bore_lower` | -1 | 1.001198080 | -1.001198080 | 202.1250 | 202.1550 |
| `lower_seat__sleeve_to_bearing__cold` | `bearing_od_lower` | +1 | 0.999524000 | +0.999524000 | 199.9800 | 200.0000 |
| `lower_seat__sleeve_to_bearing__cold` | `sleeve_wall_lower` | +1 | 1.599340800 | +1.599340800 | 1.1650 | 1.2150 |
| `lower_seat__sleeve_to_bearing__cold` | `hub_bore_lower` | -1 | 0.799262720 | -0.799262720 | 202.1250 | 202.1550 |
| `lower_seat__sleeve_to_bearing__cold` | `sleeve_bore_lower` | -1 | 0.199917600 | -0.199917600 | 199.9750 | 200.0250 |
| `lower_seat__sleeve_to_bearing__room` | `bearing_od_lower` | +1 | 1.000000000 | +1.000000000 | 199.9800 | 200.0000 |
| `lower_seat__sleeve_to_bearing__room` | `sleeve_wall_lower` | +1 | 1.600000000 | +1.600000000 | 1.1650 | 1.2150 |
| `lower_seat__sleeve_to_bearing__room` | `hub_bore_lower` | -1 | 0.800000000 | -0.800000000 | 202.1250 | 202.1550 |
| `lower_seat__sleeve_to_bearing__room` | `sleeve_bore_lower` | -1 | 0.200000000 | -0.200000000 | 199.9750 | 200.0250 |
| `lower_seat__sleeve_to_bearing__hot` | `bearing_od_lower` | +1 | 1.000618800 | +1.000618800 | 199.9800 | 200.0000 |
| `lower_seat__sleeve_to_bearing__hot` | `sleeve_wall_lower` | +1 | 1.600856960 | +1.600856960 | 1.1650 | 1.2150 |
| `lower_seat__sleeve_to_bearing__hot` | `hub_bore_lower` | -1 | 0.800958464 | -0.800958464 | 202.1250 | 202.1550 |
| `lower_seat__sleeve_to_bearing__hot` | `sleeve_bore_lower` | -1 | 0.200107120 | -0.200107120 | 199.9750 | 200.0250 |
| `lower_seat__sleeve_to_bearing__hot__k0` | `bearing_od_lower` | +1 | 1.000618800 | +1.000618800 | 199.9800 | 200.0000 |
| `lower_seat__sleeve_to_bearing__hot__k0` | `sleeve_bore_lower` | -1 | 1.000535600 | -1.000535600 | 199.9750 | 200.0250 |
| `lower_seat__sleeve_to_bearing__hot__k1` | `bearing_od_lower` | +1 | 1.000618800 | +1.000618800 | 199.9800 | 200.0000 |
| `lower_seat__sleeve_to_bearing__hot__k1` | `sleeve_wall_lower` | +1 | 2.001071200 | +2.001071200 | 1.1650 | 1.2150 |
| `lower_seat__sleeve_to_bearing__hot__k1` | `hub_bore_lower` | -1 | 1.001198080 | -1.001198080 | 202.1250 | 202.1550 |
| `upper_seat__hub_to_sleeve__cold` | `sleeve_bore_upper` | +1 | 0.999588000 | +0.999588000 | 129.9430 | 129.9930 |
| `upper_seat__hub_to_sleeve__cold` | `sleeve_wall_upper` | +1 | 1.999176000 | +1.999176000 | 1.0850 | 1.1350 |
| `upper_seat__hub_to_sleeve__cold` | `hub_bore_upper` | -1 | 0.999078400 | -0.999078400 | 132.0560 | 132.0900 |
| `upper_seat__hub_to_sleeve__room` | `sleeve_bore_upper` | +1 | 1.000000000 | +1.000000000 | 129.9430 | 129.9930 |
| `upper_seat__hub_to_sleeve__room` | `sleeve_wall_upper` | +1 | 2.000000000 | +2.000000000 | 1.0850 | 1.1350 |
| `upper_seat__hub_to_sleeve__room` | `hub_bore_upper` | -1 | 1.000000000 | -1.000000000 | 132.0560 | 132.0900 |
| `upper_seat__hub_to_sleeve__hot` | `sleeve_bore_upper` | +1 | 1.000535600 | +1.000535600 | 129.9430 | 129.9930 |
| `upper_seat__hub_to_sleeve__hot` | `sleeve_wall_upper` | +1 | 2.001071200 | +2.001071200 | 1.0850 | 1.1350 |
| `upper_seat__hub_to_sleeve__hot` | `hub_bore_upper` | -1 | 1.001198080 | -1.001198080 | 132.0560 | 132.0900 |
| `upper_seat__sleeve_to_bearing__cold` | `bearing_od_upper` | +1 | 0.999524000 | +0.999524000 | 129.9910 | 130.0000 |
| `upper_seat__sleeve_to_bearing__cold` | `sleeve_wall_upper` | +1 | 1.799258400 | +1.799258400 | 1.0850 | 1.1350 |
| `upper_seat__sleeve_to_bearing__cold` | `hub_bore_upper` | -1 | 0.899170560 | -0.899170560 | 132.0560 | 132.0900 |
| `upper_seat__sleeve_to_bearing__cold` | `sleeve_bore_upper` | -1 | 0.099958800 | -0.099958800 | 129.9430 | 129.9930 |
| `upper_seat__sleeve_to_bearing__room` | `bearing_od_upper` | +1 | 1.000000000 | +1.000000000 | 129.9910 | 130.0000 |
| `upper_seat__sleeve_to_bearing__room` | `sleeve_wall_upper` | +1 | 1.800000000 | +1.800000000 | 1.0850 | 1.1350 |
| `upper_seat__sleeve_to_bearing__room` | `hub_bore_upper` | -1 | 0.900000000 | -0.900000000 | 132.0560 | 132.0900 |
| `upper_seat__sleeve_to_bearing__room` | `sleeve_bore_upper` | -1 | 0.100000000 | -0.100000000 | 129.9430 | 129.9930 |
| `upper_seat__sleeve_to_bearing__hot` | `bearing_od_upper` | +1 | 1.000618800 | +1.000618800 | 129.9910 | 130.0000 |
| `upper_seat__sleeve_to_bearing__hot` | `sleeve_wall_upper` | +1 | 1.800964080 | +1.800964080 | 1.0850 | 1.1350 |
| `upper_seat__sleeve_to_bearing__hot` | `hub_bore_upper` | -1 | 0.901078272 | -0.901078272 | 132.0560 | 132.0900 |
| `upper_seat__sleeve_to_bearing__hot` | `sleeve_bore_upper` | -1 | 0.100053560 | -0.100053560 | 129.9430 | 129.9930 |
| `upper_seat__sleeve_to_bearing__hot__k0` | `bearing_od_upper` | +1 | 1.000618800 | +1.000618800 | 129.9910 | 130.0000 |
| `upper_seat__sleeve_to_bearing__hot__k0` | `sleeve_bore_upper` | -1 | 1.000535600 | -1.000535600 | 129.9430 | 129.9930 |
| `upper_seat__sleeve_to_bearing__hot__k1` | `bearing_od_upper` | +1 | 1.000618800 | +1.000618800 | 129.9910 | 130.0000 |
| `upper_seat__sleeve_to_bearing__hot__k1` | `sleeve_wall_upper` | +1 | 2.001071200 | +2.001071200 | 1.0850 | 1.1350 |
| `upper_seat__sleeve_to_bearing__hot__k1` | `hub_bore_upper` | -1 | 1.001198080 | -1.001198080 | 132.0560 | 132.0900 |

### Expanded terms — `hub_bearing_thermal_fit_m1`

| check | element | sign | coefficient | weight | element min | element max |
|---|---|---:|---:|---:|---:|---:|
| `lower_seat__hub_to_sleeve__cold` | `sleeve_bore_lower` | +1 | 0.999588000 | +0.999588000 | 200.0100 | 200.0600 |
| `lower_seat__hub_to_sleeve__cold` | `sleeve_wall_lower` | +1 | 1.999176000 | +1.999176000 | 1.1000 | 1.1500 |
| `lower_seat__hub_to_sleeve__cold` | `hub_bore_lower` | -1 | 0.999078400 | -0.999078400 | 202.1250 | 202.1550 |
| `lower_seat__hub_to_sleeve__room` | `sleeve_bore_lower` | +1 | 1.000000000 | +1.000000000 | 200.0100 | 200.0600 |
| `lower_seat__hub_to_sleeve__room` | `sleeve_wall_lower` | +1 | 2.000000000 | +2.000000000 | 1.1000 | 1.1500 |
| `lower_seat__hub_to_sleeve__room` | `hub_bore_lower` | -1 | 1.000000000 | -1.000000000 | 202.1250 | 202.1550 |
| `lower_seat__hub_to_sleeve__hot` | `sleeve_bore_lower` | +1 | 1.000535600 | +1.000535600 | 200.0100 | 200.0600 |
| `lower_seat__hub_to_sleeve__hot` | `sleeve_wall_lower` | +1 | 2.001071200 | +2.001071200 | 1.1000 | 1.1500 |
| `lower_seat__hub_to_sleeve__hot` | `hub_bore_lower` | -1 | 1.001198080 | -1.001198080 | 202.1250 | 202.1550 |
| `lower_seat__sleeve_to_bearing__cold` | `bearing_od_lower` | +1 | 0.999524000 | +0.999524000 | 199.9800 | 200.0000 |
| `lower_seat__sleeve_to_bearing__cold` | `sleeve_wall_lower` | +1 | 1.599340800 | +1.599340800 | 1.1000 | 1.1500 |
| `lower_seat__sleeve_to_bearing__cold` | `hub_bore_lower` | -1 | 0.799262720 | -0.799262720 | 202.1250 | 202.1550 |
| `lower_seat__sleeve_to_bearing__cold` | `sleeve_bore_lower` | -1 | 0.199917600 | -0.199917600 | 200.0100 | 200.0600 |
| `lower_seat__sleeve_to_bearing__room` | `bearing_od_lower` | +1 | 1.000000000 | +1.000000000 | 199.9800 | 200.0000 |
| `lower_seat__sleeve_to_bearing__room` | `sleeve_wall_lower` | +1 | 1.600000000 | +1.600000000 | 1.1000 | 1.1500 |
| `lower_seat__sleeve_to_bearing__room` | `hub_bore_lower` | -1 | 0.800000000 | -0.800000000 | 202.1250 | 202.1550 |
| `lower_seat__sleeve_to_bearing__room` | `sleeve_bore_lower` | -1 | 0.200000000 | -0.200000000 | 200.0100 | 200.0600 |
| `lower_seat__sleeve_to_bearing__hot` | `bearing_od_lower` | +1 | 1.000618800 | +1.000618800 | 199.9800 | 200.0000 |
| `lower_seat__sleeve_to_bearing__hot` | `sleeve_wall_lower` | +1 | 1.600856960 | +1.600856960 | 1.1000 | 1.1500 |
| `lower_seat__sleeve_to_bearing__hot` | `hub_bore_lower` | -1 | 0.800958464 | -0.800958464 | 202.1250 | 202.1550 |
| `lower_seat__sleeve_to_bearing__hot` | `sleeve_bore_lower` | -1 | 0.200107120 | -0.200107120 | 200.0100 | 200.0600 |
| `lower_seat__sleeve_to_bearing__hot__k0` | `bearing_od_lower` | +1 | 1.000618800 | +1.000618800 | 199.9800 | 200.0000 |
| `lower_seat__sleeve_to_bearing__hot__k0` | `sleeve_bore_lower` | -1 | 1.000535600 | -1.000535600 | 200.0100 | 200.0600 |
| `lower_seat__sleeve_to_bearing__hot__k1` | `bearing_od_lower` | +1 | 1.000618800 | +1.000618800 | 199.9800 | 200.0000 |
| `lower_seat__sleeve_to_bearing__hot__k1` | `sleeve_wall_lower` | +1 | 2.001071200 | +2.001071200 | 1.1000 | 1.1500 |
| `lower_seat__sleeve_to_bearing__hot__k1` | `hub_bore_lower` | -1 | 1.001198080 | -1.001198080 | 202.1250 | 202.1550 |
| `upper_seat__hub_to_sleeve__cold` | `sleeve_bore_upper` | +1 | 0.999588000 | +0.999588000 | 129.9430 | 129.9930 |
| `upper_seat__hub_to_sleeve__cold` | `sleeve_wall_upper` | +1 | 1.999176000 | +1.999176000 | 1.0850 | 1.1350 |
| `upper_seat__hub_to_sleeve__cold` | `hub_bore_upper` | -1 | 0.999078400 | -0.999078400 | 132.0560 | 132.0900 |
| `upper_seat__hub_to_sleeve__room` | `sleeve_bore_upper` | +1 | 1.000000000 | +1.000000000 | 129.9430 | 129.9930 |
| `upper_seat__hub_to_sleeve__room` | `sleeve_wall_upper` | +1 | 2.000000000 | +2.000000000 | 1.0850 | 1.1350 |
| `upper_seat__hub_to_sleeve__room` | `hub_bore_upper` | -1 | 1.000000000 | -1.000000000 | 132.0560 | 132.0900 |
| `upper_seat__hub_to_sleeve__hot` | `sleeve_bore_upper` | +1 | 1.000535600 | +1.000535600 | 129.9430 | 129.9930 |
| `upper_seat__hub_to_sleeve__hot` | `sleeve_wall_upper` | +1 | 2.001071200 | +2.001071200 | 1.0850 | 1.1350 |
| `upper_seat__hub_to_sleeve__hot` | `hub_bore_upper` | -1 | 1.001198080 | -1.001198080 | 132.0560 | 132.0900 |
| `upper_seat__sleeve_to_bearing__cold` | `bearing_od_upper` | +1 | 0.999524000 | +0.999524000 | 129.9910 | 130.0000 |
| `upper_seat__sleeve_to_bearing__cold` | `sleeve_wall_upper` | +1 | 1.799258400 | +1.799258400 | 1.0850 | 1.1350 |
| `upper_seat__sleeve_to_bearing__cold` | `hub_bore_upper` | -1 | 0.899170560 | -0.899170560 | 132.0560 | 132.0900 |
| `upper_seat__sleeve_to_bearing__cold` | `sleeve_bore_upper` | -1 | 0.099958800 | -0.099958800 | 129.9430 | 129.9930 |
| `upper_seat__sleeve_to_bearing__room` | `bearing_od_upper` | +1 | 1.000000000 | +1.000000000 | 129.9910 | 130.0000 |
| `upper_seat__sleeve_to_bearing__room` | `sleeve_wall_upper` | +1 | 1.800000000 | +1.800000000 | 1.0850 | 1.1350 |
| `upper_seat__sleeve_to_bearing__room` | `hub_bore_upper` | -1 | 0.900000000 | -0.900000000 | 132.0560 | 132.0900 |
| `upper_seat__sleeve_to_bearing__room` | `sleeve_bore_upper` | -1 | 0.100000000 | -0.100000000 | 129.9430 | 129.9930 |
| `upper_seat__sleeve_to_bearing__hot` | `bearing_od_upper` | +1 | 1.000618800 | +1.000618800 | 129.9910 | 130.0000 |
| `upper_seat__sleeve_to_bearing__hot` | `sleeve_wall_upper` | +1 | 1.800964080 | +1.800964080 | 1.0850 | 1.1350 |
| `upper_seat__sleeve_to_bearing__hot` | `hub_bore_upper` | -1 | 0.901078272 | -0.901078272 | 132.0560 | 132.0900 |
| `upper_seat__sleeve_to_bearing__hot` | `sleeve_bore_upper` | -1 | 0.100053560 | -0.100053560 | 129.9430 | 129.9930 |
| `upper_seat__sleeve_to_bearing__hot__k0` | `bearing_od_upper` | +1 | 1.000618800 | +1.000618800 | 129.9910 | 130.0000 |
| `upper_seat__sleeve_to_bearing__hot__k0` | `sleeve_bore_upper` | -1 | 1.000535600 | -1.000535600 | 129.9430 | 129.9930 |
| `upper_seat__sleeve_to_bearing__hot__k1` | `bearing_od_upper` | +1 | 1.000618800 | +1.000618800 | 129.9910 | 130.0000 |
| `upper_seat__sleeve_to_bearing__hot__k1` | `sleeve_wall_upper` | +1 | 2.001071200 | +2.001071200 | 1.0850 | 1.1350 |
| `upper_seat__sleeve_to_bearing__hot__k1` | `hub_bore_upper` | -1 | 1.001198080 | -1.001198080 | 132.0560 | 132.0900 |
