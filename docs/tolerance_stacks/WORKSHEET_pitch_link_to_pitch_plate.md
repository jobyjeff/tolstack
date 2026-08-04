# Worksheet — pitch link ↔ pitch plate, grip length

Covers `stack_pitch_link_to_pitch_plate.json`. All values in **mm**.

> **Built from scratch. There is no source workbook for this joint** — that is
> the point of the exercise (Jeff, atomic note `20260803T153839_cwzuzq`: *"there
> will be no excel sheet to 'cheat' off of"*). So there is **no
> "Re-derivation vs the source" section**: the fold is the only computation, and
> `tests/test_tolerance_stack.py` pins it directly. Every check here is
> original; no `workbook_cells`, no `[NOT IN WORKBOOK]` markers, and
> `kind: "workbook"` appears **zero** times in the JSON.

> **The stack is incomplete, and the incompleteness is the result.** The
> pitch-link eye / spherical bearing width could not be sourced to any document
> available here, so it is **not** modelled — not with a recalled number, not
> with a "typical" number, not with a number lifted from the neighbouring
> tangential-link stack. It appears as gap 1 and as an explicit budget inside
> the two checks. See *Refused* at the end.

## The joint

| | |
|---|---|
| Assembly | 217755 PROPULSION ASSEMBLY, PROPELLER rev A.1 (`[PRELIM 2026-AUG-3]` export) |
| Location | sheet 4 (*SPINDLE CLAMP AND PITCH PLATE*), **DETAIL B**, scale 2:1, printed zone **H3** (caption; view body spans printed J3–K4) |
| Places | **5** |
| Pitch plate | 215197 PITCH PLATE, PROPELLER, inside 215177-001 PITCH PLATE ASSEMBLY CW (balloon 31; 74 = -002 CCW) |
| Link | **unidentified — see gap 1.** No part in the 217755 parts list is named "pitch link" |
| Fastener as drawn | **NAS6403U11D** `.190-32 × .688" GRIP` (balloon **5X 38**, qty 5) — unplated, **drilled shank** |
| Bushing as drawn | 214820-002 `BUSHING, PLAIN, ALUMINUM BRONZE, .1900" ID X .1875" LONG` (balloon **8X 34**, qty 8) |
| Washer as drawn | NAS1149V0332H `.203" × .438" × .032"` (balloon **8X 32**, qty 9) |
| Retention as drawn | MS9363-09 `NUT, SLOTTED, HEXAGON, SHEAR` (balloon **8X 33**) + MS24665-153 cotter pin (balloon **8X 36**) |
| Also in DETAIL B | the **tangential-link** joint slice 1 analysed — balloon **3X 35** = NAS6403U14D `.875" GRIP` — sharing the same bushing, washer, nut and cotter part numbers |

Scope is **grip length only, along the bolt axis**. Deliberately out of scope:
diameter and hole fits (simple two-component fits); bushing-to-bore interference
(JPS00176); the pitch link's own internal stack; the joint at the *other* end of
the pitch link; torque and preload. An omission below is a decision, not an
oversight.

**The question:** does the NAS6403U11D (.688 in grip) work in this joint — does
the end of its full cylindrical shank clear the nut bearing face (which
JPS00094 Rev C §5.5.5 requires), and does its cotter hole sit clear of the
clamped column?

### How this joint was identified

Jeff named the joint "pitch link → pitch plate" and said it is *visible in the
same view* as the tangential-link joint. No part number carries that name, so
the identification is by elimination plus four corroborations, and it is
**inferred**, not traced:

1. **DETAIL B contains exactly two grip stacks** of identical architecture (bolt
   → bushing → link eye with spherical bearing → 4.06 mm pitch-plate lug →
   washer → slotted nut → cotter pin). One is 3 places with balloon `3X 35`
   (NAS6403U14D, .875 grip); the other is 5 places with balloon `5X 38`
   (NAS6403U11D, .688 grip).
2. **Slice 1 claimed the 3-place stack** as the tangential link, matching
   212956-005 `PITCH ANTI ROTATION LINK ASSEMBLY` at qty 3. That leaves the
   5-place stack for this session.
3. **The propeller has five blades** (217755 sheet 2, `-001 SHOWN/-002 OPPOSITE`
   front view — counted, five). One pitch link per blade gives five places; the
   three anti-rotation links are a separate, smaller set. The 8X bushing / 8X
   washer / 8X nut / 8X cotter counts in DETAIL B are exactly 3 + 5.
4. **215197 carries a distinct 5X flange group.** The pitch plate has three
   4.06 mm callout groups: `3X ±0.08` (sheet 2 zone B4 — tangential),
   `5X ±0.10` (sheet 2 zone D10 — **this joint**) and `1X ±0.10` (sheet 1 zone
   D5 — VPA output). The count is what ties the callout to the joint; matching
   on the value 4.06 alone would get you to "one of three" (slice 1's trap 11).

What is still missing is the link's own part number, hence its spherical-bearing
width. Gap 1.

## Ordered elements

Physical order from the bolt head. `conf` is the result, not decoration.

| # | element | role | nominal | min | max | source | conf |
|---|---------|------|---------|-----|-----|--------|------|
| 1 | plain bushing length (214820-002) | bushing | 4.7625 | 4.7625 | 4.7625 | 217755 sh4 DETAIL B parts list | inferred |
| — | *pitch-link eye / spherical bearing* | *bearing* | — | — | — | **NO DOCUMENT — gap 1** | *absent* |
| 2 | pitch plate lug thickness (5X group) | clamped_member | 4.0600 | 3.9600 | 4.1600 | **215197 sh2 zone D10 SECTION A-A** | **traced** |
| 3 | washer thickness, NAS1149V0332H (.032 in) | washer | 0.8128 | 0.8128 | 0.8128 | 217755 sh4 DETAIL B parts list | inferred |
| 4 | NAS6403U11D grip length (.688 in) | fastener | 17.4752 | 17.2212 | 17.7292 | **NAS6403-NAS6420 Rev 4 sh3** | **traced** |
| 5 | NAS6403U11D overall length (1.011 in) | fastener | 25.6794 | 25.2984 | 26.0604 | **NAS6403-NAS6420 Rev 4 sh3** | **traced** |
| 6 | cotter-hole centreline to point, `M` | fastener | 4.1656 | 3.9116 | 4.4196 | **NAS6403-NAS6420 Rev 4 sh1** | **traced** |

### Two elements carry a zero-width band, on purpose

`bushing_214820` and `washer_nas1149v0332` have `min == max == nominal`. **No
document in this repo gives a tolerance on either.** `hardware_entries.json`
holds a 4.63/4.76 band for the bushing and ±.004 in for the washer, but both
came from slice 1's transcription of the 260729 workbook — untraced numbers,
which SOP Step 5b forbids a from-scratch stack from using. Inventing a plausible
band would have been worse.

Consequence, stated rather than hidden: **every worst-case interval below is a
lower bound on the true spread, and every RSS half-range likewise understates
it.** Two part documents (the 214820-002 drawing, the NAS1149 standard) turn all
four intervals from lower bounds into real bounds. They are gaps 3 and 4.

### LMC / MMC direction

There is **no inverting element in this joint**, because there is no subtracted
material feature — no chamfer, no relief, no counterbore. So:

- `pitch_plate_flange`, `bolt_grip_11`, `bolt_length_11` are additive external
  lengths: MMC (most material) is the *longest*, so `mmc → max`. All three read
  `max == mmc`.
- `cotter_hole_from_point` carries **`lmc: null`, `mmc: null`** deliberately. It
  is a *location*, not a size; "most material" has no meaning for where a hole
  sits. `.174/.154` are its limits and nothing more.
- The two zero-width elements carry null `lmc`/`mmc` too — there is no
  transcribed material condition to record.

`max == mmc` everywhere is the smell the review checklist (§3) tells a reviewer
to chase. Chased: it is the *absence of a subtracted feature*, not a naive
`mmc → max` fold. The only negative signs in the JSON are on whole-element and
whole-path subtractions, and `fold()` was not touched — it still reads
`min`/`max` only.

## Paths

| path | nominal | WC min | WC max | RSS center | RSS ± | WC ± |
|------|---------|--------|--------|------------|-------|------|
| clamped_stack_sourced | 9.6353 | 9.5353 | 9.7353 | 9.6353 | 0.1000 | 0.1000 |
| head_to_cotter_hole | 21.5138 | 20.8788 | 22.1488 | 21.5138 | 0.4579 | 0.6350 |
| thread_region_T | 8.2042 | 7.5692 | 8.8392 | 8.2042 | 0.4579 | 0.6350 |

`clamped_stack_sourced` **excludes the pitch-link eye** — it is the sourced part
of the clamped column only.

`thread_region_T` is a **provenance cross-check, not a design quantity**:
`length − grip` = 8.2042 mm = **.323 in**, which is exactly the `T (Ref)` value
printed for NAS6403 in the sheet-1 table, read independently of the sheet-3
grip/length columns. Two separately-read parts of the standard agreeing to the
digit is the cheapest evidence available that the vision read of a photocopy was
right. A test pins it. Its *worst case* is meaningless — see F5.

## Checks

Criterion is `≥ 0` on both. `marginal` = nominal passes, worst case does not.

**Neither check here is `marginal`**, and that is worth stating rather than
leaving as an absence: nominal and worst case agree in sign on both, because the
only element carrying a real band is the ±0.10 mm pitch-plate lug and the two
margins are an order of magnitude larger than it. Nothing was rounded or nudged
to avoid the marginal verdict — if the pitch-link eye width arrives between
**7.8399 and 8.1939 mm**, `shank_out__11_sourced_only` will land marginal, and
that will be the informative answer.

| check | nominal | WC min | WC max | RSS min | RSS max | verdict |
|-------|---------|--------|--------|---------|---------|---------|
| shank_out__11_sourced_only | **−7.8399** | **−8.1939** | **−7.4859** | −8.1129 | −7.5669 | **fail** |
| cotter_hole_clear_of_sourced_stack | 11.8785 | 11.1435 | 12.6135 | 11.4098 | 12.3472 | pass |

> ### Read these two verdicts carefully — neither is a design conclusion
>
> **`shank_out__11_sourced_only` "fails" by construction, not by analysis.** The
> pitch-link eye is missing from the clamped column, so of course the column is
> shorter than the grip. The *magnitude* is the useful output: it is exactly the
> pitch-link eye width this joint **requires** —
>
> | | required pitch-link eye width |
> |---|---|
> | to pass at **worst case** — grip **max** 17.7292 vs column **min** 9.5353 — **the binding requirement** | **≥ 8.1939 mm** |
> | to pass at nominal | **≥ 7.8399 mm** (0.3087 in) |
> | below this it fails even in the most favourable combination — grip **min** 17.2212 vs column **max** 9.7353 | < **7.4859 mm** |
>
> i.e. the -11 bolt satisfies JPS00094 Rev C §5.5.5, *"The nut, nutplate, insert,
> part body, etc., shall not engage any incomplete threads of the bolt shank,"*
> only if the eye is at least **8.1939 mm** wide. **7.49–8.19 mm is not the
> requirement** — it is the band in which the answer depends on where in tolerance
> the parts land, and within it 7.84–8.19 mm is specifically `marginal` (nominal
> passes, worst case does not). Note the two zero-width bands make even 8.1939 mm
> a *lower* bound on the real requirement. Sourcing that one number flips this
> check to a real verdict. Nothing else is needed.
>
> For scale, not as a substitute: slice 1's *tangential*-link stack folds an
> 11.05–11.10 mm spherical bearing plus a 1.4478–1.5748 mm bushing flange. Those
> are untraced workbook numbers for a **different** link, and they are **not**
> used here.
>
> **`cotter_hole_clear_of_sourced_stack` "passes" but cannot settle the joint.**
> 11.1435 mm (worst case) of bolt sits between the clamped column and the cotter
> hole. That budget has to cover the pitch-link eye *plus* the MS9363-09 nut's
> thread-start-to-castellation distance, and both are unsourced.
>
> **And even fully sourced, no interval here answers this joint** — see below.

### Quantised grip — and this time the specification says so

Retention is a **slotted nut (MS9363-09) plus a cotter pin (MS24665-153) through
a drilled shank** — the `D` suffix on `NAS6403U11D` means drilled shank, per the
standard's own sheet-2 CODE block, so this is confirmed from the part number and
not just from the balloons.

The governing constraint is therefore **not** "does the shank protrude past the
washer face". It is **whether a castellation slot lines up with the bolt's cotter
hole**, which *quantises* acceptable grip into discrete workable values rather
than bounding it in a continuous interval. A grip-length interval cannot express
that, so the interval is not the answer even when it is computed correctly.

Slice 1 had to assert this from first principles (findings F8/F16). It is now
**traced to a Joby process specification** —
`JPS00094 Rev C 05/Sep/2024`, page 7 of 14, §5.9.7 *Castle Nuts*:

> "When installing a castle nut, start alignment with the cotter pin hole at the
> minimum recommended torque plus friction drag torque. **Note:** Do not exceed
> the maximum torque plus the friction drag. **If the hole and nut castellation
> do not align, change/add a washer or a different nut, and try again.**
> Exceeding the maximum recommended torque is not allowed. (ᵃDifferent nuts
> likely have different manufactured thread-start to castellation-hole spacing.)"

That is assembly-time selection, written into the process spec, with the
footnote conceding that nut-to-nut castellation spacing varies. The remedy is
also **bounded**, same document page 3 of 14, §5.5.3.a: at most **three washers**
per fastener — one under the head and two under the nut, or two and one.

What would close it: **MS9363** (slot count, slot depth, nut height). The *bolt*
side is closed — NAS6403 sheet 1 `M = .174/.154 in` from the point, sheet 2 note
(j) *"Cotter pin hole centerline: Within .010 and normal within 2° of bolt
centerline."* This is one document away from being answerable.

### What the RSS columns do not claim

`fold()` combines half-ranges in quadrature about the **midpoint**, which treats
every band as an independent, symmetric, equal-confidence manufacturing
variation. In this stack:

- **Two bands are zero-width** because they are unknown, not because they are
  tight. RSS treats a zero-width band as a certainty, so the RSS half-ranges
  above are understated by however much the bushing and washer really vary.
- **`bolt_length_11` and `cotter_hole_from_point` are not independent** of
  `bolt_grip_11` in the way quadrature assumes — see F5.
- No element here has a one-sided band, and there is no `role: "allowance"`
  element (slice 1's thread-transition allowance was an uncited rule of thumb;
  this stack refuses it — see *Refused*). So the midpoint re-centering artefact
  that distorted slice 1's `shank_out__14_thick` does **not** occur here:
  `rss_center == nominal` on all three paths and both checks, exactly because
  every `nominal` here *is* the midpoint of its own limits.

So RSS here is a **relative softening indicator, not a probability statement**,
and it is not directly comparable to the worst-case columns. **Verdicts never
read RSS** — `CheckResult.verdict` cannot see it.

### Nominal inside its own min/max

`min ≤ nominal ≤ max` **holds for all six elements**, and every nominal is
exactly the arithmetic centre of its own limits — so slice 1's F1 (a transcribed
nominal sitting *outside* its own min/max) does not recur.

That is not luck, and it is not because I computed midpoints. Five of the six
nominals are **stated basic sizes with a symmetric tolerance**: a standard prints
`Grip ±.010` and `LENGTH ±.015` as column headers, and a drawing prints
`4.06 ±0.10`; symmetry is the source's, not mine. A hand-built workbook's nominal
column carries no such guarantee, which is what made F1 possible there.

The exception is `cotter_hole_from_point`, whose nominal **is** computed —
see F2. That is a departure from the SOP this worksheet flags rather than hides.

## Findings

Diagnosis codes: **[slip]** an error in a source, **[read]** my own misreading
(resolved, recorded anyway), **[model]** a genuine modelling difference or gap,
**[drift]** the source disagrees with the current drawings. Per SOP Step 5b,
`[slip]` and `[drift]` are mostly unavailable here — there is no source workbook
to slip, and nothing older than the drawings to drift from — but one `[drift]`
turned up between two *exports* of the same drawing.

### F1 — Dimension `M`'s meaning is read from a figure, not from text **[read — resolved, needs a second pair of eyes]**

NAS6403 sheet 1 prints `M = .174/.154` for NAS6403 in the dimension table, and
the standard **never defines M in words**. Sheet 2's lettered notes cover
(a)–(k) and say nothing about M. I read its meaning off the side-elevation
figure: M's extension lines land on the **cotter-hole centreline** and on the
**bolt point**, so M is the hole's setback from the end.

Two independent corroborations, both of which I checked before accepting it:

- **X and Y are *not* the cotter hole.** They look like they might be. They are
  not: note (g) says `"X" minimum (5 thread pitches)` and note (h) says the
  locking element must be ineffective in the `"Y" area (3 thread pitches)`. For
  a .190-**32** thread, 5/32 = .15625 and 3/32 = .09375 — and the table prints
  **X = .156, Y = .094**. They are locking-element regions, to the digit.
- **M scales like a hole setback across the family.** NAS6403 M = .174/.154
  with drill P = .080/.070; NAS6404 M = .180/.160 with P = .086/.076.

Recorded as `[read]` because an automated transcriber would have to make the
same inference from the same figure and could plausibly attach M to the wrong
pair of extension lines. This is the highest-value item in the stack for a
reviewer to re-check.

### F2 — A standard's table has limits but no nominal; the SOP has no rule for that **[model]**

The SOP is emphatic that `nominal` is **transcribed, not computed** (trap 2),
because a hand-built workbook's nominal column carries information — it can sit
outside its own limits, and that is a finding. A NAS dimension table has no
nominal column at all: `M` is printed as `.174 / .154` and nothing else.

`cotter_hole_from_point.nominal = 4.1656` (= .164 in) is therefore the
**midpoint I computed**, which the SOP as written forbids. There was no
alternative that did not either invent a number or leave the field unpopulated
(the schema requires it). Flagged in the element's `note`, and proposed as an
SOP edit in the lesson.

Grip and length are unaffected — sheet 3 prints those as basic sizes with the
tolerance in the column header (`Grip ±.010`, `LENGTH ±.015`), so their nominals
are genuinely transcribed.

### F3 — The washer nomenclature changed between exports **[drift]**

Same drawing, same revision A.1, two exports:

| export | find 32 nomenclature |
|---|---|
| `[2026-JUL-23 POST]` (slice 1's) | `WASHER, FLAT, 6Al-4V, .203" X .438" X .032" MIN, .1900-32 UNJF-3B` |
| `[PRELIM 2026-AUG-3]` (this session's) | `WASHER, FLAT, 6Al-4V, .203" X .438" X .032"` |

The **`MIN` qualifier and the thread call have been dropped.** Slice 1 built a
finding on `.032" MIN` disagreeing with the workbook's `.032 ±.004`; on the
current drawing there is no `MIN` to disagree with. Neither export gives a band.
Recorded, not reconciled: it is the drawing that moved.

### F4 — A view's printed zone is not stable across exports **[drift]**

Slice 1 cites DETAIL B at sheet 4 printed zone **I6**. On the 2026-AUG-3 export
the DETAIL B caption sits at printed zone **H3**, read off the border ticks with
`tests/debug_trace_stack_values.py`. Both are correct for their own export; the
view moved on the sheet.

This is a small finding with a large consequence: **a printed-zone citation has
a shelf life measured in drawing exports.** It is the cleanest argument yet for
`source_ref.element_id` — a stable extracted-element address would survive a
re-export, which a zone label demonstrably does not. Both stay `null` here, as
the schema requires.

### F5 — Grip and length are folded as independent variates, and they are not **[model]**

`thread_region_T` = `bolt_length_11 − bolt_grip_11` folds to
7.5692 … 8.8392 mm worst case, a ±0.635 mm spread. That spread is **not real**.
Sheet 3's own note says *"Nominal length equals nominal grip plus 'T' (see Sheet
1)"*, and `T` is a **reference** dimension (sheet 2 note (b): *"Reference
dimensions are for design purposes only, not an inspection requirement"*). The
standard does not say whether it controls length, grip, or both as the
independent feature, so `fold()` — which knows nothing about correlation —
stacks both tolerances.

The nominal (8.2042 mm = .323 in) is exact and is used as the provenance
cross-check. The **worst case of that path should not be quoted as a
manufacturing spread**, and `cotter_hole_clear_of_sourced_stack` inherits the
same conservatism (its ±0.735 mm worst-case half-range is wider than the part
can really be). This is a *limitation of the fold model*, recorded rather than
worked around: adding correlation to `fold()` would put a second arithmetic path
in the repo, which the architecture explicitly forbids.

### F6 — Balloon quantity prefixes are on the sheet but not in the extraction **[read — resolved]**

`217755_A_balloons.json` gives every DETAIL B balloon `qty: 1` and
`view_places: 1`. The sheet prints `8X 34`, `5X 38`, `8X 33`, `8X 36`, `8X 32`,
`3X 35` — the multipliers are separate text runs beside the balloons, not part of
the extracted balloon records. The `quantity_rollup` block duly reports
`qty_match: False` for finds 32/33/34/35/36/38.

Read naively, that is "six quantity discrepancies in DETAIL B". It is not. Every
prefix was read off the PDF by hand for this worksheet. Recorded because it is a
convincing fake finding of exactly the shape slice 1's `item_no`/`find_no` trap
had (trap 9), and because the 3 + 5 = 8 arithmetic that identifies this joint
*depends* on those prefixes.

### F7 — The as-drawn bushing has no flange at this joint **[model]**

Slice 1's tangential-link stack folds a *flanged* bushing (flange 1.4478–1.5748,
barrel 3.683–3.937, chamfer subtracted) and names 214936-002
`BUSHING, PLAIN, COUNTERSUNK` as the candidate — while noting it balloons in
sheet 5 **DETAIL F**, not DETAIL B. DETAIL F is the tangential link's *other*
end ("3 PLACES", balloons 24/48/49/50/33/36/37 — a NAS1153E14D flush tension
screw, no NAS6403 bolt at all).

At the pitch-link joint, DETAIL B balloons only 214820-002, the **plain**
bushing, `8X`. So this stack models one plain bushing and no flange. If the
pitch-link joint does carry a second bushing that DETAIL B does not balloon, it
lands inside gap 1's budget along with the bearing — which is precisely why the
checks are written as budgets.

### F8 — NAS6403 sheet 5 of 5 is missing from the PDF **[model / intake]**

Sheet 1's `LIST OF CURRENT SHEETS` names five sheets (1 rev 4, 2 rev 2, 3 NEW,
4 rev 2, 5 rev 3). `NAS6403-NAS6420 Rev 4.pdf` holds four pages: sheets 1, 2, 3
and 4. Nothing this stack uses lives on sheet 5 (sheet 4 is the oversize-shank
repair variant, irrelevant here), but a spec-library ingest must not assume the
file is complete. Recorded in the hardware entry's `gaps`.

`data/inbox/specs/` is append-only — nothing was renamed, moved, deduplicated or
tidied, and no file there was edited.

## Source gaps

Ranked. Each names the document that would close it and what it would resolve.
This list is the intake queue for the spec-library / fastener-library stream.

| # | source needed | what it would resolve | priority |
|---|---|---|---|
| 1 | **The pitch link's part number, then its assembly drawing** (candidates: 215177 PITCH PLATE ASSEMBLY, 214849-003 SPINDLE SUBASSEMBLY, 216231-001 HUB AND BLADE ASSEMBLY — none of the three is in this repo) | the spherical-bearing / link-eye width, i.e. the only missing term in the clamped column. Flips `shank_out__11_sourced_only` from an incomplete budget to a real verdict. | **1 — blocks the whole stack** |
| 2 | **MS9363** slotted/castellated nut (absent from `data/inbox/specs/`) | nut height, slot count, slot depth — the thread-start-to-castellation spacing. With NAS6403 now in hand this is the *only* thing between here and answering the joint the way it is actually built. Blocks two joints (this one and slice 1's). | **1 — blocks the governing check** |
| 3 | 214820-002 bushing (Joby part drawing) | the length tolerance. Currently a zero-width band, so every worst-case interval is a lower bound. | 2 |
| 4 | **NAS1149** flat washer (absent from `data/inbox/specs/`) | the `.032 in` thickness tolerance. Same zero-width-band consequence. The parts list has now dropped even the `MIN` qualifier (F3). | 2 |
| 5 | **MIL-S-8879** (the thread spec NAS6403 sheet 1 invokes for UNJF-3A) | the **thread run-out / incomplete-thread length**. NAS6403 turns out *not* to dimension it — see below. This is what slice 1's 1/16 in "thread transition allowance" was standing in for. | 2 |
| 6 | NAS6403 **sheet 5 of 5** | completeness of the standard in the pile (F8). Nothing here depends on it. | 3 |
| 7 | MS24665 / NASM24665 cotter pin | pin-to-hole fit. `.063 in` pin in a `.070/.080 in` hole is consistent; the parts list calls MS24665 while JPS00094 §5.7.6.a calls NASM24665. | 3 |
| 8 | 215197 at a **current** revision | the flange callouts here are read off a `[PRELIM 2025-MAY-22]` export held in drawing-checker's test fixtures. It is the only 215197 PDF available and it is over a year older than the assembly export. | 3 |

### Closed this session — what slice 1 could not source

Slice 1's ranked gap **1** was *"NAS6403 and NAS6404 — grip ±.010, thread
run-out length, and cotter-hole position. Used by every check in every stack."*
`NAS6403-NAS6420 Rev 4.pdf` was already sitting in `data/inbox/specs/`. Opening
it closes two thirds of that gap:

| slice-1 gap | status | where |
|---|---|---|
| grip **±.010** | **CLOSED — traced** | sheet 3, printed column header `Grip ±.010`; dash 11 → `.688`. Definition at sheet 2 note (a): *"Grip-length of bolts shall be measured from the underside of head to the end of the full cylindrical portion of the shank."* |
| **cotter-hole position** | **CLOSED — traced** | sheet 1 table, `M = .174/.154` from the point (F1); drill `P = .080/.070`; sheet 2 note (j) position tolerance `within .010 and normal within 2°` |
| thread **run-out length** | **still open** | NAS6403 dimensions grip (to the end of the full cylinder) and length (to the point), and prints `T (Ref) = .323` between them — but **never dimensions the transition itself**. Gap 5. |

Two more values came free and are now in the hardware entry: overall
**length 1.011 ±.015** (sheet 3) and the shank/thread diameters
(`D .1895/.1890`, `TD .1840/.1810`).

And the part number decodes from the standard rather than from guesswork
(sheet 2 CODE block): `NAS6403` `U`=unplated `11`=grip in .0625 increments
`D`=**drilled shank**. Which also settles, from the part number alone, that this
joint is cotter-retained through the shank.

## The traced / inferred / untraced count

Counting **element instances in this stack**:

> **4 traced / 2 inferred / 0 untraced, out of 6 element instances** — plus
> **1 element that does not exist because it could not be sourced** (the
> pitch-link eye), and **2 of the 6 carrying a zero-width band** because no
> document gives one.

Slice 1 scored **1 traced out of 17** across three stacks. The honest comparison
is not 4/6 vs 1/17, because the two are not the same shape of work:

- **The ratio improved mostly because the documents were there.** Three of the
  four traced values are the NAS6403 bolt, which was in `data/inbox/specs/` the
  whole time and which slice 1 (working inside drawing-checker, before the spec
  pile moved) never opened. Founding this repo around that pile is what closed
  the gap; the SOP is what made opening it the first step instead of the last.
- **A high traced ratio is a reason to audit harder, not to relax** — the review
  checklist says so, and it is right. Every one of the four traced values sits
  in this worksheet with a page/sheet/column citation and, for the one that
  needed inference, a written argument (F1).
- **The denominator is small because I refused to fill it.** A stack that
  invented a bearing width and a bushing band would show **6 traced / 3 inferred
  / 0 untraced out of 9** and look better on every count while being worse in the
  only way that matters. The missing element and the two zero-width bands are
  the honest cost of that refusal.

`untraced` appears **zero** times, so the SOP's "untraced only as an explicitly
listed gap" rule is satisfied trivially. Every gap is listed above regardless.

## Refused — what I was tempted to fill from memory or from the neighbouring stack

Recorded deliberately: this list is evidence for the spec-sheet-pipeline
decision, and it is the specific failure Jeff suspected of the slice-1 agent.

| value | the tempting number | why refused |
|---|---|---|
| **spherical bearing / pitch-link eye width** | 11.05–11.10 mm — sitting right there in `stack_tan_link_to_pitch_plate.json` | it is an **untraced workbook** value for a **different link**. Copying it would have completed the stack, produced a clean `pass`/`marginal`, and been indefensible. Left as gap 1 and expressed as a budget instead. |
| **thread transition / run-out allowance** | 1.5875 mm (1/16 in), slice 1's `thread_transition` element | slice 1's own `source_ref` calls it `kind: "assumed"`, *"rule-of-thumb allowance, no cited standard"*. I opened NAS6403 specifically to close it and **it is not there** (gap 5). No allowance element exists in this stack. |
| **214820-002 bushing length band** | 4.63/4.76 mm, already in `hardware_entries.json` | workbook-sourced, therefore forbidden in a from-scratch stack (SOP Step 5b). Zero-width band + gap 3 instead. |
| **NAS1149V0332 washer thickness band** | ±.004 in, already in `hardware_entries.json` | same. Zero-width band + gap 4 instead. |
| **MS9363-09 nut height and slot geometry** | a "typical" hex-nut height for a .190-32 thread | MS9363 is not in the pile. This is the one value that would let the *governing* check be written, which is exactly why guessing it would have been the worst possible place to guess. Gap 2. |
| **NAS6403 grip tolerance** | ±.010 in — which I would have recalled correctly | **not refused, but not recalled either.** It is ±.010, and it is `traced` because the printed column header on sheet 3 says so. Had the standard been absent, this would have been a gap, not a recollection. The distinction is the entire point of the SOP's one rule. |
