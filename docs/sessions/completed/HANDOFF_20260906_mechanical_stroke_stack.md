---
priority: high
depends_on: [endstop_location_stack]
---

# HANDOFF 2026-09-06 — mechanical_stroke_stack: the gas-spring mechanical-stroke stack on the same topology

Source: strategy session 2026-09-06 — the second of Jeff's two owned stack
deliverables (pair to `endstop_location_stack`; sequenced after it because
both extend the same `docs/topologies/` files and its lesson's topology
decisions are this session's baseline — read that lesson first). Baseline:
`integration` with `endstop_location_stack` merged. Scope: same fences as
that handoff (topologies + studies + checks + tests + worksheet prose; no
fold changes, no spec-event edits, no `apps/`, read-only on drawing-checker's
inbox with the snapshot guard).

## Inputs

1. **Requirements** — same artifact
   (`C:\workspace\tolstack\data\inbox\requirements\S461_equipmentrequirements_20260906.json`),
   the gas-spring stroke family, mostly **validated** (cite `c_status`
   per-item): **S461-610 / S461-636 "Gas Spring Stroke Definition"** (610:
   "0mm at full extension and maximum stroke as full retraction" — the datum
   convention for the whole stack), **S461-516 / S461-637 "Gas Spring
   Mechanical Stroke"**, **S461-616 / S461-617 / S461-638 / S461-639 "Gas
   Spring Mechanical Stops"**, **S461-620 / S461-640 "Gas Spring Mechanical
   Stops Loads"**, **S461-618 / S461-656 "Gas Spring Mechanical Stop
   Durability"**. Note the pattern of near-duplicate ids (516/637, 616/638…)
   — likely per-variant or superseding pairs; read each `c_description` and
   record which member binds which configuration rather than assuming. Loads
   and durability requirements are **not tolerance-stack checks** — cite them
   as adjacent scope in prose, check only the geometric ones. The **brake**
   stroke/stop family (S461-735/744/745/748/749/795, all draft) is explicitly
   OUT of scope — note it as the next stack on this archetype and stop.
2. **Ground truth**: the same endstop worksheet's gas-spring rows (the
   Trelleborg row 63 — identified, not traced: the catalog gives a
   calculation method, not a single figure; if the stack needs that
   clearance, the element is a calculation-method citation with the
   dash-selection recorded as a gap, or stays `untraced` — never a recalled
   number) plus whatever rows the workbook scopes to stroke rather than stop
   location.
3. **Documents**: 215176-002-A (lower gas spring body) resolves through its
   piece part 213668-002 (in hand — the retrace's identity-link precedent);
   215198-001/-002 and 214723-002 remain unacquired gaps.

## Deliverables

1. **The stroke studies on the shared topology**: the gas-spring branch
   already exists in `topology_pitch_system.json`
   (`study_pitch_system_gas_spring_branch.json` proves the parallel path) —
   extend rather than duplicate. Suggested studies: stroke at full
   retraction (max mechanical stroke vs S461-637's band) and stop-face
   engagement positions (S461-616-family), with S461-610's 0mm-at-full-
   extension datum stated as the study's convention. Justify any new nodes/
   edges in the lesson; the endstop session's topology decisions are binding
   unless measurably wrong (then: fix + say so, don't fork).
2. **Requirement-cited checks** — same rules as the endstop handoff (verbatim
   quote, status, artifact filename; `complete: false` honesty; draft vs
   validated distinguished — this family is mostly validated, so these checks
   are the closest thing the repo has to certifiable targets: say so in the
   worksheet prose).
3. **Unresolved-identity list** in `{topology_id, edge_id}` form for the
   annotation surface, appended to the endstop lesson's list format.
4. **Honest accounting**: traced ratio, gaps (unacquired piece parts, the
   Trelleborg dash-selection), findings.

## Definition of done

- Studies fold through the one `fold()`; value-level tests pin totals and
  requirement citations; full suite green.
- Every geometric stroke requirement above is either checked against folded
  numbers or reported `complete: false` with named gaps.
- Lesson (`docs/sessions/lessons/LESSONS_20260906_mechanical_stroke_stack.md`):
  the 516/637-style requirement-pair reading (which id binds what), the
  combined unresolved-identity list, and what the brake-family stack will
  need that this session learned.
