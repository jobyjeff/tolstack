---
priority: medium
depends_on: [sop_edits_apply]
---

# HANDOFF 2026-08-05 — hub_bearing_thermal_stack: two-stage thermal-fit archetype from Jeff's hub-bearing workbook

The part drawings ARE in hand (Jeff pulled them 2026-08-05, into
`C:\workspace\drawing-checker\data\inbox\drawings\` — worktree reality:
absolute path; COPY into this repo's own inbox with provenance noted, never
move the originals):

- `214589-002-A.pdf`, `214959-002-A.pdf`, `214588-002-A.pdf`,
  `214955-004-A.pdf`, `212966-006-A.pdf` — the hub, both bearings, and both
  sleeves (which is which: read the title blocks; do not assume from part
  number). All five are structured into 217755, so the identity-by-counting
  discipline (SOP Step 1) has the assembly's parts list and balloons
  available as cross-checks.

**Scope boundary, per Jeff:** the INNER side of the bearings — the spindle
and its sleeves — is deliberately excluded (that joint is owned by a
separate team he works closely with; may be swept in later, not now). The
stack's inner boundary is the bearing↔sleeve↔hub chain; the bearing-bore↔
spindle fit is out of scope — record it as an explicit scope boundary in the
worksheet, not as a gap to chase.

Source: Jeff's atomic note `20260804T173624_vwb8ia` + strategy session
2026-08-05. Baseline: `master` with `sop_edits_apply` merged (build against
the patched SOP). Scope: the new stack + worksheet + archetype/materials
artifacts + tests; do NOT touch `apps/viewer/` (parallel `stack_viewer_v0`)
or the spec-library code (parallel `spec_library_v0`); `data/inbox/specs/`
stays append-only.

**Worktree reality:** the workbook exists only in the main checkout:
`C:\workspace\tolstack\data\inbox\tolerance_stacks\260209_Hub Bearing Fits.xlsx`.
Cite it repo-relative.

## What this stack is (Jeff, near-verbatim)

The main spindle bearings: a **two-stage thermal fit** — a thin-wall
stainless sleeve shrink-fit into the aluminum hub, then steel bearings
shrink-fit into the sleeve. The analysis checks the fits at **all corners of
the stack** (tight and loose fit × hot and cold temperature) to ensure there
is **never a slip/clearance fit** anywhere in the assembly (real history:
bearings/sleeves slipped/rotated under certain conditions; this analysis
validated the fix ahead of system-level testing). It's somewhat academic now
— no outstanding design issue — but it's the template for a **CTE-mismatch /
thermal layer Jeff wants automatically computed for all designs**.

## Deliverables

1. **Import + re-derive the workbook** (the slice-1 discipline): every
   computed cell re-derived with zero mismatches before anything else. The
   workbook is the archetype template and the re-derivation ground truth;
   its values are `kind: "workbook"` and do NOT satisfy cite-or-gap.
2. **The thermal-fit archetype, as reusable structure, not a one-off**: an
   isothermal heat-soak/CTE layer as a building block over diametral
   interference stacks — inputs per interface: inner/outer member material +
   diameters/bands + temperature range; outputs: interference band at each
   (fit × temperature) corner; criterion: interference > 0 everywhere
   (slip = fail). Two chained stages (hub↔sleeve, sleeve↔bearing).
   Formalize it the lightweight way — a documented stack-JSON convention +
   a section in `docs/tolerance_stacks/` naming the archetype's inputs and
   checks — NOT a registry/framework (archetype registry is future work,
   after a third archetype exists). One `fold()` remains the only
   arithmetic engine; if the thermal term needs its own arithmetic, follow
   the ARCHITECTURE.md pattern for where computation may live and pin every
   number with value-level tests.
3. **A curated materials table with provenance** (the repo's first): each
   material (the aluminum hub alloy, the stainless sleeve alloy, the
   bearing steel — designations from the drawings/workbook) carries CTE
   with a `values_source`-shaped citation. **The citable source of record
   is CINDAS** (Joby has access; Jeff, 2026-08-05) — database name,
   material + condition, property/curve, retrieval date. CTE is
   temperature-dependent: record the range each value is the mean over, and
   match the workbook's usage. **Google-sourced or recalled CTE values are
   prohibited as sources** (same rule as training-data spec recall); if a
   CINDAS pull hasn't happened for a material, take the workbook value as
   `kind: "workbook"` and list the CINDAS lookup as a gap — Jeff can close
   those cheaply. Do not attempt to scrape CINDAS.
4. **Re-source dimensional values from the part drawings** (hub bore,
   sleeve OD/ID + wall, bearing OD, and their tolerances/fit classes) —
   cite-or-gap, exactly as pitch_link did, IF the drawings have landed (see
   HITL note). Every value that stays workbook-only is a named gap.
5. **Worksheet + second-agent review** per the standing repo rule.

## Definition of done

- Workbook re-derivation: zero mismatches, pinned by tests.
- The stack JSON evaluates all four corners per interface; verdicts match
  the workbook's conclusions; every element carries `source_ref` +
  confidence; gaps enumerate what the drawings/CINDAS must close.
- Suite green; review launched after merge.
- Lesson: friction the SOP's linear-stack assumptions caused for a thermal
  two-stage fit (this is the second archetype — what it needed that the
  first didn't is the archetype-registry design input), and the exact
  drawing/CINDAS asks left for Jeff.
