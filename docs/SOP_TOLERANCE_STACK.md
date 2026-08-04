# SOP — build a tolerance stack from scratch

The procedure for an agent building a tolerance stack in this repo, start to
finish. It assumes no prior context beyond this file: read it cold and start.

Distilled from `tolerance_stack_slice1` (the three seeded stacks in
`docs/tolerance_stacks/`, the two worksheets, and findings F1–F16 in
`docs/reference/LESSONS_20260729_tolerance_stack_slice1.md`). Every rule here
exists because that slice hit the failure it prevents.

When you finish, a reviewer will check your work against
`docs/prompts/REVIEW_AGENT.md`. **Read that checklist before you start** — it is
short, and it is what "done" means.

---

## The one rule

> **Every element value cites a `source_ref`. Nothing is invented.**

A value you *recall* is not a source. Fastener dimensions are exactly the kind of
thing an LLM reproduces fluently and wrongly — plausible digits, right format,
wrong number, and no way for a reader to tell. So:

| you have | do |
|---|---|
| a datasheet or standard in `data/inbox/specs/` | cite it, `confidence: "traced"` |
| a drawing callout (via drawing-checker) | cite it, `confidence: "traced"` |
| a part number in a parts list, nominal consistent, but no tolerance band | `confidence: "inferred"` — say where the band came from in `note` |
| a memory of what NAS6403 grip tolerance is | **STOP.** Record a gap. |
| a number from a source workbook and nothing else | `confidence: "untraced"`, and list it as a gap |

`untraced` is permitted **only** as an explicitly-listed gap. It is not a
fallback you may use quietly to make a stack look complete — a stack of untraced
numbers is a stack with no result. Slice 1's headline was **1 element traced out
of 17**, and reporting that honestly was the most valuable thing it produced.

If a value cannot be sourced, the stack still ships. It ships with the gap named,
ranked, and pointed at whatever document would close it. An unanswerable stack
stated plainly beats a confident wrong one.

---

## Step 0 — set up and orient

```powershell
powershell -ExecutionPolicy Bypass -File setup.ps1
venv-win\Scripts\python.exe -m pytest -q          # expect 34 passed
```

Read, in this order:

1. This file.
2. `docs/prompts/REVIEW_AGENT.md` — what you will be judged on.
3. `docs/tolerance_stacks/stack_tan_link_to_pitch_plate.json` — the fullest
   worked example. Skim the shape; you are going to write one of these.
4. `docs/tolerance_stacks/WORKSHEET_tan_link_to_pitch_plate.md` — what your
   written output looks like.

## Step 1 — bound the joint before you touch a number

Write down, and put in the stack's `joint` block:

- the **assembly** drawing number and revision;
- the **sheet and view** the joint is detailed in (`sheet 4, DETAIL B`), plus the
  **printed** zone (see the zone warning in Step 3);
- every part in the joint, by part number, with its find number and quantity;
- what is being clamped by what, and what retains it;
- **what is out of scope.** Say it explicitly. The seeded stacks are grip length
  only; diameter and hole fits are deliberately excluded as simple two-component
  fits. A reader must not have to guess whether an omission is a decision or an
  oversight.

Then state the **question**. "Does the -14 bolt's grip work in this joint" is a
question. "Analyse the joint" is not, and will not produce a check you can write.

## Step 2 — write the elements

One `StackElement` per physical feature along the path, in physical order.

```json
{
  "id": "bushing_chamfer",
  "name": "bushing chamfer size",
  "role": "relief",
  "nominal": 0.762, "min": 0.635, "max": 0.889,
  "lmc": 0.889, "mmc": 0.635,
  "plus_minus": 0.127,
  "hardware_ref": null,
  "source_ref": { "kind": "workbook", "document": "260729_sample_tol_stack.xlsx",
                  "sheet": "grip length tols old", "cell": "E15",
                  "confidence": "untraced",
                  "note": "chamfer .025-.035 in; needs the part drawing" },
  "note": "subtracted: LMC > MMC because more material removed is least material"
}
```

`role` is one of `bushing | bearing | washer | clamped_member | relief |
fastener | allowance`.

### Store lengths. Never fold "MMC → max".

**This is the single most important rule in the file, and the easiest to get
wrong in a way that still looks right.**

LMC and MMC are *material* conditions, not extremes. For a feature that **adds**
to the stack, MMC (most material) is the longest — so MMC maps to `max`. For a
feature that is **subtracted** — a chamfer, a relief, a counterbore — the mapping
**inverts**: more material removed is *less* material, so LMC is the larger
length.

The seeded tan-link stack has exactly this case: the bushing chamfer carries
**LMC 0.889 > MMC 0.635**. Code or an author that derives `max` from `mmc` gets
that element backwards, and the resulting total is *still plausible* — a few
tenths of a millimetre off, no error, no warning, nothing to notice.

So:

- always populate `nominal`, `min`, `max` as **lengths**, worked out by you from
  the physical direction of the feature;
- copy `lmc`/`mmc` in **as transcribed**, purely so a worksheet can be checked
  against a source sheet column-for-column;
- `fold()` reads only `min`/`max`. It never reads `lmc`/`mmc`. Keep it that way.

An internal feature inverts for the same reason: the seeded nut's minor diameter
has `mmc 4.05`, `lmc 4.25` — MMC is the *smaller* bore.

### `nominal` is not the midpoint

Do not compute it. Transcribe it, and expect it to misbehave:

- in the seeded stacks, `nominal` is twice **outside its own min/max** (rounding);
- the thread-transition allowance's "nominal" **is its maximum**, which makes
  nominal shank-out pessimistic by up to 0.794 mm.

Worst-case results never read `nominal`, so they are unaffected — but the
*nominal* check inherits it. `min <= nominal <= max` is a thing the reviewer
checks (F1); if it does not hold, that is a finding to record, not a number to
quietly fix.

### Every element gets a `source_ref`

```json
{ "kind": "drawing", "document": "215197", "revision": null, "sheet": 2,
  "zone": "B4", "view": "SECTION A-A", "cell": null,
  "callout": "3X 4.06 ±0.08", "element_id": null, "run_id": null,
  "confidence": "traced", "note": null }
```

- `kind`: `drawing | parts_list | workbook | spec | pipeline_element | assumed`.
  Use `spec` for a file in `data/inbox/specs/`, with the filename as `document`
  and the **page number** as `sheet`.
- `callout` is the text **as it reads on the drawing**. This is what lets a human
  re-find the value; without it a citation is an address with no content.
- `element_id` and `run_id` stay **`null`**. They are the reserved slot for stable
  feature identity — when extraction can address a dimension durably, an element
  will cite the extracted element instead of a human reading, and a re-exported
  drawing will re-run the stack with no re-transcription. A test asserts they are
  null, so a later consumer can tell "not yet wired" from "wired to nothing".
  Do not fill them in.

## Step 3 — trace what you can

For each element, try to close the gap, in this order of preference:

1. **A spec or datasheet in `data/inbox/specs/`.** Check here first — 42 files,
   and it already holds `NAS6403-NAS6420 Rev 4.pdf`, which was slice 1's #1
   blocking gap. `data/inbox/specs/README.md` maps the known gaps to files.
   Expect poor photocopies: no text layer, so read the page, don't grep it.
2. **A drawing callout**, via drawing-checker's extracted runs:
   ```powershell
   venv-win\Scripts\python.exe tests\debug_stack_hardware_crosscheck.py `
       "C:/workspace/drawing-checker/data/runs/<run>"
   ```
   This tells you whether a part number is in the parts list and which balloons
   reference it. For the callout text and its zone, use
   `tests\debug_trace_stack_values.py <pdf> --pattern "4\.06"` — note it needs
   PyMuPDF, which this repo deliberately does not install; run it from
   drawing-checker's `venv-win`.
3. **The parts list alone** → `inferred` at best. Part present and nominal
   consistent does not give you a tolerance band.

Three traps here, all of which cost slice 1 real time:

- **`item_no` vs `find_no`.** In `*_balloons.json`, the parts-list row is keyed
  `item_no` under `balloons` but `find_no` under `parts_list`. Join on the wrong
  one and you get "0 balloons" for every part — which reads exactly like a real
  finding about balloon coverage. Check the keys first.
- **Printed zone ≠ zone-mapper zone.** drawing-checker's `pipeline.zone_mapper`
  addresses a synthetic 16×12 grid built for vision prompts. A human-facing
  citation — and Jeff's "sheet 5, zone C10" — means the grid **printed in the
  sheet border** (217755 is A–L × 2–15). Cite the printed one. Read it off the
  PDF with `debug_trace_stack_values.py`; never compute it from percentages.
- **A value matching is not a feature matching.** 215197 carries *three* distinct
  4.06 flange callouts (`3X ±0.08`, `5X ±0.10`, and a 1× `±0.10`). Matching on
  the number gets you to "one of two"; only quantity, view, and GD&T context get
  you to *which*. If you cannot get there, say `inferred` and say why. This is
  the cleanest argument in the whole slice for why `element_id` exists.

## Step 4 — hardware entries

Every standard part the stack consumes gets an entry in
`docs/tolerance_stacks/hardware_entries.json`, and the element points at it via
`hardware_ref`. A test asserts every `hardware_ref` resolves.

```json
{
  "id": "NAS1149V0332", "standard": "NAS1149", "dash": "V0332",
  "class": "washer_flat", "for_thread": ".190-32",
  "values_status": "inline",
  "library_ref": null,
  "dimensions_in": { "thickness": 0.032, "thickness_tol": 0.004 },
  "dimensions_mm": { "thickness": 0.8128, "thickness_tol": 0.1016 },
  "used_by": ["tan_link_to_pitch_plate:washer_thin"],
  "assembly_status": { "drawing": "217755", "present": true,
                       "as": "NAS1149V0332H", "find_no": 32, "qty": 9,
                       "nomenclature": "WASHER, FLAT, ... .032\" MIN ...",
                       "balloons": [{ "sheet": 4, "view": "DETAIL B" }] },
  "gaps": ["The workbook models .032 ±.004; the parts list says '.032 MIN'. The real tolerance needs the NAS1149 standard, which is not in this repo."]
}
```

Rules:

- **`values_status: "inline"`** — the numbers live in this file for now.
- **`library_ref` stays `null` until a fastener library exists.** When it does,
  `library_ref` points at it, `values_status` becomes `"library"`, and the inline
  numbers demote to a cross-check rather than the source. Do not invent a
  `library_ref`; a test asserts it is null.
- **Every entry carries a non-empty `gaps` list** — a test asserts this too. An
  entry claiming no gaps is almost always an entry whose gaps were not looked
  for. These lists *are* the future library's intake queue, which is the whole
  reason the field is mandatory.
- `assembly_status` records present/absent in the parts list, the find number,
  and the balloons. **Absent is a finding**, not an error: slice 1 found every
  evaluated check using a `.063` washer that is not in the parts list at all.

## Step 5 — paths and checks

A **path** is a signed term list through the joint. A **check** is a signed term
list over paths and elements. They are the same shape, and one `fold()` computes
both — which is the point: **there is exactly one place a sign can be wrong.**

```json
{"id": "bore_min_grip", "terms": [
  {"element": "straight_bushing"}, {"element": "spherical_bearing"},
  {"element": "flange_bushing_flange"}, {"element": "flange_bushing_L"},
  {"element": "bushing_chamfer", "sign": -1}]}
```

`sign` defaults to `+1` and must be `+1` or `-1`. A term may name a `path`
instead of an `element`; signs multiply through the expansion, so nesting never
changes the arithmetic.

Compute:

```powershell
venv-win\Scripts\python.exe tests\debug_report_tolerance_stacks.py
venv-win\Scripts\python.exe tests\debug_report_tolerance_stacks.py --compare
```

### Verdicts

`criterion` is `">= 0"`. The vocabulary is exactly three words:

| verdict | means |
|---|---|
| `pass` | worst-case minimum satisfies the criterion |
| `marginal` | **nominal passes but worst case does not** |
| `fail` | nominal does not pass either |

`marginal` is what lets the output say *"there is no clean analytical answer,
this joint needs assembly-time selection"* honestly, instead of picking a side.
Use it. It is the most informative of the three.

### Always report nominal, worst case, and RSS together

**RSS is always computed alongside worst case.** Not sometimes. Slice 1's F2 was
a row labelled `rss` with no formula in it — and it mattered:
`threads_in_bore__13` is **−0.366 worst-case but −0.0295 at RSS**, an order of
magnitude, enough to change how the joint gets discussed.

F11 is the mirror-image failure: the VPA stack's source filled only the two
worst-case columns, which straddle zero and read as unremarkable — while the
nominal it never computed is **−0.0824**, already failing before any tolerance is
applied. Emit all three, always, as one set.

**But state what RSS does not claim.** `fold()` combines half-ranges in
quadrature about the *midpoint*, which treats every band as an independent,
symmetric, equal-confidence variate. Two kinds of element are not:

- `role: "allowance"` is a deterministic geometric bias, not a variate. The
  thread transition (min 0 / max 1.5875) gets re-centered at 0.794 by RSS, which
  is why `shank_out__14_thick` reads nominal −0.7153 but RSS center −0.077 —
  0.638 of that shift is bookkeeping, not statistics.
- one-sided bands (the spherical bearing, −0.05/−0) are not symmetric about their
  midpoint.

So RSS here is a **relative softening indicator, not a probability statement**,
and it is not directly comparable to the worst-case columns. Say so in the
worksheet. **Verdicts never read RSS** — `CheckResult.verdict` deliberately
cannot see it.

### The castellated-nut caveat

**If the joint is retained by a slotted or castellated nut plus a cotter pin, a
continuous-grip model does not answer it. Say so, in the worksheet, next to the
numbers.**

The governing constraint for that retention is not "does the shank protrude past
the washer face". It is **whether a castellation slot lines up with the bolt's
cotter hole** — which *quantises* acceptable grip into discrete workable values
rather than bounding it in a continuous interval. A grip-length interval cannot
express that constraint, so the interval is not the answer even when it is
computed correctly.

Both seeded joints are like this (MS9363 slotted nut + MS24665 cotter pin —
findings F8 and F16), and neither is resolved. This is a **known, named modelling
gap**, and the honest output is the interval *plus* the statement that the
interval does not settle it, plus the two documents that would (the nut's slot
count and depth, and the bolt's cotter-hole position). Do not let a clean-looking
number imply a resolved joint.

Nut-geometry values you transcribe but do not fold in should stay in the stack
with nothing referencing them — the seeded take-2 does exactly that, and a test
asserts they are referenced by nothing. They are the visible stub of the model
that matters.

### Adding a check the source does not contain

Allowed, and sometimes necessary — slice 1 added two, because the washer actually
drawn was not the washer the workbook evaluated. Mark them so they can never be
read back as the source's numbers:

- `"workbook_cells": null`
- `[NOT IN WORKBOOK]` in the `label`

and add a test asserting both.

## Step 5b — if there is no source workbook

The three seeded stacks were **transcriptions**: a hand-built workbook existed,
and half the work was re-deriving its cells and reporting where it drifted from
the drawings. A stack built **from scratch** has no such source, and several
instructions in this SOP have to be read differently.

| where a workbook is assumed | from scratch instead |
|---|---|
| "Re-derivation vs the source" worksheet section | **Omit it.** There are no cells to re-derive. Replace it with a short note saying the stack has no source workbook, so the fold is the only computation and the tests pin it directly. |
| `# JEFF <cell>` test comments | Cite the **document and address** instead — `# 215197 sh2 B4 "3X 4.06 ±0.08"`. The marker's purpose is to say "this number came from outside this repo"; a drawing reference does that just as well as a cell reference. |
| `workbook_cells: null` + `[NOT IN WORKBOOK]` on added checks | Not applicable — **every** check is new. Drop both markers rather than putting them on everything, and say in the worksheet that the whole stack is original. |
| `[slip]` and `[drift]` findings (source errors, source-vs-drawing divergence) | Mostly will not occur; there is no source to slip or drift. `[model]` and `[read]` still very much apply. |
| `kind: "workbook"` source refs | Should appear **zero** times. If one does, ask where that number really came from. |

Everything else applies unchanged, and the one rule applies *harder*: with no
workbook to lean on, the temptation to supply a "standard" value from memory is
much stronger, and there is no cached formula result to contradict it. A
from-scratch stack is where invented numbers are most likely and least
detectable.

Expect a **worse** traced ratio than a transcription in one respect and a better
one in another: fewer values will have any number at all (a workbook at least
supplies an `untraced` figure), but the ones that do will be honestly cited. A
gap with no number is a perfectly good result — record what is missing and what
document would supply it. Do not fill a hole to make the stack look finished.

## Step 6 — write the worksheet

`docs/tolerance_stacks/WORKSHEET_<stack_id>.md`, following the two seeded ones.
Sections, in order:

1. **The joint** — the table from Step 1, including as-drawn part numbers.
2. **Ordered elements** — with `source` and `conf` columns per element. The
   confidence column is not decoration; it is the result.
3. **Paths** — nominal, WC min/max, RSS center/±.
4. **Checks** — nominal, WC, RSS, verdict, and the criterion.
5. **Re-derivation vs the source** — every source result cell against your fold,
   at full precision, with the delta. Paste from
   `debug_report_tolerance_stacks.py --compare`. Deltas around 1e-15 are float
   summation order and are fine; anything larger is a real disagreement and a
   finding. *Omit this section if there is no source workbook — see Step 5b.*
6. **Findings**, each tagged with a diagnosis code:

   | code | meaning |
   |---|---|
   | `[slip]` | an error in the source sheet |
   | `[read]` | **your own** misreading, resolved — record it anyway |
   | `[model]` | a genuine modelling difference or gap |
   | `[drift]` | the source disagrees with the current drawings |

   Record `[read]` findings. Two of slice 1's most valuable notes are its own
   resolved misreadings, both of which an automated transcriber would repeat: a
   blank cell that is deliberate de-duplication (and "fixing" it double-counts
   1.575 mm), and a `comments` column that is a **loose hardware list, not
   row-aligned** — read positionally it attaches a washer's part number to a
   bearing element.

7. **Source gaps** — ranked, each with the document that would close it and what
   it would resolve. This section is the handoff to whoever builds the fastener
   library.
8. **The traced / inferred / untraced count.** State it as a ratio. This is the
   headline of the stack, not a footnote.

**A mismatch against the drawings is a finding, never a transcription error to
fix.** The source may predate the design. Your job is to report the divergence,
not to reconcile it silently.

## Step 7 — pin the numbers, then verify

Add tests to `tests/test_tolerance_stack.py` following the existing pattern: a
fixture per stack, and assertions carrying the **source reference in a comment**
for every number that came from outside this repo. For a transcription the
convention is a `JEFF` marker plus the cell (`# JEFF E18`), meaning "this number
is the source's own arithmetic, not something this repo produced". For a
from-scratch stack, cite the document and address instead (`# 215197 sh2 B4`).
Either way the marker is what makes the suite a **provenance** check rather than a
self-consistency check — without it, the tests only prove the fold agrees with
itself.

Also assert the structural invariants, as the seeded tests do: every element has
a `source_ref` with a valid `confidence`; `element_id`/`run_id` are null; every
`hardware_ref` resolves; every hardware entry has a null `library_ref` and a
non-empty `gaps` list.

```powershell
venv-win\Scripts\python.exe -m pytest -q
```

Then, from the forge repo root:

```powershell
venv-win\Scripts\python.exe -m forge check C:\workspace\tolstack
```

## Step 8 — hand off

- Stack JSON and worksheet committed in `docs/tolerance_stacks/`.
- Hardware entries updated, gaps listed.
- Tests green.
- A lesson in `docs/sessions/lessons/`, and the handoff moved to `completed/`.
- **Report the friction you hit in this SOP.** It is new as of 2026-08-03 and
  under-tested; the first sessions to use it are how it gets fixed. Name the step
  that was wrong, missing, or ambiguous.

---

## Quick reference — the traps, in one list

1. Never fold "MMC → max". A subtracted element inverts the mapping.
2. `nominal` is transcribed, not computed, and may sit outside its own min/max.
3. Every value cites a `source_ref`; recall is not a source; `untraced` only as a
   listed gap.
4. `element_id` / `run_id` stay null.
5. `library_ref` stays null; every hardware entry needs a non-empty `gaps` list.
6. RSS always computed, never read by a verdict, never called a probability.
7. Emit nominal *and* worst case *and* RSS — each one alone has hidden a real
   answer.
8. Castellated nut + cotter pin ⇒ grip is quantised; say the model does not
   settle it.
9. `item_no` (balloons) vs `find_no` (parts_list) — joining wrong yields a
   convincing fake finding.
10. Printed border zone, not the synthetic zone-mapper grid.
11. Same value ≠ same feature (three 4.06 callouts on one drawing).
12. Comment columns in hand-built sheets are free text, not row-aligned.
13. xlsx shared formulas (`<f t="shared" si="1"/>`) read as empty to a naive
    reader.
14. A mismatch against the drawings is a finding, not something to fix.
