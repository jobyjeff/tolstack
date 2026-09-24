---
priority: high
depends_on: [mutation_witness_derived_enrollment_and_gating]
model: opus
---

# HANDOFF 2026-09-23 — js_vocabulary_generated_from_python: the JS-side vocabulary is generated, and the pairing test is a byte comparison

Source: strategy decision 2026-09-23 — the bug pareto's **R2**
(`dispatch/docs/reports/REPORT_20260921_bug_pareto.md` §5; adopted via the
guard-coverage brief's CONSUMED marker and
`dispatch/docs/issues/ISSUE_20260921_the_pareto_refactor_candidates_have_no_owner.md`'s
resolution). The class it kills: pattern A — hand-copied Python↔JS
vocabularies drifting, 101 issues with a review check since 08-26 that did
not move the rate. The decided rung is "make the shape inexpressible": the
JS vocabulary file is **generated from the Python constants**, so the
pairing test becomes a byte comparison with no blind spot and a hand edit
to the generated file is structurally visible. Baseline: `integration`
after `mutation_witness_derived_enrollment_and_gating` merges (its
`depends_on` — both restructure test identity surfaces; serialize).
Scope: the Python vocabulary constants and their JS consumers in
`apps/viewer/` + `apps/annotate/` (config/vocabulary layer only), a small
generator script, `scripts/rebuild_projections.ps1` if the generation
belongs on that rail, tests. Do NOT redesign any view; do NOT touch the
worksheets/summary layout (recent merges own that).

## Deliverables

1. **Inventory first**: enumerate every vocabulary/name-set the JS reads
   that Python owns (field vocabularies, verdict words, check names, status
   labels — the repo's "field vocabulary is a module-level constant" rule
   names the Python side; find its JS mirrors). Report the count; R2's
   claim is this is the largest slice of pattern A here — measure it.
2. **One generator**: a script emitting a single generated JS module (e.g.
   `apps/shared/vocab.gen.js`, header saying generated-by + source), from
   the Python constants. Apps import it instead of their hand copies. The
   generation step lives where projections rebuild (one rail, not a new
   one); the generated file is tracked (build-free posture holds — no
   build step at serve time, the file is committed like `criteria.json`'s
   precedent in atp-post).
3. **The pairing test is a byte comparison**: regenerate-and-diff — red
   when Python moved and the generated file wasn't regenerated, red when a
   hand edit touched the generated file. Delete the hand-kept pairing
   tests it obsoletes; enroll the new guard per the (now derived) witness
   tier.
4. Structural counts (`=== N` literals in `tests.js` files) that mirror
   Python/doc-owned numbers ride the same generation where they are
   vocabulary-shaped; genuinely-structural DOM counts stay, each deriving
   from the tree per the repo's own rule (the absorbed
   structural-count-pinning brief's answer, applied).

## Definition of done

- Inventory table in the lesson (name-set × Python owner × former JS copy);
  every listed copy replaced by the generated module.
- The byte-comparison test demonstrated red both ways (Python edit without
  regen; hand edit to generated file), then green.
- Full pytest + both node tiers green in the main checkout; witness tier
  green with the new guard enrolled.
- Lesson: the pattern as a recipe for the next repo (this is the
  cross-repo R3's proving ground — say what generalises and what was
  tolstack-specific).
