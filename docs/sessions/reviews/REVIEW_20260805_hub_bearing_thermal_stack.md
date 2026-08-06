---
type: review
handoff: hub_bearing_thermal_stack
reviewer: review agent (dispatch), branch `review/hub_bearing_thermal_stack`
date: 2026-08-05
verdict: APPROVE
blockers: 0
---

# Review — `hub_bearing_thermal_stack`

Reviewed `handoff/hub_bearing_thermal_stack` (7 commits, `8ff7c82`..`5dbbd7f`, 22
files, +5402/−93) merged into `review/hub_bearing_thermal_stack` off `master`
(`7bf9768`). `master` was **not** ahead — the handoff branch had already merged
`spec_library_v0`, so the tree tested here is the tree that will exist.

**Suite: 193 passed, 0 failed, 0 skipped**, re-run by me under a venv created in
this worktree (`setup.ps1`). `forge check` OK against **the worktree**. No test
pollution: `git status` clean and `data/` untouched in both the worktree and the
main checkout after the run (the main checkout's `M .gitignore` / `?? .dispatch.toml`
are pre-existing dispatch dirt, unrelated).

Four **should-fix / nit** findings, all fixed inline on the review branch. Nothing
blocking. The provenance work here is the best this repo has seen: **I independently
re-read all five part drawings from the PDFs, verified every callout, every printed
border zone, every drawing note quoted, and both spec claims** — and found no
invented number and no mis-citation.

---

## The seven mandatory checks

### 1. Every tolerance traces to a specification or drawing callout — **PASS**

I re-read all five drawings myself, in the main checkout
(`C:\workspace\tolstack\data\inbox\drawings\`), via PyMuPDF from drawing-checker's
venv, and re-derived the **printed** border zone of each cited callout from the
sheet's own border ticks rather than trusting the citation.

| element | cited | found on the PDF | zone I computed | ✓ |
|---|---|---|---|---|
| `hub_bore_lower` | 212966-006 A sh3 C9 DETAIL E `⌀202.140 ±0.015` | `202.140 ±0.015`, sheet 3, DETAIL E block | **C9** | ✓ |
| `hub_bore_upper` | 212966-006 A sh3 G9 DETAIL D `⌀132.073 ±0.017` | `132.073 ±0.017`, sheet 3, DETAIL D block | **G9** | ✓ |
| `sleeve_bore_lower` | 214955-004 A sh1 G3 `⌀200.000 ±0.025` | `200.000 ±0.025` | **G3** | ✓ |
| `sleeve_wall_lower` | 214955-004 A sh1 G8 `1.190 ±0.025` | `1.190 ±0.025` | **G8** | ✓ |
| `sleeve_bore_upper` | 214959-002 A sh1 G4 `⌀129.968 ±0.025` | `129.968 ±0.025` | **G4** | ✓ |
| `sleeve_wall_upper` | 214959-002 A sh1 G5 `1.110 ±0.025` | `1.110 ±0.025` | **G5** | ✓ |
| `bearing_od_lower` | 214589-002 A sh1 F5 `⌀200.000 0/−0.020` | `200.000 0.000 / -0.020` | **F5** | ✓ |
| `bearing_od_upper` | 214588-002 A sh1 D5 `⌀130.000 0/−0.009` | `130.000 0.000 / -0.009` | **D5** | ✓ |
| `AL_7050_T7451` designation | 212966-006 A sh1 D9 NOTES, note 1 | note 1, verbatim modulo marked elisions | **D9** | ✓ |
| `SS_AISI_420_AMS5621` designation | 214955-004 A sh1 E3 NOTES, note 1 | `MATERIAL: AISI 420 PER AMS5621` | **E3** | ✓ |

Nine of nine zone citations land in the cell the callout's own centre sits in. Note
the sheets number columns **right-to-left** (12 at the left margin); the citations
are right and a reviewer who assumes left-to-right will manufacture nine findings.

Also verified against the drawings and found accurate: all five title-block
nomenclatures, revisions and release dates; `MATURITY STATE: Released` ×5; the two
`SOURCE CONTROL DRAWING` marks; both NSK vendor part numbers and CAGE `J3531`; ISO
class 6 / class 4; the material-certificate notes (note 6 on 214589, note 7 on
214588); the `JED01848` citations; hub notes 11, 12 (A040 anodize, MIL-PRF-8625
Type I Class 1, **max 15 μm**) and 15 (limits **before** coating); sleeve notes 9
(finish code S330, zinc-nickel AMS2417 Type 2) and 12 (tolerances **after** surface
treatment); heat-treat 46–51 vs 48–54 HRC; the 1.110 ±0.035 flange thickness and
⌀191.50 ±0.15 flange bore excluded from scope.

sha256 of all five copies in `data/inbox/drawings/` **matches drawing-checker's
originals byte for byte and matches the table in
`data/inbox/drawings/PROVENANCE.md` digit for digit.**

**Hunt for invented numbers — the point of this checklist.** Nothing invented was
found, and the two places one would hide are handled correctly:

- **Material properties.** All three CTEs are `confidence: "untraced"` with
  `kind: "workbook"`, pointing at the exact cells (`M2!C5` 23.04, `C6` 10.3, `C9`
  11.9 — I read all three out of the workbook myself). **Not one is recalled.**
  `cte_temperature_range_c` is `null` on all three because the workbook states no
  range, and a test pins it null — refusing to write in "20–100 °C" is the single
  best judgement call in the handoff, because an invented range makes a citation
  *look* complete.
- **The bearing alloy.** Both bearing drawings are source-control drawings and name
  no material; "52100" is a spreadsheet cell *label*, and `designation_source` is
  explicitly `null` for that entry alone. The gap says confirm the alloy **before**
  pulling CINDAS, because a pull for a guessed alloy returns wearing
  `confidence: "traced"`. That is the laundering path, seen and closed.
- **The sleeve OD.** The workbook has one (row 18, `202.36 ±0.025`) and the stack
  refuses to model it, because **neither sleeve drawing dimensions its OD** — I
  confirmed that: both dimension the bore and the radial wall and nothing else.
  Inventing an OD tolerance would have invented it *narrower* than the drawings
  license, which is F1's own error arrived at from the other side.

Two secondary document claims spot-checked and **both exact**: JPS00176 Table 3-1
caps *Aluminum 7050* at **90 °C** (and Method A cryogenic is indeed the default when
the spec is referenced without a method, §3.1); JPS00078 §"The maximum induction or
oven heating temperature is **80 °C** for bearings with shields or seals, and
**120 °C** without". Also confirmed JPS00176 contains **no** interference-magnitude
requirement, which is what F8 rests on.

### 2. Signs on every term — **PASS**

This archetype **generates** its checks, so there is no `terms` array in the JSON.
I regenerated the term table (`debug_report_thermal_fit.py --terms --markdown`) and
read all 104 rows, and separately re-derived the algebra from the workbook's own
install chain:

```
od_installed = od − k(od − hub_bore),  id_installed = od_installed − 2·wall
I₂ = bearing_od − id_installed
   = f_b·bearing_od − (1−k)f_s·sleeve_bore + 2k·f_s·wall − k·f_h·hub_bore   ✓
```

That is exactly what `stage_terms()` emits. Stage 1 likewise. Per-row checks all
hold: sleeve bore and wall `+1`, hub bore `−1` at stage 1; wall coefficient exactly
twice the bore's; at the reference temperature every coefficient is exactly
`1`/`2`/`0.8`/`1.6`/`0.2` (lower) or `1`/`2`/`0.9`/`1.8`/`0.1` (upper); cold below
room and hot above, with the hub (23.04) always furthest from room. The `k=0` and
`k=1` degenerate cases drop exactly the terms they zero.

**The hub bore in stage 2 is not double-counting** — it is the chaining, and it
falls out of the substitution above. Verified rather than assumed.

Prose direction checked too: the binding end is the worst-case **minimum** for every
check (the criterion is about looseness), which is uniform for this archetype and
stated as such; there is no `INCOMPLETE`-budget check here, so `pitch_link`'s
larger-vs-smaller-deficit trap does not arise.

`fold()` reads `min`/`max` only — verified in the diff and by the new test that
greps the function's own source. `Term.coefficient` is constrained `> 0` so
direction stays in `sign`. `workbook_corner()` is the only `lmc`/`mmc` reader and
is deliberately outside `fold()`.

### 3. LMC/MMC direction, per element — **PASS**

The smell (`max == mmc` everywhere) is absent because the stack is **mixed, four
and four, and mixed the right way round** — I checked each:

| `max == lmc` (internal — bore, LMC is larger) | `max == mmc` (external — MMC is larger) |
|---|---|
| `hub_bore_lower` 202.155, `hub_bore_upper` 132.090 | `sleeve_wall_lower` 1.215, `sleeve_wall_upper` 1.135 |
| `sleeve_bore_lower` 200.025, `sleeve_bore_upper` 129.993 | `bearing_od_lower` 200.000, `bearing_od_upper` 130.000 |

There is no chamfer, relief or counterbore in either chain, so the legitimate exit
of check 3 applies — and the author states the absence explicitly. I confirmed it:
the only negative signs in the generated terms are on whole members entering an
interference difference, and the only removed-material features on the drawings
(the hub's ⌀203.57 and ⌀134.07 chamfers, the sleeves' 45° breaks) are outside both
chains. A test pins the four/four split by element id.

### 4. RSS actually computed — **PASS**

All three columns present with numbers, for all 32 checks across both stacks. I
re-derived two by hand: `upper_seat__hub_to_sleeve__room` half-range
`√(0.025² + (2×0.025)² + 0.017²) = 0.0584294` ✓; `upper_seat__sleeve_to_bearing__room`
`√(0.0045² + (0.1×0.025)² + (1.8×0.025)² + (0.9×0.017)²) = 0.0478084` ✓, with the
centre 0.0045 below nominal because the bearing band is one-sided — exactly as the
worksheet explains.

No verdict reads RSS (`CheckResult.verdict` cannot see it; `stack.py` unchanged
there). The caveat is stated **and extended correctly for this archetype**: the two
one-sided bearing bands, and the point that **temperature is a scenario, not a
variate**, so the three temperature rows must never be RSS'd against each other.
The `coefficient: 2` vs duplicated-term note is right: 0.0465 vs 0.0584 on that
check (20%), and 29% in the isolated case ARCHITECTURE.md quotes. No zero-width
bands and no `allowance` elements, correctly stated.

### 5. Nominal inside its own min/max — **PASS**

`min ≤ nominal ≤ max` holds for all 16 element instances; a test asserts it. Two sit
*on* a limit, both legitimately — the bearing ODs are drawn basic-size-minus, so
200.000 and 130.000 **are** the maxima. Neither is a midpoint.

Crucially, no transcription was "fixed" to satisfy the invariant. I compared against
the source cells directly: the workbook's `M2!C24` nominal for the lower bearing is
**199.980** (its own minimum) where the stack takes the drawing's basic size
**200.000**. That 0.020 is recorded as a named divergence cause and pinned by
`test_the_lower_bearing_nominal_takes_the_drawings_basic_size`, not smoothed away.
The upper bearing has no such divergence (`C42` = 130.0 = the drawing) — also
verified.

### 6. Quantised constraints (cotter / castellation) — **PASS (earned exit)**

There is **no threaded fastener, no slotted or castellated nut and no cotter pin
anywhere in either chain** — confirmed by reading all five drawings, not by taking
the author's word. Each joint is retained by interference alone. So nothing
quantises and check 6 exits.

The exit is earned rather than taken: the author supplies the **analogous** caveat
and puts it next to the numbers, in section 1 of the worksheet, before any result —
*"A dimensional interference is not a torque capacity."* Contact pressure, friction
coefficient and hoop stress are all out of scope, so a `pass` here is necessary and
not sufficient. That is the right generalisation of check 6 and I have written it
into the overlay.

### 7. Traced / inferred / untraced — **PASS**

Counted by me, from the JSON, not copied:

> **`hub_bearing_thermal_fit_m2`: 8 traced / 0 inferred / 0 untraced, out of 8.**
> **`hub_bearing_thermal_fit_m1`: 4 traced / 2 inferred / 2 untraced, out of 8.**
> **Both stacks: 12 traced / 2 inferred / 2 untraced, out of 16 element instances.**
> **Including non-element values: 12 traced / 2 inferred / 9 untraced, out of 23.**

Same as the worksheet's. 8-of-8 got proportionally *more* scrutiny, not less — that
is what check 1 above is — and every one of the eight survived an independent read
of the PDF.

The honest number is the 23-value one, and the worksheet quotes it as the headline
rather than the flattering 12/16. Every `untraced` and `inferred` value is in the
ranked gap list: M1's two sleeve values and both `inferred` hub bores → gap 10; the
three CTEs → gaps 1, 2, 6; the temperatures → gap 3; the two stiffness ratios →
gap 4. **Nothing untraced is unlisted.**

On the two `inferred` M1 hub bores: the support is the workbook plus a *later*
revision (212966-006) printing an identical value and band. That is evidence about
transcription fidelity, not about −004. `inferred` is defensible, the argument is
stated in the element note so it can be rejected, the author pre-authorises a
downgrade to `untraced`, and the closing document is named. Accepted as written;
nothing downstream turns on it (M1 is a superseded control).

---

## Also verified

- **Re-derivation.** 427 formula cells claimed (206 M2 / 205 M1 / 16 Decision
  Matrix) — I recounted from the sheet XML: **206 + 205 + 16 = 427, exact.** 480
  numeric cells claimed for `CACHED` — **231 + 230 + 19 = 480, exact.** Zero
  mismatches, worst delta 2.842e-14. Every count this handoff asserts is right,
  which given this repo's stale-inventory history is worth saying out loud. The
  spec-pile recount in `PROVENANCE.md` (**64 files / 249,106,379 bytes**) is also
  exact, and the handoff *corrected* a false claim in the same paragraph rather
  than inheriting it.
- **Method divergence (F1) independently confirmed.** Stage 1 fold WC min is
  0.05 × `f_sleeve` below the workbook's LMC column: 0.0499794 cold / 0.0500000
  room / 0.0500268 hot. I re-derived all three from `f_s = 1 + ΔT × 10.3e−6`. The
  cause is right (bore and wall on the same sign while LMC moves them opposite ways)
  and stage 2 does coincide exactly, for the reason given. The consequence is real:
  M2's upper seat stage-1 hot reads **−0.06449** where the workbook reads −0.01447.
- **F3 (the M1 row-18 slip) confirmed by hand.** `M1!D18` is `=E17+2*E15`; `D18 ==
  E18`, `H18 == I18`, `L18 == M18` exactly; 21 affected cells; the tell (`D19`
  −0.155 against `C19` −0.145, LMC carrying more interference than nominal) is
  there. I corrected the sheet by hand: room-temperature `D25` moves +0.006 →
  −0.004 ✓ and the hot LMC corner stays a large clearance. (The quoted magnitude
  needed a small fix — see findings.)
- **F7, F8, F9, F10 all confirmed against the workbook.** `M2!I27` is `=I13−E18`
  = −0.0178381 with no row heading, on the M2 sheet only ✓. The `target 1/1000`
  comment sits on `O20`/`O26`/`O38`/`O44` and **no cell compares against it** ✓;
  M1's room nominal stage-1 fraction is 7.173e−4 and M2's 1.088e−3 ✓; the fraction
  divides by the column's own diameter, and stage 2 divides by the bearing OD where
  stage 1 divides by the hub bore ✓. Column O *is* row-aligned on this workbook
  (`O13` hub on the hub row, `O14` sleeve on the sleeve row) — the opposite of trap
  12, checked in both directions ✓. Sheet order is M2 then M1, reverse-chronological ✓.
- **Schema hygiene.** All 15 hardware entries: `values_status` ∈ the vocabulary,
  `library_ref` filled ⟺ `values_status == "library"` (only `NAS6403U11D`), `gaps`
  non-empty on every one, `values_source` present on every `inline` and `null` on
  every `not_transcribed`. Both new bearing entries are the file's first with every
  inline value traced to a drawing face, which is a genuine Step-5b improvement.
  `element_id`/`run_id` null on all 16 elements; `kind` and `role` from the
  documented vocabularies (three places each, checked); `schema` strings present and
  `/v0`; both new stacks wired into `ALL_STACK_FILES` and covered by the
  parametrized hygiene tests; the new `material_entry/v0` carries the same
  discipline plus `designation_source`, which is the right separation.
- **`values_source` used, not just present.** No stack element takes a *band* from a
  `kind: "workbook"` hardware entry. Both bearing elements cite the drawing
  directly and their entries' `values_source` is `kind: "drawing"`. No laundering.
- **Checks the source does not contain** are `workbook_cells: null` on every
  generated check, with a test. The `[NOT IN WORKBOOK]` label prefix is dropped
  because *every* check is generated — the same reasoning Step 5b already applies to
  from-scratch stacks, and the right call.
- **Scope is stated**, including the inner-side-of-the-bearings boundary as an
  explicit **decision, not a gap** (with a test asserting it, and both bearing bores
  transcribed and marked `DELIBERATELY UNUSED` so the next stack does not re-read
  the drawings). Axial everything, the flange, hoop stress, roughness, coatings and
  bearing internals are all named. The axial exclusion is the important one and it
  is flagged with why it matters — the Decision Matrix sheet's own root-cause #1 is
  axial gap, and I confirmed that cell (`E13`) and the `B5` explanation.
- **Diagnosis codes.** All eleven findings tagged; three are `[read]` (F2's
  near-miss, F9, F10), which is the class whose absence is suspicious. F2's is
  genuinely reusable.
- **Drawing mismatches recorded, not reconciled.** F2 (wall 1.190 vs the workbook's
  1.18) takes the drawing and files the divergence, and the counterfactual is pinned
  by a test: on 1.18 that corner reads −0.0039, a clearance, instead of +0.0162.
  Two independent things had to go right for it to pass, and the worksheet says so.
- **`data/inbox/specs/` not reorganised** — no renames, no deletions, nothing in the
  diff, and the filesystem count matches.
- **Nothing written into drawing-checker.** The five PDFs are byte-identical copies
  *from* it; its newest run predates this handoff (2026-08-04 vs the 08-05 commits);
  its `git status` dirt is all pre-existing and unrelated. Read-only and one-way,
  verified by mtime as the overlay requires rather than by `git status` alone.
- **PROVENANCE amendments.** This is where the previous two reviews found false
  claims, so I diffed it against the branch. All four touched rows are amended in
  the same commit: `hardware_entries.json`, `README.md`,
  `tests/test_tolerance_stack.py`, and — the important one — **`stack.py`, which
  changes executable lines for the first time since import** and says so
  explicitly, with the behaviour-preservation evidence (seeded stacks re-derive to
  6.4e-15, unchanged). `thermal.py` is added as a new not-imported row. The
  `__init__.py` row was correctly left alone: `thermal.py` is *not* re-exported, so
  that row's claim still holds. No new false claim, and one old one corrected.
- **New inbox stream tracking.** The four-line `.gitignore` dance is right:
  `git ls-files data/` shows `drawings/PROVENANCE.md` and `.gitkeep` tracked, and
  `git check-ignore -v` confirms the PDFs are ignored by `.gitignore:44`.
- **The one SOP line the author changed.** They flagged it for reversion. **Keep
  it.** It is a pointer, not a rule change, it says explicitly that the substantive
  edits are queued, and an SOP that describes one archetype with no signal that a
  second exists actively misleads the next cold consumer for as long as the queue
  takes. The file/apply convention is about *substantive* edits and is respected —
  eleven friction items filed, none applied.

---

## Findings

No blockers. All four fixed inline on the review branch; suite still 193 green
after.

### Should-fix (fixed inline)

**S1 — "byte-identical" claimed where only the numeric cells are identical, and one
of the differing cells is the part number the identity argument rests on.**
`stack_hub_bearing_thermal_fit_m2.json` (upper_seat chain note),
`stack_hub_bearing_thermal_fit_m1.json` (notes[2]),
`WORKSHEET_hub_bearing_thermal_fit.md` (the headline),
`tests/test_hub_bearing_rederivation.py:539`,
`tests/test_hub_bearing_thermal_fit.py:358,631`.

The claim is that workbook rows 31–44 are byte-identical between the M2 and M1
sheets. The test asserts `CACHED["M2"][row] == CACHED["M1"][row]`, and `CACHED` is
the **numeric** cells only. I diffed the row block cell by cell: **four cells
differ**, all in the comment column or formula text —

- `O31`: **`212966-005` on M2, `212966-004` on M1.** This is the hub part number,
  and it is precisely why M2's `hub_bore_upper` is `traced` and M1's is `inferred`
  on identical numbers. The strongest version of the author's own argument depends
  on these cells *differing*.
- `O32`: differs by a trailing space.
- `O34`: a tolerance-change note present on M1 only.
- `H35`: a shared formula, so M2 stores no formula text (trap 13); same cached value.

Numerically identical is true, is what the test checks, and is all the engineering
conclusion needs — the upper seat *is* the same joint in both configurations, which
a second test pins element for element. But "byte-identical" is the exact phrase this
repo's checklist flags as a claim to verify rather than read, and this is its **third
sighting in four sessions** — new in that it had escaped `PROVENANCE.md` into a stack
note, a worksheet headline and two test comments. Fixed: reworded to "numerically
identical" in all six places, naming the four differing cells, and noting in both
stack files that `O31` is why the two confidences differ.

**S2 — prose says every quantity is `null`; five `qty` fields say `1`.**
`stack_hub_bearing_thermal_fit_m2.json` `joint.identification_note`, and F11 in the
worksheet: *"find numbers, balloons and quantities are therefore null rather than
guessed"* — while all five `joint.parts[*].qty` are `1`, in the same file.

The `1` is defensible: it is a count *within this joint* (the hub drawing has exactly
two bearing seats, so one hub, one sleeve and one bearing per seat), not a
parts-list quantity, and every genuine parts-list field (`find_no`, `balloons`,
`assembly_status.qty`) really is `null`. The sentence is what is wrong, and it is the
stale-claim class one level down: a note asserting a field is empty while the field
is populated. Fixed: both sentences now say "every parts-list field is null" and name
the `qty: 1` as a within-joint count with its basis.

### Nits (fixed inline)

**N1 — F3 quotes the uncorrected number as holding "either way".** *"the hot LMC
corner `H25` is +0.0965 clearance either way"*. Corrected for the row-18 slip it is
**+0.0865**, not +0.0965. The argument is untouched — a clearance either way, an
order of magnitude larger than the room-temperature 0.004/0.006, so M1's slip risk
survives the correction. Worth fixing because the corrected figure is *already
elsewhere in the same worksheet*: it is M1's `lower_seat__sleeve_to_bearing__hot`
WC min of −0.08650, negated, because stage 2's coherent LMC corner and its
worst-case fold coincide exactly. That coincidence is a rather good independent
confirmation of the whole model, and quoting the pre-correction number hides it.
Fixed: both figures now given, with the cross-reference.

**N2 — Ra 0.8 attributed to the upper bore only.** The worksheet's scope list and
the M2 stack's `out_of_scope` say "hub bore Ra 0.8 on the 132.073". Sheet 3 carries
**four** `0.8` flags, two beside DETAIL E (the 202.140, at C11/E11) and two beside
DETAIL D (the 132.073, at G10/G11). Immaterial — roughness is out of scope either
way and the direction of the effect is stated — but "the 132.073" reads as though
the lower seat is Ra 3.2, which the drawing does not say. Fixed: both now say the
flags appear in both bore details and that which face each attaches to was not
resolved, because it is out of scope regardless.

### Noted, not changed

- **`## The four schemas` still heads a section whose first paragraph says there are
  five.** The author's friction item 1 proposes exactly this rename and it is queued
  for a `sop_edits_apply`-style handoff. Renaming it here would start applying the
  queue, which the file-and-apply convention exists to prevent. Left alone
  deliberately; the reader is not misled, because the inserted block says so.
- **Bearing note 2 reads `ANGULAR ROLLER BEARING` where the nomenclature reads
  `ANGULAR CONTACT`.** The drawings' own inconsistency, on both sheets. Not the
  author's, and nothing depends on it.

---

## For the next reviewer

- **This archetype's checks are generated, so check 2 cannot be done from the
  JSON.** Run `debug_report_thermal_fit.py --terms --markdown` and read the table;
  the worksheet appendix is a paste and should be diffed against a fresh run, not
  trusted. I have written this into the overlay as part of check 2, along with the
  per-row rules that make it finite for a `thermal_fit` stack.
- **The overlay gained five entries this review** (all committed on this branch):
  the generated-checks half of check 2; a new **check 2b, coherent corners are not a
  worst-case fold** (general to any transcription, not just this archetype); the
  non-element-values half of check 7, with the CINDAS rule and the
  confirm-the-material-before-you-pull-the-property trap; a third sighting on the
  byte-identical entry plus two new recurring bugs (prose-says-null,
  text-layer-is-not-a-reading); and an architectural entry stating the sharpened
  `fold()` invariant — *a layer may compute weights, it may not combine two element
  values*. Also a `materials.json` hygiene bullet and the generalise-check-6 bullet
  under "Also verify".
- **The unclosed risk in this work is not in this work.** Every dimension is traced;
  the physics is not. Three CTEs, two temperatures and two stiffness ratios carry
  the answer and all seven are a spreadsheet cell. The four CINDAS pulls and
  `JED01848` are what turn this from a documented geometry into a defensible
  analysis, and gap 5 must be answered before gap 6 or the pull itself launders a
  guess. If a later handoff closes any of these, **re-audit the closure** — a
  property arriving with a `traced` CINDAS citation for an unconfirmed alloy is the
  invented-value failure mode in its most convincing form.
- **`M2!I27` and the axial half.** Two live threads this stack deliberately does not
  model: an unlabelled orphan cell that looks like an assembly-clearance check, and
  the axial-gap investigation that the workbook's own Decision Matrix ranks as
  candidate root cause number one. Both are questions for Jeff, both are recorded,
  and neither is a defect in this handoff.
