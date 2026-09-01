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

## 2. Attempt

*(to be filled after the prediction above is committed)*

## 3. Per-element score table

*(to be filled)*

## 4. Breakage taxonomy — actual

*(to be filled)*

## 5. Prediction vs. outcome — calibration

*(to be filled)*
