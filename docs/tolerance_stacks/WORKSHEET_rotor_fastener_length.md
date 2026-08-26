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

### Two elements carry a zero-width band, on purpose

Both washers have `min == max == nominal`. **No document in this repo gives a
tolerance on either.** NAS1149 and MS21299 are both absent from
`data/inbox/specs/`; `hardware_entries.json` holds a workbook-derived ±.004 in
band for the NAS1149 washer (untraced, forbidden here by SOP Step 5b) and no
band at all for MS21299C3 (a brand-new entry, no workbook row exists to
launder). Consequence: every worst-case interval below is a **lower bound** on
the true spread.

### An optional washer is included by default

MS21299C3 is ballooned "AR" (as required). JPS00094 §5.5.3.a allows 0–3 such
washers (one under the head, up to two under the nut/part body) when a coarser
fastener-length step is substituted for the exact grip needed. This stack
includes exactly **one**, matching what SECTION T-T draws — removing it or
adding a second/third shifts every budget below by ∓/±1.6002 mm. Not modelled
as a second configuration.

### No inverting element, no castellation

All nine fastener elements are additive external lengths (`max == mmc`); there
is no chamfer, relief or counterbore in this joint. The two washers carry null
`lmc`/`mmc`, same convention as the other joints' zero-width washers. Retention
here is a **blind tapped hole**, not a nut — no MS9363 slotted/castellated nut
and no MS24665 cotter pin appear at this joint, so the castellated-grip
quantisation caveat that governs the pitch-link and tangential-link joints
does not apply here.

## The sourced clamped-column path

`sourced_clamped_stack` = MS21299C3 + NAS1149V0332H = **2.4130 mm**, zero-width
(both members are zero-width bands, so the path is too).

## Checks — one budget per grip option

Criterion is `≥ 0` on all nine. Every check is `complete: false` — the
balancing mass(es) and the receiving-structure thickness are both excluded —
so **every check "fails" by construction**, exactly like
`pitch_link_to_pitch_plate`'s two checks (see that worksheet's boxed note).
Read the **magnitude**, not the verdict: it is the combined mass+structure
thickness this dash can accommodate before the receiving member would engage
the bolt's incomplete threads (JPS00094 §5.5.5). Nominal, worst case and RSS
reported together, as the SOP requires; RSS equals worst case exactly here,
because the sourced column is zero-width and only the fastener term carries a
real band.

| dash | grip (in) | budget nominal | budget WC min | budget WC max | RSS min | RSS max | verdict |
|------|-----------|-----------------|----------------|----------------|---------|---------|---------|
| U2H  | .125 | **−0.7620** | −1.0160 | −0.5080 | −1.0160 | −0.5080 | fail (budget) |
| U3H  | .188 | −2.3622 | −2.6162 | −2.1082 | −2.6162 | −2.1082 | fail (budget) |
| U4H  | .250 | −3.9370 | −4.1910 | −3.6830 | −4.1910 | −3.6830 | fail (budget) |
| U5H  | .312 | −5.5118 | −5.7658 | −5.2578 | −5.7658 | −5.2578 | fail (budget) |
| U6H  | .375 | −7.1120 | −7.3660 | −6.8580 | −7.3660 | −6.8580 | fail (budget) |
| U7H  | .438 | −8.7122 | −8.9662 | −8.4582 | −8.9662 | −8.4582 | fail (budget) |
| U8H  | .500 | −10.2870 | −10.5410 | −10.0330 | −10.5410 | −10.0330 | fail (budget) |
| U9H  | .562 | −11.8618 | −12.1158 | −11.6078 | −12.1158 | −11.6078 | fail (budget) |
| U10H | .625 | **−13.4620** | −13.7160 | −13.2080 | −13.7160 | −13.2080 | fail (budget) |

Reading the table (magnitudes, i.e. `−nominal`/`−WC min`): dash **U2H** can
accommodate at most **0.762 mm** (nominal) / **1.016 mm** (worst case) of
combined balancing-mass + receiving-structure thickness before shank-out goes
negative; dash **U10H** can accommodate up to **13.462 mm** / **13.716 mm**.
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
| 4 | **NAS1149** (flat washer, absent from `data/inbox/specs/`) | the `.032 in` band, same gap the pitch-link and tangential-link joints already carry | 2 |
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
| MS21299C3 / NAS1149V0332 bands | the workbook-derived ±.004 in / MS21299C4K's ±.006 in bands already in `hardware_entries.json` | both are `kind: workbook`, forbidden in a from-scratch stack (SOP Step 5b). Zero-width bands instead. |

## The traced / inferred / untraced count

Counting **element instances in this stack**:

> **9 traced / 2 inferred / 0 untraced, out of 11 element instances** — plus
> **2 elements that do not exist because they could not be sourced** (the
> balancing mass and the receiving-structure thickness), and **2 of the 11
> carrying a zero-width band** because no document gives one.

The three seeded slice-1 stacks alone still score **5 of 26** element
instances `traced` (3 `inferred`, 18 `untraced`) — unchanged by this stack,
which touches none of them. Across all seven stacks now in this repo (the
three seeded, `pitch_link`, and this one, plus the two
`hub_bearing_thermal_fit` stacks): **30 of 59 element instances are `traced`**
(9 `inferred`, 20 `untraced`) — see `docs/SOP_TOLERANCE_STACK.md`, "The traced
ratio", for the single definition, and
`tests\debug_report_tolerance_stacks.py --ratio` to reproduce.

- **The high traced count here is a reason to audit harder, not to relax** —
  nine of the eleven element instances are one document (`NAS6403-NAS6420 Rev
  4.pdf`), read the same way as the other three joints' bolts. The two
  inferred washers and the two missing elements are the honest cost of
  refusing to fill gap 1 and gap 2 from memory.
- **This is the first stack in the repo whose fastener half of the question is
  a family, not a single value** — nine grip options, all traced, none of
  them "the" answer without gaps 1 and 2 closed first.
