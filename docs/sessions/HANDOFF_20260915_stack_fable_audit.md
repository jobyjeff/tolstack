---
priority: high
depends_on: [pitch_link_known_bands, model_fable_enum]
model: fable
---

# HANDOFF 2026-09-15 — stack_fable_audit: audit every stack and topology against the sources, and build the operator queue

Source: Jeff's 2026-09-15 review (forge note `20260915T145908_fwc7qp`): "I
think it might be worth a pass at these with Fable to see if they can
identify and correct these errors." (The `model: fable` above is why this
handoff depends on dispatch's `model_fable_enum`.) Baseline: `master` with
`pitch_link_known_bands` merged. Scope: this session owns
`docs/tolerance_stacks/*.json`, `docs/topologies/*.json`, worksheets, their
tests, and an audit report; it may commit corrections it can prove from
in-repo sources. Do NOT touch `apps/` (viewer/annotate — parallel handoffs
own them) and do NOT add anything to `data/inbox/specs/` (append-only,
operator-fed).

## Why an audit, and what it already knows

Jeff's 2026-09-15 review found the pitch-link stack "completely wrong":
zero-width bands where drawings carry real ones, and studies missing the
spherical bearing width and flange shoulder width. Investigation showed most
of that was the pipeline following its own rules and hiding the result — but
it also showed the pitch-link joint is the **only** grip joint whose topology
omits the bearing and flange members (`topology_vpa_output_to_pitch_plate.json`
and `topology_tan_link_to_pitch_plate_take2.json` both model
`spherical_bearing` and a bushing-flange thickness), and that several studies
carry no check at all. Nobody has ever swept all seven stacks and five
topologies as one consistency pass. That is this session.

Ground truth available in-repo:
- Jeff's workbook `data/inbox/tolerance_stacks/260729_sample_tol_stack.xlsx`
  (sheet `grip length tols old`: Tan Link, Tan Link take 2, VPA Output
  blocks; dump with `tests/debug_dump_tol_stack_xlsx.py`). There is
  deliberately no pitch-link block in it.
- `docs/tolerance_stacks/hardware_entries.json` (recorded bands with
  provenance).
- `data/inbox/specs/` datasheets and the drawing-checker exports the stacks
  cite.
- The SOP amendments landed by `pitch_link_known_bands` (Jeff's 2026-09-15
  placeholder policy): a sourced-but-unverified value MAY be applied with
  true confidence carried; **a member with such a source is included as a
  loudly-marked placeholder rather than omitted**; same part+feature ⇒ same
  band in every stack. Omission + excluded-terms only when no number exists
  anywhere.

Operator facts supplied by Jeff, 2026-09-15 (use them; do not re-derive):
- **The spherical bearings are MS14101-3 and MS14103-3**, one per link type
  (pitch anti-rotation links vs tangential links). The RBC catalogs are
  already in the inbox: `data/inbox/specs/RBC - Plain bearings (NAS77 p92).pdf`
  and `RBC_Aerospace_Plain_Bearings_Web.pdf` — so bearing width values are
  citable NOW; what's unresolved is only **which bearing goes with which
  link**, which the link assembly drawings call out.
- **The link assemblies are the machined links with the bearings
  pressed/swaged in.** The 217755 A.1 top-level parts list (drawing-checker
  run `20260909_174538_217755_A.1_...`, `217755_A_p01.json`, 97 rows) has:
  find 25 = `212956-005` "PITCH ANTI ROTATION LINK ASSEMBLY, PROPELLER"
  (qty 3), find 41/73 = `215175-001/-002` tangential link mount assemblies,
  find 1/72 = the CW/CCW VPA assemblies (`208510-007` / `218510-006`). The
  MS bearings do NOT appear at this level — they're in the link assemblies'
  own parts lists, so the bearing↔link mapping needs those drawings
  (212956 at least), which Jeff will export on request (he did a ~7-drawing
  export batch before; ask via the operator queue, naming exact drawing
  numbers).

## Deliverables

1. **Cross-stack consistency sweep.** For every part+feature used in more
   than one stack/topology: same band everywhere, or a written reason.
   Correct the inconsistent side where the right value is provable in-repo;
   extend the consistency test `pitch_link_known_bands` started so the
   invariant holds repo-wide.
2. **Joint-completeness sweep.** For each topology, compare its member set
   against the physical joint (the sibling topologies and Jeff's workbook
   rows are the reference for the three grip joints): a missing member is
   **added with best-available placeholder values** (workbook / RBC catalog /
   MS spec, confidence carried honestly) per the placeholder policy —
   omission is reserved for members with no number anywhere, and those still
   get a named, ranked gap. The pitch-link eye / spherical bearing is the
   known case: the link assembly is `212956-005` per the 217755 PL; its
   bearing is MS14101-3 or MS14103-3; the RBC catalog values are citable
   now. Add the member with the catalog band and a loud
   which-bearing-unconfirmed marker if the 212956 drawing hasn't landed;
   the drawing export request goes on the operator queue.
   **Also flag, don't fix: the pitch_system "piston" vocabulary.** Jeff
   states the CW VPA (208510-007) contains no piston; the topology's
   `vpa_piston` part and `piston_length` edge inherit Chao's end-stop
   worksheet wording (rows 38/39). Put the naming question on the operator
   queue with the specific rows quoted — what is the actual moving output
   member — rather than renaming on a guess.
3. **Check coverage.** 6 of 19 studies carry `checks: []`. Every study gets
   either a check with a stated criterion (only where the criterion is
   citable in-repo) or an explicit recorded reason there isn't one yet.
4. **Value re-verification.** Spot-verify every element value against its
   cited source (the workbook blocks it mirrors, datasheets, drawing-checker
   exports). File each mismatch; fix the provable ones.
5. **The operator queue.** Every item only Jeff can close becomes an agent
   todo via `forge todo propose` (run from `C:\workspace\forge`, effector
   CLI — one todo per ask, `source_note 20260915T145908_fwc7qp`), each with
   the exact ask and what it unblocks, e.g.: "export the 212956-005 pitch
   anti-rotation link assembly drawing (confirms which MS bearing the
   pitch link carries)"; "214820-002 drawing PDF into tolstack
   data/inbox/specs/ (you read it 2026-09-15: 4.76 +0/−0.13)"; "NAS1149
   washer spec sheet"; "what is the VPA's actual moving output member
   (the sheet's 'piston', rows 38/39)". Rank them. Jeff has said he'll
   export drawings on request until Enovia auto-export is wired — name
   exact drawing numbers, batch them.
   This queue — not silence, not a buried worksheet table — is how gaps
   reach the operator from now on.
6. **The audit report** (`docs/tolerance_stacks/AUDIT_20260915_full_pass.md`
   or similar): per stack — what was checked, what was corrected (with
   before/after), what's gapped on whom. Plain words; this is a document
   Jeff reads.

## Definition of done

- Report committed; all provable corrections committed with updated pinned
  tests, full suite green.
- Agent todos exist in forge for every operator-gated item (list their ids
  in the lesson AND the report).
- Lesson: the classes of error found (authoring vs policy vs display), which
  matters for judging whether earlier Sonnet-era authoring needs broader
  redress.
