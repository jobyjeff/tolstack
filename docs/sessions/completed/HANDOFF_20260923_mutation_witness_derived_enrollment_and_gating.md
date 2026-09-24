---
priority: high
depends_on: []
model: opus
---

# HANDOFF 2026-09-23 — mutation_witness_derived_enrollment_and_gating: one enumeration for guards and witnesses, and an exit code the batch merge obeys

Source: strategy decision 2026-09-23 consuming
`docs/strategy/BRIEF_20260915_mutation_witness_enrollment.md` — its CONSUMED
marker is the decision; this is the "honest version" it names, plus the
gating half the 09-22 sweep showed is a distinct guard. Baseline:
`integration` (tier repair + the 09-22 repair handoff are in `completed/`).
Scope: `scripts/mutation_witnesses.json` and its runner
(`scripts/run_mutation_witness_tests.mjs`), the tier's identity scheme,
`CLAUDE.md`'s pre-batch-merge check list, tests. Do NOT touch the viewer/
annotate app code or `js_vocabulary_generated_from_python`'s turf (staged
beside this; it depends on you, not vice versa).

## Deliverables

1. **Baseline first**: run the full tier and record `N/M` witnessed — the
   first whole-tier number since 54/54 on 2026-09-16 (registry is ~96 rows).
   Every later claim in this handoff is measured against it.
2. **Derived enrollment**: entry identity derives from the test/guard names
   in the tree (the enumeration IS the source), so a guard with no witness
   is a *computed* fact, not a missing hand-written row. The residue that
   cannot derive (a mutation spec still needs authoring per guard) is the
   honest per-entry content; what dies is the hand-kept id pairing and the
   single-file collision surface. Design the key so a renamed test is a
   loud orphan, not a silent one (`expect_red`'s known weakness).
3. **The 13 open unenrolled instances** (the issues matching "…have no
   mutation witness entry", 09-16 → 09-23) are cleared by the new
   mechanism — enroll them through it, close each issue with the derivation
   as the resolution.
4. **The exit code gates**: NOT WITNESSED (including the three 09-22
   decayed entries' diagnoses) = non-zero exit; `CLAUDE.md`'s "before
   trusting any green, run in the main checkout" list gains the tier; the
   runner's summary distinguishes unwitnessed-by-decay from
   unenrolled-by-derivation so the two failure classes read apart.
5. Enrollment-at-source becomes trivial and is documented in one line where
   guards are documented: a new guard is enrolled by existing (derivation)
   plus one mutation spec in the same change.

## Definition of done

- Baseline N/M recorded; post-work tier green with the three decayed
  entries repaired or their guards honestly retired (say which, each).
- 13 issues closed with annotations; a planted new guard with no mutation
  spec fails the tier with a message naming what to write.
- Full pytest + `node apps/viewer/run_tests.cjs` + the tier, all green in
  the main checkout.
- Lesson: the identity-scheme design, the baseline vs final N/M, and the
  minutes-per-entry figure the strategy brief has been waiting on.
