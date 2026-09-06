# Worksheet — end-stop vision baseline (task B): can an agent derive the end-stop stack from the drawings alone?

Handoff `endstop_vision_baseline` (staged 2026-08-31, worked 2026-09-01).
Source of the experiment:
`C:\workspace\dispatch\docs\strategy\drafts\DRAFT_3d_annotation_surface.md`,
"Parked here: the end-stop vision baseline (task B)".

> **This is a calibrated capability baseline, not a tolerance stack.** No
> `stack_*.json` is produced and none should be: the experiment is *expected to
> fail*, and the deliverable is the precise record of **where** it fails. That
> record is the requirements input for the 3D-annotation-surface MVP. Do not
> polish the stack; polish the failure record.

**Ground truth:** `data/inbox/tolerance_stacks/260825_End_Stop_JC.xlsx` and its
transcription `WORKSHEET_end_stop_graft.md` (43 element instances, **0 of 43**
traced, plus 11 geometry/sensitivity model inputs scored separately here). The
graft worksheet's own findings F1–F4 mark where the *ground truth itself* is
uncertain; per the handoff this baseline scores against **what the sheet says**
and flags sheet-side uncertainty rather than guessing Jeff's intent.

For orientation against this repo's SOP-grade work: the three seeded stacks
currently trace **5 of 26** element instances.

**Variant arm — checked, not available.** The handoff's optional arm (repeat the
attempt against CAD section-view screenshots with per-component colours, if Jeff
has dropped them into `data/inbox/tolerance_stacks/`) was checked at session
start, 2026-09-01: that directory holds `.gitkeep`, three `.xlsx` workbooks and
`PROVENANCE.md`, and no image of any kind. The variant arm did not run. Its
tradeoff (no balloons on a coloured view, forcing cross-referencing) therefore
remains unmeasured and is carried forward as a follow-up, not a result.

---

## 1. Prediction (written and committed BEFORE the drawing was opened)

**Protocol note — how the seal was kept.** This section was written and
committed before any page of any 217755 export was rendered or read. What I had
already read at the time of writing: the ground-truth transcription
(`WORKSHEET_end_stop_graft.md`), this repo's `CLAUDE.md` and SOP, the two
trigger lessons (`LESSONS_20260825_fastener_stack_shadow.md`,
`LESSONS_20260825_endstop_graft_workorder.md`), the strategy draft, directory
**listings** (filenames only) of `drawing-checker/data/inbox/drawings/` and
`data/runs/`, and the crop-rendering tooling's own source. I had **not** opened
217755 sheet 3, or any other sheet, in this session. Prior-knowledge caveat
stated plainly so the calibration is honest: the fastener-stack lesson already
told me 217755 has at least 8 sheets and named DETAIL B (sheet 4), DETAIL X
(sheet 5) and SECTION T-T (sheet 8), and the graft worksheet already told me
drawing-checker's structured JSON stops at title block / notes / parts list.
Neither told me anything about sheet 3 or SECTION E.

### 1a. Predicted counts

| prediction | value | range I would accept as "called it" |
|---|---:|---|
| P1 — element instances I can **locate** (name the feature and point at a sheet/zone) | 11 of 43 | 6–16 |
| P2 — element instances whose **value matches** ground truth *and* carries a real drawing/spec citation (i.e. would be SOP-`traced`) | 3 of 43 | 1–6 |
| P3 — element instances I correctly record as an **explicit gap** | 32 of 43 | 27–37 |
| P4 — §1 geometry/sensitivity inputs (11 of them) derivable from 2D | 2 of 11 | 0–4 |
| P5 — contributors I would enumerate **from the drawing alone**, with no ground truth in hand | 12–18 | — |
| P6 — of those, how many are real ground-truth rows (precision) | about 60% | 40–80% |

**P5/P6 are the prediction I care most about**, and they are the one thing the
per-element score table cannot measure: scoring found/missed against a known
43-row list silently supplies the answer key. My prediction is that the drawing
**does not enumerate its own contributor list** — that an agent working from
217755 sheet 3 alone would produce a materially shorter list, would not know it
was short, and would also invent contributors the sheet suggests but Jeff's
model does not use. If that holds, the headline finding of this baseline is not
"2D reading is inaccurate" but **"2D reading cannot bound the problem"**, which
is a strictly worse failure mode and a different requirement for the MVP.

### 1b. Predicted breakage taxonomy, assigned primary-only (sums to 43)

Categories are the handoff's, sharpened so each element gets exactly one primary
class:

| # | category | what it means | predicted count |
|---|---|---|---:|
| A | **view interpretation** | the feature is visibly on the sheet, but which face / direction / datum the tolerance applies to cannot be pinned from the view | 5 |
| B | **cross-sheet balloon chase** | the value exists on a part drawing that *is* reachable, but only by following a balloon off this sheet to another sheet or another document in the pipeline | 6 |
| C | **nominal or band absent from 2D** | no 2D document in the pipeline carries it; the value lives in a part file (I will name which part) | 15 |
| D | **sensitivity / motion ratio needed** | a kinematic constant, derivable only from the mechanism's CAD, never from a dimensioned face | 0 (of the 43 contributors) |
| E | **not a drawing quantity at all** | engineering estimate, self-declared placeholder, or a derived rollup of other rows | 4 |
| F | **spec / catalog value, not a drawing value** | belongs to a fastener or bearing standard; the drawing's job is only to say *which* part | 13 |

Predicted D-count among the 11 §1 geometry inputs, scored separately: **9 of
11** (the two motion ratios `D10`/`F10` are flagged in the ground truth as
CAD-sourced constants; the radii, the link angle and the link length are the
kind of thing an assembly section view usually *implies* without dimensioning).

### 1c. Named per-element predictions

Stated at row granularity so hindsight cannot soften them. Row references are
`WORKSHEET_end_stop_graft.md`'s.

**Predicted derivable (the P2 candidates), with why:**

1. **Rows whose B value is exactly 0.20 or 0.10 mm** — rows 32, 37, 38, 41, 42,
   43, 48, 57, 61, 62 (0.20) and 20, 39, 44, 45 (0.10). Fourteen of 43 rows sit
   on two round numbers, and row 38's own comment ("2 decimals => +/-0.1") and
   row 39's ("tol +/-0.05") say out loud where they came from: **a title-block
   general-tolerance convention, not a callout**. I predict I can trace the
   *convention* off the drawing's title block / general notes, and that this is
   the single largest class of apparent success — and also a trap, because
   tracing the default tolerance is not tracing the dimension. I will score
   these separately as **`convention-traced`** rather than let them inflate P2.
   P2's 3 is my estimate of rows where a *specific callout* on a sheet gives the
   band.
2. **Row 63** (gas spring bushing clearance, 0.18 mm, "based on TB tolerances
   (catalog p~239)") — predicted **not** derivable; "TB" is unresolved in the
   graft worksheet and the pile's RBC catalogs were explicitly not claimed as a
   match. Predicting a dead-end here, class F.
3. **Rows 33 / 35 / 49 / 53 / 55** (0.01 mm fastener size tolerances, one
   comment names "NAS1154") — predicted class F dead-end: NAS1154 is absent from
   `data/inbox/specs/`. The fastener-stack lesson's finding was that this class
   is exactly where 2D *does* work when the standard is in the pile; here it is
   not. This is a **document-acquisition** gap masquerading as a vision gap and
   I want it labelled as such, not counted against 2D reading.
4. **Rows 34 / 36 / 50 / 54 / 56** (0.013 mm bearing size tolerances) — same,
   class F, spherical-bearing bore/OD bands from a bearing standard.

**Predicted hard dead-ends, with the part file that would hold the value:**

- Rows 17–21 (blade root seats / bearing race profiles, hub side and blade side)
  → the dual-bearing hub assembly and the blade bonded assembly. Predicted
  class C or B depending on whether `555787-001` / `555786-001` /
  `546791-001`'s sheets carry the GD&T; I predict **B** for the two hub-side
  rows (a hub drawing is in the pipeline) and **C** for the blade-side rows.
- Row 22 (blade root to OML, "Probably closer to .03deg") → class **E**. It is a
  bare angular estimate with no linear precursor anywhere in the sheet. No
  drawing can supply it because it is not a drawing quantity.
- Row 26 ("need to correct — based on undersized hole for match drilling") →
  class **E**. A match-drilled hole's position tolerance is a *process*
  statement; the sheet's own comment says the number is wrong.
- Row 57 ("does not exist yet. Must roll up ring gear seat and tan link mount
  position") → class **E**. The ground truth declares this row nonexistent while
  carrying 0.2 mm.
- Row 68 (gas spring bushing tipping backlash) → class **E**, derived from rows
  63/66/67 by a formula, not read from anything.
- Rows 23, 27, 30, 40 (pitch arm bore / clocking hole / link hole / spherical
  bearing bore *size* tolerances) → class **C**: hole size tolerances live on
  the part drawing of the part with the hole (pitch arm, pitch plate), and I
  expect neither to be in the pipeline as a released 2D sheet.
- Rows 31, 52 (pitch link length, tan link length, 0.06 mm) → class **C**; a
  link's length tolerance is on the link's own drawing.
- Rows 58, 59, 60, 64 (mount feature sizes, blade-root-to-hub) → class **C/B**.
- Rows 51, 62 (tan link mount position, gas spring bushing position) → class
  **A**: I expect these features to be *visible* in a section view of the
  mechanism with no positional callout attached, which is the archetypal
  view-interpretation dead end.

### 1d. Predictions about the mechanics of the attempt

- **P7 — "sheet 3, SECTION E" may not be on sheet 3 of the newest export.** The
  pitch-link lesson recorded DETAIL B moving I6 → H3 between two exports *of the
  same revision*. I predict roughly 40% odds the newest 217755 export puts
  SECTION E on a different sheet, a different zone, or renames it — and that
  finding, if it lands, is itself a requirement (a citation keyed to a printed
  label is not stable across exports).
- **P8 — the section view will not be readable at export resolution in one
  crop.** "Tightly packed, dozens of contributors" plus a full-size sheet
  rendered to a raster means I predict I need multiple overlapping crops at high
  zoom, and that some callout text will be at or below legibility. I predict at
  least one value I can *see* but not *read with confidence* — the "unreadable"
  third outcome from this repo's spec-library design, appearing in a drawing
  rather than a photocopy.
- **P9 — no `stack_*.json` will be written.** With P2 predicted at 3 of 43, a
  stack definition would be 40 `untraced` elements: a stack with no result, and
  the SOP forbids `untraced` as a quiet fallback. Predicting that the honest
  output is this worksheet and nothing else.

### 1e. What would falsify the experiment's premise

Stated so the baseline can be *wrong* in the useful direction: if P2 comes back
at 15+ of 43, or if the drawing turns out to enumerate its own contributor chain
(P5/P6 near-perfect), then 2D-face reading plus better drawing-checker
extraction is the cheaper investment and the 3D annotation surface should be
re-scoped or deferred. I do not expect that, but the attempt is run so that
outcome is *reachable*, not excluded by construction.

---

## 2. The attempt

One focused pass, 2026-09-01. Read-only throughout; drawing-checker's tree was
snapshot-counted before and after (see §6).

**Documents opened, in the order the chase forced.** Every value below was read
from the PDF's own text layer and cross-checked against a rendered crop; nothing
is recalled.

| # | document (`C:\workspace\drawing-checker\data\inbox\drawings\`) | what it is | sheets | dimensioned? |
|---|---|---|---:|---|
| 1 | `[PRELIM 2026-AUG-19] 217755 A.1 PROPULSION ASSEMBLY, PROPELLER.pdf` | the assembly the whole stack lives on; newest export (2026-08-19) | 9 | **no — see §2a** |
| 2 | `215177-A.pdf` | PITCH PLATE ASSEMBLY (find no 31 → `215177-001`) | 1 | no (parts list only) |
| 3 | `215735-A.pdf` | **PITCH PLATE, PROPELLER** (piece part, find no 1 of 215177) | 2 | **yes** |
| 4 | `212966-006-A.pdf` | **PROPELLER HUB, DUAL BEARING GEN 5** (piece part) | 7 | **yes** |
| 5 | `213668-002 A.1 MOUNT, GAS SPRING, PROPELLER.pdf` | gas-spring mount | 2 | yes |
| 6 | `546791 B.1 BLADE BONDED ASSEMBLY, INSTRUMENTED, PROPELLER, M1.pdf` | blade; sheet 3 = ROOT DETAILS (sheets 4-5 = AIRFOIL SECTIONS / FINISH DETAILS) | 5 | partly |
| 7 | `[PRELIM 2026-AUG-27] 555787-001 A.1 DUAL BEARING GEN5 HUB ASSEMBLY, BIRD STRIKE.pdf` | the *only* route to document 4 — see §2c | 2 | no |
| 8 | `216528-C.pdf` | M1 PROPULSION ASSEMBLY; consulted only to resolve `215175-001` | 9 | no |

### 2a. The finding that ends the experiment before it starts: 217755 carries no dimensions

`SECTION E-E` **is** on sheet 3 of the newest export, exactly where the handoff
said (label at p3 zone A11; sheet description "GAS SPRING AND INSTRO"). The
citation was stable across exports — prediction P7's 40% odds of drift did not
fire.

But the view has nothing to read. A full-text sweep of all nine sheets for any
token containing a decimal number returns:

| sheet | words | tokens containing a decimal |
|---:|---:|---:|
| 1 | 1906 | 19 — *all* of them in general notes, parts-list nomenclature, or torque ranges |
| 2 | 111 | **0** |
| **3** | **129** | **0** |
| 4 | 181 | **0** |
| 5 | 159 | **0** |
| 6 | 155 | **0** |
| 7 | 126 | **0** |
| 8 | 182 | **0** |
| 9 | 114 | **0** |

Sheet 3's entire numeric content is: the printed zone grid, the title block
(`217755`, `3:4`, `A1`, `SHEET 3 OF 9`), two view scales (`SCALE 3:2`,
`SCALE 2:1`), and four balloons (`43`, `44`, `77`, `79 2X`). The rendered sheet
confirms it: SECTION E-E is a large full-assembly cross-section carrying
**section/detail cut markers and balloons and nothing else** — no dimension
lines, no feature control frames, no datum symbols.

> **217755 is a dimensionless drawing by design.** All eight of its graphical
> sheets are balloon-identification views; every number on the drawing lives on
> sheet 1, in the notes and the 103-row parts list. The "behemoth" is a behemoth
> of *parts*, not of dimensions.

This is a different and worse failure than any category the handoff anticipated.
The cited view cannot be misread, misinterpreted, or read at low confidence —
there is nothing on it to read. Vision, resolution, crop strategy and OCR are
all irrelevant at this sheet. What the sheet does give is an **identity
substrate**: which parts are in contact, and their find numbers.

### 2b. So the derivation becomes a BOM descent, and that is where it succeeds or dies

With no dimensions on the assembly, every value must come from a piece-part
drawing reached by following a find number down the BOM. Result for the parts
the stack names:

| stack component | 217755 find no | part no | piece-part 2D drawing in the pipeline? |
|---|---:|---|---|
| pitch plate | 31 | `215177-001` → `215735-001` | **yes** — two-level descent, both present |
| propeller hub | (via 3 → `216231-001`) | `212966-006` | **yes, but only laterally** — see §2c |
| gas-spring mount | — | `213668-002` | yes |
| blade | (via 3) | `546791` | yes (M1 instrumented variant) |
| hub and blade assembly | 3 | `216231-001` | **no** |
| pitch plate nutplate carrier | 39 | `217262-001` | **no** |
| tangential link mount assembly | 40 | `215175-001` | **no** |
| lower gas spring body assembly | 41 | `215176-002` | **no** |
| piston body, gas spring | 88 | `214700-002` | **no** |
| gas spring piston head UPR / LWR | 91 / 93 | `214698-002` / `214699-002` | **no** |
| pitch anti-rotation link assembly | 24 | `212956-005` | **no** |
| variable pitch actuator assembly | 1 | `208510-007` | **no** |
| "pitch arm" | (not balloted on 217755) | `215071-001` — **resolved in review**, see the correction below | **no** |
| ring gear | (not balloted on 217755) | `215072-001` — **resolved in review**, see the correction below | **no** |

Four of fourteen owners are reachable. **Ten are named-but-absent**, and none
is unresolvable: every owner this stack names has a part number, and for ten of
them the piece-part drawing is simply not in the pipeline.

> **Correction, 2026-09-01, `review/endstop_vision_baseline`.** This paragraph
> and the last two rows of the table above read, as written by the attempt:
> *"Nine are named-but-absent. One — the 'pitch arm', which owns four stack rows
> (23, 26, 27, 30) — cannot be resolved to a part number at all"*, with the ring
> gear likewise `not resolvable`. Both halves are wrong, and the arithmetic was
> wrong too. **(a)** The table has fourteen rows: four reachable, *eight*
> named-but-absent, two called unresolvable — `4 + 9 + 1 = 14` only by dropping
> the ring-gear row. **(b)** Both "unresolvable" owners resolve, in documents
> that were sitting unopened in the same inbox:
> `[PRELIM 2026-AUG-31] 555786-001 A.1 HUB AND BLADE ASSEMBLY, PROPELLER, BIRD
> STRIKE.pdf` sheet 1 parts list, find no 11, prints
> `215071-001 PITCH ARM, PROPELLER, CLOCKWISE` qty 5 — and that drawing's sheet
> 4 is titled `PITCH ARM AND LINK INSTALL`; `[PRELIM] 215500-001 A.1.pdf`
> (RING GEAR ASSY, PROPELLER) find no 1 prints
> `215072-001 RING GEAR, VARIABLE PITCH MECHANISM`. Neither piece-part drawing
> is in the pipeline, so rows 23/27/30 remain gaps — but they are class **B**
> (owner named, drawing absent), not a class of their own, and class **H** does
> not exist. 555786-001 reaches the pitch arm by the same lateral hop through
> the bird-strike configuration that §2c uses for the hub, and it also carries
> `1 555787-001`, so the descent 555786-001 -> 555787-001 -> `212966-006` is a
> complete two-level chain that was available all along.
>
> **The method failure behind it is the one worth carrying forward:** §2a's
> document set was *chased into*, not *enumerated*. Eight PDFs were opened out
> of the ~30 in `data/inbox/drawings/`, and 555786-001 — dated 2026-08-31, the
> day this handoff was staged, and **named in this worksheet's own prediction
> at §1c** — was never opened. An experiment whose product is "which owners are
> reachable" has to list the reachable set before it starts chasing.

### 2c. The balloon chain to the hub is severed, and I only reached it by luck

217755 balloons `216231-001 HUB AND BLADE ASSEMBLY, CW, PROPELLER` (find no 3).
That drawing is **not in the pipeline**, so the intended descent
217755 → 216231-001 → hub piece part dead-ends at step one.

I reached the hub anyway, but only because
`[PRELIM 2026-AUG-27] 555787-001 A.1 DUAL BEARING GEN5 HUB ASSEMBLY, BIRD STRIKE.pdf`
happens to sit in the same inbox, and *its* parts list carries
`1 212966-006 PROPELLER HUB, DUAL BEARING GEN 5`. That is a **lateral hop
through a different configuration's assembly drawing** — a bird-strike variant,
not the assembly 217755 balloons. The hub piece-part number was therefore
obtained from a document that is not on this stack's BOM path. Recorded as a
standing caveat on every hub-sourced value in §3: the *part* is very probably
the same hub, but the chain that would prove it is not in evidence.

### 2d. The drawings state, on their own faces, that they are not the complete definition

Three released piece-part drawings in the reachable set carry an explicit
delegation to the 3D model:

- **`215735-A` sheet 1, note 5:** "ALL VIEWS CONTAINING UNSPECIFIED FEATURES
  SHALL BE CONTROLLED BY ASSOCIATED 3D DEFINITION 215735-001 AND (MIRROR
  COMPONENT) 215735-002."
- **`212966-006-A` sheet 1, note 8:** "FOR COMPLETE DEFINITION THIS DRAWING
  SHALL BE USED WITH THE MODEL 212966-006."
- `215735-A` title block: `TOLERANCE PER ISO-2768-mK` — a general-tolerance
  *standard* by reference rather than an enumerated block, i.e. unspecified
  features are covered by citation, not by callout.

This is the most important sentence the attempt produced, because it means the
2D ceiling is **not** a tooling limitation this workspace could engineer around.
The released drawing itself says the 3D model is part of the definition and that
the sheet is deliberately incomplete. The 3D-annotation draft's precedence rule
("a dimension on a released 2D drawing face always wins; the `.step` fills gaps
only where the drawing explicitly recognizes the model in its notes") is not a
convention being chosen here — it is the condition already printed on the
drawings, in the exact form the draft guessed at.

### 2e. General-tolerance regimes are heterogeneous across one stack

Two different, incompatible regimes appear among four parts of the same stack:

| document | regime |
|---|---|
| `215735-A` (pitch plate) | `TOLERANCE PER ISO-2768-mK` |
| `213668-002` (gas-spring mount) | decimal-place block: `X = ±1.0`, `X.X = ±0.25`, `X.XX = ±0.10`, `X.XXX = ±0.050`; angles `X = ±1°`, `X.X = ±0.5°` |
| `212966-006` (hub) | decimal-place block: `X = ±1`, `X.X = ±0.25`, `X.XX = ±0.10`, `X.XXX = ±0.050`; angles `X = ±5°`, `X.X = ±1°`, `X.XX = ±0.5°`, `X.XXX = ±0.1°` |
| `555787-001` (hub assembly) | same decimal-place block as the hub |

The ground truth's own comments name this convention twice — row 38 "2 decimals
=> +/-0.1" and row 39 "tol +/-0.05" — and they match the **decimal-place block**
letter for letter (`X.XX = ±0.10` → 0.20 total width; `X.XXX = ±0.050` → 0.10
total width). That is a genuine, citable derivation of *where those numbers came
from*, and it explains the sheet's striking concentration of values on 0.20 and
0.10 (14 of 43 rows).

It is also a trap, which is why the prediction insisted on scoring it separately
as `convention-traced` rather than `traced`:

1. It traces the **default** tolerance, not the dimension. It says nothing about
   which feature, in which direction, between which datums.
2. It is **not universal across the stack.** Applying "2 decimals ⇒ ±0.1" to a
   pitch-plate feature is wrong: 215735 is an ISO-2768-mK drawing and prints no
   such block. And every row whose owner drawing is absent (§2b) has an
   *unknown* regime, so even the convention cannot honestly be applied to it.

### 2f. What was actually read, with citations

Reachable dimensioned callouts, by document and printed border zone. This is the
evidence base for §3.

**`215735-A` — PITCH PLATE, PROPELLER**

| sheet | zone | callout |
|---:|---|---|
| 1 | H8 | `5X ⌀ 5.20 ±0.10` |
| 1 | G8 | `⌖⌀0.3Ⓜ A B C`, `⌀0.1Ⓜ A B` |
| 1 | G10 | `⏥0.1` |
| 1 | F10 / F9 | `⌀ 9.520 ±0.010`, `⌖⌀0.2`, `⌖⌀0.03` |
| 1 | E10 / E9 | `⌀ 10.010 ±0.008`, `⌖⌀0.03Ⓜ D` |
| 1 | D8 | `⌀ 41.040 ±0.025`, `⊥⌀0.1 A` |
| 1 | D5–D7 | `4.06 ±0.10` (×2), `10.68 ±0.10`, `⌖0.2 A B C` → `D` |
| 1 | C5 / B5 | `2X SR 29.92 <CF>` with composite frame `⌓ 0.25 A B` over `⌓ 0.12` |
| 2 | G6 / G5 | `2X 6.50 ±0.05`, `⌖0.2Ⓜ A B C` |
| 2 | B9 / C4 / C3 | `5X ⌀ 7.950 +0.015/0.000`, `⌖⌀0.2 A B C`, `⌖⌀0.1 A` |
| 2 | B9 / C9 | `5X ⌀ 8.520 ±0.008`, `⌖⌀0.03Ⓜ GⓂ 5X INDIVIDUALLY` |
| 2 | D3 / D4 | `3X ⌀ 8.520 ±0.008`, `⌖⌀0.03Ⓜ FⓂ 3X INDIVIDUALLY` |
| 2 | C4 (right) | `3X ⌀ 7.950 +0.015/0.000`, `⌖⌀0.2 A B` |
| 2 | B5 / D10 | `5X 4.06 ±0.10` / `3X 4.06 ±0.08`, `⌖ 0.2 A B C`, `⊥ 0.05 F/G` |
| 2 | C5 / C9 | `3X 3.50 ±0.10`, `3X 13.62 ±0.10`, `5X 9.39 ±0.10`, `5X 3.00 ±0.10` |

**`212966-006-A` — PROPELLER HUB, DUAL BEARING GEN 5** (7 sheets; sheet 4 is the
blade-root seats, all `5X INDIVIDUALLY`)

| sheet | callouts |
|---:|---|
| 2 | `⌀ 401.815 ±0.025`, `⌖⌀0.050Ⓜ A B`, `5X ⌓0.3 A B`, `103.35 ±0.10`, `4.81 ±0.05`, `13.81 ±0.10` |
| 3 | `⌀ 215.900 0.000/-0.050` `⊥⌀0.05 F`; `⌀ 190.500 ±0.013` `⏥0.015` `↗0.050 A B`; `⌀ 202.140 ±0.015` `⌭ 0.02` `⌓0.25 A B C` `⊥⌀0.015 A`; `⌀ 214.055 ±0.015` `↗0.025 A B` **CRITICAL PART**; `⌀ 132.073 ±0.017` `↗0.025 A B`; `2X ⌀ 3.52 ±0.20` `⌖⌀0.1 A B C ⌀0Ⓜ` |
| **4** | `⌀ 106.310 0.000/-0.025` + `⌖⌀0.10Ⓛ A B C` **CRITICAL PART**; `⌀ 92.030 0.000/-0.022` + `⌖⌀0.10Ⓛ A B C` + `↗0.05 D-E`; `⌀ 79.985 0.000/-0.025` + `↗0.25 D-E`; `⌀ 102.20 ±0.03` + `↗0.25 D-E`; `57.750 ±0.050`; `2.40 +0.05/-0.25`; `0.90 +0.10/-0.15`; `7.84 MIN` |
| 5–7 | `⌓0.25`, `⌖⌀0.10Ⓜ A`, `5.50 ±0.10`, `3.30 ±0.05`, `2.51 / 3.70 / 5.30` at `±0.05` / `±0.20` |

**`213668-002` — MOUNT, GAS SPRING** (sheet 1 = OVERVIEW, sheet 2 = PART
DETAIL). **Re-read in full during review** — see the correction below; the
attempt's list was scoped to sheet 2, put three sheet-1 callouts on sheet 2, and
missed every feature control frame on the part because this drawing's GD&T
glyphs are not in its text layer.

| sheet | callouts |
|---:|---|
| 1 | `76.86 ±0.10`, `5X 4.00 ±0.10`, `10X 5.00 ±0.10`, `0.25 A B`, `(85.36)`, `(257.00)`; title block `X = ±1.0 / X.X = ±0.25 / X.XX = ±0.10 / X.XXX = ±0.050`, angles `X = ±1° / X.X = ±0.5°` |
| 2 | `214.78 0.00/-0.152`, `220.37 0.00/-0.08` with **`⌖ ⌀0.2 A B`**, `10.60 ±0.20`, `2X 2.79 ±0.03`, `(0.50)`, `70 ±2`, `4.95 +0.25/0.00`, `8X R 0.25 ±0.13`, `CF 50.77 +0.03/0.00`, `2X R 0.45 ±0.20`, `0.05 A`, `51.99 +0.03/0.00`, `6.40 ±0.10`, `0.03 B`, `CF 2X 2.51 ±0.05 THRU`, `4.75 THRU`, `5X 47.943 ±0.013`, `⌀5.00 0.15 X 100°`, `0.40 A B` (×2), `0.05 B`, `2X R 0.25 ±0.13`, `2.18 ±0.03`, `2X 4.78 ±0.10`, `2X 6.80 +0.06/-0.20`, `54.10 ±0.03`, `58.458 ±0.013`, `3.71 ±0.10` |

> **Correction, 2026-09-01, `review/endstop_vision_baseline`.** Three of the
> attempt's sixteen listed callouts (`76.86 ±0.10`, `5X 4.00 ±0.10`,
> `10X 5.00 ±0.10`) are on **sheet 1**, not the sheet 2 the list is scoped to.
> More seriously, the list holds no feature control frame except a bare
> `0.05 A`, and the part carries at least six — including a
> **true-position `⌖ ⌀0.2 A B`** on the `220.37` feature, which is what
> falsifies row 61's recorded absence (§3, §3c F7). The cause is §2g: this
> drawing's text layer contains **zero** GD&T glyphs, so a text-layer sweep sees
> `0.2 A B` as three loose tokens and never sees a position tolerance at all.
> Verified by crop at 10x.

**`546791` sheet 3 — ROOT DETAILS:** `88.70 ±0.15`,
`⌀ 6.350 +0.015/0.000 CF CC`, `⌖⌀0.05 A B CC`, `⌖⌀0.08 A B`, `⌭ 0.03`,
`1.5 ±0.8`.

### 2g. P8 was wrong, and the reason matters

I predicted at least one callout I could see but not read with confidence. That
did not happen: these are native vector PDF exports with an exact text layer, so
no *value* in this attempt was resolution-limited or ambiguous. P8 is wrong on
legibility.

> **Correction, 2026-09-01, `review/endstop_vision_baseline`.** This paragraph
> read *"...and **could not** have: ... so every callout extracts as characters,
> GD&T symbols included (`⌖ ⌀ ⏥ ⌓ ⊥ ⌭ ↗ Ⓜ Ⓛ`)"*. The "could not" is false and
> the generalisation does not hold across the reachable set. Glyph counts over
> each whole document's text layer:
>
> | document | `⌀` | `⌖` | `⏥` | `⌓` | `⌭` | `↗` | `Ⓜ` | `Ⓛ` |
> |---|---:|---:|---:|---:|---:|---:|---:|---:|
> | `215735-A` | 19 | 12 | 1 | 2 | — | — | 8 | — |
> | `212966-006-A` | 34 | 8 | 3 | 4 | 1 | 7 | 6 | 2 |
> | `546791` | 3 | 2 | — | 5 | 1 | — | — | — |
> | `215177-A` | — | — | — | — | — | — | — | — |
> | **`213668-002`** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
>
> `213668-002` prints feature control frames — a 10x crop of sheet 2 shows
> `⌖ ⌀0.2 A B` in a boxed frame — and **not one of its GD&T glyphs is in the
> text layer**; they are drawn as vector geometry. So on that drawing the text
> layer returns the *value* and drops the *geometric characteristic*, which is
> exactly the identity information §2h and §4b say is the bottleneck. A
> text-only correlation pass over this document set does not read it losslessly;
> it reads it **plausibly**, which is worse, and that is what produced this
> attempt's one false absence (row 61).

**Correction to a standing assumption in this repo.** The graft worksheet's
currency check recorded rows 66/67 as "couldn't-check" because drawing-checker's
structured JSON stops at title block / notes / parts list and "individual linear
dimensions exist only as rendered page images/crops, not as extracted values a
text search can read." The second half of that is true of *drawing-checker's
extraction* and false of *the PDFs*: reading the PDF text layer directly returns
every dimension **value** losslessly (the geometric characteristic is a separate
question — see the correction above). That upgrades two of that worksheet's
couldn't-checks to demonstrable absences (§3, rows 66/67) — reconfirmed in
review by grepping `34.7` and `83.1` across **every** PDF in
`data/inbox/drawings/`, not just `213668-002`'s two sheets; neither appears
anywhere. And it means the bottleneck was never legibility — it is identity.

### 2h. The enumeration test (P5/P6) — the answer-key problem

The prediction's central claim was that the drawing does not enumerate its own
contributor list. Confirmed, in a stronger form than predicted.

Working forward from the documents alone, what I hold is roughly **90 distinct
dimensional callouts across five drawings** and *no statement anywhere of the
kinematic chain*. Nothing on any sheet says that the pitch plate's 5X bore
position feeds blade pitch angle through a 1.67 deg/mm motion ratio, or that the
gas-spring bushing clearance tips the pitch plate, or which of the hub's four
`5X INDIVIDUALLY` diametral seats is "the blade root seat" in the stack's sense.
The chain exists only in Jeff's workbook and in CAD.

So the honest answer to "how many contributors would I enumerate from the
drawings alone" is: **I would enumerate callouts, not contributors, and I would
have no basis for choosing 43 of them or ordering them into a chain.** P6
(precision) is therefore not measurable, because the forward-direction output is
not the same *kind* of object as the ground truth. That is the finding, and it is
worse than the predicted "a materially shorter list."

The corollary is the sharpest single result of this baseline, and it is visible
in §3's own arithmetic: **of the 4 rows scored `traced`, one (row 18) was
identifiable only because the workbook supplied the number that named the
feature** — ground-truth `B15 = 106-85` ↔ `⌀ 106.310` on hub sheet 4. Remove the
answer key and that trace disappears. The other three rest on a single callout
whose feature identity was established by *counting* (5X bores ↔ 5 blades, 3X
bores ↔ the qty-3 anti-rotation links) — the SOP's Step 1 identification method,
and the only method that worked at all without the key.
---

## 3. Per-element score table

All 43 element instances of `WORKSHEET_end_stop_graft.md`, scored per the
handoff: found/missed, value match/mismatch, correctly-identified gap. Row
numbers and ground-truth values (`GT`, the workbook's B column in mm) are that
worksheet's.

**Outcome vocabulary used here** (defined once, so the counts mean one thing):

- **`traced`** — a callout was found *and* its feature identity was established
  *and* the value matches. This is the only outcome that would survive the SOP.
- **`mismatch`** — identity established, value disagrees with the workbook.
- **`candidate`** — a callout with a matching or near value exists on a
  plausible part, but the feature identity could **not** be established. This is
  the category the experiment exists to measure, and treating it as a trace is
  precisely the failure the SOP's one rule forbids.
- **`gap`** — no callout in reach; the document that would close it is named.

| row | element (GT value, mm) | outcome | citation / why not |
|---:|---|---|---|
| 17 | blade root seats in hub position tol (0.12) | **mismatch** | `212966-006` sh4 `⌖⌀0.10Ⓛ A B C` on `⌀106.310`, 5X. Drawing says **0.10 at LMC**; workbook says 0.12 and its comment says "diameter MMC". See F1, F2. |
| 18 | blade root seat diameter tols, hub side (0, "press fit (+.025/-0) total tol width") | **traced** | `212966-006` sh4 `⌀ 106.310 0.000/-0.025` **CRITICAL PART**, 5X INDIVIDUALLY. Band width 0.025 matches exactly; sign is inverted vs the workbook's "+.025/-0" (see F3). Identity established via GT `B15 = 106-85` — i.e. **using the answer key**, see §2h. |
| 19 | blade root ID bearing race surf profile (AB) (0.05) | **candidate** | Two 0.05 callouts in reach, neither is profile-to-A-B: `212966-006` sh4 `↗0.05 D-E` (runout, datums D-E) and `546791` sh3 `⌖⌀0.05 A B CC` (position). Characteristic differs from the workbook's "surf profile" in both. |
| 20 | blade root OD bearing race surf profile (0.10) | **candidate** | `212966-006` sh4 `⌖⌀0.10Ⓛ A B C` is 0.10 — but that is the *same* callout row 17 claims, and again position not profile. `↗0.25 D-E` is the runout on that seat and is 0.25. |
| 21 | blade root diameter, blade side (0.025) | **candidate** | Blade-side owner is the blade root; `546791` sh3 ROOT DETAILS carries `⌀ 6.350 +0.015/0.000` (0.015) and no 0.025. The hub's 0.025 bands are the *hub* side (row 18). |
| 22 | blade root to OML (no linear precursor; 0.181 deg estimate) | **gap — correctly identified** | Not a drawing quantity. The workbook itself says "Probably closer to .03deg". Class E. |
| 23 | pitch arm bore size tolerance (0.04) | **gap — correctly identified** | Owner is `215071-001 PITCH ARM, PROPELLER, CLOCKWISE` (555786-001 sh1 parts list, find no 11 — *resolved in review*, see §2b); its piece-part drawing is not in the pipeline. Class B. |
| 26 | pitch arm fastener-to-fastener position (0.03) | **gap — correctly identified** | Not a drawing quantity: match-drilled, and the workbook says "need to correct". Class E; GT finding F2. |
| 27 | pitch arm clocking hole size tolerance (0.01) | **gap — correctly identified** | Owner `215071-001`, drawing absent (as row 23). Class B. |
| 30 | pitch arm link hole size tolerance (0.01) | **gap — correctly identified** | Owner `215071-001`, drawing absent (as row 23). Class B. |
| 31 | pitch link length tolerance (0.06) | **gap — correctly identified** | Owner `212956-005 PITCH ANTI ROTATION LINK ASSEMBLY` is balloted (find no 24) but its drawing is absent from the pipeline. Class B. |
| 32 | pitch plate hole position tolerance (0.20) | **traced** | `215735-A` sh2 zone B9/C4 `⌖⌀0.2 A B C` on `5X ⌀ 7.950 +0.015/0.000`. Identity by count: 5X bores ↔ 5 blades. **Shares its single callout with rows 37 and 48 — see F4.** |
| 33 | pitch link fastener 1 size (0.01) | **gap — correctly identified** | `NAS1154` named by the workbook, absent from `data/inbox/specs/`. Class F — a document-acquisition gap, not a vision gap. |
| 34 | pitch link bearing 1 size (0.013) | **gap — correctly identified** | Spherical-bearing band; no bearing standard in the pile resolves it. Class F. |
| 35 | pitch link fastener 2 size (0.01) | **gap — correctly identified** | As row 33. Class F. |
| 36 | pitch link bearing 2 size (0.013) | **gap — correctly identified** | As row 34. Class F. |
| 37 | pitch plate piston flange (A-datum) to pitch link hole position (0.20) | **traced** | Same `⌖⌀0.2 A B C` as row 32 — and the workbook's own row name says "A-datum", which is that frame's primary datum. See F4. |
| 38 | piston length tolerance (0.20, "2 decimals => +/-0.1") | **gap — correctly identified** | Owner `214700-002 PISTON BODY, GAS SPRING` absent. `convention-traced` only: the `X.XX = ±0.10` block exists on three other drawings in this stack, but not on the piston's own (absent) drawing, so its regime is unknown. Class B. |
| 39 | piston end to end stop feature (0.10, "tol +/-0.05") | **gap — correctly identified** | As row 38; `convention-traced` to `X.XXX = ±0.050`. **This is the row that most directly names the end stop itself, and its owner drawing is absent.** Class B. |
| 40 | pitch plate spherical bearing fastener bore size (0.01) | **mismatch** | `215735-A` sh2 `5X ⌀ 7.950 +0.015/0.000` → width **0.015**, not 0.01. (`3X/5X ⌀ 8.520 ±0.008` → 0.016; `⌀ 9.520 ±0.010` → 0.020.) No 0.01 band anywhere on the pitch plate. |
| 41 | lower gas spring body height (0.20) | **gap — correctly identified** | Owner `215176-002` absent. `convention-traced` only. Class B. |
| 42 | tangential link mount height (0.20) | **gap — correctly identified** | Owner `215175-001` absent (resolvable via 216528-C's parts list; the drawing itself is not in the pipeline). Class B. |
| 43 | hub lower bearing flange (a-datum) to top bearing flange (0.20) | **candidate** | `212966-006` sh2 `103.35 ±0.10` is a 0.20-width linear on the hub, but which two flanges it spans is not establishable from the sheet. |
| 44 | hub top bearing flange to hub top deck (0.10) | **candidate** | `212966-006` sh2 `4.81 ±0.05` is a 0.10-width linear on the hub; same identity problem as row 43. |
| 45 | hub top deck to tan link mount (0.10) | **gap — correctly identified** | Spans two parts; the tan-link-mount half's owner (`215175-001`) is absent. Class B. |
| 48 | pitch plate to link tangential position (0.20) | **traced** | Same `⌖⌀0.2 A B C` as rows 32/37, resolved in the tangential direction. Legitimate for a diametral position zone (it has both a vertical and a tangential component) — but see F4 on rows 32 vs 37. |
| 49 | pitch link fastener 1 size (0.01) | **gap — correctly identified** | As row 33. Class F. |
| 50 | pitch link bearing 1 size (0.013) | **gap — correctly identified** | As row 34. Class F. |
| 51 | tangential link position, pitch plate (0.15) | **mismatch** | `215735-A` sh2 `3X ⌀ 7.950 +0.015/0.000` with `⌖⌀0.2 A B`. Identity by count (3X bores ↔ qty-3 anti-rotation links, 217755 find no 24). Drawing says **0.2**; workbook says 0.15. See F5. |
| 52 | tan link length (0.06) | **gap — correctly identified** | As row 31. Class B. |
| 53 | tan link fastener 1 size (0.01) | **gap — correctly identified** | As row 33. Class F. |
| 54 | tan link bearing 1 size (0.013) | **gap — correctly identified** | As row 34. Class F. |
| 55 | tan link fastener 2 size (0.01) | **gap — correctly identified** | As row 33. Class F. |
| 56 | tan link bearing 2 size (0.013) | **gap — correctly identified** | As row 34. Class F. |
| 57 | tan link mount position, mount (0.20) | **gap — correctly identified** | Not a drawing quantity: the workbook says "does not exist yet. Must roll up ring gear seat and tan link mount position". Class E; GT finding F2. |
| 58 | tan link mount size, hub feature (0.05) | **candidate** | `212966-006` sh2 `⌖⌀0.050Ⓜ A B` is 0.05 — but that is a **position** tolerance and the workbook row is a **size** tolerance. A value-only matcher would take this; it should not. |
| 59 | tan link mount size, mount feature (0.06) | **gap — correctly identified** | Owner `215175-001` absent. Class B. |
| 60 | gas spring mount size, tan link mount feature (0.06) | **candidate** | `213668-002` sh2 has three 0.06-width bands (`2X 2.79 ±0.03`, `2.18 ±0.03`, `54.10 ±0.03`). Which — if any — is the interface feature is not establishable. |
| 61 | gas spring mount position, tan link mount feature (0.20) | **candidate** | `213668-002` sh2 carries **`⌖ ⌀0.2 A B`** — a true position of exactly 0.20 — on the `220.37 0.00/-0.08` feature. Which feature that frame controls, and whether it is the tan-link-mount interface, is not establishable from the sheet; the mating half's owner (`215175-001`) is absent. See F7. |
| 62 | gas spring bushing position (0.20) | **gap — correctly identified** | Bushing owner not resolvable to a dimensioned drawing. Class B. |
| 63 | gas spring bushing clearance (0.18, "based on TB tolerances (catalog p~239)") | **gap — correctly identified** | "TB" unresolved; no catalog in the pile matches. Class F. |
| 64 | blade root to hub tolerance (0.12) | **gap — correctly identified** | Both owners' drawings are present and were read; **0.12 is on neither**. The one 0.12 in the whole reachable set is `215735-A` sh1 zone B5 — the lower tier of a composite profile frame (`⌓ 0.25 A B` over `⌓ 0.12`) on `2X SR 29.92`, a pitch-plate spherical seat. Unrelated feature, unrelated part. See F6. Class C. |
| 68 | gas spring bushing tipping backlash (derived, 0.431066) | **gap — correctly identified** | Derived by formula from rows 63/66/67; not read from anything. Class E; GT finding F3. |

### 3a. Score

> **Superseded in part, 2026-09-04** (`endstop_retrace_acquired_docs`). This
> table's 23 `gap` rows scored against document acquisition (§4b) have new
> dispositions in §8f, once seven drawings and two specs named in §7 arrived.
> The counts below are the 2026-09-01 figures, kept as-is (insert-only) —
> §8f is the current score.

| outcome | count | of 43 |
|---|---:|---|
| **`traced`** (identity established + value matches) | **4** | 9% |
| `mismatch` (identity established, value disagrees) | 3 | 7% |
| `candidate` (value in reach, identity **not** established) | 8 | 19% |
| **located, total** (`traced` + `mismatch` + `candidate`) | **15** | 35% |
| `gap` correctly recorded, with the closing document named | **28** | 65% |

> **Correction, 2026-09-01, `review/endstop_vision_baseline`.** As written by
> the attempt this table read `candidate` 7 / 16%, located **14** / 33%, `gap`
> **29** / 67%. Row 61 moves `gap` -> `candidate` (F7), which is the only row
> that moves. The `traced` and `mismatch` counts are unchanged, and every
> §5a prediction still lands inside its stated range (P1 15 of 43 in 6-16;
> P3 28 of 43 in 27-37).

The 4 traced rows rest on **2 distinct drawing callouts** (`⌖⌀0.2 A B C` on
215735 sheet 2 serves rows 32/37/48; `⌀ 106.310 0.000/-0.025` on 212966-006
sheet 4 serves row 18). One of those two was identified using the ground truth
itself (§2h).

### 3b. Geometry / sensitivity inputs (the 11 non-derived rows of graft-worksheet §1, whose table has 15)

| input | value | derivable from 2D? |
|---|---:|---|
| B6 pitch radius (pinion) | 40 mm | no |
| B7 pitch arm radius | 50 mm | no |
| B8 blade root radius | 32 mm | no |
| B9 pitch link angle | 77 deg | no |
| D10 pitch motion ratio, −5° worst | 1.67 deg/mm | **no, provably** — a kinematic constant; class D |
| F10 pitch motion ratio, sweep average | 1.25 deg/mm | **no, provably** — class D |
| B11 blade-root tangential ratio | `=50/32` | derived from B7/B8; neither traced |
| B15 inner blade-root bearing ↔ ring-gear pitch dia | `=106-85` = 21 mm | **half** — the `106` term matches `⌀ 106.310` (hub sh4); the `85` (ring-gear pitch dia) is on nothing in the pipeline |
| B16 outer blade-root bearing ↔ ring-gear pitch dia | `=179-85` = 94 mm | no — neither 179 nor 85 appears |
| B66 gas spring bushing vertical separation | 34.7 mm | **no — demonstrable absence.** Both dimensioned sheets of `213668-002` read in full; 34.7 is not among them |
| B67 pitch link radius from gas spring axis | 83.1 mm | **no — demonstrable absence**, same sheets |

**0 of 11 fully derivable; 1 of 11 (B15) half-derivable.** B66/B67 move from the
graft worksheet's "couldn't-check" to **absence** — read for, demonstrably not
there (§2g), which is this repo's spec-library third outcome rather than an
acquisition gap.

### 3c. Findings against the ground truth

Stated as findings *about the comparison*, not corrections to Jeff's sheet.
Where the sheet is already self-flagged (graft worksheet F1–F4) that is noted
rather than re-litigated.

**F1 — the material-condition modifier is inverted.** Row 17's comment says
"diameter MMC"; `212966-006` sheet 4 says `⌖⌀0.10Ⓛ A B C` — **LMC**, on a hole
(a subtracted feature). This is exactly this repo's load-bearing design decision
2 ("LMC/MMC are *material* conditions, not extremes: for a subtracted feature
the mapping inverts"), appearing in live source data. A tolerance stack that
reads the modifier wrong on a bonus-tolerance feature gets the wrong direction
and still totals plausibly.

**F2 — row 17's 0.12 is reconstructible as a *sum* of two callouts.** Position
`⌖⌀0.10` plus the mating seat's size band `0.022` (`⌀ 92.030 0.000/-0.022`)
gives 0.122 ≈ 0.12. That reading is consistent with the row's "diameter MMC"
comment (a bonus-tolerance calculation) and is offered as a hypothesis, not a
trace: it requires knowing which two callouts to combine and with what rule,
neither of which is on the drawing. **One stack row ← two drawing callouts.**

**F3 — row 18's sign is inverted relative to the drawing.** Workbook: "press fit
(+.025/-0)". Drawing: `⌀ 106.310 0.000/-0.025`. The *width* matches exactly
(0.025) and the row contributes 0 to every total, so nothing downstream moves —
but the direction is opposite, which matters the moment anyone uses this row for
a fit rather than a width.

**F4 — one callout serves three stack rows, and two of them are in the same
direction.** Rows 32, 37 and 48 all trace to the single `⌖⌀0.2 A B C` on
215735 sheet 2. Rows 32 (vertical) and 48 (tangential) resolving the same
diametral zone into two components is legitimate practice. Rows **32 and 37 are
both vertical and both 0.20**, and 37's name ("pitch plate piston flange
(A-datum) to pitch link hole position") describes the *same* frame's datum
reference. Whether that is a deliberate second contributor or one tolerance
counted twice in the vertical direction is not resolvable from the drawing.
**Needs Jeff.** It is also the cleanest demonstration in the whole attempt that
the identity map is not 1:1.

**F5 — row 51 disagrees with the released drawing.** Workbook says the
tangential link position on the pitch plate is 0.15 mm; `215735-A` sheet 2 says
`⌖⌀0.2 A B` on the 3X bores. If the identification is right (3X bores ↔ qty-3
anti-rotation links), the workbook is 0.05 mm optimistic on this row. Flagged
with the identification caveat, not asserted.

**F6 — the false-match trap, evidenced.** The only 0.12 in the entire reachable
document set belongs to a composite profile frame (`⌓ 0.25 A B` over `⌓ 0.12`)
on the pitch plate's `2X SR 29.92` spherical seat. Two workbook rows carry 0.12
(17 and 64), and **neither is that feature, on that part, in that direction**. A
correlator matching on value alone takes this every time. Also note the frame
carries *two* tolerance values in two tiers while a stack row carries one scalar
— the surface must say which tier a row consumes.

**F7 — an absence claimed against a drawing that was read, and the drawing
disagrees.** *Added 2026-09-01 in `review/endstop_vision_baseline`.* Row 61 was
scored "gap — correctly identified" on the reasoning that *"`213668-002` has no
0.20-width position callout (`10.60 ±0.20` is a 0.40-width linear)"*. It has
one: `⌖ ⌀0.2 A B`, a boxed true-position frame on sheet 2's `220.37 0.00/-0.08`
feature, confirmed by a 10x crop. The row is a `candidate`, not a gap.

This is F6's twin and it is the more dangerous of the two. F6 is a false
*match* — a correlator claiming a trace it has not earned, and the mistake a
reader is primed to look for. F7 is a false **absence**: the strongest claim a
provenance audit can make ("the document is in hand, it was read in full, the
value is not there"), asserted on the evidence of a text-layer sweep that
structurally could not see the callout, because `213668-002` carries no GD&T
glyph in its text layer at all (§2g). A false absence reads as diligence, is
never re-checked, and here it was one row away from being handed to the
3D-annotation draft as evidence that a released 2D drawing was silent.

**The requirement it generates:** any pipeline that concludes "not on this
drawing" must state *what it looked at* — text layer, vector geometry, or
raster — because on this document set those three see different drawings.

---

## 4. Breakage taxonomy — actual

Primary class, one per element, so the counts sum to 43. One category (**G**) is
new: it did not exist in the prediction or in the handoff's list, and it covers
4 of 43.

> **Correction, 2026-09-01, `review/endstop_vision_baseline`.** The attempt's
> table read A **10** / B **10** / G **4** / **H 3** and opened *"Two categories
> (G, H) are new ... between them they cover 7 of 43"*. Two rows move and one
> whole category dissolves: row 61 goes B -> A (F7, a position callout the
> attempt recorded as absent), and rows 23/27/30 go H -> B (the pitch arm
> resolves to `215071-001`, §2b). **Class H does not exist** — every owner this
> stack names has a part number. The corrected table is below; it still sums to
> 43, and the shape of the result is unchanged: identity and acquisition
> dominate, measurement blocks nothing.

| # | category | what it means | rows | count |
|---|---|---|---|---:|
| **A** | **view / semantics interpretation** — a candidate callout exists on the right part; identity, geometric characteristic, or direction cannot be pinned to the row | 17, 19, 20, 21, 40, 43, 44, 51, 58, 60, 61 | **11** |
| **B** | **balloon chain severed** — the owner is named (by a find number, or by a parts list one lateral hop away), its 2D piece-part drawing is absent from the pipeline | 23, 27, 30, 31, 38, 39, 41, 42, 45, 52, 59, 62 | **12** |
| **C** | **band demonstrably absent from a 2D drawing that IS present and was read in full** — the drawing delegates to the 3D model | 64 | **1** |
| **D** | **sensitivity / motion ratio needed** | none of the 43 contributors (all 2 of them are in §3b's geometry inputs) | **0** |
| **E** | **not a drawing quantity at all** — estimate, self-declared placeholder, or derived rollup | 22, 26, 57, 68 | **4** |
| **F** | **spec / catalog value, document absent from the pile** | 33, 34, 35, 36, 49, 50, 53, 54, 55, 56, 63 | **11** |
| **G** | **identity cardinality** — *traced*, but the callout-to-row map is not 1:1 (one callout ↔ three rows; one row ↔ two callouts) | 18, 32, 37, 48 | **4** |
| ~~**H**~~ | ~~**feature owner unidentifiable**~~ — **withdrawn in review**: the "pitch arm" resolves to `215071-001` and the ring gear to `215072-001`, both in pipeline documents the attempt did not open (§2b) | — | **0** |

### 4a. How this maps onto the handoff's four categories

The handoff asked for: view interpretation / cross-sheet balloon chasing /
nominal absent from 2D (name the part file) / sensitivity or motion ratio needed
/ other. Three of those need sharpening before they describe what happened:

1. **"cross-sheet balloon chasing" is really cross-*BOM-level* chasing, and it
   is two or three levels deep, not one.** Nothing was found by moving between
   sheets of one drawing. The successful chase was
   217755 → `215177-001` → `215735-001` (assembly → sub-assembly → piece part).
   The failed ones failed because a *level* is missing from the pipeline, not
   because a sheet reference was hard to follow. Measured chase depth for the 4
   traced rows: **2 levels** (pitch plate) and **1 lateral hop + 1 level** (hub,
   §2c).
2. **"nominal absent from 2D" splits into three failures with different fixes.**
   Class **B** (12) is an *acquisition* problem — go get `215071-001`,
   `215175-001`, `215176-002`, `214700-002`, `212956-005`, `216231-001`,
   `217262-001`. Class **C** (1) is the real 2D ceiling — the drawing is in
   hand, was read completely, and does not carry the band because it says the
   model does. Class **F** (11) is also acquisition, of standards rather than
   drawings. Only class C is evidence *for* a 3D surface; conflating the three
   would badly overstate the case, and the honest count of "2D was present and
   still insufficient" is **1 of 43** plus the 11 in class A.
3. **"view interpretation" (11) is the dominant genuine failure, and it is an
   identity failure, not a reading failure.** In ten of the eleven the callout's
   *value* extracted perfectly as text; in the eleventh (row 61) the value
   extracted and the **geometric characteristic did not**, because
   `213668-002` carries no GD&T glyph in its text layer (§2g). Either way what
   could not be done was decide *which physical feature the workbook row means*.
4. **"sensitivity / motion ratio needed" scored 0 among the 43 contributors** —
   correctly predicted. It applies to the sensitivity model (§3b), where it is
   absolute: `D10`/`F10` are not on any drawing and never will be.

### 4b. The counts that matter for the MVP scope decision

| question | answer |
|---|---|
| rows where **measurement** was the blocker | **0 of 43** |
| rows where **identity** was the blocker | **15 of 43** (all of A and G) |
| rows where **document acquisition** was the blocker | **23 of 43** (B + F) |
| rows that no drawing or model can ever supply | **4 of 43** (E) |
| rows blocked by the 2D sheet's own delegation to the model | **1 of 43** directly (C), plus most of A indirectly |

*(Corrected 2026-09-01 in review from 14 / 21; the four rows sum to 43. The
attempt's figures were 14 identity + 21 acquisition + 4 + 1 = 40, three short —
class H's three rows were in no line of this table.)*

> **Note, 2026-09-04** (`endstop_retrace_acquired_docs`). The "23 of 43"
> document-acquisition row above is a snapshot at 2026-09-01 — nine of the
> documents it was waiting on have since arrived, and §8b re-scores all 23.
> The class boundaries (measurement 0, identity 15, acquisition 23, never-
> supplied 4, 2D-delegation 1) are unchanged as a *taxonomy*; what changed is
> which specific rows sit in the acquisition bucket now that some of it has
> been read. See §8f for the current located/gap split.
---

## 5. Prediction vs. outcome — calibration

The prediction in §1 was committed at `de99685`, before any sheet was opened.

### 5a. Counts

| prediction | predicted | accepted range | **actual** | verdict |
|---|---:|---|---:|---|
| P1 locatable | 11 of 43 | 6–16 | **15 of 43** | **in range** |
| P2 SOP-`traced` | 3 of 43 | 1–6 | **4 of 43** | **in range** |
| P3 gaps correctly recorded | 32 of 43 | 27–37 | **28 of 43** | **in range** |
| P4 geometry inputs derivable | 2 of 11 | 0–4 | **0 fully, 1 half** | **in range**, at the pessimistic edge |
| P5 contributors enumerable from drawings alone | 12–18 | — | **not the same kind of object** — callouts, not contributors; no chain on any sheet | **premise wrong, in the predicted direction** |
| P6 precision of that enumeration | ~60% | 40–80% | **not measurable** (see P5) | n/a |

All four numeric predictions landed inside their stated ranges. That is a
well-calibrated attempt at the *magnitude* of failure.

*(P1 and P3 corrected 2026-09-01 in review from 14 and 29 — row 61 moves gap ->
candidate, §3a F7. Both were in range before and after; the calibration verdict
does not turn on the correction.)*

### 5b. Taxonomy

| class | predicted | actual | verdict |
|---|---:|---:|---|
| A view interpretation | 5 | **11** | under-predicted 2× |
| B cross-sheet balloon chase | 6 | **12** | under-predicted 2×, and the category needed redefining (§4a.1) |
| C nominal/band absent from 2D | 15 | **1** | **badly wrong** — see below |
| D sensitivity / motion ratio | 0 | **0** | exact |
| E not a drawing quantity | 4 | **4** | **exact, and the same four rows** (22, 26, 57, 68) |
| F spec/catalog | 13 | **11** | close; the 2-row miss was rows 27/30, which are part-feature holes, not catalog parts |
| G identity cardinality | **not predicted** | 4 | category missed entirely |
| ~~H feature owner unidentifiable~~ | ~~not predicted~~ | **0** | **withdrawn in review** — the category was an artifact of an un-enumerated document set (§2b) |

*(A, B and H corrected 2026-09-01 in review, from 10 / 10 / 3.)*

**Where the prediction was wrong, and why it matters more than where it was
right.** I predicted class C (35% of rows) would dominate: "the value lives in a
part file, no 2D document carries it." Actual C is **1 of 43**. What I had
lumped into one bucket is really three problems with three different fixes, and
only one of them argues for a 3D surface:

- most of it was **document acquisition** (B + F = 23 of 43): the drawing or
  standard exists somewhere in Joby's PLM, it just isn't in this pipeline. No new
  tool fixes that; someone exports **seven** more PDFs (§4a.2 names them).
- the genuine 2D-insufficiency case is **1 of 43** where the sheet was in hand,
  read completely, and still silent (row 64) — plus the 11 in class A where the
  sheet spoke but could not be *interpreted*.
- and I entirely missed that the callout-to-row map is **not 1:1** (G).

> **Correction, 2026-09-01, `review/endstop_vision_baseline`.** The bullet above
> ended *"and that a component named in the stack may not resolve to a part
> number at all (H)"*. It does resolve — see §2b. The honest version of that
> lesson is narrower and less flattering: **a component named in the stack may
> not resolve to a part number in the documents you happened to open.** The
> failure was in the attempt's document selection, not in the released data.

**The direction of my error is the useful signal**: I over-predicted the case
that would have justified the 3D surface most simply ("the number isn't drawn
anywhere") and under-predicted the case that actually blocks the work
("the number is drawn, and I can't tell which feature it belongs to"). Those
call for different products. The first wants a measurement tool. The second
wants a tagging tool — which is, independently, exactly the MVP scope the draft
had already narrowed to ("select + tag without measurement"). The baseline
supports that scoping decision on evidence rather than on Jeff's lean.

### 5c. Mechanics

| prediction | actual |
|---|---|
| **P7** — ~40% odds SECTION E-E has drifted sheet/zone in the newest export | **did not drift.** Sheet 3, zone A11, label `SECTION E-E`, in the 2026-08-19 export. Called correctly (60% was the stated majority case). |
| **P8** — at least one callout visible but not confidently readable | **wrong on legibility, right for a reason I did not predict.** Native vector PDFs; every *value* extracts exactly, so nothing was resolution-limited. But `213668-002` puts **none** of its GD&T glyphs in the text layer (§2g), so a text-only read sees a value it cannot characterise — and that is what produced the attempt's one false absence (F7). Corrected 2026-09-01 in review; as written this cell read *"wrong, and structurally so ... every GD&T symbol extracts as a character"*. |
| **P9** — no `stack_*.json` will be written | **correct.** 4 of 43 traced would be a stack of 39 `untraced` elements — a stack with no result, which the SOP's one rule forbids. This worksheet is the whole output. |

### 5d. What the seal was worth

Two things the prediction bought that a post-hoc write-up would not have:

1. The `convention-traced` distinction (§1c item 1) was defined **before** I knew
   the general-tolerance blocks existed. Having committed to scoring it
   separately, I could not later let 14 rows' worth of "±0.1 from the title
   block" inflate the traced count — which, given that the convention turned out
   to be real *and* non-universal (§2e), was the single most tempting
   overstatement available.
2. Predicting P5 in the strong form ("cannot bound the problem") meant the
   enumeration test was run at all. Scoring only the 43-row table would have
   hidden the finding that the forward direction produces a different *kind* of
   object, because the table hands over the answer key by construction.

### 5e. Falsification check (§1e)

§1e said the experiment's premise would be falsified if P2 came back at 15+ of 43
or the drawings enumerated their own chain. P2 = 4; the drawings enumerate no
chain. **Not falsified.** The 3D-annotation direction survives this baseline —
but §5b sharpens *which* 3D capability the evidence supports.

---

## 6. Drawing-checker read-only invariant

`drawing-checker`'s tree is READ-ONLY for this handoff. Snapshot = every entry
under `data/inbox/drawings/` and `data/runs/` with its size.

| | entries | timestamp (UTC) | taken with |
|---|---:|---|---|
| before, taken before any file was opened | 5380 | 2026-09-01T19:45:46Z | ad-hoc `find`, see below |
| after, taken after all reading and rendering | 5380 | 2026-09-01T20:04:51Z | ad-hoc `find`, see below |
| **review**, independent, after the branch was read and re-cropped | **5380** | 2026-09-01T20:15:32Z | `scripts/snapshot_drawing_checker.py` |

**Diff: EMPTY** — no entry added, removed, or changed in size, in either window.

All eight PDFs were opened read-only; every rendered crop and every scratch
script was written to this session's scratchpad directory, never into
drawing-checker's tree and never into this repo's working directory.

> **Correction and independent verification, 2026-09-01,
> `review/endstop_vision_baseline`.** Two things.
>
> **(a) The count was 5382 and the tool says 5380.** The attempt evidenced the
> invariant with an ad-hoc `find | stat` listing rather than
> `scripts/snapshot_drawing_checker.py`, which is what SOP Steps 0 and 8 name
> and the only command that computes this figure. The two enumerations cover the
> *identical* entry set — set-differenced in review, symmetric difference is the
> two root directories `data/runs` and `data/inbox/drawings`, which `find` lists
> and the script does not. So the invariant was never in doubt, but the figure
> in this table did not reproduce with the repo's own command and has been
> corrected to the one that does. **Use the script**: it writes a JSON the next
> reviewer can diff, which a `.txt` in a doomed scratchpad cannot be.
>
> **(b) Verified independently, across a window that brackets the whole
> session.** The previous review session (`review/dag_viewer_poc`) left a
> script-format snapshot at `2026-09-01T19:05:09Z`. Diffing that against a fresh
> one taken at `2026-09-01T20:15:32Z` — a window that opens 40 minutes before
> this session's first commit and closes after the review's own re-reads and
> crops — returns **EMPTY**. That is stronger than the attempt's own evidence
> and it also covers the review.

---

## 7. Requirements handed to the 3D-annotation-surface draft

Ordered by how strongly this attempt supports them. Each is traceable to a
section above, so the draft can cite evidence rather than inference.

1. **Precedence is not a design choice; it is printed on the drawings.** Two
   released piece-part drawings in this stack explicitly delegate to the model:
   `215735-A` note 5 ("UNSPECIFIED FEATURES SHALL BE CONTROLLED BY ASSOCIATED 3D
   DEFINITION") and `212966-006-A` note 8 ("FOR COMPLETE DEFINITION THIS DRAWING
   SHALL BE USED WITH THE MODEL"). The draft's precedence rule can be quoted from
   source. (§2d)
2. **Scope the MVP as select+tag, not measure.** Measurement was the blocker on
   **0 of 43** rows; identity was the blocker on **15**. (§4b)
3. **Identity keys must be many-to-many, with direction and a composition rule.**
   One `⌖⌀0.2 A B C` callout serves three stack rows resolved into different
   directions; one stack row (17) reconstructs as position + size-bonus from two
   callouts. A 1:1 tag model cannot represent either. This is the same edge
   structure as `DAG_TOPOLOGY.md`'s model — the binding interlock in the draft's
   2026-08-31 expansion is confirmed as necessary, not just tidy. (§3c F2, F4)
4. **Material-condition modifiers are part of the identity, not a note.** The
   drawing says `Ⓛ` where the workbook says MMC, on a hole. Carry `Ⓜ`/`Ⓛ`/RFS
   structurally or the surface will reproduce sign errors that still total
   plausibly. (§3c F1, and this repo's design decision 2)
5. **A tag must carry its owner part's general-tolerance regime.** `215735-A` is
   ISO-2768-mK; the hub, the gas-spring mount and the hub assembly print a
   decimal-place block. "2 decimals ⇒ ±0.1" is right on three of those four parts
   and wrong on the fourth. Per-part attribution must include the regime. (§2e)
6. **Open a *set* of STEPs keyed by BOM position, and be able to say "not in the
   set".** The successful descent was two levels; **ten of fourteen** owners
   have no piece-part drawing in the pipeline. The surface needs BOM-path
   attribution and an explicit "owner unavailable" state. (§2b, §2c, §4a.1)
7. **A component's owner may be reachable only *off* the BOM path, and the
   surface must record which path found it.** The hub was reached by a lateral
   hop into a different configuration's assembly (`555787-001`, bird strike),
   and the pitch arm and ring gear resolve **only** through that same
   configuration (`555786-001`, `215500-001`) — the assembly 217755 actually
   balloons for the hub-and-blade level (`216231-001`) is not in the pipeline at
   all. A part number obtained off-path is a hypothesis about part identity, not
   a fact, and the tag must carry that distinction rather than flattening it
   into "owner: 215071-001". (§2b, §2c)

   > *Rewritten 2026-09-01 in review.* This requirement read **"Support a
   > 'component name → no part number' state"**, argued from *"'Pitch arm' owns
   > four stack rows and resolves to nothing in any parts list"*. That premise
   > was false — see §2b — so the requirement is restated on what the evidence
   > actually shows.
8. **Composite feature control frames carry two tolerances; a stack row carries
   one.** The surface must record which tier a row consumes. (§3c F6)
9. **Extract from vector geometry, not from the text layer alone — and never
   claim an absence from a text-layer read.** These exports are native vector
   PDFs and every dimension *value* comes out of the text layer exactly, so
   OCR-grade vision buys nothing. But the geometric characteristic does not
   always come with it: `213668-002` puts **zero** GD&T glyphs in its text layer
   while printing `⌖ ⌀0.2 A B` on the sheet, and that gap is what let this
   attempt record a position callout as absent (F7). Since the characteristic is
   precisely the identity information requirement 2 says is the bottleneck, a
   text-only correlation pass is not merely incomplete — it is *confidently*
   incomplete. drawing-checker growing finer extraction is still a cheap,
   separable win independent of the 3D work; it just has to read the frames, not
   the words. (§2g, §3c F7)

   > *Rewritten 2026-09-01 in review.* This read **"Do not invest in
   > vision-for-reading ... The correlation pass can read every callout
   > losslessly today"**, which is false for one of the five dimensioned
   > drawings in the reachable set and false in the direction that cost this
   > attempt a scored row.
10. **Value-only correlation is actively dangerous, with a worked example.** The
    single 0.12 in the reachable set is a pitch-plate spherical-seat profile
    refinement; two workbook rows carry 0.12 and neither is that feature. Any
    auto-correlator must require an identity argument, not a value match. (§3c F6)

---

## 8. Re-trace of the 23 acquisition-blocked rows against newly acquired documents, 2026-09-04

Handoff `endstop_retrace_acquired_docs`, worked 2026-09-04, branch cut from
`integration`. Source: this worksheet's own §7 acquisition list (the "seven
drawings and eleven standards" of the 2026-09-01 lesson). Jeff exported seven
part drawings from drawing-checker's inbox and dropped two specs into
`data/inbox/specs/`; this section re-scores every one of the 23 rows §4b
counted as **document-acquisition-blocked** (class B, 12 rows, + class F, 11
rows) against them. **No `stack_*.json` is produced here either** — same
reason as §0: too few of the 23 land on a clean numeric trace to make a stack
anything but 18 `untraced` elements with a gap list attached.

**Documents newly in hand, with the revision actually read** (per this
session's handoff: record the revision, not just the part number — an earlier
citation of these parts by number alone, at an unstated revision, would not
survive an export). Drawing-checker's tree is unchanged by this reading — see
the invariant check at the end of this section.

| document | revision read | drawing-checker path |
|---|---|---|
| PITCH ARM, PROPELLER | **C** | `215071-C.pdf` |
| TANGENTIAL LINK MOUNT ASSEMBLY, PROPELLER | A | `215175-A.pdf` |
| LOWER GAS SPRING BODY ASSEMBLY, PROPELLER | A | `215176-002-A.pdf` |
| PISTON BODY, GAS SPRING, PROPELLER | A | `214700-002-A.pdf` |
| PITCH ANTI ROTATION LINK ASSEMBLY, PROPELLER | A | `212956-005-A.pdf` |
| HUB AND BLADE ASSEMBLY, PROPELLER | **B.1** | `216231 B.1 HUB AND BLADE ASSEMBLY, PROPELLER.pdf` |
| NUTPLATE CARRIER (217262) | A | `217262-A.pdf` |
| NAS1151 thru NAS1158 (national aerospace standard) | 2012 | `data/inbox/specs/NAS1151- NAS1158.PDF` |
| Trelleborg Aerospace catalogue | August 2011 | `data/inbox/specs/trelleborg_aerospace_gb_en.pdf` |

Neither `215071` nor `216231` had been read at **any** revision before this
session (both were "named but absent" in §2b), so there is no earlier-revision
value to compare against — nothing to flag as drift, just the two revisions
recorded per the handoff's instruction.

### 8a. The method that mattered: identify by a mating dimension, not by a matching number

Two of the five new part drawings' most useful identifications did not come
from a text label (none of these drawings prints "clocking hole", "link hole"
or "bore" anywhere) and did not come from hunting for a number that happened
to equal the workbook's — the trap §4a already names three times over (F6,
F7, this section's own F10 below). They came from a **mating-dimension
cross-reference**, the same method this repo's NAS6403/MS9363 pairing already
established as legitimate:

- `212956-005-A.pdf`'s parts list calls out **both** its spherical bearings
  (`MS14101-3`, `MS14103-3`) as `.1900 BORE ID` — exactly 4.826 mm
  (0.19 in × 25.4). `215071-C.pdf` sheet 2 carries exactly one hole at that
  diameter (`⌀4.826 ±0.010`, with a countersink and a composite position
  frame). A clevis pin through the anti-rotation link's bearing and through
  this hole is the only physical joint that explains a shared, exact,
  non-round-number diameter between two independently-drawn parts. That is
  identity by cross-reference, not by luck of the value matching — the value
  (0.020 mm band) does **not** match the workbook's 0.01 mm, and is scored a
  mismatch below precisely because identity and value are separate questions.
- `215176-002-A.pdf` (LOWER GAS SPRING BODY ASSEMBLY)'s own parts list
  resolves find no. 1 to `213668-002 MOUNT, GAS SPRING, PROPELLER` — a part
  already fully read in the 2026-09-01 session, for a different set of rows
  (60/61/62). Nothing new needed to be opened; the new drawing's only useful
  content was the identity link telling this session which already-read
  callout answers row 41.

### 8b. Per-row disposition

Outcome vocabulary extends §3's (`traced` / `mismatch` / `candidate` / `gap`)
with one label carried over from §1c/§2e: **`convention-traced`** — a real,
citable derivation off the owner's *own* general-tolerance block, applied to
an explicitly un-toleranced dimension, but not a specific numeric callout.
Per the handoff's three requested outcomes (traced / measured absence / still
blocked), a `mismatch` or `candidate` result below **is** the "traced"
outcome in the sense that mattered to the handoff — the owning document is in
hand and a value was read from it — scored precisely rather than rounded up.

| row | element (GT, mm) | old (§3) | **new** | citation / reasoning |
|---:|---|---|---|---|
| 23 | pitch arm bore size tol (0.04) | gap, class B | **mismatch** | `215071-C.pdf` sh2 zone F8: `⌀64.030 +0.030/0.000` `⊥⌀0.05 A`. The only central-axis (shaft) bore on the part — identity is not in doubt (a gear has exactly one bore). Band 0.030 mm vs GT 0.04 mm. |
| 27 | pitch arm clocking hole size tol (0.01) | gap, class B | **candidate** | `215071-C.pdf` sh2 zone G2, View A: `2X ⌀6.35 ±0.01`, position `⌀0.03 Ⓛ A B`. Best remaining candidate by elimination once the link hole is identified (row 30) — no text on the sheet calls anything "clocking", and two holes for one indexing feature is plausible but unconfirmed. Not scored `traced`. |
| 30 | pitch arm link hole size tol (0.01) | gap, class B | **mismatch** | `215071-C.pdf` sh2 zone E9/E10: `⌀4.826 ±0.010`, countersink `⌀7.74 x100° BACKSIDE`, `⌖⌀0.13 Ⓛ A B C`. Identity via §8a's pin-diameter cross-reference to `212956-005`'s bearings. Band 0.020 mm vs GT 0.01 mm — see F9 below. |
| 31 | pitch link length tol (0.06) | gap, class B | **still blocked (owner refined)** | `212956-005-A.pdf` (PITCH ANTI ROTATION LINK ASSEMBLY) read in full: its only length figure, `(81.43)`, is parenthesized — a reference dimension, not toleranced (a measured absence against *this* document). The toleranced length is on the link body piece part, **`213863-004`**, one BOM level deeper, not received. |
| 38 | piston length tol (0.20, "2 decimals=>+/-0.1") | gap, class B | **convention-traced** | `214700-002-A.pdf` sh1 general-tolerance block (`X.XX = ±0.10`) and sh2 zone F6: overall length `113.67`, printed to 2 decimals with no explicit tolerance — inherits the block's ±0.10 (band 0.20 mm), matching GT exactly. Stronger than §2e's prior `convention-traced` cases: the **owning part's own drawing** carries both the block and the dimension, not a sibling part's. |
| 39 | piston end to end stop feature (0.10, "tol +/-0.05") | gap, class B | **candidate (strong)** | `214700-002-A.pdf` sh2 zone D5: `5.00 ±0.05` (band 0.10 mm) — matches GT's value *and* its comment text verbatim, and is the only ±0.05 callout on the whole part. Located at a small groove near the piston's threaded tip (opposite the mounting flange). Not scored `traced`: nothing on the sheet names it an "end stop" contact face, it could be a thread-relief/retaining-ring groove, and the row may describe an *assembly* clearance (piston vs. a separate stop feature) that a single-part drawing cannot state alone. **The row that names the end stop itself remains the one this session is least willing to overclaim.** |
| 41 | lower gas spring body height, top to mtg flange (0.20) | gap, class B | **traced** | §8a's identity link resolves the owner to `213668-002`, already read. `213668-002 A.1 MOUNT, GAS SPRING, PROPELLER.pdf` sh1 zone B12, SECTION C-C: `76.86 ±0.10` (band 0.20 mm) = overall height, top rim to mounting-flange plane. Exact match. |
| 42 | tangential link mount height (0.20) | gap, class B | **still blocked (owner refined)** | `215175-A.pdf` (TANGENTIAL LINK MOUNT ASSEMBLY) read in full: dimensionless like 217755 — its only dims, `(⌀258.00)` and `(79.00)`, are references. Its own parts list resolves the actual housing to **`215198-001`/`215198-002`** (MOUNT, TANGENTIAL LINK, CW/CCW) and the seal bushing to **`214723-002`** (BUSHING, SEALED, TANGENTIAL LINK) — neither received. |
| 45 | hub top deck to tan link mount (0.10) | gap, class B | **still blocked** | Spans two owners. Hub half: `212966-006`, already available (candidate features only, §3 rows 43/44). Tan-link-mount half: blocked as row 42. No document states the spanning path between the two even once both owners are dimensioned. |
| 52 | tan link length (0.06) | gap, class B | **still blocked (owner refined)** | As row 31 — `212956-005` is find no. 24 on 217755 and serves both the "pitch link" and "tan link" positions the workbook names (one physical anti-rotation-link part, reused). Same absence, same deeper owner (`213863-004`), still not received. |
| 59 | tan link mount size, mount feature (0.06) | gap, class B | **still blocked (owner refined)** | As row 42 — `215198-001`/`215198-002` or `214723-002`, neither received. |
| 62 | gas spring bushing position (0.20) | gap, class B | **still blocked (hypothesis refined)** | `217262-A.pdf` (NUTPLATE CARRIER, 217263-001/-002) arrived but does not map to this row — no bushing or position dimension on it, only rivnut/self-locking-nut hardware. Best identified candidate owner, from `215175`'s own parts list: **`214723-002`** (the sealed bushing at the tan-link-mount joint) — its piece-part drawing is also not received, so this is a hypothesis for the next acquisition pass, not a resolved identity. |
| 33, 35, 49, 53, 55 | pitch/tan link fastener size (0.01 each) | gap, class F | **mismatch** | `NAS1151- NAS1158.PDF` TABLE I, row NAS1154 (the workbook's own comment names this dash): shank `⌀D = .2495/.2485 in` (band 0.0254 mm) — the functionally correct reading of "fastener size" for a clearance-hole stack. See F10 below for the column-choice reasoning and the rejected alternative. |
| 34, 36, 50, 54, 56 | pitch/tan link bearing size (0.013 each) | gap, class F | **still blocked** | Not closed by either new document. These are metal self-aligning spherical bearings (`MS14101-3`/`MS14103-3` per `212956-005`'s parts list) — a Military Standard part, not a Trelleborg polymer bearing. The MS14101/MS14103 spec sheets themselves are still absent from the pile. |
| 63 | gas spring bushing clearance (0.18, "TB catalog p~239") | gap, class F | **identified, not traced** | `trelleborg_aerospace_gb_en.pdf` — "TB" = Trelleborg, confirmed (not merely guessed) by the printed page number: PDF page 241's footer reads "239", an exact match to the workbook's own "catalog p~239" once the file's own +2 footer offset is known. Section: "Table I Turcon® Slydring® Piston and Rod Bearing" — a piston/rod glide-ring bushing product, matching "gas spring bushing" exactly. The section gives a bearing-exposure **calculation method** (Figure 4/5, printed pp.240/242) and part-number tables keyed to AS4716 dash number, not a single quotable clearance figure; reproducing 0.18 mm needs a dash-number/cross-section selection the workbook does not state. A long-standing identification question is closed; the number is not. |

### 8c. New findings against the ground truth (continuing §3c's F1–F7)

**F8 — the pitch arm bore is narrower than the workbook records.** `215071-C`
sh2 `⌀64.030 +0.030/0.000` (band 0.030 mm) vs the workbook's 0.04 mm (row 23).
Identity is solid (the gear's one central bore); the disagreement is a
genuine finding, not an identification miss.

**F9 — the pitch-arm link hole is twice the workbook's band, and the
identity method is new to this repo's endstop work.** `215071-C` sh2
`⌀4.826 ±0.010` (band 0.020 mm) vs the workbook's row 30, 0.01 mm. Identity
established via §8a's pin-diameter cross-reference to `212956-005`'s
`.1900 BORE ID` spherical bearings (0.19 in = 4.826 mm exactly) — a
non-arbitrary, non-value-matched argument. The 2:1 ratio between the drawing's
band and the workbook's figure is the same shape as a `±0.010`-vs-`0.020`-total
transcription slip; offered as a hypothesis for Jeff, not asserted.

**F10 — NAS1154 has no column that reads 0.01 mm, and the closer number was
deliberately not adopted.** Two TABLE I columns are candidates for the
workbook's "fastener 1/2 size" (rows 33/35/49/53/55): shank `⌀D`
(.2495/.2485 in, band 0.0254 mm) and gage `⌀C` (.4245/.4241 in, band
0.0102 mm — numerically the closer match to 0.01 mm). The shank diameter is
adopted because it is the dimension that actually sits in a mating clearance
hole and drives fit; the gage diameter is a thread pitch-diameter inspection
gauge, functionally unrelated to an assembly clearance stack. Recorded so the
close-but-wrong number is visible and was not the deciding factor — the F6/F7
trap, in reverse (a matching value on the *wrong* feature, rather than a wrong
value on the right one).

### 8d. Two acquisition-refinement findings (feed the "seven drawings" list, don't replace it)

Three of the seven newly-received drawings turned out to be **assemblies**,
dimensionless in exactly the way 217755 is (§2a) — a pattern worth naming
before the next acquisition pass repeats it:

- `215175-A.pdf` (tangential link mount) → the housing is `215198-001`/`-002`
  and its seal bushing is `214723-002`. Neither piece-part drawing is in the
  pipeline.
- `212956-005-A.pdf` (pitch anti-rotation link) → the toleranced link body is
  `213863-004`, one BOM level deeper. Not in the pipeline.
- `215176-002-A.pdf` (lower gas spring body) → resolved cleanly, because its
  one piece part, `213668-002`, happened to already be in hand from the prior
  session (§8a). This is the one of the three where the extra BOM level cost
  nothing.

**The acquisition list should now name `215198-001`, `215198-002`,
`214723-002` and `213863-004` by their own part numbers**, not by the
assembly drawings that turned out to balloon them — asking for "the
tangential link mount" or "the anti-rotation link" a second time would very
likely return the same two assembly sheets already in hand.

`217262-A.pdf` (nutplate carrier) does not map to any of the 23 rows (§8b,
row 62) — it may still be useful for a row outside this pass, or it may
simply not have been needed; not claimed as either.

`216231 B.1 HUB AND BLADE ASSEMBLY, PROPELLER.pdf` restores part of the
severed balloon chain §2c flagged: its parts list balloons `215071-001` and
`215071-002` (the pitch arm) directly, on the actual (non-bird-strike)
assembly — removing, for the pitch arm specifically, the "identified only via
a lateral hop through a different configuration" caveat §2c and requirement 7
carried. It does **not** balloon `212966-006` (the hub piece part) directly;
it balloons a sub-assembly (`216135-001` through `-005`), so the hub's own
"reached only through the bird-strike configuration" caveat stands.

### 8e. The 3D-annotation evidence count (deliverable 4): zero new class-C rows

The handoff asked for an explicit count of *measured absences on a drawing in
hand and fully read* — the evidence class that argues for a 3D surface rather
than more 2D acquisition (§4b's class C). This session's answer is **0
among the 23 re-traced rows**, and the reasoning matters more than the
number:

Two of the newly-received drawings (`215175-A.pdf`, `212956-005-A.pdf`) were
read in full and demonstrably do **not** carry a value six of the 23 rows
need (§8d) — a real "read for, not there" outcome, but against the *assembly*
sheet, not the correct final owner. Every piece-part drawing actually opened
this session that IS a plausible final owner (`215071-C`, `214700-002-A`,
and — via §8a — `213668-002`) **did** carry an explicit, conventionally
toleranced dimension for every feature this session went looking for on it
(rows 23/27/30/38/39/41 all resolved to a specific callout, right or wrong).
None of the six new drawings carries the stronger "UNSPECIFIED FEATURES...
controlled by 3D DEFINITION" delegation language `215735-A` and `212966-006`
used (§2d) — only the routine "for complete product definition this drawing
shall be used with model X" boilerplate that appears on every Joby release in
this pipeline and is not evidence of a specific missing dimension. So this
session's acquisitions are, so far, **acquisition** findings (get the next
BOM level) rather than **3D-surface** findings (the sheet is deliberately
silent) — consistent with §4a.2's original split, and worth stating plainly
so the 3D-annotation case is not inflated by a session that did not, in fact,
add to it.

### 8f. Traced-ratio accounting

This worksheet is **not** a stack (§0's banner), so the SOP's `debug_report_
tolerance_stacks.py --ratio` headline is unaffected by this session — no
`stack_*.json` was touched, before or after:

```
seeded (slice 1, 3 stacks)   5 traced / 3 inferred / 18 untraced, out of 26 element instances
all stacks                   30 traced / 9 inferred / 20 untraced, out of 59 element instances
```

This worksheet's own internal count (§3a's analog, over the 43 element
instances) **does** move:

| outcome | §3a (2026-09-01) | **§8f (2026-09-04)** |
|---|---:|---:|
| `traced` | 4 | **5** (+row 41) |
| `convention-traced` | 0 (folded into gap notes) | **1** (row 38) |
| `mismatch` | 3 | **10** (+rows 23, 30, 33, 35, 49, 53, 55) |
| `candidate` | 8 | **10** (+rows 27, 39) |
| `gap`, correctly recorded | 28 | **17** (−11 moved above; 12 of the 23 stay `gap`, refined) |
| **total** | 43 | 43 |

**Located** (`traced`+`convention-traced`+`mismatch`+`candidate`) moves from
15/43 (35%) to **26/43 (60%)** — the headline number this session actually
changed. `traced` alone (the only outcome that would survive the SOP inside
an actual stack) moves from 4/43 (9%) to **5/43 (12%)**.

### 8g. Drawing-checker read-only invariant

Snapshot = every entry under `data/inbox/drawings/` and `data/runs/`, with
size, via `scripts/snapshot_drawing_checker.py` (per §6's correction — the
tool, not an ad-hoc listing).

| | entries | timestamp (UTC) |
|---|---:|---|
| before, taken before any file was opened this session | 5651 | 2026-09-05T01:30:03Z |

Nine PDFs were opened read-only this session (the seven new drawings plus a
re-read of `213668-002`, already in the pipeline, and a page-count check of
`216231 B.1...`). Every rendered crop went to this session's scratchpad
directory, never into drawing-checker's tree and never into this repo's
working directory. A closing snapshot and diff is taken and recorded in this
session's lessons file rather than here, per that file's own convention of
owning the before/after pair.

---

## 9. The unresolved-identity list, in the annotation surface's key vocabulary, 2026-09-06

Handoff `endstop_location_stack`, deliverable 3. `docs/topologies/topology_pitch_system.json`
re-cited six of its edges against this worksheet's §3/§8b dispositions (see that
topology's own `provenance.retrace_update_20260906`). Every edge whose feature
identity is still unresolved — this worksheet's `candidate` outcome: a real,
in-hand callout exists, but which physical feature it controls, or whether it is
the feature a row means, is not establishable from the sheet — is enumerated
below as `{topology_id, edge_id}`, the exact key pair `annotation_surface_mvp`'s
`feature-identity/v0` events are expected to bind (per that handoff's own
staged brief; this repo does not read those events, so this list is the
interlock, not a consumer of one).

| topology_id | edge_id | worksheet row(s) | why unresolved |
|---|---|---:|---|
| `pitch_system` | `end_stop_clearance` | 39 | §8b: `214700-002-A` sh2 zone D5 carries `5.00 ±0.05`, matching the workbook's value and comment exactly, at a groove near the piston's threaded tip — but nothing on the sheet names it an end-stop contact face, and the row may describe an assembly clearance no single-part drawing can state alone. **The row that names the end stop itself.** |
| `pitch_system` | `gas_spring_mount_position` | 61 | §3/F7: `213668-002` sh2 carries a real `⌖⌀0.2 A B` true-position frame on `220.37 0.00/-0.08` — but which feature it controls, and whether that is the tan-link-mount interface this row names, is not establishable, and the mating half's owner (`215175-001` → `215198-001`/`-002`) is unacquired. |
| `pitch_system` | `blade_root_clocking_to_hub_seat` | 19 | §3: two `0.05` mm callouts are in reach on `212966-006-A` sheet 4 (`↗0.05 D-E`, a runout) and `546791` sheet 3 (`⌖⌀0.05 A B CC`, a position) — neither is a profile-to-A-B callout, the geometric characteristic the row names, and picking either on value alone is exactly the F6/F7 trap. |
| `pitch_system` | `hub_lower_to_top_bearing_flange` | 43 | §3: `212966-006-A` sh2 `103.35 ±0.10` is a real 0.20 mm-wide linear on the hub — but which two flanges it spans is not established from the sheet. |
| `pitch_system` | `hub_top_flange_to_top_deck` | 44 | §3: `212966-006-A` sh2 `4.81 ±0.05` is a real 0.10 mm-wide linear on the hub — same identity problem as the row above; a different edge because the two rows name different flange pairs, not because a different callout is in play. |

Deliberately **not** on this list: edges whose gap is document acquisition
(`pitch_link_length`, `tan_link_mount_height`, `hub_top_deck_to_tan_link_mount_seat`,
`pitch_plate_flange_to_gas_spring_bushing` — the owner part is known, its
drawing is not in the pipeline, §8d) and edges whose value is a genuine
absence or not a drawing quantity at all (`blade_root_clocking_to_ring_gear_mesh`,
`blade_root_clocking_to_oml`, `pitch_arm_link_hole_to_clocking_hole`,
`hub_ring_gear_seat_position`). Those are gaps of a different shape — *what
document*, not *which feature* — and the annotation surface's identity-key
vocabulary is specifically for the second shape (requirement 3 of the
2026-09-01 lesson: "a many-to-many identity map with direction and a
composition rule", which is meaningless without a feature to resolve).

**F11 — new, 2026-09-06 — the source sheet's two sensitivity conditions are not
characterised at either requirement stop angle.** S461-241 requires pitch end
stops at **-7°** and **+72°**. The only two motion-ratio constants this
repo holds (`docs/topologies/topology_pitch_system.json`'s `pitch_arm_linear_to_rotary`
/ `_average` transforms, the source sheet's D10/F10) are documented as "-5 deg
(worst case)" and "full sweep average" respectively — neither is -7° or +72°,
and the average column is not characterised at either end of the sweep at all.
`docs/topologies/study_pitch_system_end_stop_minus7.json` and
`study_pitch_system_end_stop_plus72.json` each name this explicitly in their own
`checks[].excluded_terms` rather than silently borrowing the nearer-sounding
column and calling it equivalent — it is the reason both of their S461-607
margin checks are `complete: false` regardless of what else closes. No source
in this repo's pile characterises a sensitivity AT either requirement angle;
closing this needs Jeff or CAD, not another drawing acquisition.
