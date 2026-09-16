# Audit — full pass over every stack and topology, 2026-09-15

Handoff `stack_fable_audit`, from Jeff's 2026-09-15 review (forge note
`20260915T145908_fwc7qp`): *"I think it might be worth a pass at these with
Fable to see if they can identify and correct these errors."* First time all
seven stacks and five topologies have been swept as one consistency pass.

**The headline: zero transcribed values were wrong.** Every workbook-cited
number in every stack reproduces its cell exactly (10 of 10 instances against
the 260729 workbook, mechanically; 13 of 13 pitch-system edges and transforms
against the 260825 workbook; the thermal pair's 427-cell re-derivation was
already pinned), and every drawing callout spot-checked is on its cited sheet.
What the audit found instead were three other classes of defect, all now fixed
or queued:

1. **A missing-member defect** — the pitch-link joint's model omitted two
   physical members (the eye and the flanged bushing), which is the same class
   Jeff caught in the viewer, one level up from bands.
2. **A citation-currency defect** — nine values sat `untraced` on workbook
   cells while the RBC catalogs in the spec pile printed their bands to the
   digit, and two drawings that answer open identity questions had been sitting
   extracted in drawing-checker for one to four weeks with nothing noticing.
3. **An identity-bookkeeping defect** — the pitch link's part number was
   findable in-repo all along (216231 A.1's parts list, in the spec pile), and
   one earlier owner-refinement had attached the pitch-link length to the wrong
   link.

No value anywhere needed correcting. That matters for the question this audit
was seeded with: the errors Jeff saw on 2026-09-15 were **policy and
completeness errors, not authoring errors** — the numbers the earlier sessions
transcribed were right, and what failed was what the rules of the time made
them do with the numbers they could not verify.

## The pitch-link joint, before and after

The one place the member-completeness sweep changed results. The joint's two
missing members are now elements:

| | before | after |
|---|---|---|
| elements | 6, plus one member absent (eye — "no document") and one unknown (flange) | **8 — every physical member modelled** |
| the eye | excluded term on both checks | **MS14101-3 ball width, 7.09/7.14 mm, off the RBC catalog** — a loudly-marked `untraced` placeholder; which bearing the link carries is unconfirmed until the 213862-002 drawing lands |
| the flanged bushing | not known to exist at this joint | **NAS77A3-015A flange, 1.4478/1.5748 mm**, `inferred` — press-fit in the 215177 plate assembly (its parts list, find 2, qty 8 = 3+5), which is why DETAIL B never ballooned it |
| `shank_out__11_sourced_only` | **fail** (budget-scoped, by construction — the magnitude read as "the joint requires an eye ≥ 8.4280 mm") | **pass, worst case +0.1098 mm** (joint-scoped, `worst_confidence: untraced`) |
| `cotter_hole_clear_of_sourced_stack` | pass, 11.0444 mm budget (had to cover eye + nut) | pass, **2.3296 mm** budget (nut side only — and an MS9363-09 at max height does not fit inside it, which is the known castellation/washer-selection story made quantitative) |
| the link's part number | unknown (gap 1 since founding) | **213862-002 PITCH LINK ASSEMBLY, qty 5**, per 216231 A.1 item 24 |

Why the narrow bearing and not the wide one, since no document names it: (a)
your note gave MS14101-3 / MS14103-3 as the candidates; (b) the sibling link
212956-005 carries one of each per its own extracted parts list, and the
workbook's 11.05/11.10 at the 3-place joint consumes the wide one to the
digit; (c) decisive — the drawing-selected −11 bolt closes only against the
narrow width. With the wide one the shank ends ~3.3 mm inside the column and
the cotter hole lands **inside the clamped stack**: an unassemblable joint.
The old budget arithmetic cross-checks the new pass: the eye-plus-flange
minimum (7.09 + 1.4478 = 8.5378) clears the old binding requirement (8.4280)
by exactly the new 0.1098 mm margin.

**Read the pass with its badge.** Three of the five column terms are
unverified (the eye placeholder, your 214820-002 reading, the workbook washer
band), the margin is thin, and a wrong placeholder erases it. The 213862-002
drawing is the single document that turns this into a real answer — it is item
1 on the operator queue.

## Per stack and topology — what was checked, what moved

| artifact | checked | corrected | still gapped, on whom |
|---|---|---|---|
| `stack_pitch_link_to_pitch_plate` | all values vs sources; member set vs the physical joint | two members added, both checks re-scoped (table above); link identified as 213862-002 | bearing identity → **213862-002 drawing (Jeff, todo 1/7)**; bushing band → 214820-002 PDF (todo 2/7); washer band → NAS1149 (todo 3/7) |
| `stack_tan_link_to_pitch_plate` | all 11 values vs workbook cells (exact) and vs the catalogs; member set vs workbook rows 6–31 (complete) | 4 re-citations: bearing → RBC MS14103-3, flanged-bushing trio → NAS77 page, all `untraced` → `inferred`, values unchanged — the workbook was transcribing these catalogs all along | thin/thick washer bands → NAS1149 standard; thread-transition run-out → MIL-S-8879; which eye of 212956-005 faces the plate → stated by no document (band match + bolt grip both say the wide one) |
| `stack_tan_link_to_pitch_plate_take2` | same (9 values, rows 36–54; restatement confirmed) | same 4 re-citations | same, plus its straight-bushing literals (workbook-only, as recorded) |
| `stack_vpa_output_to_pitch_plate` | all 6 values vs workbook cells (exact); member set vs rows 60–75 (complete) | flange → NAS77 page (`inferred`; the part is NAS77A4-015A, which also finally explains the workbook's loose I62 label); bearing candidate MS14101-4 recorded, not claimed | rod-end bearing identity → Jeff/208510 BOM (todo 5/7); straight bushing → 214943-002 drawing (todo 7/7); washer band → MS21299 (todo 6/7) |
| `stack_rotor_fastener_length` | 11 values vs NAS6403 sheet 3 (dash × .0625 arithmetic + prior reads); member set vs SECTION T-T | nothing — correct as built; its two zero-width washers are the policy-compliant shape (no band in any document) | washer bands → NAS1149 (the listed divergence) and MS21299 (todos 3/7, 6/7); mass thickness + receiving structure → no drawing anywhere (unchanged) |
| `stack_hub_bearing_thermal_fit_m1`/`_m2` | drawing callouts re-confirmed in the five PDFs' text layers; the 427-cell re-derivation ran green; bands consistent m1 ↔ m2 | nothing — correct as built | unchanged: M1's two undrawn parts, the 72 °C envelope, the stiffness ratios, JED01848 |
| `topology_pitch_link_to_pitch_plate` + 3 studies | member set vs the joint; study totals vs stack checks | eye + flange as parts/nodes/edges; studies re-selected and re-pinned | follows the stack |
| `topology_tan_link_take2` / `topology_vpa` / `topology_rotor` + studies | member sets vs their stacks and vs the workbook blocks | nothing — each carries every member its stack does | follows the stacks |
| `topology_pitch_system` + 7 studies | 13 workbook citations vs cells (exact); part identities | `pitch_link` part identified (213862-002) and the length row's owner corrected — the 2026-09-06 refinement had pointed it at the qty-3 anti-rotation link, whose 81.43 mm reference cannot be this edge's 109.4 mm nominal | everything its own placeholder notes already state; the "piston" naming → Jeff (todo 4/7) |

Cross-stack consistency: **no divergent band was found** beyond the one
already filed (`rotor_fastener_length`'s washer, still zero-width by its own
issue). The guard that keeps this true now covers every part+feature folded in
more than one stack — including the first multi-feature part (NAS77A3-015A:
flange, barrel, chamfer) and the thermal bearings — and fails loudly on a new
element folding a shared part it cannot classify.

Check coverage: every one of the 21 studies now either carries a check or a
`no_checks_reason` naming why no criterion is citable (a new schema field,
enforced by test). The five that lacked both were the two blade-angle studies
(their criteria live on their byte-identical end-stop twins), the two
millimetre studies (no in-repo document states a millimetre limit), and the
thread-region cross-check (a reference dimension a criterion would dress as a
requirement). *(The handoff said "6 of 19 studies carry `checks: []`"; the
tree on this baseline has 21 studies, 5 of them check-less — the counts moved
between the handoff's writing and this branch.)*

## Two operator facts the audit has to push back on, with the evidence

- **"The link assembly is 212956-005 per the 217755 PL."** For the 5-place
  pitch-link joint it is not: 212956-005 is qty 3 (the 3-place joint's link),
  and the pitch link is **213862-002, qty 5**, one BOM level down in 216231
  A.1 (which is in tolstack's own spec pile). The export request on the queue
  names 213862-002, not 212956.
- **"MS14101-3 and MS14103-3, one per link type."** The 212956-005 drawing —
  already extracted in drawing-checker since 2026-09-04, so this ask was
  answerable before it was asked — shows **one of each in one link**: find 1 =
  MS14103-3 (wide), find 2 = MS14101-3 (narrow), one per eye. The open
  question is per-eye, not per-link-type, and it now extends to 213862-002.

Related, recorded but deliberately not "fixed": the naming tangle. The
workbook's and slice 1's "tangential link" (the 3X joint) is the part the
drawing titles PITCH ANTI ROTATION LINK ASSEMBLY; the actual "TANGENTIAL LINK
MOUNT" assemblies (215175) hold no link at all in their own parts list; and
the 5X joint's link is titled plain PITCH LINK ASSEMBLY. Every document keeps
its own words with the mapping written where the words meet; renaming
committed ids would break deep links and annotate keys for a cosmetic gain.

## The confidence picture after the audit

Run `tests\debug_report_tolerance_stacks.py --ratio` for the numbers (the
definition lives in the SOP and only there). Directionally: the traced
numerators did not move — the audit added no `traced` labels, because a
catalog band plus a count-argument identity is `inferred`, and a placeholder
whose part identity is open is `untraced` however re-readable its number. What
moved is the honest middle: nine long-`untraced` seeded instances now cite the
catalog pages their bands were always copied from, and the pitch-link joint's
denominator finally counts its whole column. `untraced` now means only things
a document in this repo genuinely cannot answer.

## The operator queue

Every item only you can close, filed as forge todos (source note
`20260915T145908_fwc7qp`), ranked; the drawing asks are batchable in one
export session:

| rank | todo id | ask |
|---|---|---|
| 1 | `20260915T233854_1oaguy` | export **213862-002** PITCH LINK ASSEMBLY (names the pitch-link eye's bearing; the repo's loudest placeholder rests on it) |
| 2 | `20260915T233911_4vjah8` | **214820-002** drawing PDF into `data/inbox/specs/` (you read it 2026-09-15: 4.76 +0/−0.13) |
| 3 | `20260915T233911_fhf9cp` | **NAS1149** washer spec sheet (three stacks' washer bands) |
| 4 | `20260915T233912_ppcerj` | what is the VPA's actual **moving output member**? (the sheet's "piston", rows 38/39 quoted in the todo) |
| 5 | `20260915T233929_ukyucc` | confirm the **VPA rod-end bearing** part number (band = MS14101-4's exactly; candidate, not claimed) |
| 6 | `20260915T233929_2jxqvg` | **MS21299** washer spec sheet (two joints) |
| 7 | `20260915T233929_ehxu62` | export **214943-002** plain bushing (VPA joint) |

Not asked, because already in hand: 212956-005, 213863-004, 215175, 215177
(drawing-checker runs of 2026-08-13 through 2026-09-10). Worth knowing: those
extractions answered two of this audit's questions without a single new
export, and nothing in either repo flags "a drawing you asked for has
arrived" — the same class of quiet non-noticing the spec-pile gap join fixed
for specs. Filed as an issue.

## Fixed elsewhere on this branch

- The cross-stack band guard covers every multi-stack part+feature repo-wide
  (with a mutation-verified classify-me failure mode).
- The 215735-A released pitch plate (in drawing-checker's inbox) prints the
  **same three lug callouts** as the PRELIM 215197 the stacks cite — 3X 4.06
  ±0.08, 5X ±0.10, 1X ±0.10 — so the traced lug values hold on the current
  part; the part-number succession (215197 → 215735-001/-002 inside 215177) is
  filed as an issue rather than re-cited mid-audit.
- Viewer `[real]`-tier data pins and `apps/viewer/README.md`'s derived layout
  totals moved with the data (verified 373/373 against a scratch projection
  root; the shared projection in the main checkout was left alone — it belongs
  to whoever rebuilds after merge).
