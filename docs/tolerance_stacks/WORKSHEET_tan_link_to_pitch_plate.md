# Worksheet — tangential link ↔ pitch plate, grip length

Covers `stack_tan_link_to_pitch_plate.json` and
`stack_tan_link_to_pitch_plate_take2.json`.
Source: `260729_sample_tol_stack.xlsx`, sheet `grip length tols old`, rows 6–54
(forge note `20260729T173648_qjk2xk`). All values in **mm**.

> The workbook may predate the current design. Everything below treats a
> mismatch against the drawings as a **finding**, never as a transcription
> error to fix.

## The joint

| | |
|---|---|
| Assembly | 217755 PROPULSION ASSEMBLY, PROPELLER rev A.1 |
| Location | sheet 4, **DETAIL B** (scale 2:1), printed zone I6 — Jeff: "top-right corner" ✔ |
| Pitch plate | 215197 PITCH PLATE, PROPELLER (inside 215177-001 PITCH PLATE ASSEMBLY, balloon 31) |
| Link | 212956-005 PITCH ANTI ROTATION LINK ASSEMBLY, qty 3 |
| Fastener as drawn | NAS6403U14D `.190-32 × .875" GRIP` (balloon 35, qty 3) |
| Washer as drawn | NAS1149V0332H `.032"` (balloon 32) |
| Retention as drawn | MS9363-09 slotted nut (balloon 33) + MS24665-153 cotter pin (balloon 36) |
| Also in DETAIL B | 214820-002 bushing (34), AS3209-012 o-ring (37), NAS6403U11D (38, a different 5× joint), AMS3058 grease (75) |

The workbook embeds a CAD cross-section screenshot of this joint at
`xl/media/image1.png` inside the xlsx (anchored beside rows 7–32) — bolt through
a spherical bearing with flanged and straight bushings, clamped between two
plates. It is the only picture of the intended stack order that exists here.

Scope is **grip length only**. Diameter/hole fits are deliberately out of scope
(simple two-component fits).

## Ordered elements

> **Provenance update, 2026-08-06** (handoff `traced_labels_and_ratio`).
> Element 11's citation changed. It read `217755 sh4 DETAIL B` / `traced` while
> its own note said *"The grip +/-.010 is untraced (NAS6403 spec absent)"* — a
> parts list gives a nominal and never a band, so that label was wrong. The
> spec has since arrived, so it is now cited to `NAS6403-NAS6420 Rev 4.pdf`
> sheet 3 and is **legitimately** `traced`: same value, real source. Which bolt
> sits in this joint is still balloon 35's evidence. No arithmetic below
> changed — `check_result` is produced, not stored, and no number moved.

> **Provenance update, 2026-08-10** (handoff
> `fastener_citations_and_confidence`). Three more citations changed, and
> again no arithmetic below moved.
> **Element 10** (`fastener_grip_13`) made exactly the move element 11 made on
> 08-06 and for the same reason: it was `parts_list` / `inferred` on 217755
> find 95 with the band coming off the workbook, and sheet 3 row *Grip Dash No.
> 13* prints `.812` under the same `Grip ±.010` header. Now `traced`.
> **Element 7** (`washer_thin`) went `inferred` → **`untraced`**: the `.032
> ±.004` band has no support but workbook cell E11, which its own note already
> said, and the SOP makes that `untraced` and puts it on the gap list.
> **Element 9** (`thread_transition`) was re-examined against NAS6403 and
> deliberately **left as it is** — `kind: assumed`, `untraced`, 1.5875 mm. The
> standard gives `T (Ref)` = .323 in, which is the whole thread region rather
> than the run-out inside it, so taking it would have replaced a 1.6 mm
> allowance with an 8.2 mm one on no better authority. It stays the most
> pessimistic term in the shank-out checks and stays a listed gap.

| # | element | role | nominal | min | max | source | conf |
|---|---------|------|---------|-----|-----|--------|------|
| 1 | flange bushing L thickness | bushing | 3.8100 | 3.6830 | 3.9370 | workbook E14 | untraced |
| 2 | bushing chamfer size | relief | 0.7620 | 0.6350 | 0.8890 | workbook E15 | untraced |
| 3 | flange bushing flange thickness | bushing | 1.5750 | 1.4478 | 1.5748 | workbook E9 | untraced |
| 4 | straight bushing | bushing | 4.7620 | 4.6300 | 4.7600 | 217755 sh4 DETAIL B (214820-002) | inferred |
| 5 | spherical bearing width | bearing | 11.1000 | 11.0500 | 11.1000 | workbook E8 | untraced |
| 6 | pitch plate flange thickness | clamped_member | 4.0600 | 3.9800 | 4.1400 | **215197 sh2 zone B4** | **traced** |
| 7 | washer thickness (thin, .032 in) | washer | 0.8128 | 0.7112 | 0.9144 | workbook E11 | untraced |
| 8 | washer thickness (thick, .063 in) | washer | 1.6002 | 1.4478 | 1.7526 | workbook E12 | untraced |
| 9 | thread transition allowance | allowance | 1.5875 | 0.0000 | 1.5875 | workbook E22 | untraced |
| 10 | fastener grip, -13 (.812 in) | fastener | 20.6248 | 20.3708 | 20.8788 | **NAS6403-NAS6420 Rev 4.pdf sh3, row *Grip Dash No. 13*** | **traced** |
| 11 | fastener grip, -14 (.875 in) | fastener | 22.2250 | 21.9710 | 22.4790 | **NAS6403-NAS6420 Rev 4.pdf sh3, row *Grip Dash No. 14*** | **traced** |

Element order is the physical order as best it can be read from the workbook
and DETAIL B; only the path term lists below are load-bearing for the
arithmetic.

Note the chamfer's columns: the workbook puts **0.889 under LMC and 0.635 under
MMC**, i.e. LMC > MMC. That is correct — the chamfer is *subtracted*, so more
material removed is the least-material condition. It is also the single easiest
thing to get backwards, so the JSON carries explicit `min`/`max` lengths next to
the as-transcribed `lmc`/`mmc`.

## Paths

| path | workbook | nominal | WC min | WC max | RSS center | RSS ± | WC ± |
|------|----------|---------|--------|--------|------------|-------|------|
| bore_min_grip | E18/G18/H18 | 20.4850 | 19.9218 | 20.7368 | 20.3293 | 0.2028 | 0.4075 |
| bore_max_grip_thin | E19/G19/H19 | 22.3098 | 21.8190 | 22.4892 | 22.1541 | 0.1600 | 0.3351 |
| bore_max_grip_thick | E20/G20/H20 | 23.0972 | 22.5556 | 23.3274 | 22.9415 | 0.1962 | 0.3859 |

*take 2* (`total`, E49/G49/H49) reproduces `bore_min_grip` exactly: 20.4850 /
19.9218 / 20.7368.

## Checks

Both criteria are `≥ 0`. `marginal` = nominal passes, worst case does not.

| check | workbook | nominal | WC min | WC max | RSS min | RSS max | verdict |
|-------|----------|---------|--------|--------|---------|---------|---------|
| threads_in_bore__13 | E30/G30 | 0.1398 | **-0.3660** | 0.9570 | -0.0295 | 0.6205 | marginal |
| threads_in_bore__14 | E31/G31 | 1.7400 | 1.2342 | 2.5572 | 1.5707 | 2.2207 | pass |
| shank_out__13_thick | F30/H30 | 0.8849 | 0.0893 | 2.9566 | 0.6668 | 2.3791 | pass |
| shank_out__14_thick | F31/H31 | **-0.7153** | **-1.5109** | 1.3564 | -0.9334 | 0.7789 | fail |
| shank_out__13_thin | *new* | 0.0975 | **-0.6473** | 2.1184 | -0.1131 | 1.5842 | marginal |
| shank_out__14_thin | *new* | **-1.5027** | **-2.2475** | 0.5182 | -1.7133 | -0.0160 | fail |
| *take 2:* worst_case_protrusion | G54/H54 | 0.1398 | -0.3660 | 0.9570 | -0.0295 | 0.6205 | marginal |

**The workbook's own conclusion holds: no fastener passes both checks.** The
-13 is short by up to 0.366 in the bore at worst case; the -14 protrudes past
the washer face even at nominal. This is the "no clean analytical answer —
assembly-time washer selection required" case, and the honest output is that
statement plus the numbers, not a pick.

RSS softens but does not resolve it: `threads_in_bore__13` at RSS is −0.0295,
still negative. RSS is **new here** — the workbook has a row labelled `rss`
(row 50) and nothing in it.

> **What the RSS columns do not claim** (added by review). The fold combines
> half-ranges in quadrature about the midpoint, which assumes every band is an
> independent, symmetric, equal-confidence manufacturing variation. The
> `thread_transition` allowance is not: it is a deterministic 0 → 1.5875
> geometric bias, and RSS re-centers it at 0.794. That single re-centering is why
> `shank_out__14_thick` reads **−0.7153 nominal but −0.077 RSS center** — 0.638
> of the gap is bookkeeping, not statistics. The spherical bearing's band is
> one-sided too. So the RSS columns on the `shank_out` rows are a relative
> softening indicator, not a probability statement, and are not directly
> comparable to Jeff's worst-case columns. The `threads_in_bore` rows carry no
> allowance term and are cleaner. Verdicts never read RSS.

## Re-derivation vs Jeff's cells

Every result cell in both passes, recomputed from the transcribed element values
alone (`tolerance_stack.fold`, pinned in `tests/test_tolerance_stack.py`).
"Jeff" is the cached formula result read out of the xlsx — Excel's arithmetic,
not this repo's.

Regenerate with
`venv-win\Scripts\python.exe tests\debug_report_tolerance_stacks.py --compare`.

| cell | quantity | Jeff (xlsx cached) | re-derived | delta |
|---|---|---|---|---|
| E18 | bore_min_grip.nominal | 20.484999999999996 | 20.485 | 3.6e-15 |
| G18 | bore_min_grip.min | 19.9218 | 19.9218 | 0 |
| H18 | bore_min_grip.max | 20.7368 | 20.7368 | 0 |
| E19 | bore_max_grip_thin.nominal | 22.309799999999996 | 22.3098 | 3.6e-15 |
| G19 | bore_max_grip_thin.min | 21.819000000000003 | 21.819 | 3.6e-15 |
| H19 | bore_max_grip_thin.max | 22.4892 | 22.4892 | 0 |
| E20 | bore_max_grip_thick.nominal | 23.097199999999997 | 23.097199999999997 | 0 |
| G20 | bore_max_grip_thick.min | 22.555600000000002 | 22.555600000000002 | 0 |
| H20 | bore_max_grip_thick.max | 23.3274 | 23.327399999999997 | 3.6e-15 |
| E30 | threads_in_bore__13.nominal | 0.1398000000000046 | 0.13980000000000126 | 3.3e-15 |
| G30 | threads_in_bore__13.min | -0.36599999999999966 | -0.3660000000000001 | 4.4e-16 |
| F30 | shank_out__13_thick.nominal | 0.8848999999999982 | 0.8848999999999985 | 2.2e-16 |
| H30 | shank_out__13_thick.min | 0.08930000000000149 | 0.08930000000000238 | 8.9e-16 |
| E31 | threads_in_bore__14.nominal | 1.740000000000002 | 1.7400000000000022 | 2.2e-16 |
| G31 | threads_in_bore__14.min | 1.2342000000000013 | 1.2342000000000009 | 4.4e-16 |
| F31 | shank_out__14_thick.nominal | -0.7152999999999992 | -0.7153000000000025 | 3.3e-15 |
| H31 | shank_out__14_thick.min | -1.510899999999996 | -1.5108999999999986 | 2.7e-15 |
| E49 | take2 total.nominal | 20.485 | 20.485 | 0 |
| G49 | take2 total.min | 19.921799999999998 | 19.9218 | 3.6e-15 |
| H49 | take2 total.max | 20.7368 | 20.7368 | 0 |
| G54 | take2 worst_case_protrusion.min | -0.36599999999999966 | -0.3660000000000001 | 4.4e-16 |
| H54 | take2 worst_case_protrusion.max | 0.9570000000000043 | 0.9569999999999979 | 6.4e-15 |

**22 of 22 match**; largest delta 6.4e-15, i.e. float summation order, nothing
else. (The VPA stack's five cells are in its own worksheet; 27 across all three.)
No arithmetic discrepancies. Every finding below is a *modelling* or
*design-drift* finding, not a disagreement about a sum.

Two workbook cells were **not** re-derived because nothing consumes them:
`G47`/`H47`, take 2's nut chamfer depth (1.05 / 0.388). They are transcribed in
the JSON and referenced by no path or check — see F5.

## Findings

Diagnosis codes: **[slip]** Jeff's, **[read]** my misreading of the sheet
(resolved), **[model]** a genuine modelling difference, **[drift]** the workbook
disagrees with the current drawings.

### F1 — The workbook's "nominal" column is not a midpoint, and sometimes not even in range **[slip, harmless]**

| element | nominal | limits | |
|---|---|---|---|
| straight bushing (E7) | 4.762 (= .1875 in) | 4.63 / 4.76 | nominal is **0.002 above MMC** |
| flange bushing flange (E9) | 1.575 | 1.4478 / 1.5748 | nominal is **0.0002 above MMC** |
| spherical bearing (E8) | 11.1 | 11.05 / 11.1 | nominal **equals** MMC (one-sided tol) |
| thread transition (E22) | 1.5875 | 0 / 1.5875 | nominal **is** the maximum |

Rounding artifacts in the first two; deliberate in the last two. Nothing is
wrong with the worst-case results — they never read the nominal column — but the
nominal-column *checks* inherit it. `E30`/`E31`'s "nominal" shank-out figures are
pessimistic by up to 0.794 because the thread transition enters at its maximum.
This is why the JSON keeps `nominal` as transcribed and reports RSS about the
**midpoint** separately.

### F2 — RSS was never computed **[slip / incomplete]**

Row 50 carries the label `rss` and no formula. Every RSS figure in this
worksheet is new. It matters: `threads_in_bore__13` reads −0.366 worst-case but
−0.0295 at RSS — still failing, but by an order of magnitude less. A stack
synthesizer that reports both will change how this joint gets discussed.

### F3 — Take 1's cell `E13` is blank **[read — resolved]**

`E16 = E13+E14-E15` with `E13` empty looks like a broken reference. It is not:
the flanged bushing's flange is already counted at row 9, so leaving E13 blank
de-duplicates it. Take 2 confirms by folding the flange in explicitly (E44) and
landing on the identical 20.485 / 19.9218 / 20.7368. Recorded because an
automated transcriber would flag this as a dangling reference and "fix" it,
double-counting 1.575 mm.

### F4 — Take 2 drops the thread-transition allowance **[model]**

Take 1's shank-out subtracts `grip + transition`; take 2's single check is
`grip − total` with no transition term. The negative side is identical (−0.366
both), so the conclusion doesn't move, but take 2 is the less conservative
model. Two passes at one joint with two different models is exactly what a
stored, versioned stack definition is supposed to prevent.

### F5 — Take 2 starts a castellation model and abandons it **[model]**

Rows 45–47 compute nut minor diameter (4.05/4.25), nut c'bore diameter
(4.826/6.35) and a derived nut chamfer depth (0.388/1.05, a 45° assumption).
Nothing consumes them. That branch is the beginning of the thread-engagement /
castellation analysis — see F8 for why it is the branch that actually matters.

### F6 — The evaluated washer is not the drawn washer **[drift]**

All four checks the workbook evaluates use the **.063 in** washer
(NAS1149V0363). That part is **absent from the 217755 parts list**. DETAIL B
balloons **NAS1149V0332H, .032 in** (find 32, qty 9). The workbook's thin-washer
result block (rows 32–34, under a `comments` header at I35) is blank.

Re-derived here for the as-drawn washer:

| check | nominal | WC min | verdict |
|---|---|---|---|
| shank_out__13_thin | 0.0975 | −0.6473 | marginal |
| shank_out__14_thin | −1.5027 | −2.2475 | fail |

The thin washer makes shank-out **worse** for both fasteners (it removes
0.787 mm of stack). These two rows are flagged `[NOT IN WORKBOOK]` in the JSON
so they can never be read back as Jeff's numbers.

### F7 — The drawing selects the fastener the workbook rejects **[drift, unresolved]**

DETAIL B balloons the **-14** (NAS6403U14D, find 35, qty 3), which the workbook
rates as failing shank-out with the thick washer (−0.715 nominal / −1.511 worst)
and which is worse still with the as-drawn thin washer (−1.503 / −2.248). The
**-13** (NAS6403U13H, find 95, qty 3) sits in the parts list with **no balloon on
any of the nine sheets**.

Three readings, none decidable from documents in this repo: the design moved on
from the workbook; the -13 row is stale; or the shank-out model does not apply
to this joint at all — which is F8.

### F8 — The as-drawn joint is a slotted nut + cotter pin; the workbook models a plain nut **[model]**

DETAIL B balloons MS9363-09 (slotted hex nut) and MS24665-153 (cotter pin). For
that retention the binding constraint is not "does shank protrude past the
washer face" — it is **whether a castellation slot lines up with the bolt's
cotter hole**, which quantises the acceptable grip rather than bounding it.
The workbook does not model this anywhere (F5 is where it started to).

This is precisely the case
`DRAFT_tolerance_stack_mvp.md` flags as *"known-tricky, usually doesn't solve
analytically and requires washer mix/match guidance at assembly"*. The slice-1
answer is to say so, not to pretend the shank-out number settles it.

### F9 — Balloon-coverage observation, outside stack scope

`find 95 NAS6403U13H`, qty 3, is ballooned nowhere across all nine sheets. Noted
for whoever owns balloon-coverage checking; not acted on here.

### F10 — Parts-list extraction artifact in the read-only run

The extracted `parts_list` in
`data/runs/20260723_163810_217755.../217755_A_balloons.json` contains a junk row
that also carries `find_no: 25` (`part_number: "SCALE 1:20"`), colliding with the
real MS9363-10 row. Read-only observation on a run Jeff is mid-review on —
nothing was touched.

## Source gaps

Values used by this stack that could not be traced to any document in this repo.
This list is the answer to "what must the fastener library ingest first".

| # | source needed | what it would resolve | priority |
|---|---|---|---|
| 1 | ~~**NAS6403** (.190-32 hex bolt)~~ — **CLOSED for grip 2026-08-10.** `NAS6403-NAS6420 Rev 4.pdf` is in `data/inbox/specs/`. Sheet 3 gives grip and length per dash number, sheet 1 gives `M` (cotter-hole position) and `T (Ref)`. Elements 10 and 11 (`fastener_grip_13`, `fastener_grip_14`) both now trace their `.812`/`.875 ±.010` to sheet 3. | **Still open, and NAS6403 does not close it:** the thread run-out length behind `thread_transition`. Sheet 1 dimensions grip and length and gives their difference as `T (Ref)` = .323 in — the whole thread region, not the run-out inside it — and sheet 2 note (b) makes `T` a reference dimension. Sheet 1's `X`/`Y` are locking-element regions in thread pitches (sheet 2 notes (g), (h)), not run-outs. The document that closes it is **MIL-S-8879**, the thread spec sheet 1 invokes for UNJF-3A, and it is not in the pile. | 2 |
| 2 | **MS9363** slotted/castellated nut | castellation slot count + depth; the check that actually governs this joint | **1 — blocks F8** |
| 3 | **NAS1149** flat washer | thickness tolerance for `washer_thin`, which is `untraced` as of 2026-08-10 (it was `inferred`, on a `kind: workbook` citation whose own note ended *"the +/-.004 is untraced"*). Parts list says `.032" MIN`; the workbook models `.032 ±.004`. These disagree, and only the standard settles it. | 2 |
| 4 | 214936-002 BUSHING, PLAIN, COUNTERSUNK (Joby part drawing) | flange 0.062", L 0.150", chamfer 0.025–0.035" — elements 1–3, all currently untraced. Candidate part; it balloons in sheet 5 DETAIL F, not DETAIL B. | 2 |
| 5 | 214820-002 bushing (Joby part drawing) | the 4.63/4.76 length limits (only the .1875" nominal is on the assembly) | 3 |
| 6 | 212956-005 PITCH ANTI ROTATION LINK ASSEMBLY | the 11.05/11.1 spherical bearing width — no bearing is ballooned in DETAIL B because it is internal to this subassembly | 3 |
| 7 | MS24665 cotter pin | hole fit (diameter and length are already on the parts list) | 3 |
| 8 | NAS1149V0363 (.063 washer) | whether it exists in the current design at all | 3 |

**Traced, for contrast:** three elements.

1. The **pitch plate flange**, `3X 4.06 ±0.08` on 215197 sheet 2 zone B4
   (SECTION A-A), carrying ⌖⌀0.2 A B C and ⊥0.05 F, 3X INDIVIDUALLY. The `3X`
   matches the three tangential links. This is still the only value on this
   stack traced to a **part drawing**.
2. The **-14 fastener grip**, `.875 ±.010 in`, `NAS6403-NAS6420 Rev 4.pdf`
   sheet 3, row *Grip Dash No. 14*, band from the printed column header
   `Grip ±.010`. Added 2026-08-06 — see the provenance update above.
3. The **-13 fastener grip**, `.812 ±.010 in`, same table, row *Grip Dash No.
   13*, same header band. Added 2026-08-10. It was `kind: parts_list` /
   `inferred` on 217755 find 95 — a bolt that sits in the parts list at qty 3
   and is ballooned on no sheet at all (F9), so the parts list was the only
   place it appeared and it still never printed a band.

One element is *inferred*: the 214820-002 bushing, from the assembly parts list
— present and nominally consistent, band from the workbook, which is exactly
what `inferred` is for.

**This stack: 3 traced / 1 inferred / 7 untraced out of 11 element instances.**
Across all three seeded stacks: **5 of 26 `traced`**, 3 `inferred`, 18
`untraced`. The ratio's definition lives in `docs/SOP_TOLERANCE_STACK.md`
("The traced ratio"); reproduce it with
`tests\debug_report_tolerance_stacks.py --ratio` rather than reading it here.

> **Correction, 2026-08-06.** This section used to end *"One element traced out
> of eleven is the real headline of this slice"*, and the repo-wide figure was
> quoted as *"1 of 17"*. The 17 omitted `take2` entirely; the 1 counted only
> part-drawing-traced values while the JSON labelled four elements `traced`.
> See `ARCHITECTURE.md` and the lesson
> `docs/sessions/lessons/LESSONS_20260806_traced_labels_and_ratio.md`.

> **Moved, 2026-08-10** (handoff `fastener_citations_and_confidence`), from
> *"2 traced / 3 inferred / 6 untraced"* on this stack and 3 of 26 across the
> three. Two changes, opposite directions, one commit: `fastener_grip_13` went
> `inferred` → `traced` (item 3 above), and `washer_thin` went `inferred` →
> `untraced` because its only support for `.032 ±.004` was the source workbook,
> which the SOP makes `untraced` and puts on the gap list — where it now is, as
> source gap 3. `thread_transition` was decided on the merits and deliberately
> left `untraced`; see source gap 1 for why the standard does not close it.
> **Take 2**, which this worksheet also covers and which has no element table of
> its own, took the mirror of both: its `fastener_grip_13` was re-cited to the
> same sheet-3 row — it is the same bolt, and it had been `kind: workbook` here
> and `kind: parts_list` in take 1, so the two stacks of one joint disagreed
> about where the number came from — and its `straight_bushing` went `inferred`
> → `untraced` on the same workbook-only reasoning as `washer_thin`. Take 2 is
> now **1 traced / 0 inferred / 8 untraced of 9**.
> **No element value changed and no check result in this worksheet moved.**
