# Lessons — hub_bearing_thermal_stack (worked 2026-08-05)

Handoff: `docs/sessions/completed/HANDOFF_20260805_hub_bearing_thermal_stack.md`.
Branch: `handoff/hub_bearing_thermal_stack`, cut from `master` with
`sop_edits_apply` merged (58 tests green at the baseline; 193 at the end, after merging `spec_library_v0`).

Build the **two-stage thermal-fit archetype** from Jeff's
`260209_Hub Bearing Fits.xlsx` — the repo's **second archetype**, and the template
for the CTE-mismatch layer he wants computed for all designs.

## What landed

| commit | |
|---|---|
| `8ff7c82` | `data/inbox/drawings/` as a new inbox stream, five drawings copied in with hashes, the 260209 workbook's provenance, one false PROVENANCE claim corrected |
| `46a450a` | the workbook re-derivation — 427 formula cells, zero mismatches |
| `5c6bf97` | `Term.coefficient`, so one `fold()` serves a thermal fit |
| `0b7e5f1` | `tolerance_stack/thermal.py`, `materials.json`, both stacks, two bearing hardware entries, 36 new tests, a reporter |
| `ab01e87` | worksheet, `ARCHETYPE_thermal_fit.md`, README + ARCHITECTURE |
| `5362fcb` | this lesson + the one SOP pointer line (labelled `wip:` — it was a pre-merge checkpoint, and the label is honest rather than tidy) |
| *(the merge commit, this one)* | merge master (`spec_library_v0` had landed), conflicts resolved, three PROVENANCE rows re-amended, handoff → `completed/`. No hash here: a commit cannot carry its own |

**Suite: 193 tests green** — 71 `test_tolerance_stack`, 12 `test_hub_bearing_rederivation`,
36 `test_hub_bearing_thermal_fit`, 44 + 30 from `spec_library_v0`.
`forge check` OK against the **worktree** (not only the main checkout — the
founding lesson's false-pass trap).

Results, all eleven findings, the ranked gaps and both traced counts are in
`docs/tolerance_stacks/WORKSHEET_hub_bearing_thermal_fit.md`. Not repeated here.

**The one thing to carry away if you read nothing else:** the workbook's
LMC/MMC columns are **coherent material corners**, and a worst-case fold is not
the same question. They coincide for stage 2 and diverge by 0.05 mm for stage 1,
and the divergence is in the unfavourable direction. See F1 in the worksheet and
the general rule in `ARCHETYPE_thermal_fit.md`.

---

## Refused — values I was tempted to fill and did not

The pitch_link precedent, repeated because the temptation was different this time
and worse.

| value | what I could have written | why refused |
|---|---|---|
| **CTE of 7050-T7451** | a number I am confident about, to 3 significant figures | **This is the single most dangerous value in the session.** Bulk material properties are exactly what an LLM reproduces fluently — more fluently than fastener dimensions, because they are more widely tabulated. CINDAS is the source of record and no pull has happened, so the workbook's 23.04e-6/°C is `untraced` with the CINDAS request written out. Recalling it would have produced a *correct-looking* number wearing whatever confidence I gave it. |
| **CTE of AISI 420** | likewise | likewise. |
| **CTE of 52100** | likewise, and I nearly did something worse — see below | likewise, plus the material itself is unconfirmed. |
| **the temperature range each CTE is a mean over** | "20–100 °C", the range most tables use | the workbook states **no range**. Writing one in would have invented a provenance detail, which is worse than an untraced number: it makes the citation *look* complete. `cte_temperature_range_c` is `null` and a test asserts it stays null. |
| **the bearing outer-ring material** | "52100, obviously" | both bearing drawings are **source control drawings** and name no material. `52100` is a spreadsheet cell *label*. Its gap says: confirm the alloy from the NSK certificate or JED01848 **before** pulling CINDAS, because a CINDAS pull for a guessed alloy comes back wearing a `traced` citation. That is the trap: the gap-closing step would have laundered the guess. |
| **a stiffness ratio derivation** | a thick/thin-cylinder stiffness split; the algebra is standard | it would be *my* derivation, not the source's, and 0.8/0.9 are labelled "estimate". Recorded as gap 4 with `[SENSITIVITY]` checks at k=0 and k=1 instead, which is the honest way to show a number you cannot source: quantify its reach. |
| **the sleeve OD and its tolerance** | 202.38 ±0.025, straight off the workbook's row 18 | **neither sleeve drawing dimensions its OD at all.** Inventing one would have meant inventing it *narrower* than the drawing licenses — which is precisely the workbook's F1 error, arrived at independently. The stack has no `sleeve_od` element; the wall enters at `coefficient: 2`. |
| **217755 find numbers / quantities** | plausible integers | the assembly export was not opened. Every `find_no`, `qty` and `balloons` is `null`, both bearing entries carry a "not checked" gap, and a test asserts that a null `present` is gapped rather than silent. |

**The pattern that made this session different from pitch_link:** there, the
tempting values were *fastener dimensions*, which the SOP names explicitly and
warns about by name. Here they were **material properties**, which the SOP does
not mention at all — because the linear archetype does not need any. A rule that
lists its own examples protects you only where the examples reach.

---

## Friction report — the SOP, from a second-archetype consumer

The SOP is a **linear-grip-stack** SOP that does not say so. Everything below is
that one fact, itemised. Filed as proposed edits, **not applied** — the
`sop_edits_apply` precedent (2026-08-05) is that a consumer files and a later
handoff applies, and batching keeps the diff reviewable.

I made **one** exception, noted at the end.

### 1. "The four schemas" is now five, and the table has no archetype column

`materials.json` (`joby.tolerance_stack/material_entry/v0`) is the fifth. The
schema table is also the natural place to say *which archetype a schema belongs
to* — `material_entry` is meaningless to a grip stack.

> **Proposed:** rename the section, add the row, add an "archetype" column with
> `all` / `thermal_fit`. Note that `material_entry` is additive and needs no rev to
> the others.

### 2. Step 2's "one `StackElement` per physical feature **along the path**" has no meaning here

There is no path. A diametral fit is not an ordered traverse; it is a set of
concentric surfaces. "Physical order" degenerated to "outermost first", which I
adopted and which nothing in the SOP sanctions.

> **Proposed:** in Step 2, after the ordering sentence: *"An archetype without a
> traverse (a diametral fit, a concentric stack) has no physical order to follow.
> Order by containment, outermost first, and say so in the worksheet."*

### 3. Step 5's "a path is a signed term list" — both my stacks have `paths: []`

And that is correct, not lazy: a named intermediate (a sleeve OD, an installed
bore) would be a second place a value could be wrong, so the intermediates are
algebraically collected into each stage's weights. The SOP reads as though `paths`
is mandatory.

> **Proposed:** in Step 5, one sentence: *"`paths` may be empty. A named
> intermediate earns its keep only if more than one check reads it; otherwise it is
> another place a sign can be wrong."*

### 4. Step 5's verdict table does not say **which end** binds — and 5c's answer is archetype-specific

Step 5c is excellent and it is about a *grip* budget check, where the binding end
has to be argued each time (`pitch_link`'s 8.1939-vs-7.4859 near-miss). For a fit
stack the answer is uniform and boring: **the worst-case minimum always binds**,
because the criterion is about looseness. I spent time re-deriving that from 5c's
reasoning before realising it did not apply.

> **Proposed:** open 5c with *"Which end binds is a property of the archetype, and
> for some archetypes it is fixed. State it once in the archetype's own doc; the
> rest of this step is for archetypes where it varies per check."*

### 5. Nothing tells you what to do with a **non-dimensional** sourced value

CTE, temperature, stiffness ratio. None can be a `StackElement` — it holds lengths
— so none has anywhere to carry a `source_ref`, and the SOP's one rule ("every
element value cites a `source_ref`") is silent about values that are not elements.
**These were the seven least-traced numbers in the stack and the SOP had no slot
for any of them.** They ended up in three ad-hoc places: a `materials.json`, a
`temperature_source` key, a per-chain `stiffness_ratio.source_ref`.

> **Proposed, and this is the biggest one:** a new Step 4b, "Values that are not
> elements". Restate the rule as *"every **value** cites a `source_ref`"*, require
> a `source_ref`-shaped citation wherever the value lives, and require the
> worksheet's ratio to count them. This is also the registry design input — see
> below.

### 6. Step 6 section 8's ratio counts elements, which for this archetype flatters the stack

12 traced of 16 element instances. 0 traced of 7 non-element values. Quoting the
first alone would be true and misleading, so the worksheet quotes both — but that
was my judgement, not the SOP's instruction.

> **Proposed:** *"Count every sourced value, not every element. If your archetype
> has values that are not elements, quote both ratios — the element-only one
> overstates what is known."*

### 7. Step 6 section 5's re-derivation table assumes the disagreement can only be arithmetic

"Deltas around 1e-15 are float summation order and are fine; anything larger is a
real disagreement and a finding." Mine are 0.05 mm and they are *methodological* —
same inputs, same arithmetic, different question. The instruction as written pushes
you to look for a transcription error that is not there.

> **Proposed:** add a third category: *"A delta can be a **method** difference — the
> source asked a different question. Quantify it, say which method the stack uses
> and why, and check whether it changes a verdict. Do not hunt for a transcription
> error you will not find."*

### 8. Step 5's `[NOT IN WORKBOOK]` marker does not scale to a generated stack

Every check here is generated and none appears in the workbook, so marking each
one would be noise — the same problem Step 5b already solves for from-scratch
stacks ("drop both markers rather than putting them on everything"). I kept
`workbook_cells: null` (cheap, machine-checkable) and dropped the label prefix.

> **Proposed:** extend 5b's rule to cover "every check is new because the
> archetype generates them", and say `workbook_cells: null` stays while the label
> prefix goes.

### 9. Nothing warns that **generating** checks costs the repo's central safety property

The whole design rests on a reviewer reading every sign in the JSON. Generating
term lists buys correctness — no coefficient can go stale in a data file — at the
price of there being no term list to read. I paid it back with
`debug_report_thermal_fit.py --terms` and a worksheet appendix, and that is a
compromise, not a solution.

> **Proposed:** wherever the SOP introduces generated checks, require the expanded
> terms in the worksheet, and say why.

### 10. Step 3's tracing order does not mention part drawings held in this repo

Step 3 sends you to `data/inbox/specs/` and then to drawing-checker's extracted
runs. The five drawings this stack traces to were **in drawing-checker's inbox and
had to be copied here** to be citable. `data/inbox/drawings/` now exists (and
resolves a dangling reference the tolerance_stacks provenance had made to it since
founding), but the SOP does not know about it.

> **Proposed:** add `data/inbox/drawings/` to Step 3's preference list, between the
> spec pile and the extraction runs, with the copy-in rule and trap 15's
> worktree caveat.

### 11. Step 3's tracing method assumes no text layer — these drawings have one, and that is its own trap

*"Expect poor photocopies: no text layer, so read the page, don't grep it."* True of
the spec pile, false of these five. So I grepped them — and **nearly got the
governing dimension wrong**, because a text layer gives a dimension's *value* and
not what it measures. `1.190 ±0.025` and `1.110 ±0.035` sit side by side on
214955-004 and only a rendered crop shows the first is the radial wall and the
second the flange's axial thickness. 1.110 is also nearly the *upper* sleeve's wall
(1.110 ±0.025), which makes the wrong reading doubly plausible.

> **Proposed:** *"A text layer is a locator, not a reading. Crop and look at any
> dimension you are about to fold. A grep gives you the number and not the
> feature — and two dimensions of similar magnitude on one sheet is the normal
> case, not the exotic one."*

### The one SOP line I did change

I added a single pointer at the head of the schema section: read
`ARCHETYPE_thermal_fit.md` first if your stack is not a linear grip stack. Every
substantive edit above is queued, but an SOP that says "four schemas" and
describes one archetype, with no signal that a second exists, actively misleads
the next cold consumer for as long as the queue takes. One line is the smallest
thing that prevents that. Flagged here so the reviewer can revert it if the
convention should be absolute.

---

## What the archetype needed that the linear stack did not

The registry design input, which was deliverable 2's real product. The full table
is in `ARCHETYPE_thermal_fit.md`; the two items a registry has to **solve** rather
than record:

1. **Non-dimensional inputs have no home.** Friction item 5. CTE, temperature and
   stiffness ratio are the least-traced values in the stack and the only ones with
   no `StackElement` to carry a `source_ref`. Three archetypes will want three
   more kinds. **This wants one shape, and it is the thing to design first** —
   ahead of any registry mechanism, because a registry that dispatches on
   archetype while every archetype invents its own provenance slot has automated
   the wrong half.
2. **Generated checks cost reviewability.** Friction item 9. Worth deciding
   deliberately rather than per-archetype: either every archetype hand-authors its
   terms (and accepts stale coefficients in data files), or generation is standard
   and the *reporter* becomes a first-class deliverable rather than a debug tool.

And one thing that did **not** need solving, which is the more useful result:
`fold()` did not need replacing. Three things the archetype needed — a diametral
`×2`, a soak factor, a stiffness split — all turned out to be *weights on term
entries*, not new ways to combine element values. `Term.coefficient` (positive,
default 1.0, direction still in `sign`) covered all three, the three seeded stacks
re-derive unchanged to 6.4e-15, and the invariant that matters held: **one place
where element values are combined.** The line for archetype three is stated in
ARCHITECTURE.md — a layer may compute weights; it may not combine two element
values.

---

## The asks left for Jeff

### CINDAS pulls — four, and they are cheap

Requests are written out per material in `materials.json` under `cindas_request`.
In priority order:

1. **7050-T7451** — mean linear CTE over 20→72 °C and −20→20 °C. Highest leverage
   in the stack: the hub is the fastest-growing member, so this sets how fast heat
   eats the interference. Also worth knowing whether 23.04e-6/°C is a 20–100 °C
   mean; if the hot-range value is *larger*, every stage-1 result gets worse.
2. **AISI 420 per AMS5621**, hardened — same two ranges. Plus: do 46–51 HRC and
   48–54 HRC differ enough in CTE to separate? The workbook uses one value for
   both sleeves, and if they differ it is the **upper** sleeve to check, because
   that is the bore that reaches clearance first.
3. *(blocked)* **the bearing outer-ring alloy** — **confirm the material before
   pulling CINDAS.** NSK certificate (both drawings require one per lot/serial) or
   JED01848.
4. **the confirmed bearing alloy** — same two ranges, once 3 is answered. Least
   consequential of the three: the bearing appears only in stage 2, which the
   workbook already bounds correctly.

### Drawings and documents

| ask | why |
|---|---|
| **JED01848** (Propulsion Bearing Engineering Specification) into `data/inbox/specs/` | cited by both bearing drawings for *load capacity **and** operating temperature*. Closes gap 3 (the 72 °C question) and feeds gap 5 (the alloy). The single most useful document not in the repo. |
| **214955-003** (or confirmation) | the workbook models wall **1.18**; the -004 drawing in hand says **1.190 ±0.025**. Is 1.190 a further tightening after the analysis, or was 1.18 a transcription of -003? It decides whether the M2 lower seat's hot corner passes on the analysed part or only on the current one. |
| **212966-004** and **214955-002** | the M1 configuration. Turns the M1 stack's 2 `inferred` + 2 `untraced` into traced values. **Low priority** — M1 is a superseded control and its conclusion is robust to the values. |

### Questions, one line each

1. **Is 72 °C a qualified envelope or one test's maximum?** The M1 sheet's own
   annotation reads as the latter ("Max seen in whirly temp at spindle bearing temp
   sensor was 72C"). This is the governing corner and hotter is monotonically
   worse.
2. **What is `M2!I27`?** An unlabelled orphan cell, hot MMC hub bore minus
   *room-temperature* MMC sleeve OD. Looks like an assembly-clearance scratch
   calculation. If it is one, there is an assembly-window question this stack does
   not model.
3. **Where does the stiffness ratio come from**, and is 0.8/0.9 conservative or
   central? It moves the lower seat's hot stage 2 by 0.066 mm across k = 0→1 and
   flips its verdict at k = 0.
4. **Was the M2 change meant to address the upper seat too?** Rows 31–44 are
   numerically identical between the sheets, so it did not — and the upper seat is
   where both this stack and the workbook itself report the hot clearance.
5. **Why is ⌀129.968 printed in a highlight colour** on 214959-002, uniquely on
   that sheet? Observed, not interpreted. May mark a critical characteristic.
6. **Do the hub's anodize/chem-conversion flag notes cover the bearing bores?**
   Note 15 says limits apply *before* coating and note 12 allows 15 μm — 30 μm
   diametral, comparable to the whole bore tolerance. The sleeves use the opposite
   convention (limits *after* treatment).

---

## Notes for whoever works here next

- **`git check-ignore -v` before believing a new inbox stream is tracked.** The
  four-line dance (`!dir/`, `dir/*`, `!dir/doc`) is easy to get almost right, and
  almost right means the doc is silently absent from the branch. Verified with
  `git check-ignore -v` *and* `git ls-files`, per the review checklist.
- **The re-derivation harness commits its cached cell values.** Unlike the 260729
  workbook, `260209_Hub Bearing Fits.xlsx` has **no immutable forge upstream** —
  atomic note `20260804T173624_vwb8ia` announces it in prose with an empty
  `attachments` array. So the main-checkout copy is the only one, and the 480
  committed values are the numbers surviving in git if the file does not. A second
  test re-reads the live workbook when it can be found and skips when it cannot,
  so the transcription is still checked wherever the source exists.
- **Do not re-derive a workbook by replaying its formula strings.** Rows 17, 18,
  21, 35, 36 and 39 use Excel *shared* formulas, whose text is empty (trap 13) —
  and those are exactly the cells worth checking, because their formula has to be
  *inferred*. Replaying strings proves the reader works; hand-modelling the sheet
  is what found the row-18 slip.
- **PROVENANCE.md's specs-pile paragraph claimed five hub-bearing drawings were in
  the pile.** They were not — they went to drawing-checker, and then to this
  repo's own new `drawings/` stream. The byte count in the same sentence was 488
  bytes stale. Both halves were written one day earlier, from expectation rather
  than from a count. Corrected in `8ff7c82`. **This is the third sighting of that
  bug class in four sessions.** The fix that generalises is the one applied to
  `hardware_entries.json`'s description this session: put the counts in a test.
- **`test_hardware_entries_flag_the_two_parts_missing_from_the_assembly` collapsed
  `present: False` with `present: None`** and would have manufactured a
  not-in-the-parts-list finding for both bearings. Sharpened: `False` is a finding
  about the design, `None` is a gap on the author, and a `None` must be gapped
  explicitly.
- **Two workbooks by the same author, two comment-column conventions.** The 260729
  sheet's comments are a loose hardware list, not row-aligned (trap 12). This
  one's *are* row-aligned, and they are the only source for the M1 part numbers.
  Check, do not assume — in either direction.
- **Sheet order is reverse-chronological.** M2 (current intent) first, M1
  (as-built, superseded) second. A skim gets the direction of the fix backwards.

## Next

- Review this branch against `docs/prompts/REVIEW_AGENT.md`. The provenance audit
  should start at `materials.json`: three CTEs, zero traced, and the worksheet's
  23-value ratio is the number to check independently.
- The queued SOP edits (friction items 1–11) want a `sop_edits_apply`-style
  handoff. Item 5 is the substantive one and it is a design question, not an edit.
- An archetype registry wants a **third** archetype first. Jeff's atomic note
  names the next two: the magnet holder (an offset cantilevered beam on shims —
  real geometry transforms) and the pitch system (a linkage with a parallel load
  path through the ring gear — gear form and backlash). Neither is a diametral fit,
  so the registry's shape is not yet determined by two data points.
