# Worksheet — rotor balance-mass bolt, grip length

Covers `stack_rotor_fastener_length.json`. All values in **mm**.

> **Built from scratch. There is no source workbook for this joint** — neither
> slice 1 nor the 260729 workbook ever analysed it. So there is **no
> "Re-derivation vs the source" section**: the fold is the only computation,
> and `tests/test_tolerance_stack.py` pins it directly. Every check here is
> original; `kind: "workbook"` appears **zero** times in the JSON.

> **THE COMPARISON SECTION IS PENDING A HITL INPUT.** This is a shadow
> exercise: Jason Ryan already tolerance-stacked this joint independently in
> Excel, posted as a screenshot in Slack (`C06TS7XDG15`, thread ts
> `1784738867.093289`), which an agent cannot read. Per the handoff, this
> worksheet was built **independently first** — derive, then compare — and the
> comparison section below (§ Comparison against Jason Ryan's stack) is marked
> pending. If `data/inbox/tolerance_stacks/260825_rotor_fastener_jason.png` (or
> `.xlsx`) lands after this session ends, a later session fills that section in
> without re-deriving anything above it.

> **THE STACK IS INCOMPLETE, MORE SO THAN THE OTHER THREE 217755 JOINTS.** Two
> members of the clamped column have no document at all in this repo: the
> balancing-mass thickness (only weight in grams is printed) and the
> receiving-structure's engagement thickness (the balloons at this view are
> reference-only). Both are gaps, not invented numbers. See *Findings* and
> *Source gaps*.

## The joint

| | |
|---|---|
| Assembly | 217755 PROPULSION ASSEMBLY, PROPELLER rev A.1 (`[PRELIM 2026-AUG-19]` export) |
| Location | sheet 8 (*BALANCE WEIGHTS AND SPINNER*), **SECTION T-T**, scale 3:1, printed zone **H3** (caption; view body spans printed zones H4–K4) |
| Places | Not fixed — up to 10 possible balance-hole locations around the hub (general note 12 / JED02183); this stack models the grip-length question at **one** representative location |
| Hub/blade ("the rotor") | 216231-002 HUB AND BLADE ASSEMBLY, CCW, PROPELLER (balloon 70, reference only) |
| Adjoining structure in the same section | 208510-008 VARIABLE PITCH ACTUATOR ASSEMBLY, ALPHA4.2, CCW (balloon 71); 215175-002 TANGENTIAL LINK MOUNT ASSEMBLY, CCW (balloon 72, parts-list nomenclature spells it "ASEMBLY") — both reference only |
| Fastener as drawn | a **nine-member NAS6403 grip family**, NAS6403U2H (.125 in) through NAS6403U10H (.625 in) in .0625 in steps (balloons 61–69, all qty "AR") |
| Washer, under head | MS21299C3 `.193" × .387" × .063"` countersunk (balloon 60, qty AR) |
| Washer, flat | NAS1149V0332H `.203" × .438" × .032"` (balloon 32, qty 9 across the whole assembly) |
| Balancing mass, one or a combination | 216579-002 (11 g), -003 (25 g), -004 (66 g), -005 (4 g), -006 (66 g, B777 class 1), -007 (66 g, B777 class 2) — all qty "AR" (balloons 54–59) |
| Retention | none — a blind tapped hole, not a nut. No MS9363 or MS24665 at this joint. |

Scope is **grip length only, along the bolt axis**. Deliberately out of scope:
which of up to 10 balance-hole locations is used and how the 200 g total
balance budget (JED02183) is allocated across them; torque (note 15:
2.26–2.82 Nm plus running torque); the safety-cable capture (note 7); diameter
and hole fits; thread-engagement depth into the tapped member.

**The question:** given whatever balance-mass configuration is installed at
this location, does at least one of the nine NAS6403 grip options clamp the
stack fully — i.e. keep the receiving member from engaging the bolt's
incomplete threads (JPS00094 Rev C §5.5.5) — across the tolerance range?

### How this joint was identified

Not by fastener nomenclature — by the drawing's **own framing matching the
handoff's, word for word**. 217755 sheet 1 general note 24 reads:

> "SELECT ONE FASTENER FROM PROVIDED OPTIONS AS REQUIRED FOR CORRECT GRIP
> LENGTH PER JPS00094 AND/OR AC43.13-1B."

That is the handoff's "reverse-engineer the rotor fastener length stack" in
the drawing's own words. Three corroborations:

1. This is the **only** 217755 joint with a genuine grip-*selection* family
   (nine NAS6403 dash options). The other three joints in this repo
   (pitch link, tangential link, VPA output) each balloon a single fixed
   dash number.
2. General note 12 ties this joint to balance weights "AS REQUIRED TO MEET
   BALANCE SPECIFICATIONS" on the hub-and-blade assembly — the rotating
   **rotor**, not the pitch-plate linkage the other three joints clamp.
3. The pre-existing `NAS1149V0332` hardware entry (authored for the
   pitch-link joint, before this handoff) already lists a balloon "at
   SECTION T-T" among its `assembly_status.balloons` — an independent prior
   sighting of this same joint.

A second candidate was considered and set aside: sheet 4 **SECTION K-K**
retains 214849-003 SPINDLE SUBASSEMBLY with MS21250H03014 bolts at a single
fixed .875 in grip (no dash family) plus bearing-preload shims
(214935-001/-004/-005). That is a shim-selects-**preload** problem, not a
select-the-grip-length problem, and its drawing carries no note analogous to
24. Ruled out here; if Jason's screenshot names it instead once it lands, the
comparison section below will say so.

## Ordered elements

Physical order from the bolt head. `conf` is the result, not decoration.

| # | element | role | nominal | min | max | source | conf |
|---|---------|------|---------|-----|-----|--------|------|
| 1 | MS21299C3 washer, .063 in | washer | 1.6002 | 1.6002 | 1.6002 | 217755 sh8 SECTION T-T parts list | inferred |
| — | *balancing mass(es)* | *clamped_member* | — | — | — | **NO DOCUMENT — gap 1** | *absent* |
| 2 | NAS1149V0332H washer, .032 in | washer | 0.8128 | 0.8128 | 0.8128 | 217755 sh8 SECTION T-T parts list | inferred |
| — | *receiving-structure thickness* | *clamped_member* | — | — | — | **NO DOCUMENT — gap 2** | *absent* |
| 3 | NAS6403U2H grip (.125 in) | fastener | 3.1750 | 2.9210 | 3.4290 | **NAS6403-NAS6420 Rev 4 sh3, dash 2** | **traced** |
| 4 | NAS6403U3H grip (.188 in) | fastener | 4.7752 | 4.5212 | 5.0292 | **NAS6403-NAS6420 Rev 4 sh3, dash 3** | **traced** |
| 5 | NAS6403U4H grip (.250 in) | fastener | 6.3500 | 6.0960 | 6.6040 | **NAS6403-NAS6420 Rev 4 sh3, dash 4** | **traced** |
| 6 | NAS6403U5H grip (.312 in) | fastener | 7.9248 | 7.6708 | 8.1788 | **NAS6403-NAS6420 Rev 4 sh3, dash 5** | **traced** |
| 7 | NAS6403U6H grip (.375 in) | fastener | 9.5250 | 9.2710 | 9.7790 | **NAS6403-NAS6420 Rev 4 sh3, dash 6** | **traced** |
| 8 | NAS6403U7H grip (.438 in) | fastener | 11.1252 | 10.8712 | 11.3792 | **NAS6403-NAS6420 Rev 4 sh3, dash 7** | **traced** |
| 9 | NAS6403U8H grip (.500 in) | fastener | 12.7000 | 12.4460 | 12.9540 | **NAS6403-NAS6420 Rev 4 sh3, dash 8** | **traced** |
| 10 | NAS6403U9H grip (.562 in) | fastener | 14.2748 | 14.0208 | 14.5288 | **NAS6403-NAS6420 Rev 4 sh3, dash 9** | **traced** |
| 11 | NAS6403U10H grip (.625 in) | fastener | 15.8750 | 15.6210 | 16.1290 | **NAS6403-NAS6420 Rev 4 sh3, dash 10** | **traced** |

### One element carries a zero-width band, and one carries an unverified one

**Changed 2026-09-16** (`citation_identity_correctness`). This section read
*"Two elements carry a zero-width band, on purpose — both washers have
`min == max == nominal`. No document in this repo gives a tolerance on either.
NAS1149 and MS21299 are both absent from `data/inbox/specs/`;
`hardware_entries.json` holds a workbook-derived ±.004 in band for the NAS1149
washer (untraced, forbidden here by SOP Step 5b) and no band at all for
MS21299C3 … every worst-case interval below is a lower bound on the true
spread."* Half of that is now out of date, for a reason outside this stack.

- **NAS1149V0332H** folds **0.7112 / 0.9144 mm** (0.032 ±0.004 in), cited to
  the 260729 workbook's E11/F11 directly, `kind: "workbook"`,
  **`confidence: "untraced"`**. Two things changed on 2026-09-15: Jeff ruled
  that a sourced-but-unverified value belongs in a stack loudly rather than
  omitted silently, and SOP Step 5b gained the rule that **the same part and
  feature must carry the same band in every stack that uses it**.
  `tan_link_to_pitch_plate` and `pitch_link_to_pitch_plate` took this band that
  day; this stack was out of that handoff's scope, so the divergence was
  *recorded* rather than fixed and sat in
  `tests/test_tolerance_stack.py::KNOWN_BAND_DIVERGENCES` until now. NAS1149 is
  still not in `data/inbox/specs/` — that is exactly what `untraced` says, and
  **gap 4 stays open** below.
- **MS21299C3** is still **zero-width**, and honestly so: MS21299 is absent
  from the pile *and* no workbook row exists for it, so there is nothing to
  apply. Gap 3 stays open.

So the worst-case intervals below are still a **lower bound** on the true
spread — one zero-width member is enough for that — but they are no longer as
low a bound as they were.

### An optional washer is included by default

MS21299C3 is ballooned "AR" (as required). JPS00094 §5.5.3.a allows 0–3 such
washers (one under the head, up to two under the nut/part body) when a coarser
fastener-length step is substituted for the exact grip needed. This stack
includes exactly **one**, matching what SECTION T-T draws — removing it or
adding a second/third shifts every budget below by ∓/±1.6002 mm. Not modelled
as a second configuration.

### No inverting element, no castellation

All nine fastener elements are additive external lengths (`max == mmc`); there
is no chamfer, relief or counterbore in this joint. MS21299C3 carries null
`lmc`/`mmc`, the convention for a zero-width washer; NAS1149V0332H carries
`lmc 0.7112` / `mmc 0.9144` as of 2026-09-16, and it is an **additive** member,
so MMC (most material) is the thickest and `mmc → max`. Retention
here is a **blind tapped hole**, not a nut — no MS9363 slotted/castellated nut
and no MS24665 cotter pin appear at this joint, so the castellated-grip
quantisation caveat that governs the pitch-link and tangential-link joints
does not apply here.

## The sourced clamped-column path

`sourced_clamped_stack` = MS21299C3 + NAS1149V0332H = **2.4130 mm**, min **2.3114**,
max **2.5146** — a half-width of **±0.1016 mm**, all of it the NAS1149V0332H washer's
(MS21299C3 is still zero-width). It was zero-width at 2.4130 until 2026-09-16;
the **nominal did not move**, because the band is symmetric about the
transcribed nominal.

## Checks — one budget per grip option

Criterion is `≥ 0` on all nine. Every check is `complete: false` — the
balancing mass(es) and the receiving-structure thickness are both excluded —
so **every check "fails" by construction**, exactly like
`pitch_link_to_pitch_plate`'s two checks (see that worksheet's boxed note).
Read the **magnitude**, not the verdict: it is the combined mass+structure
thickness this dash can accommodate before the receiving member would engage
the bolt's incomplete threads (JPS00094 §5.5.5). Nominal, worst case and RSS
reported together, as the SOP requires. **RSS no longer equals worst case**: it
did while the sourced column was zero-width and the fastener term was the only
one with a real band, and that stopped being true on 2026-09-16. With two banded
terms the RSS half-width is `sqrt(0.1016² + 0.254²) = 0.2736 mm` against a
worst-case half of `0.1016 + 0.254 = 0.3556 mm`.

| dash | grip (in) | budget nominal | budget WC min | budget WC max | RSS min | RSS max | verdict |
|------|-----------|-----------------|----------------|----------------|---------|---------|---------|
| U2H  | .125 | **−0.7620** | −1.1176 | −0.4064 | −1.0356 | −0.4884 | fail (budget) |
| U3H  | .188 | −2.3622 | −2.7178 | −2.0066 | −2.6358 | −2.0886 | fail (budget) |
| U4H  | .250 | −3.9370 | −4.2926 | −3.5814 | −4.2106 | −3.6634 | fail (budget) |
| U5H  | .312 | −5.5118 | −5.8674 | −5.1562 | −5.7854 | −5.2382 | fail (budget) |
| U6H  | .375 | −7.1120 | −7.4676 | −6.7564 | −7.3856 | −6.8384 | fail (budget) |
| U7H  | .438 | −8.7122 | −9.0678 | −8.3566 | −8.9858 | −8.4386 | fail (budget) |
| U8H  | .500 | −10.2870 | −10.6426 | −9.9314 | −10.5606 | −10.0134 | fail (budget) |
| U9H  | .562 | −11.8618 | −12.2174 | −11.5062 | −12.1354 | −11.5882 | fail (budget) |
| U10H | .625 | **−13.4620** | −13.8176 | −13.1064 | −13.7356 | −13.1884 | fail (budget) |

Reading the table (magnitudes, i.e. `−nominal`/`−WC min`): dash **U2H** can
accommodate at most **0.7620 mm** (nominal) / **1.1176 mm** (worst case) of
combined balancing-mass + receiving-structure thickness before shank-out goes
negative; dash **U10H** can accommodate up to **13.4620 mm** / **13.8176 mm**. The
nominals are unchanged since 2026-09-16 and both worst cases grew by exactly
0.1016 mm, which is the NAS1149V0332H band's half-width arriving.
**The nine numbers strictly widen from U2H to U10H** — this is the
reverse-engineered answer this exercise was seeded to produce: once the real
balancing-mass thickness and the receiving structure's engagement thickness
are sourced (gaps 1 and 2), whichever dash's budget first exceeds that
combined figure is the shortest usable grip, and note 24 says to use it (the
shortest grip that clamps is generally preferred — less bolt weight and less
shank-out margin to manage — though the drawing does not say so explicitly).

## Findings

Diagnosis codes: **[slip]** an error in a source, **[read]** my own
misreading (resolved, recorded anyway), **[model]** a genuine modelling
difference or gap, **[drift]** the source disagrees with the current
drawings. Per SOP Step 5b, `[slip]` and `[drift]` are mostly unavailable here
— there is no source to slip, and nothing older than the drawings to drift
from.

### F1 — Find numbers at SECTION T-T shift by one between exports **[drift]**

The `[PRELIM 2606-JUL-7]` export (an earlier, differently-dated export of the
same drawing — note the filename's own typo, "2606" for "2026") numbers this
joint's grip family 62/65–70 (U2H, U4H–U9H, missing U2H's actual neighbour
U3H and U10H at 61/... — the numbering does not match one-for-one). The
`[PRELIM 2026-AUG-19]` export used throughout this stack numbers it cleanly
61–69 (U10H, U2H–U9H in order) plus 70/71/72 for the three reference
assemblies. Both exports balloon the same nine dash options at the same
physical location; only the find numbers moved. This stack cites the
AUG-19 numbers throughout, as the most current export available.

### F2 — Three assemblies are reference-balloted at one section cut, and only one is (probably) tapped **[model, unresolved]**

SECTION T-T balloons three "assembly" reference items at the same location —
216231-002 HUB AND BLADE ASSEMBLY, 208510-008 VARIABLE PITCH ACTUATOR
ASSEMBLY, and 215175-002 TANGENTIAL LINK MOUNT ASSEMBLY — none carrying a
dimension. The best reading, from the balance-weight context (note 12 ties
this joint to "the rotor"), is that 216231-002 carries the tapped hole. This
cannot be settled from the documents in this repo (gap 2); if it is one of
the other two, the joint's *identity* is unaffected (it is still the same
physical bolt and grip family) but the *engagement-thickness gap* belongs to
a different part number than currently recorded.

### F3 — Only 7 of 9 dash options balloon on the older export, all 9 on the current one **[read — resolved]**

Reading the `[PRELIM 2606-JUL-7]` export's balloon set gave only 7 grip
options (missing U2H and U3H at their own balloons) before the `[PRELIM
2026-AUG-19]` export was checked and found to balloon all 9. This is recorded
because it is the kind of thing an extraction that trusted one export would
have missed silently, and it is the reason this stack cites the more current
export rather than the one first found.

## Source gaps

Ranked. Each names the document that would close it and what it would
resolve. This list is the intake queue for the spec-library / fastener-library
stream.

| # | source needed | what it would resolve | priority |
|---|---|---|---|
| 1 | **216579-002 through -007 (balancing-mass part drawings)** — not in this repo; only weight in grams is printed on 217755's parts list | the actual **thickness** per mass option, and how they stack (note 12's "MAX 80G MASS ADDED PER FASTENER LOCATION" implies more than one may combine). Closes the single biggest gap in this stack — without it, every check is a budget, not a verdict. | **1 — blocks the whole stack** |
| 2 | **216231-002 HUB AND BLADE ASSEMBLY** (or whichever of the three reference-balloon assemblies at SECTION T-T actually carries the tapped hole) | the receiving structure's engagement thickness, and confirms which of the three assemblies is tapped (F2) | **1 — blocks the whole stack** |
| 3 | **MS21299** (countersunk washer, absent from `data/inbox/specs/`) | the `.063 in` band on MS21299C3, same gap `MS21299C4K` already carries at the VPA joint | 2 |
| 4 | **NAS1149** (flat washer, absent from `data/inbox/specs/`) | **STILL OPEN, reworded 2026-09-16** (`citation_identity_correctness`). It read *"the `.032 in` band, same gap the pitch-link and tangential-link joints already carry"*. The band is no longer unknown — it is **workbook-sourced**: the stack folds the 260729 workbook's ±.004 in (cells E11/F11) at `untraced`, the same treatment the pitch-link worksheet's gap 4 took on 2026-09-15. One artifact, no corroboration, no standard to re-read. **NAS1149 is what closes this row**, and nothing else does. | 2 |
| 5 | **MIL-S-8879** (thread spec, absent) | the thread run-out length on every NAS6403 dash in this file, same gap the other three 217755 joints already carry | 3 |
| 6 | **AC43.13-1B_w-chg1.pdf** (in the pile, not opened) | the FAA-side citation for note 24's grip-selection criterion, alongside JPS00094 §5.5 (not opened because JPS00094 already gives the definitional criterion used here) | 3 |
| 7 | **Jason Ryan's rotor fastener tolerance stack** (Slack screenshot / xlsx, HITL — see the top of this worksheet) | the comparison this whole exercise exists to make | **1 — the comparison itself** |

## Comparison against Jason Ryan's stack

**PENDING.** Jason's screenshot had not landed in
`data/inbox/tolerance_stacks/` as of this session's authorship (checked
2026-08-25). Per the handoff, the stack above was built independently first.
When the screenshot (and, if available, the `.xlsx`) lands:

- read which dash number(s) Jason's analysis selects or rules out, and check
  it against the corresponding row of the per-dash budget table above;
- read what balancing-mass configuration and receiving-structure thickness he
  assumed — those are exactly gaps 1 and 2 above, so his numbers may be the
  fastest way to close them (with the same from-scratch discipline: his
  numbers corroborate a *guess at what to go source*, they do not themselves
  become a `traced` citation in this repo's stack, per SOP Step 5b);
- note anything he modelled that this stack structurally missed (his own
  spreadsheet almost certainly commits to a single balancing-mass thickness
  and a single receiving-structure thickness, where this stack refused to —
  see *Refused*, below).

## Refused — what was tempting to fill from memory or from a neighbouring stack

| value | the tempting number | why refused |
|---|---|---|
| balancing-mass thickness | back-calculate a plausible thickness from density and a typical washer-like geometry, for a "representative" mass | no document in this repo gives the actual dimensions, and a computed guess dressed as a value is exactly the invented-number failure mode this SOP exists to prevent. Left as gap 1, expressed as an excluded budget term instead. |
| receiving-structure thickness | reuse a flange thickness from a neighbouring 217755 joint (e.g. the 4.06 mm pitch-plate lug) | different part, different location, no evidence the two flanges match. Left as gap 2. |
| ~~MS21299C3 / NAS1149V0332 bands~~ — **half of this reversed 2026-09-16** | the workbook-derived ±.004 in / MS21299C4K's ±.006 in bands already in `hardware_entries.json` | It read *"both are `kind: workbook`, forbidden in a from-scratch stack (SOP Step 5b). Zero-width bands instead."* The ban it invoked was amended on 2026-09-15: a workbook band may be folded, but only wearing `untraced` and only cited to the workbook directly rather than laundered through `hardware_entries.json`. **NAS1149V0332 now folds its ±.004 in on exactly those terms** (`citation_identity_correctness`), which also brings it into line with the two sibling stacks. **MS21299C3 does not**, and the refusal stands for it: there is no workbook row for it to fold — the tempting number was MS21299C4K's ±.006 in, a *different washer*, and borrowing one part's band for another is the invented-number failure mode under a thinner disguise. |

## The traced / inferred / untraced count

Counting **element instances in this stack**:

> **9 traced / 1 inferred / 1 untraced, out of 11 element instances** — plus
> **2 elements that do not exist because they could not be sourced** (the
> balancing mass and the receiving-structure thickness), and **1 of the 11
> carrying a zero-width band** because no document gives one.

Moved 2026-09-16 (`citation_identity_correctness`), from *9 traced / 2 inferred
/ 0 untraced* with *2 of the 11* zero-width: `NAS1149V0332H` went `inferred` (a
parts-list nominal with no band) → `untraced` (a real band whose only support is
a workbook cell). The numerator did not move and neither did the instance count.
The **seeded** ratio below is untouched — this stack is not one of the three
seeded files.

The three seeded slice-1 stacks alone still score **5 of 26** element
instances `traced` (12 `inferred`, 9 `untraced` since 2026-09-15's
`stack_fable_audit` re-cited their bearing and flanged-bushing values to the
RBC catalogs; the split read `"3 inferred, 18 untraced"` when this worksheet
was written) — unchanged in its numerator by this stack, which touches none of
them. Across all seven stacks now in this repo (the three seeded,
`pitch_link`, and this one, plus the two `hub_bearing_thermal_fit` stacks):
**30 of 61 element instances are `traced`** (17 `inferred`, 14 `untraced`;
`"30 of 59"` before the pitch-link joint gained its eye and flange members) —
see `docs/SOP_TOLERANCE_STACK.md`, "The traced ratio", for the single
definition, and `tests\debug_report_tolerance_stacks.py --ratio` to reproduce.

- **The high traced count here is a reason to audit harder, not to relax** —
  nine of the eleven element instances are one document (`NAS6403-NAS6420 Rev
  4.pdf`), read the same way as the other three joints' bolts. The two
  inferred washers and the two missing elements are the honest cost of
  refusing to fill gap 1 and gap 2 from memory.
- **This is the first stack in the repo whose fastener half of the question is
  a family, not a single value** — nine grip options, all traced, none of
  them "the" answer without gaps 1 and 2 closed first.
