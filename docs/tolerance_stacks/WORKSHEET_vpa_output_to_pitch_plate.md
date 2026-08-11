# Worksheet — VPA output ↔ pitch plate, grip length

Covers `stack_vpa_output_to_pitch_plate.json`.
Source: `260729_sample_tol_stack.xlsx`, sheet `grip length tols old`, rows 60–75
(forge note `20260729T173648_qjk2xk`). All values in **mm**.

> The workbook may predate the current design. Mismatches against the drawings
> are **findings**, not transcription errors to fix.

## The joint

| | |
|---|---|
| Assembly | 217755 PROPULSION ASSEMBLY, PROPELLER rev A.1 |
| Location | sheet 5, **DETAIL X** (scale 2:1) — caption prints at zone B10, view body immediately above. Jeff: "zone C10, middle-left, lower" ✔ |
| Actuator | 208510-007 VARIABLE PITCH ACTUATOR ASSEMBLY, ALPHA4.3, CW (balloon 1) |
| Mating part as drawn | 215175-002 **TANGENTIAL LINK MOUNT ASSEMBLY**, CCW (balloon 72) — *not* the pitch plate, see F14 |
| Fastener as drawn | NAS6404U13D `.250-28 × .812" GRIP` (balloon 27, qty 1) |
| Bushing as drawn | 214943-002 BUSHING, PLAIN, ALUMINUM BRONZE, `.250" ID` (balloon 28, qty 1) |
| Washer as drawn | MS21299C4K countersunk `.253" × .491" × .063"` (balloon 29, qty 1) |
| Retention as drawn | MS9363-10 castellated hex nut `.25-28` (balloon 25) + MS24665-229 cotter pin `.078"` (balloon 26) |

Every balloon in DETAIL X is qty 1 — a single joint, unlike the tan-link's 3×.

## Ordered elements

> **Provenance update, 2026-08-06** (handoff `traced_labels_and_ratio`).
> Both of this stack's `traced` labels were wrong, and each said so in its own
> note. Elements 5 and 6 cited the 217755 **parts list**, which gives a
> nomenclature nominal and never a tolerance band.
> - **Element 6** is now cited to `NAS6403-NAS6420 Rev 4.pdf` sheet 3, row
>   *Grip Dash No. 13*, NAS6404 column — the band is that table's printed
>   header `Grip ±.010`. Legitimately `traced`: same value, real source.
> - **Element 5** could not be rescued: **MS21299 is not in
>   `data/inbox/specs/`**, so the ±.006 in band still has no document.
>   Downgraded to `inferred`, band still listed as gap 3.
>
> No arithmetic below changed — `check_result` is produced, not stored.

| # | element | role | nominal | min | max | source | conf |
|---|---------|------|---------|-----|-----|--------|------|
| 1 | straight bushing | bushing | 4.7620 | 4.7100 | 4.8100 | workbook E63 | untraced |
| 2 | spherical bearing width | bearing | 8.7100 | 8.6600 | 8.7100 | workbook E64 | untraced |
| 3 | bushing flange thickness | bushing | 1.5750 | 1.4478 | 1.5748 | workbook E65 | untraced |
| 4 | pitch flange thickness | clamped_member | 4.0600 | 3.9600 | 4.1600 | 215197 sh2 zone D10 | inferred |
| 5 | under head chamfer washer | washer | 1.6002 | 1.4478 | 1.7526 | 217755 sh5 DETAIL X (MS21299C4K) | inferred |
| 6 | fastener grip (.812 in) | fastener | 20.6248 | 20.3708 | 20.8788 | **NAS6403-NAS6420 Rev 4.pdf sh3, row *Grip Dash No. 13*, NAS6404 column** | **traced** |

This stack has **no thread-transition allowance** and **no second washer
branch** — strictly less modelling than the tan-link's first pass.

## Path and check

| path | workbook | nominal | WC min | WC max | RSS center | RSS ± | WC ± |
|------|----------|---------|--------|--------|------------|-------|------|
| total | E69/G69/H69 | 20.7072 | 20.2256 | 21.0074 | 20.6165 | 0.2010 | 0.3909 |

| check | workbook | nominal | WC min | WC max | RSS min | RSS max | verdict |
|-------|----------|---------|--------|--------|---------|---------|---------|
| worst_case_shank_out | G75/H75 | **-0.0824** | -0.6366 | 0.6532 | -0.3156 | 0.3322 | **fail** |

This stack carries no `thread_transition` allowance, so its RSS is cleaner than
the tan-link's `shank_out` rows (see the RSS caveat in
`WORKSHEET_tan_link_to_pitch_plate.md` — added by review). The spherical
bearing's band is still one-sided (−0.05/−0), so RSS remains a relative
softening indicator, not a probability statement.

## Re-derivation vs Jeff's cells

Regenerate with
`venv-win\Scripts\python.exe tests\debug_report_tolerance_stacks.py --compare`.

| cell | quantity | Jeff (xlsx cached) | re-derived | delta |
|---|---|---|---|---|
| E69 | total.nominal | 20.7072 | 20.7072 | 0 |
| G69 | total.min | 20.225600000000004 | 20.2256 | 3.6e-15 |
| H69 | total.max | 21.0074 | 21.0074 | 0 |
| G75 | worst_case_shank_out.min | -0.6366000000000014 | -0.6366000000000014 | 0 |
| H75 | worst_case_shank_out.max | 0.6531999999999982 | 0.6531999999999982 | 0 |

**5 of 5 match** exactly. `H69` was stored as a *shared* formula (`<f t="shared"
si="1"/>` with no text of its own, sharing `G69`'s `SUM(G63:G67)`) — worth
knowing for anyone parsing xlsx: a naive reader sees an empty formula there.

## Findings

Continues the numbering in `WORKSHEET_tan_link_to_pitch_plate.md`. Codes:
**[slip]** Jeff's, **[read]** my misreading (resolved), **[model]** modelling
difference, **[drift]** workbook vs current drawings.

### F11 — The stack fails at *nominal*, and the workbook never computed nominal **[slip / incomplete]**

The workbook fills only the two worst-case columns (G75 = −0.637, H75 = +0.653),
which read as a range straddling zero — roughly centred, nothing alarming. But
the nominal case, which the sheet never evaluates, is
`20.6248 − 20.7072 = −0.0824`: **the grip is already 0.08 mm short of the stack
at nominal**, before any tolerance is applied. RSS is −0.316 / +0.332, also
straddling.

Reporting only the extremes hid the more useful number. A stack synthesizer
should emit nominal, worst case and RSS as one set, always.

### F12 — Column I is a loose hardware list, not row-aligned **[read — resolved, and it is a trap]**

In this block the workbook's `comments` column holds two part numbers:
`I62 = NAS77A4-015` on the *header* row, and `I64 = MS21299C4K` beside
`spherical bearing`.

Read positionally, that labels the spherical bearing as an MS21299C4K. It is
not: MS21299C4K is a **countersunk washer**, `.253" × .491" × .063"`, and its
`.063 ±.006 in` thickness matches **row 67**'s "under head chamfer washer"
(1.6002 / 1.4478 / 1.7526) to the digit. The parts list settled it.

A naive row-aligned ingester would have produced a stack with a washer part
number attached to a bearing element. Comment columns in hand-built sheets are
free text; they need a human or a cross-check, not an offset.

### F13 — NAS77A4-015 is absent from the assembly **[drift]**

The workbook's straight bushing is `NAS77A4-015`. It appears **nowhere** in the
217755 parts list. The bushing actually ballooned at DETAIL X is Joby
**214943-002** (`BUSHING, PLAIN, ALUMINUM BRONZE, .250" ID`, find 28, qty 1).

Either the design moved from a NAS standard to a Joby detail part, or the NAS
number was a placeholder while the part was being drawn. The workbook's
4.71/4.81 length limits therefore have no source at all — they cannot be checked
against a standard that isn't used or a part drawing this repo doesn't hold.

### F14 — The joint may not touch the pitch plate **[drift, unresolved]**

The stack is named "VPA Output to Pitch Plate" and its clamped member is a
"pitch flange thickness". But DETAIL X balloons the VPA (item 1) against
**215175-002 TANGENTIAL LINK MOUNT ASSEMBLY, CCW** (item 72). The pitch plate
assembly (215177-001) is ballooned in sheet 4 DETAIL B, not here.

So the 4.06 flange in this stack may belong to 215175, not 215197 — in which
case the value and tolerance matching 215197 is a coincidence of two parts
sharing a 4.06 mm flange, which is entirely plausible in one assembly. No 215175
drawing is in this repo, so this cannot be settled here.

### F15 — The 4.06 ±0.10 value traces, but the *feature* does not **[read — partially resolved]**

215197 carries **three** distinct 4.06 flange callouts:

| where | callout | GD&T | likely |
|---|---|---|---|
| sheet 2 zone B4, SECTION A-A | `3X 4.06 ±0.08` | ⌖⌀0.2 A B C, ⊥0.05 F, 3X INDIVIDUALLY | the tan-link joint (3 links) |
| sheet 2 zone D10 | `5X 4.06 ±0.10` | ⌖⌀0.2 A B C, ⊥0.05 G, 5X INDIVIDUALLY | ? |
| sheet 1 zone D5 | `4.06 ±0.10` | ⌖0.2 A B C, datum D | ? — 1×, matches this joint's qty |

So the tan-link stack's ±0.08 and this stack's ±0.10 are **both real** and are
**not** an inconsistency in Jeff's sheet — my first reading of them as a
contradiction was wrong. But ±0.10 alone cannot say *which* of the two ±0.10
features this stack means. The joint is qty 1, which argues for the sheet-1 D5
callout; nothing in the workbook says.

This is the cleanest argument in the slice for feature identity: value matching
got us to "one of two", and only a stable per-feature address gets us to "this
one".

### F16 — Castellated nut + cotter pin; grip length cannot answer this joint **[model]**

Retention is MS9363-10 castellated hex nut + MS24665-229 cotter pin. As with the
tan-link joint (F8), the governing constraint is **castellation-slot vs
cotter-hole alignment**, which quantises acceptable grip rather than bounding
it. The workbook models a continuous grip length and stops.

This is the joint `DRAFT_tolerance_stack_mvp.md` names explicitly — *"cotter-pin
hole vs castle-nut slot location — known-tricky, usually doesn't solve
analytically and requires washer mix/match guidance at assembly. Output should
say so rather than pretend a clean answer exists."* Slice 1's answer: it says so.

## Source gaps

| # | source needed | what it would resolve | priority |
|---|---|---|---|
| 1 | ~~**NAS6404** (.250-28 hex bolt)~~ — **PARTIALLY CLOSED 2026-08-06.** `NAS6403-NAS6420 Rev 4.pdf` covers NAS6403 through NAS6420 in one document; it is now in `data/inbox/specs/`. | Element 6's grip ±.010 is now `traced` to sheet 3 (dash 13, NAS6404 column: grip .812, length 1.182). **Still open:** thread run-out and cotter-hole position (`M`) are on sheet 1 and have not been modelled — this stack has no thread-transition element at all. | 2 |
| 2 | **MS9363-10** castellated nut | slot count + depth; the check that governs | **1 — blocks F16** |
| 3 | **MS21299** countersunk washer | the ±.006 in band, and the countersink geometry that "under head chamfer" is really about. **Confirmed absent from `data/inbox/specs/` on 2026-08-06**, which is why element 5 is `inferred` and not `traced`. | 2 |
| 4 | 214943-002 bushing (Joby part drawing) | the as-drawn bushing's length limits (replaces NAS77A4-015 entirely) | 2 |
| 5 | 208510-007 VPA ASSEMBLY | the 8.66/8.71 spherical bearing width — no bearing balloon in DETAIL X because it is internal to the actuator | 3 |
| 6 | 215175-001/-002 TANGENTIAL LINK MOUNT | whether the 4.06 flange belongs here rather than on 215197 (F14) | 2 |
| 7 | NAS77 (plain bushing) | whether the workbook's original part exists in the design at all | 4 |

**Traced, for contrast:** one element — the NAS6404U13D grip, `.812 ±.010 in`
off `NAS6403-NAS6420 Rev 4.pdf` sheet 3. Nothing on this joint is traced to a
*part drawing*; 215197's contribution is `inferred` at best (F15).

**This stack: 1 traced / 2 inferred / 3 untraced out of 6 element instances.**
Across all three seeded stacks: **5 of 26 `traced`**, 3 `inferred`, 18
`untraced`. The definition lives in `docs/SOP_TOLERANCE_STACK.md` ("The traced
ratio"); reproduce with `tests\debug_report_tolerance_stacks.py --ratio`.

> **Moved, 2026-08-10** (handoff `fastener_citations_and_confidence`). The
> three-stack figure above was 3 of 26 (7 `inferred`, 16 `untraced`). **Nothing
> on this stack changed** — the move is entirely in the two tan-link stacks. One
> thing here did move, in `hardware_entries.json` rather than in the stack:
> `NAS6404U13D`'s `values_source` was still `kind: "workbook"` / `untraced` with
> a gap reading *"NAS6404 standard absent"*, four days after element 6 was
> traced to that very standard. It now cites sheet 3 like the element does.

> **Correction, 2026-08-06.** This paragraph used to say *"two elements — the
> MS21299C4K washer thickness and the NAS6404U13D grip, both from the assembly
> parts list + balloons, both nominal-only (their tolerance bands still come
> from the workbook)"*. That sentence describes `inferred` and then calls it
> traced; the JSON agreed with the label, not with the description. The grip
> earned the label on 2026-08-06 by acquiring its standard; the washer lost it.
